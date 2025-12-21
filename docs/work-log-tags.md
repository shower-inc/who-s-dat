# 作業ログ: タグシステム実装

**日付**: 2024-12-21
**目的**: 記事にタグを付けてメディア間でリンクを作成する機能の実装

---

## 実装内容

### 1. データベース設計

**マイグレーションファイル**: `supabase/migrations/20241221000006_add_tags_table.sql`

#### tags テーブル
| カラム | 型 | 説明 |
|--------|------|------|
| id | UUID | 主キー |
| name | TEXT | タグ名（ユニーク） |
| slug | TEXT | URLスラッグ（ユニーク） |
| color | TEXT | 表示色（デフォルト: #6b7280） |
| description | TEXT | 説明 |
| article_count | INTEGER | 記事数（自動カウント） |
| created_at | TIMESTAMPTZ | 作成日時 |
| updated_at | TIMESTAMPTZ | 更新日時 |

#### article_tags テーブル（中間テーブル）
| カラム | 型 | 説明 |
|--------|------|------|
| article_id | UUID | 記事ID（FK → articles） |
| tag_id | UUID | タグID（FK → tags） |
| created_at | TIMESTAMPTZ | 作成日時 |

#### トリガー
- `update_tag_article_count`: article_tagsへのINSERT/DELETEで自動的にtagsのarticle_countを更新

---

### 2. TypeScript型定義

**ファイル**: `src/types/database.ts`

```typescript
// 追加した型
export type Tag = Database['public']['Tables']['tags']['Row']
export type ArticleTag = Database['public']['Tables']['article_tags']['Row']
export type ArticleWithTags = Article & { tags?: Tag[] }
```

---

### 3. サービス層

**ファイル**: `src/lib/tags/service.ts`

#### 提供する機能
| メソッド | 説明 |
|----------|------|
| `getAllTags()` | 全タグ取得（記事数順） |
| `getTagBySlug(slug)` | slugでタグ取得 |
| `createTag(name, color?, description?)` | タグ作成 |
| `updateTag(id, updates)` | タグ更新 |
| `deleteTag(id)` | タグ削除 |
| `getTagsForArticle(articleId)` | 記事のタグ取得 |
| `addTagToArticle(articleId, tagId)` | 記事にタグ追加 |
| `removeTagFromArticle(articleId, tagId)` | 記事からタグ削除 |
| `setArticleTags(articleId, tagIds)` | 記事のタグ一括設定 |
| `getArticlesByTag(tagId, limit?)` | タグで記事検索 |
| `getRelatedArticles(articleId, limit?)` | 関連記事取得 |

---

### 4. API エンドポイント

#### タグ管理
| エンドポイント | メソッド | 説明 |
|----------------|----------|------|
| `/api/tags` | GET | 全タグ取得 |
| `/api/tags` | POST | タグ作成 |
| `/api/tags/[id]` | PATCH | タグ更新 |
| `/api/tags/[id]` | DELETE | タグ削除 |

#### 記事-タグ関連
| エンドポイント | メソッド | 説明 |
|----------------|----------|------|
| `/api/articles/[id]/tags` | GET | 記事のタグ取得 |
| `/api/articles/[id]/tags` | PUT | タグ一括設定 |
| `/api/articles/[id]/tags` | POST | タグ追加 |
| `/api/articles/[id]/tags` | DELETE | タグ削除 |

---

### 5. 管理画面UI

**ファイル**: `src/app/admin/articles/article-list.tsx`

#### 追加機能
- **タグ表示**: 各記事にタグをカラーバッジで表示
- **タグフィルター**: ドロップダウンでタグ絞り込み
- **タグ編集モーダル**:
  - 既存タグの選択/解除
  - 新規タグ作成（名前・色指定）

---

### 6. 公開サイト

**ファイル**: `src/app/article/[id]/page.tsx`

#### 追加機能
- **タグ表示**: 記事詳細ページにタグをクリッカブルなバッジで表示
- **関連記事**: 同じタグを持つ記事を「関連記事」セクションで表示（最大4件）

---

### 7. 記事削除時の対応

**ファイル**: `src/app/api/articles/[id]/route.ts`

- 記事削除時にarticle_tagsも削除するよう修正

---

## ファイル変更一覧

### 新規作成
- `supabase/migrations/20241221000006_add_tags_table.sql`
- `src/lib/tags/service.ts`
- `src/app/api/tags/route.ts`
- `src/app/api/tags/[id]/route.ts`
- `src/app/api/articles/[id]/tags/route.ts`

### 変更
- `src/types/database.ts` - Tag, ArticleTag型追加
- `src/app/admin/articles/article-list.tsx` - タグUI追加
- `src/app/admin/articles/page.tsx` - article_tagsを含むクエリに変更
- `src/app/article/[id]/page.tsx` - タグ表示・関連記事追加
- `src/app/api/articles/[id]/route.ts` - 削除時にタグも削除

---

## マイグレーション適用手順

Supabaseダッシュボードの **SQL Editor** で以下を実行:

```sql
-- supabase/migrations/20241221000006_add_tags_table.sql の内容をコピー＆実行
```

---

## 使い方

### 管理画面
1. 記事一覧ページで「+ タグ」ボタンをクリック
2. 既存タグを選択するか、新規タグを作成
3. 「保存」で記事にタグを設定
4. フィルターでタグによる絞り込みが可能

### 公開サイト
- 記事詳細ページでタグをクリックするとトップページでそのタグの記事一覧を表示
- 同じタグを持つ記事が「関連記事」として自動表示
