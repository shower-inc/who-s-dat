'use client'

import { Article } from '@/types/database'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type ArticleWithSource = Article & {
  sources: { name: string; category: string } | null
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-900 text-yellow-300',
  translating: 'bg-blue-900 text-blue-300',
  translated: 'bg-purple-900 text-purple-300',
  generating: 'bg-indigo-900 text-indigo-300',
  ready: 'bg-green-900 text-green-300',
  scheduled: 'bg-cyan-900 text-cyan-300',
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
  scheduled: '予約済',
  posted: '投稿済',
  skipped: 'スキップ',
  error: 'エラー',
}

export function ArticleList({ articles }: { articles: ArticleWithSource[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const translateArticle = async (id: string) => {
    setLoading(id)
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
  }

  const generatePost = async (id: string) => {
    setLoading(id)
    try {
      const res = await fetch(`/api/articles/${id}/generate`, { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        alert(`Error: ${data.error}`)
      } else {
        alert('投稿文を生成しました！')
      }
    } catch {
      alert('投稿文の生成に失敗しました')
    }
    router.refresh()
    setLoading(null)
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
      {articles.map((article) => (
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
                  <p className="text-sm text-gray-400 mt-2">
                    {article.sources?.name} • {article.sources?.category}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs rounded whitespace-nowrap ${statusColors[article.status] || 'bg-gray-700 text-gray-300'}`}>
                  {statusLabels[article.status] || article.status}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-4">
                {article.status === 'pending' && (
                  <button
                    onClick={() => translateArticle(article.id)}
                    disabled={loading === article.id}
                    className="px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded transition-colors"
                  >
                    {loading === article.id ? '翻訳中...' : '翻訳する'}
                  </button>
                )}
                {article.status === 'translated' && (
                  <button
                    onClick={() => generatePost(article.id)}
                    disabled={loading === article.id}
                    className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded transition-colors"
                  >
                    {loading === article.id ? '生成中...' : '投稿文を生成'}
                  </button>
                )}
                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                >
                  元記事を見る
                </a>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
