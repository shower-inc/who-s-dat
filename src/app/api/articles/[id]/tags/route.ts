import { createServiceClient } from '@/lib/supabase/server'
import { createTagService } from '@/lib/tags/service'
import { NextResponse } from 'next/server'

// GET /api/articles/[id]/tags - 記事のタグを取得
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServiceClient()
  const tagService = createTagService(supabase)

  const tags = await tagService.getTagsForArticle(id)

  return NextResponse.json({ tags })
}

// PUT /api/articles/[id]/tags - 記事のタグを一括設定
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServiceClient()
  const tagService = createTagService(supabase)

  const body = await request.json()
  const { tagIds } = body

  if (!Array.isArray(tagIds)) {
    return NextResponse.json({ error: 'tagIds must be an array' }, { status: 400 })
  }

  const success = await tagService.setArticleTags(id, tagIds)

  if (!success) {
    return NextResponse.json({ error: 'Failed to set article tags' }, { status: 500 })
  }

  // 更新後のタグを取得して返す
  const tags = await tagService.getTagsForArticle(id)

  return NextResponse.json({ success: true, tags })
}

// POST /api/articles/[id]/tags - 記事にタグを追加
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServiceClient()
  const tagService = createTagService(supabase)

  const body = await request.json()
  const { tagId } = body

  if (!tagId) {
    return NextResponse.json({ error: 'tagId is required' }, { status: 400 })
  }

  const success = await tagService.addTagToArticle(id, tagId)

  if (!success) {
    return NextResponse.json({ error: 'Failed to add tag' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// DELETE /api/articles/[id]/tags - 記事からタグを削除
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServiceClient()
  const tagService = createTagService(supabase)

  const { searchParams } = new URL(request.url)
  const tagId = searchParams.get('tagId')

  if (!tagId) {
    return NextResponse.json({ error: 'tagId is required' }, { status: 400 })
  }

  const success = await tagService.removeTagFromArticle(id, tagId)

  if (!success) {
    return NextResponse.json({ error: 'Failed to remove tag' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
