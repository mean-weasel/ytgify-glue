# Architecture Decisions

**Last Updated:** 2025-11-09
**Status:** Approved

**Navigation:** [← Back to Main Strategy](./BROWSER_EXTENSION_INTEGRATION_STRATEGY.md)

---

## Overview

This document captures key architectural decisions made during the ytgify browser extension integration planning. Each decision includes context, options considered, rationale, and trade-offs.

---

## Decision 1: Download + Optional Cloud Upload

### Context

Extensions currently save GIFs directly to the browser's Downloads folder. After backend integration, we need to decide where GIFs should be stored.

### Options Considered

1. **Download-only:** Keep current behavior, no backend integration
2. **Cloud-only:** Remove Downloads, always upload to backend (requires authentication)
3. **Download + Optional Cloud Upload:** Keep Downloads as default, add optional cloud backup when authenticated

### Decision: Download + Optional Cloud Upload (Option 3)

### Rationale

- **User control:** Users get a file they can immediately use without needing an account
- **No breaking changes:** Existing behavior (Downloads folder) remains unchanged
- **Progressive enhancement:** Cloud features available when users want them
- **Zero friction for anonymous users:** GIF creation works without authentication
- **Social features unlocked:** Cloud storage enables sharing, likes, comments for authenticated users
- **Graceful degradation:** Works offline, works without account, works always

### Implementation

```typescript
interface GifStorage {
  download: DownloadManager     // Existing Downloads folder behavior
  cloud: YtgifyApiClient        // New backend API (optional)

  async save(gif: Gif) {
    // ALWAYS save to Downloads folder (current behavior)
    await this.download.save(gif)

    // OPTIONALLY upload to cloud if authenticated
    if (await this.cloud.isAuthenticated()) {
      try {
        const cloudGif = await this.cloud.upload(gif)
        console.log('✅ GIF saved to Downloads AND uploaded to cloud')
      } catch (error) {
        // Upload failed - user still has local file
        console.warn('⚠️ Cloud upload failed, but file saved to Downloads')
      }
    } else {
      // Not authenticated - Downloads only (current behavior)
      console.log('📋 GIF saved to Downloads folder')
    }
  }
}
```

### User Experience Flow

**Anonymous User (No Account):**
1. Create GIF → Saved to Downloads folder ✅
2. No authentication required
3. Works exactly like current version

**Authenticated User:**
1. Create GIF → Saved to Downloads folder ✅
2. Automatically uploaded to cloud ✅
3. Available on web app and other devices ✅
4. Social features enabled (like, comment, share) ✅

**Offline User:**
1. Create GIF → Saved to Downloads folder ✅
2. Works offline (no cloud upload)
3. When back online: New GIFs upload automatically

### Trade-offs

**✅ Pros:**
- Zero breaking changes (Downloads folder still works)
- No authentication required for basic functionality
- Cloud features are progressive enhancement
- Users always get a file they can use immediately
- No storage duplication concerns (Downloads folder only)
- Simple mental model: "Always get a file, optionally backed up to cloud"

**❌ Cons:**
- Files in Downloads folder are not managed by extension (user may delete them)
- No "GIF library" in extension (user must manage files themselves)
- Cannot re-share old GIFs from extension unless uploaded to cloud
- Requires authentication for social features

**Note:** This is a simpler architecture than hybrid storage. The Downloads folder is the source of truth for anonymous users. Cloud storage becomes the source of truth for authenticated users who want social features.

### Status: ✅ Approved

---

## Decision 2: Authentication UX (Hybrid: Login in Popup, Signup on Web)

### Context

How should users authenticate from the extension? Popup forms vs. opening web app.

### Options Considered

1. **In-extension forms:** Full login AND signup forms in popup
2. **Web-based OAuth:** Always open ytgify-share.com for authentication
3. **Hybrid:** Simple login in popup, full signup on web

### Decision: Hybrid Approach (Option 3)

### Rationale

**Login in Popup:**
- Quick access for existing users
- No browser tab interruption
- Simple email/password form fits in popup

**Signup on Web:**
- Better UX for account creation (more space for terms, validation, email verification)
- Can show onboarding flow
- Avoids complex form validation in limited popup space
- Professional appearance (branded web page)

### Implementation

```typescript
// Extension popup
<button onClick={showLoginForm}>
  Sign In
</button>

<button onClick={openSignupPage}>
  Create Account
</button>

function openSignupPage() {
  chrome.tabs.create({
    url: 'https://ytgify-share.com/signup?source=extension'
  })
}
```

### Trade-offs

**✅ Pros:**
- Best of both worlds (quick login + full signup experience)
- Reduces extension complexity
- Professional onboarding on web

**❌ Cons:**
- Slightly more friction for new users (opens new tab)
- Requires user to return to extension after signup

### Mitigation

- After web signup, redirect to extension instructions page
- Show clear "return to extension" message
- Consider OAuth flow in future (seamless)

