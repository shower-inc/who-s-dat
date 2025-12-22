import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { CONTENT_TYPES, ContentType } from '@/types/database'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServiceClient()
  const body = await request.json()

  const { title_ja, summary_ja, content_type, published_at, editor_note } = body

  const updateData: Record<string, string | null> = {}
  if (title_ja !== undefined) updateData.title_ja = title_ja
  if (summary_ja !== undefined) updateData.summary_ja = summary_ja
  if (content_type !== undefined && CONTENT_TYPES.includes(content_type as ContentType)) {
    updateData.content_type = content_type
  }
  if (published_at !== undefined) updateData.published_at = published_at
  if (editor_note !== undefined) updateData.editor_note = editor_note

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { error } = await supabase
    .from('articles')
    .update(updateData)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServiceClient()

  // まず関連するタグを削除
  const { error: tagsError } = await supabase
    .from('article_tags')
    .delete()
    .eq('article_id', id)

  if (tagsError) {
    return NextResponse.json({ error: tagsError.message }, { status: 500 })
  }

  // 関連する投稿を削除
  const { error: postsError } = await supabase
    .from('posts')
    .delete()
    .eq('article_id', id)

  if (postsError) {
    return NextResponse.json({ error: postsError.message }, { status: 500 })
  }

  // 記事を削除
  const { error: articleError } = await supabase
    .from('articles')
    .delete()
    .eq('id', id)

  if (articleError) {
    return NextResponse.json({ error: articleError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
