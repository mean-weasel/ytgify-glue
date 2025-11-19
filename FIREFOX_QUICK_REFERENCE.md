# Firefox Extension - Quick Reference Guide

## Key Architectural Differences

### 1. API Namespace
- **Chrome:** `chrome.*` (e.g., `chrome.runtime.sendMessage()`)
- **Firefox:** `browser.*` (e.g., `browser.runtime.sendMessage()`)
- Type definitions: `@types/firefox-webext-browser` vs `@types/chrome`

### 2. Background Script
- **Chrome:** Service Worker (auto-terminates after 5 min)
- **Firefox:** Event Page (longer persistence, manual cleanup via `unload` event)

### 3. Storage
- **Chrome:** `chrome.storage.local` + `chrome.storage.sync` (cloud sync)
- **Firefox:** `browser.storage.local` only (no cloud sync support)

### 4. Content Script Loading
- **Both:** Identical manifest approach
- **Difference:** Firefox skips webpack public path setup (`chrome.runtime.getURL()`)

---

## Code Sharing Status

### 100% Identical (No Changes Needed)
- `src/content/gif-processor.ts` - GIF creation pipeline
- `src/lib/encoders/*` - All encoder implementations
- `src/processing/*` - Image processing utilities
- `src/content/overlay-wizard/*` - All React components
- `src/types/*` - Message types and interfaces
- `src/utils/*` - Utility functions

### 95%+ Identical (API Calls Only)
- `src/background/index.ts` - Event listeners, initialization
- `src/background/message-handler.ts` - Message routing
- `src/shared/message-bus.ts` - Message bus implementation
- `src/lib/logger.ts` - Logging (3 lines differ)

### Firefox-Only
- `src/lib/browser-api.ts` - Detection and context helpers
- `tests/selenium/*` - Selenium WebDriver E2E tests
- `firefox-driver.ts` - Firefox-specific WebDriver setup

---

## Testing Differences

### Firefox Testing Strategy
**Primary:** Selenium WebDriver
```bash
npm run test:selenium:real      # Real YouTube (local only)
npm run test:selenium:mock      # Mock videos (CI-safe)
```

**Secondary:** Playwright
```bash
npm run test:e2e                # Playwright real YouTube
npm run test:e2e:mock           # Playwright mock videos
```

### Chrome Testing Strategy
**Primary:** Playwright
```bash
npm run test:e2e:mock:headless  # CI-safe
npm run test:e2e:fast           # Real YouTube (3 workers)
```

**Why the difference?**
- Selenium: Better WebDriver support for Firefox, handles temp addon installation
- Playwright: Better for Chrome, but works for Firefox too (secondary option)

---

## Firefox-Specific Optimizations & Constraints

### Optimizations
1. **Event Page Persistence:** Stays alive longer than Chrome service workers
2. **Promise-Based API:** No callbacks needed; async/await throughout
3. **Unload Cleanup:** Explicit cleanup on `unload` event for proper resource management

### Constraints
1. **No Storage.sync:** All storage is local only (no cross-device sync)
2. **WebCodecs:** Not supported (both versions use Canvas-based extraction)
3. **Extension Signing:** Required for distribution (unsigned auto-disables after restart)
4. **API Differences:** Some APIs work differently (e.g., `browser.downloads.download()`)

---

## Files with Browser API Calls

| File | Chrome API | Firefox API | Impact |
|------|-----------|-------------|--------|
| `src/background/index.ts` | `chrome.runtime.*` | `browser.runtime.*` | Event listener setup |
| `src/background/message-handler.ts` | `chrome.runtime.MessageSender` | `browser.runtime.MessageSender` | Type definitions |
| `src/shared/message-bus.ts` | `chrome.runtime.sendMessage()` | `browser.runtime.sendMessage()` | Message sending |
| `src/lib/logger.ts` | `chrome.storage.local` | `browser.storage.local` | Error storage (3 lines) |
| `src/background/index.ts` | `chrome.storage.local` | `browser.storage.local` | Preference init |
| `src/content/index.ts` | `chrome.runtime.getURL()` | Not used | Webpack public path |

