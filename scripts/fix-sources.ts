import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  // 全ソースのcategoryを確認
  const { data: sources } = await supabase.from('sources').select('id, name, category')
  console.log('=== Current sources ===')
  sources?.forEach(s => console.log(`- ${s.name}: category="${s.category || 'NULL'}"`))

  // categoryがnullのものを更新
  const { error } = await supabase
    .from('sources')
    .update({ category: 'music' })
    .is('category', null)

  if (error) {
    console.log('Update error:', error.message)
  } else {
    console.log('\n✓ Fixed null categories')
  }

  // 確認
  const { data: updated } = await supabase.from('sources').select('name, category').order('name')
  console.log('\n=== After fix ===')
  updated?.forEach(s => console.log(`- ${s.name}: ${s.category}`))
}

main()
