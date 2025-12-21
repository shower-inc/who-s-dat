import Parser from 'rss-parser'
import crypto from 'crypto'
import { getMultipleVideoDetails, extractVideoId } from '../youtube/client'

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
  view_count: number | null
  like_count: number | null
}

function generateExternalId(link: string): string {
  return crypto.createHash('md5').update(link).digest('hex')
}

export async function fetchRssFeed(url: string): Promise<FetchedArticle[]> {
  let feed
  try {
    feed = await parser.parseURL(url)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to fetch RSS from ${url}: ${message}`)
  }
  const articles: FetchedArticle[] = []

  // YouTube動画IDを収集
  const videoIds: string[] = []
  const itemVideoIdMap = new Map<number, string>()

  feed.items.forEach((item, index) => {
    const ytVideoId = (item as { ytVideoId?: string }).ytVideoId
    if (ytVideoId) {
      videoIds.push(ytVideoId)
      itemVideoIdMap.set(index, ytVideoId)
    } else if (item.link) {
      const extractedId = extractVideoId(item.link)
      if (extractedId) {
        videoIds.push(extractedId)
        itemVideoIdMap.set(index, extractedId)
      }
    }
  })

  // YouTube Data APIで詳細情報を一括取得
  let videoDetailsMap = new Map<string, { description: string | null; viewCount: number | null; likeCount: number | null }>()
  if (videoIds.length > 0 && process.env.YOUTUBE_API_KEY) {
    try {
      const details = await getMultipleVideoDetails(videoIds)
      videoDetailsMap = details
    } catch (error) {
      console.error('Failed to fetch YouTube video details:', error)
    }
  }

  feed.items.forEach((item, index) => {
    // YouTube動画の場合、サムネイルを取得
    let thumbnailUrl: string | null = null
    const ytVideoId = itemVideoIdMap.get(index)
    if (ytVideoId) {
      thumbnailUrl = `https://i.ytimg.com/vi/${ytVideoId}/hqdefault.jpg`
    }

    // メディアサムネイルがある場合
    const mediaThumbnail = (item as { mediaThumbnail?: { $?: { url?: string } } }).mediaThumbnail
    if (!thumbnailUrl && mediaThumbnail?.$?.url) {
      thumbnailUrl = mediaThumbnail.$.url
    }

    // YouTube APIから取得した詳細情報
    const videoDetails = ytVideoId ? videoDetailsMap.get(ytVideoId) : null
    const summaryFromApi = videoDetails?.description
    const summaryFromRss = item.contentSnippet || item.content || null

    articles.push({
      external_id: generateExternalId(item.link || item.guid || item.title || ''),
      title_original: item.title || 'Untitled',
      summary_original: summaryFromApi || summaryFromRss,
      link: item.link || '',
      thumbnail_url: thumbnailUrl,
      author: item.creator || (item as { author?: string }).author || null,
      published_at: item.isoDate || item.pubDate || null,
      view_count: videoDetails?.viewCount ?? null,
      like_count: videoDetails?.likeCount ?? null,
    })
  })

  return articles
}
