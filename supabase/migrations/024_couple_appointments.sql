-- 伴侶諮商場次類型
-- joint = 雙方一起；individual_a = A 方個人；individual_b = B 方個人
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS couple_session_type      text
    CHECK (couple_session_type IN ('joint', 'individual_a', 'individual_b')),
  ADD COLUMN IF NOT EXISTS couple_partner_client_id uuid
    REFERENCES clients(id) ON DELETE RESTRICT;

COMMENT ON COLUMN appointments.couple_session_type      IS '伴侶諮商場次類型：joint=雙方, individual_a=A方個人, individual_b=B方個人';
COMMENT ON COLUMN appointments.couple_partner_client_id IS '伴侶諮商 joint 場次中另一方個案 ID';
