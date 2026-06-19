-- Add meeting_link to appointments for online sessions
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS meeting_link TEXT;
