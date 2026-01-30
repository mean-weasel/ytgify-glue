'use server'

import { createClient } from '@/lib/supabase/server'
import type { FeedItem, FeedResponse, Gif, User } from '@/types/database'

const FEED_PAGE_SIZE = 20

// Type for GIF with joined user data from Supabase
type GifWithUser = Gif & {
  user: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url' | 'is_verified'>
}

/**
 * Fetch the main feed (public GIFs from followed users + trending)
 */
export async function getFeed(cursor?: string): Promise<FeedResponse> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { gifs: [], nextCursor: null, hasMore: false }
  }

  // Build query for public GIFs
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
    .eq('privacy', 'public')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(FEED_PAGE_SIZE)

  // Apply cursor pagination
  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching feed:', error)
    return { gifs: [], nextCursor: null, hasMore: false }
  }

  // Type assertion since Supabase types don't understand joins well
  const gifs = data as unknown as GifWithUser[] | null

  if (!gifs || gifs.length === 0) {
    return { gifs: [], nextCursor: null, hasMore: false }
  }

  // Get liked status for all GIFs in one query
  const gifIds = gifs.map((g) => g.id)
  const { data: likesData } = await supabase
    .from('likes')
    .select('gif_id')
    .eq('user_id', user.id)
    .in('gif_id', gifIds)

  const likes = likesData as { gif_id: string }[] | null
  const likedGifIds = new Set(likes?.map((l) => l.gif_id) || [])

  // Transform to FeedItem
  const feedItems: FeedItem[] = gifs.map((gif) => ({
    ...gif,
    user: gif.user as FeedItem['user'],
    is_liked: likedGifIds.has(gif.id),
  }))

  const hasMore = gifs.length === FEED_PAGE_SIZE
  const nextCursor = hasMore ? gifs[gifs.length - 1].created_at : null

  return {
    gifs: feedItems,
    nextCursor,
    hasMore,
  }
}

/**
 * Fetch trending GIFs (high engagement in recent time)
 */
export async function getTrendingFeed(cursor?: string): Promise<FeedResponse> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Trending query - sorted by engagement score
  // Score = (likes * 2) + (comments * 3) + (shares * 4) + views
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
    .eq('privacy', 'public')
    .is('deleted_at', null)
    // Only GIFs from the last 7 days for trending
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('like_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(FEED_PAGE_SIZE)

  // Apply offset pagination for trending (simpler than cursor)
  if (cursor) {
    const offset = parseInt(cursor, 10)
    if (!isNaN(offset)) {
      query = query.range(offset, offset + FEED_PAGE_SIZE - 1)
    }
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching trending feed:', error)
    return { gifs: [], nextCursor: null, hasMore: false }
  }

  // Type assertion since Supabase types don't understand joins well
  const gifs = data as unknown as GifWithUser[] | null

  if (!gifs || gifs.length === 0) {
    return { gifs: [], nextCursor: null, hasMore: false }
  }

  // Get liked status if user is logged in
  let likedGifIds = new Set<string>()
  if (user) {
    const gifIds = gifs.map((g) => g.id)
    const { data: likesData } = await supabase
      .from('likes')
      .select('gif_id')
      .eq('user_id', user.id)
      .in('gif_id', gifIds)

    const likes = likesData as { gif_id: string }[] | null
    likedGifIds = new Set(likes?.map((l) => l.gif_id) || [])
  }

  const feedItems: FeedItem[] = gifs.map((gif) => ({
    ...gif,
    user: gif.user as FeedItem['user'],
    is_liked: likedGifIds.has(gif.id),
  }))

  const hasMore = gifs.length === FEED_PAGE_SIZE
  const currentOffset = cursor ? parseInt(cursor, 10) : 0
  const nextCursor = hasMore ? String(currentOffset + FEED_PAGE_SIZE) : null

  return {
    gifs: feedItems,
    nextCursor,
    hasMore,
  }
}

/**
 * Like a GIF
 */
export async function likeGif(gifId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Type assertion needed due to Supabase type inference issues with Database generics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('likes').insert({
    user_id: user.id,
    gif_id: gifId,
  })

  if (error) {
    // Duplicate key means already liked - treat as success
    if (error.code === '23505') {
      return { success: true }
    }
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Unlike a GIF
 */
export async function unlikeGif(gifId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Type assertion needed due to Supabase type inference issues with Database generics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('likes')
    .delete()
    .eq('user_id', user.id)
    .eq('gif_id', gifId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Fetch a single GIF by ID
 */
export async function getGif(gifId: string): Promise<FeedItem | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
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
    .eq('id', gifId)
    .single()

  if (error || !data) {
    return null
  }

  // Type assertion since Supabase types don't understand joins well
  const gif = data as unknown as GifWithUser

  // Check if user liked this GIF
  let isLiked = false
  if (user) {
    const { data: like } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('gif_id', gifId)
      .single()

    isLiked = !!like
  }

  return {
    ...gif,
    user: gif.user as FeedItem['user'],
    is_liked: isLiked,
  }
}
