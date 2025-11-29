# Phase 1: Authentication Flow (Chrome Extension)

**Duration:** Weeks 1-2
**Status:** Not Started
**Dependencies:** Phase 0 Complete
**Priority:** High
**Focus:** Chrome extension (`ytgify`) + backend (`ytgify-share`)

**Navigation:** [← Phase 0](./PHASE0_PRE_IMPLEMENTATION.md) | [Main Strategy](./BROWSER_EXTENSION_INTEGRATION_STRATEGY.md) | [Next: Phase 2 →](./PHASE2_GIF_UPLOAD.md)

---

## Goal

Enable users to authenticate with ytgify-share from browser extensions using JWT tokens. Build foundation for all subsequent phases by implementing:

1. Cross-browser storage abstraction layer
2. JWT-based API client with rate limit handling
3. Service worker lifecycle-aware token management
4. Authentication UI in extension popup

---

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│ Extension Popup (React)                     │
│  ├─ Login Form                              │
│  ├─ Signup Link (opens web app)            │
│  └─ User Profile Display                    │
└────────────────┬────────────────────────────┘
                 │
                 ↓ Uses
┌─────────────────────────────────────────────┐
│ API Client (src/lib/api-client.ts)         │
│  ├─ login()                                 │
│  ├─ register()                              │
│  ├─ refreshToken()                          │
│  └─ authenticatedRequest()                  │
└────────────────┬────────────────────────────┘
                 │
                 ↓ Uses
┌─────────────────────────────────────────────┐
│ Storage Adapter (src/lib/storage-adapter.ts)│
│  ├─ saveToken()                             │
│  ├─ getToken()                              │
│  ├─ clearToken()                            │
│  └─ savePreferences()                       │
└────────────────┬────────────────────────────┘
                 │
                 ↓ Stores in
┌─────────────────────────────────────────────┐
│ Browser Storage                             │
│  ├─ chrome.storage.local (JWT token)       │
│  └─ chrome.storage.sync (preferences)       │
│     or browser.storage.local (Firefox)      │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Background Service Worker                    │
│  ├─ Token Lifecycle Manager                 │
│  ├─ On Activation: Check token expiry       │
│  └─ Alarm (backup): Refresh every 10 min    │
└─────────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Create Storage Abstraction Layer

**File:** `ytgify/src/lib/storage-adapter.ts`

