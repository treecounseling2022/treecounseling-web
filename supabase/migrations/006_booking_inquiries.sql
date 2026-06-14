-- 預約申請佇列（公開表單送出後進入此表，行政處理後再建立正式個案與預約）
CREATE TABLE IF NOT EXISTS booking_inquiries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type text NOT NULL,          -- individual / couple / hoarding / workshop / proposal / other
  name         text,
  email        text,
  phone        text,
  preferred_times text,
  concern      text,
  form_data    jsonb NOT NULL DEFAULT '{}',  -- 完整表單 JSON
  status       text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'converted', 'closed')),
  admin_notes  text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_status  ON booking_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created ON booking_inquiries(created_at DESC);

CREATE TRIGGER trg_inquiries_updated_at
  BEFORE UPDATE ON booking_inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE booking_inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inquiries_admin" ON booking_inquiries
  FOR ALL TO authenticated
  USING (is_admin_level()) WITH CHECK (is_admin_level());
