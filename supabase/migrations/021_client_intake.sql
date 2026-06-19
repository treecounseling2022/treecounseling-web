-- 為 clients 表加入 AI 初談欄位
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS intake_token UUID DEFAULT gen_random_uuid() UNIQUE,
  ADD COLUMN IF NOT EXISTS intake_summary TEXT,
  ADD COLUMN IF NOT EXISTS intake_submitted_at TIMESTAMPTZ;

-- 為已存在的個案補生成 token（若為 NULL）
UPDATE clients SET intake_token = gen_random_uuid() WHERE intake_token IS NULL;
