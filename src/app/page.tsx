import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CONTENT_TYPE_LABELS, CONTENT_TYPES } from '@/types/database'

export const revalidate = 60 // 1分ごとに再検証

export default async function Home() {
  const supabase = await createClient()

  const { data: articles, error } = await supabase
    .from('articles')
    .select('*, sources(name)')
    .in('status', ['published', 'posted'])
    .order('published_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Failed to fetch articles:', error)
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/">
            <h1 className="text-3xl font-bold text-white">WHO&apos;S DAT</h1>
          </Link>
          <p className="text-gray-400 mt-1">UK Afrobeats / Amapiano / Afro-diaspora Music</p>
        </div>
      </header>

      {/* Category Navigation */}
      <nav className="border-b border-gray-800 sticky top-0 bg-black/95 backdrop-blur z-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-3 scrollbar-hide">
            <Link
              href="/"
              className="px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-full whitespace-nowrap hover:bg-gray-700 transition-colors"
            >
              All
            </Link>
            {CONTENT_TYPES.map((type) => (
              <Link
                key={type}
                href={`/category/${type}`}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white rounded-full whitespace-nowrap hover:bg-gray-800 transition-colors"
              >
                {CONTENT_TYPE_LABELS[type]}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {articles && articles.length > 0 ? (
          <div className="space-y-8">
            {articles.map((article) => (
              <article key={article.id} className="border-b border-gray-800 pb-8">
                <Link href={`/article/${article.id}`} className="group">
                  <div className="flex gap-4">
                    {article.thumbnail_url && (
                      <div className="flex-shrink-0 w-32 h-20 bg-gray-800 rounded-lg overflow-hidden">
                        <img
                          src={article.thumbnail_url}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                        {article.title_ja || article.title_original}
                      </h2>
                      {article.summary_ja && (
                        <p className="mt-2 text-gray-400 text-sm line-clamp-2">
                          {article.summary_ja}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                        {article.content_type && (
                          <span className="px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded">
                            {CONTENT_TYPE_LABELS[article.content_type as keyof typeof CONTENT_TYPE_LABELS]}
                          </span>
                        )}
                        <span>{(article.sources as { name: string } | null)?.name}</span>
                        {article.published_at && (
                          <span>{new Date(article.published_at).toLocaleDateString('ja-JP')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-500">No articles yet</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-16">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <p className="text-gray-500 text-sm text-center">
            WHO&apos;S DAT - Afro-diaspora Music Media
          </p>
        </div>
      </footer>
    </div>
  )
}
