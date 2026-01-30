'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  HeartIcon,
  CommentIcon,
  ShareIcon,
  BookmarkIcon,
  UserIcon,
  VerifiedIcon,
} from '@/components/icons'
import { formatDistanceToNow } from '@/lib/utils/date'
import { formatNumber } from '@/lib/utils/number'
import { likeGif, unlikeGif } from '@/lib/feed/actions'
import { addComment } from '@/lib/feed/comments'
import type { FeedItem, CommentWithUser } from '@/types/database'

interface GifDetailViewProps {
  gif: FeedItem
  initialComments: {
    comments: CommentWithUser[]
    nextCursor: string | null
    hasMore: boolean
  }
}

export function GifDetailView({ gif, initialComments }: GifDetailViewProps) {
  const [isLiked, setIsLiked] = useState(gif.is_liked ?? false)
  const [likeCount, setLikeCount] = useState(gif.like_count)
  const [comments, setComments] = useState(initialComments.comments)
  const [commentCount, setCommentCount] = useState(gif.comment_count)
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showHeart, setShowHeart] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const lastTapRef = useRef<number>(0)
  const heartTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleDoubleTap = useCallback(async () => {
    if (!isLiked) {
      setIsLiked(true)
      setLikeCount((prev) => prev + 1)
      await likeGif(gif.id)
    }
    // Show heart animation
    setShowHeart(true)
    if (heartTimeoutRef.current) {
      clearTimeout(heartTimeoutRef.current)
    }
    heartTimeoutRef.current = setTimeout(() => {
      setShowHeart(false)
    }, 800)
  }, [isLiked, gif.id])

  const handleTap = useCallback(() => {
    const now = Date.now()
    const timeSinceLastTap = now - lastTapRef.current
    lastTapRef.current = now

    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      handleDoubleTap()
    }
  }, [handleDoubleTap])

  const handleLikeToggle = async () => {
    const wasLiked = isLiked
    setIsLiked(!wasLiked)
    setLikeCount((prev) => (wasLiked ? prev - 1 : prev + 1))

    try {
      if (wasLiked) {
        await unlikeGif(gif.id)
      } else {
        await likeGif(gif.id)
      }
    } catch {
      // Revert on error
      setIsLiked(wasLiked)
      setLikeCount((prev) => (wasLiked ? prev + 1 : prev - 1))
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: gif.title || 'Check out this GIF',
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const result = await addComment(gif.id, newComment)
      if (result.success && result.comment) {
        setComments((prev) => [result.comment!, ...prev])
        setCommentCount((prev) => prev + 1)
        setNewComment('')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const isVideo = gif.file_url.endsWith('.mp4') || gif.file_url.endsWith('.webm')
  const aspectRatio = gif.width && gif.height ? gif.width / gif.height : 16 / 9

  return (
    <div className="max-w-lg mx-auto">
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
            autoPlay
            className="w-full h-full object-contain"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gif.file_url}
            alt={gif.title || 'GIF'}
            className="w-full h-full object-contain"
          />
        )}

        {/* Double-tap heart animation */}
        {showHeart && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <HeartIcon size={100} filled className="text-red-500 animate-heart-pop" />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-5">
          <button
            onClick={handleLikeToggle}
            className="flex items-center gap-1.5"
            aria-label={isLiked ? 'Unlike' : 'Like'}
          >
            <HeartIcon
              size={26}
              filled={isLiked}
              className={isLiked ? 'text-red-500' : 'text-gray-400 hover:text-gray-200'}
            />
            <span
              className={`text-sm font-medium ${isLiked ? 'text-red-500' : 'text-gray-400'}`}
            >
              {formatNumber(likeCount)}
            </span>
          </button>

          <button className="flex items-center gap-1.5" aria-label="Comments">
            <CommentIcon size={26} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-400">
              {formatNumber(commentCount)}
            </span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5"
            aria-label="Share"
          >
            <ShareIcon size={24} className="text-gray-400 hover:text-gray-200" />
          </button>
        </div>

        <button className="p-1" aria-label="Save to collection">
          <BookmarkIcon size={26} className="text-gray-400 hover:text-gray-200" />
        </button>
      </div>

      {/* User info and description */}
      <div className="px-4 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3 mb-3">
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
              className="font-semibold hover:underline flex items-center gap-1"
            >
              {gif.user.display_name || gif.user.username}
              {gif.user.is_verified && (
                <VerifiedIcon size={16} className="text-blue-500" />
              )}
            </Link>
            <p className="text-gray-500 text-sm">
              @{gif.user.username} · {formatDistanceToNow(new Date(gif.created_at))}
            </p>
          </div>
          <button className="px-4 py-1.5 bg-white text-black rounded-full text-sm font-semibold hover:bg-gray-200 transition-colors">
            Follow
          </button>
        </div>

        {gif.title && <h1 className="font-semibold mb-1">{gif.title}</h1>}
        {gif.description && <p className="text-gray-300 text-sm">{gif.description}</p>}

        {/* YouTube source */}
        {gif.youtube_video_title && (
          <div className="mt-3 p-3 bg-gray-900 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Source</p>
            <p className="text-sm font-medium">{gif.youtube_video_title}</p>
            {gif.youtube_channel_name && (
              <p className="text-xs text-gray-400 mt-0.5">{gif.youtube_channel_name}</p>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
          <span>{formatNumber(gif.view_count)} views</span>
          {gif.share_count > 0 && <span>{formatNumber(gif.share_count)} shares</span>}
        </div>
      </div>

      {/* Comments section */}
      <div className="px-4 py-4">
        <h2 className="font-semibold mb-4">Comments ({formatNumber(commentCount)})</h2>

        {/* Add comment form */}
        <form onSubmit={handleSubmitComment} className="mb-6">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center shrink-0">
              <UserIcon size={16} className="text-white" />
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full bg-transparent border-b border-gray-800 pb-2 text-sm focus:outline-none focus:border-gray-600 placeholder-gray-500"
                maxLength={1000}
              />
              {newComment.trim() && (
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => setNewComment('')}
                    className="px-3 py-1 text-sm text-gray-400 hover:text-white mr-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1 bg-blue-500 hover:bg-blue-600 rounded-full text-sm font-medium disabled:opacity-50"
                  >
                    {isSubmitting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Comments list */}
        {comments.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CommentItem({ comment }: { comment: CommentWithUser }) {
  return (
    <div className="flex gap-3">
      <Link href={`/app/users/${comment.user.username}`} className="shrink-0">
        {comment.user.avatar_url ? (
          <img
            src={comment.user.avatar_url}
            alt={comment.user.display_name || comment.user.username}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center">
            <UserIcon size={14} className="text-white" />
          </div>
        )}
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/app/users/${comment.user.username}`}
            className="font-medium text-sm hover:underline"
          >
            {comment.user.display_name || comment.user.username}
          </Link>
          <span className="text-gray-500 text-xs">
            {formatDistanceToNow(new Date(comment.created_at))}
          </span>
        </div>
        <p className="text-sm text-gray-300 mt-0.5">{comment.content}</p>
        <div className="flex items-center gap-4 mt-1">
          <button className="text-xs text-gray-500 hover:text-gray-300">
            Like
          </button>
          <button className="text-xs text-gray-500 hover:text-gray-300">
            Reply
          </button>
        </div>
      </div>
    </div>
  )
}
