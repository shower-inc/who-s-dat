import { createServiceClient } from '@/lib/supabase/server'
import { createTagService } from '@/lib/tags/service'
import { NextResponse } from 'next/server'

// GET /api/tags - 全タグ取得
export async function GET() {
  const supabase = await createServiceClient()
  const tagService = createTagService(supabase)

  const tags = await tagService.getAllTags()

  return NextResponse.json({ tags })
}

// POST /api/tags - タグ作成
export async function POST(request: Request) {
  const supabase = await createServiceClient()
  const tagService = createTagService(supabase)

  const body = await request.json()
  const { name, color, description } = body

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const tag = await tagService.createTag(name.trim(), color, description)

  if (!tag) {
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 })
  }

  return NextResponse.json({ tag })
}
