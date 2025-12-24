// TikTok/Instagram/YouTube/Spotify/SoundCloud/Bandcamp oEmbed utility

export interface OEmbedResult {
  html: string
  provider: 'tiktok' | 'instagram' | 'youtube' | 'spotify' | 'soundcloud' | 'bandcamp'
}

// TikTok URLからoEmbed HTMLを取得
export async function getTikTokEmbed(url: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
    )
    if (!response.ok) return null

    const data = await response.json()
    return data.html || null
  } catch (error) {
    console.error('TikTok oEmbed error:', error)
    return null
  }
}

// Instagram URLからoEmbed HTMLを取得（認証不要の方法）
export async function getInstagramEmbed(url: string): Promise<string | null> {
  try {
    // Instagram oEmbed API（公開投稿のみ）
    const response = await fetch(
      `https://api.instagram.com/oembed?url=${encodeURIComponent(url)}&omitscript=true`
    )
    if (!response.ok) return null

    const data = await response.json()
    return data.html || null
  } catch (error) {
    console.error('Instagram oEmbed error:', error)
    return null
  }
}

// URLからプロバイダーを判定
export function detectEmbedProvider(url: string): 'tiktok' | 'instagram' | 'youtube' | 'spotify' | 'soundcloud' | 'bandcamp' | null {
  if (url.includes('tiktok.com')) return 'tiktok'
  if (url.includes('instagram.com')) return 'instagram'
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('open.spotify.com')) return 'spotify'
  if (url.includes('soundcloud.com')) return 'soundcloud'
  if (url.includes('.bandcamp.com')) return 'bandcamp'
  return null
}

// URLからembed HTMLを取得
export async function getEmbedHtml(url: string): Promise<OEmbedResult | null> {
  const provider = detectEmbedProvider(url)

  if (provider === 'tiktok') {
    const html = await getTikTokEmbed(url)
    if (html) return { html, provider: 'tiktok' }
  }

  if (provider === 'instagram') {
    const html = await getInstagramEmbed(url)
    if (html) return { html, provider: 'instagram' }
  }

  if (provider === 'youtube') {
    const html = await getYouTubeEmbed(url)
    if (html) return { html, provider: 'youtube' }
  }

  if (provider === 'spotify') {
    const html = await getSpotifyEmbed(url)
    if (html) return { html, provider: 'spotify' }
  }

  if (provider === 'soundcloud') {
    const html = await getSoundCloudEmbed(url)
    if (html) return { html, provider: 'soundcloud' }
  }

  if (provider === 'bandcamp') {
    const html = await getBandcampEmbed(url)
    if (html) return { html, provider: 'bandcamp' }
  }

  return null
}

// TikTok URL判定
export function isTikTokUrl(url: string): boolean {
  return /tiktok\.com\/@[\w.-]+\/video\/\d+/.test(url) ||
         /vm\.tiktok\.com\/[\w]+/.test(url)
}

// Instagram URL判定
export function isInstagramUrl(url: string): boolean {
  return /instagram\.com\/(p|reel)\/[\w-]+/.test(url)
}

// YouTube URL判定
export function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[\w-]+/.test(url)
}

// YouTube URLからoEmbed HTMLを取得
export async function getYouTubeEmbed(url: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    )
    if (!response.ok) return null

    const data = await response.json()
    return data.html || null
  } catch (error) {
    console.error('YouTube oEmbed error:', error)
    return null
  }
}

// Spotify URL判定（track, album, artist, playlist, episode）
export function isSpotifyUrl(url: string): boolean {
  return /open\.spotify\.com\/(track|album|artist|playlist|episode)\/[\w]+/.test(url)
}

// Spotify URLからoEmbed HTMLを取得
export async function getSpotifyEmbed(url: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`
    )
    if (!response.ok) return null

    const data = await response.json()
    return data.html || null
  } catch (error) {
    console.error('Spotify oEmbed error:', error)
    return null
  }
}

// SoundCloud URL判定
export function isSoundCloudUrl(url: string): boolean {
  return /soundcloud\.com\/[\w-]+/.test(url)
}

// SoundCloud URLからoEmbed HTMLを取得
export async function getSoundCloudEmbed(url: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`
    )
    if (!response.ok) return null

    const data = await response.json()
    return data.html || null
  } catch (error) {
    console.error('SoundCloud oEmbed error:', error)
    return null
  }
}

// Bandcamp URL判定
export function isBandcampUrl(url: string): boolean {
  return /[\w-]+\.bandcamp\.com/.test(url)
}

// Bandcamp URLからoEmbed HTMLを取得
export async function getBandcampEmbed(url: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://bandcamp.com/oembed?url=${encodeURIComponent(url)}&format=json`
    )
    if (!response.ok) return null

    const data = await response.json()
    return data.html || null
  } catch (error) {
    console.error('Bandcamp oEmbed error:', error)
    return null
  }
}
