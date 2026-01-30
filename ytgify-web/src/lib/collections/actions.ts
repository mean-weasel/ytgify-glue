'use server'

import { createClient } from '@/lib/supabase/server'
import type { User, Collection, Gif, FeedItem } from '@/types/database'

// Collection with cover GIF
export type CollectionWithCover = Collection & {
  cover_gif?: {
    id: string
    thumbnail_url: string | null
    file_url: string
  } | null
}

// Type for GIF with joined user data from Supabase
type GifWithUser = Gif & {
  user: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url' | 'is_verified'>
}

/**
 * Get all collections for the current user
 */
export async function getCollections(): Promise<{
  collections: CollectionWithCover[]
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { collections: [] }
  }

  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching collections:', error)
    return { collections: [] }
  }

  const collections = data as unknown as Collection[] | null

  if (!collections || collections.length === 0) {
    return { collections: [] }
  }

  // Get cover GIFs for each collection (first GIF)
  const collectionsWithCovers: CollectionWithCover[] = await Promise.all(
    collections.map(async (collection) => {
      const { data: coverData } = await supabase
        .from('collection_gifs')
        .select(`
          gif:gifs!gif_id (
            id,
            thumbnail_url,
            file_url
          )
        `)
        .eq('collection_id', collection.id)
        .order('position', { ascending: true })
        .limit(1)
        .single()

      const cover = coverData as unknown as { gif: { id: string; thumbnail_url: string | null; file_url: string } | null } | null

      return {
        ...collection,
        cover_gif: cover?.gif || null,
      }
    })
  )

  return { collections: collectionsWithCovers }
}

/**
 * Get a single collection by ID
 */
export async function getCollection(
  collectionId: string
): Promise<CollectionWithCover | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('id', collectionId)
    .single()

  if (error || !data) {
    return null
  }

  const collection = data as unknown as Collection

  // Check access - public collections are visible to all, private only to owner
  if (!collection.is_public && (!user || user.id !== collection.user_id)) {
    return null
  }

  // Get cover GIF
  const { data: coverData } = await supabase
    .from('collection_gifs')
    .select(`
      gif:gifs!gif_id (
        id,
        thumbnail_url,
        file_url
      )
    `)
    .eq('collection_id', collection.id)
    .order('position', { ascending: true })
    .limit(1)
    .single()

  const cover = coverData as unknown as { gif: { id: string; thumbnail_url: string | null; file_url: string } | null } | null

  return {
    ...collection,
    cover_gif: cover?.gif || null,
  }
}

/**
 * Get GIFs in a collection
 */
export async function getCollectionGifs(
  collectionId: string,
  cursor?: string,
  limit = 20
): Promise<{
  gifs: FeedItem[]
  nextCursor: string | null
  hasMore: boolean
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // First verify collection exists and user has access
  const { data: collectionData } = await supabase
    .from('collections')
    .select('id, user_id, is_public')
    .eq('id', collectionId)
    .single()

  if (!collectionData) {
    return { gifs: [], nextCursor: null, hasMore: false }
  }

  const collection = collectionData as unknown as { id: string; user_id: string; is_public: boolean }

  if (!collection.is_public && (!user || user.id !== collection.user_id)) {
    return { gifs: [], nextCursor: null, hasMore: false }
  }

  // Get collection GIFs with position-based cursor
  let query = supabase
    .from('collection_gifs')
    .select(`
      position,
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
    `)
    .eq('collection_id', collectionId)
    .order('position', { ascending: true })
    .limit(limit)

  if (cursor) {
    query = query.gt('position', parseInt(cursor, 10))
  }

  const { data: rawData, error } = await query

  if (error) {
    console.error('Error fetching collection gifs:', error)
    return { gifs: [], nextCursor: null, hasMore: false }
  }

  if (!rawData || rawData.length === 0) {
    return { gifs: [], nextCursor: null, hasMore: false }
  }

  // Type assertion for nested join
  type CollectionGifWithGif = {
    position: number
    gif: GifWithUser | null
  }
  const data = rawData as unknown as CollectionGifWithGif[]

  // Get liked status if user is logged in
  let likedGifIds = new Set<string>()
  if (user) {
    const gifIds = data.filter(item => item.gif).map(item => item.gif!.id)
    const { data: likesData } = await supabase
      .from('likes')
      .select('gif_id')
      .eq('user_id', user.id)
      .in('gif_id', gifIds)

    const likes = likesData as { gif_id: string }[] | null
    likedGifIds = new Set(likes?.map((l) => l.gif_id) || [])
  }

  const gifs: FeedItem[] = data
    .filter((item) => item.gif)
    .map((item) => {
      const gif = item.gif as GifWithUser
      return {
        ...gif,
        user: gif.user as FeedItem['user'],
        is_liked: likedGifIds.has(gif.id),
      }
    })

  const hasMore = data.length === limit
  const nextCursor = hasMore ? String(data[data.length - 1].position) : null

  return { gifs, nextCursor, hasMore }
}

