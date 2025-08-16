-- Superconnector V5 Database Schema for Supabase
-- This creates all necessary tables with proper relationships

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS calls CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table
CREATE TABLE profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100),
  email VARCHAR(255),
  last_call_summary TEXT,
  last_call_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create calls table
CREATE TABLE calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  vapi_call_id VARCHAR(255) UNIQUE,
  to_number VARCHAR(20),
  status VARCHAR(50),
  duration INTEGER,
  transcript TEXT,
  summary TEXT,
  recording_url TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create messages table for conversation history
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  direction VARCHAR(10) CHECK (direction IN ('inbound', 'outbound')),
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_profiles_phone ON profiles(phone);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_calls_profile_id ON calls(profile_id);
CREATE INDEX idx_calls_vapi_call_id ON calls(vapi_call_id);
CREATE INDEX idx_messages_profile_id ON messages(profile_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to auto-update updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for recent conversations
CREATE OR REPLACE VIEW recent_conversations AS
SELECT 
  p.id,
  p.phone,
  p.name,
  p.email,
  p.last_call_summary,
  COUNT(DISTINCT c.id) as total_calls,
  COUNT(DISTINCT m.id) as total_messages,
  MAX(m.created_at) as last_message_at,
  MAX(c.ended_at) as last_call_at
FROM profiles p
LEFT JOIN calls c ON p.id = c.profile_id
LEFT JOIN messages m ON p.id = m.profile_id
GROUP BY p.id;

-- Insert some initial test data (optional, remove in production)
-- This will be replaced with real data from WhatsApp/VAPI
-- INSERT INTO profiles (phone, name, email) VALUES 
-- ('+1234567890', 'Test User', 'test@example.com');
