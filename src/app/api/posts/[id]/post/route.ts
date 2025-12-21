import { createServiceClient } from '@/lib/supabase/server'
import { postTweetWithImage, postTweet } from '@/lib/twitter/client'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServiceClient()

  // 投稿を取得（記事のサムネイル情報も含む）
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('*, articles(id, thumbnail_url, link)')
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
    const article = post.articles as { id: string; thumbnail_url: string | null; link: string } | null
    const articleLink = article?.id ? `${baseUrl}/article/${article.id}` : ''
    const text = articleLink ? `${post.content}\n\n${articleLink}` : post.content

    // サムネイルURLを決定（DBにない場合はYouTubeリンクから生成）
    let thumbnailUrl = article?.thumbnail_url
    if (!thumbnailUrl && article?.link) {
      const videoId = extractYouTubeVideoId(article.link)
      if (videoId) {
        thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      }
    }

    // X APIで投稿（画像がある場合は画像付き、失敗時はテキストのみ）
    let result
    if (thumbnailUrl) {
      try {
        result = await postTweetWithImage(text, thumbnailUrl)
      } catch (imageError) {
        console.warn('Image upload failed, posting without image:', imageError)
        // 画像アップロード失敗時はテキストのみで投稿
        result = await postTweet(text)
      }
    } else {
      result = await postTweet(text)
    }

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