```typescript
/**
 * Cross-browser storage adapter
 * Handles differences between Chrome and Firefox storage APIs
 * 
 * Chrome: chrome.storage.local + chrome.storage.sync
 * Firefox: browser.storage.local only (no sync)
 */

export class StorageAdapter {
  /**
   * Detect which browser API is available
   */
  private static get api() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      return chrome.storage
    } else if (typeof browser !== 'undefined' && browser.storage) {
      return browser.storage
    }
    throw new Error('No storage API available')
  }

  /**
   * Check if running in Chrome (has sync storage)
   */
  private static get isChrome(): boolean {
    return typeof chrome !== 'undefined' && 
           chrome.storage && 
           chrome.storage.sync !== undefined
  }

  // ========================================
  // JWT Token Storage (Always Local)
  // ========================================

  /**
   * Save JWT token (always in local storage for security)
   * 
   * Why local not sync?
   * - Tokens are short-lived (15 min)
   * - Should not sync across devices (security)
   * - Each device should authenticate separately
   */
  static async saveToken(token: string): Promise<void> {
    await this.api.local.set({ jwtToken: token })
    console.log('✅ Token saved to local storage')
  }

  /**
   * Get JWT token from local storage
   */
  static async getToken(): Promise<string | null> {
    const result = await this.api.local.get('jwtToken')
    return result.jwtToken || null
  }

  /**
   * Clear JWT token (on logout)
   */
  static async clearToken(): Promise<void> {
    await this.api.local.remove('jwtToken')
    console.log('🗑️ Token cleared from storage')
  }

  /**
   * Check if token exists (quick auth check)
   */
  static async hasToken(): Promise<boolean> {
    const token = await this.getToken()
    return token !== null
  }

  // ========================================
  // User Preferences Storage
  // ========================================

  /**
   * Save user preferences
   * 
   * Chrome: Uses sync storage (syncs across devices)
   * Firefox: Falls back to local storage (no sync)
   */
  static async savePreferences(preferences: UserPreferences): Promise<void> {
    // Try to use sync storage if available (Chrome only)
    const storage = this.isChrome ? this.api.sync : this.api.local
    
    await storage.set({ userPreferences: preferences })
    
    const location = this.isChrome ? 'sync' : 'local'
    console.log(`✅ Preferences saved to ${location} storage`)
  }

  /**
   * Get user preferences
   */
  static async getPreferences(): Promise<UserPreferences | null> {
    // Try sync first (Chrome), fallback to local (Firefox)
    const storage = this.isChrome ? this.api.sync : this.api.local
    const result = await storage.get('userPreferences')
    return result.userPreferences || null
  }

  /**
   * Get preferences with defaults
   */
  static async getPreferencesWithDefaults(): Promise<UserPreferences> {
    const prefs = await this.getPreferences()
    return prefs || DEFAULT_PREFERENCES
  }

  // ========================================
  // User Profile Storage (from backend)
  // ========================================

  /**
   * Save user profile data (from /api/v1/auth/me)
   */
  static async saveUserProfile(profile: UserProfile): Promise<void> {
    await this.api.local.set({ userProfile: profile })
  }

  /**
   * Get cached user profile
   */
  static async getUserProfile(): Promise<UserProfile | null> {
    const result = await this.api.local.get('userProfile')
    return result.userProfile || null
  }

  /**
   * Clear all auth data (on logout)
   */
  static async clearAuthData(): Promise<void> {
    await this.api.local.remove(['jwtToken', 'userProfile'])
    console.log('🗑️ All auth data cleared')
  }
}

// ========================================
// Type Definitions
// ========================================

export interface UserPreferences {
  // GIF Creation
  encoderType: 'gifenc' | 'gifski' | 'gif.js'
  defaultPrivacy: 'public_access' | 'unlisted' | 'private_access'
  defaultFps: number
  
  // Upload Settings
  autoUpload: boolean
  uploadOnWifiOnly: boolean
  
  // UI Preferences
  theme: 'light' | 'dark' | 'system'
  
  // Notification Settings
  notificationPolling: boolean
  pollIntervalMinutes: number
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  encoderType: 'gifenc',
  defaultPrivacy: 'public_access',
  defaultFps: 15,
  autoUpload: true,
  uploadOnWifiOnly: false,
  theme: 'system',
  notificationPolling: true,
  pollIntervalMinutes: 2
}

export interface UserProfile {
  id: string
  email: string
  username: string
  display_name: string
  avatar_url: string | null
  is_verified: boolean
  created_at: string
}
```

**Testing:**
```typescript
// tests/unit/storage-adapter.test.ts
import { StorageAdapter } from '@/lib/storage-adapter'

describe('StorageAdapter', () => {
  beforeEach(async () => {
    // Clear storage before each test
    await chrome.storage.local.clear()
  })

  test('saveToken and getToken', async () => {
    const token = 'eyJ0eXAi...'
    await StorageAdapter.saveToken(token)
    
    const retrieved = await StorageAdapter.getToken()
    expect(retrieved).toBe(token)
  })

  test('hasToken returns true when token exists', async () => {
    await StorageAdapter.saveToken('test-token')
    expect(await StorageAdapter.hasToken()).toBe(true)
  })

  test('clearToken removes token', async () => {
    await StorageAdapter.saveToken('test-token')
    await StorageAdapter.clearToken()
    
    expect(await StorageAdapter.hasToken()).toBe(false)
  })

  test('preferences save and retrieve', async () => {
    const prefs = {
      encoderType: 'gifski' as const,
      defaultPrivacy: 'unlisted' as const,
      autoUpload: false,
      // ... other fields
    }
    
    await StorageAdapter.savePreferences(prefs)
    const retrieved = await StorageAdapter.getPreferences()
    
    expect(retrieved).toEqual(prefs)
  })
})
```

**Checklist:**
- [ ] Storage adapter implemented
- [ ] Unit tests passing
- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Type definitions exported

---

### Step 2: Implement API Client with Rate Limit Handling

**File:** `ytgify/src/lib/api-client.ts`

