import Parser from 'rss-parser'
import crypto from 'crypto'

const parser = new Parser({
  customFields: {
    item: [
      ['media:group', 'mediaGroup'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['yt:videoId', 'ytVideoId'],
    ],
  },
})

export interface FetchedArticle {
  external_id: string
  title_original: string
  summary_original: string | null
  link: string
  thumbnail_url: string | null
  author: string | null
  published_at: string | null
}

function generateExternalId(link: string): string {
  return crypto.createHash('md5').update(link).digest('hex')
}

export async function fetchRssFeed(url: string): Promise<FetchedArticle[]> {
  const feed = await parser.parseURL(url)
  const articles: FetchedArticle[] = []

  for (const item of feed.items) {
    // YouTube動画の場合、サムネイルを取得
    let thumbnailUrl: string | null = null
    const ytVideoId = (item as { ytVideoId?: string }).ytVideoId
    if (ytVideoId) {
      thumbnailUrl = `https://i.ytimg.com/vi/${ytVideoId}/hqdefault.jpg`
    }

    // メディアサムネイルがある場合
    const mediaThumbnail = (item as { mediaThumbnail?: { $?: { url?: string } } }).mediaThumbnail
    if (!thumbnailUrl && mediaThumbnail?.$?.url) {
      thumbnailUrl = mediaThumbnail.$.url
    }

    articles.push({
      external_id: generateExternalId(item.link || item.guid || item.title || ''),
      title_original: item.title || 'Untitled',
      summary_original: item.contentSnippet || item.content || null,
      link: item.link || '',
      thumbnail_url: thumbnailUrl,
      author: item.creator || (item as { author?: string }).author || null,
      published_at: item.isoDate || item.pubDate || null,
    })
  }

  return articles
}
