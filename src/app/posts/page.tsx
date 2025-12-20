import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { PostList } from './post-list'

export default async function PostsPage() {
  const supabase = await createClient()

  const { data: posts } = await supabase
    .from('posts')
    .select('*, articles(title_ja, title_original, link, sources(name))')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Posts</h1>
      </div>

      <PostList posts={posts ?? []} />
    </DashboardLayout>
  )
}