```typescript
import { StorageAdapter } from './storage-adapter'

/**
 * API Client for ytgify-share backend
 * 
 * Features:
 * - JWT authentication
 * - Automatic token refresh
 * - Rate limit handling (429 responses)
 * - Retry with exponential backoff
 * - CORS-compatible
 */
export class YtgifyApiClient {
  private baseURL: string
  
  constructor() {
    // TODO: Replace with your production URL
    this.baseURL = process.env.NODE_ENV === 'production'
      ? 'https://ytgify-share.com/api/v1'
      : 'http://localhost:3000/api/v1'
  }

  // ========================================
  // Authentication Methods
  // ========================================

  /**
   * Login with email and password
   * Returns JWT token and user data
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: { email, password }
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new APIError(error.message || 'Login failed', response.status)
    }

    const data = await response.json()
    
    // Store token and user profile
    await StorageAdapter.saveToken(data.token)
    await StorageAdapter.saveUserProfile(data.user)
    
    return data
  }

  /**
   * Register new user
   * Opens web app for full signup flow
   */
  async register(email: string, username: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${this.baseURL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: { email, username, password, password_confirmation: password }
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new APIError(
        error.details?.join(', ') || 'Registration failed', 
        response.status
      )
    }

    const data = await response.json()
    
    // Store token and user profile
    await StorageAdapter.saveToken(data.token)
    await StorageAdapter.saveUserProfile(data.user)
    
    return data
  }

  /**
   * Logout - revoke token on backend
   */
  async logout(): Promise<void> {
    try {
      await this.authenticatedRequest('/auth/logout', {
        method: 'DELETE'
      })
    } catch (error) {
      console.error('Logout error:', error)
      // Continue with local logout even if backend fails
    }
    
    // Clear local auth data
    await StorageAdapter.clearAuthData()
  }

  /**
   * Refresh JWT token
   * Returns new token with extended expiration
   */
  async refreshToken(): Promise<string> {
    const response = await this.authenticatedRequest('/auth/refresh', {
      method: 'POST'
    })

    const data = await response.json()
    
    // Store new token
    await StorageAdapter.saveToken(data.token)
    
    return data.token
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<UserProfile> {
    const response = await this.authenticatedRequest('/auth/me')
    const data = await response.json()
    
    // Update cached profile
    await StorageAdapter.saveUserProfile(data)
    
    return data
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    return await StorageAdapter.hasToken()
  }

  // ========================================
  // Authenticated Requests
  // ========================================

  /**
   * Make authenticated request with automatic retry and rate limit handling
   */
  async authenticatedRequest(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    const token = await StorageAdapter.getToken()
    if (!token) {
      throw new AuthError('Not authenticated')
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    // Handle 401 Unauthorized (token expired or invalid)
    if (response.status === 401) {
      // Clear token and throw auth error
      await StorageAdapter.clearAuthData()
      throw new AuthError('Authentication failed. Please login again.')
    }

    return response
  }

  /**
   * Make authenticated request WITH automatic retry and rate limit handling
   */
  async authenticatedRequestWithRetry(
    endpoint: string,
    options: RequestInit = {},
    maxRetries: number = 3
  ): Promise<Response> {
    let attempts = 0

    while (attempts < maxRetries) {
      try {
        const response = await this.authenticatedRequest(endpoint, options)

        // Handle 429 Rate Limited
        if (response.status === 429) {
          const retryAfter = this.getRetryAfter(response)
          
          // Notify user
          chrome.runtime.sendMessage({
            type: 'RATE_LIMITED',
            retryAfter: retryAfter
          })

          console.warn(`⏱️ Rate limited. Retrying after ${retryAfter}s`)
          
          // Wait for retry period
          await this.sleep(retryAfter * 1000)
          
          attempts++
          continue
        }

        // Success or non-retryable error
        return response

      } catch (error) {
        if (error instanceof AuthError) {
          // Don't retry auth errors
          throw error
        }

        attempts++

        if (attempts >= maxRetries) {
          throw error
        }

        // Exponential backoff for network errors
        const backoff = Math.pow(2, attempts) * 1000
        console.warn(`⏱️ Request failed. Retrying in ${backoff}ms...`)
        await this.sleep(backoff)
      }
    }

    throw new Error(`Max retries (${maxRetries}) exceeded`)
  }

  // ========================================
  // Helper Methods
  // ========================================

  /**
   * Get Retry-After header from 429 response
   */
  private getRetryAfter(response: Response): number {
    const retryAfter = response.headers.get('Retry-After')
    return retryAfter ? parseInt(retryAfter) : 60 // Default 60 seconds
  }

  /**
   * Sleep helper for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Decode JWT without verification (read payload only)
   */
  decodeToken(token: string): JWTPayload {
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format')
    }

    const payload = parts[1]
    const decoded = JSON.parse(atob(payload))
    return decoded
  }
}

// ========================================
// Error Classes
// ========================================

export class APIError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message)
    this.name = 'APIError'
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export class RateLimitError extends Error {
  constructor(message: string, public retryAfter: number) {
    super(message)
    this.name = 'RateLimitError'
  }
}

// ========================================
// Type Definitions
// ========================================

export interface LoginResponse {
  message: string
  token: string
  user: UserProfile
}

export interface JWTPayload {
  sub: string      // User ID
  jti: string      // JWT ID (for revocation)
  exp: number      // Expiration timestamp
}

// Singleton instance
export const apiClient = new YtgifyApiClient()
```

