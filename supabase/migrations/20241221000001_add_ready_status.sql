-- postsテーブルにreadyステータスを追加
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_status_check;
ALTER TABLE posts ADD CONSTRAINT posts_status_check CHECK (status IN (
  'draft',
  'ready',
  'scheduled',
  'posted',
  'failed',
  'cancelled'
));

-- buffer_update_idをtweet_idにリネーム（オプション）
-- ALTER TABLE posts RENAME COLUMN buffer_update_id TO tweet_id;
