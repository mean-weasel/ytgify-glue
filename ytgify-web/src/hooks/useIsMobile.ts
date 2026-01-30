'use client'

import { useEffect, useState } from 'react'

export function useIsMobile(): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    // Check media query and user agent
    const mobileMatch = window.matchMedia('(max-width: 768px)').matches
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )

    setIsMobile(mobileMatch || isMobileDevice)

    // Listen for window resize
    const handleResize = () => {
      const matches = window.matchMedia('(max-width: 768px)').matches
      setIsMobile(matches || isMobileDevice)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return isMobile
}
