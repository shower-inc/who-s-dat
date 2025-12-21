import { createServiceClient } from '@/lib/supabase/server'
import { fetchUrlMetadata } from '@/lib/article/fetcher'
import { NextRequest, NextResponse } from 'next/server'

// URLからメタデータを取得
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  try {
    const metadata = await fetchUrlMetadata(url)
    return NextResponse.json(metadata)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 500 })
  }
}

// 手動で記事を作成
export async function POST(request: NextRequest) {
  const supabase = await createServiceClient()

  try {
    const body = await request.json()
    const { url, title, description, thumbnail_url, author, category_id } = body

    if (!url || !title) {
      return NextResponse.json(
        { error: 'url and title are required' },
        { status: 400 }
      )
    }

    // 重複チェック（同じURLが既にあるか）
    const { data: existing } = await supabase
      .from('articles')
      .select('id')
      .eq('link', url)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'この URLの記事は既に存在します', article_id: existing.id },
        { status: 409 }
      )
    }

    // 記事を作成（source_id = null で手動追加を示す）
    const { data, error } = await supabase
      .from('articles')
      .insert([
        {
          source_id: null,
          external_id: `manual_${Date.now()}`,
          title_original: title,
          summary_original: description,
          link: url,
          thumbnail_url,
          author,
          published_at: new Date().toISOString(),
          status: 'pending',
          // category_idはarticlesテーブルにはない。後でタグとして追加可能
        },
      ])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // カテゴリをタグとして追加（もしcategory_idが指定されていれば）
    if (category_id) {
      const { data: category } = await supabase
        .from('categories')
        .select('name')
        .eq('id', category_id)
        .single()

      if (category) {
        // タグテーブルに追加
        const { data: tag } = await supabase
          .from('tags')
          .select('id')
          .eq('name', category.name)
          .single()

        if (tag) {
          await supabase.from('article_tags').insert([
            { article_id: data.id, tag_id: tag.id },
          ])
        }
      }
    }

    return NextResponse.json({ article: data })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
