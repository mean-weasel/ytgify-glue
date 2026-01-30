'use client'

import { useEffect, useState } from 'react'
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

interface CapacitorState {
  isNative: boolean
  isIOS: boolean
  isAndroid: boolean
  isWeb: boolean
  isInitialized: boolean
}

export function useCapacitor() {
  const [state, setState] = useState<CapacitorState>({
    isNative: false,
    isIOS: false,
    isAndroid: false,
    isWeb: true,
    isInitialized: false,
  })

  useEffect(() => {
    // Initialize on mount
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
        // Initialize native plugins
        await initStatusBar()
        await initKeyboard()
        // Hide splash screen after app is ready
        await hideSplashScreen()
      }
    }

    init()
  }, [])

  return {
    ...state,
    haptic: triggerHapticFeedback,
    hapticNotification: triggerHapticNotification,
  }
}
