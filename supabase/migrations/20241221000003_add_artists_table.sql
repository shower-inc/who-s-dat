-- ============================================
-- アーティストDB（検索結果キャッシュ）
-- ============================================

-- artists: アーティスト情報
CREATE TABLE artists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  name_ja TEXT,
  origin TEXT,  -- UK, London, Nigeria, Ghana, etc.
  genre TEXT,   -- Afrobeats, UK Rap, Grime, etc.
  description TEXT,
  search_source TEXT,  -- brave, manual, etc.
  verified BOOLEAN DEFAULT false,  -- 手動確認済みかどうか
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 記事とアーティストの関連
ALTER TABLE articles ADD COLUMN artist_id UUID REFERENCES artists(id);

-- インデックス
CREATE INDEX idx_artists_name ON artists(name);
CREATE INDEX idx_articles_artist ON articles(artist_id);

-- RLS
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users only" ON artists
  FOR ALL USING (auth.role() = 'authenticated');

-- Service roleは常にアクセス可能
CREATE POLICY "Service role access" ON artists
  FOR ALL USING (auth.role() = 'service_role');

-- 更新時刻自動更新
CREATE TRIGGER artists_updated_at BEFORE UPDATE ON artists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
