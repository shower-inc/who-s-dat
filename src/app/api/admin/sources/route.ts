import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
