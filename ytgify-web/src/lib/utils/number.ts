/**
 * Number formatting utilities for YTgify
 */

/**
 * Format a number with compact notation (e.g., 1.2K, 3.5M)
 */
export function formatNumber(num: number): string {
  if (num < 1000) {
    return num.toString()
  }

  if (num < 1000000) {
    const k = num / 1000
    return k >= 10 ? `${Math.floor(k)}K` : `${k.toFixed(1).replace(/\.0$/, '')}K`
  }

  if (num < 1000000000) {
    const m = num / 1000000
    return m >= 10 ? `${Math.floor(m)}M` : `${m.toFixed(1).replace(/\.0$/, '')}M`
  }

  const b = num / 1000000000
  return b >= 10 ? `${Math.floor(b)}B` : `${b.toFixed(1).replace(/\.0$/, '')}B`
}

/**
 * Format a number with full locale formatting (e.g., 1,234,567)
 */
export function formatNumberFull(num: number): string {
  return num.toLocaleString('en-US')
}

/**
 * Format file size in bytes to human readable (e.g., 1.5 MB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`
}

/**
 * Format a percentage (e.g., 0.1234 -> "12.3%")
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}
