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
