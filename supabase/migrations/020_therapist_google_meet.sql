-- Each therapist stores their own permanent Google Meet link
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS google_meet_link TEXT;
