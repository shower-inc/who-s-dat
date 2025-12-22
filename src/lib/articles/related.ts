import { SupabaseClient } from '@supabase/supabase-js'
import { extractArtistName } from '../web/search'

export interface RelatedArticle {
  id: string
  title_original: string
  title_ja: string | null
  summary_ja: string | null
  source_name: string | null
  published_at: string | null
}

/**
 * 関連記事を検索
 * - 同じアーティストの記事
 * - タイトルに含まれるキーワードで検索
 */
export async function findRelatedArticles(
  supabase: SupabaseClient,
  articleId: string,
  title: string,
  limit: number = 5
): Promise<RelatedArticle[]> {
  const artistName = extractArtistName(title)

  if (!artistName) {
    return []
  }

  // 同じアーティスト名を含む記事を検索
  const { data: articles, error } = await supabase
    .from('articles')
    .select(`
      id,
      title_original,
      title_ja,
      summary_ja,
      published_at,
      sources(name)
    `)
    .neq('id', articleId)
    .or(`title_original.ilike.%${artistName}%,title_ja.ilike.%${artistName}%`)
    .not('summary_ja', 'is', null)
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error || !articles) {
    console.error('Failed to find related articles:', error)
    return []
  }

  return articles.map(a => {
    // sourcesはオブジェクトまたは配列で返ってくる可能性がある
    const sources = a.sources as { name: string } | { name: string }[] | null
    let sourceName: string | null = null
    if (sources) {
      if (Array.isArray(sources)) {
        sourceName = sources[0]?.name || null
      } else {
        sourceName = sources.name || null
      }
    }
    return {
      id: a.id,
      title_original: a.title_original,
      title_ja: a.title_ja,
      summary_ja: a.summary_ja,
      source_name: sourceName,
      published_at: a.published_at,
    }
  })
}

/**
 * 関連記事の情報をプロンプト用テキストに整形
 */
export function formatRelatedArticles(articles: RelatedArticle[]): string {
  if (articles.length === 0) return ''

  const lines = articles.map(a => {
    const title = a.title_ja || a.title_original
    const summary = a.summary_ja?.slice(0, 150) || ''
    return `- ${title}: ${summary}...`
  })

  return `【過去の関連記事】\n${lines.join('\n')}`
}
