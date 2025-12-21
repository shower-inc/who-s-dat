-- 編集者コメント（記事・投稿生成時の参考情報）
ALTER TABLE articles ADD COLUMN IF NOT EXISTS editor_note TEXT;

COMMENT ON COLUMN articles.editor_note IS '編集者コメント。記事生成・投稿生成のプロンプトに反映される';
