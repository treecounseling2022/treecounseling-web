-- ============================================================
-- 樹心理工作室 — 諮商管理系統 Phase 1 Schema
-- 在 Supabase SQL Editor 執行此檔案
-- ============================================================

-- ============================================================
-- 1. 諮商空間
-- ============================================================
CREATE TABLE IF NOT EXISTS rooms (
  id        uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  name      text    NOT NULL,
  color     text    DEFAULT '#8B9E83',
  capacity  int     DEFAULT 2,
  sort_order int    DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 2. 服務方案（50分鐘個人諮商、學生方案等）
-- ============================================================
CREATE TABLE IF NOT EXISTS service_plans (
  id               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text         NOT NULL,
  session_count    int,                          -- NULL = 單次，不限堂數
  age_min          int,
  age_max          int,
  price_per_session numeric(10,2) NOT NULL,
  currency         text         DEFAULT 'MOP',
  description      text,
  is_active        boolean      DEFAULT true,
  sort_order       int          DEFAULT 0,
  created_at       timestamptz  DEFAULT now()
);

-- ============================================================
-- 3. 個案（行政管理，無需登入帳號）
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id                   uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name            text  NOT NULL,
  name_en              text,
  dob                  date,
  gender               text  CHECK (gender IN ('male','female','other','prefer_not_to_say')),
  phone                text,
  email                text,
  emergency_contact    jsonb DEFAULT '{}',   -- {name, phone, relationship}
  assigned_therapist_id text REFERENCES therapist_profiles(id) ON DELETE SET NULL,
  referral_source      text,
  intake_notes         text,
  admin_notes          text,                 -- 行政內部備註，心理師不可見
  is_active            boolean DEFAULT true,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

-- ============================================================
-- 4. 心理師可用時段
-- ============================================================
CREATE TABLE IF NOT EXISTS therapist_availability (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id  text NOT NULL REFERENCES therapist_profiles(id) ON DELETE CASCADE,
  day_of_week   int  NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=週日
  start_time    time NOT NULL,
  end_time      time NOT NULL,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- ============================================================
-- 5. 預約（核心，含派案狀態機）
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  therapist_id     text REFERENCES therapist_profiles(id) ON DELETE RESTRICT,
  plan_id          uuid REFERENCES service_plans(id) ON DELETE SET NULL,
  room_id          uuid REFERENCES rooms(id) ON DELETE SET NULL,
  scheduled_at     timestamptz,
  duration_minutes int  DEFAULT 50,

  -- 費用
  session_fee      numeric(10,2),
  currency         text DEFAULT 'MOP',

  -- 派案狀態機
  -- pending_admin → (行政排案) → pending_therapist
  -- pending_therapist → (心理師確認) → confirmed | rejected
  -- rejected → 退回 pending_admin
  -- confirmed → (行政鎖定) → locked
  booking_status   text NOT NULL DEFAULT 'pending_admin'
    CHECK (booking_status IN (
      'pending_admin',
      'pending_therapist',
      'confirmed',
      'rejected',
      'locked',
      'cancelled'
    )),

  -- 晤談狀態（confirmed 後才有意義）
  status           text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','completed','no_show','cancelled')),

  is_first_session      boolean  DEFAULT false,
  therapist_preferences text[],       -- 個案偏好心理師
  client_intake_notes   text,         -- 個案初次申請說明
  arrangement_type      text,         -- 排案方式說明
  rejection_reason      text,         -- 心理師拒絕原因
  admin_notes           text,

  -- Google Calendar 同步
  google_calendar_event_id   text,
  google_calendar_synced_at  timestamptz,

  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ============================================================
-- 6. 晤談紀錄（心理師填寫，行政可讀，個案不可見）
-- ============================================================
CREATE TABLE IF NOT EXISTS session_notes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  therapist_id    text NOT NULL REFERENCES therapist_profiles(id) ON DELETE RESTRICT,
  content         text,
  is_submitted    boolean      DEFAULT false,
  submitted_at    timestamptz,
  created_at      timestamptz  DEFAULT now(),
  updated_at      timestamptz  DEFAULT now()
);

-- ============================================================
-- 7. 費用記錄
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  uuid NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT,
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  amount          numeric(10,2) NOT NULL,
  currency        text DEFAULT 'MOP',
  payment_method  text CHECK (payment_method IN ('cash','transfer','card','other')),
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','refunded','waived')),
  paid_at         timestamptz,
  receipt_number  text,
  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ============================================================
-- 8. 心理師抽成設定（支援 4 種模式）
-- ============================================================
CREATE TABLE IF NOT EXISTS therapist_rates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id     text NOT NULL REFERENCES therapist_profiles(id) ON DELETE CASCADE,
  commission_type  text NOT NULL
    CHECK (commission_type IN ('percentage','tiered','flat_per_session','event')),
  commission_rate  numeric(5,4),   -- percentage 模式：0.7 = 70% 給心理師
  flat_amount      numeric(10,2),  -- flat_per_session / event 模式
  free_sessions    int DEFAULT 0,  -- flat_per_session：前 N 次全歸工作室
  -- tiered 範例：[{"threshold":10,"rate":0.6},{"threshold":20,"rate":0.7}]
  tier_config      jsonb,
  effective_from   date DEFAULT CURRENT_DATE,
  effective_to     date,
  notes            text,
  created_at       timestamptz DEFAULT now()
);

