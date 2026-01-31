'use server'

import { createClient } from '@/lib/supabase/server'
import type { CommentWithUser, User } from '@/types/database'

// Type for comment with joined user data from Supabase
type CommentRow = {
  id: string
  user_id: string
  gif_id: string
  content: string
  parent_comment_id: string | null
  reply_count: number
  like_count: number
  deleted_at: string | null
  created_at: string
  updated_at: string
  user: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url' | 'is_verified'>
}

/**
 * Get comments for a GIF
 */
export async function getComments(
  gifId: string,
  cursor?: string,
  limit = 20
): Promise<{
  comments: CommentWithUser[]
  nextCursor: string | null
  hasMore: boolean
}> {
  const supabase = await createClient()

  let query = supabase
    .from('comments')
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
    .eq('gif_id', gifId)
    .is('deleted_at', null)
    .is('parent_comment_id', null) // Only top-level comments
    .order('created_at', { ascending: false })
    .limit(limit)

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching comments:', error)
    return { comments: [], nextCursor: null, hasMore: false }
  }

  const comments = data as unknown as CommentRow[] | null

  if (!comments || comments.length === 0) {
    return { comments: [], nextCursor: null, hasMore: false }
  }

  const commentsWithUser: CommentWithUser[] = comments.map((c) => ({
    ...c,
    user: c.user as CommentWithUser['user'],
  }))

  const hasMore = comments.length === limit
  const nextCursor = hasMore ? comments[comments.length - 1].created_at : null

  return {
    comments: commentsWithUser,
    nextCursor,
    hasMore,
  }
}

/**
 * Add a comment to a GIF
 */
export async function addComment(
  gifId: string,
  content: string,
  parentCommentId?: string
): Promise<{ success: boolean; comment?: CommentWithUser; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Validate content
  const trimmedContent = content.trim()
  if (!trimmedContent || trimmedContent.length > 1000) {
    return { success: false, error: 'Comment must be between 1 and 1000 characters' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('comments')
    .insert({
      user_id: user.id,
      gif_id: gifId,
      content: trimmedContent,
      parent_comment_id: parentCommentId || null,
    })
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
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  const comment = data as unknown as CommentRow

  return {
    success: true,
    comment: {
      ...comment,
      user: comment.user as CommentWithUser['user'],
    },
  }
}
