-- Google Calendar 同步欄位
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS space_calendar_event_id TEXT,
  ADD COLUMN IF NOT EXISTS therapist_calendar_event_id TEXT;

-- 心理師個人 Google Calendar ID
ALTER TABLE therapist_profiles
  ADD COLUMN IF NOT EXISTS google_calendar_id TEXT;
