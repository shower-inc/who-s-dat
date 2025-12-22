'use client'

import { Source } from '@/types/database'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type FetchStatus = {
  id: string
  status: 'idle' | 'resolving' | 'fetching' | 'saving' | 'done' | 'error'
  message?: string
}

type FilterType = 'all' | 'rss' | 'youtube'

type PreviewArticle = {
  external_id: string
  title_original: string
  summary_original: string | null
  link: string
  thumbnail_url: string | null
  author: string | null
  published_at: string | null
  view_count: number | null
  like_count: number | null
  isExisting: boolean
}

type PreviewData = {
  source: {
    id: string
    name: string
    type: string
    category: string
  }
  articles: PreviewArticle[]
  total: number
  newCount: number
}

type Props = {
  sources: Source[]
  articleCounts: Record<string, number>
}

export function SourceList({ sources, articleCounts }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [fetchStatus, setFetchStatus] = useState<FetchStatus | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)

  const filteredSources = sources.filter(source => {
    if (filter === 'all') return true
    return source.type === filter
  })

  const toggleEnabled = async (source: Source) => {
    setLoading(source.id)
    await fetch(`/api/admin/sources/${source.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !source.enabled }),
    })
    router.refresh()
    setLoading(null)
  }

  const deleteSource = async (source: Source) => {
    if (!confirm(`「${source.name}」を削除しますか？`)) return
    setLoading(source.id)
    try {
      const res = await fetch(`/api/admin/sources/${source.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        alert(`削除エラー: ${data.error}`)
      }
    } catch (err) {
      alert(`削除エラー: ${err}`)
    }
    router.refresh()
    setLoading(null)
  }

  // プレビュー取得
  const fetchPreview = async (source: Source) => {
    setLoading(source.id)
    setFetchStatus({ id: source.id, status: 'fetching', message: 'フィードを取得中...' })

    try {
      const res = await fetch(`/api/sources/${source.id}/preview`, { method: 'POST' })
      const data = await res.json()

      if (data.error) {
        setFetchStatus({ id: source.id, status: 'error', message: data.error })
        setTimeout(() => setFetchStatus(null), 5000)
      } else {
        setFetchStatus(null)
        setPreview(data)
        // 新規記事だけを選択状態にする
        const newArticleIds = data.articles
          .filter((a: PreviewArticle) => !a.isExisting)
          .map((a: PreviewArticle) => a.external_id)
        setSelectedArticles(new Set(newArticleIds))
      }
    } catch {
      setFetchStatus({ id: source.id, status: 'error', message: '取得に失敗しました' })
      setTimeout(() => setFetchStatus(null), 5000)
    }
    setLoading(null)
  }

  // 選択した記事をインポート
  const importSelected = async () => {
    if (!preview || selectedArticles.size === 0) return

    setImporting(true)
    try {
      const articlesToImport = preview.articles.filter(a => selectedArticles.has(a.external_id))
      const res = await fetch(`/api/sources/${preview.source.id}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articles: articlesToImport }),
      })
      const data = await res.json()

      if (data.error) {
        alert(`インポートエラー: ${data.error}`)
      } else {
        alert(`${data.inserted}件の記事を追加しました`)
        setPreview(null)
        setSelectedArticles(new Set())
        router.refresh()
      }
    } catch {
      alert('インポートに失敗しました')
    }
    setImporting(false)
  }

  // 記事選択のトグル
  const toggleArticle = (externalId: string) => {
    const newSelected = new Set(selectedArticles)
    if (newSelected.has(externalId)) {
      newSelected.delete(externalId)
    } else {
      newSelected.add(externalId)
    }
    setSelectedArticles(newSelected)
  }

  // 全選択/全解除
  const toggleAll = () => {
    if (!preview) return
    const newArticles = preview.articles.filter(a => !a.isExisting)
    if (selectedArticles.size === newArticles.length) {
      setSelectedArticles(new Set())
    } else {
      setSelectedArticles(new Set(newArticles.map(a => a.external_id)))
    }
  }

  if (sources.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-400">まだソースがありません。RSSまたはYouTubeソースを追加しましょう！</p>
      </div>
    )
  }

  return (
    <div>
      {/* プレビューモーダル */}
      {preview && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* ヘッダー */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">{preview.source.name}</h2>
                <p className="text-sm text-gray-400">
                  {preview.total}件取得 / {preview.newCount}件が新規
                </p>
              </div>
              <button
                onClick={() => {
                  setPreview(null)
                  setSelectedArticles(new Set())
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* 記事リスト */}
            <div className="flex-1 overflow-y-auto p-4">
              {preview.articles.length === 0 ? (
                <p className="text-gray-500 text-center py-8">記事がありません</p>
              ) : (
                <div className="space-y-3">
                  {preview.articles.map((article) => (
                    <div
                      key={article.external_id}
                      className={`flex gap-4 p-3 rounded-lg border transition-all cursor-pointer ${
                        article.isExisting
                          ? 'bg-gray-800/30 border-gray-800 opacity-50'
                          : selectedArticles.has(article.external_id)
                          ? 'bg-purple-900/20 border-purple-600'
                          : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                      }`}
                      onClick={() => !article.isExisting && toggleArticle(article.external_id)}
                    >
                      {/* サムネイル */}
                      {article.thumbnail_url ? (
                        <img
                          src={article.thumbnail_url}
                          alt=""
                          className="w-24 h-16 object-cover rounded flex-shrink-0"
                        />
                      ) : (
                        <div className="w-24 h-16 bg-gray-700 rounded flex-shrink-0" />
                      )}

                      {/* 情報 */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-white truncate">
                          {article.title_original}
                        </h3>
                        {article.summary_original && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                            {article.summary_original.slice(0, 150)}...
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          {article.published_at && (
                            <span>{new Date(article.published_at).toLocaleDateString('ja-JP')}</span>
                          )}
                          {article.view_count && (
                            <span>{article.view_count.toLocaleString()} views</span>
                          )}
                        </div>
                      </div>

                      {/* 状態表示 */}
                      <div className="flex items-center">
                        {article.isExisting ? (
                          <span className="text-xs text-gray-500 px-2 py-1 bg-gray-800 rounded">
                            追加済み
                          </span>
                        ) : (
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              selectedArticles.has(article.external_id)
                                ? 'bg-purple-600 border-purple-600'
                                : 'border-gray-600'
                            }`}
                          >
                            {selectedArticles.has(article.external_id) && (
                              <span className="text-white text-xs">✓</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* フッター */}
            <div className="p-4 border-t border-gray-800 flex items-center justify-between">
              <button
                onClick={toggleAll}
                className="text-sm text-gray-400 hover:text-white"
              >
                {selectedArticles.size === preview.articles.filter(a => !a.isExisting).length
                  ? '全解除'
                  : '新規を全選択'}
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setPreview(null)
                    setSelectedArticles(new Set())
                  }}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                >
                  キャンセル
                </button>
                <button
                  onClick={importSelected}
                  disabled={selectedArticles.size === 0 || importing}
                  className="px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
                >
                  {importing
                    ? '追加中...'
                    : `${selectedArticles.size}件を記事に追加`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* フィルタータブ */}
      <div className="flex gap-2 mb-6 border-b border-gray-800 pb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-white text-black'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          All Sources
        </button>
        <button
          onClick={() => setFilter('rss')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
            filter === 'rss'
              ? 'bg-orange-500 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-orange-400" />
          RSS
        </button>
        <button
          onClick={() => setFilter('youtube')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
            filter === 'youtube'
              ? 'bg-red-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-red-500" />
          YouTube
        </button>
      </div>

      {/* グリッドレイアウト */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSources.map((source) => (
          <div
            key={source.id}
            className={`bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-all ${
              !source.enabled ? 'opacity-60' : ''
            }`}
          >
            {/* ヘッダー部分 */}
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                {source.thumbnail_url ? (
                  <img
                    src={source.thumbnail_url}
                    alt={source.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    source.type === 'youtube' ? 'bg-red-900/50' : 'bg-orange-900/50'
                  }`}>
                    <span className="text-xl">
                      {source.type === 'youtube' ? '▶' : '◉'}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-white truncate">{source.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                      source.type === 'youtube'
                        ? 'bg-red-900/50 text-red-400'
                        : 'bg-orange-900/50 text-orange-400'
                    }`}>
                      {source.type.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">{source.category}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 統計情報 */}
            <div className="px-4 py-3 bg-gray-950/50">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-white font-medium">{articleCounts[source.id] || 0}</span>
                    <span className="text-gray-500 ml-1">記事</span>
                  </div>
                  <div className={`flex items-center gap-1 ${source.enabled ? 'text-green-400' : 'text-gray-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${source.enabled ? 'bg-green-400' : 'bg-gray-500'}`} />
                    <span className="text-xs">{source.enabled ? '有効' : '無効'}</span>
                  </div>
                </div>
              </div>
              {source.last_fetched_at && (
                <p className="text-xs text-gray-600 mt-2">
                  最終取得: {new Date(source.last_fetched_at).toLocaleString('ja-JP')}
                </p>
              )}
            </div>

            {/* エラー表示 */}
            {source.fetch_error && !fetchStatus?.id && (
              <div className="px-4 py-2 bg-red-950/30 border-t border-red-900/30">
                <p className="text-xs text-red-400 truncate">{source.fetch_error}</p>
              </div>
            )}

            {/* フェッチステータス */}
            {fetchStatus?.id === source.id && (
              <div className={`px-4 py-2 border-t ${
                fetchStatus.status === 'error' ? 'bg-red-950/30 border-red-900/30' :
                fetchStatus.status === 'done' ? 'bg-green-950/30 border-green-900/30' :
                'bg-blue-950/30 border-blue-900/30'
              }`}>
                <div className={`text-xs flex items-center gap-2 ${
                  fetchStatus.status === 'error' ? 'text-red-400' :
                  fetchStatus.status === 'done' ? 'text-green-400' :
                  'text-blue-400'
                }`}>
                  {fetchStatus.status !== 'done' && fetchStatus.status !== 'error' && (
                    <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  )}
                  {fetchStatus.status === 'done' && <span>✓</span>}
                  {fetchStatus.status === 'error' && <span>✗</span>}
                  <span>{fetchStatus.message}</span>
                </div>
              </div>
            )}

            {/* アクションボタン */}
            <div className="p-3 border-t border-gray-800 flex gap-2">
              <button
                onClick={() => fetchPreview(source)}
                disabled={loading === source.id}
                className="flex-1 px-3 py-2 text-xs font-medium bg-purple-600 hover:bg-purple-700 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg transition-colors"
              >
                {loading === source.id ? '取得中...' : '最新を取得'}
              </button>
              <button
                onClick={() => toggleEnabled(source)}
                disabled={loading === source.id}
                className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  source.enabled
                    ? 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30'
                    : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                }`}
              >
                {source.enabled ? '無効化' : '有効化'}
              </button>
              <button
                onClick={() => deleteSource(source)}
                disabled={loading === source.id}
                className="px-3 py-2 text-xs font-medium bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg transition-colors"
              >
                削除
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* フィルター結果が空の場合 */}
      {filteredSources.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {filter === 'rss' ? 'RSSソースがありません' : 'YouTubeソースがありません'}
        </div>
      )}
    </div>
  )
}
