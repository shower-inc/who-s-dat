import { createServiceClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createServiceClient()

  // 統計データ取得
  const { count: sourcesCount } = await supabase
    .from('sources')
    .select('*', { count: 'exact', head: true })
    .eq('enabled', true)

  const { count: articlesCount } = await supabase
    .from('articles')
    .select('*', { count: 'exact', head: true })

  const { count: pendingCount } = await supabase
    .from('articles')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  const { count: postedCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'posted')

  const stats = [
    { label: '有効なソース', value: sourcesCount ?? 0, icon: '📡' },
    { label: '総記事数', value: articlesCount ?? 0, icon: '📰' },
    { label: '未処理', value: pendingCount ?? 0, icon: '⏳' },
    { label: '投稿済み', value: postedCount ?? 0, icon: '✅' },
  ]

  // 最新の記事
  const { data: recentArticles } = await supabase
    .from('articles')
    .select('*, sources(name)')
    .order('fetched_at', { ascending: false })
    .limit(5)

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold text-white mb-8">ダッシュボード</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6"
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl">{stat.icon}</span>
              <div>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-gray-400">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Articles */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">最新の記事</h2>
        {recentArticles && recentArticles.length > 0 ? (
          <ul className="space-y-4">
            {recentArticles.map((article) => (
              <li
                key={article.id}
                className="flex items-start gap-4 p-4 bg-gray-800 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">
                    {article.title_ja || article.title_original}
                  </p>
                  <p className="text-sm text-gray-400">
                    {(article.sources as { name: string } | null)?.name} • {article.status}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    article.status === 'posted'
                      ? 'bg-green-900 text-green-300'
                      : article.status === 'pending'
                      ? 'bg-yellow-900 text-yellow-300'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {article.status}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400">まだ記事がありません。ソースを追加して取得しましょう！</p>
        )}
      </div>
    </DashboardLayout>
  )
}
