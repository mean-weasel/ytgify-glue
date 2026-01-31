'use client'

import { createContext, useEffect, useState, ReactNode } from 'react'
import {
  isNative,
  isIOS,
  isAndroid,
  isWeb,
  initStatusBar,
  initKeyboard,
  hideSplashScreen,
  triggerHapticFeedback,
  triggerHapticNotification,
} from './index'

interface CapacitorContextValue {
  isNative: boolean
  isIOS: boolean
  isAndroid: boolean
  isWeb: boolean
  isInitialized: boolean
  haptic: typeof triggerHapticFeedback
  hapticNotification: typeof triggerHapticNotification
}

const CapacitorContext = createContext<CapacitorContextValue>({
  isNative: false,
  isIOS: false,
  isAndroid: false,
  isWeb: true,
  isInitialized: false,
  haptic: async () => {},
  hapticNotification: async () => {},
})

interface CapacitorProviderProps {
  children: ReactNode
}

export function CapacitorProvider({ children }: CapacitorProviderProps) {
  const [state, setState] = useState({
    isNative: false,
    isIOS: false,
    isAndroid: false,
    isWeb: true,
    isInitialized: false,
  })

  useEffect(() => {
    const init = async () => {
      const native = isNative()
      const ios = isIOS()
      const android = isAndroid()
      const web = isWeb()

      setState({
        isNative: native,
        isIOS: ios,
        isAndroid: android,
        isWeb: web,
        isInitialized: true,
      })

      if (native) {
        await initStatusBar()
        await initKeyboard()
        // Small delay to ensure app is rendered
        setTimeout(async () => {
          await hideSplashScreen()
        }, 100)
      }
    }

    init()
  }, [])

  return (
    <CapacitorContext.Provider
      value={{
        ...state,
        haptic: triggerHapticFeedback,
        hapticNotification: triggerHapticNotification,
      }}
    >
      {children}
    </CapacitorContext.Provider>
  )
}
