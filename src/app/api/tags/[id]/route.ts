import { createServiceClient } from '@/lib/supabase/server'
import { createTagService } from '@/lib/tags/service'
import { NextResponse } from 'next/server'

// PATCH /api/tags/[id] - タグ更新
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServiceClient()
  const tagService = createTagService(supabase)

  const body = await request.json()
  const { name, color, description } = body

  const tag = await tagService.updateTag(id, { name, color, description })

  if (!tag) {
    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 })
  }

  return NextResponse.json({ tag })
}

// DELETE /api/tags/[id] - タグ削除
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServiceClient()
  const tagService = createTagService(supabase)

  const success = await tagService.deleteTag(id)

  if (!success) {
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
