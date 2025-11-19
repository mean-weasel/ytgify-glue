# YTgify Firefox Extension - Comprehensive Exploration Report

## Executive Summary

The Firefox extension is nearly identical to the Chrome version at the functional level but has critical architectural differences due to Firefox-specific APIs and runtime models. The main integration point is the runtime API replacement (`chrome.*` → `browser.*`). Most business logic is shared; only wrapper/bootstrap code differs.

---

## 1. ARCHITECTURAL DIFFERENCES FROM CHROME VERSION

### 1.1 Background Script Model

**Chrome Version:**
- Uses **Service Worker** (`service_worker` in manifest)
- Short-lived, persistent background context
- Keeps state in memory between user interactions
- Auto-terminates after 5 minutes of inactivity
- Callback-based message API

**Firefox Version:**
- Uses **Event Page** (`scripts` array in manifest)
- Longer persistence than Chrome service workers
- Manual cleanup required on `unload` event
- Promise-based message API (native async support)
- Better at maintaining persistent connections

**Code Impact:**
```javascript
// Chrome: manifest.json
"background": {
  "service_worker": "background.js",
  "type": "module"
}

// Firefox: manifest.json
"background": {
  "scripts": ["background.js"],
  "type": "module"
}
```

**File Reference:**
- `/Users/jeremywatt/Desktop/ytgify-glue/ytgify-firefox/manifest.json` (lines 33-36)
- `/Users/jeremywatt/Desktop/ytgify-glue/ytgify/manifest.json` (lines 13-16)

### 1.2 Browser API Namespace

**Critical Difference:** All API calls replace `chrome.*` with `browser.*`

**Chrome:**
```typescript
chrome.runtime.sendMessage(msg)
chrome.storage.local.get(keys)
chrome.tabs.query(options)
```

**Firefox:**
```typescript
browser.runtime.sendMessage(msg)
browser.storage.local.get(keys)
browser.tabs.query(options)
```

**Key Files Affected:**
- `src/background/index.ts` - Lines 18-196 (event listeners, API calls)
- `src/background/message-handler.ts` - Lines 42, 84, 189, 227, 934 (sender types)
- `src/shared/message-bus.ts` - Multiple replacements (API references)
- `src/lib/browser-api.ts` - Firefox detection logic

**Implementation Detail:**
Firefox uses `@types/firefox-webext-browser` package (package.json, line 48) instead of `@types/chrome`. The `browser` object is globally available and doesn't need importing.

---

## 2. STORAGE MECHANISMS - CRITICAL DIFFERENCES

### 2.1 Storage API Options

**Chrome Extension:**
```javascript
// Both available
chrome.storage.local   // Local machine
chrome.storage.sync    // Cloud sync via Google Account
```

**Firefox Extension:**
```javascript
// Only local available
browser.storage.local  // Local machine only
// No cloud sync support
```

**Code Impact:**
Firefox cannot use `chrome.storage.sync` (which is used for user preferences in Chrome). The Firefox version uses `browser.storage.local` exclusively.

**File Impact:**
- `src/shared/preferences.ts` - Reads from local storage via state manager
- `src/background/index.ts` - Lines 204-239 (initialization uses `browser.storage.local`)
- Chrome version uses `chrome.storage.sync` for cross-device sync

### 2.2 IndexedDB Implementation

**Both platforms support IndexedDB identically.**

Storage pattern:
```javascript
// Both use same approach
const request = indexedDB.open('YouTubeGifStore', 3)
```

**Firefox-specific consideration:** IndexedDB operations are the same, but Firefox's event page is longer-lived, reducing the risk of data loss during unload.

**Implementation:** `src/background/message-handler.ts` (lines 491-576) handles direct IndexedDB saves without document references.

---

## 3. EXTENSION ARCHITECTURE COMPARISON

### 3.1 Manifest Differences

| Feature | Chrome | Firefox |
|---------|--------|---------|
| Extension ID | Auto-generated | `ytgify@firefox.extension` |
| Min Version | None | 109.0 |
| Browser-specific | None | `browser_specific_settings.gecko` |
| CSP | Less strict | Stricter WASM requirements |
| Storage.sync | Supported | Not supported |

**Manifest Location:**
- Chrome: `/Users/jeremywatt/Desktop/ytgify-glue/ytgify/manifest.json`
- Firefox: `/Users/jeremywatt/Desktop/ytgify-glue/ytgify-firefox/manifest.json`

