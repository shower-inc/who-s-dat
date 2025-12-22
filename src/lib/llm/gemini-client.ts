// Gemini API for article and post generation
import { GoogleGenAI } from '@google/genai'
import { formatArticleGenerationPrompt, formatPostGenerationPrompt, formatTrackArticlePrompt } from './prompts'

const MODEL = 'gemini-2.0-flash'

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set')
  }
  return new GoogleGenAI({ apiKey })
}

// タイトル翻訳
export async function translateTextWithGemini(text: string): Promise<string> {
  if (!text || text.trim() === '') {
    return ''
  }

  const client = getClient()

  const prompt = `以下の英文を日本語に翻訳してください。アーティスト名、曲名、ジャンル名は英語のまま。翻訳文のみ出力、前置きなし。

${text}`

  const response = await client.models.generateContent({
    model: MODEL,
    contents: prompt,
  })

  return response.text?.trim() || ''
}

// 記事生成
export async function generateArticleWithGemini(params: {
  title: string
  description: string
  channel: string
  artistInfo?: string
  editorNote?: string
}): Promise<{ title: string; content: string }> {
  const client = getClient()

  const prompt = formatArticleGenerationPrompt({
    title: params.title,
    description: params.description,
    channel: params.channel,
    artistInfo: params.artistInfo,
    editorNote: params.editorNote,
  })

  console.log('[Gemini] Generating article for:', params.title.slice(0, 50))

  const response = await client.models.generateContent({
    model: MODEL,
    contents: prompt,
  })

  const content = response.text?.trim() || ''

  // タイトルも翻訳
  const titleJa = await translateTextWithGemini(params.title)

  return {
    title: titleJa,
    content,
  }
}

// X投稿文生成
export async function generatePostWithGemini(params: {
  title: string
  summary: string
  category: string
  editorNote?: string
}): Promise<string> {
  const client = getClient()
  const { system, user } = formatPostGenerationPrompt(params)

  console.log('[Gemini] Generating X post for:', params.title.slice(0, 50))

  // Geminiはsystemプロンプトをcontentsの最初に入れる
  const prompt = `${system}\n\n${user}`

  const response = await client.models.generateContent({
    model: MODEL,
    contents: prompt,
  })

  return response.text?.trim() || ''
}

// トラック紹介記事生成
export async function generateTrackArticleWithGemini(params: {
  trackName: string
  artistNames: string
  albumName?: string
  releaseDate?: string
  platform: string
  description?: string
  artistInfo?: string
  editorNote?: string
}): Promise<string> {
  const client = getClient()
  const prompt = formatTrackArticlePrompt(params)

  console.log('[Gemini] Generating track article for:', params.trackName.slice(0, 50))

  const response = await client.models.generateContent({
    model: MODEL,
    contents: prompt,
  })

  return response.text?.trim() || ''
}
