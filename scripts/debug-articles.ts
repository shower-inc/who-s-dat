import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function debug() {
  // 記事の総数
  const { count: totalCount } = await supabase
    .from('articles')
    .select('*', { count: 'exact', head: true })

  console.log('Total articles in DB:', totalCount)

  // 最新10件の記事
  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, title_original, status, fetched_at, source_id')
    .order('fetched_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('\nLatest 10 articles:')
  articles?.forEach((a, i) => {
    console.log(`${i + 1}. [${a.status}] ${a.title_original?.substring(0, 50)}...`)
    console.log(`   ID: ${a.id}, Source: ${a.source_id}, Fetched: ${a.fetched_at}`)
  })

  // ステータス別の件数
  const { data: statusCounts } = await supabase
    .from('articles')
    .select('status')

  const counts: Record<string, number> = {}
  statusCounts?.forEach(a => {
    counts[a.status] = (counts[a.status] || 0) + 1
  })
  console.log('\nStatus breakdown:', counts)
}

debug()