### 3.2 Content Script Loading

Both use identical content script model:
```json
{
  "matches": ["https://*.youtube.com/*", "localhost"],
  "js": ["content.js"],
  "run_at": "document_end"
}
```

Webpack public path differs:
- **Chrome:** Sets `__webpack_public_path__` using `chrome.runtime.getURL()`
- **Firefox:** Skips webpack public path setup (not required for Firefox)

**File:** `src/content/index.ts` (lines 5-8 in Chrome vs removed in Firefox)

---

## 4. CODE SHARING POTENTIAL

### 4.1 Fully Shared Components (No Changes Needed)

**GIF Creation Pipeline:**
- `src/content/gif-processor.ts` - 100% identical
- `src/lib/encoders/*` - 100% identical
- `src/processing/*` - 100% identical
- `src/lib/gif-encoder-v2.ts` - 100% identical
- `src/content/frame-extractor.ts` - 100% identical
- All React components in `src/content/overlay-wizard/*` - 100% identical

**Shared Libraries:**
- `src/types/*` - 100% identical message types
- `src/utils/*` - 100% identical utility functions
- `src/shared/errors.ts` - 100% identical error handling
- `src/shared/logger.ts` - Only API calls change (minimal)

**Total Shared Code:** ~75-80% of codebase

### 4.2 Browser API Abstraction Layer

**Current Approach:** Direct `browser.*` calls throughout codebase

**Opportunities for Better Sharing:**
A central abstraction layer could eliminate duplicative code:

```typescript
// Proposed: src/lib/runtime-api.ts
export const RuntimeAPI = {
  sendMessage: (msg) => browser.runtime.sendMessage(msg),
  getURL: (path) => browser.runtime.getURL(path),
  storage: browser.storage,
  tabs: browser.tabs,
  downloads: browser.downloads,
  commands: browser.commands
}
```

This would allow a single codebase with:
```typescript
// Same code for both
import { RuntimeAPI } from '@/lib/runtime-api'
RuntimeAPI.storage.local.get(keys)
```

**Current Reality:** 
- All 38 references to `browser.storage` in Firefox version vs 0 references to `chrome.storage.sync`
- Message bus (`src/shared/message-bus.ts`) has both versions

### 4.3 Files with Minor Differences Only

These could be unified with 3-4 API abstraction functions:

1. `src/background/index.ts` - Event listener syntax, unload handling
2. `src/background/message-handler.ts` - Type definitions only
3. `src/lib/browser-api.ts` - Firefox-specific detection
4. `src/lib/logger.ts` - Storage API only (3 lines)
5. `src/shared/message-bus.ts` - API references in 5-6 places
6. `src/content/index.ts` - Webpack public path setup

---

## 5. TESTING INFRASTRUCTURE DIFFERENCES

### 5.1 Chrome Version Testing

**Frameworks:**
- Jest (unit tests)
- Playwright (E2E, both real and mock)
- Custom E2E helpers

**Test Commands:**
```bash
npm run test                  # Unit tests
npm run test:e2e            # Real YouTube E2E (headless)
npm run test:e2e:mock       # Mock E2E (CI-safe)
npm run test:layout         # Layout integrity tests
npm run test:all            # Everything
npm run validate:pre-push   # Full suite before PR
```

**Directory:** `/Users/jeremywatt/Desktop/ytgify-glue/ytgify/tests/`

### 5.2 Firefox Version Testing

**Additional Framework:** Selenium WebDriver (primary for Firefox)
**Why Selenium?** Firefox WebDriver integration is more mature for automated extension testing

**Test Commands:**
```bash
npm run test:selenium:real        # Real YouTube with Selenium
npm run test:selenium:mock        # Mock with Selenium
npm run test:e2e                  # Playwright real E2E
npm run test:e2e:mock             # Playwright mock E2E
```

**Unique Feature:** Firefox-specific Selenium driver
- **File:** `/Users/jeremywatt/Desktop/ytgify-glue/ytgify-firefox/tests/selenium/firefox-driver.ts`
- Uses `installAddon()` API (lines 47)
- Sets Firefox-specific preferences (xpinstall.signatures, extensions.webextensions.restrictedDomains)
- Handles temporary addon installation (signed requirement)

