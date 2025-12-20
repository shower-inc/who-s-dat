import { createServiceClient } from '@/lib/supabase/server'
import { fetchRssFeed } from '@/lib/rss/fetcher'
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
    // RSSフィードを取得
    const articles = await fetchRssFeed(source.url)

    // 記事をDBに保存（重複はスキップ）
    let insertedCount = 0
    for (const article of articles) {
      const { error } = await supabase.from('articles').upsert(
        {
          source_id: source.id,
          ...article,
          status: 'pending',
        },
        {
          onConflict: 'source_id,external_id',
          ignoreDuplicates: true,
        }
      )

      if (!error) {
        insertedCount++
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
