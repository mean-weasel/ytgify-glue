'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PlusIcon, FolderIcon, LockIcon, GlobeIcon, TrashIcon } from '@/components/icons'
import {
  createCollection,
  deleteCollection,
  type CollectionWithCover,
} from '@/lib/collections/actions'

interface CollectionsViewProps {
  initialCollections: CollectionWithCover[]
}

export function CollectionsView({ initialCollections }: CollectionsViewProps) {
  const [collections, setCollections] = useState(initialCollections)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newIsPublic, setNewIsPublic] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || isLoading) return

    setIsLoading(true)
    try {
      const result = await createCollection(newName.trim(), newDescription.trim() || undefined, newIsPublic)
      if (result.success && result.collection) {
        setCollections((prev) => [{ ...result.collection!, cover_gif: null }, ...prev])
        setNewName('')
        setNewDescription('')
        setNewIsPublic(false)
        setIsCreating(false)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (collectionId: string) => {
    if (deletingId) return

    if (!confirm('Delete this collection? GIFs in the collection will not be deleted.')) {
      return
    }

    setDeletingId(collectionId)
    try {
      const result = await deleteCollection(collectionId)
      if (result.success) {
        setCollections((prev) => prev.filter((c) => c.id !== collectionId))
      }
    } finally {
      setDeletingId(null)
    }
  }

  if (collections.length === 0 && !isCreating) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-900 flex items-center justify-center">
          <FolderIcon size={32} className="text-gray-600" />
        </div>
        <h2 className="text-lg font-semibold mb-2">No collections yet</h2>
        <p className="text-gray-400 text-sm max-w-xs mx-auto mb-6">
          Create collections to organize your favorite GIFs.
        </p>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 rounded-full text-sm font-medium transition-all"
        >
          <PlusIcon size={18} />
          Create Collection
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Create button */}
      {!isCreating && (
        <button
          onClick={() => setIsCreating(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-gray-700 hover:border-gray-500 rounded-xl mb-4 text-gray-400 hover:text-white transition-colors"
        >
          <PlusIcon size={20} />
          New Collection
        </button>
      )}

      {/* Create form */}
      {isCreating && (
        <form onSubmit={handleCreate} className="mb-6 p-4 bg-gray-900 rounded-xl">
          <h3 className="font-semibold mb-4">Create Collection</h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm text-gray-400 mb-1">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="My Favorite GIFs"
                className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg focus:border-violet-500 focus:outline-none"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm text-gray-400 mb-1">
                Description (optional)
              </label>
              <textarea
                id="description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="A collection of..."
                rows={2}
                className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg focus:border-violet-500 focus:outline-none resize-none"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newIsPublic}
                onChange={(e) => setNewIsPublic(e.target.checked)}
                className="w-4 h-4 rounded border-gray-700 bg-black text-violet-500 focus:ring-violet-500 focus:ring-offset-0"
              />
              <span className="text-sm">Make collection public</span>
            </label>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={() => {
                setIsCreating(false)
                setNewName('')
                setNewDescription('')
                setNewIsPublic(false)
              }}
              className="flex-1 py-2 border border-gray-700 hover:border-gray-500 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newName.trim() || isLoading}
              className="flex-1 py-2 bg-violet-500 hover:bg-violet-600 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      )}

      {/* Collections grid */}
      <div className="space-y-3">
        {collections.map((collection) => (
          <Link
            key={collection.id}
            href={`/app/collections/${collection.id}`}
            className="flex items-center gap-4 p-3 bg-gray-900/50 hover:bg-gray-900 rounded-xl transition-colors group"
          >
            {/* Cover image */}
            <div className="w-16 h-16 rounded-lg bg-gray-800 overflow-hidden shrink-0">
              {collection.cover_gif ? (
                <img
                  src={collection.cover_gif.thumbnail_url || collection.cover_gif.file_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FolderIcon size={24} className="text-gray-600" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-medium truncate">{collection.name}</h3>
                {collection.is_public ? (
                  <GlobeIcon size={14} className="text-gray-500 shrink-0" />
                ) : (
                  <LockIcon size={14} className="text-gray-500 shrink-0" />
                )}
              </div>
              {collection.description && (
                <p className="text-sm text-gray-400 truncate">{collection.description}</p>
              )}
              <p className="text-xs text-gray-500 mt-0.5">
                {collection.gifs_count} {collection.gifs_count === 1 ? 'GIF' : 'GIFs'}
              </p>
            </div>

            {/* Delete button */}
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleDelete(collection.id)
              }}
              disabled={deletingId === collection.id}
              className="p-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
              aria-label="Delete collection"
            >
              <TrashIcon size={18} />
            </button>
          </Link>
        ))}
      </div>
    </div>
  )
}
