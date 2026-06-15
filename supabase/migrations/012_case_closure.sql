-- 個案結案欄位與評估表
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS case_status   text DEFAULT 'active'
    CHECK (case_status IN ('active', 'closed')),
  ADD COLUMN IF NOT EXISTS case_closed_at timestamptz;

-- 結案評估紀錄
CREATE TABLE IF NOT EXISTS case_closures (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  closure_reason  text        NOT NULL,  -- 結案原因：completed / transferred / dropped / other
  session_count   int,                   -- 總晤談次數
  goal_achieved   text,                  -- 目標達成程度：full / partial / none
  summary         text,                  -- 結案摘要（心理師填）
  admin_note      text,                  -- 行政備註
  closed_by       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_closures_client ON case_closures(client_id);

ALTER TABLE case_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "closures_admin_all" ON case_closures FOR ALL TO authenticated
  USING (is_admin_level()) WITH CHECK (is_admin_level());
CREATE POLICY "closures_therapist_read" ON case_closures FOR SELECT TO authenticated
  USING (
    auth_role() = 'therapist' AND client_id IN (
      SELECT client_id FROM appointments
      WHERE therapist_id = auth_therapist_id()
        AND booking_status IN ('confirmed', 'locked')
    )
  );
