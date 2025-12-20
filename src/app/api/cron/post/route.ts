import { createServiceClient } from '@/lib/supabase/server'
import { postTweet } from '@/lib/twitter/client'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()

  // 承認済み（ready）の投稿を取得（最大3件）
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*, articles(link)')
    .eq('status', 'ready')
    .order('created_at', { ascending: true })
    .limit(3)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!posts || posts.length === 0) {
    return NextResponse.json({ success: true, posted: 0, message: 'No ready posts' })
  }

  const results = []

  for (const post of posts) {
    try {
      const article = post.articles as { link: string } | null
      const link = article?.link || ''
      const text = link ? `${post.content}\n\n${link}` : post.content

      // X APIで直接投稿
      const result = await postTweet(text)

      await supabase
        .from('posts')
        .update({
          posted_at: new Date().toISOString(),
          status: 'posted',
        })
        .eq('id', post.id)

      if (post.article_id) {
        await supabase
          .from('articles')
          .update({ status: 'posted' })
          .eq('id', post.article_id)
      }

      results.push({
        id: post.id,
        success: true,
        tweet_id: result.data.id,
        posted_at: new Date().toISOString()
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await supabase
        .from('posts')
        .update({ status: 'failed', error_message: errorMessage })
        .eq('id', post.id)

      results.push({ id: post.id, error: errorMessage })
    }
  }

  return NextResponse.json({
    success: true,
    posted: results.filter(r => !('error' in r)).length,
    results
  })
}
