-- 個案編號欄位（唯一，不強制填寫）
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS client_code text;

-- 部分唯一索引：NULL 值不參與比較，只對有值的 client_code 去重
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_client_code
  ON clients(client_code)
  WHERE client_code IS NOT NULL;
