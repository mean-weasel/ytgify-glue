# Phase 0: Pre-Implementation Setup

**Duration:** Week 0 (2-3 days)
**Status:** Not Started
**Priority:** Critical (Blocker for Phase 1)
**Focus:** Chrome Extension Only

**Navigation:** [← Back to Main Strategy](./BROWSER_EXTENSION_INTEGRATION_STRATEGY.md) | [Next: Phase 1 →](./PHASE1_AUTHENTICATION.md)

---

## Goal

Configure infrastructure for **Chrome extension** development. This phase ensures the Chrome extension can communicate with the backend API and that all production services are ready.

**Note:** Firefox integration is deferred to Phase 5 (after Chrome is complete).

---

## Why This Phase is Critical

Without completing Phase 0:
- ❌ Chrome extension API requests will fail with CORS errors
- ❌ Phase 2 GIF uploads may fail if S3 not properly configured
- ❌ Team won't understand service worker constraints
- ❌ Can't verify end-to-end connectivity

**This phase unblocks all subsequent Chrome development.**

**Firefox:** CORS and testing infrastructure will be configured in Phase 5.

---

## Tasks

### Task 1: Update CORS for Chrome Extension

**Problem:** Current CORS configuration needs to allow Chrome extension origin.

**File:** `ytgify-share/config/initializers/cors.rb`

**Current Configuration (may vary):**
```ruby
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins "http://localhost:3000",
            "http://localhost:5173"

    resource '/api/v1/*',
      headers: :any,
      methods: [:get, :post, :patch, :delete, :options]
  end
end
```

**Update To:**
```ruby
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins "http://localhost:3000",
            "http://localhost:5173",
            "chrome-extension://*"      # Add this line for Chrome

    resource '/api/v1/*',
      headers: :any,
      methods: [:get, :post, :patch, :delete, :options],
      expose: ['Authorization'],       # Expose auth header
      credentials: true                # Allow credentials
  end
end
```

**Note:** Firefox CORS (`moz-extension://*`) will be added in Phase 5.

**Testing:**
```bash
# From Chrome extension
curl -X OPTIONS http://localhost:3000/api/v1/gifs \
  -H "Origin: chrome-extension://your-extension-id" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Should return:
# Access-Control-Allow-Origin: chrome-extension://your-extension-id
# Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS
```

**Checklist:**
- [ ] CORS configuration updated
- [ ] Rails server restarted
- [ ] Chrome extension CORS test passes
- [ ] Committed to version control

**Estimated Time:** 15 minutes

---

### Task 2: Verify S3 Configuration (Production)

**Problem:** Need to confirm S3 is properly configured via Doppler for production file uploads.

**Doppler Environment Variables Required:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_BUCKET`

**Verification Steps:**

1. **Check Doppler Configuration**
   ```bash
   cd ytgify-share
   doppler secrets get AWS_ACCESS_KEY_ID
   doppler secrets get AWS_BUCKET
   doppler secrets get AWS_REGION
   ```

2. **Verify Rails Credentials**
   ```bash
   bin/rails runner "puts ENV['AWS_ACCESS_KEY_ID'].present? ? 'AWS credentials configured' : 'AWS credentials MISSING'"
   ```

3. **Test S3 Upload from Rails Console**
   ```ruby
   # Open Rails console
   bin/rails console

   # Create a test GIF record
   user = User.first || User.create!(email: 'test@example.com', password: 'password123', username: 'testuser')

   gif = Gif.new(
     user: user,
     title: 'S3 Test Upload',
     privacy: :public_access
   )

   # Attach a test file
   gif.file.attach(
     io: File.open(Rails.root.join('test', 'fixtures', 'files', 'test.gif')),
     filename: 'test.gif',
     content_type: 'image/gif'
   )

   gif.save!

   # Verify blob URL generation
   blob_url = Rails.application.routes.url_helpers.rails_blob_url(gif.file, only_path: false)
   puts "✅ Blob URL: #{blob_url}"

   # Verify file exists in S3
   gif.file.blob.service.exist?(gif.file.blob.key) # Should return true
   ```

4. **Verify Storage Configuration**
   ```bash
   # Check config/storage.yml
   cat config/storage.yml

   # Should have amazon service configured for production
   ```

**Local Testing (Phase 1):**
- Phase 1 (Authentication) can use local disk storage
- S3 required for Phase 2 (GIF uploads) and beyond

**Checklist:**
- [ ] Doppler environment variables confirmed
- [ ] S3 bucket accessible from Rails
- [ ] Test file upload succeeds
- [ ] Blob URL generation works
- [ ] File accessible via generated URL
- [ ] Optional: CloudFront CDN configured

**Estimated Time:** 2-3 hours (including CDN setup if needed)

---

### Task 3: Document Service Worker Lifecycle Strategy

**Problem:** Chrome service workers terminate after 5 minutes idle. Token refresh alarm may not fire if worker is terminated.

**Create Document:** `ytgify/docs/SERVICE_WORKER_LIFECYCLE.md`

**Content:**
```markdown
# Chrome Service Worker Lifecycle Management

