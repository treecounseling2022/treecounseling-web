-- ============================================================
-- Phase 3: 講座 / 工作坊活動記錄
-- ============================================================

-- 1. 更新 therapist_rates 的 CHECK 約束，加入 workshop_pct
ALTER TABLE therapist_rates
  DROP CONSTRAINT therapist_rates_commission_type_check;

ALTER TABLE therapist_rates
  ADD CONSTRAINT therapist_rates_commission_type_check
  CHECK (commission_type IN ('percentage','tiered','flat_per_session','event','workshop_pct'));

-- 2. 建立 workshop_events 表
CREATE TABLE IF NOT EXISTS workshop_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id   text NOT NULL REFERENCES therapist_profiles(id) ON DELETE RESTRICT,
  title          text NOT NULL,
  scheduled_at   timestamptz NOT NULL,
  duration_hours numeric(4,1) NOT NULL DEFAULT 1,
  hourly_rate    numeric(10,2) NOT NULL DEFAULT 0,
  total_fee      numeric(10,2) NOT NULL DEFAULT 0,
  currency       text DEFAULT 'MOP',
  status         text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','completed','cancelled')),
  notes          text,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE TRIGGER trg_workshop_events_updated_at
  BEFORE UPDATE ON workshop_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_workshop_events_therapist ON workshop_events(therapist_id);
CREATE INDEX IF NOT EXISTS idx_workshop_events_scheduled ON workshop_events(scheduled_at);

-- 3. RLS
ALTER TABLE workshop_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workshops_admin" ON workshop_events
  FOR ALL TO authenticated
  USING (is_admin_level()) WITH CHECK (is_admin_level());

CREATE POLICY "workshops_therapist_read" ON workshop_events
  FOR SELECT TO authenticated
  USING (auth_role() = 'therapist' AND therapist_id = auth_therapist_id());
