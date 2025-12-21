import { createServiceClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import { SourceList } from './source-list'

export const dynamic = 'force-dynamic'

export default async function SourcesPage() {
  const supabase = await createServiceClient()

  // ソース一覧を取得
  const { data: sources } = await supabase
    .from('sources')
    .select('*')
    .order('created_at', { ascending: false })

  // 各ソースの記事数を取得
  const sourceIds = sources?.map(s => s.id) ?? []
  const { data: articleCounts } = await supabase
    .from('articles')
    .select('source_id')
    .in('source_id', sourceIds)

  // ソースごとの記事数をカウント
  const countMap: Record<string, number> = {}
  articleCounts?.forEach(a => {
    countMap[a.source_id] = (countMap[a.source_id] || 0) + 1
  })

  // 統計情報
  const stats = {
    total: sources?.length ?? 0,
    rss: sources?.filter(s => s.type === 'rss').length ?? 0,
    youtube: sources?.filter(s => s.type === 'youtube').length ?? 0,
    enabled: sources?.filter(s => s.enabled).length ?? 0,
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Media Sources</h1>
            <p className="text-gray-400 mt-1">ニュースソースの管理</p>
          </div>
          <Link
            href="/admin/sources/new"
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <span className="text-lg">+</span>
            ソース追加
          </Link>
        </div>

        {/* 統計バー */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-sm text-gray-400">総ソース数</div>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-400">{stats.rss}</div>
            <div className="text-sm text-gray-400">RSS フィード</div>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-400">{stats.youtube}</div>
            <div className="text-sm text-gray-400">YouTube</div>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">{stats.enabled}</div>
            <div className="text-sm text-gray-400">有効</div>
          </div>
        </div>
      </div>

      <SourceList sources={sources ?? []} articleCounts={countMap} />
    </DashboardLayout>
  )
}
