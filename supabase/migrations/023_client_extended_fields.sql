-- 擴充個案記錄欄位：輔導語言、晤談偏好、精神科史、輔導史、主訴、城市、同意書日期
-- 伴侶專用：關係時長、子女資訊
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS native_language          text,
  ADD COLUMN IF NOT EXISTS preferred_meeting_type   text
    CHECK (preferred_meeting_type IN ('face', 'online', 'both')),
  ADD COLUMN IF NOT EXISTS has_psychiatry_history   boolean,
  ADD COLUMN IF NOT EXISTS psychiatry_notes         text,
  ADD COLUMN IF NOT EXISTS has_prior_counseling     boolean,
  ADD COLUMN IF NOT EXISTS prior_counseling_notes   text,
  ADD COLUMN IF NOT EXISTS presenting_concerns      jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS city                     text,
  ADD COLUMN IF NOT EXISTS consent_signed_at        date,
  ADD COLUMN IF NOT EXISTS relationship_duration    text,
  ADD COLUMN IF NOT EXISTS children_info            text;
