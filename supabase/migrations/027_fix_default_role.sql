-- 修正 auth_role() 預設值
-- 原設計：沒有 user_metadata.role 的帳號一律視為 director（最高權限）。
-- 這代表任何意外產生的無 metadata 帳號（手動於 Dashboard 建立、OAuth 流程誤設等）
-- 都會自動取得所長權限。所長帳號現已明確設定 user_metadata.role = "director"，
-- 不再需要靠「沒有 metadata」這條規則辨識，因此改為安全預設：無法辨識角色一律無權限。

CREATE OR REPLACE FUNCTION auth_role()
RETURNS text AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    'none'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
