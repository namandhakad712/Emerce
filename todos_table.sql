-- Enable the UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the todos table
CREATE TABLE IF NOT EXISTS todos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add some sample data (optional)
INSERT INTO todos (title, completed, priority, due_date)
VALUES 
  ('Complete physics assignment', FALSE, 'high', NOW() + INTERVAL '1 day'),
  ('Review chemistry notes', TRUE, 'medium', NOW() - INTERVAL '1 day'),
  ('Research biology project', FALSE, 'low', NULL);

-- Grant access to authenticated users (adjust as needed for your policy)
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access
CREATE POLICY "Allow read access" ON todos
  FOR SELECT USING (true);

-- Create policy to allow insert access
CREATE POLICY "Allow insert access" ON todos
  FOR INSERT WITH CHECK (true);

-- Create policy to allow update access
CREATE POLICY "Allow update access" ON todos
  FOR UPDATE USING (true);

-- Create policy to allow delete access
CREATE POLICY "Allow delete access" ON todos
  FOR DELETE USING (true); 