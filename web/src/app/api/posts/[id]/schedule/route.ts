import { createServiceClient } from '@/lib/supabase/server'
import { createUpdate, getProfiles } from '@/lib/buffer/client'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServiceClient()

  // 投稿を取得（記事情報も含む）
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('*, articles(link)')
    .eq('id', id)
    .single()

  if (postError || !post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  try {
    // Bufferプロファイルを取得
    const profiles = await getProfiles()
    const xProfile = profiles.find((p) => p.service === 'twitter')

    if (!xProfile) {
      return NextResponse.json({ error: 'No X profile connected in Buffer' }, { status: 400 })
    }

    // 投稿テキストを作成（リンク付き）
    const link = post.articles?.link || ''
    const text = `${post.content}\n\n${link}`

    // 1時間後にスケジュール
    const scheduledAt = new Date()
    scheduledAt.setHours(scheduledAt.getHours() + 1)

    // Bufferに投稿をスケジュール
    const result = await createUpdate({
      profileId: xProfile.id,
      text,
      scheduledAt,
    })

    if (!result.success) {
      throw new Error('Buffer update failed')
    }

    // DBを更新
    await supabase
      .from('posts')
      .update({
        buffer_update_id: result.update?.id,
        scheduled_at: scheduledAt.toISOString(),
        status: 'scheduled',
      })
      .eq('id', id)

    // 記事ステータスも更新
    if (post.article_id) {
      await supabase
        .from('articles')
        .update({ status: 'scheduled' })
        .eq('id', post.article_id)
    }

    return NextResponse.json({
      success: true,
      scheduled_at: scheduledAt.toISOString(),
      buffer_update_id: result.update?.id,
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