**Directory Structure:**
```
tests/
├── selenium/               # FIREFOX-SPECIFIC
│   ├── firefox-driver.ts   # Selenium Firefox setup
│   ├── global-setup-*.ts
│   └── tests/
├── e2e/                    # Shared with Chrome (Playwright)
├── e2e-mock/               # Shared with Chrome (Playwright)
├── jest.config.cjs         # Slightly different config
└── unit/                   # Shared
```

**Key Difference in jest.config:**
- Firefox version: Line 1366 (specified)
- Chrome version: Line 1187
- Minimal difference

### 5.3 Test Coverage

**Chrome:** 
- 425+ tests passing (from Rails backend, not extension)
- E2E focuses on Playwright (cross-platform)

**Firefox:**
- Dual test strategy: Selenium (primary) + Playwright (secondary)
- Selenium for reliability with Firefox WebDriver
- Playwright for cross-platform compatibility

---

## 6. FIREFOX-SPECIFIC OPTIMIZATIONS & CONSTRAINTS

### 6.1 Optimizations

**Event Page Persistence:**
```typescript
// Firefox event page initialization (src/background/index.ts, lines 308-363)
let cleanupInterval: ReturnType<typeof setInterval> | null = null

function startPeriodicCleanup(): void {
  if (cleanupInterval) return
  cleanupInterval = setInterval(() => {
    // Clean up old jobs every 5 minutes
    const cleanedJobs = backgroundWorker.cleanupOldJobs()
  }, 300000) // Every 5 minutes
}

// Firefox-specific unload cleanup
if (typeof self !== 'undefined' && 'addEventListener' in self) {
  self.addEventListener('unload', () => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval)
    }
    messageHandler.cleanup()
  })
}
```

**Advantage:** Firefox event pages persist longer than Chrome service workers, reducing the risk of state loss during heavy processing.

### 6.2 Constraints

1. **No Storage.sync**
   - Cannot sync preferences across devices
   - All storage is local only
   - Solution: Backend API needed for cross-device sync (Phase 2 of integration)

2. **WebCodecs Not Supported**
   - Firefox doesn't support WebCodecs reliably
   - Both versions use Canvas-based frame extraction
   - Fallback preference set in `src/background/index.ts` (line 222): `preferWebCodecs: false`

3. **Extension Signing**
   - Firefox requires signed extensions for distribution
   - Development can use temporary addons
   - Unsigned extensions auto-disable after restart

4. **API Availability**
   - No chrome.downloads API
   - Uses `browser.downloads` instead (lines 933-954 in message-handler.ts)
   - Promise-based (not callback)

### 6.3 Firefox-Specific Defaults

```typescript
// src/background/index.ts, lines 208-227
const defaultPreferences = {
  defaultFrameRate: 15,
  defaultQuality: 'medium',
  preferWebCodecs: false,  // Firefox doesn't support it
  analyticsEnabled: false,  // Privacy-first
  errorReportingEnabled: true,
  performanceMonitoringEnabled: true,
}
```

---

## 7. INTEGRATION CONSIDERATIONS FOR BACKEND API

### 7.1 Authentication Flow (Same for Both)

Both extensions will use JWT authentication:
```
Extension → POST /api/v1/auth/login → JWT token
Extension → Store token in browser.storage.local
Extension → Add "Authorization: Bearer <token>" header
```

### 7.2 Storage Differences for Integration

**Challenge:** Chrome can sync preferences to cloud via `chrome.storage.sync`, but Firefox cannot.

**Solution Path:**
1. Both use `browser.storage.local` for extension prefs
2. Backend API stores user preferences
3. Extensions fetch prefs on login: `GET /api/v1/auth/me`
4. Cache locally with TTL

**File Already Prepared:**
- `src/shared/preferences.ts` - Has caching system (CACHE_TTL = 5 min)
- Preference manager listens to state changes
- Ready for API integration

### 7.3 Message Format Compatibility

**No changes needed.** Message format is identical:
```typescript
// Both use same message structure
interface ExtensionMessage {
  type: string
  id?: string
  data?: unknown
  success?: boolean
  error?: string
}
```

**File:** `src/types/messages.ts` - 100% identical

---

## 8. TESTING APPROACH DIFFERENCES

### 8.1 Chrome E2E Strategy

**Playwright-focused:**
```bash
npm run validate:pre-push  # Runs:
  1. npm run lint
  2. npm run build
  3. npm run typecheck
  4. npm test (unit)
  5. npm run test:e2e:mock:headless (CI-safe)
  6. npm run test:layout (integrity checks)
  7. npm run test:e2e:fast (real YouTube, 3 workers)
```

