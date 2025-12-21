import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center px-4">
        <h2 className="text-2xl font-bold text-white mb-4">
          ページが見つかりません
        </h2>
        <p className="text-gray-400 mb-6">
          お探しのページは存在しないか、削除された可能性があります。
        </p>
        <Link
          href="/"
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors inline-block"
        >
          トップへ戻る
        </Link>
      </div>
    </div>
  )
}
