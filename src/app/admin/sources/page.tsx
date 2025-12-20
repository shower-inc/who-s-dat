import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import { SourceList } from './source-list'

export default async function SourcesPage() {
  const supabase = await createClient()

  const { data: sources } = await supabase
    .from('sources')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Sources</h1>
        <Link
          href="/admin/sources/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          + Add Source
        </Link>
      </div>

      <SourceList sources={sources ?? []} />
    </DashboardLayout>
  )
}