**Checklist:**
- [ ] API client implemented
- [ ] Login/logout methods working
- [ ] Rate limit handling (429) working
- [ ] Token refresh implemented
- [ ] Error classes defined
- [ ] Unit tests passing

---

### Step 3: Service Worker Lifecycle Management

**File:** `ytgify/src/background/token-manager.ts`

```typescript
import { apiClient } from '@/lib/api-client'
import { StorageAdapter } from '@/lib/storage-adapter'

/**
 * Token Manager for Chrome Service Worker Lifecycle
 * 
 * Problem: Chrome service workers terminate after 5 minutes idle
 * Solution: Check and refresh token on EVERY activation, not just alarms
 */
export class TokenManager {
  private static readonly TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000 // 5 minutes

  /**
   * Check and refresh token on service worker activation
   * 
   * Called when:
   * - Browser starts (chrome.runtime.onStartup)
   * - Extension installed/updated (chrome.runtime.onInstalled)
   * - Service worker wakes from termination
   */
  static async onServiceWorkerActivation(): Promise<void> {
    try {
      const token = await StorageAdapter.getToken()

      if (!token) {
        console.log('📋 No token stored')
        return
      }

      // Decode token to get expiration
      const decoded = apiClient.decodeToken(token)
      const expiresAt = decoded.exp * 1000 // Convert to milliseconds
      const now = Date.now()
      const timeUntilExpiry = expiresAt - now

      if (timeUntilExpiry < 0) {
        // Token already expired
        console.log('❌ Token expired. Clearing auth data.')
        await StorageAdapter.clearAuthData()
        
        // Notify popup to show login
        chrome.runtime.sendMessage({ type: 'TOKEN_EXPIRED' })
        return
      }

      if (timeUntilExpiry < this.TOKEN_REFRESH_THRESHOLD) {
        // Token expires soon, refresh immediately
        console.log(`⏱️ Token expires in ${Math.floor(timeUntilExpiry / 60000)} minutes. Refreshing...`)
        
        await apiClient.refreshToken()
        
        console.log('✅ Token refreshed successfully')
      } else {
        // Token still valid
        const minutesRemaining = Math.floor(timeUntilExpiry / 60000)
        console.log(`✅ Token valid for ${minutesRemaining} more minutes`)
      }
    } catch (error) {
      console.error('❌ Token check failed:', error)
      
      // If refresh fails, clear auth and prompt login
      await StorageAdapter.clearAuthData()
      chrome.runtime.sendMessage({ type: 'TOKEN_EXPIRED' })
    }
  }

  /**
   * Set up periodic token refresh (backup mechanism)
   * Alarm-based refresh as fallback in case activation checks miss
   */
  static async setupTokenRefreshAlarm(): Promise<void> {
    // Create alarm for every 10 minutes
    chrome.alarms.create('refreshToken', {
      periodInMinutes: 10
    })

    console.log('⏰ Token refresh alarm set (10 minute interval)')
  }

  /**
   * Handle token refresh alarm
   */
  static async onTokenRefreshAlarm(): Promise<void> {
    try {
      const hasToken = await StorageAdapter.hasToken()
      
      if (!hasToken) {
        console.log('📋 No token to refresh')
        return
      }

      await apiClient.refreshToken()
      console.log('✅ Token refreshed via alarm')
    } catch (error) {
      console.error('❌ Alarm-based token refresh failed:', error)
      await StorageAdapter.clearAuthData()
      chrome.runtime.sendMessage({ type: 'TOKEN_EXPIRED' })
    }
  }
}
```

**Background Script Integration:**

**File:** `ytgify/src/background/index.ts`

