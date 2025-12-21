import { createServiceClient } from '@/lib/supabase/server'
import { fetchRssFeed, resolveYouTubeUrl } from '@/lib/rss/fetcher'
import { NextResponse } from 'next/server'

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
    // YouTube URLをRSS URLに変換（DBも更新）
    if (source.type === 'youtube') {
      const { feedUrl, wasConverted } = await resolveYouTubeUrl(source.url)
      if (wasConverted) {
        await supabase
          .from('sources')
          .update({ url: feedUrl })
          .eq('id', id)
      }
    }

    // RSSフィードを取得（fetchRssFeed内でも自動変換される）
    const articles = await fetchRssFeed(source.url)

    // 記事をDBに保存（新規は追加、既存はview_count/like_countを更新）
    let insertedCount = 0
    for (const article of articles) {
      // まず既存の記事を確認
      const { data: existing } = await supabase
        .from('articles')
        .select('id')
        .eq('source_id', source.id)
        .eq('external_id', article.external_id)
        .single()

      if (existing) {
        // 既存の記事はview_count, like_count, summary_originalのみ更新
        await supabase
          .from('articles')
          .update({
            view_count: article.view_count,
            like_count: article.like_count,
            summary_original: article.summary_original,
          })
          .eq('id', existing.id)
      } else {
        // 新規記事は挿入
        const { error } = await supabase.from('articles').insert({
          source_id: source.id,
          ...article,
          status: 'pending',
        })

        if (!error) {
          insertedCount++
        }
      }
    }

    // ソースの最終取得時刻を更新
    await supabase
      .from('sources')
      .update({ last_fetched_at: new Date().toISOString(), fetch_error: null })
      .eq('id', id)

    // 取得ログを記録
    await supabase.from('fetch_logs').insert({
      source_id: id,
      status: 'success',
      articles_count: articles.length,
    })

    return NextResponse.json({
      success: true,
      count: articles.length,
      inserted: insertedCount,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // エラーを記録
    await supabase
      .from('sources')
      .update({ fetch_error: errorMessage })
      .eq('id', id)

    await supabase.from('fetch_logs').insert({
      source_id: id,
      status: 'error',
      error_message: errorMessage,
    })

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
