-- 新增心理師 email 欄位，用於派案通知
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS email text;