### Status: ✅ Approved

---

## Decision 3: API Error Handling (Graceful Degradation with Local Fallback)

### Context

How should extensions handle API errors (network failures, auth errors, rate limits)?

### Options Considered

1. **Fail hard:** Show error, prevent GIF creation
2. **Retry forever:** Keep retrying until success
3. **Graceful degradation:** Fall back to local-only on error

### Decision: Graceful Degradation (Option 3)

### Rationale

- **User experience priority:** Never block GIF creation
- **Offline-first philosophy:** Extensions should work without backend
- **Eventual consistency:** Sync to cloud when possible
- **Clear user feedback:** Show status (local vs. cloud)

### Implementation

```typescript
async function createGif(params) {
  try {
    // Always save locally first
    const localGif = await localStorage.saveGif(params)

    // Try to upload to cloud
    if (await apiClient.isAuthenticated()) {
      try {
        const cloudGif = await apiClient.uploadGif(params)
        showSuccess('✅ GIF saved and uploaded to ytgify!')
        return cloudGif
      } catch (error) {
        if (error instanceof NetworkError) {
          showWarning('⚠️ Saved locally. Will sync when online.')
        } else if (error instanceof AuthError) {
          showWarning('⚠️ Saved locally. Sign in to upload.')
        } else {
          showWarning('⚠️ Upload failed. Saved locally.')
        }
      }
    }

    return localGif
  } catch (error) {
    // Even local save failed - this is critical
    showError('❌ Failed to save GIF. Please try again.')
    throw error
  }
}
```

### Error Categories

1. **Network Errors** → Save locally, queue for sync, show "will sync later"
2. **Auth Errors (401)** → Save locally, prompt login, don't retry
3. **Rate Limit Errors (429)** → Retry with backoff, respect `Retry-After` header
4. **Server Errors (500)** → Save locally, notify user, log error
5. **Validation Errors (422)** → Show error to user, don't save (user input problem)

### Trade-offs

**✅ Pros:**
- GIF creation never blocked
- Works offline
- Clear user feedback
- Automatic recovery

**❌ Cons:**
- User might not notice upload failed
- Sync queue can grow (rare)
- More complex error handling logic

### Status: ✅ Approved

---

## Decision 4: Real-Time Notifications (HTTP Polling, Not WebSocket)

### Context

Backend has ActionCable WebSocket notifications. How should extensions receive real-time notifications?

### Options Considered

1. **HTTP Polling:** Extension polls `/api/v1/notifications` every 2 minutes
2. **WebSocket Connection:** Connect to ActionCable from extension
3. **No Notifications:** Direct users to web app for notifications

### Decision: HTTP Polling (Option 1)

### Rationale

**Why not WebSocket?**
- Chrome service workers terminate after 5 minutes idle
- WebSocket connection would be dropped and require complex reconnection
- Maintaining long-lived connection conflicts with service worker lifecycle
- More complex error handling (network drops, auth expiry during connection)

**Why Polling Works:**
- Survives service worker restarts (alarm-based, not connection-based)
- Simple implementation (just HTTP GET requests)
- ~2 minute notification latency is acceptable for extension context
- Battery efficient (only polls when browser active)
- Consistent with "local-first" philosophy

### Implementation

```typescript
export class NotificationPoller {
  private static readonly POLL_INTERVAL = 2 * 60 * 1000 // 2 minutes

  static async start() {
    // Poll immediately
    await this.poll()

    // Set up recurring alarm
    chrome.alarms.create('pollNotifications', {
      periodInMinutes: 2
    })
  }

  private static async poll() {
    const response = await apiClient.authenticatedRequest('/notifications')
    const notifications = await response.json()

    // Update badge count
    const unreadCount = notifications.filter(n => !n.read).length
    chrome.action.setBadgeText({ text: unreadCount > 0 ? unreadCount.toString() : '' })

    // Show browser notifications for new items
    for (const notification of this.getNewNotifications(notifications)) {
      this.showBrowserNotification(notification)
    }
  }
}
```

### Trade-offs

**✅ Pros:**
- Works reliably despite service worker termination
- Simple to implement and test
- No persistent connection management
- Battery efficient

**❌ Cons:**
- ~2 minute latency (vs instant with WebSocket)
- Additional API endpoint traffic (minimal)
- Not truly "real-time"

**Acceptable Trade-off:**
- 2-minute delay is fine for extension notifications
- Web app still has instant ActionCable notifications
- Extensions are not primary notification interface

### Future Consideration

If browser support improves for long-lived service worker connections, could migrate to WebSocket. Current implementation makes this migration easy.

### Status: ✅ Approved

---

## Decision 5: Storage Abstraction Layer (Cross-Browser Compatibility)

### Context

Chrome has `chrome.storage.sync` for cross-device sync. Firefox only has `browser.storage.local`.

