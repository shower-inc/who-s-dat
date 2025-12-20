const BUFFER_API_BASE = 'https://api.bufferapp.com/1'

function getAccessToken(): string {
  const token = process.env.BUFFER_ACCESS_TOKEN
  if (!token) {
    throw new Error('BUFFER_ACCESS_TOKEN is not set')
  }
  return token
}

export interface BufferProfile {
  id: string
  service: string
  formatted_username: string
}

export async function getProfiles(): Promise<BufferProfile[]> {
  const token = getAccessToken()
  const response = await fetch(
    `${BUFFER_API_BASE}/profiles.json?access_token=${token}`
  )

  if (!response.ok) {
    throw new Error(`Buffer API error: ${response.status}`)
  }

  return response.json()
}

export async function createUpdate(params: {
  profileId: string
  text: string
  link?: string
  scheduledAt?: Date
}): Promise<{ success: boolean; update?: { id: string } }> {
  const token = getAccessToken()

  const formData = new URLSearchParams()
  formData.append('access_token', token)
  formData.append('profile_ids[]', params.profileId)
  formData.append('text', params.text)

  if (params.link) {
    formData.append('media[link]', params.link)
  }

  if (params.scheduledAt) {
    formData.append('scheduled_at', Math.floor(params.scheduledAt.getTime() / 1000).toString())
  }

  const response = await fetch(`${BUFFER_API_BASE}/updates/create.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  })

  if (!response.ok) {
    throw new Error(`Buffer API error: ${response.status}`)
  }

  return response.json()
}

export async function deleteUpdate(updateId: string): Promise<void> {
  const token = getAccessToken()

  const response = await fetch(
    `${BUFFER_API_BASE}/updates/${updateId}/destroy.json?access_token=${token}`,
    { method: 'POST' }
  )

  if (!response.ok) {
    throw new Error(`Buffer API error: ${response.status}`)
  }
}
