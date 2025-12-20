import { createServiceClient } from '@/lib/supabase/server'
import { postTweet } from '@/lib/twitter/client'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServiceClient()

  // 投稿を取得
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('*, articles(id)')
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
    // サイトURLを取得（環境変数 or リクエストヘッダー）
    const headersList = await headers()
    const host = headersList.get('host') || ''
    const protocol = headersList.get('x-forwarded-proto') || 'https'
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`

    // 記事リンクはサイトの記事ページを使用
    const article = post.articles as { id: string } | null
    const articleLink = article?.id ? `${baseUrl}/article/${article.id}` : ''
    const text = articleLink ? `${post.content}\n\n${articleLink}` : post.content

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
