-- ============================================
-- カテゴリ管理テーブル
-- ============================================

CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are viewable by everyone" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage categories" ON categories
  FOR ALL USING (auth.role() = 'authenticated');

-- 既存カテゴリの移行
INSERT INTO categories (name, slug) VALUES
  ('UK Afrobeats', 'uk_afrobeats'),
  ('Amapiano', 'amapiano'),
  ('Kuduro', 'kuduro'),
  ('Afro Portuguese', 'afro_portuguese');

-- sourcesテーブルにcategory_id追加
ALTER TABLE sources ADD COLUMN category_id UUID REFERENCES categories(id);

-- 既存データの移行
UPDATE sources s SET category_id = c.id FROM categories c WHERE s.category = c.slug;
