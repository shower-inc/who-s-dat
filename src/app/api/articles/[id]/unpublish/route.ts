import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServiceClient()

  // 公開済み記事を翻訳済みに戻す（サイトから非公開）
  const { error } = await supabase
    .from('articles')
    .update({ status: 'translated' })
    .eq('id', id)
    .in('status', ['published', 'posted'])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
