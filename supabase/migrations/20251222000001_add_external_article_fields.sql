-- 外部記事（引用翻訳）機能用のカラム追加

-- 元記事のURL（YouTube以外の外部記事）
ALTER TABLE articles ADD COLUMN IF NOT EXISTS source_url TEXT;

-- 元サイト名（Viper Magazine, Complex UK等）
ALTER TABLE articles ADD COLUMN IF NOT EXISTS source_site_name TEXT;

-- 抜粋した原文（引用範囲）
ALTER TABLE articles ADD COLUMN IF NOT EXISTS excerpt_original TEXT;

-- 抜粋の日本語訳
ALTER TABLE articles ADD COLUMN IF NOT EXISTS excerpt_ja TEXT;

-- リッチコンテンツ（画像・埋め込み等のブロック配列）
ALTER TABLE articles ADD COLUMN IF NOT EXISTS content_blocks JSONB;

-- sources テーブルの type に 'rss_article' を追加
-- 既存の CHECK 制約を削除して新しいものを追加
ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_type_check;
ALTER TABLE sources ADD CONSTRAINT sources_type_check
  CHECK (type IN ('rss', 'youtube', 'rss_article'));

-- インデックス追加（外部記事検索用）
CREATE INDEX IF NOT EXISTS idx_articles_source_url ON articles(source_url) WHERE source_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_articles_source_site_name ON articles(source_site_name) WHERE source_site_name IS NOT NULL;
