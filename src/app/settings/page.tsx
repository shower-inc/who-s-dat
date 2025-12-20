import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

      <div className="space-y-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Environment Variables</h2>
          <p className="text-gray-400 mb-4">
            Set these in your Vercel project settings or .env.local file:
          </p>
          <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm text-gray-300 space-y-2">
            <p># Supabase</p>
            <p>NEXT_PUBLIC_SUPABASE_URL=</p>
            <p>NEXT_PUBLIC_SUPABASE_ANON_KEY=</p>
            <p>SUPABASE_SERVICE_ROLE_KEY=</p>
            <p></p>
            <p># Anthropic (Claude)</p>
            <p>ANTHROPIC_API_KEY=</p>
            <p></p>
            <p># Buffer</p>
            <p>BUFFER_ACCESS_TOKEN=</p>
            <p></p>
            <p># Cron Authentication</p>
            <p>CRON_SECRET=</p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">GitHub Secrets</h2>
          <p className="text-gray-400 mb-4">
            Set these in your GitHub repository secrets for Cron Jobs:
          </p>
          <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm text-gray-300 space-y-2">
            <p>VERCEL_URL=https://your-app.vercel.app</p>
            <p>CRON_SECRET=your-secret-key</p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Setup Guide</h2>
          <ol className="list-decimal list-inside space-y-3 text-gray-300">
            <li>
              <strong>Supabase</strong>: Create a project at supabase.com, run the migration SQL
            </li>
            <li>
              <strong>Anthropic</strong>: Get API key from console.anthropic.com
            </li>
            <li>
              <strong>Buffer</strong>: Create app at buffer.com/developers, connect X account
            </li>
            <li>
              <strong>Vercel</strong>: Deploy this repo, set environment variables
            </li>
            <li>
              <strong>GitHub Actions</strong>: Enable workflows, set secrets
            </li>
          </ol>
        </div>
      </div>
    </DashboardLayout>
  )
}
