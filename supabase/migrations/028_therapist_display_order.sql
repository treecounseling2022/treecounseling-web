-- /team 公開列表頁目前仍讀取 src/lib/data.ts 的靜態 TEAM 陣列排序，
-- 導致後台新增/編輯的心理師資料對不上公開頁面。改成以 therapist_profiles
-- 為準後，需要一個穩定的顯示順序欄位（不能用 updated_at，會員每次編輯
-- 資料就洗牌一次）。先把現有四位的順序原樣搬過來，其餘新成員預設排最後。
ALTER TABLE therapist_profiles
  ADD COLUMN IF NOT EXISTS display_order INTEGER;

UPDATE therapist_profiles SET display_order = 1 WHERE id = 'tanky' AND display_order IS NULL;
UPDATE therapist_profiles SET display_order = 2 WHERE id = 'veronica' AND display_order IS NULL;
UPDATE therapist_profiles SET display_order = 3 WHERE id = 'joyce' AND display_order IS NULL;
UPDATE therapist_profiles SET display_order = 4 WHERE id = 'mfok' AND display_order IS NULL;
