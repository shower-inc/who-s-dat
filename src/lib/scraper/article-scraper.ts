import { ContentBlock } from '@/types/database'

export interface ScrapedArticle {
  title: string
  author: string | null
  publishedAt: string | null
  thumbnailUrl: string | null
  siteName: string
  excerpt: string // 冒頭2-3段落（引用範囲）
  embeds: ContentBlock[]
  url: string
}

interface OGPData {
  title: string
  description: string
  image: string | null
  siteName: string
  author: string | null
  publishedTime: string | null
}

/**
 * URLからOGPメタデータを抽出
 */
async function extractOGP(html: string, url: string): Promise<OGPData> {
  // 基本的なメタタグパターン
  const getMetaContent = (name: string): string | null => {
    // og: property
    const ogMatch = html.match(new RegExp(`<meta[^>]+property=["']og:${name}["'][^>]+content=["']([^"']+)["']`, 'i'))
      || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${name}["']`, 'i'))
    if (ogMatch) return ogMatch[1]

    // twitter: name
    const twitterMatch = html.match(new RegExp(`<meta[^>]+name=["']twitter:${name}["'][^>]+content=["']([^"']+)["']`, 'i'))
    if (twitterMatch) return twitterMatch[1]

    // 通常の name
    const nameMatch = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'))
    if (nameMatch) return nameMatch[1]

    return null
  }

  // タイトル取得
  const ogTitle = getMetaContent('title')
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const title = ogTitle || titleMatch?.[1] || ''

  // サイト名取得
  const siteName = getMetaContent('site_name') || new URL(url).hostname.replace('www.', '')

  // 著者取得
  const author = getMetaContent('author')
    || html.match(/<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["']/i)?.[1]
    || null

  // 公開日取得
  const publishedTime = getMetaContent('published_time')
    || html.match(/<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i)?.[1]
    || null

  return {
    title: decodeHTMLEntities(title),
    description: decodeHTMLEntities(getMetaContent('description') || ''),
    image: getMetaContent('image'),
    siteName: decodeHTMLEntities(siteName),
    author: author ? decodeHTMLEntities(author) : null,
    publishedTime,
  }
}

/**
 * HTML本文から冒頭段落を抽出
 */
function extractExcerpt(html: string, maxParagraphs: number = 3): string {
  // 本文コンテナを探す（WordPressやその他CMSの一般的なクラス）
  const contentPatterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*class=["'][^"']*(?:entry-content|post-content|article-content|content-body)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
  ]

  let content = ''
  for (const pattern of contentPatterns) {
    const match = html.match(pattern)
    if (match) {
      content = match[1]
      break
    }
  }

  if (!content) {
    // フォールバック: body全体から探す
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    content = bodyMatch?.[1] || html
  }

  // 段落を抽出
  const paragraphPattern = /<p[^>]*>([\s\S]*?)<\/p>/gi
  const paragraphs: string[] = []
  let match

  while ((match = paragraphPattern.exec(content)) !== null && paragraphs.length < maxParagraphs) {
    const text = stripHtml(match[1]).trim()
    // 短すぎる段落や広告っぽいものはスキップ
    if (text.length > 50 && !text.includes('Advertisement') && !text.includes('Subscribe')) {
      paragraphs.push(text)
    }
  }

  return paragraphs.join('\n\n')
}

/**
 * HTML内の埋め込みコンテンツを抽出
 */
function extractEmbeds(html: string): ContentBlock[] {
  const embeds: ContentBlock[] = []

  // YouTube埋め込み
  const youtubePatterns = [
    /src=["'](?:https?:)?\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)/gi,
    /data-video-id=["']([a-zA-Z0-9_-]+)["']/gi,
  ]

  for (const pattern of youtubePatterns) {
    let match
    while ((match = pattern.exec(html)) !== null) {
      embeds.push({
        type: 'embed',
        platform: 'youtube',
        embedId: match[1],
        embedUrl: `https://www.youtube.com/embed/${match[1]}`,
      })
    }
  }

  // Spotify埋め込み
  const spotifyMatch = html.match(/src=["']https:\/\/open\.spotify\.com\/embed\/([^"']+)["']/gi)
  if (spotifyMatch) {
    for (const m of spotifyMatch) {
      const idMatch = m.match(/embed\/([^"']+)/)
      if (idMatch) {
        embeds.push({
          type: 'embed',
          platform: 'spotify',
          embedId: idMatch[1],
          embedUrl: `https://open.spotify.com/embed/${idMatch[1]}`,
        })
      }
    }
  }

  // SoundCloud埋め込み
  const soundcloudMatch = html.match(/src=["']https:\/\/w\.soundcloud\.com\/player\/[^"']+["']/gi)
  if (soundcloudMatch) {
    for (const m of soundcloudMatch) {
      embeds.push({
        type: 'embed',
        platform: 'soundcloud',
        embedId: m,
        embedUrl: m.replace(/src=["']|["']/g, ''),
      })
    }
  }

  return embeds
}

/**
 * HTMLタグを除去
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * HTMLエンティティをデコード
 */
function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ')
}

/**
 * 外部記事をスクレイピング
 */
export async function scrapeArticle(url: string): Promise<ScrapedArticle> {
  // URLをフェッチ
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; WhosDAT/1.0; +https://whosdat.jp)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,ja;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
  }

  const html = await response.text()

  // OGPメタデータを抽出
  const ogp = await extractOGP(html, url)

  // 本文冒頭を抽出
  const excerpt = extractExcerpt(html)

  // 埋め込みコンテンツを抽出
  const embeds = extractEmbeds(html)

  return {
    title: ogp.title,
    author: ogp.author,
    publishedAt: ogp.publishedTime,
    thumbnailUrl: ogp.image,
    siteName: ogp.siteName,
    excerpt: excerpt || ogp.description,
    embeds,
    url,
  }
}

/**
 * スクレイピング結果をContentBlocksに変換
 */
export function toContentBlocks(scraped: ScrapedArticle): ContentBlock[] {
  const blocks: ContentBlock[] = []

  // 抜粋テキストをブロックに
  if (scraped.excerpt) {
    blocks.push({
      type: 'text',
      content: scraped.excerpt,
    })
  }

  // 埋め込みを追加
  blocks.push(...scraped.embeds)

  // CTAを追加
  blocks.push({
    type: 'cta',
    text: '元記事を読む',
    url: scraped.url,
  })

  return blocks
}
