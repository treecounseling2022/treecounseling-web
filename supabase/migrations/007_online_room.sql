-- 為諮商空間加入「線上」標記，線上空間不佔用實體診室時段
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;

-- 插入線上諮商選項
INSERT INTO rooms (name, color, sort_order, is_online)
  VALUES ('線上諮商', '#6B8FA3', 99, true)
ON CONFLICT DO NOTHING;
