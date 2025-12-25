import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createTagService } from '@/lib/tags/service'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { Tag, Article, ContentBlock, CONTENT_TYPE_LABELS, CONTENT_TYPES } from '@/types/database'
import { ShareButtons } from '@/components/ShareButtons'
import { SocialLinks } from '@/components/SocialLinks'
import { EmbedScripts } from '@/components/EmbedScripts'
import { ArticleContent } from '@/components/ArticleContent'
import { SpotifyPlaylist } from '@/components/SpotifyPlaylist'

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
    .select('title_ja, title_original, summary_ja, thumbnail_url, link')
    .eq('id', id)
    .in('status', ['published', 'posted'])
    .single()

  if (!article) {
    return { title: 'Not Found' }
  }

  const title = article.title_ja || article.title_original
  const description = article.summary_ja || ''

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://whosdat.jp'
  const hasImage = article.thumbnail_url || extractYouTubeVideoId(article.link || '')
  const ogImageUrl = hasImage ? `${baseUrl}/api/og/${id}` : null

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
    .select('*, sources(name, url), article_tags(tag_id, tags(*))')
    .eq('id', id)
    .in('status', ['published', 'posted'])
    .single()

  if (!article) {
    notFound()
  }

  const source = article.sources as { name: string; url: string } | null
  const youtubeVideoId = extractYouTubeVideoId(article.link)
  const articleTags = (article.article_tags as { tag_id: string; tags: Tag }[])?.map(at => at.tags).filter(Boolean) || []

  // 関連記事を取得
  let relatedArticles: Article[] = []
  if (articleTags.length > 0) {
    const serviceSupabase = await createServiceClient()
    const tagService = createTagService(serviceSupabase)
    relatedArticles = await tagService.getRelatedArticles(id, 4)
    relatedArticles = relatedArticles.filter(a => ['published', 'posted'].includes(a.status))
  }

  return (
    <div className="min-h-screen bg-[#0a1628]">
      {/* Header */}
      <header className="border-b border-[#1e3a5f]/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
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
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
            <Link
              href="/"
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white rounded-full whitespace-nowrap hover:bg-[#1e3a5f] transition-colors border border-[#1e3a5f]/50"
            >
              All
            </Link>
            {CONTENT_TYPES.map((type) => (
              <Link
                key={type}
                href={`/category/${type}`}
                className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors border border-[#1e3a5f]/50 ${
                  article.content_type === type
                    ? 'text-white bg-[#b87aff] border-[#b87aff]'
                    : 'text-gray-300 hover:text-white hover:bg-[#1e3a5f]'
                }`}
              >
                {CONTENT_TYPE_LABELS[type]}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Article */}
      <article className="max-w-4xl mx-auto px-4 py-8">
        {/* YouTube Embed or Thumbnail */}
        {youtubeVideoId ? (
          <div className="mb-8 rounded-2xl overflow-hidden aspect-video bg-[#152238] shadow-xl">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeVideoId}`}
              title={article.title_ja || article.title_original}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        ) : article.thumbnail_url && (
          <div className="mb-8 rounded-2xl overflow-hidden shadow-xl">
            <img
              src={article.thumbnail_url}
              alt=""
              className="w-full h-auto"
            />
          </div>
        )}

        {/* Content Type Badge */}
        {article.content_type && (
          <span className="inline-block px-3 py-1 bg-[#b87aff] text-white text-xs font-semibold rounded-full mb-4">
            {CONTENT_TYPE_LABELS[article.content_type as keyof typeof CONTENT_TYPE_LABELS]}
          </span>
        )}

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
          {article.title_ja || article.title_original}
        </h1>

        {/* Meta */}
        <div className="mt-4 flex items-center gap-4 text-sm text-gray-400">
          {source && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-[#b87aff] rounded-full" />
              {source.name}
            </span>
          )}
          {article.published_at && (
            <span>{new Date(article.published_at).toLocaleDateString('ja-JP')}</span>
          )}
          {article.author && <span>by {article.author}</span>}
        </div>

        {/* Tags */}
        {articleTags.length > 0 && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            {articleTags.map(tag => (
              <Link
                key={tag.id}
                href={`/?tag=${tag.slug}`}
                className="px-3 py-1 text-sm rounded-full transition-colors hover:opacity-80"
                style={{
                  backgroundColor: tag.color + '30',
                  color: tag.color,
                  border: `1px solid ${tag.color}50`
                }}
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="mt-8 bg-[#152238] rounded-2xl p-6 md:p-8 border border-[#1e3a5f]/30">
          {/* 外部記事の場合 */}
          {article.source_url ? (
            <>
              {article.summary_ja && (
                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-lg mb-8">
                  {article.summary_ja}
                </p>
              )}

              {article.excerpt_ja && (
                <blockquote className="border-l-4 border-[#b87aff] pl-6 py-4 my-8 bg-[#0a1628] rounded-r-lg">
                  <p className="text-gray-300 leading-relaxed whitespace-pre-wrap italic">
                    {article.excerpt_ja}
                  </p>
                  <footer className="mt-4 text-sm text-gray-500">
                    — {article.source_site_name || 'Original Article'}より抜粋
                  </footer>
                </blockquote>
              )}

              {article.content_blocks && Array.isArray(article.content_blocks) && (
                <div className="my-8 space-y-6">
                  {(article.content_blocks as ContentBlock[]).map((block, index) => {
                    if (block.type === 'embed' && block.platform === 'youtube') {
                      return (
                        <div key={index} className="aspect-video rounded-xl overflow-hidden">
                          <iframe
                            src={block.embedUrl || `https://www.youtube.com/embed/${block.embedId}`}
                            title="YouTube video"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full"
                          />
                        </div>
                      )
                    }
                    if (block.type === 'embed' && block.platform === 'spotify') {
                      return (
                        <div key={index} className="rounded-xl overflow-hidden">
                          <iframe
                            src={block.embedUrl}
                            title="Spotify embed"
                            allow="encrypted-media"
                            className="w-full h-[352px]"
                          />
                        </div>
                      )
                    }
                    if (block.type === 'image') {
                      return (
                        <img
                          key={index}
                          src={block.src}
                          alt={block.alt || ''}
                          className="w-full rounded-xl"
                        />
                      )
                    }
                    return null
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              {article.summary_ja ? (
                // HTMLコンテンツをレンダリング（リッチテキストエディターからの内容）
                <>
                  <ArticleContent
                    content={article.summary_ja}
                    className="text-gray-300 leading-relaxed text-lg prose prose-invert prose-lg max-w-none
                      prose-p:my-4 prose-p:leading-relaxed
                      prose-a:text-blue-400 prose-a:hover:text-blue-300 prose-a:underline
                      prose-strong:text-white prose-strong:font-bold
                      prose-em:text-gray-200
                      prose-headings:text-white prose-headings:font-bold
                      prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
                      prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
                      prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
                      prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6
                      prose-li:my-2
                      prose-blockquote:border-l-4 prose-blockquote:border-[#b87aff] prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-gray-400"
                  />
                  <EmbedScripts content={article.summary_ja} />
                </>
              ) : article.summary_original ? (
                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-lg">
                  {article.summary_original}
                </p>
              ) : null}
            </>
          )}
        </div>

        {/* Original Link */}
        <div className="mt-8">
          {article.source_url ? (
            <a
              href={article.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-6 py-3 bg-[#b87aff] hover:bg-[#d4a5ff] text-white font-medium rounded-xl transition-colors"
            >
              <span>元記事を読む（{article.source_site_name}）</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ) : (
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1e3a5f] hover:bg-[#2a4a70] text-white rounded-xl transition-colors border border-[#1e3a5f]"
            >
              <span>{youtubeVideoId ? 'YouTubeで見る' : '元記事を見る'}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>

        {/* Share Buttons */}
        <div className="mt-6">
          <ShareButtons
            url={`https://whosdat.jp/article/${id}`}
            title={article.title_ja || article.title_original}
          />
        </div>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <div className="mt-12 pt-8 border-t border-[#1e3a5f]/50">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-1 h-5 bg-[#b87aff] rounded-full" />
              関連記事
            </h2>
            <div className="grid gap-4">
              {relatedArticles.map(related => (
                <Link
                  key={related.id}
                  href={`/article/${related.id}`}
                  className="flex items-start gap-4 p-4 bg-[#152238] rounded-xl hover:bg-[#1e3a5f]/50 transition-colors border border-[#1e3a5f]/30"
                >
                  {related.thumbnail_url && (
                    <img
                      src={related.thumbnail_url}
                      alt=""
                      className="w-24 h-16 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium line-clamp-2 hover:text-[#d4a5ff] transition-colors">
                      {related.title_ja || related.title_original}
                    </h3>
                    {related.published_at && (
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(related.published_at).toLocaleDateString('ja-JP')}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Spotify Playlist */}
        <div className="mt-12 pt-8 border-t border-[#1e3a5f]/50">
          <div className="bg-[#152238] rounded-xl p-5 border border-[#1e3a5f]/30">
            <SpotifyPlaylist compact />
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-[#b87aff] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            記事一覧に戻る
          </Link>
        </div>
      </article>

      {/* Footer */}
      <footer className="border-t border-[#1e3a5f]/50 mt-16">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Image
              src="/logo.png"
              alt="Who's Dat"
              width={100}
              height={28}
              className="h-7 w-auto opacity-60"
            />
            <div className="flex items-center gap-6">
              <SocialLinks />
              <p className="text-gray-500 text-sm">
                Afro-diaspora Music Media from Japan
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
