import { NextRequest, NextResponse } from 'next/server'
import { getEmbedHtml, isTikTokUrl, isInstagramUrl } from '@/lib/embed/oembed'

// URLからoEmbed HTMLを取得
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }

    // サポートされているURLか確認
    if (!isTikTokUrl(url) && !isInstagramUrl(url)) {
      return NextResponse.json(
        { error: 'Unsupported URL. Only TikTok and Instagram URLs are supported.' },
        { status: 400 }
      )
    }

    const result = await getEmbedHtml(url)

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to get embed code' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      html: result.html,
      provider: result.provider,
    })
  } catch (error) {
    console.error('oEmbed API error:', error)
    return NextResponse.json({ error: 'Failed to process URL' }, { status: 500 })
  }
}
