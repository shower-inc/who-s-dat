// Spotify Web API client

export interface SpotifyTrack {
  id: string
  name: string
  artists: { id: string; name: string }[]
  album: {
    id: string
    name: string
    releaseDate: string | null
    images: { url: string; width: number; height: number }[]
  }
  durationMs: number
  previewUrl: string | null
  externalUrl: string
}

interface SpotifyTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are required')
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    throw new Error(`Spotify auth failed: ${response.status}`)
  }

  const data: SpotifyTokenResponse = await response.json()

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000, // 1 minute buffer
  }

  return cachedToken.token
}

export function extractSpotifyTrackId(url: string): string | null {
  // https://open.spotify.com/track/TRACK_ID
  // https://open.spotify.com/track/TRACK_ID?si=xxx
  const match = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/)
  return match ? match[1] : null
}

export async function getTrackDetails(trackId: string): Promise<SpotifyTrack | null> {
  try {
    const token = await getAccessToken()

    const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      console.error(`Spotify API error: ${response.status}`)
      return null
    }

    const data = await response.json()

    return {
      id: data.id,
      name: data.name,
      artists: data.artists.map((a: { id: string; name: string }) => ({
        id: a.id,
        name: a.name,
      })),
      album: {
        id: data.album.id,
        name: data.album.name,
        releaseDate: data.album.release_date || null,
        images: data.album.images || [],
      },
      durationMs: data.duration_ms,
      previewUrl: data.preview_url,
      externalUrl: data.external_urls?.spotify || `https://open.spotify.com/track/${data.id}`,
    }
  } catch (error) {
    console.error('Spotify API error:', error)
    return null
  }
}

export interface SpotifyArtist {
  id: string
  name: string
  genres: string[]
  followers: number
  images: { url: string; width: number; height: number }[]
  externalUrl: string
}

export async function getArtistDetails(artistId: string): Promise<SpotifyArtist | null> {
  try {
    const token = await getAccessToken()

    const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      console.error(`Spotify API error: ${response.status}`)
      return null
    }

    const data = await response.json()

    return {
      id: data.id,
      name: data.name,
      genres: data.genres || [],
      followers: data.followers?.total || 0,
      images: data.images || [],
      externalUrl: data.external_urls?.spotify || `https://open.spotify.com/artist/${data.id}`,
    }
  } catch (error) {
    console.error('Spotify API error:', error)
    return null
  }
}

// アーティストのトップトラックを取得
export interface SpotifyTopTrack {
  id: string
  name: string
  popularity: number
  albumName: string
}

export async function getArtistTopTracks(artistId: string): Promise<SpotifyTopTrack[]> {
  try {
    const token = await getAccessToken()

    const response = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=JP`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      console.error(`Spotify API error: ${response.status}`)
      return []
    }

    const data = await response.json()

    return (data.tracks || []).slice(0, 5).map((track: {
      id: string
      name: string
      popularity: number
      album: { name: string }
    }) => ({
      id: track.id,
      name: track.name,
      popularity: track.popularity,
      albumName: track.album.name,
    }))
  } catch (error) {
    console.error('Spotify API error:', error)
    return []
  }
}

// 関連アーティストを取得
export interface SpotifyRelatedArtist {
  id: string
  name: string
  genres: string[]
  followers: number
}

export async function getRelatedArtists(artistId: string): Promise<SpotifyRelatedArtist[]> {
  try {
    const token = await getAccessToken()

    const response = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}/related-artists`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      console.error(`Spotify API error: ${response.status}`)
      return []
    }

    const data = await response.json()

    return (data.artists || []).slice(0, 5).map((artist: {
      id: string
      name: string
      genres: string[]
      followers: { total: number }
    }) => ({
      id: artist.id,
      name: artist.name,
      genres: artist.genres || [],
      followers: artist.followers?.total || 0,
    }))
  } catch (error) {
    console.error('Spotify API error:', error)
    return []
  }
}

// アーティスト名で検索（YouTube動画からアーティスト情報を取得する用）
export async function searchArtist(artistName: string): Promise<SpotifyArtist | null> {
  try {
    const token = await getAccessToken()

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      console.error(`Spotify API error: ${response.status}`)
      return null
    }

    const data = await response.json()
    const artist = data.artists?.items?.[0]

    if (!artist) return null

    return {
      id: artist.id,
      name: artist.name,
      genres: artist.genres || [],
      followers: artist.followers?.total || 0,
      images: artist.images || [],
      externalUrl: artist.external_urls?.spotify || `https://open.spotify.com/artist/${artist.id}`,
    }
  } catch (error) {
    console.error('Spotify API error:', error)
    return null
  }
}

// アーティストの完全な情報を取得（詳細 + トップトラック + 関連アーティスト）
export interface ArtistFullProfile {
  artist: SpotifyArtist
  topTracks: SpotifyTopTrack[]
  relatedArtists: SpotifyRelatedArtist[]
}

export async function getArtistFullProfile(artistId: string): Promise<ArtistFullProfile | null> {
  const artist = await getArtistDetails(artistId)
  if (!artist) return null

  const [topTracks, relatedArtists] = await Promise.all([
    getArtistTopTracks(artistId),
    getRelatedArtists(artistId),
  ])

  return {
    artist,
    topTracks,
    relatedArtists,
  }
}

// アーティスト名からプロフィールを検索・取得
export async function searchArtistFullProfile(artistName: string): Promise<ArtistFullProfile | null> {
  const artist = await searchArtist(artistName)
  if (!artist) return null

  const [topTracks, relatedArtists] = await Promise.all([
    getArtistTopTracks(artist.id),
    getRelatedArtists(artist.id),
  ])

  return {
    artist,
    topTracks,
    relatedArtists,
  }
}
