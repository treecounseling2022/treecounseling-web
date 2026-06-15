-- 1. 更新 clients RLS：therapist 亦可讀取有確認/鎖定預約的個案
DROP POLICY IF EXISTS "clients_therapist" ON clients;
CREATE POLICY "clients_therapist" ON clients FOR SELECT TO authenticated
  USING (
    auth_role() = 'therapist' AND (
      assigned_therapist_id = auth_therapist_id()
      OR id IN (
        SELECT client_id FROM appointments
        WHERE therapist_id = auth_therapist_id()
          AND booking_status IN ('confirmed', 'locked')
      )
    )
  );

-- 2. 晤談紀錄加入結構化欄位
ALTER TABLE session_notes
  ADD COLUMN IF NOT EXISTS session_topic  text,        -- 本次呈現議題
  ADD COLUMN IF NOT EXISTS observations   text,        -- 觀察紀錄（情緒、行為）
  ADD COLUMN IF NOT EXISTS assessment     text,        -- 評估分析
  ADD COLUMN IF NOT EXISTS plan           text,        -- 計畫與下次目標
  ADD COLUMN IF NOT EXISTS risk_level     text DEFAULT 'none'
    CHECK (risk_level IN ('none', 'low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS risk_note      text;        -- 風險補充說明