```typescript
import { TokenManager } from './token-manager'

// ========================================
// Service Worker Lifecycle Events
// ========================================

// Check token when browser starts
chrome.runtime.onStartup.addListener(async () => {
  console.log('🚀 Browser started, checking token...')
  await TokenManager.onServiceWorkerActivation()
})

// Check token when extension installed or updated
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log(`📦 Extension ${details.reason}, checking token...`)
  await TokenManager.onServiceWorkerActivation()
  
  // Set up refresh alarm
  await TokenManager.setupTokenRefreshAlarm()
})

// ========================================
// Alarm Listeners (Backup Mechanism)
// ========================================

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'refreshToken') {
    await TokenManager.onTokenRefreshAlarm()
  }
})

// ========================================
// Message Handlers
// ========================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle messages from popup/content scripts
  
  if (message.type === 'CHECK_AUTH') {
    // Check if user is authenticated
    (async () => {
      const hasToken = await StorageAdapter.hasToken()
      sendResponse({ authenticated: hasToken })
    })()
    return true // Async response
  }

  if (message.type === 'REFRESH_TOKEN') {
    // Manual token refresh requested
    (async () => {
      try {
        await apiClient.refreshToken()
        sendResponse({ success: true })
      } catch (error) {
        sendResponse({ success: false, error: error.message })
      }
    })()
    return true // Async response
  }
})

console.log('🎬 Background service worker initialized')
```

**Checklist:**
- [ ] Token manager implemented
- [ ] Service worker lifecycle handlers added
- [ ] Alarm-based refresh as backup
- [ ] Message handlers for auth checks
- [ ] Tested with service worker termination

---

### Step 4: Authentication UI in Popup

**File:** `ytgify/src/popup/components/AuthView.tsx`

```typescript
import React, { useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { StorageAdapter } from '@/lib/storage-adapter'

export const AuthView: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await apiClient.login(email, password)
      
      // Login successful, popup will refresh to show authenticated state
      window.location.reload()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Login failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSignupClick = () => {
    // Open web app for full signup flow
    chrome.tabs.create({
      url: 'https://ytgify-share.com/signup?source=extension'
    })
  }

  return (
    <div className="auth-view">
      <h2>Sign In to ytgify</h2>

      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <div className="error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="signup-prompt">
        <p>Don't have an account?</p>
        <button onClick={handleSignupClick} className="secondary">
          Create Account
        </button>
      </div>
    </div>
  )
}
```

**File:** `ytgify/src/popup/components/UserProfile.tsx`

```typescript
import React, { useEffect, useState } from 'react'
import { StorageAdapter, UserProfile } from '@/lib/storage-adapter'
import { apiClient } from '@/lib/api-client'

export const UserProfileView: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      // Try to get cached profile first
      let userProfile = await StorageAdapter.getUserProfile()
      
      if (!userProfile) {
        // Fetch from API if not cached
        userProfile = await apiClient.getCurrentUser()
      }
      
      setProfile(userProfile)
    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to log out?')) return

    try {
      await apiClient.logout()
      
      // Reload popup to show login view
      window.location.reload()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!profile) {
    return <div>Error loading profile</div>
  }

  return (
    <div className="user-profile">
      <div className="profile-header">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.username} />
        ) : (
          <div className="avatar-placeholder">
            {profile.username[0].toUpperCase()}
          </div>
        )}

        <div className="profile-info">
          <h3>{profile.display_name || profile.username}</h3>
          <p>@{profile.username}</p>
        </div>
      </div>

      <button onClick={handleLogout} className="logout-button">
        Sign Out
      </button>
    </div>
  )
}
```

**Main Popup Component:**

```typescript
import React, { useEffect, useState } from 'react'
import { AuthView } from './components/AuthView'
import { UserProfileView } from './components/UserProfile'
import { StorageAdapter } from '@/lib/storage-adapter'

export const Popup: React.FC = () => {
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()

    // Listen for auth state changes
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'TOKEN_EXPIRED') {
        setAuthenticated(false)
      }
    })
  }, [])

  const checkAuth = async () => {
    const hasToken = await StorageAdapter.hasToken()
    setAuthenticated(hasToken)
    setLoading(false)
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="popup">
      {authenticated ? <UserProfileView /> : <AuthView />}
    </div>
  )
}
```

**Checklist:**
- [ ] Auth view component created
- [ ] User profile view created
- [ ] Login form functional
- [ ] Signup button opens web app
- [ ] Logout functionality works
- [ ] State updates on auth changes

---

## Testing Strategy

### Unit Tests

**Test Files:**
- `tests/unit/storage-adapter.test.ts`
- `tests/unit/api-client.test.ts`
- `tests/unit/token-manager.test.ts`

