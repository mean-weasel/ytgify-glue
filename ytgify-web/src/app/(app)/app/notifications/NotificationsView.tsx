'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  HeartIcon,
  CommentIcon,
  UserIcon,
  BellIcon,
} from '@/components/icons'
import { formatDistanceToNow } from '@/lib/utils/date'
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type NotificationWithActor,
} from '@/lib/notifications/actions'

interface NotificationsViewProps {
  initialData: {
    notifications: NotificationWithActor[]
    nextCursor: string | null
    hasMore: boolean
    unreadCount: number
  }
  userId: string
}

export function NotificationsView({ initialData, userId }: NotificationsViewProps) {
  const [notifications, setNotifications] = useState(initialData.notifications)
  const [unreadCount, setUnreadCount] = useState(initialData.unreadCount)
  const [cursor, setCursor] = useState(initialData.nextCursor)
  const [hasMore, setHasMore] = useState(initialData.hasMore)
  const [isLoading, setIsLoading] = useState(false)

  // Set up real-time subscription
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        async (payload) => {
          // Fetch the full notification with actor data
          const result = await getNotifications(undefined, 1)
          if (result.notifications.length > 0) {
            const newNotification = result.notifications[0]
            setNotifications((prev) => [newNotification, ...prev])
            setUnreadCount((prev) => prev + 1)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    try {
      const result = await getNotifications(cursor || undefined)
      setNotifications((prev) => [...prev, ...result.notifications])
      setCursor(result.nextCursor)
      setHasMore(result.hasMore)
    } finally {
      setIsLoading(false)
    }
  }, [cursor, hasMore, isLoading])

  const handleMarkAsRead = async (notificationId: string) => {
    const notification = notifications.find((n) => n.id === notificationId)
    if (!notification || notification.read_at) return

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
      )
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))

    await markNotificationAsRead(notificationId)
  }

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
    )
    setUnreadCount(0)

    await markAllNotificationsAsRead()
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-900 flex items-center justify-center">
          <BellIcon size={32} className="text-gray-600" />
        </div>
        <h2 className="text-lg font-semibold mb-2">No notifications yet</h2>
        <p className="text-gray-400 text-sm max-w-xs mx-auto">
          When someone likes, comments, or follows you, you&apos;ll see it here.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Header with mark all as read */}
      {unreadCount > 0 && (
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-400">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </span>
          <button
            onClick={handleMarkAllAsRead}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Mark all as read
          </button>
        </div>
      )}

      {/* Notifications list */}
      <div className="space-y-1">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onRead={handleMarkAsRead}
          />
        ))}
      </div>

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

function NotificationItem({
  notification,
  onRead,
}: {
  notification: NotificationWithActor
  onRead: (id: string) => void
}) {
  const isUnread = !notification.read_at

  const getNotificationContent = () => {
    switch (notification.action) {
      case 'like':
        return {
          icon: <HeartIcon size={16} filled className="text-red-500" />,
          text: 'liked your GIF',
          link: `/app/gifs/${notification.notifiable_id}`,
        }
      case 'comment':
        return {
          icon: <CommentIcon size={16} className="text-blue-400" />,
          text: 'commented on your GIF',
          link: `/app/gifs/${notification.notifiable_id}`,
        }
      case 'follow':
        return {
          icon: <UserIcon size={16} className="text-violet-400" />,
          text: 'started following you',
          link: `/app/users/${notification.actor.username}`,
        }
      case 'mention':
        return {
          icon: <CommentIcon size={16} className="text-green-400" />,
          text: 'mentioned you in a comment',
          link: `/app/gifs/${notification.notifiable_id}`,
        }
      case 'remix':
        return {
          icon: (
            <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ),
          text: 'remixed your GIF',
          link: `/app/gifs/${notification.notifiable_id}`,
        }
      default:
        return {
          icon: <BellIcon size={16} className="text-gray-400" />,
          text: 'sent you a notification',
          link: '#',
        }
    }
  }

  const { icon, text, link } = getNotificationContent()

  return (
    <Link
      href={link}
      onClick={() => onRead(notification.id)}
      className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
        isUnread ? 'bg-gray-900/50' : 'hover:bg-gray-900/30'
      }`}
    >
      {/* Actor avatar */}
      <div className="relative shrink-0">
        {notification.actor.avatar_url ? (
          <img
            src={notification.actor.avatar_url}
            alt={notification.actor.display_name || notification.actor.username}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center">
            <UserIcon size={18} className="text-white" />
          </div>
        )}
        {/* Icon badge */}
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-black flex items-center justify-center">
          {icon}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-semibold">
            {notification.actor.display_name || notification.actor.username}
          </span>{' '}
          <span className="text-gray-400">{text}</span>
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {formatDistanceToNow(new Date(notification.created_at))}
        </p>
      </div>

      {/* Unread indicator */}
      {isUnread && (
        <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />
      )}
    </Link>
  )
}
