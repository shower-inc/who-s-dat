-- タグテーブル
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6b7280',
  description TEXT,
  article_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 記事-タグ中間テーブル
CREATE TABLE IF NOT EXISTS article_tags (
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (article_id, tag_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_article_tags_article_id ON article_tags(article_id);
CREATE INDEX IF NOT EXISTS idx_article_tags_tag_id ON article_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);

-- RLSポリシー
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_tags ENABLE ROW LEVEL SECURITY;

-- 公開読み取りポリシー
CREATE POLICY "Tags are viewable by everyone" ON tags
  FOR SELECT USING (true);

CREATE POLICY "Article tags are viewable by everyone" ON article_tags
  FOR SELECT USING (true);

-- サービスロール用の全権限ポリシー
CREATE POLICY "Service role can manage tags" ON tags
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage article_tags" ON article_tags
  FOR ALL USING (auth.role() = 'service_role');