/**
 * Create a new collection
 */
export async function createCollection(
  name: string,
  description?: string,
  isPublic = false
): Promise<{ success: boolean; collection?: Collection; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('collections')
    .insert({
      user_id: user.id,
      name,
      description: description || null,
      is_public: isPublic,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, collection: data as Collection }
}

/**
 * Update a collection
 */
export async function updateCollection(
  collectionId: string,
  updates: { name?: string; description?: string; is_public?: boolean }
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
    .from('collections')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', collectionId)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Delete a collection
 */
export async function deleteCollection(
  collectionId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // First delete all collection_gifs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('collection_gifs')
    .delete()
    .eq('collection_id', collectionId)

  // Then delete the collection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('collections')
    .delete()
    .eq('id', collectionId)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Add a GIF to a collection
 */
export async function addGifToCollection(
  collectionId: string,
  gifId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Verify user owns the collection
  const { data: collection } = await supabase
    .from('collections')
    .select('id, user_id, gifs_count')
    .eq('id', collectionId)
    .eq('user_id', user.id)
    .single()

  if (!collection) {
    return { success: false, error: 'Collection not found' }
  }

  const collectionData = collection as unknown as { id: string; user_id: string; gifs_count: number }

  // Get next position
  const { data: lastGif } = await supabase
    .from('collection_gifs')
    .select('position')
    .eq('collection_id', collectionId)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const nextPosition = lastGif ? (lastGif as { position: number }).position + 1 : 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('collection_gifs').insert({
    collection_id: collectionId,
    gif_id: gifId,
    position: nextPosition,
  })

  if (error) {
    // Already in collection - treat as success
    if (error.code === '23505') {
      return { success: true }
    }
    return { success: false, error: error.message }
  }

  // Update gifs_count
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('collections')
    .update({
      gifs_count: collectionData.gifs_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', collectionId)

  return { success: true }
}

/**
 * Remove a GIF from a collection
 */
export async function removeGifFromCollection(
  collectionId: string,
  gifId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Verify user owns the collection
  const { data: collection } = await supabase
    .from('collections')
    .select('id, user_id, gifs_count')
    .eq('id', collectionId)
    .eq('user_id', user.id)
    .single()

  if (!collection) {
    return { success: false, error: 'Collection not found' }
  }

  const collectionData = collection as unknown as { id: string; user_id: string; gifs_count: number }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('collection_gifs')
    .delete()
    .eq('collection_id', collectionId)
    .eq('gif_id', gifId)

  if (error) {
    return { success: false, error: error.message }
  }

  // Update gifs_count
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('collections')
    .update({
      gifs_count: Math.max(0, collectionData.gifs_count - 1),
      updated_at: new Date().toISOString(),
    })
    .eq('id', collectionId)

  return { success: true }
}

/**
 * Get user's collections for add-to-collection modal
 */
export async function getCollectionsForGif(gifId: string): Promise<{
  collections: (CollectionWithCover & { contains_gif: boolean })[]
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { collections: [] }
  }

  // Get all collections
  const { data: collectionsData } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (!collectionsData || collectionsData.length === 0) {
    return { collections: [] }
  }

  const collections = collectionsData as unknown as Collection[]

  // Get which collections contain this GIF
  const { data: containsData } = await supabase
    .from('collection_gifs')
    .select('collection_id')
    .eq('gif_id', gifId)
    .in('collection_id', collections.map(c => c.id))

  const containsGif = new Set(
    (containsData as { collection_id: string }[] | null)?.map(c => c.collection_id) || []
  )

  // Get cover GIFs
  const collectionsWithStatus = await Promise.all(
    collections.map(async (collection) => {
      const { data: coverData } = await supabase
        .from('collection_gifs')
        .select(`
          gif:gifs!gif_id (
            id,
            thumbnail_url,
            file_url
          )
        `)
        .eq('collection_id', collection.id)
        .order('position', { ascending: true })
        .limit(1)
        .single()

      const cover = coverData as unknown as { gif: { id: string; thumbnail_url: string | null; file_url: string } | null } | null

      return {
        ...collection,
        cover_gif: cover?.gif || null,
        contains_gif: containsGif.has(collection.id),
      }
    })
  )

  return { collections: collectionsWithStatus }
}
