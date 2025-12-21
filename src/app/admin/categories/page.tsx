'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Category = {
  id: string
  name: string
  slug: string
  description: string | null
  color: string
  sources: { count: number }[]
}

export default function CategoriesPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '', description: '', color: '#6366f1' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', color: '' })
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [mergeTarget, setMergeTarget] = useState<string>('')

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    const res = await fetch('/api/admin/categories')
    const data = await res.json()
    setCategories(data.categories || [])
    setLoading(false)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCategory),
    })
    if (res.ok) {
      setNewCategory({ name: '', description: '', color: '#6366f1' })
      setShowNewForm(false)
      fetchCategories()
    } else {
      const data = await res.json()
      alert(data.error)
    }
  }

  const handleUpdate = async (id: string) => {
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    if (res.ok) {
      setEditingId(null)
      fetchCategories()
    } else {
      const data = await res.json()
      alert(data.error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このカテゴリを削除しますか？')) return
    const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
    if (res.ok) {
      fetchCategories()
    } else {
      const data = await res.json()
      alert(data.error)
    }
  }

  const handleMerge = async () => {
    if (!mergeTarget || selectedIds.length === 0) return
    if (!confirm(`選択した${selectedIds.length}個のカテゴリを統合しますか？`)) return

    const res = await fetch('/api/admin/categories/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceIds: selectedIds, targetId: mergeTarget }),
    })
    if (res.ok) {
      setSelectedIds([])
      setMergeTarget('')
      fetchCategories()
    } else {
      const data = await res.json()
      alert(data.error)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const startEdit = (cat: Category) => {
    setEditingId(cat.id)
    setEditForm({ name: cat.name, description: cat.description || '', color: cat.color })
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">カテゴリ管理</h1>
        <button
          onClick={() => setShowNewForm(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          新規カテゴリ
        </button>
      </div>

      {/* 新規作成フォーム */}
      {showNewForm && (
        <div className="mb-6 p-4 bg-gray-900 border border-gray-800 rounded-xl">
          <form onSubmit={handleCreate} className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-1">名前</label>
              <input
                type="text"
                required
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                placeholder="UK Garage"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-1">説明（任意）</label>
              <input
                type="text"
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">色</label>
              <input
                type="color"
                value={newCategory.color}
                onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                className="w-12 h-10 rounded cursor-pointer"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
            >
              追加
            </button>
            <button
              type="button"
              onClick={() => setShowNewForm(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            >
              キャンセル
            </button>
          </form>
        </div>
      )}

      {/* 統合機能 */}
      {selectedIds.length > 0 && (
        <div className="mb-6 p-4 bg-purple-900/30 border border-purple-800 rounded-xl flex items-center gap-4">
          <span className="text-purple-300">{selectedIds.length}個選択中</span>
          <select
            value={mergeTarget}
            onChange={(e) => setMergeTarget(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
          >
            <option value="">統合先を選択...</option>
            {categories
              .filter((c) => !selectedIds.includes(c.id))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
          <button
            onClick={handleMerge}
            disabled={!mergeTarget}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded transition-colors"
          >
            統合
          </button>
          <button
            onClick={() => setSelectedIds([])}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            選択解除
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400">読み込み中...</p>
      ) : categories.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400">カテゴリがありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`bg-gray-900 border rounded-xl p-4 flex items-center gap-4 ${
                selectedIds.includes(cat.id) ? 'border-purple-500' : 'border-gray-800'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(cat.id)}
                onChange={() => toggleSelect(cat.id)}
                className="w-5 h-5 rounded"
              />
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              {editingId === cat.id ? (
                <div className="flex-1 flex items-center gap-3">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-white"
                  />
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="説明"
                    className="flex-1 px-3 py-1 bg-gray-800 border border-gray-700 rounded text-white"
                  />
                  <input
                    type="color"
                    value={editForm.color}
                    onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer"
                  />
                  <button
                    onClick={() => handleUpdate(cat.id)}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded"
                  >
                    キャンセル
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1">
                    <p className="text-white font-medium">{cat.name}</p>
                    {cat.description && (
                      <p className="text-sm text-gray-500">{cat.description}</p>
                    )}
                  </div>
                  <span className="text-sm text-gray-400">
                    {cat.sources?.[0]?.count || 0} ソース
                  </span>
                  <button
                    onClick={() => startEdit(cat)}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
                  >
                    削除
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
