-- booking_inquiries 加入轉換後的個案與預約連結
ALTER TABLE booking_inquiries
  ADD COLUMN IF NOT EXISTS client_id      uuid REFERENCES clients(id)      ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inquiries_client ON booking_inquiries(client_id);
