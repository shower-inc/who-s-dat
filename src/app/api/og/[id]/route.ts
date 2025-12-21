import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: article } = await supabase
    .from('articles')
    .select('thumbnail_url')
    .eq('id', id)
    .single()

  if (!article?.thumbnail_url) {
    return new NextResponse('Not found', { status: 404 })
  }

  try {
    // サムネイル画像を取得
    const imageResponse = await fetch(article.thumbnail_url)

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
