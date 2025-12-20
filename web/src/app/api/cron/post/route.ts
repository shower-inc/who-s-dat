import { createServiceClient } from '@/lib/supabase/server'
import { createUpdate, getProfiles } from '@/lib/buffer/client'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()

  // 未投稿の投稿を取得（最大3件）
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*, articles(link)')
    .eq('status', 'draft')
    .order('created_at', { ascending: true })
    .limit(3)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!posts || posts.length === 0) {
    return NextResponse.json({ success: true, scheduled: 0 })
  }

  // Bufferプロファイルを取得
  let xProfile
  try {
    const profiles = await getProfiles()
    xProfile = profiles.find((p) => p.service === 'twitter')
  } catch (e) {
    return NextResponse.json({ error: 'Failed to get Buffer profiles' }, { status: 500 })
  }

  if (!xProfile) {
    return NextResponse.json({ error: 'No X profile connected' }, { status: 400 })
  }

  const results = []
  let scheduleOffset = 1 // 最初は1時間後

  for (const post of posts) {
    try {
      const article = post.articles as { link: string } | null
      const link = article?.link || ''
      const text = `${post.content}\n\n${link}`

      const scheduledAt = new Date()
      scheduledAt.setHours(scheduledAt.getHours() + scheduleOffset)

      const result = await createUpdate({
        profileId: xProfile.id,
        text,
        scheduledAt,
      })

      if (result.success) {
        await supabase
          .from('posts')
          .update({
            buffer_update_id: result.update?.id,
            scheduled_at: scheduledAt.toISOString(),
            status: 'scheduled',
          })
          .eq('id', post.id)

        if (post.article_id) {
          await supabase
            .from('articles')
            .update({ status: 'scheduled' })
            .eq('id', post.article_id)
        }

        results.push({ id: post.id, success: true, scheduled_at: scheduledAt.toISOString() })
        scheduleOffset += 2 // 次は2時間後に間隔を空ける
      } else {
        throw new Error('Buffer update failed')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await supabase
        .from('posts')
        .update({ status: 'failed', error_message: errorMessage })
        .eq('id', post.id)

      results.push({ id: post.id, error: errorMessage })
    }
  }

  return NextResponse.json({ success: true, scheduled: results.filter(r => !('error' in r)).length, results })
}
