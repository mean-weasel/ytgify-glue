// Capacitor native feature utilities
// These are safe to import even when not running in Capacitor

import { Capacitor } from '@capacitor/core'

// Check if running in native Capacitor app
export const isNative = () => Capacitor.isNativePlatform()

// Check specific platforms
export const isIOS = () => Capacitor.getPlatform() === 'ios'
export const isAndroid = () => Capacitor.getPlatform() === 'android'
export const isWeb = () => Capacitor.getPlatform() === 'web'

// Safe import wrappers for native plugins
export async function initStatusBar() {
  if (!isNative()) return

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#000000' })
  } catch (error) {
    console.warn('StatusBar plugin not available:', error)
  }
}

export async function initKeyboard() {
  if (!isNative()) return

  try {
    const { Keyboard } = await import('@capacitor/keyboard')
    // Configure keyboard behavior
    await Keyboard.setScroll({ isDisabled: false })
    await Keyboard.setAccessoryBarVisible({ isVisible: true })
  } catch (error) {
    console.warn('Keyboard plugin not available:', error)
  }
}

export async function triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light') {
  if (!isNative()) return

  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    const style = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    }[type]
    await Haptics.impact({ style })
  } catch {
    // Haptics not available, silently ignore
  }
}

export async function triggerHapticNotification(type: 'success' | 'warning' | 'error' = 'success') {
  if (!isNative()) return

  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics')
    const notificationType = {
      success: NotificationType.Success,
      warning: NotificationType.Warning,
      error: NotificationType.Error,
    }[type]
    await Haptics.notification({ type: notificationType })
  } catch {
    // Haptics not available, silently ignore
  }
}

export async function hideSplashScreen() {
  if (!isNative()) return

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch (error) {
    console.warn('SplashScreen plugin not available:', error)
  }
}
