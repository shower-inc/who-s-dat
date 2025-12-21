// アーティストリサーチモジュール
// Web検索 + Spotify情報を組み合わせてアーティストの背景情報を収集

import { searchArtistFullProfile, getArtistFullProfile, searchArtistPlaylists, type ArtistFullProfile, type SpotifyPlaylist } from '@/lib/spotify/client'

// Web検索結果の型
interface WebSearchResult {
  title: string
  snippet: string
  url: string
  source: string
}

// リサーチ結果の型
export interface ArtistResearch {
  // Spotify情報
  spotifyProfile: ArtistFullProfile | null
  playlists: SpotifyPlaylist[]

  // Web検索で収集した情報
  recentNews: WebSearchResult[]
  interviews: WebSearchResult[]

  // 構造化された情報
  summary: {
    genres: string[]
    followers: number
    topTrackNames: string[]
    relatedArtistNames: string[]
    playlistNames: string[]
    recentNewsHeadlines: string[]
  }
}

// Google Custom Search APIでWeb検索
async function webSearch(query: string, options?: { num?: number }): Promise<WebSearchResult[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY
  const cx = process.env.GOOGLE_SEARCH_CX

  if (!apiKey || !cx) {
    console.log('[research] Google Search API not configured, skipping web search')
    return []
  }

  try {
    const params = new URLSearchParams({
      key: apiKey,
      cx,
      q: query,
      num: String(options?.num || 5),
    })

    const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`)

    if (!response.ok) {
      console.error(`[research] Google Search API error: ${response.status}`)
      return []
    }

    const data = await response.json()

    return (data.items || []).map((item: {
      title: string
      snippet: string
      link: string
      displayLink: string
    }) => ({
      title: item.title,
      snippet: item.snippet,
      url: item.link,
      source: item.displayLink,
    }))
  } catch (error) {
    console.error('[research] Web search error:', error)
    return []
  }
}

// アーティスト名でリサーチを実行
export async function researchArtist(artistName: string, options?: {
  spotifyArtistId?: string // Spotify URLからの場合はIDを直接渡せる
}): Promise<ArtistResearch> {
  console.log(`[research] Researching artist: ${artistName}`)

  // Spotify情報を取得
  let spotifyProfile: ArtistFullProfile | null = null

  if (options?.spotifyArtistId) {
    spotifyProfile = await getArtistFullProfile(options.spotifyArtistId)
  } else {
    spotifyProfile = await searchArtistFullProfile(artistName)
  }

  if (spotifyProfile) {
    console.log(`[research] Found Spotify profile: ${spotifyProfile.artist.name}, ${spotifyProfile.artist.followers} followers`)
  }

  // プレイリスト検索（"This Is ○○" など）
  const playlists = await searchArtistPlaylists(artistName)
  console.log(`[research] Found ${playlists.length} playlists`)

  // Web検索: 最新ニュース
  const newsQuery = `${artistName} music news 2024 2025`
  const recentNews = await webSearch(newsQuery, { num: 5 })
  console.log(`[research] Found ${recentNews.length} news articles`)

  // Web検索: インタビュー
  const interviewQuery = `${artistName} interview music`
  const interviews = await webSearch(interviewQuery, { num: 3 })
  console.log(`[research] Found ${interviews.length} interviews`)

  // 構造化されたサマリーを作成
  const summary = {
    genres: spotifyProfile?.artist.genres || [],
    followers: spotifyProfile?.artist.followers || 0,
    topTrackNames: spotifyProfile?.topTracks.map(t => t.name) || [],
    relatedArtistNames: spotifyProfile?.relatedArtists.map(a => a.name) || [],
    playlistNames: playlists.map(p => p.name),
    recentNewsHeadlines: recentNews.map(n => n.title),
  }

  return {
    spotifyProfile,
    playlists,
    recentNews,
    interviews,
    summary,
  }
}

// リサーチ結果をプロンプト用のテキストに変換
export function formatResearchForPrompt(research: ArtistResearch): string {
  const parts: string[] = []

  // Spotify情報
  if (research.spotifyProfile) {
    const { artist, topTracks, relatedArtists } = research.spotifyProfile

    parts.push(`【Spotifyプロフィール】`)
    parts.push(`フォロワー: ${artist.followers.toLocaleString()}人`)

    if (artist.genres.length > 0) {
      parts.push(`ジャンル: ${artist.genres.slice(0, 5).join(', ')}`)
    }

    if (topTracks.length > 0) {
      parts.push(`代表曲: ${topTracks.map(t => `${t.name} (人気度${t.popularity})`).join(', ')}`)
    }

    if (relatedArtists.length > 0) {
      parts.push(`関連アーティスト: ${relatedArtists.map(a => a.name).join(', ')}`)
    }
  }

  // プレイリスト
  if (research.playlists.length > 0) {
    parts.push('')
    parts.push(`【Spotifyプレイリスト】`)
    for (const playlist of research.playlists) {
      parts.push(`- ${playlist.name} (by ${playlist.owner}, ${playlist.trackCount}曲)`)
    }
  }

  // 最新ニュース
  if (research.recentNews.length > 0) {
    parts.push('')
    parts.push(`【最新ニュース・記事】`)
    for (const news of research.recentNews.slice(0, 3)) {
      parts.push(`- ${news.title}`)
      if (news.snippet) {
        parts.push(`  ${news.snippet.substring(0, 150)}...`)
      }
    }
  }

  // インタビュー
  if (research.interviews.length > 0) {
    parts.push('')
    parts.push(`【インタビュー記事】`)
    for (const interview of research.interviews.slice(0, 2)) {
      parts.push(`- ${interview.title}`)
      if (interview.snippet) {
        parts.push(`  ${interview.snippet.substring(0, 150)}...`)
      }
    }
  }

  return parts.join('\n')
}
