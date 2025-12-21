import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function clearAllData() {
  console.log('Deleting all posts...')
  const { error: postsError } = await supabase
    .from('posts')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

  if (postsError) {
    console.error('Error deleting posts:', postsError)
  } else {
    console.log('Posts deleted successfully')
  }

  console.log('Deleting all articles...')
  const { error: articlesError } = await supabase
    .from('articles')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

  if (articlesError) {
    console.error('Error deleting articles:', articlesError)
  } else {
    console.log('Articles deleted successfully')
  }

  console.log('Done!')
}

clearAllData()
