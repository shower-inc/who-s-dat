// URLからOGP/メタデータを取得
export async function fetchUrlMetadata(url: string): Promise<{
  title: string
  description: string | null
  thumbnail: string | null
  author: string | null
}> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JUSMINE/1.0)',
      },
    })
    const html = await response.text()

    // OGP タグを優先的に取得
    const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1]
    const ogDescription = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1]
    const ogImage = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1]
    const ogAuthor = html.match(/<meta[^>]+property="article:author"[^>]+content="([^"]+)"/i)?.[1]

    // フォールバック: 通常のmetaタグ
    const metaTitle = html.match(/<title>([^<]+)<\/title>/i)?.[1]
    const metaDescription = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)?.[1]
    const metaAuthor = html.match(/<meta[^>]+name="author"[^>]+content="([^"]+)"/i)?.[1]

    // Twitter Card
    const twitterTitle = html.match(/<meta[^>]+name="twitter:title"[^>]+content="([^"]+)"/i)?.[1]
    const twitterDescription = html.match(/<meta[^>]+name="twitter:description"[^>]+content="([^"]+)"/i)?.[1]
    const twitterImage = html.match(/<meta[^>]+name="twitter:image"[^>]+content="([^"]+)"/i)?.[1]

    return {
      title: ogTitle || twitterTitle || metaTitle || url,
      description: ogDescription || twitterDescription || metaDescription || null,
      thumbnail: ogImage || twitterImage || null,
      author: ogAuthor || metaAuthor || null,
    }
  } catch (error) {
    console.error('Failed to fetch URL metadata:', error)
    return {
      title: url,
      description: null,
      thumbnail: null,
      author: null,
    }
  }
}
