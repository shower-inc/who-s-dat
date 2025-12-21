import { createServiceClient } from '@/lib/supabase/server'
import { generatePost } from '@/lib/llm/client'
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
    .select('*, sources(name, category)')
    .eq('id', id)
    .single()

  if (articleError || !article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  }

  // 翻訳済みでない場合はエラー
  if (!article.title_ja) {
    return NextResponse.json({ error: 'Article not translated yet' }, { status: 400 })
  }

  try {
    // ステータスを更新
    await supabase
      .from('articles')
      .update({ status: 'generating' })
      .eq('id', id)

    // 投稿文を生成
    const postContent = await generatePost({
      title: article.title_ja || article.title_original,
      summary: article.summary_ja || article.summary_original || '',
      category: article.sources?.category || 'music',
    })

    // 投稿を作成
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        article_id: id,
        content: postContent,
        content_style: 'casual',
        llm_model: 'claude-3-haiku-20240307',
        llm_prompt_version: 'v2',
        platform: 'x',
        status: 'draft',
      })
      .select()
      .single()

    if (postError) {
      throw postError
    }

    // 記事ステータスを更新
    await supabase
      .from('articles')
      .update({ status: 'ready' })
      .eq('id', id)

    return NextResponse.json({
      success: true,
      post: post,
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
