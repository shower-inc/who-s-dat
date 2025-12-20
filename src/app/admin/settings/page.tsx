import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold text-white mb-8">設定</h1>

      <div className="space-y-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">環境変数</h2>
          <p className="text-gray-400 mb-4">
            Vercelのプロジェクト設定または .env.local ファイルで設定してください：
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
            <p># X (Twitter) API</p>
            <p>TWITTER_API_KEY=</p>
            <p>TWITTER_API_SECRET=</p>
            <p>TWITTER_ACCESS_TOKEN=</p>
            <p>TWITTER_ACCESS_TOKEN_SECRET=</p>
            <p></p>
            <p># Cron認証</p>
            <p>CRON_SECRET=</p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">GitHub Secrets</h2>
          <p className="text-gray-400 mb-4">
            GitHub ActionsのCronジョブ用にリポジトリのSecretsに設定してください：
          </p>
          <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm text-gray-300 space-y-2">
            <p>VERCEL_URL=https://your-app.vercel.app</p>
            <p>CRON_SECRET=your-secret-key</p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">セットアップガイド</h2>
          <ol className="list-decimal list-inside space-y-3 text-gray-300">
            <li>
              <strong>Supabase</strong>: supabase.comでプロジェクト作成、マイグレーションSQLを実行
            </li>
            <li>
              <strong>Anthropic</strong>: console.anthropic.comでAPIキーを取得
            </li>
            <li>
              <strong>X API</strong>: developer.x.comでアプリ作成、Read and Write権限を設定
            </li>
            <li>
              <strong>Vercel</strong>: リポジトリをデプロイ、環境変数を設定
            </li>
            <li>
              <strong>GitHub Actions</strong>: ワークフローを有効化、Secretsを設定
            </li>
          </ol>
        </div>
      </div>
    </DashboardLayout>
  )
}
