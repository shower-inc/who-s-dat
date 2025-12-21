-- ============================================
-- 公開記事の読み取りポリシー
-- ============================================

-- 公開されている記事は誰でも読める
CREATE POLICY "Public articles are viewable by everyone" ON articles
  FOR SELECT USING (status IN ('published', 'posted'));

-- ソースは誰でも読める（記事表示に必要）
CREATE POLICY "Sources are viewable by everyone" ON sources
  FOR SELECT USING (true);
