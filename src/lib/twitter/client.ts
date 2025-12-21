import crypto from 'crypto'

// X API endpoints
const TWITTER_API_V2 = 'https://api.twitter.com/2'
const TWITTER_API_V1 = 'https://upload.twitter.com/1.1'

function getCredentials() {
  const apiKey = process.env.TWITTER_API_KEY
  const apiSecret = process.env.TWITTER_API_SECRET
  const accessToken = process.env.TWITTER_ACCESS_TOKEN
  const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET

  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    throw new Error('Twitter API credentials are not set')
  }

  return { apiKey, apiSecret, accessToken, accessTokenSecret }
}

// OAuth 1.0a signature generation
function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&')

  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams),
  ].join('&')

  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`

  return crypto
    .createHmac('sha1', signingKey)
    .update(signatureBaseString)
    .digest('base64')
}

// Generate OAuth 1.0a Authorization header
function generateOAuthHeader(
  method: string,
  url: string,
  additionalParams: Record<string, string> = {}
): string {
  const { apiKey, apiSecret, accessToken, accessTokenSecret } = getCredentials()

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0',
  }

  // 署名にはoauthパラメータと追加パラメータを含める
  const allParams = { ...oauthParams, ...additionalParams }

  const signature = generateOAuthSignature(
    method,
    url,
    allParams,
    apiSecret,
    accessTokenSecret
  )

  oauthParams.oauth_signature = signature

  const authHeader = Object.keys(oauthParams)
    .sort()
    .map((key) => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ')

  return `OAuth ${authHeader}`
}

export interface TweetResponse {
  data: {
    id: string
    text: string
  }
}

export interface TwitterError {
  detail: string
  title: string
  type: string
}

// Upload media (image) to Twitter
export async function uploadMedia(imageBuffer: Buffer): Promise<string> {
  const url = `${TWITTER_API_V1}/media/upload.json`
  const mediaData = imageBuffer.toString('base64')

  const params = {
    media_data: mediaData,
  }

  const authHeader = generateOAuthHeader('POST', url, params)

  const formBody = new URLSearchParams(params).toString()

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Twitter Media Upload error: ${JSON.stringify(error)}`)
  }

  const result = await response.json()
  return result.media_id_string
}

// Post a tweet (with optional media)
export async function postTweet(text: string, mediaId?: string): Promise<TweetResponse> {
  const url = `${TWITTER_API_V2}/tweets`
  const authHeader = generateOAuthHeader('POST', url)

  const body: { text: string; media?: { media_ids: string[] } } = { text }
  if (mediaId) {
    body.media = { media_ids: [mediaId] }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Twitter API error: ${error.detail || error.title || JSON.stringify(error)}`)
  }

  return response.json()
}

// Post a tweet with image from URL
export async function postTweetWithImage(text: string, imageUrl: string): Promise<TweetResponse> {
  // 画像をダウンロード
  const imageResponse = await fetch(imageUrl)
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image: ${imageUrl}`)
  }

  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())

  // 画像をアップロード
  const mediaId = await uploadMedia(imageBuffer)

  // ツイートを投稿
  return postTweet(text, mediaId)
}

// Delete a tweet
export async function deleteTweet(tweetId: string): Promise<void> {
  const url = `${TWITTER_API_V2}/tweets/${tweetId}`
  const authHeader = generateOAuthHeader('DELETE', url)

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: authHeader,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Twitter API error: ${error.detail || error.title || response.status}`)
  }
}

// Get authenticated user info
export async function getMe(): Promise<{ data: { id: string; name: string; username: string } }> {
  const url = `${TWITTER_API_V2}/users/me`
  const authHeader = generateOAuthHeader('GET', url)

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: authHeader,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Twitter API error: ${error.detail || error.title || response.status}`)
  }

  return response.json()
}
