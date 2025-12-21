'use client'

import { Article, Post } from '@/types/database'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type ArticleWithSourceAndPosts = Article & {
  sources: { name: string; category: string } | null
  posts: Post[]
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

export function ArticleList({ articles }: { articles: ArticleWithSourceAndPosts[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [action, setAction] = useState<string | null>(null)

  // 記事編集モーダル
  const [editingArticle, setEditingArticle] = useState<ArticleWithSourceAndPosts | null>(null)
  const [editForm, setEditForm] = useState({ title_ja: '', summary_ja: '' })

  // 投稿文編集モーダル
  const [editingPost, setEditingPost] = useState<{ article: ArticleWithSourceAndPosts; post: Post } | null>(null)
  const [postContent, setPostContent] = useState('')

  const startEditArticle = (article: ArticleWithSourceAndPosts) => {
    setEditingArticle(article)
    setEditForm({
      title_ja: article.title_ja || '',
      summary_ja: article.summary_ja || '',
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

  const translateArticle = async (id: string) => {
    setLoading(id)
    setAction('translating')
    try {
      const res = await fetch(`/api/articles/${id}/translate`, { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        alert(`Error: ${data.error}`)
      }
    } catch {
      alert('翻訳に失敗しました')
    }
    router.refresh()
    setLoading(null)
    setAction(null)
  }

  const generatePost = async (id: string) => {
    setLoading(id)
    setAction('generating')
    try {
      const res = await fetch(`/api/articles/${id}/generate`, { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        alert(`Error: ${data.error}`)
      }
    } catch {
      alert('投稿文の生成に失敗しました')
    }
    router.refresh()
    setLoading(null)
    setAction(null)
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

  const postToX = async (article: ArticleWithSourceAndPosts) => {
    const post = article.posts.find(p => p.platform === 'x' && p.status !== 'posted')
    if (!post) return

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

  // 記事の投稿文を取得（X用で未投稿のもの優先、なければ投稿済み）
  const getXPost = (article: ArticleWithSourceAndPosts): Post | null => {
    const xPosts = article.posts.filter(p => p.platform === 'x')
    return xPosts.find(p => p.status !== 'posted') || xPosts.find(p => p.status === 'posted') || null
  }

  if (articles.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-400">まだ記事がありません。先にソースから取得してください！</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {articles.map((article) => {
        const xPost = getXPost(article)
        const canTranslate = article.status === 'pending'
        const canGenerate = article.status === 'translated' && !xPost
        const canPublish = ['translated', 'ready'].includes(article.status) && article.status !== 'published' && article.status !== 'posted'
        const canUnpublish = ['published', 'posted'].includes(article.status)
        const canPostToX = xPost && xPost.status !== 'posted'
        const canSkip = ['pending', 'translated', 'ready'].includes(article.status)
        const isPosted = article.status === 'posted' || xPost?.status === 'posted'

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
                  </div>
                  <span className={`px-2 py-1 text-xs rounded whitespace-nowrap ${statusColors[article.status] || 'bg-gray-700 text-gray-300'}`}>
                    {statusLabels[article.status] || article.status}
                  </span>
                </div>

                {/* X投稿文表示 */}
                {xPost && (
                  <div className="mt-4 p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400">X投稿文</span>
                      {xPost.status === 'posted' && (
                        <span className="text-xs text-green-400">投稿済み</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-200 whitespace-pre-wrap">{xPost.content}</p>
                    <p className="text-xs text-gray-500 mt-2">{xPost.content.length} 文字</p>
                  </div>
                )}

                {/* アクションボタン */}
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  {canTranslate && (
                    <button
                      onClick={() => translateArticle(article.id)}
                      disabled={loading === article.id}
                      className="px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded transition-colors"
                    >
                      {loading === article.id && action === 'translating' ? '翻訳中...' : '翻訳する'}
                    </button>
                  )}

                  {canGenerate && (
                    <button
                      onClick={() => generatePost(article.id)}
                      disabled={loading === article.id}
                      className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white rounded transition-colors"
                    >
                      {loading === article.id && action === 'generating' ? '生成中...' : '投稿文を生成'}
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

                  {xPost && !isPosted && (
                    <button
                      onClick={() => startEditPost(article, xPost)}
                      className="px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                    >
                      投稿文を編集
                    </button>
                  )}

                  {article.title_ja && (
                    <button
                      onClick={() => startEditArticle(article)}
                      className="px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                    >
                      翻訳を編集
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

                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                  >
                    元記事
                  </a>
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
            <h3 className="text-xl font-bold text-white mb-4">翻訳を編集</h3>

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
            <h3 className="text-xl font-bold text-white mb-4">X投稿文を編集</h3>
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
    </div>
  )
}
