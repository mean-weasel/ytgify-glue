'use client'

import { useState, useEffect } from 'react'
import { XIcon, FolderIcon, PlusIcon, CheckIcon } from '@/components/icons'
import {
  getCollectionsForGif,
  createCollection,
  addGifToCollection,
  removeGifFromCollection,
  type CollectionWithCover,
} from '@/lib/collections/actions'

interface AddToCollectionModalProps {
  gifId: string
  isOpen: boolean
  onClose: () => void
}

type CollectionWithStatus = CollectionWithCover & { contains_gif: boolean }

export function AddToCollectionModal({ gifId, isOpen, onClose }: AddToCollectionModalProps) {
  const [collections, setCollections] = useState<CollectionWithStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadCollections()
    }
  }, [isOpen, gifId])

  const loadCollections = async () => {
    setIsLoading(true)
    try {
      const result = await getCollectionsForGif(gifId)
      setCollections(result.collections)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleCollection = async (collection: CollectionWithStatus) => {
    if (togglingId) return

    setTogglingId(collection.id)

    // Optimistic update
    setCollections((prev) =>
      prev.map((c) =>
        c.id === collection.id ? { ...c, contains_gif: !c.contains_gif } : c
      )
    )

    try {
      if (collection.contains_gif) {
        await removeGifFromCollection(collection.id, gifId)
      } else {
        await addGifToCollection(collection.id, gifId)
      }
    } catch {
      // Revert on error
      setCollections((prev) =>
        prev.map((c) =>
          c.id === collection.id ? { ...c, contains_gif: collection.contains_gif } : c
        )
      )
    } finally {
      setTogglingId(null)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || isSaving) return

    setIsSaving(true)
    try {
      const result = await createCollection(newName.trim())
      if (result.success && result.collection) {
        // Add to collection and mark as containing this GIF
        await addGifToCollection(result.collection.id, gifId)
        setCollections((prev) => [
          { ...result.collection!, cover_gif: null, contains_gif: true },
          ...prev,
        ])
        setNewName('')
        setIsCreating(false)
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-gray-900 rounded-t-2xl sm:rounded-2xl max-h-[80vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold">Save to Collection</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <XIcon size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Create new collection */}
              {isCreating ? (
                <form onSubmit={handleCreate} className="mb-4 p-3 bg-gray-800 rounded-xl">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Collection name"
                    className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg focus:border-violet-500 focus:outline-none text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreating(false)
                        setNewName('')
                      }}
                      className="flex-1 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!newName.trim() || isSaving}
                      className="flex-1 py-2 bg-violet-500 hover:bg-violet-600 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {isSaving ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full flex items-center gap-3 p-3 border border-dashed border-gray-700 hover:border-gray-500 rounded-xl mb-4 text-gray-400 hover:text-white transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                    <PlusIcon size={20} />
                  </div>
                  <span className="text-sm font-medium">New Collection</span>
                </button>
              )}

              {/* Collections list */}
              {collections.length === 0 && !isCreating ? (
                <p className="text-center text-gray-400 text-sm py-4">
                  Create your first collection to save GIFs.
                </p>
              ) : (
                <div className="space-y-2">
                  {collections.map((collection) => (
                    <button
                      key={collection.id}
                      onClick={() => handleToggleCollection(collection)}
                      disabled={togglingId === collection.id}
                      className="w-full flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {/* Cover image */}
                      <div className="w-10 h-10 rounded-lg bg-gray-700 overflow-hidden shrink-0">
                        {collection.cover_gif ? (
                          <img
                            src={collection.cover_gif.thumbnail_url || collection.cover_gif.file_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FolderIcon size={18} className="text-gray-500" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium text-sm truncate">{collection.name}</p>
                        <p className="text-xs text-gray-500">
                          {collection.gifs_count} {collection.gifs_count === 1 ? 'GIF' : 'GIFs'}
                        </p>
                      </div>

                      {/* Check indicator */}
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          collection.contains_gif
                            ? 'bg-violet-500 border-violet-500'
                            : 'border-gray-600'
                        }`}
                      >
                        {collection.contains_gif && <CheckIcon size={14} className="text-white" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-white hover:bg-gray-200 text-black rounded-lg text-sm font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
