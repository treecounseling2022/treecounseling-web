-- 預約加入線上標記（線上諮商仍可選填實體空間）
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;
