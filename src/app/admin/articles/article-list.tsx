'use client'

import { Article, Post, ContentType, CONTENT_TYPE_LABELS, CONTENT_TYPE_ICONS, CONTENT_TYPES, Tag } from '@/types/database'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'

type ArticleWithSourceAndPosts = Article & {
  sources: { name: string; category: string } | null
  posts: Post[]
  article_tags?: { tag_id: string; tags: Tag }[]
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-900 text-yellow-300',
  translating: 'bg-blue-900 text-blue-300',
  translated: 'bg-purple-900 text-purple-300',
  generating: 'bg-indigo-900 text-indigo-300',
  ready: 'bg-green-900 text-green-300',
  published: 'bg-teal-900 text-teal-300',
  posted: 'bg-emerald-900 text-emerald-300',
  skipped: 'bg-gray-700 text-gray-300',
  error: 'bg-red-900 text-red-300',
}

const statusLabels: Record<string, string> = {
  pending: '未処理',
  translating: '翻訳中',
  translated: '翻訳済',
  generating: '生成中',
  ready: '準備完了',
  published: '公開中',
  posted: 'X投稿済',
  skipped: 'スキップ',
  error: 'エラー',
}

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
  const [tagFilter, setTagFilter] = useState<string>('all')

  // 記事編集モーダル
  const [editingArticle, setEditingArticle] = useState<ArticleWithSourceAndPosts | null>(null)
  const [editForm, setEditForm] = useState({ title_ja: '', summary_ja: '', content_type: 'news' as ContentType })

  // 投稿文編集モーダル
  const [editingPost, setEditingPost] = useState<{ article: ArticleWithSourceAndPosts; post: Post } | null>(null)
  const [postContent, setPostContent] = useState('')

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
    setEditForm({
      title_ja: article.title_ja || '',
      summary_ja: article.summary_ja || '',
      content_type: article.content_type || 'news',
    })
  }

  const saveArticle = async () => {
    if (!editingArticle) return
    setLoading(editingArticle.id)
    setAction('saving')
    try {
      const res = await fetch(`/api/articles/${editingArticle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
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

  const startEditPost = (article: ArticleWithSourceAndPosts, post: Post) => {
    setEditingPost({ article, post })
    setPostContent(post.content)
  }

  const savePost = async () => {
    if (!editingPost) return
    setLoading(editingPost.article.id)
    setAction('saving')
    try {
      const res = await fetch(`/api/posts/${editingPost.post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: postContent }),
      })
      const data = await res.json()
      if (data.error) {
        alert(`Error: ${data.error}`)
      } else {
        setEditingPost(null)
      }
    } catch {
      alert('保存に失敗しました')
    }
    router.refresh()
    setLoading(null)
    setAction(null)
  }

  const processArticle = async (id: string, editorNote?: string) => {
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

      const res = await fetch(`/api/articles/${id}/process`, { method: 'POST' })
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

  const postToX = async (article: ArticleWithSourceAndPosts, repost: boolean = false) => {
    const post = article.posts.find(p => p.platform === 'x')
    if (!post) return

    if (repost && !confirm('この記事を再度Xに投稿しますか？\n（既に投稿済みの場合、重複投稿になる可能性があります）')) {
      return
    }

    setLoading(article.id)
    setAction('posting')
    try {
      const res = await fetch(`/api/posts/${post.id}/post`, { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        alert(`Error: ${data.error}`)
      } else {
        alert('Xに投稿しました！')
      }
    } catch {
      alert('X投稿に失敗しました')
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

  // 記事の投稿文を取得（X用で未投稿のもの優先、なければ投稿済み）
  const getXPost = (article: ArticleWithSourceAndPosts): Post | null => {
    const xPosts = article.posts.filter(p => p.platform === 'x')
    return xPosts.find(p => p.status !== 'posted') || xPosts.find(p => p.status === 'posted') || null
  }

  // フィルタリング
  const filteredArticles = articles.filter(article => {
    if (contentTypeFilter !== 'all' && article.content_type !== contentTypeFilter) return false
    if (statusFilter !== 'all' && article.status !== statusFilter) return false
    if (tagFilter !== 'all') {
      const articleTagIds = getArticleTags(article).map(t => t.id)
      if (!articleTagIds.includes(tagFilter)) return false
    }
    return true
  })

  if (articles.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-400">まだ記事がありません。先にソースから取得してください！</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* フィルター */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-wrap gap-4">
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
            <option value="all">すべて</option>
            {Object.entries(statusLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
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

        <div className="text-sm text-gray-500 ml-auto">
          {filteredArticles.length} / {articles.length} 件
        </div>
      </div>

      {filteredArticles.map((article) => {
        const xPost = getXPost(article)
        const canProcess = ['pending', 'translated', 'published'].includes(article.status)
        const canPublish = ['translated', 'ready'].includes(article.status) && article.status !== 'published' && article.status !== 'posted'
        const canUnpublish = ['published', 'posted'].includes(article.status)
        const canPostToX = xPost && xPost.status !== 'posted'
        const canSkip = ['pending', 'translated', 'ready'].includes(article.status)
        const isPosted = article.status === 'posted' || xPost?.status === 'posted'
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
                    <div className="flex items-center gap-3 text-sm text-gray-400 mt-2">
                      <span className="px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded text-xs">
                        {CONTENT_TYPE_ICONS[article.content_type]} {CONTENT_TYPE_LABELS[article.content_type] || 'ニュース'}
                      </span>
                      <span>{article.sources?.name} • {article.sources?.category}</span>
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

                {/* X投稿文表示 */}
                {xPost && (
                  <div className={`mt-4 p-3 rounded-lg ${xPost.status === 'posted' ? 'bg-green-900/30 border border-green-800' : 'bg-gray-800'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400">X投稿文</span>
                      {xPost.status === 'posted' && (
                        <span className="px-2 py-0.5 text-xs bg-green-600 text-white rounded">
                          X投稿済 {xPost.posted_at && `(${new Date(xPost.posted_at).toLocaleDateString('ja-JP')})`}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-200 whitespace-pre-wrap">{xPost.content}</p>
                    <p className="text-xs text-gray-500 mt-2">{xPost.content.length} 文字</p>
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
                      onClick={() => processArticle(article.id, inlineNotes[article.id])}
                      disabled={loading === article.id}
                      className="px-3 py-1.5 text-sm bg-purple-800 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded transition-colors flex items-center gap-2"
                    >
                      {isProcessing && (
                        <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      )}
                      {isProcessing ? processStatus?.message : '記事を再生成'}
                    </button>
                  )}

                  {/* X投稿文を再生成ボタン */}
                  {xPost && ['ready', 'published', 'posted'].includes(article.status) && (
                    <button
                      onClick={() => processArticle(article.id, inlineNotes[article.id])}
                      disabled={loading === article.id}
                      className="px-3 py-1.5 text-sm bg-indigo-800 hover:bg-indigo-700 disabled:bg-gray-600 text-white rounded transition-colors flex items-center gap-2"
                    >
                      {isProcessing && (
                        <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      )}
                      {isProcessing ? processStatus?.message : 'X投稿文を再生成'}
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

                  {canPostToX && (
                    <button
                      onClick={() => postToX(article)}
                      disabled={loading === article.id}
                      className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded transition-colors"
                    >
                      {loading === article.id && action === 'posting' ? '投稿中...' : 'Xに投稿'}
                    </button>
                  )}

                  {isPosted && xPost && (
                    <button
                      onClick={() => postToX(article, true)}
                      disabled={loading === article.id}
                      className="px-3 py-1.5 text-sm bg-blue-800 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded transition-colors"
                    >
                      {loading === article.id && action === 'posting' ? '投稿中...' : 'Xに再投稿'}
                    </button>
                  )}

                  {xPost && (
                    <button
                      onClick={() => startEditPost(article, xPost)}
                      className="px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                    >
                      X編集
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
                要約（日本語）
              </label>
              <textarea
                value={editForm.summary_ja}
                onChange={(e) => setEditForm({ ...editForm, summary_ja: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
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

            <div className="flex gap-3">
              <button
                onClick={saveArticle}
                disabled={loading === editingArticle.id}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {loading === editingArticle.id && action === 'saving' ? '保存中...' : '保存'}
              </button>
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

      {/* 投稿文編集モーダル */}
      {editingPost && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold text-white mb-4">X投稿を編集</h3>
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              className="w-full h-40 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-400 mt-2">{postContent.length} 文字</p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={savePost}
                disabled={loading === editingPost.article.id}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {loading === editingPost.article.id && action === 'saving' ? '保存中...' : '保存'}
              </button>
              <button
                onClick={() => setEditingPost(null)}
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
