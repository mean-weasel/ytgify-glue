# Phase 5: Firefox Extension Integration

**Duration:** Weeks 9-10
**Status:** Not Started (After Chrome Complete)
**Dependencies:** Phases 0-4 Complete (Chrome Live)
**Priority:** Medium

**Navigation:** [← Phase 4](./PHASE4_TESTING_LAUNCH.md) | [Main Strategy](./BROWSER_EXTENSION_INTEGRATION_STRATEGY.md)

---

## Goal

Port the fully-functional Chrome extension to Firefox with 95%+ feature parity. Leverage the 78% code overlap identified in codebase analysis to minimize duplication and accelerate Firefox launch.

**Approach:** Port and adapt Chrome implementation rather than rebuild from scratch.

---

## Why Wait Until After Chrome?

**Strategic Benefits:**
1. **Proven implementation** - Chrome version is tested and working in production
2. **Faster Firefox development** - Copy working code, adapt browser APIs
3. **Reduced risk** - Chrome users provide feedback before Firefox launch
4. **Focused effort** - Team learns Chrome quirks first, applies to Firefox
5. **78% code overlap** - Most code can be reused with minimal changes

**Time Savings:**
- Estimated Firefox development: 30-35 hours (vs 145-175 for Chrome)
- ~80% faster due to code reuse

---

## Firefox-Specific Differences

### Architecture Differences (Already Analyzed)

| Aspect | Chrome | Firefox | Impact |
|--------|--------|---------|--------|
| Background Script | Service Worker (5-min termination) | Event Page (longer persistence) | Simplifies token management |
| Storage API | `chrome.storage.sync` + `.local` | `browser.storage.local` only | Preferences won't sync across devices |
| API Calls | `chrome.*` (callbacks) | `browser.*` (Promises) | More elegant async/await code |
| Testing Framework | Playwright | Selenium WebDriver | Different test infrastructure |
| Extension Protocol | `chrome-extension://` | `moz-extension://` | CORS configuration needed |

### Code That's 100% Identical

No changes needed for:
- GIF creation pipeline
- Frame extraction logic
- All encoder implementations (gifenc, gifski, gif.js)
- React components and UI
- Message type definitions
- Utility functions
- Business logic

### Code That Needs Adaptation (22% of codebase)

**1. Browser API Calls**
```typescript
// Chrome version
await chrome.storage.local.set({ jwtToken: token })
const result = await chrome.storage.local.get('jwtToken')

// Firefox version
await browser.storage.local.set({ jwtToken: token })
const result = await browser.storage.local.get('jwtToken')
```

**2. Storage Abstraction** (Already designed for both!)
```typescript
// This code already handles both browsers
export class StorageAdapter {
  private static get api() {
    return typeof chrome !== 'undefined' ? chrome.storage : browser.storage
  }
  
  private static get isChrome(): boolean {
    return typeof chrome !== 'undefined' && chrome.storage?.sync !== undefined
  }
  
  // Preferences: Chrome uses sync, Firefox uses local
  static async savePreferences(prefs: UserPreferences) {
    const storage = this.isChrome ? this.api.sync : this.api.local
    await storage.set({ userPreferences: prefs })
  }
}
```

**3. Event Page vs Service Worker**

