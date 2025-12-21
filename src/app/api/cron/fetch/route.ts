import { createServiceClient } from '@/lib/supabase/server'
import { fetchRssFeed, fetchExternalArticleRss } from '@/lib/rss/fetcher'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // Cron認証
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()

  // 有効なソースをすべて取得
  const { data: sources, error: sourcesError } = await supabase
    .from('sources')
    .select('*')
    .eq('enabled', true)

  if (sourcesError) {
    return NextResponse.json({ error: sourcesError.message }, { status: 500 })
  }

  const results = []

  for (const source of sources || []) {
    try {
      // ソースタイプに応じて処理を分岐
      if (source.type === 'rss_article') {
        // 外部記事RSS: スクレイピング + 翻訳処理込み
        const articles = await fetchExternalArticleRss(source.url, { maxItems: 3 })

        let insertedCount = 0
        for (const article of articles) {
          // 重複チェック
          const { data: existing } = await supabase
            .from('articles')
            .select('id')
            .eq('external_id', article.external_id)
            .single()

          if (existing) {
            // 既存記事はスキップ
            continue
          }

          // 新規記事を挿入（翻訳済み・ready状態で）
          const { data: insertedArticle, error: insertError } = await supabase
            .from('articles')
            .insert({
              source_id: source.id,
              external_id: article.external_id,
              title_original: article.title_original,
              title_ja: article.title_ja,
              summary_original: article.summary_original,
              summary_ja: article.summary_ja,
              link: article.link,
              thumbnail_url: article.thumbnail_url,
              author: article.author,
              published_at: article.published_at,
              status: 'ready', // 翻訳済みなのでready
              content_type: article.content_type,
              source_url: article.source_url,
              source_site_name: article.source_site_name,
              excerpt_original: article.excerpt_original,
              excerpt_ja: article.excerpt_ja,
              content_blocks: article.content_blocks,
            })
            .select()
            .single()

          if (insertError) {
            console.error(`[cron] Failed to insert article:`, insertError)
            continue
          }

          // X投稿文を保存
          if (insertedArticle) {
            await supabase.from('posts').insert({
              article_id: insertedArticle.id,
              content: article.post_content,
              content_style: 'external_article',
              platform: 'x',
              status: 'draft',
            })
            insertedCount++
          }
        }

        await supabase
          .from('sources')
          .update({ last_fetched_at: new Date().toISOString(), fetch_error: null })
          .eq('id', source.id)

        await supabase.from('fetch_logs').insert({
          source_id: source.id,
          status: 'success',
          articles_count: articles.length,
        })

        results.push({
          source: source.name,
          type: 'rss_article',
          fetched: articles.length,
          inserted: insertedCount,
        })
      } else {
        // 通常RSS/YouTube: 従来の処理
        const articles = await fetchRssFeed(source.url)

        let insertedCount = 0
        for (const article of articles) {
          // まず既存の記事を確認
          const { data: existing } = await supabase
            .from('articles')
            .select('id')
            .eq('source_id', source.id)
            .eq('external_id', article.external_id)
            .single()

          if (existing) {
            // 既存の記事はview_count, like_count, summary_originalのみ更新
            await supabase
              .from('articles')
              .update({
                view_count: article.view_count,
                like_count: article.like_count,
                summary_original: article.summary_original,
              })
              .eq('id', existing.id)
          } else {
            // 新規記事は挿入
            const { error } = await supabase.from('articles').insert({
              source_id: source.id,
              ...article,
              status: 'pending',
            })
            if (!error) insertedCount++
          }
        }

        await supabase
          .from('sources')
          .update({ last_fetched_at: new Date().toISOString(), fetch_error: null })
          .eq('id', source.id)

        await supabase.from('fetch_logs').insert({
          source_id: source.id,
          status: 'success',
          articles_count: articles.length,
        })

        results.push({ source: source.name, type: source.type, fetched: articles.length, inserted: insertedCount })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await supabase
        .from('sources')
        .update({ fetch_error: errorMessage })
        .eq('id', source.id)

      await supabase.from('fetch_logs').insert({
        source_id: source.id,
        status: 'error',
        error_message: errorMessage,
      })

      results.push({ source: source.name, error: errorMessage })
    }
  }

  return NextResponse.json({ success: true, results })
}
