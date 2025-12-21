-- ============================================
-- 公開記事の読み取りポリシー
-- ============================================

-- 公開されている記事は誰でも読める
CREATE POLICY "Public articles are viewable by everyone" ON articles
  FOR SELECT USING (status IN ('published', 'posted'));

-- 公開記事に紐づくソース情報も読める
CREATE POLICY "Sources of public articles are viewable" ON sources
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM articles
      WHERE articles.source_id = sources.id
      AND articles.status IN ('published', 'posted')
    )
  );
