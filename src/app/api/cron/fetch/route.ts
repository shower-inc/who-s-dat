import { createServiceClient } from '@/lib/supabase/server'
import { fetchRssFeed } from '@/lib/rss/fetcher'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // Cron認証
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()

  // 有効なソースをすべて取得
  const { data: sources, error: sourcesError } = await supabase
    .from('sources')
    .select('*')
    .eq('enabled', true)

  if (sourcesError) {
    return NextResponse.json({ error: sourcesError.message }, { status: 500 })
  }

  const results = []

  for (const source of sources || []) {
    try {
      const articles = await fetchRssFeed(source.url)

      let insertedCount = 0
      for (const article of articles) {
        const { error } = await supabase.from('articles').upsert(
          {
            source_id: source.id,
            ...article,
          },
          {
            onConflict: 'source_id,external_id',
            ignoreDuplicates: true,
          }
        )
        if (!error) insertedCount++
      }

      await supabase
        .from('sources')
        .update({ last_fetched_at: new Date().toISOString(), fetch_error: null })
        .eq('id', source.id)

      await supabase.from('fetch_logs').insert({
        source_id: source.id,
        status: 'success',
        articles_count: articles.length,
      })

      results.push({ source: source.name, fetched: articles.length, inserted: insertedCount })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await supabase
        .from('sources')
        .update({ fetch_error: errorMessage })
        .eq('id', source.id)

      await supabase.from('fetch_logs').insert({
        source_id: source.id,
        status: 'error',
        error_message: errorMessage,
      })

      results.push({ source: source.name, error: errorMessage })
    }
  }

  return NextResponse.json({ success: true, results })
}
