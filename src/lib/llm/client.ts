import Anthropic from '@anthropic-ai/sdk'
import { formatTranslatePrompt, formatPostGenerationPrompt, formatArticleGenerationPrompt, formatContentTypePrompt, formatExcerptTranslatePrompt, formatExternalArticleIntroPrompt, formatTrackArticlePrompt } from './prompts'
import type { ContentType } from '@/types/database'

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
  const { system, user } = formatTranslatePrompt(text)

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system,
    messages: [{ role: 'user', content: user }],
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
  editorNote?: string
  articleUrl?: string
}): Promise<string> {
  const client = getClient()
  const { system, user } = formatPostGenerationPrompt(params)

  // デバッグ: 入力内容をログ出力
  console.log('[generatePost] Input params:', {
    title: params.title?.substring(0, 50),
    summaryLength: params.summary?.length,
    category: params.category,
    hasEditorNote: !!params.editorNote,
    hasArticleUrl: !!params.articleUrl,
  })

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    system,
    messages: [{ role: 'user', content: user }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type')
  }

  let result = content.text.trim()

  // URLがあれば末尾に追加
  if (params.articleUrl) {
    result = `${result}\n${params.articleUrl}`
  }

  // デバッグ: 出力内容をログ
  console.log('[generatePost] Output:', result.substring(0, 100))

  return result
}

export async function generateArticle(params: {
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

// content_type自動判定
export async function detectContentType(params: {
  title: string
  description: string
  source: string
}): Promise<ContentType> {
  const client = getClient()
  const prompt = formatContentTypePrompt(params)

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 32,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return 'tune' // デフォルト
  }

  const result = content.text.trim().toLowerCase()
  const validTypes: ContentType[] = ['mv', 'news', 'interview', 'live', 'feature', 'tune']

  if (validTypes.includes(result as ContentType)) {
    return result as ContentType
  }

  // 部分一致でも判定
  for (const type of validTypes) {
    if (result.includes(type)) {
      return type
    }
  }

  return 'tune' // デフォルト（楽曲紹介が多いため）
}

// 外部記事の抜粋翻訳
export async function translateExcerpt(text: string): Promise<string> {
  if (!text || text.trim() === '') {
    return ''
  }

  const client = getClient()
  const { system, user } = formatExcerptTranslatePrompt(text)

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system,
    messages: [{ role: 'user', content: user }],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type')
  }

  return content.text.trim()
}

// 外部記事の紹介文生成
export async function generateExternalArticleIntro(params: {
  title: string
  excerpt: string
  siteName: string
  contentType: string
}): Promise<string> {
  const client = getClient()
  const prompt = formatExternalArticleIntroPrompt(params)

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

// 外部記事の処理（抜粋翻訳 + 紹介文生成 + タイトル翻訳）
export async function processExternalArticle(params: {
  title: string
  excerpt: string
  siteName: string
  contentType: ContentType
}): Promise<{
  titleJa: string
  excerptJa: string
  summaryJa: string
}> {
  // 並行処理で高速化
  const [titleJa, excerptJa, summaryJa] = await Promise.all([
    translateText(params.title),
    translateExcerpt(params.excerpt),
    generateExternalArticleIntro({
      title: params.title,
      excerpt: params.excerpt,
      siteName: params.siteName,
      contentType: params.contentType,
    }),
  ])

  return {
    titleJa,
    excerptJa,
    summaryJa,
  }
}

// トラック紹介記事生成（YouTube/Spotify）
export async function generateTrackArticle(params: {
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