**Total Time:** ~8-10 minutes

### 8.2 Firefox E2E Strategy

**Dual Selenium + Playwright:**
```bash
# Primary: Selenium (Firefox-optimized)
npm run test:selenium:real     # Real YouTube
npm run test:selenium:mock     # Mock videos

# Secondary: Playwright (for consistency with Chrome)
npm run test:e2e              # Real YouTube
npm run test:e2e:mock         # Mock videos
```

**Why Selenium?**
- Better WebDriver support for Firefox
- Handles temporary addon installation natively
- Preferred for automation stability

**Practical Implication:**
Firefox developers must run Selenium tests locally before PR. Chrome developers can use Playwright.

### 8.3 Mock Video Testing

**Both use identical mock approach:**
```typescript
getMockVideoUrl('veryShort', mockServerUrl)
```

**Location:**
- Chrome: `/Users/jeremywatt/Desktop/ytgify-glue/ytgify/tests/e2e-mock/`
- Firefox: `/Users/jeremywatt/Desktop/ytgify-glue/ytgify-firefox/tests/e2e-mock/`

**Videos are identical.** Mock server is shared.

---

## 9. CODE STATISTICS & MAINTAINABILITY

### 9.1 File Count & Size

**Total TypeScript files:** ~70 per version
**Identical files:** ~55 (78%)
**Firefox-only files:** 
- `src/lib/browser-api.ts` - Detection/context helpers
- `tests/selenium/*` - Selenium E2E framework

**Chrome-only files:**
- `scripts/build-production.sh` - Web Store build (removes localhost)
- Chrome-specific E2E setup

### 9.2 Maintenance Burden

**Current approach:** Dual codebases with 22% duplication

**If unified with abstraction layer:**
- Single source of truth for business logic
- Minimal API wrapper (< 50 lines)
- Conditional imports for platform-specific code
- Estimated code reduction: 10-15% (500-800 LOC)

---

## 10. SUMMARY TABLE

| Aspect | Chrome | Firefox | Shared? |
|--------|--------|---------|---------|
| GIF Creation | ✅ | ✅ | 100% |
| Frame Extraction | ✅ | ✅ | 100% |
| Encoding (gifenc/gifski/gif.js) | ✅ | ✅ | 100% |
| UI/Components (React) | ✅ | ✅ | 100% |
| Background messaging | ✅ | ✅ | 95% (API calls) |
| Storage | sync + local | local only | 80% |
| E2E Testing | Playwright | Selenium + Playwright | 70% |
| Testing configs | jest/playwright | jest/playwright/selenium | 80% |
| **Shared Code %** | - | - | **~78%** |

---

## 11. INTEGRATION CHECKLIST FOR BACKEND API

### Both Extensions Need:

- [ ] JWT token storage: `browser.storage.local.set({ jwtToken })`
- [ ] API client: New module `src/lib/api-client.ts`
  - Intercepts requests to add Authorization header
  - Handles token refresh (GET /api/v1/auth/refresh)
  - Same for both extensions
- [ ] Login UI: Modify popup or content script
  - Input email/password
  - Call POST /api/v1/auth/login
  - Handle success/error
- [ ] GIF Upload: Modify gif-processor.ts
  - After local save, also POST /api/v1/gifs
  - Send: gifBlob, title, description, startTime, endTime
  - Same code for both

### Firefox-Specific:

- [ ] No storage.sync available (doesn't matter for API)
- [ ] Test with Selenium driver before PR
- [ ] Verify Promise-based message handling (already done)

### Chrome-Specific:

- [ ] Test with Playwright before PR
- [ ] Verify service worker doesn't timeout during API calls

---

## 12. CONCLUSION

The Firefox extension is architecturally sound and 78% identical to Chrome. The main difference is the browser API namespace (`browser.*` vs `chrome.*`) and the absence of cloud storage sync. 

For integration with the backend API:
1. Create a unified API client module
2. Both extensions can use ~95% identical code
3. Authentication flow is identical
4. No architectural blockers identified
5. Storage differences don't impact backend integration

**Recommendation:** Consider creating a shared `src/lib/runtime-api.ts` abstraction layer to reduce maintenance overhead and enable true single-codebase deployment in the future.

