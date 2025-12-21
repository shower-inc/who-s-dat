import { SupabaseClient } from '@supabase/supabase-js'
import { Tag, Article } from '@/types/database'

export interface TagService {
  // タグ操作
  getAllTags(): Promise<Tag[]>
  getTagBySlug(slug: string): Promise<Tag | null>
  createTag(name: string, color?: string, description?: string): Promise<Tag | null>
  updateTag(id: string, updates: { name?: string; color?: string; description?: string }): Promise<Tag | null>
  deleteTag(id: string): Promise<boolean>

  // 記事-タグ関連
  getTagsForArticle(articleId: string): Promise<Tag[]>
  addTagToArticle(articleId: string, tagId: string): Promise<boolean>
  removeTagFromArticle(articleId: string, tagId: string): Promise<boolean>
  setArticleTags(articleId: string, tagIds: string[]): Promise<boolean>

  // 関連記事取得
  getArticlesByTag(tagId: string, limit?: number): Promise<Article[]>
  getRelatedArticles(articleId: string, limit?: number): Promise<Article[]>
}

// slugを生成（日本語対応）
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[\s\u3000]+/g, '-')  // 空白・全角スペースをハイフンに
    .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF-]/g, '')  // 英数字・日本語・ハイフン以外を削除
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createTagService(supabase: SupabaseClient<any>): TagService {

  // 全タグ取得
  async function getAllTags(): Promise<Tag[]> {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('article_count', { ascending: false })

    if (error) {
      console.error('Failed to get tags:', error)
      return []
    }
    return data as Tag[]
  }

  // slugでタグ取得
  async function getTagBySlug(slug: string): Promise<Tag | null> {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error) {
      return null
    }
    return data as Tag
  }

  // タグ作成
  async function createTag(name: string, color?: string, description?: string): Promise<Tag | null> {
    const slug = generateSlug(name)

    const { data, error } = await supabase
      .from('tags')
      .insert({
        name,
        slug,
        color: color || '#6b7280',
        description,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create tag:', error)
      return null
    }
    return data as Tag
  }

  // タグ更新
  async function updateTag(
    id: string,
    updates: { name?: string; color?: string; description?: string }
  ): Promise<Tag | null> {
    const updateData: Record<string, string> = {}

    if (updates.name) {
      updateData.name = updates.name
      updateData.slug = generateSlug(updates.name)
    }
    if (updates.color) updateData.color = updates.color
    if (updates.description !== undefined) updateData.description = updates.description

    const { data, error } = await supabase
      .from('tags')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update tag:', error)
      return null
    }
    return data as Tag
  }

  // タグ削除
  async function deleteTag(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Failed to delete tag:', error)
      return false
    }
    return true
  }

  // 記事のタグを取得
  async function getTagsForArticle(articleId: string): Promise<Tag[]> {
    const { data, error } = await supabase
      .from('article_tags')
      .select('tag_id, tags(*)')
      .eq('article_id', articleId)

    if (error) {
      console.error('Failed to get tags for article:', error)
      return []
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((row: any) => row.tags as Tag).filter(Boolean)
  }

  // 記事にタグを追加
  async function addTagToArticle(articleId: string, tagId: string): Promise<boolean> {
    const { error } = await supabase
      .from('article_tags')
      .insert({ article_id: articleId, tag_id: tagId })

    if (error) {
      // 既に存在する場合はエラーにしない
      if (error.code === '23505') return true
      console.error('Failed to add tag to article:', error)
      return false
    }
    return true
  }

  // 記事からタグを削除
  async function removeTagFromArticle(articleId: string, tagId: string): Promise<boolean> {
    const { error } = await supabase
      .from('article_tags')
      .delete()
      .eq('article_id', articleId)
      .eq('tag_id', tagId)

    if (error) {
      console.error('Failed to remove tag from article:', error)
      return false
    }
    return true
  }

  // 記事のタグを一括設定（既存を置き換え）
  async function setArticleTags(articleId: string, tagIds: string[]): Promise<boolean> {
    // 既存のタグを削除
    const { error: deleteError } = await supabase
      .from('article_tags')
      .delete()
      .eq('article_id', articleId)

    if (deleteError) {
      console.error('Failed to clear article tags:', deleteError)
      return false
    }

    // 新しいタグがなければ終了
    if (tagIds.length === 0) return true

    // 新しいタグを追加
    const { error: insertError } = await supabase
      .from('article_tags')
      .insert(tagIds.map(tagId => ({ article_id: articleId, tag_id: tagId })))

    if (insertError) {
      console.error('Failed to set article tags:', insertError)
      return false
    }
    return true
  }

  // タグに属する記事を取得
  async function getArticlesByTag(tagId: string, limit: number = 20): Promise<Article[]> {
    const { data, error } = await supabase
      .from('article_tags')
      .select('article_id, articles(*)')
      .eq('tag_id', tagId)
      .limit(limit)

    if (error) {
      console.error('Failed to get articles by tag:', error)
      return []
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((row: any) => row.articles as Article).filter(Boolean)
  }

  // 関連記事を取得（同じタグを持つ記事）
  async function getRelatedArticles(articleId: string, limit: number = 5): Promise<Article[]> {
    // 記事のタグを取得
    const tags = await getTagsForArticle(articleId)
    if (tags.length === 0) return []

    const tagIds = tags.map(t => t.id)

    // 同じタグを持つ他の記事を取得
    const { data, error } = await supabase
      .from('article_tags')
      .select('article_id, articles(*)')
      .in('tag_id', tagIds)
      .neq('article_id', articleId)
      .limit(limit * 2)  // 重複除去のため多めに取得

    if (error) {
      console.error('Failed to get related articles:', error)
      return []
    }

    // 重複を除去して返す
    const seen = new Set<string>()
    const articles: Article[] = []

    for (const row of data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const article = (row as any).articles as Article
      if (article && !seen.has(article.id)) {
        seen.add(article.id)
        articles.push(article)
        if (articles.length >= limit) break
      }
    }

    return articles
  }

  return {
    getAllTags,
    getTagBySlug,
    createTag,
    updateTag,
    deleteTag,
    getTagsForArticle,
    addTagToArticle,
    removeTagFromArticle,
    setArticleTags,
    getArticlesByTag,
    getRelatedArticles,
  }
}
