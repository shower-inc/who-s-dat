'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

type Category = {
  id: string
  name: string
}

export default function NewArticlePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState({
    url: '',
    title: '',
    description: '',
    thumbnail_url: '',
    author: '',
    category_id: '',
  })

  useEffect(() => {
    fetch('/api/admin/categories')
      .then((res) => res.json())
      .then((data) => {
        setCategories(data.categories || [])
        if (data.categories?.length > 0) {
          setForm((prev) => ({ ...prev, category_id: data.categories[0].id }))
        }
      })
  }, [])

  // URLからメタデータを取得
  const fetchMetadata = async () => {
    if (!form.url) return
    setFetching(true)
    try {
      const res = await fetch(`/api/admin/articles/manual?url=${encodeURIComponent(form.url)}`)
      const data = await res.json()
      if (res.ok) {
        setForm((prev) => ({
          ...prev,
          title: data.title || '',
          description: data.description || '',
          thumbnail_url: data.thumbnail || '',
          author: data.author || '',
        }))
      }
    } catch (error) {
      console.error('Failed to fetch metadata:', error)
    } finally {
      setFetching(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/admin/articles/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        if (data.article_id) {
          // 重複の場合は既存記事に移動
          router.push(`/admin/articles`)
          alert('この記事は既に存在します')
        } else {
          alert(`Error: ${data.error}`)
        }
        setLoading(false)
        return
      }

      router.push('/admin/articles')
    } catch (error) {
      alert(`Error: ${error}`)
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold text-white mb-8">記事を手動追加</h1>
      <p className="text-gray-400 mb-6">
        ソース以外のURLから直接記事を追加できます。追加後は通常の翻訳・投稿フローで処理されます。
      </p>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* URL入力 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            記事URL
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              required
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/article"
            />
            <button
              type="button"
              onClick={fetchMetadata}
              disabled={fetching || !form.url}
              className="px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white rounded-lg transition-colors"
            >
              {fetching ? '取得中...' : '情報取得'}
            </button>
          </div>
        </div>

        {/* サムネイルプレビュー */}
        {form.thumbnail_url && (
          <div className="p-4 bg-gray-800 rounded-lg">
            <img
              src={form.thumbnail_url}
              alt="Preview"
              className="w-full max-w-md rounded"
            />
          </div>
        )}

        {/* タイトル */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            タイトル（原文）
          </label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 説明 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            説明・概要（任意）
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 著者 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            著者（任意）
          </label>
          <input
            type="text"
            value={form.author}
            onChange={(e) => setForm({ ...form, author: e.target.value })}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* カテゴリ */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            カテゴリ
          </label>
          <select
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">カテゴリなし</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* サムネイルURL */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            サムネイルURL（任意）
          </label>
          <input
            type="url"
            value={form.thumbnail_url}
            onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* ボタン */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? '追加中...' : '記事を追加'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            キャンセル
          </button>
        </div>
      </form>
    </DashboardLayout>
  )
}
