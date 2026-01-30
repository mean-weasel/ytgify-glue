'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { GifCard } from './GifCard'
import { GifCardSkeleton } from './GifCardSkeleton'
import { RefreshIcon } from '@/components/icons'
import { AddToCollectionModal } from '@/components/collections'
import { getFeed, getTrendingFeed, likeGif, unlikeGif } from '@/lib/feed/actions'
import type { FeedItem, FeedResponse } from '@/types/database'

type FeedType = 'home' | 'trending'

interface FeedProps {
  type?: FeedType
  initialData?: FeedResponse
}

export function Feed({ type = 'home', initialData }: FeedProps) {
  const [gifs, setGifs] = useState<FeedItem[]>(initialData?.gifs || [])
  const [cursor, setCursor] = useState<string | null>(initialData?.nextCursor || null)
  const [hasMore, setHasMore] = useState(initialData?.hasMore ?? true)
  const [isLoading, setIsLoading] = useState(!initialData)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveModalGifId, setSaveModalGifId] = useState<string | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const fetchFeed = useCallback(
    async (refresh = false) => {
      const fetchFn = type === 'trending' ? getTrendingFeed : getFeed

      try {
        if (refresh) {
          setIsRefreshing(true)
        }

        const result = await fetchFn(refresh ? undefined : cursor || undefined)

        if (refresh) {
          setGifs(result.gifs)
        } else {
          setGifs((prev) => [...prev, ...result.gifs])
        }

        setCursor(result.nextCursor)
        setHasMore(result.hasMore)
        setError(null)
      } catch {
        setError('Failed to load feed')
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
        setIsRefreshing(false)
      }
    },
    [type, cursor]
  )

  // Initial load
  useEffect(() => {
    if (!initialData) {
      fetchFeed()
    }
  }, [fetchFeed, initialData])

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || isLoadingMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          setIsLoadingMore(true)
          fetchFeed()
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, fetchFeed])

  // Handle refresh
  const handleRefresh = async () => {
    if (isRefreshing) return
    setCursor(null)
    await fetchFeed(true)
  }

  // Handle like/unlike
  const handleLike = async (gifId: string) => {
    await likeGif(gifId)
  }

  const handleUnlike = async (gifId: string) => {
    await unlikeGif(gifId)
  }

  // Handle share
  const handleShare = (gif: FeedItem) => {
    if (navigator.share) {
      navigator.share({
        title: gif.title || 'Check out this GIF',
        url: `${window.location.origin}/app/gifs/${gif.id}`,
      })
    } else {
      // Fallback: copy link to clipboard
      navigator.clipboard.writeText(`${window.location.origin}/app/gifs/${gif.id}`)
    }
  }

  // Handle save to collection
  const handleSave = (gifId: string) => {
    setSaveModalGifId(gifId)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <GifCardSkeleton />
        <GifCardSkeleton />
        <GifCardSkeleton />
      </div>
    )
  }

  // Error state
  if (error && gifs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
        >
          Try again
        </button>
      </div>
    )
  }

  // Empty state
  if (gifs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-2">No GIFs yet</p>
        <p className="text-gray-500 text-sm">
          {type === 'home'
            ? 'Follow creators or check out trending GIFs'
            : 'Be the first to create a trending GIF!'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Pull to refresh indicator */}
      {isRefreshing && (
        <div className="flex justify-center py-4">
          <RefreshIcon size={24} className="animate-spin text-gray-400" />
        </div>
      )}

      {/* Refresh button */}
      <div className="flex justify-center">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshIcon size={16} className={isRefreshing ? 'animate-spin' : ''} />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* GIF cards */}
      {gifs.map((gif, index) => (
        <GifCard
          key={gif.id}
          gif={gif}
          onLike={handleLike}
          onUnlike={handleUnlike}
          onShare={handleShare}
          onSave={handleSave}
          priority={index < 2}
        />
      ))}

      {/* Load more trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="py-4">
          {isLoadingMore && (
            <div className="space-y-4">
              <GifCardSkeleton />
            </div>
          )}
        </div>
      )}

      {/* End of feed */}
      {!hasMore && gifs.length > 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          You&apos;ve seen all the GIFs!
        </div>
      )}

      {/* Save to collection modal */}
      {saveModalGifId && (
        <AddToCollectionModal
          gifId={saveModalGifId}
          isOpen={!!saveModalGifId}
          onClose={() => setSaveModalGifId(null)}
        />
      )}
    </div>
  )
}
