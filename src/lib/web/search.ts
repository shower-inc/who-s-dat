// Web検索でアーティスト情報を取得
// Brave Search APIを使用

const BRAVE_API_ENDPOINT = 'https://api.search.brave.com/res/v1/web/search'

export interface ArtistInfo {
  name: string
  origin: string | null
  genre: string | null
  description: string | null
  searchQuery: string
}

export async function searchArtistInfo(artistName: string): Promise<ArtistInfo | null> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) {
    console.warn('BRAVE_SEARCH_API_KEY is not set, skipping artist search')
    return null
  }

  try {
    // UK/Afro音楽シーンに絞った検索クエリ
    const query = `${artistName} UK rapper singer artist music`
    const params = new URLSearchParams({
      q: query,
      count: '5',
      text_decorations: 'false',
      search_lang: 'en',
    })

    const response = await fetch(`${BRAVE_API_ENDPOINT}?${params}`, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': apiKey,
      },
    })

    if (!response.ok) {
      console.error('Brave Search API error:', response.status)
      return null
    }

    const data = await response.json()
    const results = data.web?.results || []

    if (results.length === 0) {
      return null
    }

    // 検索結果から情報を抽出
    const descriptions: string[] = []
    let origin: string | null = null
    let genre: string | null = null

    for (const result of results.slice(0, 3)) {
      const desc = result.description || ''
      descriptions.push(desc)

      // 出身地を探す（UK, London, Nigeria, Ghana など）
      if (!origin) {
        const originMatch = desc.match(/\b(British|UK|London|English|Nigerian|Ghanaian|South African|Jamaican|American)\b/i)
        if (originMatch) {
          origin = originMatch[1]
        }
      }

      // ジャンルを探す
      if (!genre) {
        const genreMatch = desc.match(/\b(Afrobeats|Amapiano|UK Rap|Grime|R&B|Hip Hop|Drill|Dancehall|Reggae|Afropop)\b/i)
        if (genreMatch) {
          genre = genreMatch[1]
        }
      }
    }

    return {
      name: artistName,
      origin,
      genre,
      description: descriptions.join(' ').slice(0, 500),
      searchQuery: query,
    }
  } catch (error) {
    console.error('Artist search error:', error)
    return null
  }
}

// タイトルからアーティスト名を抽出
export function extractArtistName(title: string): string | null {
  // よくあるパターン:
  // "Artist Name - Song Title"
  // "Artist Name ft. Artist2 - Song Title"
  // "Artist Name 'Song Title'"
  // "Artist Name | Song Title"

  // "Artist - Song" パターン
  const dashMatch = title.match(/^([^-]+)\s*-\s*/)
  if (dashMatch) {
    // "ft." や "feat." 以降を除去
    return dashMatch[1].replace(/\s*(ft\.?|feat\.?|x|&).*/i, '').trim()
  }

  // "Artist | Song" パターン
  const pipeMatch = title.match(/^([^|]+)\s*\|\s*/)
  if (pipeMatch) {
    return pipeMatch[1].replace(/\s*(ft\.?|feat\.?|x|&).*/i, '').trim()
  }

  // 最初の引用符より前をアーティスト名とする
  const quoteMatch = title.match(/^([^'"]+)\s*['"]/)
  if (quoteMatch) {
    return quoteMatch[1].replace(/\s*(ft\.?|feat\.?|x|&).*/i, '').trim()
  }

  return null
}
