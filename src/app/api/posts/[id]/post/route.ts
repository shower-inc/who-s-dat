import { createServiceClient } from '@/lib/supabase/server'
import { postTweet } from '@/lib/twitter/client'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServiceClient()

  // 投稿を取得
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('*, articles(link)')
    .eq('id', id)
    .single()

  if (postError || !post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  // 既に投稿済みの場合はエラー
  if (post.status === 'posted') {
    return NextResponse.json({ error: 'Already posted' }, { status: 400 })
  }

  try {
    const article = post.articles as { link: string } | null
    const link = article?.link || ''
    const text = link ? `${post.content}\n\n${link}` : post.content

    // X APIで投稿
    const result = await postTweet(text)

    // ステータスを更新
    await supabase
      .from('posts')
      .update({
        posted_at: new Date().toISOString(),
        status: 'posted',
      })
      .eq('id', id)

    if (post.article_id) {
      await supabase
        .from('articles')
        .update({ status: 'posted' })
        .eq('id', post.article_id)
    }

    return NextResponse.json({
      success: true,
      tweet_id: result.data.id,
      tweet_text: result.data.text,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await supabase
      .from('posts')
      .update({ status: 'failed', error_message: errorMessage })
      .eq('id', id)

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
