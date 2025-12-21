'use client'

import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { useCallback, useState } from 'react'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
}

function MenuBar({ editor }: { editor: Editor | null }) {
  const [linkUrl, setLinkUrl] = useState('')
  const [showLinkInput, setShowLinkInput] = useState(false)

  const setLink = useCallback(() => {
    if (!editor) return

    if (linkUrl === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    // URLにプロトコルがなければ追加
    const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`

    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url })
      .run()

    setLinkUrl('')
    setShowLinkInput(false)
  }, [editor, linkUrl])

  if (!editor) {
    return null
  }

  return (
    <div className="border-b border-gray-700 p-2 flex flex-wrap gap-1">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`px-2 py-1 text-sm rounded transition-colors ${
          editor.isActive('bold')
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
        }`}
        type="button"
      >
        B
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`px-2 py-1 text-sm rounded transition-colors italic ${
          editor.isActive('italic')
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
        }`}
        type="button"
      >
        I
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className={`px-2 py-1 text-sm rounded transition-colors line-through ${
          editor.isActive('strike')
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
        }`}
        type="button"
      >
        S
      </button>

      <div className="w-px bg-gray-700 mx-1" />

      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`px-2 py-1 text-sm rounded transition-colors ${
          editor.isActive('heading', { level: 2 })
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
        }`}
        type="button"
      >
        H2
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`px-2 py-1 text-sm rounded transition-colors ${
          editor.isActive('heading', { level: 3 })
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
        }`}
        type="button"
      >
        H3
      </button>

      <div className="w-px bg-gray-700 mx-1" />

      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`px-2 py-1 text-sm rounded transition-colors ${
          editor.isActive('bulletList')
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
        }`}
        type="button"
      >
        •リスト
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`px-2 py-1 text-sm rounded transition-colors ${
          editor.isActive('orderedList')
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
        }`}
        type="button"
      >
        1.リスト
      </button>

      <div className="w-px bg-gray-700 mx-1" />

      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`px-2 py-1 text-sm rounded transition-colors ${
          editor.isActive('blockquote')
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
        }`}
        type="button"
      >
        引用
      </button>

      <div className="w-px bg-gray-700 mx-1" />

      {/* リンク挿入 */}
      {showLinkInput ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded text-white w-48 focus:outline-none focus:ring-1 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                setLink()
              }
              if (e.key === 'Escape') {
                setShowLinkInput(false)
                setLinkUrl('')
              }
            }}
            autoFocus
          />
          <button
            onClick={setLink}
            className="px-2 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            type="button"
          >
            追加
          </button>
          <button
            onClick={() => {
              setShowLinkInput(false)
              setLinkUrl('')
            }}
            className="px-2 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
            type="button"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            const previousUrl = editor.getAttributes('link').href
            setLinkUrl(previousUrl || '')
            setShowLinkInput(true)
          }}
          className={`px-2 py-1 text-sm rounded transition-colors ${
            editor.isActive('link')
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          }`}
          type="button"
        >
          🔗 リンク
        </button>
      )}

      {editor.isActive('link') && (
        <button
          onClick={() => editor.chain().focus().unsetLink().run()}
          className="px-2 py-1 text-sm bg-red-900 hover:bg-red-800 text-red-300 rounded transition-colors"
          type="button"
        >
          リンク解除
        </button>
      )}

      <div className="w-px bg-gray-700 mx-1" />

      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        className="px-2 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 rounded transition-colors"
        type="button"
      >
        ↩ 戻る
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        className="px-2 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 rounded transition-colors"
        type="button"
      >
        ↪ 進む
      </button>
    </div>
  )
}

export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-400 hover:text-blue-300 underline',
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none p-4 min-h-[200px] focus:outline-none',
      },
    },
  })

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
      {placeholder && !content && (
        <p className="absolute top-16 left-4 text-gray-500 pointer-events-none">
          {placeholder}
        </p>
      )}
    </div>
  )
}

// HTMLをプレーンテキストに変換（文字数カウント用）
export function htmlToPlainText(html: string): string {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}
