'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const categories = [
  'uk_afrobeats',
  'amapiano',
  'kuduro',
  'afro_portuguese',
]

export default function NewSourcePage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    type: 'youtube' as 'youtube' | 'rss',
    url: '',
    category: 'uk_afrobeats',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.from('sources').insert([form])

    if (error) {
      alert(`Error: ${error.message}`)
      setLoading(false)
      return
    }

    router.push('/admin/sources')
  }

  // YouTube URLからチャンネルIDを抽出してRSSフィードURLに変換
  const handleUrlChange = (url: string) => {
    let finalUrl = url

    // YouTube channel URL パターン
    if (url.includes('youtube.com/channel/')) {
      const channelId = url.match(/channel\/([^\/\?]+)/)?.[1]
      if (channelId) {
        finalUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
      }
    }
    // YouTube @handle パターン（手動でチャンネルID入力が必要）
    else if (url.includes('youtube.com/@')) {
      // @handleの場合はチャンネルIDが必要なので、そのまま保持
      finalUrl = url
    }

    setForm({ ...form, url: finalUrl })
  }

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold text-white mb-8">Add Source</h1>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Name
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="GRM Daily"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Type
          </label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as 'youtube' | 'rss' })}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="youtube">YouTube</option>
            <option value="rss">RSS</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            URL
          </label>
          <input
            type="url"
            required
            value={form.url}
            onChange={(e) => handleUrlChange(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={
              form.type === 'youtube'
                ? 'https://www.youtube.com/feeds/videos.xml?channel_id=...'
                : 'https://example.com/rss'
            }
          />
          {form.type === 'youtube' && (
            <p className="text-xs text-gray-500 mt-1">
              Tip: Use YouTube RSS feed URL format
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Category
          </label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? 'Adding...' : 'Add Source'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </DashboardLayout>
  )
}
