// Gemini API with Google Search Grounding
import { GoogleGenAI } from '@google/genai'

const MODEL = 'gemini-2.0-flash'

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set')
  }
  return new GoogleGenAI({ apiKey })
}

export interface ArtistSearchResult {
  name: string
  origin: string | null
  genre: string | null
  description: string | null
}

// 記事の追加情報を検索するためのインターフェース
export interface EnrichedArticleInfo {
  artistBackground: string | null  // アーティストの背景情報
  contextInfo: string | null       // 曲やイベントの文脈
  relatedNews: string | null       // 関連ニュース
  sceneContext: string | null      // シーンの文脈（UK Rap, Afrobeats等）
}

export async function searchArtistWithGemini(artistName: string): Promise<ArtistSearchResult | null> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY is not set, skipping Gemini search')
    return null
  }

  try {
    const client = getClient()

    const prompt = `Find information about the music artist "${artistName}".

I need:
1. Their origin/nationality (e.g., "UK", "London", "Nigerian-British", "South London")
2. Their music genre (e.g., "UK Rap", "Afrobeats", "Grime", "R&B", "Drill")
3. A brief description (1-2 sentences about who they are)

Focus on UK and African diaspora music scenes.

Respond in this exact JSON format only:
{
  "origin": "their origin or null if unknown",
  "genre": "their genre or null if unknown",
  "description": "brief description or null if unknown"
}`

    const response = await client.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    })

    const text = response.text
    if (!text) {
      console.warn('Empty response from Gemini')
      return null
    }

    // JSONを抽出（```json ... ``` や余分なテキストを除去）
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn('No JSON found in Gemini response:', text)
      return null
    }

    const parsed = JSON.parse(jsonMatch[0])

    console.log(`Gemini found artist info: ${artistName} - ${parsed.origin || 'unknown'}, ${parsed.genre || 'unknown'}`)

    return {
      name: artistName,
      origin: parsed.origin || null,
      genre: parsed.genre || null,
      description: parsed.description || null,
    }
  } catch (error) {
    console.error('Gemini search error:', error)
    return null
  }
}

/**
 * 記事のトピックに関する追加情報を検索
 * YouTube動画のタイトル・説明から、より深い情報を取得
 */
export async function enrichArticleInfo(params: {
  title: string
  description?: string
  artistName?: string
}): Promise<EnrichedArticleInfo | null> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY is not set, skipping article enrichment')
    return null
  }

  try {
    const client = getClient()

    const prompt = `以下の音楽コンテンツについて、日本語で追加情報を調べてください。

タイトル: ${params.title}
${params.description ? `説明: ${params.description.slice(0, 500)}` : ''}
${params.artistName ? `アーティスト: ${params.artistName}` : ''}

調べてほしいこと:
1. アーティストの背景（出身地、キャリア、所属レーベル、代表曲など）
2. この曲/コンテンツの文脈（アルバムの一部か、コラボの経緯、制作背景など）
3. 最近の関連ニュース（受賞、ツアー、新しい動きなど）
4. 音楽シーンでの位置づけ（UK Rap、Afrobeats、Grimeなどのシーンでの立ち位置）

以下のJSON形式で回答してください:
{
  "artistBackground": "アーティストの背景情報（2-3文）",
  "contextInfo": "この曲/コンテンツの文脈（1-2文）",
  "relatedNews": "関連ニュース（あれば1-2文、なければnull）",
  "sceneContext": "シーンでの位置づけ（1-2文）"
}

情報が見つからない項目はnullにしてください。`

    const response = await client.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    })

    const text = response.text
    if (!text) {
      console.warn('Empty response from Gemini enrichment')
      return null
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn('No JSON found in Gemini enrichment response:', text.slice(0, 200))
      return null
    }

    const parsed = JSON.parse(jsonMatch[0])

    console.log(`[Gemini] Enriched article info for: ${params.title.slice(0, 50)}`)

    return {
      artistBackground: parsed.artistBackground || null,
      contextInfo: parsed.contextInfo || null,
      relatedNews: parsed.relatedNews || null,
      sceneContext: parsed.sceneContext || null,
    }
  } catch (error) {
    console.error('Gemini enrichment error:', error)
    return null
  }
}

/**
 * 検索結果を記事生成用のテキストに整形
 */
export function formatEnrichedInfo(info: EnrichedArticleInfo | null): string {
  if (!info) return ''

  const parts: string[] = []

  if (info.artistBackground) {
    parts.push(`【アーティスト情報】${info.artistBackground}`)
  }
  if (info.contextInfo) {
    parts.push(`【コンテンツの背景】${info.contextInfo}`)
  }
  if (info.relatedNews) {
    parts.push(`【最近のニュース】${info.relatedNews}`)
  }
  if (info.sceneContext) {
    parts.push(`【シーンでの位置づけ】${info.sceneContext}`)
  }

  return parts.join('\n')
}
