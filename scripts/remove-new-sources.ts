import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  // 元からあった6つ
  const originalSources = [
    'Solo B',
    'Link Up TV',
    'GRM Daily',
    'Mixtape Madness',
    'COLORS',
    'Gwamz',
  ]

  // それ以外を削除
  const { data: toDelete } = await supabase
    .from('sources')
    .select('id, name')
    .not('name', 'in', `(${originalSources.map(s => `"${s}"`).join(',')})`)

  console.log('=== Deleting ===')
  toDelete?.forEach(s => console.log(`- ${s.name}`))

  if (toDelete && toDelete.length > 0) {
    const ids = toDelete.map(s => s.id)
    const { error } = await supabase.from('sources').delete().in('id', ids)
    if (error) {
      console.log('Error:', error.message)
    } else {
      console.log(`\n✓ Deleted ${toDelete.length} sources`)
    }
  }

  // 確認
  const { data: remaining } = await supabase.from('sources').select('name').order('name')
  console.log('\n=== Remaining sources ===')
  remaining?.forEach(s => console.log(`- ${s.name}`))
}

main()
