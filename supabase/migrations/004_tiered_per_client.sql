-- 新增 tiered_per_client 抽成類型
-- 依個案與該心理師的歷史總次數決定費率（與 tiered 依月份累計不同）

ALTER TABLE therapist_rates
  DROP CONSTRAINT therapist_rates_commission_type_check;

ALTER TABLE therapist_rates
  ADD CONSTRAINT therapist_rates_commission_type_check
  CHECK (commission_type IN (
    'percentage',
    'tiered',
    'tiered_per_client',
    'flat_per_session',
    'event',
    'workshop_pct'
  ));
