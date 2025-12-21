import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createServiceClient()

  const { data: sources, error } = await supabase
    .from('sources')
    .select('id, name, url, enabled, last_fetched_at, fetch_error')
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sources })
}

export async function POST(request: NextRequest) {
  const supabase = await createServiceClient()

  try {
    const body = await request.json()
    const { name, type, url, category, thumbnail_url } = body

    if (!name || !type || !url || !category) {
      return NextResponse.json(
        { error: 'name, type, url, category are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('sources')
      .insert([{ name, type, url, category, thumbnail_url }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ source: data })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
