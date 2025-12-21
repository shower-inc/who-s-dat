import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log('=== Deleting all posts ===')
  const { error: postError } = await supabase.from('posts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (postError) console.error('Post delete error:', postError.message)
  else console.log('Posts deleted')

  console.log('=== Deleting all articles ===')
  const { error: articleError } = await supabase.from('articles').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (articleError) console.error('Article delete error:', articleError.message)
  else console.log('Articles deleted')

  console.log('=== Deleting all artists ===')
  const { error: artistError } = await supabase.from('artists').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (artistError) console.error('Artist delete error:', artistError.message)
  else console.log('Artists deleted')

  // 新しいソースを追加
  const newSources = [
    // YouTube Channels - UK/Afro シーン
    { name: 'SBTV', type: 'youtube', url: 'https://www.youtube.com/@SBTVonline', category: 'music', enabled: true },
    { name: 'Jamal Edwards Legacy', type: 'youtube', url: 'https://www.youtube.com/@JamalEdwards', category: 'music', enabled: true },
    { name: 'Reprezent Radio', type: 'youtube', url: 'https://www.youtube.com/@ReprezentRadio', category: 'music', enabled: true },
    { name: 'Boiler Room', type: 'youtube', url: 'https://www.youtube.com/@boaboromg', category: 'music', enabled: true },
    { name: 'NATIVE Magazine', type: 'youtube', url: 'https://www.youtube.com/@NATIVEMagazine', category: 'music', enabled: true },
    { name: 'TRACE', type: 'youtube', url: 'https://www.youtube.com/@trace', category: 'music', enabled: true },
    { name: 'Rinse FM', type: 'youtube', url: 'https://www.youtube.com/@RinseFM', category: 'music', enabled: true },
    { name: 'NTS Radio', type: 'youtube', url: 'https://www.youtube.com/@NTSLive', category: 'music', enabled: true },
    { name: 'BBC Radio 1Xtra', type: 'youtube', url: 'https://www.youtube.com/@1Xtra', category: 'music', enabled: true },
    { name: 'Capital XTRA', type: 'youtube', url: 'https://www.youtube.com/@CapitalXTRA', category: 'music', enabled: true },
    // Afrobeats / Amapiano
    { name: 'Afro Nation', type: 'youtube', url: 'https://www.youtube.com/@AfroNation', category: 'music', enabled: true },
    { name: 'Audiomack', type: 'youtube', url: 'https://www.youtube.com/@Audiomack', category: 'music', enabled: true },
    // UK Drill / Grime
    { name: 'Pressplay Media', type: 'youtube', url: 'https://www.youtube.com/@PressplayMedia', category: 'music', enabled: true },
    { name: 'Hardest Bars', type: 'youtube', url: 'https://www.youtube.com/@HardestBars', category: 'music', enabled: true },
    // Interviews / Features
    { name: 'No Signal', type: 'youtube', url: 'https://www.youtube.com/@NoSignalRadio', category: 'music', enabled: true },
    { name: 'Clash Magazine', type: 'youtube', url: 'https://www.youtube.com/@ClashMagazine', category: 'music', enabled: true },
  ]

  console.log('\n=== Adding new sources ===')
  for (const source of newSources) {
    // 既存チェック
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

  // 最終確認
  const { data: sources } = await supabase.from('sources').select('name, enabled').order('name')
  console.log('\n=== All Sources ===')
  sources?.forEach(s => console.log(`- ${s.name} ${s.enabled ? '✓' : '✗'}`))

  const { count: articleCount } = await supabase.from('articles').select('*', { count: 'exact', head: true })
  const { count: postCount } = await supabase.from('posts').select('*', { count: 'exact', head: true })
  console.log(`\nArticles: ${articleCount}, Posts: ${postCount}`)
}

main()
