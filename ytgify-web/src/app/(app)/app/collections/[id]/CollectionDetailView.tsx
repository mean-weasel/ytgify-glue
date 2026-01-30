'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { GifCard } from '@/components/gif'
import { GlobeIcon, LockIcon, TrashIcon, SettingsIcon } from '@/components/icons'
import { likeGif, unlikeGif } from '@/lib/feed/actions'
import {
  updateCollection,
  deleteCollection,
  removeGifFromCollection,
  getCollectionGifs,
  type CollectionWithCover,
} from '@/lib/collections/actions'
import type { FeedItem } from '@/types/database'

interface CollectionDetailViewProps {
  collection: CollectionWithCover
  initialGifs: {
    gifs: FeedItem[]
    nextCursor: string | null
    hasMore: boolean
  }
  isOwner: boolean
}

export function CollectionDetailView({
  collection: initialCollection,
  initialGifs,
  isOwner,
}: CollectionDetailViewProps) {
  const router = useRouter()
  const [collection, setCollection] = useState(initialCollection)
  const [gifs, setGifs] = useState(initialGifs.gifs)
  const [cursor, setCursor] = useState(initialGifs.nextCursor)
  const [hasMore, setHasMore] = useState(initialGifs.hasMore)
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(collection.name)
  const [editDescription, setEditDescription] = useState(collection.description || '')
  const [editIsPublic, setEditIsPublic] = useState(collection.is_public)
  const [isSaving, setIsSaving] = useState(false)
  const [removingGifId, setRemovingGifId] = useState<string | null>(null)

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    try {
      const result = await getCollectionGifs(collection.id, cursor || undefined)
      setGifs((prev) => [...prev, ...result.gifs])
      setCursor(result.nextCursor)
      setHasMore(result.hasMore)
    } finally {
      setIsLoading(false)
    }
  }, [collection.id, cursor, hasMore, isLoading])

  const handleLike = async (gifId: string) => {
    await likeGif(gifId)
  }

  const handleUnlike = async (gifId: string) => {
    await unlikeGif(gifId)
  }

  const handleSaveEdit = async () => {
    if (!editName.trim() || isSaving) return

    setIsSaving(true)
    try {
      const result = await updateCollection(collection.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        is_public: editIsPublic,
      })
      if (result.success) {
        setCollection((prev) => ({
          ...prev,
          name: editName.trim(),
          description: editDescription.trim() || null,
          is_public: editIsPublic,
        }))
        setIsEditing(false)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this collection? GIFs in the collection will not be deleted.')) {
      return
    }

    const result = await deleteCollection(collection.id)
    if (result.success) {
      router.push('/app/collections')
    }
  }

  const handleRemoveGif = async (gifId: string) => {
    if (removingGifId) return

    setRemovingGifId(gifId)
    try {
      const result = await removeGifFromCollection(collection.id, gifId)
      if (result.success) {
        setGifs((prev) => prev.filter((g) => g.id !== gifId))
        setCollection((prev) => ({
          ...prev,
          gifs_count: Math.max(0, prev.gifs_count - 1),
        }))
      }
    } finally {
      setRemovingGifId(null)
    }
  }

  return (
    <div>
      {/* Collection header */}
      <div className="mb-6">
        {isEditing ? (
          <div className="p-4 bg-gray-900 rounded-xl">
            <div className="space-y-4">
              <div>
                <label htmlFor="edit-name" className="block text-sm text-gray-400 mb-1">
                  Name
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg focus:border-violet-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="edit-description" className="block text-sm text-gray-400 mb-1">
                  Description
                </label>
                <textarea
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg focus:border-violet-500 focus:outline-none resize-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editIsPublic}
                  onChange={(e) => setEditIsPublic(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-700 bg-black text-violet-500 focus:ring-violet-500 focus:ring-offset-0"
                />
                <span className="text-sm">Make collection public</span>
              </label>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setIsEditing(false)
                  setEditName(collection.name)
                  setEditDescription(collection.description || '')
                  setEditIsPublic(collection.is_public)
                }}
                className="flex-1 py-2 border border-gray-700 hover:border-gray-500 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editName.trim() || isSaving}
                className="flex-1 py-2 bg-violet-500 hover:bg-violet-600 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{collection.name}</h1>
                  {collection.is_public ? (
                    <GlobeIcon size={16} className="text-gray-500" />
                  ) : (
                    <LockIcon size={16} className="text-gray-500" />
                  )}
                </div>
                {collection.description && (
                  <p className="text-gray-400 text-sm mt-1">{collection.description}</p>
                )}
                <p className="text-gray-500 text-xs mt-2">
                  {collection.gifs_count} {collection.gifs_count === 1 ? 'GIF' : 'GIFs'}
                </p>
              </div>

              {isOwner && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    aria-label="Edit collection"
                  >
                    <SettingsIcon size={20} />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    aria-label="Delete collection"
                  >
                    <TrashIcon size={20} />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* GIFs */}
      {gifs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">This collection is empty.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {gifs.map((gif) => (
            <div key={gif.id} className="relative group">
              <GifCard gif={gif} onLike={handleLike} onUnlike={handleUnlike} />
              {isOwner && (
                <button
                  onClick={() => handleRemoveGif(gif.id)}
                  disabled={removingGifId === gif.id}
                  className="absolute top-2 right-2 p-2 bg-black/80 rounded-full text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                  aria-label="Remove from collection"
                >
                  <TrashIcon size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="text-center py-4">
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}
