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
