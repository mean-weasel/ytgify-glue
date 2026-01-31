'use client'

import { useSyncExternalStore } from 'react'

function getIsMobile(): boolean {
  if (typeof window === 'undefined') return false
  const mobileMatch = window.matchMedia('(max-width: 768px)').matches
  const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
  return mobileMatch || isMobileDevice
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('resize', callback)
  return () => window.removeEventListener('resize', callback)
}

function getServerSnapshot(): boolean {
  return false
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getIsMobile, getServerSnapshot)
}
