'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  UserIcon,
  VerifiedIcon,
  SettingsIcon,
} from '@/components/icons'
import { GifCard } from '@/components/gif'
import { formatNumber } from '@/lib/utils/number'
import { followUser, unfollowUser, getUserGifs, getUserLikedGifs } from '@/lib/users/actions'
import { likeGif, unlikeGif } from '@/lib/feed/actions'
import type { UserWithStats, FeedItem } from '@/types/database'

type TabType = 'gifs' | 'likes'

interface UserProfileViewProps {
  profile: UserWithStats
  initialGifs: {
    gifs: FeedItem[]
    nextCursor: string | null
    hasMore: boolean
  }
  isOwnProfile: boolean
}

export function UserProfileView({
  profile,
  initialGifs,
  isOwnProfile,
}: UserProfileViewProps) {
  const [isFollowing, setIsFollowing] = useState(profile.is_following ?? false)
  const [followerCount, setFollowerCount] = useState(profile.follower_count)
  const [activeTab, setActiveTab] = useState<TabType>('gifs')
  const [gifs, setGifs] = useState(initialGifs.gifs)
  const [likedGifs, setLikedGifs] = useState<FeedItem[]>([])
  const [isLoadingLikes, setIsLoadingLikes] = useState(false)
  const [likesLoaded, setLikesLoaded] = useState(false)
  const [isFollowLoading, setIsFollowLoading] = useState(false)

  const handleFollowToggle = async () => {
    if (isFollowLoading) return
    setIsFollowLoading(true)

    const wasFollowing = isFollowing
    setIsFollowing(!wasFollowing)
    setFollowerCount((prev) => (wasFollowing ? prev - 1 : prev + 1))

    try {
      if (wasFollowing) {
        await unfollowUser(profile.id)
      } else {
        await followUser(profile.id)
      }
    } catch {
      // Revert on error
      setIsFollowing(wasFollowing)
      setFollowerCount((prev) => (wasFollowing ? prev + 1 : prev - 1))
    } finally {
      setIsFollowLoading(false)
    }
  }

  const handleTabChange = async (tab: TabType) => {
    setActiveTab(tab)

    // Load likes on first click
    if (tab === 'likes' && !likesLoaded && isOwnProfile) {
      setIsLoadingLikes(true)
      try {
        const result = await getUserLikedGifs(profile.id)
        setLikedGifs(result.gifs)
        setLikesLoaded(true)
      } finally {
        setIsLoadingLikes(false)
      }
    }
  }

  const handleLike = async (gifId: string) => {
    await likeGif(gifId)
  }

  const handleUnlike = async (gifId: string) => {
    await unlikeGif(gifId)
  }

  const displayGifs = activeTab === 'gifs' ? gifs : likedGifs

  return (
    <div className="max-w-lg mx-auto">
      {/* Profile header */}
      <div className="px-4 py-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center shrink-0">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || profile.username}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <UserIcon size={36} className="text-white" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-bold truncate">
                {profile.display_name || profile.username}
              </h1>
              {profile.is_verified && (
                <VerifiedIcon size={18} className="text-blue-500 shrink-0" />
              )}
            </div>
            <p className="text-gray-400 text-sm">@{profile.username}</p>

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-3">
              {isOwnProfile ? (
                <>
                  <Link
                    href="/app/settings/profile"
                    className="flex-1 py-2 text-center border border-gray-700 hover:border-gray-500 rounded-lg text-sm font-medium transition-colors"
                  >
                    Edit Profile
                  </Link>
                  <Link
                    href="/app/settings"
                    className="p-2 border border-gray-700 hover:border-gray-500 rounded-lg transition-colors"
                    aria-label="Settings"
                  >
                    <SettingsIcon size={20} />
                  </Link>
                </>
              ) : (
                <button
                  onClick={handleFollowToggle}
                  disabled={isFollowLoading}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isFollowing
                      ? 'bg-gray-800 hover:bg-gray-700 text-white'
                      : 'bg-white hover:bg-gray-200 text-black'
                  } disabled:opacity-50`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm mt-4 text-gray-300">{profile.bio}</p>
        )}

        {/* Links */}
        {(profile.website || profile.twitter_handle || profile.youtube_channel) && (
          <div className="flex flex-wrap gap-3 mt-3 text-sm">
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                {new URL(profile.website).hostname}
              </a>
            )}
            {profile.twitter_handle && (
              <a
                href={`https://twitter.com/${profile.twitter_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                @{profile.twitter_handle}
              </a>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center">
            <div className="text-xl font-bold">{formatNumber(profile.gifs_count)}</div>
            <div className="text-xs text-gray-400">GIFs</div>
          </div>
          <button className="text-center hover:bg-gray-900 rounded-lg py-2 transition-colors">
            <div className="text-xl font-bold">{formatNumber(followerCount)}</div>
            <div className="text-xs text-gray-400">Followers</div>
          </button>
          <button className="text-center hover:bg-gray-900 rounded-lg py-2 transition-colors">
            <div className="text-xl font-bold">{formatNumber(profile.following_count)}</div>
            <div className="text-xs text-gray-400">Following</div>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800 sticky top-0 bg-black z-10">
        <div className="flex">
          <button
            onClick={() => handleTabChange('gifs')}
            className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
              activeTab === 'gifs'
                ? 'border-b-2 border-white'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            GIFs
          </button>
          {isOwnProfile && (
            <button
              onClick={() => handleTabChange('likes')}
              className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
                activeTab === 'likes'
                  ? 'border-b-2 border-white'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Likes
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {activeTab === 'likes' && isLoadingLikes ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-gray-600 border-t-white rounded-full animate-spin mx-auto" />
          </div>
        ) : displayGifs.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-900 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-2">
              {activeTab === 'gifs' ? 'No GIFs yet' : 'No liked GIFs'}
            </h2>
            <p className="text-gray-400 text-sm max-w-xs mx-auto">
              {activeTab === 'gifs'
                ? isOwnProfile
                  ? 'Create your first GIF using our browser extension.'
                  : 'This user hasn\'t created any GIFs yet.'
                : 'GIFs you like will appear here.'}
            </p>
            {isOwnProfile && activeTab === 'gifs' && (
              <Link
                href="/app/create"
                className="inline-block mt-4 px-6 py-2.5 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 rounded-full text-sm font-medium transition-all"
              >
                Create GIF
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayGifs.map((gif) => (
              <GifCard
                key={gif.id}
                gif={gif}
                onLike={handleLike}
                onUnlike={handleUnlike}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
