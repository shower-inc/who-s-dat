import { createServiceClient } from '@/lib/supabase/server'
import { detectContentType } from '@/lib/llm/client'
import { generateArticleWithGemini } from '@/lib/llm/gemini-client'
import { createArtistService } from '@/lib/artists/service'
import { enrichArticleInfo, formatEnrichedInfo } from '@/lib/web/gemini-search'
import { extractArtistName } from '@/lib/web/search'
import { findRelatedArticles, formatRelatedArticles } from '@/lib/articles/related'
import { NextResponse } from 'next/server'

// Unified API: enrich → translate article
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

  // リクエストボディから強制再生成フラグを取得
  let forceRegenerate = false
  try {
    const body = await request.json()
    forceRegenerate = body.forceRegenerate === true
  } catch {
    // bodyがない場合は無視
  }

  // デバッグログ
  console.log('[process] Starting:', {
    id,
    status: article.status,
    hasEditorNote: !!article.editor_note,
    editorNote: article.editor_note?.substring(0, 50),
    forceRegenerate,
  })

  try {
    // Step 1: アーティスト情報を取得（DBキャッシュ or Web検索）
    const artist = await artistService.getOrFetchArtist(article.title_original)
    const artistInfo = artistService.formatArtistInfo(artist)

    // Step 1.2: Gemini検索で追加情報を取得
    const artistName = extractArtistName(article.title_original)
    const enrichedInfo = await enrichArticleInfo({
      title: article.title_original,
      description: article.summary_original || undefined,
      artistName: artistName || undefined,
    })
    const enrichedInfoText = formatEnrichedInfo(enrichedInfo)

    console.log('[process] Enriched info:', enrichedInfoText?.slice(0, 200))

    // Step 1.3: 関連記事を検索
    const relatedArticles = await findRelatedArticles(supabase, id, article.title_original)
    const relatedArticlesText = formatRelatedArticles(relatedArticles)

    if (relatedArticles.length > 0) {
      console.log(`[process] Found ${relatedArticles.length} related articles`)
    }

    // Step 1.5: content_type自動判定（未設定の場合）
    let contentType = article.content_type
    if (!contentType || contentType === 'news') {
      contentType = await detectContentType({
        title: article.title_original,
        description: article.summary_original || '',
        source: source?.name || 'Unknown',
      })
    }

    // 記事にアーティストIDとcontent_typeを紐付け
    const updateData: { artist_id?: string; content_type?: string } = {}
    if (artist) {
      updateData.artist_id = artist.id
    }
    if (contentType !== article.content_type) {
      updateData.content_type = contentType
    }
    if (Object.keys(updateData).length > 0) {
      await supabase
        .from('articles')
        .update(updateData)
        .eq('id', id)
    }

    // Step 2: 記事生成（本文が未生成の場合、または強制再生成）
    // タイトルは翻訳済みでも、本文（summary_ja）がなければ生成する
    let title_ja = article.title_ja
    let summary_ja = article.summary_ja

    if (!summary_ja || forceRegenerate) {
      console.log('[process] Generating article with editorNote:', article.editor_note)
      await supabase
        .from('articles')
        .update({ status: 'translating' })
        .eq('id', id)

      // アーティスト情報と検索結果を結合
      const combinedInfo = [artistInfo, enrichedInfoText, relatedArticlesText].filter(Boolean).join('\n\n')

      const generated = await generateArticleWithGemini({
        title: article.title_original,
        description: article.summary_original || '',
        channel: source?.name || 'Unknown',
        artistInfo: combinedInfo,
        editorNote: article.editor_note || undefined,
      })

      // タイトルが未翻訳なら翻訳結果を使う
      if (!title_ja) {
        title_ja = generated.title
      }
      summary_ja = generated.content

      await supabase
        .from('articles')
        .update({
          title_ja,
          summary_ja,
          status: 'ready',
        })
        .eq('id', id)
    } else {
      // 既に翻訳済みの場合はreadyに
      await supabase
        .from('articles')
        .update({ status: 'ready' })
        .eq('id', id)
    }

    return NextResponse.json({
      success: true,
      title_ja,
      summary_ja,
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
