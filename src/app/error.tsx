'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Page error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center px-4">
        <h2 className="text-2xl font-bold text-white mb-4">
          エラーが発生しました
        </h2>
        <p className="text-gray-400 mb-6">
          ページの読み込み中にエラーが発生しました。
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            再試行
          </button>
          <Link
            href="/"
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            トップへ戻る
          </Link>
        </div>
      </div>
    </div>
  )
}
