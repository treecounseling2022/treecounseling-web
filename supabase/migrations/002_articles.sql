-- 文章/最新消息表
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '心理知識',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  author TEXT NOT NULL,
  read_time TEXT DEFAULT '5 分鐘',
  excerpt TEXT DEFAULT '',
  photo TEXT DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 自動更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_published_articles"
  ON articles FOR SELECT
  USING (published = true);

CREATE POLICY "auth_all_articles"
  ON articles FOR ALL
  USING (auth.role() = 'authenticated');
