-- 收緊 therapist_profiles 寫入權限
-- 原政策 auth_write_therapist_profiles 只要求「已登入」，導致任何心理師
-- 都能透過 anon client 直接改寫其他心理師的資料列（含 auth_user_id），
-- 進而冒用他人身分讀取不屬於自己的個案。

DROP POLICY IF EXISTS "auth_write_therapist_profiles" ON therapist_profiles;

CREATE POLICY "admin_or_self_write_therapist_profiles"
  ON therapist_profiles FOR ALL
  USING (is_admin_level() OR auth_user_id = auth.uid())
  WITH CHECK (is_admin_level() OR auth_user_id = auth.uid());

-- 避免同一登入帳號對應多筆 profile：auth_therapist_id() 用 LIMIT 1 查詢，
-- 若同一 auth_user_id 對應多列會產生不確定結果。
ALTER TABLE therapist_profiles
  ADD CONSTRAINT therapist_profiles_auth_user_id_unique UNIQUE (auth_user_id);
