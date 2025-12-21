import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServiceClient()
  const body = await request.json()

  const { title_ja, summary_ja } = body

  const updateData: Record<string, string> = {}
  if (title_ja !== undefined) updateData.title_ja = title_ja
  if (summary_ja !== undefined) updateData.summary_ja = summary_ja

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
