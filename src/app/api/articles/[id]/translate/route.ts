import { createServiceClient } from '@/lib/supabase/server'
import { translateText } from '@/lib/llm/client'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServiceClient()

  // 記事を取得
  const { data: article, error: articleError } = await supabase
    .from('articles')
    .select('*')
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

    // タイトルを翻訳
    const titleJa = await translateText(article.title_original)

    // 概要を翻訳（ある場合）
    let summaryJa = null
    if (article.summary_original) {
      summaryJa = await translateText(article.summary_original)
    }

    // 翻訳結果を保存
    await supabase
      .from('articles')
      .update({
        title_ja: titleJa,
        summary_ja: summaryJa,
        status: 'translated',
      })
      .eq('id', id)

    return NextResponse.json({
      success: true,
      title_ja: titleJa,
      summary_ja: summaryJa,
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
