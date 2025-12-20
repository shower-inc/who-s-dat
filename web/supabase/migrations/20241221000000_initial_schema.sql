-- ============================================
-- JUSMINE Database Schema
-- ============================================

-- 1. sources: RSSフィードソース管理
CREATE TABLE sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('rss', 'youtube')),
  url TEXT NOT NULL,
  category TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  last_fetched_at TIMESTAMPTZ,
  fetch_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. articles: 取得した記事
CREATE TABLE articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  external_id TEXT,
  title_original TEXT NOT NULL,
  title_ja TEXT,
  summary_original TEXT,
  summary_ja TEXT,
  link TEXT NOT NULL,
  thumbnail_url TEXT,
  author TEXT,
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'translating',
    'translated',
    'generating',
    'ready',
    'scheduled',
    'posted',
    'skipped',
    'error'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_id, external_id)
);

-- 3. posts: 生成された投稿
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_style TEXT DEFAULT 'casual',
  llm_model TEXT,
  llm_prompt_version TEXT,
  platform TEXT DEFAULT 'x' CHECK (platform IN ('x', 'note', 'threads')),
  buffer_update_id TEXT,
  scheduled_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft',
    'scheduled',
    'posted',
    'failed',
    'cancelled'
  )),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. fetch_logs: 取得ログ
CREATE TABLE fetch_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  articles_count INTEGER DEFAULT 0,
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. settings: アプリ設定
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 初期設定
INSERT INTO settings (key, value) VALUES
  ('buffer', '{"profile_id": null, "enabled": true}'),
  ('llm', '{"provider": "claude", "model": "claude-3-haiku-20240307", "style_prompt": "takashistroke9/HARVEST風のカジュアルで熱量のあるノリで"}'),
  ('schedule', '{"hours": [9, 12, 18, 21], "timezone": "Asia/Tokyo", "max_posts_per_day": 6}'),
  ('categories', '["uk_afrobeats", "amapiano", "kuduro", "afro_portuguese"]');

-- インデックス
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_source ON articles(source_id);
CREATE INDEX idx_articles_published ON articles(published_at DESC);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_scheduled ON posts(scheduled_at);

-- RLS (Row Level Security)
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fetch_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーのみアクセス可能
CREATE POLICY "Authenticated users only" ON sources
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users only" ON articles
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users only" ON posts
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users only" ON fetch_logs
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users only" ON settings
  FOR ALL USING (auth.role() = 'authenticated');

-- 更新時刻自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sources_updated_at BEFORE UPDATE ON sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER articles_updated_at BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 初期ソースデータ（UK Afrobeats）
INSERT INTO sources (name, type, url, category) VALUES
  ('GRM Daily', 'youtube', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCvzHPDoEsECOrpc5VlulORg', 'uk_afrobeats'),
  ('Link Up TV', 'youtube', 'https://www.youtube.com/feeds/videos.xml?channel_id=UC6ao1qCr9gI5O5NdJ_eXbng', 'uk_afrobeats'),
  ('Mixtape Madness', 'youtube', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCIV5bHBvGSvCVmFWRLNIvVg', 'uk_afrobeats'),
  ('COLORS', 'youtube', 'https://www.youtube.com/feeds/videos.xml?channel_id=UC2Qw1dzXDBAZPwS7zm37g8g', 'uk_afrobeats');
