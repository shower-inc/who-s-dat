import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServiceClient()

  // 投稿を取得して関連記事IDを確認
  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('article_id')
    .eq('id', id)
    .single()

  if (fetchError || !post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  // 投稿ステータスを ready に
  const { error } = await supabase
    .from('posts')
    .update({ status: 'ready' })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 記事ステータスを published に（サイトに公開）
  if (post.article_id) {
    await supabase
      .from('articles')
      .update({ status: 'published' })
      .eq('id', post.article_id)
  }

  return NextResponse.json({ success: true })
}
