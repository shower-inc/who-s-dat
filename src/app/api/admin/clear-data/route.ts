import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createServiceClient()

  // Delete all posts first (foreign key constraint)
  const { error: postsError } = await supabase
    .from('posts')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (postsError) {
    return NextResponse.json({ error: `Failed to delete posts: ${postsError.message}` }, { status: 500 })
  }

  // Delete all articles
  const { error: articlesError } = await supabase
    .from('articles')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (articlesError) {
    return NextResponse.json({ error: `Failed to delete articles: ${articlesError.message}` }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'All articles and posts deleted' })
}
