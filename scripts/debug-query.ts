import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function debug() {
  // 記事管理ページと同じクエリ
  const { data: articles, error } = await supabase
    .from('articles')
    .select('*, sources(name, category), posts(*), article_tags(tag_id, tags(*))')
    .order('fetched_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Query Error:', error)
    return
  }

  console.log('Query returned:', articles?.length, 'articles')

  if (articles && articles.length > 0) {
    console.log('\nFirst article:')
    console.log(JSON.stringify(articles[0], null, 2))
  }
}

debug()
