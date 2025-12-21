import { createServiceClient } from '@/lib/supabase/server'
import { generateArticle } from '@/lib/llm/client'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()

  // 未処理の記事を取得（最大5件、紹介文生成は重いので少なめに）
  const { data: articles, error } = await supabase
    .from('articles')
    .select('*, sources(name)')
    .eq('status', 'pending')
    .order('fetched_at', { ascending: false })
    .limit(5)

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

      const source = article.sources as { name: string } | null
      const { title, content } = await generateArticle({
        title: article.title_original,
        description: article.summary_original || '',
        channel: source?.name || 'Unknown',
      })

      await supabase
        .from('articles')
        .update({
          title_ja: title,
          summary_ja: content,
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

  return NextResponse.json({ success: true, processed: results.length, results })
}
