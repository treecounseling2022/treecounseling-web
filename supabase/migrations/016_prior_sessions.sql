-- Add prior_sessions to clients to track sessions completed before switching to this system.
-- Used in tiered_per_client commission calculations as a starting offset.
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS prior_sessions integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN clients.prior_sessions IS '舊系統已完成諮商堂數（作為階梯式個案累計抽成的起始偏移）';
