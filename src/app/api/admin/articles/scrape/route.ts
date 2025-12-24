import { createServiceClient } from '@/lib/supabase/server'
import { scrapeArticle, toContentBlocks } from '@/lib/scraper/article-scraper'
import { processExternalArticle, detectContentType } from '@/lib/llm/client'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// URLからスクレイピングしてプレビューを返す
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  }

  try {
    const scraped = await scrapeArticle(url)
    return NextResponse.json({ scraped })
  } catch (error) {
    console.error('Scrape error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to scrape article' },
      { status: 500 }
    )
  }
}

// スクレイピング結果を保存して翻訳処理
export async function POST(request: NextRequest) {
  const supabase = await createServiceClient()

  try {
    const body = await request.json()
    const { url, category_id } = body

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // スクレイピング
    console.log('[scrape] Fetching:', url)
    const scraped = await scrapeArticle(url)
    console.log('[scrape] Title:', scraped.title)

    // external_id生成（重複チェック用）
    const external_id = crypto.createHash('md5').update(url).digest('hex')

    // 重複チェック
    const { data: existing } = await supabase
      .from('articles')
      .select('id')
      .eq('external_id', external_id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'この記事は既に登録されています', articleId: existing.id },
        { status: 409 }
      )
    }

    // content_type自動判定
    console.log('[scrape] Detecting content type...')
    const contentType = await detectContentType({
      title: scraped.title,
      description: scraped.excerpt,
      source: scraped.siteName,
    })
    console.log('[scrape] Content type:', contentType)

    // 翻訳・紹介文生成
    console.log('[scrape] Processing with LLM...')
    const processed = await processExternalArticle({
      title: scraped.title,
      excerpt: scraped.excerpt,
      siteName: scraped.siteName,
      contentType,
    })
    console.log('[scrape] Title JA:', processed.titleJa)

    // カテゴリ取得（指定があれば）
    let category = 'music'
    if (category_id) {
      const { data: categoryData } = await supabase
        .from('categories')
        .select('slug')
        .eq('id', category_id)
        .single()
      category = categoryData?.slug || 'music'
    }

    // ContentBlocksを生成
    const contentBlocks = toContentBlocks(scraped)

    // 記事を保存
    const { data: article, error: insertError } = await supabase
      .from('articles')
      .insert({
        external_id,
        title_original: scraped.title,
        title_ja: processed.titleJa,
        summary_original: scraped.excerpt,
        summary_ja: processed.summaryJa,
        link: url,
        thumbnail_url: scraped.thumbnailUrl,
        author: scraped.author,
        published_at: scraped.publishedAt,
        status: 'ready',
        content_type: contentType,
        // 外部記事用フィールド
        source_url: url,
        source_site_name: scraped.siteName,
        excerpt_original: scraped.excerpt,
        excerpt_ja: processed.excerptJa,
        content_blocks: contentBlocks,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[scrape] Insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    console.log('[scrape] Done! Article ID:', article.id)

    return NextResponse.json({
      success: true,
      article,
      scraped,
      processed,
    })
  } catch (error) {
    console.error('[scrape] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process article' },
      { status: 500 }
    )
  }
}
