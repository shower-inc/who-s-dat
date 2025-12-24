// TikTok/Instagram oEmbed utility

export interface OEmbedResult {
  html: string
  provider: 'tiktok' | 'instagram'
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
export function detectEmbedProvider(url: string): 'tiktok' | 'instagram' | 'youtube' | null {
  if (url.includes('tiktok.com')) return 'tiktok'
  if (url.includes('instagram.com')) return 'instagram'
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
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
