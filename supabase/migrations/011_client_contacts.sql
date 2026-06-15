-- 個案聯繫紀錄（每次行政聯繫個案的記錄，帶時間戳記與作者）
CREATE TABLE IF NOT EXISTS client_contacts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  content     text        NOT NULL,
  created_by  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_contacts_client ON client_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_created_by ON client_contacts(created_by);

ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;

-- 院長/行政：可讀取所有；可新增；只有填寫人可修改/刪除
CREATE POLICY "contacts_admin_read"   ON client_contacts FOR SELECT TO authenticated USING (is_admin_level());
CREATE POLICY "contacts_admin_insert" ON client_contacts FOR INSERT TO authenticated
  WITH CHECK (is_admin_level() AND created_by = auth.uid());
CREATE POLICY "contacts_own_update"   ON client_contacts FOR UPDATE TO authenticated
  USING (is_admin_level() AND (created_by = auth.uid() OR auth_role() = 'director'))
  WITH CHECK (is_admin_level() AND (created_by = auth.uid() OR auth_role() = 'director'));
CREATE POLICY "contacts_own_delete"   ON client_contacts FOR DELETE TO authenticated
  USING (is_admin_level() AND (created_by = auth.uid() OR auth_role() = 'director'));

-- updated_at 觸發器
CREATE TRIGGER trg_client_contacts_updated_at
  BEFORE UPDATE ON client_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