**Key Test Scenarios:**
- Storage adapter saves/retrieves tokens correctly
- API client handles 401/429 responses
- Token manager refreshes expiring tokens
- Service worker activation checks token

### Integration Tests

**Test authenticated API calls:**
```typescript
test('login → authenticated request → logout flow', async () => {
  // 1. Login
  await apiClient.login('test@example.com', 'password123')
  
  // 2. Verify token stored
  const token = await StorageAdapter.getToken()
  expect(token).not.toBeNull()
  
  // 3. Make authenticated request
  const response = await apiClient.authenticatedRequest('/gifs')
  expect(response.ok).toBe(true)
  
  // 4. Logout
  await apiClient.logout()
  
  // 5. Verify token cleared
  const clearedToken = await StorageAdapter.getToken()
  expect(clearedToken).toBeNull()
})
```

### E2E Tests (Playwright)

**Chrome Extension:**
```typescript
// tests/e2e/auth-flow.spec.ts
test('user can login from extension', async ({ page, context }) => {
  // 1. Load extension
  const extensionId = await loadExtension(context)
  
  // 2. Open popup
  await page.goto(`chrome-extension://${extensionId}/popup.html`)
  
  // 3. Fill login form
  await page.fill('input[type="email"]', 'test@example.com')
  await page.fill('input[type="password"]', 'password123')
  
  // 4. Submit
  await page.click('button[type="submit"]')
  
  // 5. Verify authenticated state
  await page.waitForSelector('.user-profile')
  
  // 6. Verify token stored
  const token = await page.evaluate(async () => {
    const result = await chrome.storage.local.get('jwtToken')
    return result.jwtToken
  })
  
  expect(token).not.toBeNull()
})
```

**Firefox Extension (Selenium):**
```typescript
// Similar test using Selenium WebDriver
// See ytgify-firefox/tests/selenium/ for examples
```

### Manual Testing Checklist

- [ ] Open extension popup
- [ ] Click "Sign In"
- [ ] Enter valid credentials
- [ ] Verify successful login
- [ ] See user profile displayed
- [ ] Close and reopen popup (token persists)
- [ ] Wait 5+ minutes (service worker terminates)
- [ ] Open popup again (token still valid)
- [ ] Click "Sign Out"
- [ ] Verify logout successful
- [ ] Verify token cleared
- [ ] Test rate limiting (make many rapid API calls)
- [ ] Verify 429 error handling shows message
- [ ] Test with expired token (should prompt re-login)

---

## Deliverables

By the end of Phase 1, you should have:

- [x] Storage abstraction layer (Chrome/Firefox compatible)
- [x] API client with rate limit handling
- [x] Service worker lifecycle token management
- [x] Authentication UI in popup
- [x] Login/logout functionality
- [x] Token refresh mechanism
- [x] Unit tests passing (80%+ coverage)
- [x] E2E tests for auth flow (both browsers)
- [x] Documentation updated

---

## Common Issues & Solutions

### Issue: Token refresh fails after service worker restart
**Solution:**
- Ensure `onServiceWorkerActivation()` is called on `chrome.runtime.onStartup`
- Check that token is stored in `chrome.storage.local` (not in memory)
- Verify alarm is recreated on `chrome.runtime.onInstalled`

### Issue: CORS errors when calling API
**Solution:**
- Verify Phase 0 CORS configuration is complete
- Check that backend includes extension origin in allowed origins
- Test with `curl -v` to verify CORS headers

### Issue: 429 rate limit errors
**Solution:**
- This is expected behavior! Verify retry mechanism works
- Check that `Retry-After` header is respected
- Reduce request frequency if hitting limits too often

### Issue: Firefox storage.sync not working
**Solution:**
- This is expected! Firefox doesn't have sync storage
- Storage adapter should fallback to local storage automatically
- Verify `isChrome` detection works correctly

---

## Next Steps

Once Phase 1 is complete:

1. ✅ All tests passing
2. ✅ User can login/logout from extension
3. ✅ Token persists across service worker restarts
4. ✅ Rate limiting handled gracefully
5. → **[Proceed to Phase 2: GIF Cloud Upload](./PHASE2_GIF_UPLOAD.md)**

---

**Estimated Total Time:** 35-40 hours (Chrome only)
**Dependencies:** Phase 0 complete
**Blockers:** None (backend API ready)
**Firefox:** Will be implemented in Phase 5 (storage abstraction already handles both browsers)

**Status:** ⚠️ Ready to begin after Phase 0
