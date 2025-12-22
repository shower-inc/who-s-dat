import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { extractVideoId, getVideoDetails } from '@/lib/youtube/client'
import { extractSpotifyTrackId, getTrackDetails, getArtistFullProfile } from '@/lib/spotify/client'
import { translateText, generateTrackArticle, generatePost } from '@/lib/llm/client'
import { researchArtist, formatResearchForPrompt } from '@/lib/research/artist-research'

interface TrackMetadata {
  platform: 'youtube' | 'spotify'
  trackName: string
  artistNames: string
  artistInfo?: string
  albumName?: string
  releaseDate?: string
  description?: string
  thumbnailUrl?: string
  externalUrl: string
  videoId?: string // YouTube only
  spotifyArtistId?: string // Spotifyアーティストのリサーチ用
}

// URLからメタデータを取得
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  try {
    const metadata = await fetchTrackMetadata(url)
    if (!metadata) {
      return NextResponse.json({ error: 'Could not fetch metadata from URL' }, { status: 400 })
    }
    return NextResponse.json(metadata)
  } catch (error) {
    console.error('Track metadata fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 500 })
  }
}

// トラック記事を作成
export async function POST(request: NextRequest) {
  const supabase = await createServiceClient()

  try {
    const body = await request.json()
    const { url, editorNote } = body

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }

    // メタデータ取得
    const metadata = await fetchTrackMetadata(url)
    if (!metadata) {
      return NextResponse.json({ error: 'Could not fetch metadata from URL' }, { status: 400 })
    }

    // 重複チェック
    const { data: existing } = await supabase
      .from('articles')
      .select('id')
      .eq('link', metadata.externalUrl)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'この曲の記事は既に存在します', article_id: existing.id },
        { status: 409 }
      )
    }

    // アーティストリサーチを実行
    console.log(`[track] Researching artist: ${metadata.artistNames}`)
    const research = await researchArtist(metadata.artistNames, {
      spotifyArtistId: metadata.spotifyArtistId,
    })
    const researchText = formatResearchForPrompt(research)
    console.log(`[track] Research complete. Spotify profile: ${research.spotifyProfile ? 'found' : 'not found'}, News: ${research.recentNews.length}, Interviews: ${research.interviews.length}`)

    // 記事生成（リサーチ情報を含める）
    const articleContent = await generateTrackArticle({
      trackName: metadata.trackName,
      artistNames: metadata.artistNames,
      albumName: metadata.albumName,
      releaseDate: metadata.releaseDate,
      platform: metadata.platform === 'youtube' ? 'YouTube' : 'Spotify',
      description: metadata.description,
      artistInfo: researchText || metadata.artistInfo, // リサーチ結果を優先
      editorNote,
    })

    // タイトル翻訳（曲名 - アーティスト名）
    const originalTitle = `${metadata.trackName} - ${metadata.artistNames}`
    const titleJa = await translateText(originalTitle)

    // X投稿文生成
    const postContent = await generatePost({
      title: originalTitle,
      summary: articleContent,
      category: 'tune',
      editorNote,
      articleUrl: metadata.externalUrl,
    })

    // 記事を保存
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .insert({
        source_id: null, // 手動追加
        external_id: metadata.videoId || `spotify_${Date.now()}`,
        title_original: originalTitle,
        title_ja: titleJa,
        summary_original: metadata.description || '',
        summary_ja: articleContent,
        link: metadata.externalUrl,
        thumbnail_url: metadata.thumbnailUrl,
        published_at: metadata.releaseDate ? new Date(metadata.releaseDate).toISOString() : new Date().toISOString(),
        status: 'ready',
        content_type: 'tune',
      })
      .select()
      .single()

    if (articleError) {
      console.error('Article insert error:', articleError)
      return NextResponse.json({ error: articleError.message }, { status: 500 })
    }

    // X投稿を保存
    await supabase.from('posts').insert({
      article_id: article.id,
      content: postContent,
      content_style: 'track',
      platform: 'x',
      status: 'draft',
    })

    return NextResponse.json({ article, post_content: postContent })
  } catch (error) {
    console.error('Track article creation error:', error)
    return NextResponse.json({ error: 'Failed to create article' }, { status: 500 })
  }
}

// URLからトラックメタデータを取得
async function fetchTrackMetadata(url: string): Promise<TrackMetadata | null> {
  // YouTube URL check
  const youtubeVideoId = extractVideoId(url)
  if (youtubeVideoId) {
    const videoDetails = await getVideoDetails(youtubeVideoId)
    if (!videoDetails) return null

    // タイトルからアーティスト名と曲名を抽出（一般的なパターン: "Artist - Track Title"）
    let trackName = videoDetails.title
    let artistNames = videoDetails.channelTitle

    // "Artist - Title" パターンを検出
    const titleParts = videoDetails.title.split(' - ')
    if (titleParts.length >= 2) {
      artistNames = titleParts[0].trim()
      trackName = titleParts.slice(1).join(' - ').trim()
    }

    // "(Official Video)" などを除去
    trackName = trackName
      .replace(/\(Official.*?\)/gi, '')
      .replace(/\[Official.*?\]/gi, '')
      .replace(/\(Music Video\)/gi, '')
      .replace(/\(Visualizer\)/gi, '')
      .replace(/\(Audio\)/gi, '')
      .replace(/\(Lyric.*?\)/gi, '')
      .trim()

    return {
      platform: 'youtube',
      trackName,
      artistNames,
      releaseDate: videoDetails.publishedAt || undefined,
      description: videoDetails.description || undefined,
      thumbnailUrl: videoDetails.thumbnailUrl || undefined,
      externalUrl: `https://www.youtube.com/watch?v=${youtubeVideoId}`,
      videoId: youtubeVideoId,
    }
  }

  // Spotify URL check
  const spotifyTrackId = extractSpotifyTrackId(url)
  if (spotifyTrackId) {
    const trackDetails = await getTrackDetails(spotifyTrackId)
    if (!trackDetails) return null

    // メインアーティストのIDを保存（リサーチ用）
    const mainArtistId = trackDetails.artists[0]?.id

    // メインアーティストの詳細を取得（プレビュー用の簡易情報）
    let artistInfo: string | undefined
    if (mainArtistId) {
      const profile = await getArtistFullProfile(mainArtistId)
      if (profile) {
        const parts: string[] = []
        if (profile.artist.genres.length > 0) {
          parts.push(`ジャンル: ${profile.artist.genres.slice(0, 3).join(', ')}`)
        }
        if (profile.artist.followers > 0) {
          parts.push(`フォロワー: ${profile.artist.followers.toLocaleString()}人`)
        }
        if (profile.topTracks.length > 0) {
          parts.push(`代表曲: ${profile.topTracks.slice(0, 3).map(t => t.name).join(', ')}`)
        }
        if (profile.relatedArtists.length > 0) {
          parts.push(`関連: ${profile.relatedArtists.slice(0, 3).map(a => a.name).join(', ')}`)
        }
        if (parts.length > 0) {
          artistInfo = parts.join(' / ')
        }
      }
    }

    return {
      platform: 'spotify',
      trackName: trackDetails.name,
      artistNames: trackDetails.artists.map(a => a.name).join(', '),
      artistInfo,
      albumName: trackDetails.album.name,
      releaseDate: trackDetails.album.releaseDate || undefined,
      thumbnailUrl: trackDetails.album.images[0]?.url,
      externalUrl: trackDetails.externalUrl,
      spotifyArtistId: mainArtistId, // リサーチで使用
    }
  }

  return null
}
