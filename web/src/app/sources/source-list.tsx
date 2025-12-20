'use client'

import { Source } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function SourceList({ sources }: { sources: Source[] }) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const toggleEnabled = async (source: Source) => {
    setLoading(source.id)
    await supabase
      .from('sources')
      .update({ enabled: !source.enabled })
      .eq('id', source.id)
    router.refresh()
    setLoading(null)
  }

  const deleteSource = async (source: Source) => {
    if (!confirm(`Delete "${source.name}"?`)) return
    setLoading(source.id)
    await supabase.from('sources').delete().eq('id', source.id)
    router.refresh()
    setLoading(null)
  }

  const fetchSource = async (source: Source) => {
    setLoading(source.id)
    try {
      const res = await fetch(`/api/sources/${source.id}/fetch`, { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        alert(`Error: ${data.error}`)
      } else {
        alert(`Fetched ${data.count} articles`)
      }
    } catch (e) {
      alert('Fetch failed')
    }
    router.refresh()
    setLoading(null)
  }

  if (sources.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-400">No sources yet. Add your first RSS or YouTube source!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sources.map((source) => (
        <div
          key={source.id}
          className={`bg-gray-900 border border-gray-800 rounded-xl p-6 ${
            !source.enabled ? 'opacity-50' : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {source.type === 'youtube' ? '📺' : '📡'}
                </span>
                <div>
                  <h3 className="text-lg font-medium text-white">{source.name}</h3>
                  <p className="text-sm text-gray-400">{source.category}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2 truncate max-w-xl">{source.url}</p>
              {source.last_fetched_at && (
                <p className="text-xs text-gray-600 mt-1">
                  Last fetched: {new Date(source.last_fetched_at).toLocaleString()}
                </p>
              )}
              {source.fetch_error && (
                <p className="text-xs text-red-400 mt-1">{source.fetch_error}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchSource(source)}
                disabled={loading === source.id}
                className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded transition-colors"
              >
                Fetch
              </button>
              <button
                onClick={() => toggleEnabled(source)}
                disabled={loading === source.id}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  source.enabled
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    : 'bg-gray-600 hover:bg-gray-500 text-white'
                }`}
              >
                {source.enabled ? 'Disable' : 'Enable'}
              </button>
              <button
                onClick={() => deleteSource(source)}
                disabled={loading === source.id}
                className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
