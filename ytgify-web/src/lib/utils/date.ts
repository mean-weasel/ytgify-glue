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
