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
