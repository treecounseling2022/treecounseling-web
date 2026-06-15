-- 區分首次初談與後續諮商
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS session_type text DEFAULT 'followup'
    CHECK (session_type IN ('intake', 'followup'));

-- 首次初談專用欄位：個案背景
ALTER TABLE session_notes
  ADD COLUMN IF NOT EXISTS intake_background text;
