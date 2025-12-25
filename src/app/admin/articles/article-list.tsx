'use client'

import { Article, Post, ContentType, CONTENT_TYPE_LABELS, CONTENT_TYPE_ICONS, CONTENT_TYPES, Tag } from '@/types/database'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { ArticlePreview } from '@/components/ArticlePreview'

// Tiptapはクライアントサイドのみで動作
const RichTextEditor = dynamic(
  () => import('@/components/editor/rich-text-editor').then(mod => mod.RichTextEditor),
  { ssr: false, loading: () => <div className="h-48 bg-gray-800 rounded-lg animate-pulse" /> }
)

type ArticleWithSourceAndPosts = Article & {
  sources: { name: string; category: string } | null
  posts: Post[]
  article_tags?: { tag_id: string; tags: Tag }[]
}

// シンプルなステータス（公開待ち / 公開中 のみ）
const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  translating: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  translated: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  generating: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  ready: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  published: 'bg-green-500/20 text-green-400 border border-green-500/30',
  posted: 'bg-green-500/20 text-green-400 border border-green-500/30',
  skipped: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  error: 'bg-red-500/20 text-red-400 border border-red-500/30',
}

const statusLabels: Record<string, string> = {
  pending: '公開待ち',
  translating: '公開待ち',
  translated: '公開待ち',
  generating: '公開待ち',
  ready: '公開待ち',
  published: '公開中',
  posted: '公開中',
  skipped: 'スキップ',
  error: 'エラー',
}

// フィルター用のシンプルなステータス
const statusFilterOptions = [
  { value: 'all', label: 'すべて' },
  { value: 'unpublished', label: '公開待ち' },
  { value: 'published', label: '公開中' },
  { value: 'skipped', label: 'スキップ' },
]

function formatCount(count: number | null): string {
  if (count === null) return '-'
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return count.toString()
}

type ProcessStatus = {
  id: string
  step: 'translating' | 'generating' | 'done' | 'error'
  message: string
}

