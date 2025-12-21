import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: article } = await supabase
    .from('articles')
    .select('thumbnail_url, link')
    .eq('id', id)
    .single()

  // サムネイルURLを決定（DBにない場合はYouTubeリンクから生成）
  let thumbnailUrl = article?.thumbnail_url
  if (!thumbnailUrl && article?.link) {
    const videoId = extractYouTubeVideoId(article.link)
    if (videoId) {
      thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    }
  }

  if (!thumbnailUrl) {
    return new NextResponse('Not found', { status: 404 })
  }

  try {
    // サムネイル画像を取得
    const imageResponse = await fetch(thumbnailUrl)

    if (!imageResponse.ok) {
      return new NextResponse('Image not found', { status: 404 })
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    })
  } catch {
    return new NextResponse('Failed to fetch image', { status: 500 })
  }
}
