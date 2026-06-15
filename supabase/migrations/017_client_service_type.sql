-- Add service_type and couple_partner_id to clients
-- service_type indicates how the client first came in (individual, couple, etc.)
-- couple_partner_id links the two partners of a couple booking together
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS service_type text NOT NULL DEFAULT 'individual'
    CHECK (service_type IN ('individual', 'couple', 'hoarding', 'other'));

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS couple_partner_id uuid REFERENCES clients(id) ON DELETE SET NULL;

COMMENT ON COLUMN clients.service_type IS '服務類型：individual / couple / hoarding / other';
COMMENT ON COLUMN clients.couple_partner_id IS '伴侶輔導配對的另一方個案 ID';