## The Problem

Chrome Manifest V3 service workers automatically terminate after **5 minutes of inactivity**. This creates challenges for:

1. JWT token refresh (tokens expire in 15 minutes)
2. Alarm-based background tasks
3. Persistent state management

## How Service Workers Terminate

**Inactivity Conditions:**
- No extension messages sent/received
- No active event listeners processing events
- No open ports to content scripts
- No pending promises

**What Happens:**
- All in-memory state is lost
- Alarms continue to run (Chrome wakes worker when alarm fires)
- Storage (`chrome.storage.*`) persists
- IndexedDB persists

## Our Solution: Token Refresh on Activation

**Strategy:** Check and refresh JWT token every time the service worker activates, not just on alarms.

**Activation Events:**
- `chrome.runtime.onStartup` - Browser starts
- `chrome.runtime.onInstalled` - Extension installed/updated
- Service worker wakes from termination (any event listener)

**Implementation:**
```typescript
// src/background/token-manager.ts

export class TokenManager {
  private static readonly TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000 // 5 min

  static async onServiceWorkerActivation() {
    const token = await this.getStoredToken()
    if (!token) return

    const decoded = this.decodeToken(token)
    const expiresAt = decoded.exp * 1000
    const timeUntilExpiry = expiresAt - Date.now()

    // If token expires in < 5 minutes, refresh immediately
    if (timeUntilExpiry < this.TOKEN_REFRESH_THRESHOLD) {
      await this.refreshToken()
    }
  }
}

// src/background/index.ts

chrome.runtime.onStartup.addListener(TokenManager.onServiceWorkerActivation)
chrome.runtime.onInstalled.addListener(TokenManager.onServiceWorkerActivation)

// Also keep alarm as backup
chrome.alarms.create('refreshToken', { periodInMinutes: 10 })
```

## Testing Service Worker Termination

**Simulate Termination:**
1. Open `chrome://serviceworker-internals/`
2. Find ytgify extension service worker
3. Click "Stop" button
4. Service worker terminates
5. Trigger any extension action (open popup, create GIF)
6. Service worker re-activates
7. Token refresh should run automatically

**Test Scenarios:**
- [ ] Token valid → Worker terminates → Worker restarts → Token still valid (no refresh)
- [ ] Token expires in 4 min → Worker terminates → Worker restarts → Token refreshed
- [ ] Token expired → Worker terminates → Worker restarts → User redirected to login

## Firefox Differences

**Firefox uses event pages, not service workers:**
- Event pages stay alive **longer** (no 5-minute limit)
- More persistent than Chrome service workers
- Same code works, but termination is less frequent

## Best Practices

