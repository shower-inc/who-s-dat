import { createServiceClient } from '@/lib/supabase/server'
import { generateArticle, detectContentType } from '@/lib/llm/client'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServiceClient()

  // 記事を取得（ソース情報も含む）
  const { data: article, error: articleError } = await supabase
    .from('articles')
    .select('*, sources(name)')
    .eq('id', id)
    .single()

  if (articleError || !article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  }

  try {
    // ステータスを更新
    await supabase
      .from('articles')
      .update({ status: 'translating' })
      .eq('id', id)

    const source = article.sources as { name: string } | null
    const sourceName = source?.name || 'Unknown'

    // 紹介文を生成 & content_typeを自動判定（並列実行）
    const [articleResult, contentType] = await Promise.all([
      generateArticle({
        title: article.title_original,
        description: article.summary_original || '',
        channel: sourceName,
      }),
      detectContentType({
        title: article.title_original,
        description: article.summary_original || '',
        source: sourceName,
      }),
    ])

    // 結果を保存
    await supabase
      .from('articles')
      .update({
        title_ja: articleResult.title,
        summary_ja: articleResult.content,
        content_type: contentType,
        status: 'translated',
      })
      .eq('id', id)

    return NextResponse.json({
      success: true,
      title_ja: articleResult.title,
      summary_ja: articleResult.content,
      content_type: contentType,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await supabase
      .from('articles')
      .update({ status: 'error' })
      .eq('id', id)

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
