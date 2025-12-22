'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

type Category = {
  id: string
  name: string
}

type ScrapedArticle = {
  title: string
  author: string | null
  publishedAt: string | null
  thumbnailUrl: string | null
  siteName: string
  excerpt: string
  url: string
}

type TrackMetadata = {
  platform: 'youtube' | 'spotify'
  trackName: string
  artistNames: string
  artistInfo?: string
  albumName?: string
  releaseDate?: string
  description?: string
  thumbnailUrl?: string
  externalUrl: string
}

type TabType = 'track' | 'article' | 'original'

export default function AddPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('track')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [url, setUrl] = useState('')
  const [scraped, setScraped] = useState<ScrapedArticle | null>(null)
  const [trackMetadata, setTrackMetadata] = useState<TrackMetadata | null>(null)
  const [editorNote, setEditorNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  // オリジナル記事用
  const [originalTitle, setOriginalTitle] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [originalThumbnail, setOriginalThumbnail] = useState('')
  const [contentType, setContentType] = useState<string>('feature')

  useEffect(() => {
    fetch('/api/admin/categories')
      .then((res) => res.json())
      .then((data) => {
        setCategories(data.categories || [])
        if (data.categories?.length > 0) {
          setSelectedCategoryId(data.categories[0].id)
        }
      })
  }, [])

  // タブ切り替え時にリセット
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    setUrl('')
    setScraped(null)
    setTrackMetadata(null)
    setEditorNote('')
    setError(null)
    setOriginalTitle('')
    setOriginalContent('')
    setOriginalThumbnail('')
    setContentType('feature')
  }

  // URLから記事をスクレイピング（プレビュー）
  const fetchPreview = async () => {
    if (!url) return
    setFetching(true)
    setError(null)
    setScraped(null)

    try {
      const res = await fetch(`/api/admin/articles/scrape?url=${encodeURIComponent(url)}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to fetch article')
        return
      }

      setScraped(data.scraped)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch article')
    } finally {
      setFetching(false)
    }
  }

  // URLからトラックメタデータを取得
  const fetchTrackPreview = async () => {
    if (!url) return
    setFetching(true)
    setError(null)
    setTrackMetadata(null)

    try {
      const res = await fetch(`/api/admin/articles/track?url=${encodeURIComponent(url)}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to fetch track metadata')
        return
      }

      setTrackMetadata(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch track')
    } finally {
      setFetching(false)
    }
  }

  // トラック記事を保存
  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url || !trackMetadata) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/articles/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          editorNote: editorNote || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 409) {
          alert('この曲の記事は既に登録されています')
          router.push('/admin/articles')
        } else {
          setError(data.error || 'Failed to save track article')
        }
        setLoading(false)
        return
      }

      router.push('/admin/articles')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save track article')
      setLoading(false)
    }
  }

  // 記事を保存（翻訳処理込み）
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/articles/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          category_id: selectedCategoryId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 409) {
          alert('この記事は既に登録されています')
          router.push('/admin/articles')
        } else {
          setError(data.error || 'Failed to save article')
        }
        setLoading(false)
        return
      }

      router.push('/admin/articles')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save article')
      setLoading(false)
    }
  }

  // オリジナル記事を保存
  const handleOriginalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!originalTitle || !originalContent) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/articles/original', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: originalTitle,
          content: originalContent,
          thumbnailUrl: originalThumbnail || undefined,
          categoryId: selectedCategoryId || undefined,
          contentType,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to save article')
        setLoading(false)
        return
      }

      router.push('/admin/articles')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save article')
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold text-white mb-4">記事追加</h1>

      {/* タブ切り替え */}
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => handleTabChange('track')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'track'
              ? 'bg-green-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          曲・MV
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('article')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'article'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          外部記事
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('original')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'original'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          オリジナル記事
        </button>
      </div>

      {/* 曲・MVタブ */}
      {activeTab === 'track' && (
        <>
          <p className="text-gray-400 mb-8">
            YouTubeまたはSpotifyのURLを入力すると、メタデータを取得して紹介記事を作成します。
            <br />
            <span className="text-sm text-gray-500">※ アーティスト情報も自動取得して記事に反映します</span>
          </p>

          <form onSubmit={handleTrackSubmit} className="max-w-3xl space-y-6">
            {/* URL入力 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                曲・動画URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="https://www.youtube.com/watch?v=... or https://open.spotify.com/track/..."
                />
                <button
                  type="button"
                  onClick={fetchTrackPreview}
                  disabled={fetching || !url}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white rounded-lg transition-colors whitespace-nowrap"
                >
                  {fetching ? '取得中...' : 'メタデータ取得'}
                </button>
              </div>
            </div>

            {/* エラー表示 */}
            {error && (
              <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
                {error}
              </div>
            )}

            {/* トラックプレビュー */}
            {trackMetadata && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    trackMetadata.platform === 'youtube'
                      ? 'bg-red-900/50 text-red-300'
                      : 'bg-green-900/50 text-green-300'
                  }`}>
                    {trackMetadata.platform === 'youtube' ? 'YouTube' : 'Spotify'}
                  </span>
                  <h2 className="text-lg font-medium text-white">プレビュー</h2>
                </div>

                {/* サムネイル */}
                {trackMetadata.thumbnailUrl && (
                  <img
                    src={trackMetadata.thumbnailUrl}
                    alt=""
                    className="w-full max-w-md rounded-lg"
                  />
                )}

                {/* メタ情報 */}
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">{trackMetadata.trackName}</h3>
                  <p className="text-gray-300">{trackMetadata.artistNames}</p>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
                    {trackMetadata.albumName && (
                      <span className="px-2 py-0.5 bg-gray-700 rounded">
                        {trackMetadata.albumName}
                      </span>
                    )}
                    {trackMetadata.releaseDate && (
                      <span>
                        {new Date(trackMetadata.releaseDate).toLocaleDateString('ja-JP')}
                      </span>
                    )}
                  </div>
                </div>

                {/* アーティスト情報 */}
                {trackMetadata.artistInfo && (
                  <div className="p-4 bg-gray-900 rounded-lg border-l-4 border-green-600">
                    <p className="text-sm text-gray-400 mb-1">アーティスト情報</p>
                    <p className="text-gray-300">{trackMetadata.artistInfo}</p>
                  </div>
                )}

                {/* 編集者コメント */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    編集者コメント（任意）
                  </label>
                  <textarea
                    value={editorNote}
                    onChange={(e) => setEditorNote(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="例: ジャンルはUK Garage。デビューシングル。"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ジャンルやコンテキストを追加すると、より正確な記事が生成されます
                  </p>
                </div>

                {/* 処理内容説明 */}
                <div className="p-4 bg-gray-900/50 rounded-lg">
                  <p className="text-sm text-gray-400">「記事を保存」を押すと以下の処理を行います:</p>
                  <ul className="text-sm text-gray-500 mt-2 space-y-1">
                    <li>• タイトルを日本語に翻訳</li>
                    <li>• 紹介記事を生成（WHO&apos;S DATスタイル）</li>
                    <li>• X投稿文を生成</li>
                  </ul>
                </div>
              </div>
            )}

            {/* ボタン */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading || !trackMetadata}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              >
                {loading ? '処理中...' : '記事を保存'}
              </button>
            </div>
          </form>
        </>
      )}

      {/* 外部記事タブ */}
      {activeTab === 'article' && (
        <>
          <p className="text-gray-400 mb-8">
            外部メディアの記事URLを入力すると、自動で内容を取得・翻訳して紹介記事を作成します。
            <br />
            <span className="text-sm text-gray-500">※ 引用の範囲で冒頭を抜粋し、元記事へのリンクを掲載します</span>
          </p>

          <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
            {/* URL入力 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                記事URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://vipermag.com/2025/10/20/gwamz-interview/"
                />
                <button
                  type="button"
                  onClick={fetchPreview}
                  disabled={fetching || !url}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg transition-colors whitespace-nowrap"
                >
                  {fetching ? '取得中...' : '記事を取得'}
                </button>
              </div>
            </div>

            {/* エラー表示 */}
            {error && (
              <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
                {error}
              </div>
            )}

            {/* プレビュー表示 */}
            {scraped && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-medium text-white">プレビュー</h2>

                {/* サムネイル */}
                {scraped.thumbnailUrl && (
                  <img
                    src={scraped.thumbnailUrl}
                    alt=""
                    className="w-full max-w-md rounded-lg"
                  />
                )}

                {/* メタ情報 */}
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">{scraped.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded">
                      {scraped.siteName}
                    </span>
                    {scraped.author && <span>• {scraped.author}</span>}
                    {scraped.publishedAt && (
                      <span>• {new Date(scraped.publishedAt).toLocaleDateString('ja-JP')}</span>
                    )}
                  </div>
                </div>

                {/* 抜粋 */}
                <div className="p-4 bg-gray-900 rounded-lg border-l-4 border-gray-600">
                  <p className="text-sm text-gray-400 mb-2">引用範囲（この部分が翻訳されます）</p>
                  <p className="text-gray-300 whitespace-pre-wrap">{scraped.excerpt}</p>
                </div>

                {/* カテゴリ選択 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    カテゴリ
                  </label>
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">カテゴリなし</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 処理内容説明 */}
                <div className="p-4 bg-gray-900/50 rounded-lg">
                  <p className="text-sm text-gray-400">「記事を保存」を押すと以下の処理を行います:</p>
                  <ul className="text-sm text-gray-500 mt-2 space-y-1">
                    <li>• タイトルを日本語に翻訳</li>
                    <li>• 抜粋部分を日本語に翻訳</li>
                    <li>• 紹介文を生成（WHO&apos;S DATスタイル）</li>
                    <li>• X投稿文を生成</li>
                    <li>• コンテンツ種別を自動判定</li>
                  </ul>
                </div>
              </div>
            )}

            {/* ボタン */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading || !scraped}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              >
                {loading ? '処理中...' : '記事を保存（翻訳処理込み）'}
              </button>
            </div>
          </form>
        </>
      )}

      {/* オリジナル記事タブ */}
      {activeTab === 'original' && (
        <>
          <p className="text-gray-400 mb-8">
            自分で記事を書いて投稿できます。HTMLタグが使えます。
          </p>

          <form onSubmit={handleOriginalSubmit} className="max-w-3xl space-y-6">
            {/* タイトル */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                タイトル
              </label>
              <input
                type="text"
                required
                value={originalTitle}
                onChange={(e) => setOriginalTitle(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="記事のタイトル"
              />
            </div>

            {/* サムネイルURL */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                サムネイル画像URL（任意）
              </label>
              <input
                type="url"
                value={originalThumbnail}
                onChange={(e) => setOriginalThumbnail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="https://example.com/image.jpg"
              />
              {originalThumbnail && (
                <img
                  src={originalThumbnail}
                  alt="プレビュー"
                  className="mt-2 max-w-xs rounded-lg"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}
            </div>

            {/* コンテンツ種別 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                コンテンツ種別
              </label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="feature">特集・コラム</option>
                <option value="news">ニュース</option>
                <option value="interview">インタビュー</option>
                <option value="tune">楽曲紹介</option>
                <option value="mv">MV</option>
                <option value="live">ライブ</option>
              </select>
            </div>

            {/* カテゴリ */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                カテゴリ
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">カテゴリなし</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 本文 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                本文（HTML可）
              </label>
              <textarea
                required
                value={originalContent}
                onChange={(e) => setOriginalContent(e.target.value)}
                rows={15}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                placeholder="<p>記事の本文をここに書きます...</p>"
              />
              <p className="text-xs text-gray-500 mt-1">
                使えるタグ: &lt;p&gt;, &lt;strong&gt;, &lt;a href=&quot;...&quot;&gt;, &lt;blockquote&gt; など
              </p>
            </div>

            {/* エラー表示 */}
            {error && (
              <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
                {error}
              </div>
            )}

            {/* ボタン */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading || !originalTitle || !originalContent}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              >
                {loading ? '保存中...' : '記事を保存'}
              </button>
            </div>
          </form>
        </>
      )}
    </DashboardLayout>
  )
}
