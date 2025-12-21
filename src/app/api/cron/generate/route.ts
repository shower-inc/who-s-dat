import { createServiceClient } from '@/lib/supabase/server'
import { generatePost } from '@/lib/llm/client'
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
      const postContent = await generatePost({
        title: article.title_ja || article.title_original,
        summary: article.summary_ja || article.summary_original || '',
        category: source?.category || 'music',
        editorNote: article.editor_note || undefined,
      })

      await supabase.from('posts').insert({
        article_id: article.id,
        content: postContent,
        content_style: 'casual',
        llm_model: 'claude-3-haiku-20240307',
        llm_prompt_version: 'v2',
        platform: 'x',
        status: 'draft',
      })

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
