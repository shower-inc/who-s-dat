import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createServiceClient()

  try {
    const body = await request.json()
    const { sourceIds, targetId } = body

    if (!sourceIds || !Array.isArray(sourceIds) || sourceIds.length === 0) {
      return NextResponse.json(
        { error: 'sourceIds must be a non-empty array' },
        { status: 400 }
      )
    }

    if (!targetId) {
      return NextResponse.json({ error: 'targetId is required' }, { status: 400 })
    }

    // 統合元カテゴリに属するソースを統合先に移動
    const { error: updateError } = await supabase
      .from('sources')
      .update({ category_id: targetId })
      .in('category_id', sourceIds)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // 統合元カテゴリを削除
    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .in('id', sourceIds)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, merged: sourceIds.length })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
