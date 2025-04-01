import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Create Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_KEY || ''
);

async function setupDatabase() {
  try {
    console.log('Starting database setup...');
    console.log('Supabase URL:', process.env.VITE_SUPABASE_URL);
    
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_KEY) {
      console.error('Error: Supabase credentials not found in environment variables');
      console.error('Make sure you have a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_KEY');
      return;
    }
    
    // Create chats table if it doesn't exist
    const { error: chatTableError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'chats',
      query: `
        CREATE TABLE chats (
          id UUID PRIMARY KEY,
          title TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          model TEXT NOT NULL
        );
      `
    });
    
    if (chatTableError) {
      console.error('Error creating chats table:', chatTableError);
    } else {
      console.log('Chats table created or already exists');
    }
    
    // Create messages table if it doesn't exist
    const { error: messagesTableError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'messages',
      query: `
        CREATE TABLE messages (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          attachments JSONB
        );
        CREATE INDEX idx_messages_chat_id ON messages(chat_id);
        CREATE INDEX idx_messages_created_at ON messages(created_at);
      `
    });
    
    if (messagesTableError) {
      console.error('Error creating messages table:', messagesTableError);
    } else {
      console.log('Messages table created or already exists');
    }
    
    // Create concept_cards table if it doesn't exist
    const { error: cardsTableError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'concept_cards',
      query: `
        CREATE TABLE concept_cards (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          category TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          color_gradient TEXT
        );
      `
    });
    
    if (cardsTableError) {
      console.error('Error creating concept_cards table:', cardsTableError);
    } else {
      console.log('Concept cards table created or already exists');
    }
    
    console.log('Database setup completed');
  } catch (error) {
    console.error('Error during database setup:', error);
  }
}

// Run the setup function
setupDatabase(); 