1. **Never rely on in-memory state** - Always use `chrome.storage.local`
2. **Check critical state on activation** - Token expiry, sync status, etc.
3. **Use alarms as backup** - But don't depend solely on them
4. **Keep event listeners simple** - Avoid long-running operations

## References

- [Chrome Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/mv3/service_workers/lifecycle/)
- [Service Worker Termination](https://developer.chrome.com/docs/extensions/mv3/service_workers/basics/#idle-shutdown)
```

**Checklist:**
- [ ] Documentation created
- [ ] Team reviewed and understands constraints
- [ ] Implementation strategy agreed upon

**Estimated Time:** 1-2 hours

---

### Task 4: Chrome Extension Can Call API Successfully

**Problem:** Need end-to-end verification that Chrome extension can make API requests.

**Test Plan:**

1. **Start Backend Server**
   ```bash
   cd ytgify-share
   bin/dev  # Starts Rails server
   ```

2. **Create Test User**
   ```bash
   bin/rails console

   User.create!(
     email: 'chrome-test@example.com',
     password: 'password123',
     username: 'chrometest',
     display_name: 'Chrome Test'
   )
   ```

3. **Test CORS from Chrome Extension**

   Create temporary test script: `ytgify/test-api.js`
   ```javascript
   // Test API call from extension
   const testAPI = async () => {
     try {
       const response = await fetch('http://localhost:3000/api/v1/gifs', {
         method: 'GET',
         headers: {
           'Content-Type': 'application/json'
         }
       })

       if (response.ok) {
         console.log('✅ API call successful!')
         const data = await response.json()
         console.log('GIFs:', data)
       } else {
         console.error('❌ API call failed:', response.status)
       }
     } catch (error) {
       console.error('❌ API error:', error)
     }
   }

   testAPI()
   ```

   Run from extension console (popup or background):
   ```
   1. Load extension in Chrome (chrome://extensions)
   2. Open extension popup or background page
   3. F12 → Console → Paste script → Enter
   ```

**Success Criteria:**
- ✅ Chrome extension can call `/api/v1/gifs` without CORS errors
- ✅ Backend returns 200 OK with data
- ✅ No console errors
- ✅ Network tab shows correct CORS headers

**Checklist:**
- [ ] Backend server running
- [ ] Test user created
- [ ] Chrome extension API call succeeds
- [ ] CORS headers present in responses
- [ ] No CORS errors in console

**Estimated Time:** 20 minutes

---

## Deliverables

By the end of Phase 0, you should have:

- [x] CORS configuration updated for Chrome
- [x] S3 configuration verified (production-ready)
- [x] Service worker lifecycle documented
- [x] Chrome extension making successful API calls
- [x] Team understands service worker constraints
- [x] Infrastructure ready for Chrome Phase 1

**Firefox:** Will be configured in Phase 5 after Chrome is complete.

---

## Common Issues & Solutions

### Issue: CORS errors persist after configuration
**Solution:**
- Restart Rails server after CORS changes
- Clear browser cache and extension storage
- Verify origin header matches exactly (including protocol)

### Issue: S3 upload fails with "Access Denied"
**Solution:**
- Check IAM permissions on AWS bucket
- Verify Doppler environment variables are correct
- Ensure bucket CORS policy allows Rails server origin

### Issue: Service worker keeps terminating
**Solution:**
- This is expected behavior! Design around it
- Use `chrome.storage.local` for persistence
- Check token on every activation

---

## Next Steps

Once all Phase 0 tasks are complete:

1. ✅ Commit all configuration changes
2. ✅ Update team on infrastructure status
3. ✅ Schedule Phase 1 kickoff
4. → **[Proceed to Phase 1: Authentication](./PHASE1_AUTHENTICATION.md)**

---

**Estimated Total Time:** 4-6 hours (reduced - Chrome only)
**Dependencies:** None (this is the first phase)
**Blockers:** None

**Status:** ⚠️ Ready to begin