---

## Integration with Backend API

### No Breaking Changes for Either Extension
- Both use `browser.storage.local` for JWT storage
- Message format identical for both
- Authentication flow identical
- Content script changes identical
- GIF processor changes identical

### Storage Difference (Doesn't Affect API)
- **Chrome:** Can sync prefs via `chrome.storage.sync`
- **Firefox:** Must use local storage only
- **Solution:** Backend stores preferences; extensions fetch on login

---

## Unique Firefox Files

### Detection & Context (`src/lib/browser-api.ts`)
```typescript
export const isFirefox = (): boolean => {
  return navigator.userAgent.toLowerCase().includes('firefox')
}

export const getExtensionContext = (): 'background' | 'content' | 'popup' | 'unknown' => {
  if (window.location.protocol === 'moz-extension:') {
    return 'popup' // or 'background'
  }
  return 'content'
}
```

### Selenium WebDriver Setup (`tests/selenium/firefox-driver.ts`)
- Uses `installAddon()` API (temporary addon installation)
- Sets Firefox-specific preferences (signatures, webextensions)
- Handles WebDriver initialization for E2E tests

---

## Default Preferences (Firefox-Specific)

```typescript
// src/background/index.ts lines 208-227
{
  preferWebCodecs: false,      // Firefox doesn't support WebCodecs
  analyticsEnabled: false,     // Privacy-first default
  errorReportingEnabled: true,
  performanceMonitoringEnabled: true,
}
```

---

## Maintenance Recommendations

### Current State
- 78% code sharing between extensions
- 22% duplication (mainly API calls)

### Future Optimization (Not Required for Integration)
Create abstraction layer: `src/lib/runtime-api.ts`
```typescript
export const RuntimeAPI = {
  sendMessage: (msg) => browser.runtime.sendMessage(msg),
  getURL: (path) => browser.runtime.getURL(path),
  storage: browser.storage,
  tabs: browser.tabs,
  downloads: browser.downloads,
  commands: browser.commands
}
```

**Benefit:** Single codebase for both extensions (estimated 10-15% code reduction)

---

## Key Files for Integration Work

| Task | File | Location |
|------|------|----------|
| JWT Storage | `src/background/index.ts` | Lines 200-255 |
| Message Routing | `src/background/message-handler.ts` | Lines 82-185 |
| GIF Storage | `src/background/message-handler.ts` | Lines 438-478 |
| Preferences | `src/shared/preferences.ts` | Full file |
| Messages | `src/types/messages.ts` | Full file |
| API Client (NEW) | `src/lib/api-client.ts` | To be created |

---

## Testing Checklist Before PR

### Both Extensions
- [ ] `npm run typecheck` - No TypeScript errors
- [ ] `npm run lint:code` - Code style checks
- [ ] `npm test` - Unit tests pass
- [ ] `npm run test:e2e:mock` - Mock E2E tests pass

### Firefox Specific
- [ ] `npm run test:selenium:real` - Real YouTube test (local only)
- [ ] `npm run test:selenium:mock` - Mock video test
- [ ] Extension loads in Firefox: `about:debugging`

### Chrome Specific (for comparison)
- [ ] `npm run test:e2e:fast` - Real YouTube test (3 workers)
- [ ] Extension loads in Chrome: `chrome://extensions`

---

## Documentation Files

- **Full Report:** `/Users/jeremywatt/Desktop/ytgify-glue/FIREFOX_EXPLORATION_REPORT.md` (537 lines)
- **This Guide:** `/Users/jeremywatt/Desktop/ytgify-glue/FIREFOX_QUICK_REFERENCE.md`
- **Firefox CLAUDE.md:** `/Users/jeremywatt/Desktop/ytgify-glue/ytgify-firefox/CLAUDE.md`
- **Chrome CLAUDE.md:** `/Users/jeremywatt/Desktop/ytgify-glue/ytgify/CLAUDE.md`

