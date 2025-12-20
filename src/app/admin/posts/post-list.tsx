'use client'

import { Post } from '@/types/database'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type PostWithArticle = Post & {
  articles: {
    title_ja: string | null
    title_original: string
    link: string
    sources: { name: string } | null
  } | null
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-700 text-gray-300',
  ready: 'bg-yellow-900 text-yellow-300',
  scheduled: 'bg-cyan-900 text-cyan-300',
  posted: 'bg-green-900 text-green-300',
  failed: 'bg-red-900 text-red-300',
  cancelled: 'bg-gray-700 text-gray-400',
}

const statusLabels: Record<string, string> = {
  draft: '下書き',
  ready: '承認済',
  scheduled: '予約済',
  posted: '投稿済',
  failed: '失敗',
  cancelled: 'キャンセル',
}

export function PostList({ posts }: { posts: PostWithArticle[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [action, setAction] = useState<string | null>(null)

  const postToX = async (id: string) => {
    setLoading(id)
    setAction('posting')
    try {
      const res = await fetch(`/api/posts/${id}/post`, { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        alert(`Error: ${data.error}`)
      } else {
        alert(`Xに投稿しました！ Tweet ID: ${data.tweet_id}`)
      }
    } catch {
      alert('投稿に失敗しました')
    }
    router.refresh()
    setLoading(null)
    setAction(null)
  }

  const markReady = async (id: string) => {
    setLoading(id)
    setAction('ready')
    try {
      const res = await fetch(`/api/posts/${id}/ready`, { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        alert(`Error: ${data.error}`)
      }
    } catch {
      alert('承認処理に失敗しました')
    }
    router.refresh()
    setLoading(null)
    setAction(null)
  }

  if (posts.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-400">まだ投稿がありません。記事から投稿文を生成してください！</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <div
          key={post.id}
          className="bg-gray-900 border border-gray-800 rounded-xl p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-white whitespace-pre-wrap">{post.content}</p>
              <div className="flex items-center gap-4 mt-4 text-sm text-gray-400">
                <span>{post.articles?.sources?.name}</span>
                <span>{post.platform.toUpperCase()}</span>
                {post.scheduled_at && (
                  <span>予約: {new Date(post.scheduled_at).toLocaleString('ja-JP')}</span>
                )}
                {post.posted_at && (
                  <span>投稿: {new Date(post.posted_at).toLocaleString('ja-JP')}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 text-xs rounded ${statusColors[post.status]}`}>
                {statusLabels[post.status] || post.status}
              </span>
            </div>
          </div>

          {(post.status === 'draft' || post.status === 'ready') && (
            <div className="mt-4 flex gap-2">
              {post.status === 'draft' && (
                <button
                  onClick={() => markReady(post.id)}
                  disabled={loading === post.id}
                  className="px-3 py-1.5 text-sm bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white rounded transition-colors"
                >
                  {loading === post.id && action === 'ready' ? '承認中...' : '承認する'}
                </button>
              )}
              <button
                onClick={() => postToX(post.id)}
                disabled={loading === post.id}
                className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded transition-colors"
              >
                {loading === post.id && action === 'posting' ? '投稿中...' : 'Xに投稿'}
              </button>
              {post.articles?.link && (
                <a
                  href={post.articles.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                >
                  元記事を見る
                </a>
              )}
            </div>
          )}

          {post.error_message && (
            <p className="mt-2 text-sm text-red-400">{post.error_message}</p>
          )}
        </div>
      ))}
    </div>
  )
}
