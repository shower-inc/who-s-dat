import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createServiceClient()

  const { data: categories, error } = await supabase
    .from('categories')
    .select('*, sources:sources(count)')
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ categories })
}

export async function POST(request: NextRequest) {
  const supabase = await createServiceClient()

  try {
    const body = await request.json()
    const { name, slug, description, color } = body

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    // slugが指定されていない場合は自動生成
    const finalSlug =
      slug || name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')

    const { data, error } = await supabase
      .from('categories')
      .insert([{ name, slug: finalSlug, description, color }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ category: data })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
