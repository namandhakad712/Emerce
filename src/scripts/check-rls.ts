import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Create Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_KEY || ''
);

async function checkRLSAndDatabaseAccess() {
  try {
    console.log('Starting RLS and database access check...');
    console.log('Supabase URL:', process.env.VITE_SUPABASE_URL);
    
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_KEY) {
      console.error('Error: Supabase credentials not found in environment variables');
      console.error('Make sure you have a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_KEY');
      return;
    }
    
    // ================================
    // Step 1: Try to read from the chats table
    // ================================
    console.log('\n1. Testing READ access to chats table...');
    const { data: chatsData, error: chatsError } = await supabase
      .from('chats')
      .select('*')
      .limit(5);
    
    if (chatsError) {
      console.error('Error reading from chats table:', chatsError);
      console.error('This suggests either a table permissions issue or the table does not exist');
    } else {
      console.log(`Successfully read from chats table. Found ${chatsData?.length || 0} chats.`);
      if (chatsData && chatsData.length > 0) {
        console.log('Sample chat:', { 
          id: chatsData[0].id, 
          title: chatsData[0].title,
          created_at: chatsData[0].created_at
        });
      }
    }
    
    // ================================
    // Step 2: Try to read from the messages table
    // ================================
    console.log('\n2. Testing READ access to messages table...');
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .limit(5);
    
    if (messagesError) {
      console.error('Error reading from messages table:', messagesError);
      console.error('This suggests either a table permissions issue or the table does not exist');
    } else {
      console.log(`Successfully read from messages table. Found ${messagesData?.length || 0} messages.`);
      if (messagesData && messagesData.length > 0) {
        console.log('Sample message:', { 
          id: messagesData[0].id, 
          role: messagesData[0].role,
          chat_id: messagesData[0].chat_id,
          content_length: messagesData[0].content?.length || 0
        });
      }
    }
    
    // ================================
    // Step 3: Create a test chat
    // ================================
    console.log('\n3. Testing INSERT access to chats table...');
    const testChatId = uuidv4();
    const testChat = {
      id: testChatId,
      title: 'RLS Test Chat',
      model: 'gemini-2.0-flash',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: insertedChat, error: chatInsertError } = await supabase
      .from('chats')
      .insert([testChat])
      .select();
    
    if (chatInsertError) {
      console.error('Error inserting test chat:', chatInsertError);
      console.error('This suggests an RLS policy blocking INSERT on chats table');
      console.error('Detailed error:', JSON.stringify(chatInsertError));
    } else {
      console.log('Successfully inserted test chat:', insertedChat?.[0]?.id);
      
      // ================================
      // Step 4: Create a test message in the test chat
      // ================================
      console.log('\n4. Testing INSERT access to messages table...');
      const testMessage = {
        id: uuidv4(),
        role: 'user',
        content: 'This is a test message for RLS check',
        chat_id: testChatId,
        created_at: new Date().toISOString()
      };
      
      const { data: insertedMessage, error: messageInsertError } = await supabase
        .from('messages')
        .insert([testMessage])
        .select();
      
      if (messageInsertError) {
        console.error('Error inserting test message:', messageInsertError);
        console.error('This suggests an RLS policy blocking INSERT on messages table');
        console.error('Detailed error:', JSON.stringify(messageInsertError));
      } else {
        console.log('Successfully inserted test message:', insertedMessage?.[0]?.id);
      }
      
      // ================================
      // Step 5: Clean up test data
      // ================================
      console.log('\n5. Cleaning up test data...');
      
      // Delete test message
      const { error: deleteMessageError } = await supabase
        .from('messages')
        .delete()
        .eq('chat_id', testChatId);
      
      if (deleteMessageError) {
        console.error('Error deleting test message:', deleteMessageError);
      } else {
        console.log('Successfully deleted test message');
      }
      
      // Delete test chat
      const { error: deleteChatError } = await supabase
        .from('chats')
        .delete()
        .eq('id', testChatId);
      
      if (deleteChatError) {
        console.error('Error deleting test chat:', deleteChatError);
      } else {
        console.log('Successfully deleted test chat');
      }
    }
    
    console.log('\nSUMMARY OF DATABASE ACCESS:');
    console.log('--------------------------');
    if (chatsError) {
      console.log('❌ Cannot READ from chats table');
    } else {
      console.log('✅ Can READ from chats table');
    }
    
    if (messagesError) {
      console.log('❌ Cannot READ from messages table');
    } else {
      console.log('✅ Can READ from messages table');
    }
    
    if (chatInsertError) {
      console.log('❌ Cannot INSERT into chats table');
    } else {
      console.log('✅ Can INSERT into chats table');
    }
    
    if (!chatInsertError && messageInsertError) {
      console.log('❌ Cannot INSERT into messages table');
    } else if (!chatInsertError) {
      console.log('✅ Can INSERT into messages table');
    }
    
    console.log('\nRECOMMENDATIONS:');
    if (chatsError || messagesError || chatInsertError || messageInsertError) {
      console.log('1. Check your Supabase RLS policies and enable public access or add proper authentication');
      console.log('2. Verify table schemas match your application expectations');
      console.log('3. Ensure your application is using the correct Supabase URL and API key');
    } else {
      console.log('Your database access seems to be configured correctly!');
    }
    
  } catch (error) {
    console.error('Unexpected error during database check:', error);
  }
}

// Run the test
checkRLSAndDatabaseAccess(); 