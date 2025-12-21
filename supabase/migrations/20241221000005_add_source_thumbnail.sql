-- ============================================
-- ソースにサムネイルURLを追加
-- ============================================

ALTER TABLE sources ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
