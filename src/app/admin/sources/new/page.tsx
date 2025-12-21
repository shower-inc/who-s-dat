'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

type Category = {
  id: string
  name: string
  slug: string
  color: string
}

// Recommended YouTube channels for UK/Afro-diaspora music
const recommendedChannels = [
  // Media/Platforms
  { handle: 'GRMDaily', name: 'GRM Daily', category: 'uk_afrobeats', type: 'media' },
  { handle: 'MixtapeMadness', name: 'Mixtape Madness', category: 'uk_afrobeats', type: 'media' },
  { handle: 'LinkUpTV', name: 'Link Up TV', category: 'uk_afrobeats', type: 'media' },
  { handle: 'SB.TV', name: 'SB.TV', category: 'uk_afrobeats', type: 'media' },
  { handle: 'JDZmedia', name: 'JDZ Media', category: 'uk_afrobeats', type: 'media' },
  { handle: 'P110Media', name: 'P110', category: 'uk_afrobeats', type: 'media' },
  { handle: 'TheColorsShow', name: 'COLORS', category: 'uk_afrobeats', type: 'media' },
  // Artists
  { handle: 'Gwamz', name: 'Gwamz', category: 'uk_afrobeats', type: 'artist' },
  { handle: 'SoloB', name: 'Solo B', category: 'uk_afrobeats', type: 'artist' },
  { handle: 'CentralCee', name: 'Central Cee', category: 'uk_afrobeats', type: 'artist' },
  { handle: 'Knucks', name: 'Knucks', category: 'uk_afrobeats', type: 'artist' },
  { handle: 'DaveChannel', name: 'Dave', category: 'uk_afrobeats', type: 'artist' },
  { handle: 'LittleSimz', name: 'Little Simz', category: 'uk_afrobeats', type: 'artist' },
  // Amapiano/South Africa
  { handle: 'KabeloMotha', name: 'Kabza De Small', category: 'amapiano', type: 'artist' },
  { handle: 'MajorLeagueDjz', name: 'Major League DJz', category: 'amapiano', type: 'artist' },
]

export default function NewSourcePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [channelInfo, setChannelInfo] = useState<{
    title: string
    thumbnailUrl: string | null
    subscriberCount: number | null
  } | null>(null)
  const [form, setForm] = useState({
    name: '',
    type: 'youtube' as 'youtube' | 'rss',
    url: '',
    category_id: '',
    thumbnail_url: null as string | null,
  })
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/admin/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(`Error: ${data.error}`)
        setLoading(false)
        return
      }

      router.push('/admin/sources')
    } catch (error) {
      alert(`Error: ${error}`)
      setLoading(false)
    }
  }

  // Resolve YouTube handle to channel info
  const resolveHandle = async (handle: string) => {
    setResolving(true)
    setChannelInfo(null)

    try {
      const res = await fetch(`/api/youtube/channel?handle=${encodeURIComponent(handle)}`)
      const data = await res.json()

      if (res.ok && data.channelId) {
        setChannelInfo({
          title: data.title,
          thumbnailUrl: data.thumbnailUrl,
          subscriberCount: data.subscriberCount,
        })
        setForm(prev => ({
          ...prev,
          name: prev.name || data.title,
          url: data.rssUrl,
          thumbnail_url: data.thumbnailUrl,
        }))
      }
    } catch (error) {
      console.error('Failed to resolve handle:', error)
    } finally {
      setResolving(false)
    }
  }

  // YouTube URLからチャンネルIDを抽出してRSSフィードURLに変換
  const handleUrlChange = async (url: string) => {
    let finalUrl = url
    setChannelInfo(null)

    // YouTube channel URL パターン
    if (url.includes('youtube.com/channel/')) {
      const channelId = url.match(/channel\/([^\/\?]+)/)?.[1]
      if (channelId) {
        finalUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
      }
    }
    // YouTube @handle パターン - APIで解決
    else if (url.includes('youtube.com/@')) {
      const handle = url.match(/@([^\/\?]+)/)?.[1]
      if (handle) {
        setForm({ ...form, url })
        await resolveHandle(handle)
        return
      }
    }

    setForm({ ...form, url: finalUrl })
  }

  // Add preset channel
  const addPresetChannel = async (preset: typeof recommendedChannels[0]) => {
    // プリセットのカテゴリslugからカテゴリIDを探す
    const cat = categories.find((c) => c.slug === preset.category)
    setForm((prev) => ({
      ...prev,
      name: preset.name,
      category_id: cat?.id || prev.category_id,
      type: 'youtube',
    }))
    await resolveHandle(preset.handle)
  }

  // 新規カテゴリ追加
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCategoryName }),
    })
    if (res.ok) {
      const data = await res.json()
      setCategories((prev) => [...prev, data.category])
      setForm((prev) => ({ ...prev, category_id: data.category.id }))
      setNewCategoryName('')
      setShowNewCategory(false)
    }
  }

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold text-white mb-8">ソース追加</h1>

      {/* Recommended Channels */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-white mb-4">おすすめチャンネル</h2>

        <div className="mb-4">
          <h3 className="text-sm text-gray-400 mb-2">メディア / プラットフォーム</h3>
          <div className="flex flex-wrap gap-2">
            {recommendedChannels.filter(c => c.type === 'media').map((channel) => (
              <button
                key={channel.handle}
                type="button"
                onClick={() => addPresetChannel(channel)}
                disabled={resolving}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 text-sm text-white rounded-lg transition-colors"
              >
                {channel.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm text-gray-400 mb-2">アーティスト</h3>
          <div className="flex flex-wrap gap-2">
            {recommendedChannels.filter(c => c.type === 'artist').map((channel) => (
              <button
                key={channel.handle}
                type="button"
                onClick={() => addPresetChannel(channel)}
                disabled={resolving}
                className="px-3 py-1.5 bg-purple-900/50 hover:bg-purple-800/50 disabled:bg-gray-900 text-sm text-white rounded-lg transition-colors"
              >
                {channel.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Channel Preview */}
      {channelInfo && (
        <div className="mb-6 p-4 bg-gray-800 rounded-lg flex items-center gap-4">
          {channelInfo.thumbnailUrl && (
            <img
              src={channelInfo.thumbnailUrl}
              alt=""
              className="w-12 h-12 rounded-full"
            />
          )}
          <div>
            <p className="text-white font-medium">{channelInfo.title}</p>
            {channelInfo.subscriberCount && (
              <p className="text-sm text-gray-400">
                {channelInfo.subscriberCount.toLocaleString()} subscribers
              </p>
            )}
          </div>
        </div>
      )}

      {resolving && (
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <p className="text-gray-400">チャンネル情報を取得中...</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            ソース名
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
            タイプ
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
              YouTubeチャンネルURL（youtube.com/@handle）を貼り付けると自動変換されます
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            カテゴリ
          </label>
          <div className="flex gap-2">
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowNewCategory(true)}
              className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              +
            </button>
          </div>
          {showNewCategory && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="新規カテゴリ名"
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
              >
                追加
              </button>
              <button
                type="button"
                onClick={() => setShowNewCategory(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded"
              >
                キャンセル
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? '追加中...' : 'ソースを追加'}
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
