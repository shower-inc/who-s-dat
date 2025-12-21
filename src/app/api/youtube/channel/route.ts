import { getChannelByHandle, getChannelById } from '@/lib/youtube/client'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const handle = searchParams.get('handle')
  const channelId = searchParams.get('channelId')

  if (!handle && !channelId) {
    return NextResponse.json(
      { error: 'Either handle or channelId is required' },
      { status: 400 }
    )
  }

  try {
    let channel

    if (handle) {
      channel = await getChannelByHandle(handle)
    } else if (channelId) {
      channel = await getChannelById(channelId)
    }

    if (!channel) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      )
    }

    // Generate RSS feed URL
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.channelId}`

    return NextResponse.json({
      ...channel,
      rssUrl,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
