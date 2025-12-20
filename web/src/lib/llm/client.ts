import Anthropic from '@anthropic-ai/sdk'
import { formatTranslatePrompt, formatPostGenerationPrompt } from './prompts'

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
  title_ja: string
  summary: string
  source: string
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
