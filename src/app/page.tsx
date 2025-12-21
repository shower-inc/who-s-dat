import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const revalidate = 60 // 1分ごとに再検証

export default async function Home() {
  const supabase = await createClient()

  const { data: articles } = await supabase
    .from('articles')
    .select('*, sources(name)')
    .in('status', ['published', 'posted'])
    .order('published_at', { ascending: false })
    .limit(20)

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-white">WHO&apos;S DAT</h1>
          <p className="text-gray-400 mt-1">UK Afrobeats / Amapiano / Afro-diaspora Music</p>
        </div>
      </header>

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
