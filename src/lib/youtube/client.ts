const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

export interface VideoDetails {
  videoId: string
  description: string | null
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

  return {
    videoId,
    description: item.snippet?.description || null,
    viewCount: item.statistics?.viewCount ? parseInt(item.statistics.viewCount, 10) : null,
    likeCount: item.statistics?.likeCount ? parseInt(item.statistics.likeCount, 10) : null,
    tags: item.snippet?.tags || [],
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
      results.set(item.id, {
        videoId: item.id,
        description: item.snippet?.description || null,
        viewCount: item.statistics?.viewCount ? parseInt(item.statistics.viewCount, 10) : null,
        likeCount: item.statistics?.likeCount ? parseInt(item.statistics.likeCount, 10) : null,
        tags: item.snippet?.tags || [],
      })
    }
  }

  return results
}
