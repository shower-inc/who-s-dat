# 作業ログ: 記事カテゴリー機能の実装

**日付**: 2024-12-21

## 概要
メディアサイトの記事をカテゴリー分けできるようにする機能を実装した。

## 実装したカテゴリー

| キー | 日本語ラベル |
|------|-------------|
| `news` | ニュース |
| `release` | リリース情報 |
| `artist_feature` | アーティスト特集 |
| `scene_culture` | シーン・カルチャー |
| `pickup_tunes` | ピックアップチューン |

## 変更ファイル一覧

### データベース
- `supabase/migrations/20241221000002_add_content_type.sql` - 新規作成
  - `articles`テーブルに`content_type`カラムを追加
  - デフォルト値は`news`
  - インデックス作成

### 型定義
- `src/types/database.ts`
  - `ContentType`型を追加
  - `CONTENT_TYPE_LABELS`定数（日本語ラベル）を追加
  - `CONTENT_TYPES`配列を追加
  - `Article`型に`content_type`フィールドを追加

### API
- `src/app/api/articles/[id]/route.ts`
  - PATCHエンドポイントで`content_type`の更新に対応

### 管理画面
- `src/app/admin/articles/article-list.tsx`
  - カテゴリー/ステータスのフィルター機能を追加
  - 各記事にカテゴリーバッジを表示
  - 記事編集モーダルでカテゴリー選択を追加

### メディアサイト（公開側）
- `src/app/page.tsx`
  - ヘッダー下にカテゴリーナビゲーションを追加（スティッキー）
  - 記事一覧にカテゴリーバッジを表示

- `src/app/category/[type]/page.tsx` - 新規作成
  - カテゴリー別記事一覧ページ
  - 動的ルーティング対応
  - `dynamicParams = true`で未生成パラメータも許可

## Supabaseへの適用

マイグレーションを適用するには、Supabaseダッシュボードで以下のSQLを実行:

```sql
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS content_type text DEFAULT 'news';

CREATE INDEX IF NOT EXISTS idx_articles_content_type ON articles(content_type);
```

## 使い方

### 管理画面
1. 記事一覧でカテゴリー/ステータスでフィルター可能
2. 「記事編集」ボタンからカテゴリーを変更可能

### 公開サイト
- トップページ: カテゴリーナビで絞り込み
- `/category/[type]`: カテゴリー別一覧ページ
  - 例: `/category/release` → リリース情報一覧

## 今後の拡張案
- ソース追加時にデフォルトカテゴリーを設定
- AI翻訳時に自動カテゴリー判定
- カテゴリー別のRSSフィード生成
