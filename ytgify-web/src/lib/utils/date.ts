/**
 * Date formatting utilities for YTgify
 */

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 30 * DAY
const YEAR = 365 * DAY

/**
 * Format a date as a relative time string (e.g., "2h", "3d", "1w")
 */
export function formatDistanceToNow(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < MINUTE) {
    return 'now'
  }

  if (diff < HOUR) {
    const minutes = Math.floor(diff / MINUTE)
    return `${minutes}m`
  }

  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR)
    return `${hours}h`
  }

  if (diff < WEEK) {
    const days = Math.floor(diff / DAY)
    return `${days}d`
  }

  if (diff < MONTH) {
    const weeks = Math.floor(diff / WEEK)
    return `${weeks}w`
  }

  if (diff < YEAR) {
    const months = Math.floor(diff / MONTH)
    return `${months}mo`
  }

  const years = Math.floor(diff / YEAR)
  return `${years}y`
}

/**
 * Format a date as a longer relative time string (e.g., "2 hours ago")
 */
export function formatDistanceToNowLong(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < MINUTE) {
    return 'just now'
  }

  if (diff < HOUR) {
    const minutes = Math.floor(diff / MINUTE)
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  }

  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR)
    return `${hours} hour${hours === 1 ? '' : 's'} ago`
  }

  if (diff < WEEK) {
    const days = Math.floor(diff / DAY)
    return `${days} day${days === 1 ? '' : 's'} ago`
  }

  if (diff < MONTH) {
    const weeks = Math.floor(diff / WEEK)
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`
  }

  if (diff < YEAR) {
    const months = Math.floor(diff / MONTH)
    return `${months} month${months === 1 ? '' : 's'} ago`
  }

  const years = Math.floor(diff / YEAR)
  return `${years} year${years === 1 ? '' : 's'} ago`
}

/**
 * Format a date for display (e.g., "Jan 15, 2024")
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format a date with time (e.g., "Jan 15, 2024 at 3:30 PM")
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Format duration in seconds to mm:ss or hh:mm:ss
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`
}
