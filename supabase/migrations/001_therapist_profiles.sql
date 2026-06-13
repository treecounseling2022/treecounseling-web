-- 心理師延伸資料表（補充 data.ts 中的靜態資料）
CREATE TABLE IF NOT EXISTS therapist_profiles (
  id TEXT PRIMARY KEY,                    -- 對應 data.ts TEAM[].id
  licenses TEXT[] DEFAULT '{}',           -- 專業證照
  associations TEXT[] DEFAULT '{}',       -- 專業學會
  experience JSONB DEFAULT '[]',          -- [{role, org, period}]
  training TEXT[] DEFAULT '{}',           -- 專業訓練
  publications JSONB DEFAULT '[]',        -- [{title, year, note}]
  services JSONB DEFAULT '[]',            -- [{name, fee, duration, note}]
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: 只有登入用戶（admin）才能寫入，任何人可讀取
ALTER TABLE therapist_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_therapist_profiles"
  ON therapist_profiles FOR SELECT
  USING (true);

CREATE POLICY "auth_write_therapist_profiles"
  ON therapist_profiles FOR ALL
  USING (auth.role() = 'authenticated');

-- 預先插入四位心理師的空白資料
INSERT INTO therapist_profiles (id) VALUES
  ('tanky'),
  ('veronica'),
  ('joyce'),
  ('mfok')
ON CONFLICT (id) DO NOTHING;
