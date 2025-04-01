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

async function testMessageInsert() {
  try {
    console.log('Starting message insert test...');
    console.log('Supabase URL:', process.env.VITE_SUPABASE_URL);
    
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_KEY) {
      console.error('Error: Supabase credentials not found in environment variables');
      console.error('Make sure you have a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_KEY');
      return;
    }
    
    // First, get an existing chat ID
    console.log('Fetching existing chats...');
    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select('id, title')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (chatsError) {
      console.error('Error fetching chats:', chatsError);
      return;
    }
    
    if (!chats || chats.length === 0) {
      console.error('No existing chats found. Please create a chat first.');
      return;
    }
    
    const chatId = chats[0].id;
    console.log(`Found chat: ${chats[0].title} (${chatId})`);
    
    // Now try to insert a test message
    const testMessage = {
      id: uuidv4(),
      role: 'user',
      content: 'This is a test message from the insert script',
      chat_id: chatId,
      created_at: new Date().toISOString()
    };
    
    console.log('Inserting test message...');
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .insert([testMessage])
      .select();
    
    if (messageError) {
      console.error('Error inserting message:', messageError);
      console.error('Error details:', JSON.stringify(messageError));
      return;
    }
    
    console.log('Message inserted successfully:', messageData?.[0]?.id);
    
    // Verify the message was inserted
    console.log('Fetching messages for chat...');
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId);
    
    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return;
    }
    
    console.log(`Found ${messages?.length || 0} messages for chat ${chatId}`);
    messages?.forEach((msg, idx) => {
      console.log(`Message ${idx + 1}: ${msg.id} - ${msg.role} - ${msg.content.substring(0, 30)}...`);
    });
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Unexpected error during test:', error);
  }
}

// Run the test
testMessageInsert(); 