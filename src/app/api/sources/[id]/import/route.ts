import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { FetchedArticle } from '@/lib/rss/fetcher'

// 選択した記事をDBに追加
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServiceClient()

  // リクエストボディから記事データを取得
  const body = await request.json()
  const articles: FetchedArticle[] = body.articles

  if (!articles || !Array.isArray(articles) || articles.length === 0) {
    return NextResponse.json({ error: 'No articles provided' }, { status: 400 })
  }

  // ソースを確認
  const { data: source, error: sourceError } = await supabase
    .from('sources')
    .select('id, name')
    .eq('id', id)
    .single()

  if (sourceError || !source) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 })
  }

  try {
    let insertedCount = 0
    let skippedCount = 0

    for (const article of articles) {
      // 既存チェック
      const { data: existing } = await supabase
        .from('articles')
        .select('id')
        .eq('external_id', article.external_id)
        .maybeSingle()

      if (existing) {
        skippedCount++
        continue
      }

      // 新規挿入
      const { error } = await supabase.from('articles').insert({
        source_id: source.id,
        external_id: article.external_id,
        title_original: article.title_original,
        summary_original: article.summary_original,
        link: article.link,
        thumbnail_url: article.thumbnail_url,
        author: article.author,
        published_at: article.published_at,
        view_count: article.view_count,
        like_count: article.like_count,
        status: 'pending',
      })

      if (!error) {
        insertedCount++
      }
    }

    // ソースの最終取得時刻を更新
    await supabase
      .from('sources')
      .update({ last_fetched_at: new Date().toISOString(), fetch_error: null })
      .eq('id', id)

    return NextResponse.json({
      success: true,
      inserted: insertedCount,
      skipped: skippedCount,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
