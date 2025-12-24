import { createServiceClient } from '@/lib/supabase/server'
import { generateArticle, detectContentType } from '@/lib/llm/client'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()

  // 翻訳済みで投稿文未生成の記事を取得（最大5件）
  const { data: articles, error } = await supabase
    .from('articles')
    .select('*, sources(name, category)')
    .eq('status', 'translated')
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
        .update({ status: 'generating' })
        .eq('id', article.id)

      const source = article.sources as { name: string; category: string } | null

      // content_type自動判定（未設定またはnewsの場合）
      let contentType = article.content_type
      if (!contentType || contentType === 'news') {
        contentType = await detectContentType({
          title: article.title_original,
          description: article.summary_original || '',
          source: source?.name || 'Unknown',
        })

        await supabase
          .from('articles')
          .update({ content_type: contentType })
          .eq('id', article.id)
      }

      // 記事本文を生成（未生成の場合）
      let summary_ja = article.summary_ja
      let title_ja = article.title_ja
      if (!summary_ja) {
        const generated = await generateArticle({
          title: article.title_original,
          description: article.summary_original || '',
          channel: source?.name || 'Unknown',
          editorNote: article.editor_note || undefined,
        })
        summary_ja = generated.content
        if (!title_ja) {
          title_ja = generated.title
        }

        await supabase
          .from('articles')
          .update({ title_ja, summary_ja })
          .eq('id', article.id)
      }

      await supabase
        .from('articles')
        .update({ status: 'ready' })
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

  return NextResponse.json({ success: true, generated: results.length, results })
}
