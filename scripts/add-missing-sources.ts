import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const missingSources = [
    { name: 'SBTV', type: 'youtube', url: 'https://www.youtube.com/@SBTVonline', category: 'music', enabled: true },
    { name: 'Reprezent Radio', type: 'youtube', url: 'https://www.youtube.com/@ReprezentRadio', category: 'music', enabled: true },
  ]

  for (const source of missingSources) {
    const { data: existing } = await supabase.from('sources').select('id').eq('name', source.name).single()
    if (existing) {
      console.log(`- ${source.name} (already exists)`)
      continue
    }
    const { error } = await supabase.from('sources').insert(source)
    if (error) {
      console.log(`✗ ${source.name}: ${error.message}`)
    } else {
      console.log(`✓ ${source.name}`)
    }
  }

  const { count } = await supabase.from('sources').select('*', { count: 'exact', head: true })
  console.log(`\nTotal sources: ${count}`)
}

main()
