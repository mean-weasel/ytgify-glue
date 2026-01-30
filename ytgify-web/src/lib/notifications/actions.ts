'use server'

import { createClient } from '@/lib/supabase/server'
import type { User, Notification } from '@/types/database'

// Notification with actor data
export type NotificationWithActor = Notification & {
  actor: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url' | 'is_verified'>
}

// Type for raw notification from Supabase
type NotificationRow = Notification & {
  actor: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url' | 'is_verified'>
}

/**
 * Get notifications for the current user
 */
export async function getNotifications(
  cursor?: string,
  limit = 20
): Promise<{
  notifications: NotificationWithActor[]
  nextCursor: string | null
  hasMore: boolean
  unreadCount: number
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { notifications: [], nextCursor: null, hasMore: false, unreadCount: 0 }
  }

  // Build query
  let query = supabase
    .from('notifications')
    .select(
      `
      *,
      actor:users!actor_id (
        id,
        username,
        display_name,
        avatar_url,
        is_verified
      )
    `
    )
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data: rawData, error } = await query

  if (error) {
    console.error('Error fetching notifications:', error)
    return { notifications: [], nextCursor: null, hasMore: false, unreadCount: 0 }
  }

  // Type assertion
  const data = rawData as unknown as NotificationRow[] | null

  if (!data || data.length === 0) {
    return { notifications: [], nextCursor: null, hasMore: false, unreadCount: 0 }
  }

  // Get unread count
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', user.id)
    .is('read_at', null)

  const notifications: NotificationWithActor[] = data.map((n) => ({
    ...n,
    actor: n.actor as NotificationWithActor['actor'],
  }))

  const hasMore = data.length === limit
  const nextCursor = hasMore ? data[data.length - 1].created_at : null

  return {
    notifications,
    nextCursor,
    hasMore,
    unreadCount: unreadCount || 0,
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return 0
  }

  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', user.id)
    .is('read_at', null)

  return count || 0
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(
  notificationId: string
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
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('recipient_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', user.id)
    .is('read_at', null)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
