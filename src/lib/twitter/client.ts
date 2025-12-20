import crypto from 'crypto'

// X API v2 endpoint
const TWITTER_API_BASE = 'https://api.twitter.com/2'

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
function generateOAuthHeader(method: string, url: string): string {
  const { apiKey, apiSecret, accessToken, accessTokenSecret } = getCredentials()

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0',
  }

  const signature = generateOAuthSignature(
    method,
    url,
    oauthParams,
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

// Post a tweet
export async function postTweet(text: string): Promise<TweetResponse> {
  const url = `${TWITTER_API_BASE}/tweets`
  const authHeader = generateOAuthHeader('POST', url)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Twitter API error: ${error.detail || error.title || response.status}`)
  }

  return response.json()
}

// Delete a tweet
export async function deleteTweet(tweetId: string): Promise<void> {
  const url = `${TWITTER_API_BASE}/tweets/${tweetId}`
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
  const url = `${TWITTER_API_BASE}/users/me`
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
