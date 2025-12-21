import { createServiceClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ArticleList } from './article-list'

// キャッシュを無効化
export const dynamic = 'force-dynamic'

export default async function ArticlesPage() {
  const supabase = await createServiceClient()

  // 記事と関連する投稿、タグを取得
  const { data: articles, error } = await supabase
    .from('articles')
    .select('*, sources(name, category), posts(*), article_tags(tag_id, tags(*))')
    .order('fetched_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Articles query error:', error)
  }

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">記事一覧</h1>
      </div>

      <ArticleList articles={articles ?? []} />
    </DashboardLayout>
  )
}
