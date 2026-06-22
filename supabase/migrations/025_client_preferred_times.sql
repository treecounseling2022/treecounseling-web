-- 為個案記錄新增可行時段欄位（從 JotForm 匯入或預約申請時帶入）
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS preferred_times text;
