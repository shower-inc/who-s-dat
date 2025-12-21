import Anthropic from '@anthropic-ai/sdk'
import { formatTranslatePrompt, formatPostGenerationPrompt, formatArticleGenerationPrompt } from './prompts'
import { searchArtistInfo, extractArtistName } from '../web/search'

const MODEL = 'claude-3-haiku-20240307'

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set')
  }
  return new Anthropic({ apiKey })
}

export async function translateText(text: string): Promise<string> {
  if (!text || text.trim() === '') {
    return ''
  }

  const client = getClient()
  const prompt = formatTranslatePrompt(text)

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type')
  }

  return content.text.trim()
}

export async function generatePost(params: {
  title: string
  summary: string
  category: string
}): Promise<string> {
  const client = getClient()
  const prompt = formatPostGenerationPrompt(params)

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type')
  }

  return content.text.trim()
}

export async function generateArticle(params: {
  title: string
  description: string
  channel: string
}): Promise<{ title: string; content: string }> {
  const client = getClient()

  // タイトルからアーティスト名を抽出してWeb検索
  let artistInfoText = ''
  const artistName = extractArtistName(params.title)
  if (artistName) {
    console.log(`Searching for artist: ${artistName}`)
    const artistInfo = await searchArtistInfo(artistName)
    if (artistInfo) {
      const parts: string[] = []
      parts.push(`名前: ${artistInfo.name}`)
      if (artistInfo.origin) parts.push(`出身: ${artistInfo.origin}`)
      if (artistInfo.genre) parts.push(`ジャンル: ${artistInfo.genre}`)
      if (artistInfo.description) parts.push(`概要: ${artistInfo.description}`)
      artistInfoText = parts.join('\n')
      console.log(`Found artist info: ${artistInfo.origin || 'unknown origin'}, ${artistInfo.genre || 'unknown genre'}`)
    }
  }

  const prompt = formatArticleGenerationPrompt({
    ...params,
    artistInfo: artistInfoText,
  })

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type')
  }

  // タイトルも日本語に翻訳
  const titleJa = await translateText(params.title)

  return {
    title: titleJa,
    content: content.text.trim(),
  }
}
