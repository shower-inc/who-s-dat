import { createServiceClient } from '@/lib/supabase/server'
import { translateText } from '@/lib/llm/client'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()

  // 未処理の記事を取得（タイトル翻訳だけなので多めに処理可能）
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

      // タイトルだけ翻訳（記事本文は生成しない）
      // 記事本文はコメント入力後に「生成」ボタンで作成される
      const title_ja = await translateText(article.title_original)

      await supabase
        .from('articles')
        .update({
          title_ja,
          status: 'translated',
        })
        .eq('id', article.id)

      results.push({ id: article.id, success: true, title_ja })
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
