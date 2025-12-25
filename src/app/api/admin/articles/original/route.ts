import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { ContentType } from '@/types/database'
import { generateWhosdatPlaylistHtml } from '@/lib/embed/social-card'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, content, thumbnailUrl, categoryId, contentType } = body

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()

    // 記事末尾にWHO'S DATプレイリストを追加
    const contentWithPlaylist = content + generateWhosdatPlaylistHtml()

    // 記事を保存
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .insert({
        source_id: null, // オリジナル記事なのでソースなし
        external_id: `original_${Date.now()}`,
        title_original: title,
        title_ja: title, // オリジナルなので同じ
        summary_original: content,
        summary_ja: contentWithPlaylist, // プレイリスト付き
        link: '', // オリジナル記事はリンクなし
        thumbnail_url: thumbnailUrl || null,
        published_at: new Date().toISOString(),
        status: 'ready',
        content_type: (contentType as ContentType) || 'feature',
        category_id: categoryId || null,
      })
      .select()
      .single()

    if (articleError) {
      console.error('[original] Insert error:', articleError)
      return NextResponse.json({ error: articleError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      article,
    })
  } catch (error) {
    console.error('[original] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
