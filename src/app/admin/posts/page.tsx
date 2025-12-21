import { createServiceClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

export const dynamic = 'force-dynamic'

export default async function PostsPage() {
  const supabase = await createServiceClient()

  // 投稿済みのもののみ取得（履歴表示）
  const { data: posts } = await supabase
    .from('posts')
    .select('*, articles(title_ja, title_original, link, sources(name))')
    .eq('status', 'posted')
    .order('posted_at', { ascending: false })
    .limit(50)

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">X投稿履歴</h1>
      </div>

      {(!posts || posts.length === 0) ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400">まだX投稿履歴がありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-white whitespace-pre-wrap">{post.content}</p>
                  <div className="flex items-center gap-4 mt-4 text-sm text-gray-400">
                    <span>{post.articles?.sources?.name}</span>
                    <span>
                      {post.articles?.title_ja || post.articles?.title_original}
                    </span>
                    {post.posted_at && (
                      <span>投稿: {new Date(post.posted_at).toLocaleString('ja-JP')}</span>
                    )}
                  </div>
                </div>
                <span className="px-2 py-1 text-xs rounded bg-green-900 text-green-300">
                  投稿済
                </span>
              </div>
              {post.articles?.link && (
                <div className="mt-4">
                  <a
                    href={post.articles.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    元記事を見る →
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
