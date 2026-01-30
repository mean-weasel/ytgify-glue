'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { HeartIcon, CommentIcon, ShareIcon, BookmarkIcon, MoreIcon, UserIcon } from '@/components/icons'
import { formatDistanceToNow } from '@/lib/utils/date'
import { formatNumber } from '@/lib/utils/number'
import { triggerHapticFeedback } from '@/lib/capacitor'
import type { FeedItem } from '@/types/database'

interface GifCardProps {
  gif: FeedItem
  onLike?: (gifId: string) => Promise<void>
  onUnlike?: (gifId: string) => Promise<void>
  onShare?: (gif: FeedItem) => void
  onSave?: (gifId: string) => void
  priority?: boolean
}

export function GifCard({
  gif,
  onLike,
  onUnlike,
  onShare,
  onSave,
  priority = false,
}: GifCardProps) {
  const [isLiked, setIsLiked] = useState(gif.is_liked ?? false)
  const [likeCount, setLikeCount] = useState(gif.like_count)
  const [showHeart, setShowHeart] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const lastTapRef = useRef<number>(0)
  const heartTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Handle double-tap to like
  const handleTap = useCallback(() => {
    const now = Date.now()
    const timeSinceLastTap = now - lastTapRef.current
    lastTapRef.current = now

    // Double-tap detection (within 300ms)
    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      handleDoubleTap()
    }
  }, [])

  const handleDoubleTap = async () => {
    // Trigger haptic feedback on double-tap
    triggerHapticFeedback('medium')

    if (!isLiked) {
      await handleLike()
    }
    // Show heart animation regardless
    setShowHeart(true)
    if (heartTimeoutRef.current) {
      clearTimeout(heartTimeoutRef.current)
    }
    heartTimeoutRef.current = setTimeout(() => {
      setShowHeart(false)
    }, 800)
  }

  const handleLike = async () => {
    if (isLoading) return

    // Trigger haptic feedback on like action
    triggerHapticFeedback('light')

    setIsLoading(true)
    const wasLiked = isLiked

    // Optimistic update
    setIsLiked(!wasLiked)
    setLikeCount((prev) => (wasLiked ? prev - 1 : prev + 1))

    try {
      if (wasLiked && onUnlike) {
        await onUnlike(gif.id)
      } else if (!wasLiked && onLike) {
        await onLike(gif.id)
      }
    } catch {
      // Revert on error
      setIsLiked(wasLiked)
      setLikeCount((prev) => (wasLiked ? prev + 1 : prev - 1))
    } finally {
      setIsLoading(false)
    }
  }

  const handleShare = () => {
    if (onShare) {
      onShare(gif)
    } else if (navigator.share) {
      navigator.share({
        title: gif.title || 'Check out this GIF',
        url: `${window.location.origin}/app/gifs/${gif.id}`,
      })
    }
  }

  const handleSave = () => {
    onSave?.(gif.id)
  }

  // Auto-play/pause on viewport visibility
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {})
          } else {
            video.pause()
          }
        })
      },
      { threshold: 0.5 }
    )

    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  // Cleanup heart timeout
  useEffect(() => {
    return () => {
      if (heartTimeoutRef.current) {
        clearTimeout(heartTimeoutRef.current)
      }
    }
  }, [])

  const isVideo = gif.file_url.endsWith('.mp4') || gif.file_url.endsWith('.webm')
  const aspectRatio = gif.width && gif.height ? gif.width / gif.height : 16 / 9

  return (
    <article className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header - User info */}
      <div className="flex items-center gap-3 p-3">
        <Link href={`/app/users/${gif.user.username}`} className="shrink-0">
          {gif.user.avatar_url ? (
            <img
              src={gif.user.avatar_url}
              alt={gif.user.display_name || gif.user.username}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center">
              <UserIcon size={20} className="text-white" />
            </div>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            href={`/app/users/${gif.user.username}`}
            className="font-semibold text-sm hover:underline truncate block"
          >
            {gif.user.display_name || gif.user.username}
          </Link>
          <p className="text-gray-500 text-xs">
            @{gif.user.username} · {formatDistanceToNow(new Date(gif.created_at))}
          </p>
        </div>
        <button
          className="p-2 text-gray-400 hover:text-white transition-colors"
          aria-label="More options"
        >
          <MoreIcon size={20} />
        </button>
      </div>

      {/* GIF/Video content */}
      <div
        className="relative bg-black cursor-pointer"
        style={{ aspectRatio }}
        onClick={handleTap}
      >
        {isVideo ? (
          <video
            ref={videoRef}
            src={gif.file_url}
            poster={gif.thumbnail_url || undefined}
            loop
            muted
            playsInline
            className="w-full h-full object-contain"
            preload={priority ? 'auto' : 'metadata'}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gif.file_url}
            alt={gif.title || 'GIF'}
            className="w-full h-full object-contain"
            loading={priority ? 'eager' : 'lazy'}
          />
        )}

        {/* Double-tap heart animation */}
        {showHeart && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <HeartIcon
              size={80}
              filled
              className="text-red-500 animate-heart-pop"
            />
          </div>
        )}

        {/* YouTube source badge */}
        {gif.youtube_video_title && (
          <div className="absolute bottom-2 left-2 right-2">
            <div className="bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1.5 text-xs truncate">
              <span className="text-red-500 font-medium">YouTube</span>
              <span className="text-gray-300 ml-1.5">{gif.youtube_channel_name}</span>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            disabled={isLoading}
            className="flex items-center gap-1.5 group"
            aria-label={isLiked ? 'Unlike' : 'Like'}
          >
            <HeartIcon
              size={24}
              filled={isLiked}
              className={`transition-all ${
                isLiked
                  ? 'text-red-500'
                  : 'text-gray-400 group-hover:text-gray-200'
              } ${isLoading ? 'opacity-50' : ''}`}
            />
            <span
              className={`text-sm font-medium ${
                isLiked ? 'text-red-500' : 'text-gray-400'
              }`}
            >
              {formatNumber(likeCount)}
            </span>
          </button>

          <Link
            href={`/app/gifs/${gif.id}`}
            className="flex items-center gap-1.5 group"
            aria-label="Comments"
          >
            <CommentIcon
              size={24}
              className="text-gray-400 group-hover:text-gray-200 transition-colors"
            />
            <span className="text-sm font-medium text-gray-400">
              {formatNumber(gif.comment_count)}
            </span>
          </Link>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 group"
            aria-label="Share"
          >
            <ShareIcon
              size={22}
              className="text-gray-400 group-hover:text-gray-200 transition-colors"
            />
            {gif.share_count > 0 && (
              <span className="text-sm font-medium text-gray-400">
                {formatNumber(gif.share_count)}
              </span>
            )}
          </button>
        </div>

        <button
          onClick={handleSave}
          className="p-1 text-gray-400 hover:text-white transition-colors"
          aria-label="Save to collection"
        >
          <BookmarkIcon size={24} />
        </button>
      </div>

      {/* Title and description */}
      {(gif.title || gif.description) && (
        <div className="px-3 pb-3">
          {gif.title && (
            <h3 className="font-medium text-sm line-clamp-1">{gif.title}</h3>
          )}
          {gif.description && (
            <p className="text-gray-400 text-sm mt-0.5 line-clamp-2">
              {gif.description}
            </p>
          )}
        </div>
      )}
    </article>
  )
}
