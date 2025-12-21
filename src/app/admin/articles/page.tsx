import { createServiceClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ArticleList } from './article-list'
import Link from 'next/link'

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
        <Link
          href="/admin/articles/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          記事を追加
        </Link>
      </div>

      <ArticleList articles={articles ?? []} />
    </DashboardLayout>
  )
}
