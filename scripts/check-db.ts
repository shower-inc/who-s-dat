import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  // 現在のソース一覧
  const { data: sources } = await supabase.from('sources').select('id, name, type, url, enabled')
  console.log('=== Current Sources ===')
  sources?.forEach(s => console.log(`- ${s.name} (${s.type}) ${s.enabled ? '✓' : '✗'}`))

  // 記事数
  const { count: articleCount } = await supabase.from('articles').select('*', { count: 'exact', head: true })
  console.log(`\n=== Articles: ${articleCount} ===`)

  // 投稿数
  const { count: postCount } = await supabase.from('posts').select('*', { count: 'exact', head: true })
  console.log(`=== Posts: ${postCount} ===`)
}

main()
