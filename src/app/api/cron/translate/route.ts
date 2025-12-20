import { createServiceClient } from '@/lib/supabase/server'
import { translateText } from '@/lib/llm/client'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()

  // 未翻訳の記事を取得（最大10件）
  const { data: articles, error } = await supabase
    .from('articles')
    .select('*')
    .eq('status', 'pending')
    .order('fetched_at', { ascending: false })
    .limit(10)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results = []

  for (const article of articles || []) {
    try {
      await supabase
        .from('articles')
        .update({ status: 'translating' })
        .eq('id', article.id)

      const titleJa = await translateText(article.title_original)
      let summaryJa = null
      if (article.summary_original) {
        summaryJa = await translateText(article.summary_original)
      }

      await supabase
        .from('articles')
        .update({
          title_ja: titleJa,
          summary_ja: summaryJa,
          status: 'translated',
        })
        .eq('id', article.id)

      results.push({ id: article.id, success: true })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await supabase
        .from('articles')
        .update({ status: 'error' })
        .eq('id', article.id)

      results.push({ id: article.id, error: errorMessage })
    }
  }

  return NextResponse.json({ success: true, translated: results.length, results })
}
