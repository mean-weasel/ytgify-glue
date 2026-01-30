'use client'

import { ReactNode, useEffect, useRef } from 'react'
import { CapacitorProvider } from '@/lib/capacitor/CapacitorProvider'

interface SafeAreaWrapperProps {
  children: ReactNode
}

export function SafeAreaWrapper({ children }: SafeAreaWrapperProps) {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // Add viewport-fit=cover for iOS safe areas
    const viewport = document.querySelector('meta[name="viewport"]')
    if (viewport) {
      const content = viewport.getAttribute('content') || ''
      if (!content.includes('viewport-fit=cover')) {
        viewport.setAttribute('content', content + ', viewport-fit=cover')
      }
    }

    // Add safe area classes to body
    document.body.classList.add('safe-area-inset')
  }, [])

  return (
    <CapacitorProvider>
      <div className="safe-area-wrapper">
        {children}
      </div>
    </CapacitorProvider>
  )
}
