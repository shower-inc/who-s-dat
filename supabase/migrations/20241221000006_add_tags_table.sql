-- ============================================
-- タグシステム（記事間リンク用）
-- ============================================

-- tags: タグマスター
CREATE TABLE tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6b7280',  -- Tailwind gray-500
  description TEXT,
  article_count INTEGER DEFAULT 0,  -- 記事数キャッシュ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- article_tags: 記事とタグの多対多関連
CREATE TABLE article_tags (
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (article_id, tag_id)
);

-- インデックス
CREATE INDEX idx_tags_slug ON tags(slug);
CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_article_tags_article ON article_tags(article_id);
CREATE INDEX idx_article_tags_tag ON article_tags(tag_id);

-- RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_tags ENABLE ROW LEVEL SECURITY;

-- 認証ユーザーのみアクセス可能
CREATE POLICY "Authenticated users only" ON tags
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users only" ON article_tags
  FOR ALL USING (auth.role() = 'authenticated');

-- Service roleは常にアクセス可能
CREATE POLICY "Service role access" ON tags
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role access" ON article_tags
  FOR ALL USING (auth.role() = 'service_role');

-- 公開読み取り（サイト表示用）
CREATE POLICY "Public read access" ON tags
  FOR SELECT USING (true);

CREATE POLICY "Public read access" ON article_tags
  FOR SELECT USING (true);

-- 更新時刻自動更新
CREATE TRIGGER tags_updated_at BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 記事数更新用関数
CREATE OR REPLACE FUNCTION update_tag_article_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tags SET article_count = article_count + 1 WHERE id = NEW.tag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tags SET article_count = article_count - 1 WHERE id = OLD.tag_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 記事数自動更新トリガー
CREATE TRIGGER update_tag_count_on_insert
  AFTER INSERT ON article_tags
  FOR EACH ROW EXECUTE FUNCTION update_tag_article_count();

CREATE TRIGGER update_tag_count_on_delete
  AFTER DELETE ON article_tags
  FOR EACH ROW EXECUTE FUNCTION update_tag_article_count();
