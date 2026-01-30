'use server'

import { createClient } from '@/lib/supabase/server'
import type { User, UserWithStats, FeedItem, Gif } from '@/types/database'

// Type for GIF with joined user data from Supabase
type GifWithUser = Gif & {
  user: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url' | 'is_verified'>
}

/**
 * Get a user profile by username
 */
export async function getUserByUsername(username: string): Promise<UserWithStats | null> {
  const supabase = await createClient()
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single()

  if (error || !data) {
    return null
  }

  // Type assertion since Supabase types have issues
  const profile = data as unknown as User

  // Check if current user is following this profile
  let isFollowing = false
  if (currentUser && currentUser.id !== profile.id) {
    const { data: follow } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', currentUser.id)
      .eq('following_id', profile.id)
      .single()

    isFollowing = !!follow
  }

  return {
    ...profile,
    is_following: isFollowing,
  }
}

/**
 * Get a user's GIFs
 */
export async function getUserGifs(
  userId: string,
  cursor?: string,
  limit = 20
): Promise<{
  gifs: FeedItem[]
  nextCursor: string | null
  hasMore: boolean
}> {
  const supabase = await createClient()
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  let query = supabase
    .from('gifs')
    .select(
      `
      *,
      user:users!user_id (
        id,
        username,
        display_name,
        avatar_url,
        is_verified
      )
    `
    )
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  // If viewing own profile, show all GIFs; otherwise only public
  if (!currentUser || currentUser.id !== userId) {
    query = query.eq('privacy', 'public')
  }

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching user gifs:', error)
    return { gifs: [], nextCursor: null, hasMore: false }
  }

  const gifs = data as unknown as GifWithUser[] | null

  if (!gifs || gifs.length === 0) {
    return { gifs: [], nextCursor: null, hasMore: false }
  }

  // Get liked status if user is logged in
  let likedGifIds = new Set<string>()
  if (currentUser) {
    const gifIds = gifs.map((g) => g.id)
    const { data: likesData } = await supabase
      .from('likes')
      .select('gif_id')
      .eq('user_id', currentUser.id)
      .in('gif_id', gifIds)

    const likes = likesData as { gif_id: string }[] | null
    likedGifIds = new Set(likes?.map((l) => l.gif_id) || [])
  }

  const feedItems: FeedItem[] = gifs.map((gif) => ({
    ...gif,
    user: gif.user as FeedItem['user'],
    is_liked: likedGifIds.has(gif.id),
  }))

  const hasMore = gifs.length === limit
  const nextCursor = hasMore ? gifs[gifs.length - 1].created_at : null

  return {
    gifs: feedItems,
    nextCursor,
    hasMore,
  }
}

/**
 * Get a user's liked GIFs
 */
export async function getUserLikedGifs(
  userId: string,
  cursor?: string,
  limit = 20
): Promise<{
  gifs: FeedItem[]
  nextCursor: string | null
  hasMore: boolean
}> {
  const supabase = await createClient()
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  // Only show liked GIFs if viewing own profile
  if (!currentUser || currentUser.id !== userId) {
    return { gifs: [], nextCursor: null, hasMore: false }
  }

  let query = supabase
    .from('likes')
    .select(
      `
      created_at,
      gif:gifs!gif_id (
        *,
        user:users!user_id (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        )
      )
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data: rawData, error } = await query

  if (error) {
    console.error('Error fetching liked gifs:', error)
    return { gifs: [], nextCursor: null, hasMore: false }
  }

  if (!rawData || rawData.length === 0) {
    return { gifs: [], nextCursor: null, hasMore: false }
  }

  // Type assertion for nested join
  type LikeWithGif = {
    created_at: string
    gif: GifWithUser | null
  }
  const data = rawData as unknown as LikeWithGif[]

  // Transform the nested structure
  const feedItems: FeedItem[] = data
    .filter((item) => item.gif)
    .map((item) => {
      const gif = item.gif as GifWithUser
      return {
        ...gif,
        user: gif.user as FeedItem['user'],
        is_liked: true, // User liked these, so they're all liked
      }
    })

  const hasMore = data.length === limit
  const nextCursor = hasMore ? data[data.length - 1].created_at : null

  return {
    gifs: feedItems,
    nextCursor,
    hasMore,
  }
}

/**
 * Follow a user
 */
export async function followUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  if (user.id === userId) {
    return { success: false, error: 'Cannot follow yourself' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('follows').insert({
    follower_id: user.id,
    following_id: userId,
  })

  if (error) {
    // Already following - treat as success
    if (error.code === '23505') {
      return { success: true }
    }
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Unfollow a user
 */
export async function unfollowUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Get followers of a user
 */
export async function getFollowers(
  userId: string,
  cursor?: string,
  limit = 20
): Promise<{
  users: User[]
  nextCursor: string | null
  hasMore: boolean
}> {
  const supabase = await createClient()

  let query = supabase
    .from('follows')
    .select(
      `
      created_at,
      follower:users!follower_id (*)
    `
    )
    .eq('following_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data: rawData, error } = await query

  if (error) {
    console.error('Error fetching followers:', error)
    return { users: [], nextCursor: null, hasMore: false }
  }

  if (!rawData || rawData.length === 0) {
    return { users: [], nextCursor: null, hasMore: false }
  }

  // Type assertion for nested join
  type FollowWithUser = {
    created_at: string
    follower: User | null
  }
  const data = rawData as unknown as FollowWithUser[]

  const users = data
    .filter((item) => item.follower)
    .map((item) => item.follower as User)

  const hasMore = data.length === limit
  const nextCursor = hasMore ? data[data.length - 1].created_at : null

  return { users, nextCursor, hasMore }
}

/**
 * Get users that a user is following
 */
export async function getFollowing(
  userId: string,
  cursor?: string,
  limit = 20
): Promise<{
  users: User[]
  nextCursor: string | null
  hasMore: boolean
}> {
  const supabase = await createClient()

  let query = supabase
    .from('follows')
    .select(
      `
      created_at,
      following:users!following_id (*)
    `
    )
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data: rawData, error } = await query

  if (error) {
    console.error('Error fetching following:', error)
    return { users: [], nextCursor: null, hasMore: false }
  }

  if (!rawData || rawData.length === 0) {
    return { users: [], nextCursor: null, hasMore: false }
  }

  // Type assertion for nested join
  type FollowWithUser = {
    created_at: string
    following: User | null
  }
  const data = rawData as unknown as FollowWithUser[]

  const users = data
    .filter((item) => item.following)
    .map((item) => item.following as User)

  const hasMore = data.length === limit
  const nextCursor = hasMore ? data[data.length - 1].created_at : null

  return { users, nextCursor, hasMore }
}
