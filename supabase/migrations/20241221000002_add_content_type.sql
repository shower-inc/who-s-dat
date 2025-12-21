-- Add content_type column to articles table
-- Content types: news, release, artist_feature, scene_culture, pickup_tunes

-- Create content_type enum
DO $$ BEGIN
    CREATE TYPE content_type AS ENUM (
        'news',           -- ニュース
        'release',        -- 曲やMVのリリース情報
        'artist_feature', -- アーティスト特集
        'scene_culture',  -- シーンやカルチャー特集
        'pickup_tunes'    -- ピックアップチューン特集
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add content_type column to articles table
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS content_type content_type DEFAULT 'news';

-- Create index for content_type filtering
CREATE INDEX IF NOT EXISTS idx_articles_content_type ON articles(content_type);

-- Add comment for documentation
COMMENT ON COLUMN articles.content_type IS 'Article content type: news, release, artist_feature, scene_culture, pickup_tunes';