-- ============================================================
-- 9. 薪資結算記錄
-- ============================================================
CREATE TABLE IF NOT EXISTS salary_records (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id      text NOT NULL REFERENCES therapist_profiles(id) ON DELETE RESTRICT,
  period_year       int  NOT NULL,
  period_month      int  NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  total_sessions    int  DEFAULT 0,
  gross_amount      numeric(10,2) DEFAULT 0,    -- 總收費
  commission_amount numeric(10,2) DEFAULT 0,    -- 心理師分成
  net_amount        numeric(10,2) DEFAULT 0,    -- 工作室淨收
  breakdown         jsonb DEFAULT '[]',          -- 明細列表
  is_finalized      boolean DEFAULT false,
  finalized_at      timestamptz,
  notes             text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  UNIQUE (therapist_id, period_year, period_month)
);

-- ============================================================
-- 10. Google Calendar OAuth Token（每位需要同步的帳號存一筆）
-- ============================================================
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calendar_id   text DEFAULT 'primary',
  access_token  text NOT NULL,
  refresh_token text NOT NULL,
  expires_at    timestamptz NOT NULL,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

-- ============================================================
-- 索引
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_appointments_client      ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_therapist   ON appointments(therapist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled   ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status      ON appointments(booking_status);
CREATE INDEX IF NOT EXISTS idx_session_notes_appt       ON session_notes(appointment_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_therapist  ON session_notes(therapist_id);
CREATE INDEX IF NOT EXISTS idx_payments_appt            ON payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_salary_period            ON salary_records(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_clients_therapist        ON clients(assigned_therapist_id);
CREATE INDEX IF NOT EXISTS idx_avail_therapist          ON therapist_availability(therapist_id);

-- ============================================================
-- updated_at 觸發器
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_session_notes_updated_at
  BEFORE UPDATE ON session_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_salary_records_updated_at
  BEFORE UPDATE ON salary_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_google_tokens_updated_at
  BEFORE UPDATE ON google_calendar_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS 政策
-- 角色透過 JWT user_metadata 判斷（director/admin/therapist）
-- ============================================================
ALTER TABLE rooms                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_plans           ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapist_availability  ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_notes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments                ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapist_rates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_records          ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_tokens  ENABLE ROW LEVEL SECURITY;

-- Helper：讀取目前使用者角色（無 metadata → director）
CREATE OR REPLACE FUNCTION auth_role()
RETURNS text AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    'director'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper：取得目前心理師的 therapist_profiles.id
CREATE OR REPLACE FUNCTION auth_therapist_id()
RETURNS text AS $$
  SELECT id FROM therapist_profiles
  WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper：是否為行政等級（director 或 admin）
CREATE OR REPLACE FUNCTION is_admin_level()
RETURNS boolean AS $$
  SELECT auth_role() IN ('director','admin');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- rooms：行政 CRUD；心理師唯讀
CREATE POLICY "rooms_admin"     ON rooms FOR ALL       TO authenticated USING (is_admin_level()) WITH CHECK (is_admin_level());
CREATE POLICY "rooms_therapist" ON rooms FOR SELECT    TO authenticated USING (auth_role() = 'therapist');

-- service_plans：行政 CRUD；心理師唯讀
CREATE POLICY "plans_admin"     ON service_plans FOR ALL    TO authenticated USING (is_admin_level()) WITH CHECK (is_admin_level());
CREATE POLICY "plans_therapist" ON service_plans FOR SELECT TO authenticated USING (auth_role() = 'therapist');

-- clients：行政 CRUD；心理師只看自己的個案
CREATE POLICY "clients_admin"    ON clients FOR ALL    TO authenticated USING (is_admin_level()) WITH CHECK (is_admin_level());
CREATE POLICY "clients_therapist" ON clients FOR SELECT TO authenticated
  USING (auth_role() = 'therapist' AND assigned_therapist_id = auth_therapist_id());

-- therapist_availability：行政 CRUD；心理師管理自己的
CREATE POLICY "avail_admin"    ON therapist_availability FOR ALL TO authenticated USING (is_admin_level()) WITH CHECK (is_admin_level());
CREATE POLICY "avail_therapist" ON therapist_availability FOR ALL TO authenticated
  USING (auth_role() = 'therapist' AND therapist_id = auth_therapist_id())
  WITH CHECK (auth_role() = 'therapist' AND therapist_id = auth_therapist_id());

-- appointments：行政 CRUD；心理師看 + 更新自己的（確認/拒絕）
CREATE POLICY "appt_admin"           ON appointments FOR ALL    TO authenticated USING (is_admin_level()) WITH CHECK (is_admin_level());
CREATE POLICY "appt_therapist_read"  ON appointments FOR SELECT TO authenticated USING (auth_role() = 'therapist' AND therapist_id = auth_therapist_id());
CREATE POLICY "appt_therapist_write" ON appointments FOR UPDATE TO authenticated
  USING (auth_role() = 'therapist' AND therapist_id = auth_therapist_id())
  WITH CHECK (auth_role() = 'therapist' AND therapist_id = auth_therapist_id());

-- session_notes：行政唯讀（不可寫）；心理師管理自己的
CREATE POLICY "notes_admin_read" ON session_notes FOR SELECT TO authenticated USING (is_admin_level());
CREATE POLICY "notes_therapist"  ON session_notes FOR ALL    TO authenticated
  USING (auth_role() = 'therapist' AND therapist_id = auth_therapist_id())
  WITH CHECK (auth_role() = 'therapist' AND therapist_id = auth_therapist_id());

-- payments：行政 CRUD
CREATE POLICY "payments_admin" ON payments FOR ALL TO authenticated USING (is_admin_level()) WITH CHECK (is_admin_level());

-- therapist_rates：行政 CRUD；心理師唯讀自己的
CREATE POLICY "rates_admin"    ON therapist_rates FOR ALL    TO authenticated USING (is_admin_level()) WITH CHECK (is_admin_level());
CREATE POLICY "rates_therapist" ON therapist_rates FOR SELECT TO authenticated
  USING (auth_role() = 'therapist' AND therapist_id = auth_therapist_id());

-- salary_records：行政 CRUD；心理師唯讀自己的
CREATE POLICY "salary_admin"    ON salary_records FOR ALL    TO authenticated USING (is_admin_level()) WITH CHECK (is_admin_level());
CREATE POLICY "salary_therapist" ON salary_records FOR SELECT TO authenticated
  USING (auth_role() = 'therapist' AND therapist_id = auth_therapist_id());

-- google_calendar_tokens：只有本人可存取
CREATE POLICY "gcal_tokens_own" ON google_calendar_tokens FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 初始資料（範例）
-- ============================================================

-- 諮商空間範例（可在後台修改）
INSERT INTO rooms (name, color, sort_order) VALUES
  ('A 室', '#8B9E83', 1),
  ('B 室', '#9E8B8B', 2),
  ('C 室', '#8B8B9E', 3)
ON CONFLICT DO NOTHING;

-- 服務方案範例
INSERT INTO service_plans (name, price_per_session, currency, description, sort_order) VALUES
  ('個人諮商（50分鐘）', 600, 'MOP', '標準個人心理諮商', 1),
  ('初次評估晤談', 600, 'MOP', '首次來訪評估', 2),
  ('學生優惠方案', 450, 'MOP', '憑學生證享優惠', 3)
ON CONFLICT DO NOTHING;
