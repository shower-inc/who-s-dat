import { createServiceClient } from '@/lib/supabase/server'
import { generateArticle, generatePost } from '@/lib/llm/client'
import { createArtistService } from '@/lib/artists/service'
import { NextResponse } from 'next/server'

// Unified API: enrich → translate article → generate X post
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServiceClient()
  const artistService = createArtistService(supabase)

  // 記事を取得（ソース情報も含む）
  const { data: article, error: articleError } = await supabase
    .from('articles')
    .select('*, sources(name, category)')
    .eq('id', id)
    .single()

  if (articleError || !article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  }

  // 既に投稿済みの場合はスキップ
  if (article.status === 'posted') {
    return NextResponse.json({ error: 'Article already posted' }, { status: 400 })
  }

  const source = article.sources as { name: string; category: string } | null

  try {
    // Step 1: アーティスト情報を取得（DBキャッシュ or Web検索）
    const artist = await artistService.getOrFetchArtist(article.title_original)
    const artistInfo = artistService.formatArtistInfo(artist)

    // 記事にアーティストIDを紐付け
    if (artist) {
      await supabase
        .from('articles')
        .update({ artist_id: artist.id })
        .eq('id', id)
    }

    // Step 2: 記事生成（未生成の場合のみ）
    let title_ja = article.title_ja
    let summary_ja = article.summary_ja

    if (!title_ja) {
      await supabase
        .from('articles')
        .update({ status: 'translating' })
        .eq('id', id)

      const translated = await generateArticle({
        title: article.title_original,
        description: article.summary_original || '',
        channel: source?.name || 'Unknown',
        artistInfo,
      })

      title_ja = translated.title
      summary_ja = translated.content

      await supabase
        .from('articles')
        .update({
          title_ja,
          summary_ja,
          status: 'translated',
        })
        .eq('id', id)
    }

    // Step 3: X投稿文生成
    await supabase
      .from('articles')
      .update({ status: 'generating' })
      .eq('id', id)

    const postContent = await generatePost({
      title: title_ja || article.title_original,
      summary: summary_ja || article.summary_original || '',
      category: source?.category || 'music',
    })

    // Step 3: 投稿を作成（既存があれば更新）
    const { data: existingPost } = await supabase
      .from('posts')
      .select('id')
      .eq('article_id', id)
      .eq('platform', 'x')
      .single()

    let post
    if (existingPost) {
      const { data, error } = await supabase
        .from('posts')
        .update({
          content: postContent,
          status: 'draft',
        })
        .eq('id', existingPost.id)
        .select()
        .single()
      if (error) throw error
      post = data
    } else {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          article_id: id,
          content: postContent,
          content_style: 'casual',
          llm_model: 'claude-3-haiku-20240307',
          llm_prompt_version: 'v2',
          platform: 'x',
          status: 'draft',
        })
        .select()
        .single()
      if (error) throw error
      post = data
    }

    // Step 4: 記事ステータスを準備完了に
    await supabase
      .from('articles')
      .update({ status: 'ready' })
      .eq('id', id)

    return NextResponse.json({
      success: true,
      title_ja,
      summary_ja,
      post,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await supabase
      .from('articles')
      .update({ status: 'error' })
      .eq('id', id)

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
