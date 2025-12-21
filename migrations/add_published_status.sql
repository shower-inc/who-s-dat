-- Drop existing check constraint and recreate with 'published' status
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_status_check;

ALTER TABLE articles ADD CONSTRAINT articles_status_check
CHECK (status IN ('pending', 'translating', 'translated', 'generating', 'ready', 'published', 'scheduled', 'posted', 'skipped', 'error'));
