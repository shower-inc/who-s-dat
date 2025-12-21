import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'

export const revalidate = 60

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()

  const { data: article } = await supabase
    .from('articles')
    .select('title_ja, title_original, summary_ja, thumbnail_url')
    .eq('id', id)
    .in('status', ['published', 'posted'])
    .single()

  if (!article) {
    return { title: 'Not Found' }
  }

  const title = article.title_ja || article.title_original
  const description = article.summary_ja || ''

  // 自前のOG画像プロキシを使用（外部URLより確実）
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://who-s-dat.vercel.app'
  const ogImageUrl = article.thumbnail_url ? `${baseUrl}/api/og/${id}` : null

  return {
    title: `${title} | WHO'S DAT`,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      images: ogImageUrl ? [ogImageUrl] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImageUrl ? [ogImageUrl] : [],
    },
  }
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: article } = await supabase
    .from('articles')
    .select('*, sources(name, url)')
    .eq('id', id)
    .in('status', ['published', 'posted'])
    .single()

  if (!article) {
    notFound()
  }

  const source = article.sources as { name: string; url: string } | null
  const youtubeVideoId = extractYouTubeVideoId(article.link)

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link href="/" className="text-xl font-bold text-white hover:text-gray-300 transition-colors">
            WHO&apos;S DAT
          </Link>
        </div>
      </header>

      {/* Article */}
      <article className="max-w-3xl mx-auto px-4 py-8">
        {/* YouTube Embed or Thumbnail */}
        {youtubeVideoId ? (
          <div className="mb-6 rounded-xl overflow-hidden aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeVideoId}`}
              title={article.title_ja || article.title_original}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        ) : article.thumbnail_url && (
          <div className="mb-6 rounded-xl overflow-hidden">
            <img
              src={article.thumbnail_url}
              alt=""
              className="w-full h-auto"
            />
          </div>
        )}

        {/* Title */}
        <h1 className="text-3xl font-bold text-white leading-tight">
          {article.title_ja || article.title_original}
        </h1>

        {/* Meta */}
        <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
          {source && <span>{source.name}</span>}
          {article.published_at && (
            <span>{new Date(article.published_at).toLocaleDateString('ja-JP')}</span>
          )}
          {article.author && <span>by {article.author}</span>}
        </div>

        {/* Content */}
        <div className="mt-8 prose prose-invert prose-lg max-w-none">
          {article.summary_ja ? (
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
              {article.summary_ja}
            </p>
          ) : article.summary_original ? (
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
              {article.summary_original}
            </p>
          ) : null}
        </div>

        {/* Original Link */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <span>{youtubeVideoId ? 'YouTubeで見る' : '元記事を見る'}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        {/* Back Link */}
        <div className="mt-8">
          <Link
            href="/"
            className="text-gray-400 hover:text-white transition-colors"
          >
            &larr; 記事一覧に戻る
          </Link>
        </div>
      </article>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-16">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <p className="text-gray-500 text-sm text-center">
            WHO&apos;S DAT - Afro-diaspora Music Media
          </p>
        </div>
      </footer>
    </div>
  )
}