### Decision: Create Abstraction Layer with Fallback

### Rationale

- 78% code sharing between Chrome and Firefox
- Storage API is one of few incompatibilities
- Abstraction layer eliminates need for browser-specific code
- Future-proof for other browsers

### Implementation

```typescript
export class StorageAdapter {
  private static get api() {
    return typeof chrome !== 'undefined' ? chrome.storage : browser.storage
  }

  private static get isChrome(): boolean {
    return typeof chrome !== 'undefined' && chrome.storage?.sync !== undefined
  }

  // Token: Always local (security)
  static async saveToken(token: string) {
    await this.api.local.set({ jwtToken: token })
  }

  // Preferences: Sync on Chrome, local on Firefox
  static async savePreferences(prefs: UserPreferences) {
    const storage = this.isChrome ? this.api.sync : this.api.local
    await storage.set({ userPreferences: prefs })
  }
}
```

### Trade-offs

**✅ Pros:**
- Single codebase for both browsers
- Type-safe storage operations
- Clear separation of local vs. sync data
- Easy to test

**❌ Cons:**
- Firefox users miss out on cross-device sync
- Slight performance overhead (negligible)

**Note:** Backend will eventually provide cross-device sync for Firefox users (via account sync).

### Status: ✅ Approved

---

## Decision 6: Service Worker Lifecycle Management (Activation-Based Token Refresh)

### Context

Chrome service workers terminate after 5 minutes. JWT tokens expire in 15 minutes. Alarm-based refresh may not fire.

### Decision: Check Token on EVERY Service Worker Activation + Alarm Backup

### Rationale

**Problem:**
- Alarm set to refresh every 10 minutes
- Service worker terminates after 5 minutes
- Alarm may not fire before expiration

**Solution:**
- Check token expiry on service worker startup/activation
- If token expires in < 5 minutes, refresh immediately
- Keep alarm as backup mechanism

### Implementation

```typescript
export class TokenManager {
  private static readonly TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000 // 5 min

  static async onServiceWorkerActivation() {
    const token = await StorageAdapter.getToken()
    if (!token) return

    const decoded = apiClient.decodeToken(token)
    const timeUntilExpiry = (decoded.exp * 1000) - Date.now()

    if (timeUntilExpiry < this.TOKEN_REFRESH_THRESHOLD) {
      await apiClient.refreshToken()
    }
  }
}

// Register listeners
chrome.runtime.onStartup.addListener(TokenManager.onServiceWorkerActivation)
chrome.runtime.onInstalled.addListener(TokenManager.onServiceWorkerActivation)

// Alarm as backup
chrome.alarms.create('refreshToken', { periodInMinutes: 10 })
```

### Trade-offs

**✅ Pros:**
- Reliable token refresh despite termination
- Multiple layers of protection
- No auth interruptions for users

**❌ Cons:**
- Slightly more complex logic
- Multiple code paths to test

**Note:** Firefox event pages don't have this issue (longer persistence).

### Status: ✅ Approved

---

## Decision 7: GIF Metadata Extraction (During Encoding)

### Context

Backend stores fps, duration, resolution. How do we populate these fields from extensions?

### Decision: Extract Metadata During Encoding, Send with Upload

### Implementation

```typescript
async generateGifWithMetadata(params): Promise<{ gifBlob: Blob, metadata: GifMetadata }> {
  const frames = await this.extractFrames(params)
  const gifBlob = await encoder.encode(frames, { width, height, fps })

  const metadata = {
    fps: params.fps || 15,
    duration: params.endTime - params.startTime,
    width: params.width,
    height: params.height,
    frameCount: frames.length,
    fileSize: gifBlob.size
  }

  return { gifBlob, metadata }
}

// Upload with metadata
formData.append('gif[fps]', metadata.fps.toString())
formData.append('gif[duration]', metadata.duration.toString())
// etc...
```

### Rationale

- Metadata available at encoding time
- No need for backend to re-analyze GIF
- Accurate (from source)
- Required for analytics and feed algorithms

### Status: ✅ Approved

---

## Summary Table

| Decision | Status | Impact | Complexity |
|----------|--------|--------|------------|
| 1. Download + Optional Cloud Upload | ✅ Approved | High | Low |
| 2. Hybrid Auth UX | ✅ Approved | Medium | Low |
| 3. Graceful Degradation | ✅ Approved | High | Medium |
| 4. HTTP Polling (Not WebSocket) | ✅ Approved | Medium | Low |
| 5. Storage Abstraction | ✅ Approved | Medium | Low |
| 6. Activation-Based Token Refresh | ✅ Approved | High | Medium |
| 7. Metadata Extraction | ✅ Approved | Low | Low |

---

## Review & Approval

**Reviewed By:** Development Team
**Approved By:** Tech Lead
**Date:** 2025-11-09
**Status:** All decisions approved for implementation

---

**Last Updated:** 2025-11-09
