import { SupabaseClient } from '@supabase/supabase-js'
import { Artist } from '@/types/database'
import { searchArtistInfo, extractArtistName } from '../web/search'
import { searchArtistWithGemini } from '../web/gemini-search'

interface ArtistInsert {
  name: string
  origin?: string | null
  genre?: string | null
  description?: string | null
  search_source?: string | null
}

export interface ArtistService {
  getOrFetchArtist(title: string): Promise<Artist | null>
  formatArtistInfo(artist: Artist | null): string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createArtistService(supabase: SupabaseClient<any>): ArtistService {

  // アーティスト名でDBを検索
  async function findByName(name: string): Promise<Artist | null> {
    const { data } = await supabase
      .from('artists')
      .select('*')
      .ilike('name', name)
      .single()
    return data as Artist | null
  }

  // アーティストをDBに保存（既存があれば更新、なければ挿入）
  async function saveArtist(artist: ArtistInsert): Promise<Artist | null> {
    // 既存のアーティストを確認
    const existing = await findByName(artist.name)

    if (existing) {
      // 既存があれば更新
      const { data, error } = await supabase
        .from('artists')
        .update({
          origin: artist.origin ?? existing.origin,
          genre: artist.genre ?? existing.genre,
          description: artist.description ?? existing.description,
          search_source: artist.search_source,
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('Failed to update artist:', error)
        return existing
      }
      return data as Artist
    }

    // 新規挿入
    const { data, error } = await supabase
      .from('artists')
      .insert({
        name: artist.name,
        origin: artist.origin,
        genre: artist.genre,
        description: artist.description,
        search_source: artist.search_source,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to save artist:', error)
      return null
    }
    return data as Artist
  }

  // タイトルからアーティストを取得（DBキャッシュ優先、なければWeb検索）
  async function getOrFetchArtist(title: string): Promise<Artist | null> {
    const artistName = extractArtistName(title)
    if (!artistName) {
      return null
    }

    // 1. まずDBを検索
    const cached = await findByName(artistName)
    if (cached) {
      console.log(`Artist found in DB: ${artistName}`)
      return cached
    }

    // 2. DBになければ検索（Gemini優先、フォールバックでBrave）
    console.log(`Searching for artist: ${artistName}`)

    // まずGemini（Google検索グラウンディング）を試す
    let searchResult = await searchArtistWithGemini(artistName)
    let searchSource = 'gemini'

    // Geminiで見つからなければBraveを試す
    if (!searchResult) {
      searchResult = await searchArtistInfo(artistName)
      searchSource = 'brave'
    }

    if (!searchResult) {
      // 検索結果なしでも名前だけ保存（次回検索を防ぐ）
      const saved = await saveArtist({
        name: artistName,
        search_source: 'no_result',
      })
      return saved
    }

    // 3. 検索結果をDBに保存
    const saved = await saveArtist({
      name: artistName,
      origin: searchResult.origin,
      genre: searchResult.genre,
      description: searchResult.description,
      search_source: searchSource,
    })

    console.log(`Artist saved to DB: ${artistName} (${searchResult.origin || 'unknown'}, ${searchResult.genre || 'unknown'}) via ${searchSource}`)
    return saved
  }

  // アーティスト情報をプロンプト用のテキストに整形
  function formatArtistInfo(artist: Artist | null): string {
    if (!artist) {
      return ''
    }

    const parts: string[] = []
    parts.push(`名前: ${artist.name}`)
    if (artist.origin) parts.push(`出身: ${artist.origin}`)
    if (artist.genre) parts.push(`ジャンル: ${artist.genre}`)
    if (artist.description) parts.push(`概要: ${artist.description.slice(0, 300)}`)

    return parts.join('\n')
  }

  return {
    getOrFetchArtist,
    formatArtistInfo,
  }
}