export function ArticleList({ articles }: { articles: ArticleWithSourceAndPosts[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [action, setAction] = useState<string | null>(null)
  const [processStatus, setProcessStatus] = useState<ProcessStatus | null>(null)

  // フィルター
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [tagFilter, setTagFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortBy, setSortBy] = useState<'published_at' | 'created_at'>('published_at')

  // ページネーション
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // カテゴリ一覧を記事から抽出
  const categories = [...new Set(articles.map(a => a.sources?.category).filter(Boolean))] as string[]

  // 記事編集モーダル
  const [editingArticle, setEditingArticle] = useState<ArticleWithSourceAndPosts | null>(null)
  const [editForm, setEditForm] = useState({ title_ja: '', summary_ja: '', content_type: 'news' as ContentType, published_at: '' })

  // インラインコメント入力
  const [inlineNotes, setInlineNotes] = useState<Record<string, string>>({})
  const [showCommentInput, setShowCommentInput] = useState<string | null>(null)

  // タグ関連
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [tagsLoading, setTagsLoading] = useState(false)
  const [editingTags, setEditingTags] = useState<{ article: ArticleWithSourceAndPosts; tagIds: string[] } | null>(null)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#6b7280')

  // タグ一覧を取得
  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch('/api/tags')
      const data = await res.json()
      setAllTags(data.tags || [])
    } catch (error) {
      console.error('Failed to fetch tags:', error)
    }
  }, [])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  // 記事のタグを取得
  const getArticleTags = (article: ArticleWithSourceAndPosts): Tag[] => {
    return article.article_tags?.map(at => at.tags).filter(Boolean) || []
  }

  // タグ編集開始
  const startEditTags = (article: ArticleWithSourceAndPosts) => {
    const currentTagIds = getArticleTags(article).map(t => t.id)
    setEditingTags({ article, tagIds: currentTagIds })
    setNewTagName('')
  }

  // タグ保存
  const saveTags = async () => {
    if (!editingTags) return
    setTagsLoading(true)
    try {
      const res = await fetch(`/api/articles/${editingTags.article.id}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagIds: editingTags.tagIds }),
      })
      const data = await res.json()
      if (data.error) {
        alert(`Error: ${data.error}`)
      } else {
        setEditingTags(null)
        router.refresh()
      }
    } catch {
      alert('タグの保存に失敗しました')
    }
    setTagsLoading(false)
  }

  // 新規タグ作成
  const createTag = async () => {
    if (!newTagName.trim()) return
    setTagsLoading(true)
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      })
      const data = await res.json()
      if (data.error) {
        alert(`Error: ${data.error}`)
      } else if (data.tag) {
        setAllTags([...allTags, data.tag])
        if (editingTags) {
          setEditingTags({ ...editingTags, tagIds: [...editingTags.tagIds, data.tag.id] })
        }
        setNewTagName('')
      }
    } catch {
      alert('タグの作成に失敗しました')
    }
    setTagsLoading(false)
  }

  // タグ選択切り替え
  const toggleTagSelection = (tagId: string) => {
    if (!editingTags) return
    const newTagIds = editingTags.tagIds.includes(tagId)
      ? editingTags.tagIds.filter(id => id !== tagId)
      : [...editingTags.tagIds, tagId]
    setEditingTags({ ...editingTags, tagIds: newTagIds })
  }

  const startEditArticle = (article: ArticleWithSourceAndPosts) => {
    setEditingArticle(article)
    // 日付をdatetime-local用にフォーマット
    let publishedAt = ''
    if (article.published_at) {
      const date = new Date(article.published_at)
      publishedAt = date.toISOString().slice(0, 16) // "YYYY-MM-DDTHH:mm"
    }
    setEditForm({
      title_ja: article.title_ja || '',
      summary_ja: article.summary_ja || '',
      content_type: article.content_type || 'news',
      published_at: publishedAt,
    })
  }

  const saveArticle = async () => {
    if (!editingArticle) return
    setLoading(editingArticle.id)
    setAction('saving')
    try {
      // published_atをISO形式に変換
      const payload = {
        ...editForm,
        published_at: editForm.published_at ? new Date(editForm.published_at).toISOString() : null,
      }
      const res = await fetch(`/api/articles/${editingArticle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.error) {
        alert(`Error: ${data.error}`)
      } else {
        setEditingArticle(null)
      }
    } catch {
      alert('保存に失敗しました')
    }
    router.refresh()
    setLoading(null)
    setAction(null)
  }

  const processArticle = async (id: string, editorNote?: string, forceRegenerate: boolean = false) => {
    setLoading(id)
    setProcessStatus({ id, step: 'translating', message: '生成中...' })
    try {
      // コメントがあれば先に保存
      if (editorNote) {
        await fetch(`/api/articles/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ editor_note: editorNote }),
        })
      }

      const res = await fetch(`/api/articles/${id}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRegenerate }),
      })
      const data = await res.json()
      if (data.error) {
        setProcessStatus({ id, step: 'error', message: data.error })
        setTimeout(() => setProcessStatus(null), 5000)
      } else {
        setProcessStatus({ id, step: 'done', message: '生成完了' })
        setTimeout(() => setProcessStatus(null), 3000)
        // 生成後はインラインコメントをクリア
        setInlineNotes(prev => {
          const next = { ...prev }
          delete next[id]
          return next
        })
      }
    } catch {
      setProcessStatus({ id, step: 'error', message: '生成に失敗しました' })
      setTimeout(() => setProcessStatus(null), 5000)
    }
    router.refresh()
    setLoading(null)
  }

  const publishArticle = async (id: string) => {
    setLoading(id)
    setAction('publishing')
    try {
      const res = await fetch(`/api/articles/${id}/publish`, { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        alert(`Error: ${data.error}`)
      }
    } catch {
      alert('公開に失敗しました')
    }
    router.refresh()
    setLoading(null)
    setAction(null)
  }

  const skipArticle = async (id: string) => {
    setLoading(id)
    setAction('skipping')
    try {
      const res = await fetch(`/api/articles/${id}/skip`, { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        alert(`Error: ${data.error}`)
      }
    } catch {
      alert('スキップに失敗しました')
    }
    router.refresh()
    setLoading(null)
    setAction(null)
  }

  const unpublishArticle = async (id: string) => {
    if (!confirm('この記事をサイトから非公開にしますか？\n（Xの投稿は手動で削除してください）')) return

    setLoading(id)
    setAction('unpublishing')
    try {
      const res = await fetch(`/api/articles/${id}/unpublish`, { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        alert(`Error: ${data.error}`)
      }
    } catch {
      alert('非公開に失敗しました')
    }
    router.refresh()
    setLoading(null)
    setAction(null)
  }

  const deleteArticle = async (id: string) => {
    if (!confirm('この記事を削除しますか？\n関連する投稿データも削除されます。この操作は取り消せません。')) return

    setLoading(id)
    setAction('deleting')
    try {
      const res = await fetch(`/api/articles/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) {
        alert(`Error: ${data.error}`)
      }
    } catch {
      alert('削除に失敗しました')
    }
    router.refresh()
    setLoading(null)
    setAction(null)
  }

  // フィルタリング
  const filteredArticles = articles.filter(article => {
    if (contentTypeFilter !== 'all' && article.content_type !== contentTypeFilter) return false

    // ステータスフィルター（unpublishedは公開待ち系をまとめて扱う）
    if (statusFilter !== 'all') {
      if (statusFilter === 'unpublished') {
        // 公開待ち = published/posted/skipped以外
        if (['published', 'posted', 'skipped'].includes(article.status)) return false
      } else if (statusFilter === 'published') {
        // 公開中 = published または posted
        if (!['published', 'posted'].includes(article.status)) return false
      } else {
        if (article.status !== statusFilter) return false
      }
    }

    if (categoryFilter !== 'all' && article.sources?.category !== categoryFilter) return false
    if (tagFilter !== 'all') {
      const articleTagIds = getArticleTags(article).map(t => t.id)
      if (!articleTagIds.includes(tagFilter)) return false
    }
    // 検索クエリによるフィルタリング
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const title = (article.title_ja || article.title_original || '').toLowerCase()
      if (!title.includes(query)) return false
    }
    return true
  })

  // ソート
  const sortedArticles = [...filteredArticles].sort((a, b) => {
    if (sortBy === 'created_at') {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    }
    return new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime()
  })

  // ページネーション
  const totalPages = Math.ceil(sortedArticles.length / itemsPerPage)
  const paginatedArticles = sortedArticles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // フィルター変更時にページをリセット
  useEffect(() => {
    setCurrentPage(1)
  }, [contentTypeFilter, statusFilter, categoryFilter, tagFilter, searchQuery, sortBy])

  if (articles.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-400">まだ記事がありません。先にソースから取得してください！</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 検索・フィルター */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
        {/* 検索バー */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="記事タイトルで検索..."
              className="w-full px-4 py-2.5 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">並び順:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'published_at' | 'created_at')}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="published_at">公開日順</option>
              <option value="created_at">追加日順</option>
            </select>
          </div>
        </div>

        {/* フィルター */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">種別:</label>
            <select
              value={contentTypeFilter}
              onChange={(e) => setContentTypeFilter(e.target.value as ContentType | 'all')}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">すべて</option>
              {CONTENT_TYPES.map(type => (
                <option key={type} value={type}>{CONTENT_TYPE_ICONS[type]} {CONTENT_TYPE_LABELS[type]}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">ステータス:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {statusFilterOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">カテゴリ:</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">すべて</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">タグ:</label>
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">すべて</option>
              {allTags.map(tag => (
                <option key={tag.id} value={tag.id}>{tag.name} ({tag.article_count})</option>
              ))}
            </select>
          </div>

          {/* フィルターリセット */}
          {(contentTypeFilter !== 'all' || statusFilter !== 'all' || categoryFilter !== 'all' || tagFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setContentTypeFilter('all')
                setStatusFilter('all')
                setCategoryFilter('all')
                setTagFilter('all')
                setSearchQuery('')
              }}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 rounded transition-colors"
            >
              リセット
            </button>
          )}

          <div className="text-sm text-gray-500 ml-auto">
            {filteredArticles.length} / {articles.length} 件
          </div>
        </div>
      </div>

      {paginatedArticles.map((article) => {
        const canProcess = ['pending', 'translated', 'published'].includes(article.status)
        const canPublish = ['translated', 'ready'].includes(article.status) && article.status !== 'published' && article.status !== 'posted'
        const canUnpublish = ['published', 'posted'].includes(article.status)
        const canSkip = ['pending', 'translated', 'ready'].includes(article.status)
        const isProcessing = processStatus?.id === article.id && !['done', 'error'].includes(processStatus.step)

        return (
          <div
            key={article.id}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6"
          >
            <div className="flex items-start gap-4">
              {article.thumbnail_url && (
                <img
                  src={article.thumbnail_url}
                  alt=""
                  className="w-24 h-16 object-cover rounded"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-medium text-white">
                      {article.title_ja || article.title_original}
                    </h3>
                    {article.title_ja && (
                      <p className="text-sm text-gray-500 mt-1">
                        {article.title_original}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-sm text-gray-400 mt-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded text-xs">
                        {CONTENT_TYPE_ICONS[article.content_type]} {CONTENT_TYPE_LABELS[article.content_type] || 'ニュース'}
                      </span>
                      {article.published_at && (
                        <span className="text-gray-500" title="公開日">
                          {new Date(article.published_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      <span>{article.sources?.name}</span>
                      {(article.view_count !== null || article.like_count !== null) && (
                        <span className="flex items-center gap-2 text-gray-500">
                          {article.view_count !== null && (
                            <span title="再生数">▶ {formatCount(article.view_count)}</span>
                          )}
                          {article.like_count !== null && (
                            <span title="いいね">♡ {formatCount(article.like_count)}</span>
                          )}
                        </span>
                      )}
                    </div>
                    {/* タグ表示 */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {getArticleTags(article).map(tag => (
                        <span
                          key={tag.id}
                          className="px-2 py-0.5 text-xs rounded"
                          style={{ backgroundColor: tag.color + '30', color: tag.color, border: `1px solid ${tag.color}50` }}
                        >
                          #{tag.name}
                        </span>
                      ))}
                      <button
                        onClick={() => startEditTags(article)}
                        className="px-2 py-0.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                      >
                        + タグ
                      </button>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded whitespace-nowrap ${statusColors[article.status] || 'bg-gray-700 text-gray-300'}`}>
                    {statusLabels[article.status] || article.status}
                  </span>
                </div>

                {/* コメント入力欄（ボタンで展開） */}
                {showCommentInput === article.id && (
                  <div className="mt-4 p-3 bg-purple-900/20 border border-purple-800/50 rounded-lg">
                    <label className="block text-xs text-purple-300 mb-2">
                      編集者コメント（記事・X投稿に反映）
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inlineNotes[article.id] || (article as ArticleWithSourceAndPosts & { editor_note?: string }).editor_note || ''}
                        onChange={(e) => setInlineNotes(prev => ({ ...prev, [article.id]: e.target.value }))}
                        placeholder="例: 前回紹介したアーティスト / MVが良い"
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-gray-600"
                        autoFocus
                      />
                      <button
                        onClick={async () => {
                          const note = inlineNotes[article.id]
                          if (note) {
                            await fetch(`/api/articles/${article.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ editor_note: note }),
                            })
                          }
                          setShowCommentInput(null)
                          router.refresh()
                        }}
                        className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors whitespace-nowrap"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setShowCommentInput(null)}
                        className="px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                    {(article as ArticleWithSourceAndPosts & { editor_note?: string }).editor_note && (
                      <p className="text-xs text-purple-400 mt-2">
                        現在のコメント: {(article as ArticleWithSourceAndPosts & { editor_note?: string }).editor_note}
                      </p>
                    )}
                  </div>
                )}

                {/* 進捗表示 */}
                {processStatus?.id === article.id && (
                  <div className={`mt-3 p-2 rounded-lg flex items-center gap-2 text-sm ${
                    processStatus.step === 'error' ? 'bg-red-900/50 text-red-300' :
                    processStatus.step === 'done' ? 'bg-green-900/50 text-green-300' :
                    'bg-blue-900/50 text-blue-300'
                  }`}>
                    {isProcessing && (
                      <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    )}
                    {processStatus.step === 'done' && <span>✓</span>}
                    {processStatus.step === 'error' && <span>✗</span>}
                    <span>{processStatus.message}</span>
                  </div>
                )}

                {/* アクションボタン */}
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  {/* コメント入力ボタン（常に表示） */}
                  <button
                    onClick={() => {
                      setShowCommentInput(showCommentInput === article.id ? null : article.id)
                      // 既存のコメントをセット
                      const existingNote = (article as ArticleWithSourceAndPosts & { editor_note?: string }).editor_note
                      if (existingNote && !inlineNotes[article.id]) {
                        setInlineNotes(prev => ({ ...prev, [article.id]: existingNote }))
                      }
                    }}
                    className={`px-3 py-1.5 text-sm rounded transition-colors ${
                      showCommentInput === article.id
                        ? 'bg-purple-600 text-white'
                        : (article as ArticleWithSourceAndPosts & { editor_note?: string }).editor_note
                          ? 'bg-purple-900 text-purple-300 border border-purple-700'
                          : 'bg-gray-700 hover:bg-gray-600 text-white'
                    }`}
                  >
                    {(article as ArticleWithSourceAndPosts & { editor_note?: string }).editor_note ? 'コメント編集' : 'コメント入力'}
                  </button>

                  {/* pending状態の記事には生成ボタンを表示 */}
                  {article.status === 'pending' && (
                    <button
                      onClick={() => processArticle(article.id, inlineNotes[article.id])}
                      disabled={loading === article.id}
                      className="px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded transition-colors flex items-center gap-2"
                    >
                      {isProcessing && (
                        <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      )}
                      {isProcessing ? processStatus?.message : '生成'}
                    </button>
                  )}

                  {/* translated状態の記事には生成ボタンを表示 */}
                  {article.status === 'translated' && (
                    <button
                      onClick={() => processArticle(article.id, inlineNotes[article.id])}
                      disabled={loading === article.id}
                      className="px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded transition-colors flex items-center gap-2"
                    >
                      {isProcessing && (
                        <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      )}
                      {isProcessing ? processStatus?.message : '生成'}
                    </button>
                  )}

                  {/* 記事を再生成ボタン（記事生成済みの場合） */}
                  {article.summary_ja && ['ready', 'published', 'posted'].includes(article.status) && (
                    <button
                      onClick={() => processArticle(article.id, inlineNotes[article.id], true)}
                      disabled={loading === article.id}
                      className="px-3 py-1.5 text-sm bg-purple-800 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded transition-colors flex items-center gap-2"
                    >
                      {isProcessing && (
                        <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      )}
                      {isProcessing ? processStatus?.message : '記事を再生成'}
                    </button>
                  )}

                  {canPublish && (
                    <button
                      onClick={() => publishArticle(article.id)}
                      disabled={loading === article.id}
                      className="px-3 py-1.5 text-sm bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 text-white rounded transition-colors"
                    >
                      {loading === article.id && action === 'publishing' ? '公開中...' : 'サイトに公開'}
                    </button>
                  )}

                  {canUnpublish && (
                    <button
                      onClick={() => unpublishArticle(article.id)}
                      disabled={loading === article.id}
                      className="px-3 py-1.5 text-sm bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white rounded transition-colors"
                    >
                      {loading === article.id && action === 'unpublishing' ? '処理中...' : '非公開にする'}
                    </button>
                  )}

                  {article.title_ja && (
                    <button
                      onClick={() => startEditArticle(article)}
                      className="px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                    >
                      記事編集
                    </button>
                  )}

                  {canSkip && (
                    <button
                      onClick={() => skipArticle(article.id)}
                      disabled={loading === article.id}
                      className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                    >
                      スキップ
                    </button>
                  )}

                  {canUnpublish && (
                    <a
                      href={`/article/${article.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-sm bg-teal-700 hover:bg-teal-600 text-white rounded transition-colors"
                    >
                      サイトで見る
                    </a>
                  )}

                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                  >
                    元記事
                  </a>

                  <button
                    onClick={() => deleteArticle(article.id)}
                    disabled={loading === article.id}
                    className="px-3 py-1.5 text-sm bg-red-900 hover:bg-red-800 disabled:bg-gray-600 text-red-200 rounded transition-colors"
                  >
                    {loading === article.id && action === 'deleting' ? '削除中...' : '削除'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 text-white rounded transition-colors"
          >
            最初
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 text-white rounded transition-colors"
          >
            前へ
          </button>

          <div className="flex items-center gap-1">
            {/* ページ番号ボタン */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                // 最初の2ページ、最後の2ページ、現在ページの前後1ページを表示
                if (page <= 2) return true
                if (page >= totalPages - 1) return true
                if (Math.abs(page - currentPage) <= 1) return true
                return false
              })
              .map((page, index, filteredPages) => {
                // 省略記号を表示
                const showEllipsis = index > 0 && page - filteredPages[index - 1] > 1
                return (
                  <span key={page} className="flex items-center">
                    {showEllipsis && <span className="px-2 text-gray-500">...</span>}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-[36px] px-3 py-2 text-sm rounded transition-colors ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 hover:bg-gray-700 text-white'
                      }`}
                    >
                      {page}
                    </button>
                  </span>
                )
              })}
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-sm bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 text-white rounded transition-colors"
          >
            次へ
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-sm bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 text-white rounded transition-colors"
          >
            最後
          </button>
        </div>
      )}

      {/* 記事編集モーダル */}
      {editingArticle && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">記事を編集</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                タイトル（日本語）
              </label>
              <input
                type="text"
                value={editForm.title_ja}
                onChange={(e) => setEditForm({ ...editForm, title_ja: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                本文（日本語） - リンク、太字、リストなどを使用可能
              </label>
              <RichTextEditor
                content={editForm.summary_ja}
                onChange={(content) => setEditForm({ ...editForm, summary_ja: content })}
                placeholder="記事の本文を入力..."
              />
              <p className="text-xs text-gray-500 mt-1">
                テキストを選択してリンクボタンでURLを挿入できます
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  コンテンツ種別
                </label>
                <select
                  value={editForm.content_type}
                  onChange={(e) => setEditForm({ ...editForm, content_type: e.target.value as ContentType })}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CONTENT_TYPES.map(type => (
                    <option key={type} value={type}>{CONTENT_TYPE_ICONS[type]} {CONTENT_TYPE_LABELS[type]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  公開日時
                </label>
                <input
                  type="datetime-local"
                  value={editForm.published_at}
                  onChange={(e) => setEditForm({ ...editForm, published_at: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">空欄の場合は現在日時が設定されます</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={saveArticle}
                disabled={loading === editingArticle.id}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {loading === editingArticle.id && action === 'saving' ? '保存中...' : '保存'}
              </button>
              <ArticlePreview content={editForm.summary_ja} title={editForm.title_ja} />
              <button
                onClick={() => setEditingArticle(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* タグ編集モーダル */}
      {editingTags && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">タグを編集</h3>
            <p className="text-sm text-gray-400 mb-4">
              {editingTags.article.title_ja || editingTags.article.title_original}
            </p>

            {/* 既存タグの選択 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">タグを選択</label>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => {
                  const isSelected = editingTags.tagIds.includes(tag.id)
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTagSelection(tag.id)}
                      className={`px-3 py-1.5 text-sm rounded transition-colors ${
                        isSelected
                          ? 'ring-2 ring-white'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: tag.color + '40',
                        color: tag.color,
                        border: `1px solid ${tag.color}`
                      }}
                    >
                      #{tag.name}
                      {isSelected && ' ✓'}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 新規タグ作成 */}
            <div className="mb-4 p-4 bg-gray-800 rounded-lg">
              <label className="block text-sm font-medium text-gray-300 mb-2">新しいタグを作成</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="タグ名"
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <button
                  onClick={createTag}
                  disabled={tagsLoading || !newTagName.trim()}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
                >
                  追加
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={saveTags}
                disabled={tagsLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {tagsLoading ? '保存中...' : '保存'}
              </button>
              <button
                onClick={() => setEditingTags(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
