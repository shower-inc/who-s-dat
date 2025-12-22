import { createServiceClient } from '@/lib/supabase/server'
import { fetchRssFeed, resolveYouTubeUrl } from '@/lib/rss/fetcher'
import { NextResponse } from 'next/server'

// ソースからフィードを取得してプレビュー（DBには保存しない）
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServiceClient()

  // ソースを取得
  const { data: source, error: sourceError } = await supabase
    .from('sources')
    .select('*')
    .eq('id', id)
    .single()

  if (sourceError || !source) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 })
  }

  try {
    // YouTube URLをRSS URLに変換
    let feedUrl = source.url
    if (source.type === 'youtube') {
      const resolved = await resolveYouTubeUrl(source.url)
      feedUrl = resolved.feedUrl
      // DBも更新
      if (resolved.wasConverted) {
        await supabase
          .from('sources')
          .update({ url: feedUrl })
          .eq('id', id)
      }
    }

    // RSSフィードを取得
    const articles = await fetchRssFeed(feedUrl)

    // 既存の記事をチェック
    const externalIds = articles.map(a => a.external_id)
    const { data: existingArticles } = await supabase
      .from('articles')
      .select('external_id')
      .in('external_id', externalIds)

    const existingIds = new Set(existingArticles?.map(a => a.external_id) || [])

    // 既存かどうかのフラグを追加
    const previewArticles = articles.map(article => ({
      ...article,
      isExisting: existingIds.has(article.external_id),
    }))

    return NextResponse.json({
      success: true,
      source: {
        id: source.id,
        name: source.name,
        type: source.type,
        category: source.category,
      },
      articles: previewArticles,
      total: previewArticles.length,
      newCount: previewArticles.filter(a => !a.isExisting).length,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
