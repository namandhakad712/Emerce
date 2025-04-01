-- Chats table
CREATE TABLE chats (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  model TEXT DEFAULT 'gemini-pro'
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  attachments JSONB
);

-- Concept cards table
CREATE TABLE concept_cards (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT CHECK (category IN ('Physics', 'Chemistry', 'Biology', 'Other')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  color_gradient TEXT
);

-- Create indexes for faster lookups
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_concept_cards_category ON concept_cards(category);
CREATE INDEX idx_concept_cards_created_at ON concept_cards(created_at);
CREATE INDEX idx_chats_updated_at ON chats(updated_at); 