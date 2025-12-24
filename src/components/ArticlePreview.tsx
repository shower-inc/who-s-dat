'use client'

import { useEffect, useState } from 'react'

type Props = {
  content: string
  title?: string
}

export function ArticlePreview({ content, title }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  // ESCキーで閉じる
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        Preview
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl max-h-[90vh] mx-4 bg-[#0a1628] rounded-xl overflow-hidden border border-[#1e3a5f]/50 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e3a5f]/50 bg-[#152238]">
              <h3 className="text-lg font-semibold text-white">Preview</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {title && (
                <h1 className="text-2xl font-bold text-white mb-6">{title}</h1>
              )}
              <div
                className="text-gray-300 leading-relaxed text-lg prose prose-invert prose-lg max-w-none
                  prose-p:my-4 prose-p:leading-relaxed
                  prose-a:text-blue-400 prose-a:hover:text-blue-300 prose-a:underline
                  prose-strong:text-white prose-strong:font-bold
                  prose-em:text-gray-200
                  prose-headings:text-white prose-headings:font-bold
                  prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
                  prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
                  prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
                  prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6
                  prose-li:my-2
                  prose-blockquote:border-l-4 prose-blockquote:border-[#b87aff] prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-gray-400"
                dangerouslySetInnerHTML={{ __html: content || '<p class="text-gray-500">No content</p>' }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
