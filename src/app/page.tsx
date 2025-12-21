import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
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

  // 最新の記事をフィーチャー
  const featuredArticle = articles?.[0]
  const restArticles = articles?.slice(1) || []

  return (
    <div className="min-h-screen bg-[#0a1628]">
      {/* Header */}
      <header className="border-b border-[#1e3a5f]/50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Who's Dat"
                width={140}
                height={40}
                className="h-10 w-auto"
              />
            </Link>
            <p className="text-[#b87aff]/80 text-sm hidden sm:block">
              UK Afrobeats / Amapiano / Afro-diaspora
            </p>
          </div>
        </div>
      </header>

      {/* Category Navigation */}
      <nav className="border-b border-[#1e3a5f]/50 sticky top-0 bg-[#0a1628]/95 backdrop-blur-md z-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
            <Link
              href="/"
              className="px-4 py-2 text-sm font-medium text-white bg-[#b87aff] rounded-full whitespace-nowrap hover:bg-[#d4a5ff] transition-colors"
            >
              All
            </Link>
            {CONTENT_TYPES.map((type) => (
              <Link
                key={type}
                href={`/category/${type}`}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white rounded-full whitespace-nowrap hover:bg-[#1e3a5f] transition-colors border border-[#1e3a5f]/50"
              >
                {CONTENT_TYPE_LABELS[type]}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {articles && articles.length > 0 ? (
          <div className="space-y-10">
            {/* Featured Article */}
            {featuredArticle && (
              <section>
                <Link href={`/article/${featuredArticle.id}`} className="group block">
                  <div className="relative rounded-2xl overflow-hidden bg-[#152238] card-hover">
                    {featuredArticle.thumbnail_url ? (
                      <div className="aspect-[21/9] w-full">
                        <img
                          src={featuredArticle.thumbnail_url}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-[#0a1628]/50 to-transparent" />
                      </div>
                    ) : (
                      <div className="aspect-[21/9] w-full bg-gradient-to-br from-[#1e3a5f] to-[#0a1628]" />
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                      {featuredArticle.content_type && (
                        <span className="inline-block px-3 py-1 bg-[#b87aff] text-white text-xs font-semibold rounded-full mb-3">
                          {CONTENT_TYPE_LABELS[featuredArticle.content_type as keyof typeof CONTENT_TYPE_LABELS]}
                        </span>
                      )}
                      <h2 className="text-2xl md:text-3xl font-bold text-white group-hover:text-[#d4a5ff] transition-colors line-clamp-2">
                        {featuredArticle.title_ja || featuredArticle.title_original}
                      </h2>
                      {featuredArticle.summary_ja && (
                        <p className="mt-3 text-gray-300 line-clamp-2 max-w-3xl">
                          {featuredArticle.summary_ja}
                        </p>
                      )}
                      <div className="mt-4 flex items-center gap-4 text-sm text-gray-400">
                        <span>{(featuredArticle.sources as { name: string } | null)?.name}</span>
                        {featuredArticle.published_at && (
                          <span>{new Date(featuredArticle.published_at).toLocaleDateString('ja-JP')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </section>
            )}

            {/* Latest Section */}
            {restArticles.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-[#b87aff] mb-6 flex items-center gap-2">
                  <span className="w-1 h-5 bg-[#b87aff] rounded-full" />
                  Latest
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {restArticles.map((article) => (
                    <article key={article.id}>
                      <Link href={`/article/${article.id}`} className="group block">
                        <div className="bg-[#152238] rounded-xl overflow-hidden card-hover border border-[#1e3a5f]/30">
                          {article.thumbnail_url && (
                            <div className="aspect-video w-full overflow-hidden">
                              <img
                                src={article.thumbnail_url}
                                alt=""
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            </div>
                          )}
                          <div className="p-4">
                            {article.content_type && (
                              <span className="inline-block px-2 py-0.5 bg-[#b87aff]/20 text-[#d4a5ff] text-xs font-medium rounded mb-2">
                                {CONTENT_TYPE_LABELS[article.content_type as keyof typeof CONTENT_TYPE_LABELS]}
                              </span>
                            )}
                            <h2 className="text-base font-semibold text-white group-hover:text-[#d4a5ff] transition-colors line-clamp-2">
                              {article.title_ja || article.title_original}
                            </h2>
                            {article.summary_ja && (
                              <p className="mt-2 text-gray-400 text-sm line-clamp-2">
                                {article.summary_ja}
                              </p>
                            )}
                            <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
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
              </section>
            )}
          </div>
        ) : (
          <div className="text-center py-24">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#152238] flex items-center justify-center">
              <span className="text-3xl">🎵</span>
            </div>
            <p className="text-gray-400 text-lg">Coming soon...</p>
            <p className="text-gray-500 text-sm mt-2">記事を準備中です</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1e3a5f]/50 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Image
              src="/logo.png"
              alt="Who's Dat"
              width={100}
              height={28}
              className="h-7 w-auto opacity-60"
            />
            <p className="text-gray-500 text-sm">
              Afro-diaspora Music Media from Japan
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
