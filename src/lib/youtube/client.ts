const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

export interface VideoDetails {
  videoId: string
  title: string
  channelTitle: string
  channelId: string
  description: string | null
  publishedAt: string | null
  thumbnailUrl: string | null
  viewCount: number | null
  likeCount: number | null
  tags: string[]
}

function getApiKey(): string {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY is not set')
  }
  return apiKey
}

export function extractVideoId(url: string): string | null {
  // YouTube URL patterns:
  // https://www.youtube.com/watch?v=VIDEO_ID
  // https://youtu.be/VIDEO_ID
  // https://www.youtube.com/embed/VIDEO_ID
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }
  return null
}

export async function getVideoDetails(videoId: string): Promise<VideoDetails | null> {
  const apiKey = getApiKey()

  const params = new URLSearchParams({
    part: 'snippet,statistics',
    id: videoId,
    key: apiKey,
  })

  const response = await fetch(`${YOUTUBE_API_BASE}/videos?${params}`)

  if (!response.ok) {
    console.error(`YouTube API error: ${response.status} ${response.statusText}`)
    return null
  }

  const data = await response.json()

  if (!data.items || data.items.length === 0) {
    return null
  }

  const item = data.items[0]
  const snippet = item.snippet || {}
  const thumbnails = snippet.thumbnails || {}

  return {
    videoId,
    title: snippet.title || '',
    channelTitle: snippet.channelTitle || '',
    channelId: snippet.channelId || '',
    description: snippet.description || null,
    publishedAt: snippet.publishedAt || null,
    thumbnailUrl: thumbnails.maxres?.url || thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url || null,
    viewCount: item.statistics?.viewCount ? parseInt(item.statistics.viewCount, 10) : null,
    likeCount: item.statistics?.likeCount ? parseInt(item.statistics.likeCount, 10) : null,
    tags: snippet.tags || [],
  }
}

export interface ChannelInfo {
  channelId: string
  title: string
  description: string | null
  thumbnailUrl: string | null
  subscriberCount: number | null
}

// Get channel ID from @handle
export async function getChannelByHandle(handle: string): Promise<ChannelInfo | null> {
  const apiKey = getApiKey()

  // Remove @ if present
  const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle

  const params = new URLSearchParams({
    part: 'snippet,statistics',
    forHandle: cleanHandle,
    key: apiKey,
  })

  const response = await fetch(`${YOUTUBE_API_BASE}/channels?${params}`)

  if (!response.ok) {
    console.error(`YouTube API error: ${response.status} ${response.statusText}`)
    return null
  }

  const data = await response.json()

  if (!data.items || data.items.length === 0) {
    return null
  }

  const item = data.items[0]

  return {
    channelId: item.id,
    title: item.snippet?.title || '',
    description: item.snippet?.description || null,
    thumbnailUrl: item.snippet?.thumbnails?.default?.url || null,
    subscriberCount: item.statistics?.subscriberCount ? parseInt(item.statistics.subscriberCount, 10) : null,
  }
}

// Get channel by ID
export async function getChannelById(channelId: string): Promise<ChannelInfo | null> {
  const apiKey = getApiKey()

  const params = new URLSearchParams({
    part: 'snippet,statistics',
    id: channelId,
    key: apiKey,
  })

  const response = await fetch(`${YOUTUBE_API_BASE}/channels?${params}`)

  if (!response.ok) {
    console.error(`YouTube API error: ${response.status} ${response.statusText}`)
    return null
  }

  const data = await response.json()

  if (!data.items || data.items.length === 0) {
    return null
  }

  const item = data.items[0]

  return {
    channelId: item.id,
    title: item.snippet?.title || '',
    description: item.snippet?.description || null,
    thumbnailUrl: item.snippet?.thumbnails?.default?.url || null,
    subscriberCount: item.statistics?.subscriberCount ? parseInt(item.statistics.subscriberCount, 10) : null,
  }
}

export async function getMultipleVideoDetails(videoIds: string[]): Promise<Map<string, VideoDetails>> {
  if (videoIds.length === 0) {
    return new Map()
  }

  const apiKey = getApiKey()
  const results = new Map<string, VideoDetails>()

  // YouTube API allows up to 50 video IDs per request
  const chunks = []
  for (let i = 0; i < videoIds.length; i += 50) {
    chunks.push(videoIds.slice(i, i + 50))
  }

  for (const chunk of chunks) {
    const params = new URLSearchParams({
      part: 'snippet,statistics',
      id: chunk.join(','),
      key: apiKey,
    })

    const response = await fetch(`${YOUTUBE_API_BASE}/videos?${params}`)

    if (!response.ok) {
      console.error(`YouTube API error: ${response.status} ${response.statusText}`)
      continue
    }

    const data = await response.json()

    for (const item of data.items || []) {
      const snippet = item.snippet || {}
      const thumbnails = snippet.thumbnails || {}
      results.set(item.id, {
        videoId: item.id,
        title: snippet.title || '',
        channelTitle: snippet.channelTitle || '',
        channelId: snippet.channelId || '',
        description: snippet.description || null,
        publishedAt: snippet.publishedAt || null,
        thumbnailUrl: thumbnails.maxres?.url || thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url || null,
        viewCount: item.statistics?.viewCount ? parseInt(item.statistics.viewCount, 10) : null,
        likeCount: item.statistics?.likeCount ? parseInt(item.statistics.likeCount, 10) : null,
        tags: snippet.tags || [],
      })
    }
  }

  return results
}
