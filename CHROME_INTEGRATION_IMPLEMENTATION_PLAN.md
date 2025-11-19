# Chrome Extension Integration Implementation Plan

**Date:** 2025-11-12
**Status:** UPDATED - Based on Actual Codebase State
**Target:** ytgify Chrome Extension → ytgify-share Backend
**Priority:** HIGH

---

## Document Purpose

This document provides a CORRECTED, phase-by-phase implementation plan based on the **ACTUAL current state** of the ytgify Chrome extension, replacing outdated assumptions in previous planning documents.

**Critical Update:** The extension codebase analysis reveals:
- NO IndexedDB (removed, cleanup runs on update)
- NO authentication (zero auth code exists)
- NO API client infrastructure
- GIFs download directly to Downloads folder (no local persistence)
- Only chrome.storage for preferences and engagement tracking

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Phase 0: Foundation Setup](#phase-0-foundation-setup)
3. [Phase 1: Authentication](#phase-1-authentication)
4. [Phase 2: GIF Upload](#phase-2-gif-upload)
5. [Phase 3: Social Features](#phase-3-social-features)
6. [Phase 4: Testing & Launch](#phase-4-testing--launch)
7. [Critical Decision Points](#critical-decision-points)
8. [Risk Assessment](#risk-assessment)

---

## Current State Analysis

### ytgify Chrome Extension (ACTUAL State)

**Location:** `/Users/jeremywatt/Desktop/ytgify-glue/ytgify`

**What EXISTS:**
- Content script with YouTube integration
- GIF creation pipeline (frame capture → encoding → download)
- React popup UI (minimal launcher + settings)
- Background service worker (message routing, job management)
- Engagement tracking (newsletter prompts, usage stats)
- E2E test infrastructure (Playwright)
- Well-structured message passing system

**What DOES NOT EXIST:**
- ❌ NO IndexedDB (removed in recent update)
- ❌ NO authentication code whatsoever
- ❌ NO API client
- ❌ NO cloud storage integration
- ❌ NO user profile management
- ❌ NO JWT token handling

**Current GIF Flow:**
```
User opens wizard on YouTube
  ↓
Selects time range, text overlay, settings
  ↓
GIF processor captures frames (gif-processor.ts)
  ↓
Encodes to GIF (gifenc/gifski/gif.js)
  ↓
Downloads to user's Downloads folder
  ↓
DONE (no persistence in extension)
```

**Current Storage:**
- `chrome.storage.sync`: User preferences (button visibility)
- `chrome.storage.local`: Engagement tracking data

**Popup UI:**
- Simple launcher with "Create GIF" button
- Settings toggle for YouTube button visibility
- Newsletter signup integration
- NO authentication UI

### ytgify-share Backend (Rails)

**Location:** `/Users/jeremywatt/Desktop/ytgify-glue/ytgify-share`

**Status:** ✅ API Complete and Tested

**Authentication API:**
- `POST /api/v1/auth/register` - Create account + JWT
- `POST /api/v1/auth/login` - Login + JWT (15min expiry)
- `DELETE /api/v1/auth/logout` - Revoke JWT
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Get user profile

**GIF API:**
- `POST /api/v1/gifs` - Create GIF (multipart/form-data)
  - Required: `gif[file]`, `gif[youtube_video_url]`
  - Optional: `gif[title]`, `gif[youtube_timestamp_start]`, `gif[youtube_timestamp_end]`, `gif[privacy]`, `gif[has_text_overlay]`, `gif[text_overlay_data]`
- `GET /api/v1/gifs/:id` - Get GIF details
- `PATCH /api/v1/gifs/:id` - Update GIF
- `DELETE /api/v1/gifs/:id` - Soft delete

**Social API:**
- Likes, comments, follows, collections (all functional)

**CORS:** Currently allows `*` origins (development setup)

**Storage:** S3 via ActiveStorage (configured via Doppler)

---

## Phase 0: Foundation Setup

**Duration:** 3-5 days
**Priority:** CRITICAL
**Status:** Prerequisites before any implementation

### Backend Tasks

#### Task 0.1: Update CORS for Chrome Extension

**File:** `ytgify-share/config/initializers/cors.rb`

**Current:**
```ruby
origins "*"
```

**Required Change:**
```ruby
# Development
origins "*"  # Keep for development

# Production - whitelist extension origins
# origins /chrome-extension:\/\/.*/,
#         'https://ytgify.com',
#         'https://www.ytgify.com'
```

**Action:** Document production CORS strategy (whitelist specific extension IDs post-Chrome Web Store submission)

**Checklist:**
- [ ] CORS configured for development
- [ ] Production strategy documented
- [ ] `Authorization` header exposed
- [ ] Preflight cache set (3600s)

#### Task 0.2: Environment Configuration

**Backend (.env):**
```bash
# Backend URL (for frontend to call)
API_BASE_URL=http://localhost:3000/api/v1  # dev
# API_BASE_URL=https://api.ytgify.com/api/v1  # prod

# JWT Settings
JWT_SECRET_KEY=<your-secret>  # Already configured
JWT_EXPIRATION_TIME=900  # 15 minutes

# S3 Settings (via Doppler)
AWS_ACCESS_KEY_ID=<configured>
AWS_SECRET_ACCESS_KEY=<configured>
AWS_S3_BUCKET=<configured>
AWS_S3_REGION=<configured>
```

**Extension (.env.development):**
```bash
# Backend API
REACT_APP_API_BASE_URL=http://localhost:3000/api/v1
```

**Extension (.env.production):**
```bash
# Backend API
REACT_APP_API_BASE_URL=https://api.ytgify.com/api/v1
```

**Checklist:**
- [ ] Backend .env configured
- [ ] Extension .env.development created
- [ ] Extension .env.production created
- [ ] Webpack configured to inject env vars
- [ ] Test connectivity: extension → backend

#### Task 0.3: Verify Backend Endpoints

**Test Suite:**
```bash
cd ytgify-share
bin/rails test test/controllers/api/v1/auth_controller_test.rb
bin/rails test test/controllers/api/v1/gifs_controller_test.rb
```

**Manual API Test:**
```bash
# Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"user":{"email":"test@example.com","username":"testuser","password":"password123","password_confirmation":"password123"}}'

# Response: {"message":"Registration successful","user":{...},"token":"eyJ..."}

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"user":{"email":"test@example.com","password":"password123"}}'

# Create GIF (multipart)
curl -X POST http://localhost:3000/api/v1/gifs \
  -H "Authorization: Bearer eyJ..." \
  -F "gif[file]=@test.gif" \
  -F "gif[title]=Test GIF" \
  -F "gif[youtube_video_url]=https://youtube.com/watch?v=dQw4w9WgXcQ"
```

**Checklist:**
- [ ] Auth endpoints return 200/201
- [ ] GIF upload returns 201
- [ ] S3 storage working
- [ ] JWT tokens valid format

### Extension Tasks

#### Task 0.4: Create API Base Infrastructure

**File Structure:**
```
ytgify/src/lib/
├── api/
│   ├── client.ts           # API client base class
│   ├── auth.ts             # Authentication endpoints
│   ├── gifs.ts             # GIF endpoints
│   ├── types.ts            # API request/response types
│   └── errors.ts           # API error classes
├── storage/
│   └── auth-storage.ts     # JWT token storage abstraction
└── config.ts               # API base URL from env
```

**File:** `ytgify/src/lib/config.ts`
```typescript
export const config = {
  apiBaseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api/v1',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
}
```

**File:** `ytgify/src/lib/api/types.ts`
```typescript
// Auth types
export interface LoginRequest {
  user: {
    email: string
    password: string
  }
}

export interface LoginResponse {
  message: string
  user: UserProfile
  token: string
}

export interface RegisterRequest {
  user: {
    email: string
    username: string
    password: string
    password_confirmation: string
    full_name?: string
  }
}

export interface UserProfile {
  id: string
  email: string
  username: string
  full_name: string | null
  bio: string | null
  avatar_url: string | null
  is_verified: boolean
  total_gifs_count: number
  follower_count: number
  following_count: number
  created_at: string
  updated_at: string
}

// GIF types
export interface CreateGifRequest {
  title?: string
  description?: string
  privacy?: 'public_access' | 'unlisted' | 'private_access'
  youtube_video_url: string
  youtube_video_title?: string
  youtube_channel_name?: string
  youtube_timestamp_start?: number
  youtube_timestamp_end?: number
  has_text_overlay?: boolean
  text_overlay_data?: string  // JSON string
  file: Blob
}

export interface GifResponse {
  id: string
  title: string
  file_url: string
  thumbnail_url: string
  privacy: string
  view_count: number
  like_count: number
  created_at: string
  user: {
    id: string
    username: string
    avatar_url: string | null
  }
}

// Error types
export interface APIErrorResponse {
  error: string
  message?: string
  details?: string[]
}
```

**File:** `ytgify/src/lib/api/errors.ts`
```typescript
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: string[]
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export class AuthenticationError extends APIError {
  constructor(message = 'Authentication required') {
    super(message, 401)
    this.name = 'AuthenticationError'
  }
}

export class RateLimitError extends APIError {
  constructor(
    message = 'Rate limit exceeded',
    public retryAfter?: number
  ) {
    super(message, 429)
    this.name = 'RateLimitError'
  }
}

export class NetworkError extends Error {
  constructor(message = 'Network request failed') {
    super(message)
    this.name = 'NetworkError'
  }
}
```

**Checklist:**
- [ ] Directory structure created
- [ ] Type definitions complete
- [ ] Error classes defined
- [ ] Config file reads env vars

#### Task 0.5: Update Webpack Configuration

**File:** `ytgify/webpack.config.js`

Add environment variable injection:

```javascript
const webpack = require('webpack')

module.exports = {
  // ... existing config
  plugins: [
    // ... existing plugins
    new webpack.DefinePlugin({
      'process.env.REACT_APP_API_BASE_URL': JSON.stringify(
        process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api/v1'
      ),
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    }),
  ],
}
```

**Checklist:**
- [ ] Webpack injects env vars
- [ ] Build succeeds
- [ ] Config accessible in extension

### Success Criteria

- [ ] Backend API endpoints tested and working
- [ ] CORS configured for extension origins
- [ ] Extension can reach backend (test with simple fetch)
- [ ] Environment variables loading correctly
- [ ] Directory structure created
- [ ] Type definitions complete

**Time Estimate:** 1-2 days

---

## Phase 1: Authentication

**Duration:** 1.5-2 weeks
**Priority:** HIGH
**Dependencies:** Phase 0 complete

### Critical Decision: Storage Strategy

**DECISION REQUIRED:** Where to store JWT tokens?

**Option 1: chrome.storage.local (RECOMMENDED)**
- ✅ Pros: Simple, fast, already used in extension
- ✅ Pros: Persists across service worker restarts
- ❌ Cons: Not encrypted (tokens readable by other extensions with storage permission)
- ❌ Cons: No cross-device sync

**Option 2: chrome.storage.sync**
- ✅ Pros: Syncs across user's devices
- ❌ Cons: Still not encrypted
- ❌ Cons: Sync creates security risk (token should be device-specific)
- ❌ Cons: Quota limits (100KB total)

**Option 3: IndexedDB (NOT VIABLE - removed from extension)**
- ❌ Extension deliberately removed IndexedDB
- ❌ Would require reverting architecture decision

**RECOMMENDATION:** Use `chrome.storage.local` with:
- Short token expiration (15min - already configured)
- Refresh mechanism (API supports `/auth/refresh`)
- Clear security documentation for users

### Implementation Tasks

#### Task 1.1: Create Auth Storage Module

**File:** `ytgify/src/lib/storage/auth-storage.ts`

```typescript
/**
 * Authentication Storage
 * 
 * Stores JWT tokens in chrome.storage.local
 * 
 * Security Notes:
 * - chrome.storage.local is NOT encrypted
 * - Tokens are short-lived (15 min)
 * - Tokens are device-specific (no sync)
 * - Clear on logout
 */

interface AuthData {
  token: string
  expiresAt: number  // Unix timestamp
  user: UserProfile
}

export class AuthStorage {
  private static STORAGE_KEY = 'ytgify_auth'

  /**
   * Save authentication data
   */
  static async saveAuth(token: string, user: UserProfile): Promise<void> {
    // Parse JWT to get expiration
    const payload = this.parseJWT(token)
    
    const authData: AuthData = {
      token,
      expiresAt: payload.exp * 1000,  // Convert to milliseconds
      user,
    }

    await chrome.storage.local.set({ [this.STORAGE_KEY]: authData })
    console.log('[AuthStorage] Auth data saved')
  }

  /**
   * Get authentication data (returns null if expired)
   */
  static async getAuth(): Promise<AuthData | null> {
    const result = await chrome.storage.local.get(this.STORAGE_KEY)
    const authData = result[this.STORAGE_KEY] as AuthData | undefined

    if (!authData) {
      return null
    }

    // Check if token expired
    if (Date.now() >= authData.expiresAt) {
      console.log('[AuthStorage] Token expired, clearing')
      await this.clearAuth()
      return null
    }

    return authData
  }

  /**
   * Get JWT token (returns null if expired)
   */
  static async getToken(): Promise<string | null> {
    const authData = await this.getAuth()
    return authData?.token || null
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    const authData = await this.getAuth()
    return authData !== null
  }

  /**
   * Get cached user profile
   */
  static async getUserProfile(): Promise<UserProfile | null> {
    const authData = await this.getAuth()
    return authData?.user || null
  }

  /**
   * Clear all auth data (logout)
   */
  static async clearAuth(): Promise<void> {
    await chrome.storage.local.remove(this.STORAGE_KEY)
    console.log('[AuthStorage] Auth data cleared')
  }

  /**
   * Parse JWT token (no verification, just decode payload)
   */
  private static parseJWT(token: string): { sub: string; jti: string; exp: number } {
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format')
    }

    const payload = JSON.parse(atob(parts[1]))
    return payload
  }

  /**
   * Check if token will expire soon (within 2 minutes)
   */
  static async shouldRefreshToken(): Promise<boolean> {
    const authData = await this.getAuth()
    if (!authData) return false

    const timeUntilExpiry = authData.expiresAt - Date.now()
    const twoMinutes = 2 * 60 * 1000

    return timeUntilExpiry < twoMinutes
  }
}
```

**Testing:**
```typescript
// tests/unit/auth-storage.test.ts
import { AuthStorage } from '@/lib/storage/auth-storage'
import { UserProfile } from '@/lib/api/types'

describe('AuthStorage', () => {
  const mockUser: UserProfile = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    // ... other fields
  }

  beforeEach(async () => {
    await chrome.storage.local.clear()
  })

  test('saveAuth and getAuth', async () => {
    const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImV4cCI6OTk5OTk5OTk5OX0.signature'
    
    await AuthStorage.saveAuth(token, mockUser)
    const authData = await AuthStorage.getAuth()

    expect(authData).not.toBeNull()
    expect(authData?.token).toBe(token)
    expect(authData?.user).toEqual(mockUser)
  })

  test('getAuth returns null for expired token', async () => {
    // Create expired token (exp in past)
    const expiredToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImV4cCI6MTAwMDAwMDAwMH0.signature'
    
    await AuthStorage.saveAuth(expiredToken, mockUser)
    const authData = await AuthStorage.getAuth()

    expect(authData).toBeNull()
  })

  test('clearAuth removes data', async () => {
    const token = 'valid-token'
    await AuthStorage.saveAuth(token, mockUser)
    
    await AuthStorage.clearAuth()
    const authData = await AuthStorage.getAuth()

    expect(authData).toBeNull()
  })
})
```

**Checklist:**
- [ ] AuthStorage module implemented
- [ ] Unit tests passing
- [ ] Handles expired tokens
- [ ] Clear on logout works

#### Task 1.2: Create API Client (Authentication Methods)

**File:** `ytgify/src/lib/api/client.ts`

```typescript
import { config } from '@/lib/config'
import { AuthStorage } from '@/lib/storage/auth-storage'
import { APIError, AuthenticationError, RateLimitError, NetworkError } from './errors'
import type { APIErrorResponse } from './types'

export class APIClient {
  private baseURL: string

  constructor() {
    this.baseURL = config.apiBaseUrl
  }

  /**
   * Make authenticated request with automatic token refresh
   */
  async authenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Check if token needs refresh
    if (await AuthStorage.shouldRefreshToken()) {
      console.log('[APIClient] Token expiring soon, refreshing...')
      try {
        await this.refreshToken()
      } catch (error) {
        console.error('[APIClient] Token refresh failed:', error)
        // Continue with existing token, might still be valid
      }
    }

    // Get current token
    const token = await AuthStorage.getToken()
    if (!token) {
      throw new AuthenticationError('No authentication token found')
    }

    // Add auth header
    const headers = new Headers(options.headers)
    headers.set('Authorization', `Bearer ${token}`)

    const response = await this.request<T>(endpoint, {
      ...options,
      headers,
    })

    return response
  }

  /**
   * Make unauthenticated request
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        throw new RateLimitError(
          'Rate limit exceeded',
          retryAfter ? parseInt(retryAfter) : undefined
        )
      }

      // Handle authentication errors
      if (response.status === 401) {
        await AuthStorage.clearAuth()
        throw new AuthenticationError('Authentication expired')
      }

      // Handle other errors
      if (!response.ok) {
        const error: APIErrorResponse = await response.json()
        throw new APIError(
          error.message || error.error || 'Request failed',
          response.status,
          error.details
        )
      }

      return await response.json()
    } catch (error) {
      if (error instanceof APIError) {
        throw error
      }
      
      // Network errors
      throw new NetworkError(
        error instanceof Error ? error.message : 'Network request failed'
      )
    }
  }

  /**
   * Refresh JWT token
   */
  private async refreshToken(): Promise<void> {
    const response = await this.authenticatedRequest<{ token: string }>(
      '/auth/refresh',
      { method: 'POST' }
    )

    const user = await AuthStorage.getUserProfile()
    if (!user) {
      throw new Error('No user profile in storage')
    }

    await AuthStorage.saveAuth(response.token, user)
  }
}

// Singleton instance
export const apiClient = new APIClient()
```

**Checklist:**
- [ ] API client base class implemented
- [ ] Automatic token refresh
- [ ] Rate limit handling
- [ ] Error handling comprehensive

#### Task 1.3: Implement Authentication API Methods

**File:** `ytgify/src/lib/api/auth.ts`

```typescript
import { apiClient } from './client'
import { AuthStorage } from '@/lib/storage/auth-storage'
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UserProfile,
} from './types'

export class AuthAPI {
  /**
   * Login with email and password
   */
  static async login(email: string, password: string): Promise<LoginResponse> {
    const request: LoginRequest = {
      user: { email, password },
    }

    const response = await apiClient.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(request),
    })

    // Save auth data
    await AuthStorage.saveAuth(response.token, response.user)

    console.log('[AuthAPI] Login successful:', response.user.username)
    return response
  }

  /**
   * Register new user
   */
  static async register(
    email: string,
    username: string,
    password: string,
    fullName?: string
  ): Promise<LoginResponse> {
    const request: RegisterRequest = {
      user: {
        email,
        username,
        password,
        password_confirmation: password,
        full_name: fullName,
      },
    }

    const response = await apiClient.request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(request),
    })

    // Save auth data
    await AuthStorage.saveAuth(response.token, response.user)

    console.log('[AuthAPI] Registration successful:', response.user.username)
    return response
  }

  /**
   * Logout (revoke token)
   */
  static async logout(): Promise<void> {
    try {
      await apiClient.authenticatedRequest('/auth/logout', {
        method: 'DELETE',
      })
    } catch (error) {
      console.error('[AuthAPI] Logout API call failed:', error)
      // Continue with local logout even if API fails
    }

    // Clear local auth data
    await AuthStorage.clearAuth()
    console.log('[AuthAPI] Logout complete')
  }

  /**
   * Get current user profile
   */
  static async getCurrentUser(): Promise<UserProfile> {
    const response = await apiClient.authenticatedRequest<{ user: UserProfile }>(
      '/auth/me'
    )

    // Update cached profile
    const token = await AuthStorage.getToken()
    if (token) {
      await AuthStorage.saveAuth(token, response.user)
    }

    return response.user
  }

  /**
   * Check if user is authenticated (local check, no API call)
   */
  static async isAuthenticated(): Promise<boolean> {
    return await AuthStorage.isAuthenticated()
  }

  /**
   * Get cached user profile (no API call)
   */
  static async getCachedUser(): Promise<UserProfile | null> {
    return await AuthStorage.getUserProfile()
  }
}
```

**Checklist:**
- [ ] Login method implemented
- [ ] Register method implemented
- [ ] Logout method implemented
- [ ] getCurrentUser implemented
- [ ] Token storage automatic

#### Task 1.4: Create Authentication UI in Popup

**Current Popup State:**
- File: `ytgify/src/popup/popup-modern.tsx`
- Simple launcher with "Create GIF" button
- Settings toggle
- Newsletter signup

**Required Changes:**

**File:** `ytgify/src/popup/components/AuthPanel.tsx` (NEW)

```typescript
import React, { useState, useEffect } from 'react'
import { AuthAPI } from '@/lib/api/auth'
import type { UserProfile } from '@/lib/api/types'

export const AuthPanel: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [showLogin, setShowLogin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    const authenticated = await AuthAPI.isAuthenticated()
    setIsAuthenticated(authenticated)

    if (authenticated) {
      const cachedUser = await AuthAPI.getCachedUser()
      setUser(cachedUser)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await AuthAPI.login(email, password)
      setUser(response.user)
      setIsAuthenticated(true)
      setShowLogin(false)
      
      // TODO: Trigger offline GIF sync
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await AuthAPI.logout()
      setUser(null)
      setIsAuthenticated(false)
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const openSignup = () => {
    // Open web app signup page
    chrome.tabs.create({ url: 'https://ytgify.com/users/sign_up' })
  }

  // Authenticated state
  if (isAuthenticated && user) {
    return (
      <div className="auth-panel authenticated">
        <div className="user-info">
          {user.avatar_url && (
            <img src={user.avatar_url} alt={user.username} className="avatar" />
          )}
          <div>
            <p className="username">{user.username}</p>
            <p className="email">{user.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          Sign Out
        </button>
      </div>
    )
  }

  // Login form
  if (showLogin) {
    return (
      <div className="auth-panel login-form">
        <h3>Sign In to YTGify</h3>
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
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <button onClick={() => setShowLogin(false)} className="back-btn">
          Back
        </button>
      </div>
    )
  }

  // Unauthenticated state
  return (
    <div className="auth-panel unauthenticated">
      <p>Sign in to upload GIFs to the cloud and access social features.</p>
      <button onClick={() => setShowLogin(true)} className="signin-btn">
        Sign In
      </button>
      <button onClick={openSignup} className="signup-btn">
        Create Account
      </button>
    </div>
  )
}
```

**Update:** `ytgify/src/popup/popup-modern.tsx`

Add `<AuthPanel />` to popup:

```typescript
import { AuthPanel } from './components/AuthPanel'

const PopupApp: React.FC = () => {
  // ... existing code
  
  return (
    <div className="popup-modern">
      {/* Existing header */}
      <div className="popup-header">...</div>
      
      {/* NEW: Authentication Panel */}
      <AuthPanel />
      
      {/* Existing settings */}
      <div className="popup-settings">...</div>
      
      {/* Existing main content */}
      <div className="popup-main">...</div>
    </div>
  )
}
```

**Checklist:**
- [ ] AuthPanel component created
- [ ] Login form functional
- [ ] User profile displays
- [ ] Logout works
- [ ] Signup opens web app

#### Task 1.5: Background Service Worker Token Management

**Challenge:** Chrome service workers auto-terminate after 5 minutes of inactivity. Need to ensure token is checked on worker activation.

**File:** `ytgify/src/background/auth-manager.ts` (NEW)

```typescript
import { AuthStorage } from '@/lib/storage/auth-storage'
import { AuthAPI } from '@/lib/api/auth'

export class AuthManager {
  /**
   * Initialize auth manager on service worker activation
   * Check token expiry and refresh if needed
   */
  static async initialize(): Promise<void> {
    console.log('[AuthManager] Initializing...')

    const isAuthenticated = await AuthStorage.isAuthenticated()
    if (!isAuthenticated) {
      console.log('[AuthManager] No authentication')
      return
    }

    // Check if token needs refresh
    const shouldRefresh = await AuthStorage.shouldRefreshToken()
    if (shouldRefresh) {
      console.log('[AuthManager] Token expiring, refreshing...')
      try {
        const token = await AuthStorage.getToken()
        if (token) {
          // Refresh via API client (will handle token update)
          await AuthAPI.getCurrentUser()
          console.log('[AuthManager] Token refreshed')
        }
      } catch (error) {
        console.error('[AuthManager] Token refresh failed:', error)
        await AuthStorage.clearAuth()
      }
    }

    // Set up periodic check alarm (backup to activation check)
    this.setupPeriodicCheck()
  }

  /**
   * Set up alarm to check token expiry every 10 minutes
   */
  private static setupPeriodicCheck(): void {
    chrome.alarms.create('token-check', {
      periodInMinutes: 10,
    })

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'token-check') {
        this.checkTokenExpiry()
      }
    })
  }

  /**
   * Check token expiry and refresh if needed
   */
  private static async checkTokenExpiry(): Promise<void> {
    const shouldRefresh = await AuthStorage.shouldRefreshToken()
    if (shouldRefresh) {
      try {
        await AuthAPI.getCurrentUser()
        console.log('[AuthManager] Token refreshed via alarm')
      } catch (error) {
        console.error('[AuthManager] Token refresh failed:', error)
      }
    }
  }
}
```

**Update:** `ytgify/src/background/index.ts`

```typescript
import { AuthManager } from './auth-manager'

// Initialize auth manager on service worker activation
chrome.runtime.onStartup.addListener(async () => {
  sharedLogger.info('[Background] Service worker startup')
  await AuthManager.initialize()
})

// Also initialize on install (first time)
chrome.runtime.onInstalled.addListener(async (details) => {
  // ... existing code
  await AuthManager.initialize()
})
```

**Update manifest.json permissions:**
```json
{
  "permissions": [
    "storage",
    "tabs",
    "activeTab",
    "downloads",
    "alarms"  // NEW: for token refresh alarm
  ],
  "host_permissions": [
    "https://*.youtube.com/*",
    "http://localhost:*/*",
    "https://ytgify.com/*"  // NEW: for API calls
  ]
}
```

**Checklist:**
- [ ] AuthManager implemented
- [ ] Initializes on service worker startup
- [ ] Alarm-based backup check
- [ ] Manifest permissions updated

### Testing Strategy

#### Unit Tests

**Auth Storage:**
- [ ] Token save/retrieve
- [ ] Expired token handling
- [ ] Clear auth data
- [ ] shouldRefreshToken logic

**API Client:**
- [ ] Request with auth header
- [ ] Token refresh on expiry
- [ ] Error handling (401, 429, network)
- [ ] Rate limit retry logic

**Auth API:**
- [ ] Login success
- [ ] Login failure (invalid credentials)
- [ ] Register success
- [ ] Logout clears storage

#### Integration Tests

**Extension → Backend:**
- [ ] Login flow end-to-end
- [ ] Token stored in chrome.storage.local
- [ ] Authenticated request includes Bearer token
- [ ] Token refresh before expiry
- [ ] Logout revokes token

#### E2E Tests (Playwright)

**File:** `ytgify/tests/e2e/auth-flow.spec.ts` (NEW)

```typescript
import { test, expect } from './fixtures'

test.describe('Authentication Flow', () => {
  test('should login and store token', async ({ page, extensionId }) => {
    // Navigate to popup
    await page.goto(`chrome-extension://${extensionId}/popup.html`)

    // Click "Sign In"
    await page.click('button:has-text("Sign In")')

    // Fill login form
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Wait for login success
    await expect(page.locator('.username')).toHaveText('testuser')

    // Verify token stored
    const token = await page.evaluate(async () => {
      const result = await chrome.storage.local.get('ytgify_auth')
      return result.ytgify_auth?.token
    })

    expect(token).toBeTruthy()
    expect(token).toMatch(/^eyJ/) // JWT starts with eyJ
  })

  test('should logout and clear token', async ({ page, extensionId }) => {
    // ... login first

    // Click logout
    await page.click('button:has-text("Sign Out")')

    // Verify unauthenticated state
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible()

    // Verify token cleared
    const token = await page.evaluate(async () => {
      const result = await chrome.storage.local.get('ytgify_auth')
      return result.ytgify_auth
    })

    expect(token).toBeUndefined()
  })
})
```

**Checklist:**
- [ ] Unit tests passing (90%+ coverage)
- [ ] Integration tests passing
- [ ] E2E auth flow test passing
- [ ] Manual testing complete

### Success Criteria

- [ ] Users can sign in from popup
- [ ] JWT token stored securely in chrome.storage.local
- [ ] Token auto-refreshes before expiry
- [ ] Service worker handles token lifecycle
- [ ] Logout clears all auth data
- [ ] Error messages user-friendly
- [ ] E2E tests passing

**Time Estimate:** 40-60 hours

---

## Phase 2: GIF Upload

**Duration:** 1.5-2 weeks
**Priority:** HIGH
**Dependencies:** Phase 1 complete

### Critical Decision: Storage Strategy

**DECISION REQUIRED:** What to do about storage post-upload?

**Current State:**
- GIFs download to Downloads folder
- NO local persistence
- NO IndexedDB (removed)

**Options:**

**Option 1: No Local Storage (Cloud-Only)**
- ✅ Pros: Simplest, matches current architecture
- ✅ Pros: No storage management needed
- ✅ Pros: Users access GIFs via web app
- ❌ Cons: Can't view GIFs in extension
- ❌ Cons: No offline access

**Option 2: Re-introduce IndexedDB (Hybrid Storage)**
- ✅ Pros: Can view GIFs in extension popup
- ✅ Pros: Offline access
- ❌ Cons: Requires reverting architecture decision
- ❌ Cons: Storage management complexity
- ❌ Cons: Sync logic needed

**Option 3: Download + Upload (Current + Cloud)**
- ✅ Pros: User gets local file
- ✅ Pros: Cloud backup
- ✅ Pros: No extension storage needed
- ❌ Cons: Redundant (file in Downloads + cloud)

**RECOMMENDATION:** Option 1 (Cloud-Only) OR Option 3 (Download + Upload)

**Option 3 Implementation:** After successful upload, offer "Download GIF" button on success screen. This gives user a local copy if desired, without requiring extension storage.

### Implementation Tasks

#### Task 2.1: Update GIF Processor to Extract YouTube Metadata

**File:** `ytgify/src/content/gif-processor.ts`

**Current:** GIF processor creates GIF blob and downloads it.

**Required:** Extract and return metadata for API upload.

```typescript
// Add to existing GifProcessingResult interface
export interface GifProcessingResult {
  blob: Blob
  metadata: {
    fileSize: number
    duration: number
    frameCount: number
    width: number
    height: number
    id: string
    
    // NEW: YouTube context
    youtubeVideoUrl: string
    youtubeVideoTitle: string
    youtubeChannelName: string
    youtubeTimestampStart: number
    youtubeTimestampEnd: number
  }
}

// Update processVideoToGif method
public async processVideoToGif(
  videoElement: HTMLVideoElement,
  options: GifProcessingOptions,
  youtubeContext: YouTubeContext,  // NEW parameter
  onProgress?: (stageInfo: StageProgressInfo) => void
): Promise<GifProcessingResult> {
  // ... existing frame capture and encoding

  const metadata = {
    fileSize: gifBlob.size,
    duration: options.endTime - options.startTime,
    frameCount: frames.length,
    width: frames[0]?.width || 320,
    height: frames[0]?.height || 240,
    id: `gif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    
    // NEW: YouTube metadata
    youtubeVideoUrl: youtubeContext.videoUrl,
    youtubeVideoTitle: youtubeContext.videoTitle,
    youtubeChannelName: youtubeContext.channelName,
    youtubeTimestampStart: options.startTime,
    youtubeTimestampEnd: options.endTime,
  }

  return { blob: gifBlob, metadata }
}
```

**Add YouTube context extraction:**

**File:** `ytgify/src/content/youtube-metadata.ts` (NEW)

```typescript
export interface YouTubeContext {
  videoUrl: string
  videoId: string
  videoTitle: string
  channelName: string
}

export class YouTubeMetadata {
  /**
   * Extract YouTube context from current page
   */
  static getCurrentContext(): YouTubeContext {
    const url = window.location.href
    const videoId = this.extractVideoId(url)
    const videoTitle = this.getVideoTitle()
    const channelName = this.getChannelName()

    return {
      videoUrl: url,
      videoId,
      videoTitle,
      channelName,
    }
  }

  private static extractVideoId(url: string): string {
    const match = url.match(/[?&]v=([^&]+)/)
    return match ? match[1] : ''
  }

  private static getVideoTitle(): string {
    // Try multiple selectors for video title
    const selectors = [
      'h1.ytd-watch-metadata yt-formatted-string',
      'h1.title.style-scope.ytd-video-primary-info-renderer',
      'h1.ytd-video-primary-info-renderer',
    ]

    for (const selector of selectors) {
      const element = document.querySelector(selector)
      if (element?.textContent) {
        return element.textContent.trim()
      }
    }

    return 'Unknown Video'
  }

  private static getChannelName(): string {
    const selectors = [
      'ytd-channel-name#channel-name a',
      'a.yt-simple-endpoint.style-scope.yt-formatted-string',
    ]

    for (const selector of selectors) {
      const element = document.querySelector(selector)
      if (element?.textContent) {
        return element.textContent.trim()
      }
    }

    return 'Unknown Channel'
  }
}
```

**Checklist:**
- [ ] GIF processor returns YouTube metadata
- [ ] YouTube metadata extraction working
- [ ] Video title captured
- [ ] Channel name captured

#### Task 2.2: Implement GIF Upload API

**File:** `ytgify/src/lib/api/gifs.ts` (NEW)

```typescript
import { apiClient } from './client'
import type { CreateGifRequest, GifResponse } from './types'

export class GifsAPI {
  /**
   * Upload GIF to backend
   */
  static async createGif(
    gifBlob: Blob,
    metadata: {
      title?: string
      description?: string
      privacy?: 'public_access' | 'unlisted' | 'private_access'
      youtubeVideoUrl: string
      youtubeVideoTitle: string
      youtubeChannelName: string
      youtubeTimestampStart: number
      youtubeTimestampEnd: number
      hasTextOverlay?: boolean
      textOverlayData?: string
    }
  ): Promise<GifResponse> {
    // Create FormData (multipart/form-data)
    const formData = new FormData()

    // File
    formData.append('gif[file]', gifBlob, 'ytgify.gif')

    // Required fields
    formData.append('gif[youtube_video_url]', metadata.youtubeVideoUrl)

    // Optional fields
    if (metadata.title) {
      formData.append('gif[title]', metadata.title)
    }
    if (metadata.description) {
      formData.append('gif[description]', metadata.description)
    }
    if (metadata.privacy) {
      formData.append('gif[privacy]', metadata.privacy)
    }
    
    formData.append('gif[youtube_video_title]', metadata.youtubeVideoTitle)
    formData.append('gif[youtube_channel_name]', metadata.youtubeChannelName)
    formData.append('gif[youtube_timestamp_start]', metadata.youtubeTimestampStart.toString())
    formData.append('gif[youtube_timestamp_end]', metadata.youtubeTimestampEnd.toString())

    if (metadata.hasTextOverlay) {
      formData.append('gif[has_text_overlay]', 'true')
      formData.append('gif[text_overlay_data]', metadata.textOverlayData || '')
    }

    // Make authenticated request
    // NOTE: Don't set Content-Type header - browser sets it with boundary
    const response = await fetch(`${apiClient['baseURL']}/gifs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await AuthStorage.getToken()}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new APIError(
        error.message || 'Upload failed',
        response.status,
        error.details
      )
    }

    const data = await response.json()
    return data.gif
  }

  /**
   * Get GIF by ID
   */
  static async getGif(id: string): Promise<GifResponse> {
    const response = await apiClient.authenticatedRequest<{ gif: GifResponse }>(
      `/gifs/${id}`
    )
    return response.gif
  }

  /**
   * List user's GIFs
   */
  static async listMyGifs(page = 1, perPage = 20): Promise<GifResponse[]> {
    const user = await AuthStorage.getUserProfile()
    if (!user) {
      throw new Error('Not authenticated')
    }

    const response = await apiClient.authenticatedRequest<{
      gifs: GifResponse[]
      pagination: { page: number; per_page: number; total: number }
    }>(`/gifs?user_id=${user.id}&page=${page}&per_page=${perPage}`)

    return response.gifs
  }
}
```

**Checklist:**
- [ ] createGif method implemented
- [ ] FormData construction correct
- [ ] Multipart upload working
- [ ] Error handling comprehensive

#### Task 2.3: Integrate Upload into GIF Creation Flow

**Update:** `ytgify/src/content/index.ts` (or wherever GIF creation is triggered)

**Current Flow:**
```
User completes wizard
  ↓
GIF created (blob)
  ↓
Downloaded to Downloads folder
  ↓
Success screen shown
```

**New Flow:**
```
User completes wizard
  ↓
GIF created (blob + metadata)
  ↓
Check if authenticated
  ├─ YES: Upload to cloud → Success screen (with cloud link)
  └─ NO: Download to Downloads → Success screen (with "Sign in to save online" prompt)
```

**Implementation:**

```typescript
import { AuthAPI } from '@/lib/api/auth'
import { GifsAPI } from '@/lib/api/gifs'
import { YouTubeMetadata } from './youtube-metadata'

async function handleGifCreation(params: GifCreationParams) {
  // Extract YouTube context
  const youtubeContext = YouTubeMetadata.getCurrentContext()

  // Create GIF with metadata
  const { blob, metadata } = await gifProcessor.processVideoToGif(
    videoElement,
    params,
    youtubeContext,
    onProgress
  )

  // Check authentication
  const isAuthenticated = await AuthAPI.isAuthenticated()

  if (isAuthenticated) {
    // Upload to cloud
    try {
      const uploadedGif = await GifsAPI.createGif(blob, {
        title: params.title,
        privacy: params.privacy || 'public_access',
        youtubeVideoUrl: metadata.youtubeVideoUrl,
        youtubeVideoTitle: metadata.youtubeVideoTitle,
        youtubeChannelName: metadata.youtubeChannelName,
        youtubeTimestampStart: metadata.youtubeTimestampStart,
        youtubeTimestampEnd: metadata.youtubeTimestampEnd,
        hasTextOverlay: params.textOverlays && params.textOverlays.length > 0,
        textOverlayData: params.textOverlays ? JSON.stringify(params.textOverlays) : undefined,
      })

      // Show success with cloud GIF link
      showSuccessScreen({
        type: 'cloud',
        gifUrl: uploadedGif.file_url,
        gifId: uploadedGif.id,
        blob: blob,  // Optional: still offer download
      })

      console.log('✅ GIF uploaded to cloud:', uploadedGif.id)
    } catch (error) {
      console.error('❌ Upload failed:', error)
      
      // Fallback: download locally
      await gifProcessor.downloadGif(blob, params.title)
      
      showSuccessScreen({
        type: 'local',
        error: 'Upload failed. GIF saved to Downloads.',
      })
    }
  } else {
    // Not authenticated: download locally
    await gifProcessor.downloadGif(blob, params.title)
    
    showSuccessScreen({
      type: 'local',
      prompt: 'Sign in to save GIFs online and share them!',
    })
  }
}
```

**Checklist:**
- [ ] Upload integrated into creation flow
- [ ] Authenticated users upload automatically
- [ ] Unauthenticated users download locally
- [ ] Error handling with fallback to download

#### Task 2.4: Update Success Screen

**File:** `ytgify/src/content/overlay-wizard/screens/SuccessScreen.tsx`

**Current:** Shows GIF preview and download button.

**Required:** Show cloud GIF link and sharing options for authenticated users.

```typescript
interface SuccessScreenProps {
  result: {
    type: 'cloud' | 'local'
    gifUrl?: string
    gifId?: string
    blob?: Blob
    error?: string
    prompt?: string
  }
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({ result }) => {
  if (result.type === 'cloud') {
    return (
      <div className="success-screen cloud">
        <h2>🎉 GIF Uploaded!</h2>
        
        {/* Preview */}
        <img src={result.gifUrl} alt="Your GIF" className="gif-preview" />
        
        {/* Cloud actions */}
        <div className="actions">
          <button onClick={() => openInNewTab(`https://ytgify.com/gifs/${result.gifId}`)}>
            View on YTGify
          </button>
          <button onClick={() => copyToClipboard(result.gifUrl!)}>
            Copy GIF URL
          </button>
          {result.blob && (
            <button onClick={() => downloadBlob(result.blob!, 'ytgify.gif')}>
              Download GIF
            </button>
          )}
        </div>
      </div>
    )
  }

  // Local download (unauthenticated or error)
  return (
    <div className="success-screen local">
      <h2>GIF Created</h2>
      
      <p>{result.error || result.prompt || 'GIF saved to Downloads'}</p>
      
      {result.prompt && (
        <button onClick={() => openPopup()}>
          Sign In to YTGify
        </button>
      )}
    </div>
  )
}
```

**Checklist:**
- [ ] Success screen shows cloud GIF link
- [ ] "View on YTGify" button opens web app
- [ ] Copy GIF URL to clipboard
- [ ] Download button still available
- [ ] Unauthenticated prompt to sign in

### Testing Strategy

#### Unit Tests

**GIF Upload:**
- [ ] FormData construction correct
- [ ] Metadata fields included
- [ ] Multipart upload format correct

**YouTube Metadata:**
- [ ] Video title extracted
- [ ] Channel name extracted
- [ ] Video ID extracted
- [ ] Handles missing elements gracefully

#### Integration Tests

**Upload Flow:**
- [ ] Create GIF → Upload → Verify in backend
- [ ] Check S3 file exists
- [ ] Check database record created
- [ ] Metadata saved correctly

**Authentication Integration:**
- [ ] Authenticated: GIF uploads automatically
- [ ] Unauthenticated: GIF downloads locally
- [ ] Upload error: Falls back to download

#### E2E Tests

**File:** `ytgify/tests/e2e/gif-upload.spec.ts` (NEW)

```typescript
test('should upload GIF when authenticated', async ({ page, extensionId }) => {
  // Login first
  await loginToExtension(page, extensionId)

  // Navigate to YouTube video
  await page.goto('https://youtube.com/watch?v=dQw4w9WgXcQ')

  // Open wizard
  await page.click('[data-testid="ytgify-button"]')

  // Complete GIF creation
  await createGif(page)

  // Verify success screen shows cloud link
  await expect(page.locator('text=GIF Uploaded')).toBeVisible()
  await expect(page.locator('button:has-text("View on YTGify")')).toBeVisible()

  // TODO: Verify GIF exists in backend
})

test('should download GIF when not authenticated', async ({ page, extensionId }) => {
  // Navigate to YouTube video (no login)
  await page.goto('https://youtube.com/watch?v=dQw4w9WgXcQ')

  // Open wizard and create GIF
  await createGif(page)

  // Verify success screen shows download prompt
  await expect(page.locator('text=Sign in to save GIFs online')).toBeVisible()
})
```

**Checklist:**
- [ ] E2E test for authenticated upload
- [ ] E2E test for unauthenticated download
- [ ] E2E test for upload error fallback
- [ ] Backend verification (GIF in S3 + database)

### Success Criteria

- [ ] Authenticated users: GIFs upload to cloud automatically
- [ ] Unauthenticated users: GIFs download locally with sign-in prompt
- [ ] Upload errors fall back to local download gracefully
- [ ] Success screen shows cloud GIF link for authenticated users
- [ ] YouTube metadata extracted and saved
- [ ] S3 storage verified
- [ ] E2E tests passing

**Time Estimate:** 30-40 hours

---

## Phase 3: Social Features

**Duration:** 1-1.5 weeks
**Priority:** MEDIUM
**Dependencies:** Phase 2 complete

### Scope

**Minimal social integration for MVP:**
- View GIF feed in extension popup
- Like/unlike GIFs from extension
- View notification badge count
- Link to full web app for comments, follows, collections

**NOT in MVP:**
- Full comment UI in extension (use web app)
- Full feed browsing (use web app)
- Follow/unfollow from extension (use web app)

### Implementation Tasks

#### Task 3.1: Implement GIF Feed API

**File:** `ytgify/src/lib/api/feed.ts` (NEW)

```typescript
import { apiClient } from './client'
import type { GifResponse } from './types'

export class FeedAPI {
  /**
   * Get public feed (trending)
   */
  static async getTrending(page = 1, perPage = 20): Promise<GifResponse[]> {
    const response = await apiClient.request<{
      gifs: GifResponse[]
      pagination: { page: number; per_page: number; total: number }
    }>(`/feed/trending?page=${page}&per_page=${perPage}`)

    return response.gifs
  }

  /**
   * Get personalized feed (requires auth)
   */
  static async getPersonalizedFeed(page = 1, perPage = 20): Promise<GifResponse[]> {
    const response = await apiClient.authenticatedRequest<{
      gifs: GifResponse[]
      pagination: { page: number; per_page: number; total: number }
    }>(`/feed?page=${page}&per_page=${perPage}`)

    return response.gifs
  }
}
```

#### Task 3.2: Implement Like API

**File:** `ytgify/src/lib/api/likes.ts` (NEW)

```typescript
import { apiClient } from './client'

export class LikesAPI {
  /**
   * Toggle like on GIF (like if not liked, unlike if liked)
   */
  static async toggleLike(gifId: string): Promise<{ liked: boolean; likeCount: number }> {
    // Backend handles toggle logic
    const response = await apiClient.authenticatedRequest<{
      liked: boolean
      like_count: number
    }>(`/gifs/${gifId}/likes`, {
      method: 'POST',
    })

    return {
      liked: response.liked,
      likeCount: response.like_count,
    }
  }
}
```

#### Task 3.3: Add GIF Feed to Popup

**File:** `ytgify/src/popup/components/GifFeed.tsx` (NEW)

```typescript
import React, { useState, useEffect } from 'react'
import { FeedAPI } from '@/lib/api/feed'
import { LikesAPI } from '@/lib/api/likes'
import { AuthAPI } from '@/lib/api/auth'
import type { GifResponse } from '@/lib/api/types'

export const GifFeed: React.FC = () => {
  const [gifs, setGifs] = useState<GifResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    loadFeed()
  }, [])

  const loadFeed = async () => {
    const authenticated = await AuthAPI.isAuthenticated()
    setIsAuthenticated(authenticated)

    try {
      const feed = authenticated 
        ? await FeedAPI.getPersonalizedFeed() 
        : await FeedAPI.getTrending()
      
      setGifs(feed)
    } catch (error) {
      console.error('Failed to load feed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLike = async (gifId: string) => {
    try {
      const result = await LikesAPI.toggleLike(gifId)
      
      // Update local state
      setGifs(gifs.map(gif => 
        gif.id === gifId 
          ? { ...gif, like_count: result.likeCount }
          : gif
      ))
    } catch (error) {
      console.error('Failed to like GIF:', error)
    }
  }

  if (isLoading) {
    return <div className="loading">Loading feed...</div>
  }

  return (
    <div className="gif-feed">
      <h3>{isAuthenticated ? 'Your Feed' : 'Trending GIFs'}</h3>
      
      <div className="gif-grid">
        {gifs.map(gif => (
          <div key={gif.id} className="gif-card">
            <img src={gif.thumbnail_url} alt={gif.title} />
            
            <div className="gif-info">
              <h4>{gif.title}</h4>
              <p>@{gif.user.username}</p>
            </div>
            
            <div className="gif-actions">
              <button onClick={() => handleLike(gif.id)}>
                ❤️ {gif.like_count}
              </button>
              <button onClick={() => openInNewTab(`https://ytgify.com/gifs/${gif.id}`)}>
                View
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <button onClick={() => openInNewTab('https://ytgify.com')}>
        View All on YTGify.com
      </button>
    </div>
  )
}
```

**Update:** `ytgify/src/popup/popup-modern.tsx`

Add tabbed interface or toggle to show feed:

```typescript
const [activeTab, setActiveTab] = useState<'create' | 'feed'>('create')

return (
  <div className="popup-modern">
    <div className="popup-header">...</div>
    <AuthPanel />
    
    {/* Tabs */}
    <div className="tabs">
      <button 
        className={activeTab === 'create' ? 'active' : ''}
        onClick={() => setActiveTab('create')}
      >
        Create GIF
      </button>
      <button 
        className={activeTab === 'feed' ? 'active' : ''}
        onClick={() => setActiveTab('feed')}
      >
        Feed
      </button>
    </div>
    
    {/* Content */}
    {activeTab === 'create' && (
      <div className="popup-main">
        {/* Existing create GIF UI */}
      </div>
    )}
    
    {activeTab === 'feed' && <GifFeed />}
  </div>
)
```

#### Task 3.4: Add Notification Badge (Optional)

**Implementation:** Use HTTP polling to check notification count every 2 minutes.

**File:** `ytgify/src/lib/api/notifications.ts` (NEW)

```typescript
export class NotificationsAPI {
  static async getUnreadCount(): Promise<number> {
    const response = await apiClient.authenticatedRequest<{
      unread_count: number
    }>('/notifications?unread_only=true&per_page=1')

    return response.unread_count
  }
}
```

**Update:** `ytgify/src/background/notification-poller.ts` (NEW)

```typescript
import { NotificationsAPI } from '@/lib/api/notifications'
import { AuthAPI } from '@/lib/api/auth'

export class NotificationPoller {
  static async start(): Promise<void> {
    // Check immediately
    await this.checkNotifications()

    // Set up alarm to check every 2 minutes
    chrome.alarms.create('notification-check', {
      periodInMinutes: 2,
    })

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'notification-check') {
        this.checkNotifications()
      }
    })
  }

  private static async checkNotifications(): Promise<void> {
    const isAuthenticated = await AuthAPI.isAuthenticated()
    if (!isAuthenticated) {
      // Clear badge
      chrome.action.setBadgeText({ text: '' })
      return
    }

    try {
      const count = await NotificationsAPI.getUnreadCount()
      
      if (count > 0) {
        chrome.action.setBadgeText({ text: count.toString() })
        chrome.action.setBadgeBackgroundColor({ color: '#FF0000' })
      } else {
        chrome.action.setBadgeText({ text: '' })
      }
    } catch (error) {
      console.error('Failed to check notifications:', error)
    }
  }
}
```

**Update:** `ytgify/src/background/index.ts`

```typescript
import { NotificationPoller } from './notification-poller'

chrome.runtime.onStartup.addListener(async () => {
  await AuthManager.initialize()
  await NotificationPoller.start()
})
```

**Checklist:**
- [ ] Feed API implemented
- [ ] Like API implemented
- [ ] GIF feed component in popup
- [ ] Like button functional
- [ ] Notification badge polling (optional)

### Testing Strategy

- [ ] Unit tests for Feed API
- [ ] Unit tests for Like API
- [ ] E2E test: View feed in popup
- [ ] E2E test: Like GIF from popup
- [ ] E2E test: Notification badge updates

### Success Criteria

- [ ] Users can view trending feed in popup
- [ ] Authenticated users see personalized feed
- [ ] Like button works from extension
- [ ] "View on YTGify" opens web app
- [ ] Notification badge shows unread count (optional)

**Time Estimate:** 20-30 hours

---

## Phase 4: Testing & Launch

**Duration:** 1-1.5 weeks
**Priority:** CRITICAL
**Dependencies:** Phases 1-3 complete

### Comprehensive Testing

#### E2E Test Suite

**Required Tests:**
1. Authentication flow (sign in, sign out, token refresh)
2. GIF creation + upload (authenticated)
3. GIF creation + download (unauthenticated)
4. Upload error fallback
5. Feed viewing
6. Like interaction
7. Service worker lifecycle (restart, token check)

#### Manual Testing Checklist

- [ ] Install extension fresh
- [ ] Create account via web
- [ ] Sign in from extension
- [ ] Create GIF on YouTube (authenticated)
- [ ] Verify GIF uploaded to S3
- [ ] Verify GIF appears on web app
- [ ] View feed in popup
- [ ] Like GIF from popup
- [ ] Sign out
- [ ] Create GIF (unauthenticated)
- [ ] Verify GIF downloaded to Downloads
- [ ] Sign in again
- [ ] Verify token persists across service worker restarts
- [ ] Test error scenarios (network failure, invalid credentials, rate limit)

#### Performance Testing

- [ ] GIF creation time (baseline)
- [ ] Upload time (measure, optimize if >5s)
- [ ] Popup load time (<1s)
- [ ] Token refresh latency (<500ms)

### Production Preparation

#### Backend

**CORS Production Config:**
```ruby
# config/initializers/cors.rb

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    if Rails.env.production?
      # Whitelist specific extension IDs after Chrome Web Store submission
      origins /chrome-extension:\/\/[a-z]{32}/,  # Chrome extension ID pattern
              'https://ytgify.com',
              'https://www.ytgify.com'
    else
      origins '*'
    end

    resource '*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      expose: ['Authorization'],
      credentials: false,
      max_age: 3600
  end
end
```

**Environment Variables:**
```bash
# Production
JWT_SECRET_KEY=<production-secret>
API_BASE_URL=https://api.ytgify.com
AWS_S3_BUCKET=ytgify-production
```

#### Extension

**Production Build:**
```bash
cd ytgify
npm run build:production
```

**Verify manifest:**
- No localhost permissions
- Production API URL
- Correct version number
- All icons present

**Chrome Web Store Submission:**
1. Create ZIP of `dist-production/` folder
2. Submit to Chrome Web Store
3. Note extension ID from submission
4. Update backend CORS with actual extension ID

### Success Criteria

- [ ] All E2E tests passing
- [ ] Manual testing complete
- [ ] Performance acceptable
- [ ] Production backend deployed
- [ ] Extension published to Chrome Web Store
- [ ] CORS configured for actual extension ID

**Time Estimate:** 20-30 hours

---

## Critical Decision Points

### Decision 1: Storage Strategy (Phase 2)

**Options:**
1. Cloud-only (no local persistence)
2. Hybrid (re-introduce IndexedDB)
3. Download + Upload

**Recommendation:** Cloud-only OR Download + Upload

**Impact:** Architecture, user experience, complexity

### Decision 2: Social Features Scope (Phase 3)

**Options:**
1. Minimal (feed + like only)
2. Full (comments, follows, collections in extension)

**Recommendation:** Minimal (Phase 3), Full can be Phase 6

**Impact:** Development time, UI complexity

### Decision 3: Notification Strategy (Phase 3)

**Options:**
1. HTTP polling (every 2 minutes)
2. No notifications in extension (use web only)
3. WebSocket (complex for extension)

**Recommendation:** HTTP polling OR no notifications

**Impact:** Backend load, user experience

---

## Risk Assessment

### High Risk

**1. JWT Token Security**
- Risk: chrome.storage.local not encrypted
- Mitigation: Short expiry (15min), refresh mechanism, user education
- Acceptance: Document clearly, acceptable for MVP

**2. Service Worker Auto-Termination**
- Risk: Token refresh fails if worker terminated
- Mitigation: Check token on activation, alarm-based backup
- Status: Addressed in Phase 1

**3. CORS Configuration**
- Risk: Production CORS blocks extension after Chrome Web Store publish
- Mitigation: Update CORS with actual extension ID post-publish
- Status: Documented, will handle in Phase 4

### Medium Risk

**4. Upload Failures**
- Risk: Network failures during upload
- Mitigation: Fallback to local download, retry logic
- Status: Addressed in Phase 2

**5. Rate Limiting**
- Risk: Extension triggers rate limits (429 responses)
- Mitigation: Client-side backoff, error handling
- Status: Addressed in API client (Phase 1)

### Low Risk

**6. YouTube Page Changes**
- Risk: YouTube DOM changes break metadata extraction
- Mitigation: Multiple selectors, graceful degradation
- Status: Can be patched post-launch

---

## Time Estimates Summary

| Phase | Duration | Hours | Priority |
|-------|----------|-------|----------|
| Phase 0: Foundation | 3-5 days | 10-15 | CRITICAL |
| Phase 1: Authentication | 1.5-2 weeks | 40-60 | HIGH |
| Phase 2: GIF Upload | 1.5-2 weeks | 30-40 | HIGH |
| Phase 3: Social Features | 1-1.5 weeks | 20-30 | MEDIUM |
| Phase 4: Testing & Launch | 1-1.5 weeks | 20-30 | CRITICAL |
| **TOTAL** | **6-8 weeks** | **120-175 hours** | |

---

## Next Steps

1. **Review this plan** - Confirm approach and critical decisions
2. **Phase 0: Foundation** - Set up infrastructure, environment, CORS
3. **Phase 1: Authentication** - Implement JWT auth in extension
4. **Phase 2: GIF Upload** - Integrate cloud upload into GIF creation flow
5. **Phase 3: Social Features** - Add feed and like functionality
6. **Phase 4: Testing & Launch** - Comprehensive testing and Chrome Web Store submission

---

**Document Status:** Ready for Implementation
**Last Updated:** 2025-11-12
**Next Review:** After Phase 0 complete