Firefox doesn't have 5-minute termination issue, so token management is simpler:
- Token refresh alarm still works
- No need to check on every activation (but doesn't hurt)
- Event pages are more reliable for long-running operations

---

## Implementation Tasks

### Task 1: Infrastructure Setup

**1.1 Update Backend CORS for Firefox**

**File:** `ytgify-share/config/initializers/cors.rb`

```ruby
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins "http://localhost:3000",
            "http://localhost:5173",
            "chrome-extension://*",
            "moz-extension://*"        # ADD THIS for Firefox

    resource '/api/v1/*',
      headers: :any,
      methods: [:get, :post, :patch, :delete, :options],
      expose: ['Authorization'],
      credentials: true
  end
end
```

**1.2 Set Up Firefox Testing**

```bash
cd ytgify-firefox

# Install dependencies
npm install

# Verify Selenium setup
npm run test:selenium:mock

# Should pass (existing tests already work)
```

**Checklist:**
- [ ] Firefox CORS added to backend
- [ ] Backend restarted
- [ ] Firefox test infrastructure verified
- [ ] Existing Firefox tests passing

**Estimated Time:** 1 hour

---

### Task 2: Port Chrome Authentication Code

**Strategy:** Copy Chrome Phase 1 implementation, adapt browser APIs.

**Files to Port:**
- ✅ `src/lib/storage-adapter.ts` - Already browser-agnostic!
- ✅ `src/lib/api-client.ts` - Already browser-agnostic!
- ⚠️ `src/background/token-manager.ts` - Replace `chrome.*` with `browser.*`
- ⚠️ `src/background/index.ts` - Replace `chrome.*` with `browser.*`
- ✅ `src/popup/components/AuthView.tsx` - No changes needed
- ✅ `src/popup/components/UserProfile.tsx` - No changes needed

**Adaptation Example:**

```typescript
// Chrome version (ytgify/src/background/token-manager.ts)
chrome.alarms.create('refreshToken', { periodInMinutes: 10 })
chrome.runtime.sendMessage({ type: 'TOKEN_EXPIRED' })

// Firefox version (ytgify-firefox/src/background/token-manager.ts)
browser.alarms.create('refreshToken', { periodInMinutes: 10 })
browser.runtime.sendMessage({ type: 'TOKEN_EXPIRED' })
```

**Checklist:**
- [ ] API client ported (minimal changes)
- [ ] Token manager ported (browser.* API)
- [ ] Background script ported
- [ ] Popup UI ported (no changes)
- [ ] Login/logout working
- [ ] Token refresh working
- [ ] Unit tests passing

**Estimated Time:** 8-10 hours

---

### Task 3: Port GIF Upload Code

**Strategy:** Copy Chrome Phase 2 implementation directly (business logic identical).

**Files to Port:**
- ✅ `src/content/gif-processor.ts` - No changes (uses fetch API)
- ⚠️ `src/background/sync-manager.ts` - Replace `chrome.*` with `browser.*`
- ✅ `src/popup/components/UploadProgress.tsx` - No changes

**Key Insight:** GIF upload code uses standard `fetch()` API, not browser extension APIs, so it's 100% portable.

**Checklist:**
- [ ] Metadata extraction working
- [ ] Cloud upload working
- [ ] Offline sync working
- [ ] Upload UI functional
- [ ] E2E tests passing

**Estimated Time:** 6-8 hours

---

### Task 4: Port Social Features Code

**Strategy:** Copy Chrome Phase 3 implementation (API calls use fetch).

**Files to Port:**
- ✅ `src/lib/social-actions.ts` - No changes
- ⚠️ `src/background/notification-poller.ts` - Replace `chrome.*` with `browser.*`
- ✅ `src/popup/components/GifCard.tsx` - No changes

**Firefox-Specific:**
```typescript
// Chrome version
chrome.action.setBadgeText({ text: unreadCount.toString() })
chrome.notifications.create({ ... })

// Firefox version
browser.browserAction.setBadgeText({ text: unreadCount.toString() })
browser.notifications.create({ ... })
```

**Checklist:**
- [ ] Like/comment working
- [ ] Notification polling working
- [ ] Badge count updating
- [ ] Browser notifications shown
- [ ] E2E tests passing

**Estimated Time:** 5-6 hours

---

### Task 5: Cross-Browser Testing

**Test Matrix (Firefox Focus):**

| Test Scenario | Firefox (Selenium) | Pass Criteria |
|---------------|-------------------|---------------|
| User Login | ✓ | JWT stored, user authenticated |
| Token Refresh | ✓ | Token refreshed before expiry |
| GIF Creation (Offline) | ✓ | GIF saved in IndexedDB |
| GIF Upload | ✓ | GIF uploaded to S3, visible on web |
| Metadata Extraction | ✓ | fps, resolution, duration correct |
| Offline→Online Sync | ✓ | Offline GIFs auto-upload |
| Like GIF | ✓ | Like count increments |
| Comment on GIF | ✓ | Comment appears on web |
| Notification Polling | ✓ | Badge updates |
| Rate Limit (429) | ✓ | Retry mechanism works |
| CORS Verification | ✓ | moz-extension:// allowed |
| Logout | ✓ | Token cleared |

**Test Commands:**
```bash
cd ytgify-firefox

# Run full test suite
npm run test:selenium:real

# Run mock tests (CI-safe)
npm run test:selenium:mock

# Full validation
npm run validate
```

**Checklist:**
- [ ] All Selenium tests passing
- [ ] Feature parity with Chrome verified
- [ ] No Firefox-specific bugs
- [ ] Performance acceptable

**Estimated Time:** 6-8 hours

---

### Task 6: Firefox Add-ons Submission

**Preparation:**

1. **Production Build**
   ```bash
   cd ytgify-firefox
   npm run build
   
   # Update API endpoint to production
   # Edit src/lib/api-client.ts - set baseURL to production
   ```

2. **Manifest Updates**
   ```json
   {
     "version": "1.0.0",  // Match Chrome version
     "browser_specific_settings": {
       "gecko": {
         "id": "ytgify@firefox.extension",
         "strict_min_version": "109.0"
       }
     }
   }
   ```

3. **Create Submission Package**
   ```bash
   # Create .zip excluding dev files
   zip -r ytgify-firefox-v1.0.0.zip dist/* manifest.json icons/* -x "*.map"
   ```

4. **Submit to Mozilla**
   - https://addons.mozilla.org/developers/
   - Create new addon listing
   - Upload .zip file
   - Review process: 1-2 weeks (longer than Chrome)

**Documentation Needed:**
- Privacy policy (same as Chrome)
- Screenshots (5-6 images)
- Description (can reuse Chrome store description)
- Permissions explanation

**Checklist:**
- [ ] Production build complete
- [ ] Manifest version incremented
- [ ] Submission package created
- [ ] Mozilla Add-ons listing complete
- [ ] Privacy policy uploaded
- [ ] Screenshots uploaded
- [ ] Submitted for review

**Estimated Time:** 4-5 hours

---

## Testing Strategy

### Unit Tests
- Reuse Chrome unit tests (change `chrome.*` to `browser.*`)
- Test browser API detection
- Test storage fallback (no sync)

### Integration Tests
- Port Chrome integration tests
- Verify CORS with Firefox
- Test Firefox-specific APIs (browserAction, etc.)

### E2E Tests (Selenium)
- Full user journey (same as Chrome Playwright tests)
- Real YouTube integration
- Mock video tests for CI

### Manual Testing Checklist
Same as Chrome Phase 4, but on Firefox:
- [ ] Install extension from .xpi
- [ ] Sign in from popup
- [ ] Create GIF on YouTube
- [ ] Upload to backend
- [ ] Like/comment from extension
- [ ] Receive notifications
- [ ] Logout

---

## Deliverables

- [x] Firefox CORS configured
- [x] All Chrome code ported to Firefox
- [x] Browser API calls adapted (`browser.*`)
- [x] Storage abstraction working (no sync)
- [x] All features working (95%+ parity)
- [x] Selenium test suite passing
- [x] Firefox Add-ons submission complete
- [x] **Firefox extension live in production**

---

## Timeline Breakdown

| Task | Estimated Time |
|------|---------------|
| Infrastructure Setup | 1 hour |
| Port Authentication | 8-10 hours |
| Port GIF Upload | 6-8 hours |
| Port Social Features | 5-6 hours |
| Cross-Browser Testing | 6-8 hours |
| Firefox Add-ons Submission | 4-5 hours |
| **Total** | **30-38 hours** |

**Calendar Time:** 2 weeks (Weeks 9-10)

---

## Success Metrics

### Phase 5 Success
- [ ] Firefox extension rating > 4.5 stars
- [ ] 95%+ feature parity with Chrome
- [ ] Zero Firefox-specific critical bugs
- [ ] Firefox extension live in production
- [ ] Review completion < 2 weeks

### Cross-Browser Success
- [ ] Identical user experience Chrome/Firefox
- [ ] Both extensions have same features
- [ ] Both extensions use same backend API
- [ ] Code sharing maintained (78%+)

---

## Known Firefox Advantages Over Chrome

1. **No Service Worker Termination** - Event pages persist longer
2. **Native Promises** - Cleaner async code throughout
3. **Better Developer Tools** - Extension debugging easier
4. **No Keep-Alive Hacks** - Service worker issues don't exist

**Result:** Some Chrome workarounds can be removed in Firefox version.

---

## Common Issues & Solutions

### Issue: Storage.sync not available
**Solution:** 
- This is expected! Firefox doesn't have sync storage
- Storage adapter already handles this with fallback to local

### Issue: browserAction vs action API
**Solution:**
- Firefox uses `browser.browserAction` (Manifest V2 compatibility)
- Chrome uses `chrome.action` (Manifest V3)
- Code should check which API is available

### Issue: Selenium tests slower than Playwright
**Solution:**
- This is expected, Selenium is generally slower
- Firefox tests still faster than rewriting from scratch

---

## Next Steps

After Phase 5 completion:

1. ✅ **Both extensions live in production** (Chrome & Firefox)
2. ✅ Monitor user feedback from both platforms
3. ✅ Fix bugs specific to each browser
4. → **Post-launch optimization** (Phase 6)

---

**Estimated Total Time:** 30-35 hours
**Dependencies:** Chrome Phases 0-4 complete and live
**Status:** ⚠️ Ready after Chrome production launch

---

**🎉 Firefox Launch Completes Full Browser Coverage!**
