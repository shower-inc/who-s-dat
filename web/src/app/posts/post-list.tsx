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
  scheduled: 'bg-cyan-900 text-cyan-300',
  posted: 'bg-green-900 text-green-300',
  failed: 'bg-red-900 text-red-300',
  cancelled: 'bg-gray-700 text-gray-400',
}

export function PostList({ posts }: { posts: PostWithArticle[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const schedulePost = async (id: string) => {
    setLoading(id)
    try {
      const res = await fetch(`/api/posts/${id}/schedule`, { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        alert(`Error: ${data.error}`)
      } else {
        alert(`Scheduled for ${new Date(data.scheduled_at).toLocaleString()}`)
      }
    } catch {
      alert('Scheduling failed')
    }
    router.refresh()
    setLoading(null)
  }

  if (posts.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-400">No posts yet. Generate some from articles!</p>
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
                  <span>Scheduled: {new Date(post.scheduled_at).toLocaleString()}</span>
                )}
                {post.posted_at && (
                  <span>Posted: {new Date(post.posted_at).toLocaleString()}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 text-xs rounded ${statusColors[post.status]}`}>
                {post.status}
              </span>
            </div>
          </div>

          {post.status === 'draft' && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => schedulePost(post.id)}
                disabled={loading === post.id}
                className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded transition-colors"
              >
                {loading === post.id ? 'Scheduling...' : 'Schedule to Buffer'}
              </button>
              {post.articles?.link && (
                <a
                  href={post.articles.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                >
                  View Original
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
