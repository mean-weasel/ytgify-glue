# Phase 4: Testing & Chrome Launch

**Duration:** Weeks 7-8
**Status:** Not Started
**Dependencies:** Phases 0-3 Complete
**Priority:** Critical
**Focus:** Chrome extension (`ytgify`) production launch

**Navigation:** [← Phase 3](./PHASE3_SOCIAL_FEATURES.md) | [Main Strategy](./BROWSER_EXTENSION_INTEGRATION_STRATEGY.md) | [Next: Phase 5 →](./PHASE5_FIREFOX_INTEGRATION.md)

---

## Goal

Comprehensive end-to-end testing for **Chrome extension** (`ytgify`) integration with backend (`ytgify-share`). Verify production readiness and launch Chrome extension to Chrome Web Store.

**Note:** Firefox testing will be handled in Phase 5 after Chrome is live.

---

## Chrome Extension Test Matrix

| Scenario | Test Type | Pass Criteria |
|----------|-----------|---------------|
| User Registration | E2E (Playwright) | Account created, JWT returned |
| User Login | E2E (Playwright) | JWT stored, user authenticated |
| Token Refresh | E2E (Playwright) | Token refreshed before expiry |
| Token Expiry Handling | E2E (Playwright) | Redirect to login on expired token |
| Service Worker Restart | E2E (Playwright) | Token checked on restart |
| GIF Creation (Anonymous) | E2E (Playwright) | GIF saved to Downloads folder |
| GIF Creation (Authenticated) | E2E (Playwright) | GIF saved to Downloads AND uploaded to cloud |
| GIF Upload (Authenticated) | E2E (Playwright) | GIF uploaded to S3, visible in web app |
| Metadata Extraction | E2E (Playwright) | fps, resolution, duration correct |
| Like GIF | E2E (Playwright) | Like count increments, persists |
| Comment on GIF | E2E (Playwright) | Comment appears on web app |
| Notification Polling | E2E (Playwright) | Badge updates, notifications received |
| Rate Limit (429) | E2E (Playwright) | Retry mechanism activates |
| CORS Verification | Integration | chrome-extension:// requests succeed |
| Logout | E2E (Playwright) | Token cleared, local GIFs remain |

**Firefox Test Matrix:** See Phase 5 (Selenium-based tests)

---

## Chrome Extension E2E Tests (Playwright)

**Test Commands:**
```bash
cd ytgify

# Real YouTube E2E tests
npm run test:e2e:fast

# Mock video E2E tests (CI-safe)
npm run test:e2e:mock

# Full validation suite
npm run validate:pre-push
```

**Key Test File:** `tests/e2e/integration-full-journey.spec.ts`

```typescript
test('complete user journey from Chrome extension', async ({ page, context }) => {
  // 1. Load extension
  const extensionId = await loadExtension(context, 'ytgify')

  // 2. Open popup and login
  await page.goto(`chrome-extension://${extensionId}/popup.html`)
  await page.fill('input[type="email"]', 'test@example.com')
  await page.fill('input[type="password"]', 'password123')
  await page.click('button[type="submit"]')

  // 3. Verify authenticated
  await page.waitForSelector('.user-profile')

  // 4. Navigate to YouTube
  await page.goto('https://www.youtube.com/watch?v=dQw4w9WgXcQ')

  // 5. Click ytgify button
  await page.click('[data-ytgify-button]')

  // 6. Create GIF
  await page.fill('input[name="title"]', 'Test GIF from Chrome')
  await page.click('button[data-create-gif]')

  // 7. Wait for upload
  await page.waitForSelector('.upload-success')

  // 8. Verify GIF on backend
  const response = await fetch('http://localhost:3000/api/v1/gifs')
  const gifs = await response.json()
  const createdGif = gifs.find(g => g.title === 'Test GIF from Chrome')

  expect(createdGif).toBeDefined()
  expect(createdGif.fps).toBeGreaterThan(0)
  expect(createdGif.resolution_width).toBeGreaterThan(0)

  // 9. Like the GIF
  await page.goto(`chrome-extension://${extensionId}/popup.html`)
  await page.click(`[data-gif-id="${createdGif.id}"] button.like`)

  // Wait for like to register
  await page.waitForTimeout(1000)

  // 10. Verify like on backend
  const gifResponse = await fetch(`http://localhost:3000/api/v1/gifs/${createdGif.id}`)
  const updatedGif = await gifResponse.json()
  expect(updatedGif.like_count).toBe(1)

  // 11. Logout
  await page.click('button.logout')
  await page.waitForSelector('.auth-view')

  // 12. Verify token cleared
  const token = await page.evaluate(async () => {
    const result = await chrome.storage.local.get('jwtToken')
    return result.jwtToken
  })
  expect(token).toBeUndefined()
})
```

**Note:** Firefox E2E tests will be created in Phase 5 using Selenium WebDriver.

---

## Production Deployment Checklist

### Backend Infrastructure

- [ ] **S3 Configuration**
  - [ ] Doppler environment variables confirmed: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_BUCKET`
  - [ ] Test file upload via Rails console: `gif.file.attach(io: File.open('test.gif'), filename: 'test.gif')`
  - [ ] Verify blob URL generation: `Rails.application.routes.url_helpers.rails_blob_url(gif.file)`
  - [ ] Optional: CloudFront CDN configured

- [ ] **CORS Configuration**
  - [ ] Chrome extension origin: `chrome-extension://*`
  - [ ] Firefox extension origin: `moz-extension://*`
  - [ ] Production domain (if separate from backend)
  - [ ] Test CORS with real extensions

- [ ] **JWT Secret Key**
  - [ ] Strong random secret in Doppler: `JWT_SECRET_KEY` (32+ characters)
  - [ ] NOT using default: `'changeme-in-production'`
  - [ ] Verify: `ENV['JWT_SECRET_KEY']`

- [ ] **Rate Limiting**
  - [ ] Redis configured: `REDIS_URL`
  - [ ] Rack::Attack throttles active
  - [ ] 429 responses return `Retry-After` header
  - [ ] Test by exceeding limits

- [ ] **Database**
  - [ ] PostgreSQL 14+ in production
  - [ ] All migrations run: `bin/rails db:migrate:status`
  - [ ] UUID extension enabled

- [ ] **Background Jobs**
  - [ ] Sidekiq running with Redis
  - [ ] GifProcessingJob executes successfully
  - [ ] Job failures monitored

- [ ] **SSL/HTTPS**
  - [ ] Force SSL enabled: `config.force_ssl = true`
  - [ ] Valid SSL certificate
  - [ ] All API requests use HTTPS

### Extension Build

#### Chrome Extension

- [ ] Production build: `npm run build`
- [ ] API endpoint points to production (update `baseURL` in api-client.ts)
- [ ] Extension manifest version incremented
- [ ] Packaged for Chrome Web Store: Create .zip
- [ ] Store listing prepared (screenshots, description)
- [ ] Privacy policy updated (mention data collection)

#### Firefox Extension

⏸️ **Deferred to Phase 5** - Firefox extension will be built and submitted after Chrome launch

### Testing in Production

- [ ] **End-to-End Test with Production Backend**
  - [ ] Register new account from extension
  - [ ] Create and upload GIF
  - [ ] View GIF on production web app
  - [ ] Like and comment from extension
  - [ ] Receive notifications (2-minute polling)
  - [ ] Test rate limit handling
  - [ ] Logout and verify token cleared

- [ ] **Load Testing**
  - [ ] 100 concurrent users creating GIFs
  - [ ] Rate limits trigger appropriately
  - [ ] No database connection pool exhaustion
  - [ ] S3 upload throughput acceptable
  - [ ] Response times < 500ms (p95)

- [ ] **Security Scan**
  - [ ] Run Brakeman: `bundle exec brakeman`
  - [ ] No HIGH or CRITICAL vulnerabilities
  - [ ] Review MEDIUM vulnerabilities
  - [ ] Update dependencies with security patches
  - [ ] Test JWT token expiration
  - [ ] Verify CORS only allows extension origins

### Monitoring & Logging

- [ ] Application monitoring (New Relic, Scout APM, etc.)
- [ ] Error tracking (Sentry, Rollbar, etc.)
- [ ] Log aggregation (Papertrail, Loggly, etc.)
- [ ] API response time dashboards
- [ ] Extension error reporting configured
- [ ] Alerts for:
  - [ ] API error rate > 5%
  - [ ] Database connection failures
  - [ ] S3 upload failures
  - [ ] Sidekiq queue backup

### Rollback Plan

- [ ] Document rollback procedure
- [ ] Keep previous extension version .zip files
- [ ] Database backup before deployment
- [ ] Ability to revert API changes quickly
- [ ] Communication plan for users

---

## Manual Testing Checklist

### Authentication Flow
- [ ] Open extension popup
- [ ] Click "Sign In"
- [ ] Enter valid credentials
- [ ] Verify successful login
- [ ] See user profile displayed
- [ ] Close and reopen popup (token persists)
- [ ] Wait 5+ minutes (service worker terminates)
- [ ] Open popup again (token still valid)
- [ ] Click "Sign Out"
- [ ] Verify token cleared

### GIF Creation & Upload
- [ ] Navigate to YouTube video
- [ ] Click ytgify button
- [ ] Set start/end times
- [ ] Add title and text overlay
- [ ] Create GIF
- [ ] Verify local save
- [ ] Verify cloud upload (if authenticated)
- [ ] Check metadata (fps, resolution)
- [ ] View GIF on web app
- [ ] Verify S3 URL works

### Offline Functionality
- [ ] Disconnect internet
- [ ] Create GIF on YouTube
- [ ] Verify saved locally
- [ ] Reconnect internet
- [ ] Login (if not logged in)
- [ ] Verify GIF auto-syncs

### Social Features
- [ ] Like a GIF from extension
- [ ] Verify like count increments
- [ ] View GIF on web app (like persists)
- [ ] Add comment (opens web app)
- [ ] Receive notification (2 minutes later)
- [ ] Badge count updates

### Rate Limiting
- [ ] Make many rapid API calls
- [ ] Verify 429 error handling
- [ ] Verify retry mechanism
- [ ] Check user-friendly error message

### Chrome-Specific Testing
- [ ] Install Chrome extension from .zip
- [ ] Test on Chrome stable, beta, dev channels
- [ ] Test on different OS (Windows, macOS, Linux)
- [ ] No Chrome-specific bugs

⏸️ **Firefox testing:** Deferred to Phase 5

---

## Launch Checklist

### Pre-Launch (1 week before)
- [ ] All E2E tests passing (100%)
- [ ] Production deployment checklist complete
- [ ] Beta testing with 10-20 users
- [ ] No critical bugs reported
- [ ] Documentation complete
- [ ] Support email/channel set up

### Launch Day
- [ ] Backend deployed and stable
- [ ] Chrome extension submitted to Web Store (2-3 day review)
- [ ] Monitoring dashboards active
- [ ] Team on standby for issues
- [ ] Announcement prepared (Chrome launch)

⏸️ **Firefox Add-ons submission:** Phase 5 (after Chrome is stable)

### Post-Launch (First Week)
- [ ] Monitor error rates daily
- [ ] Respond to user feedback
- [ ] Fix critical bugs within 24 hours
- [ ] Track key metrics:
  - [ ] Daily active users
  - [ ] GIF creation rate
  - [ ] Upload success rate
  - [ ] User retention (Day 1, 7, 30)

---

## Success Metrics (Review After 30 Days)

### Phase 0 Success
- [x] Firefox extension can make CORS requests
- [x] Chrome extension can make CORS requests
- [x] S3 file upload working
- [x] Test environment accessible

### Phase 1 Success
- [ ] 100% of extension users can authenticate
- [ ] Token refresh works reliably
- [ ] Service worker restarts don't break auth
- [ ] Zero authentication-related errors

### Phase 2 Success
- [ ] 95%+ upload success rate
- [ ] Average upload time < 5 seconds
- [ ] Metadata extraction accurate
- [ ] Zero data loss incidents

### Phase 3 Success
- [ ] Users can like/comment from extension
- [ ] Notification polling updates badge within 2 minutes
- [ ] Rate limits handled gracefully

### Overall Chrome Launch Success
- [ ] Chrome extension rating > 4.5 stars
- [ ] User retention > 60% after 30 days
- [ ] Zero critical bugs reported
- [ ] API error rate < 1%
- [ ] **Chrome extension live in production** 🚀

**Firefox Success Metrics:** See Phase 5

---

## Next Steps After Chrome Launch

### Phase 5: Firefox Integration (Weeks 9-10)
Port Chrome implementation to Firefox extension:
- Firefox CORS configuration
- Browser API adaptation (`chrome.*` → `browser.*`)
- Firefox E2E tests (Selenium)
- Firefox Add-ons submission

**See:** [Phase 5: Firefox Integration](./PHASE5_FIREFOX_INTEGRATION.md)

### Future Phases (After Both Browsers Live)
- **Optimization:** Performance improvements, UI/UX enhancements
- **Advanced Features:** GIF remixing, collections management
- **Analytics:** User analytics dashboard, usage patterns

---

**Estimated Time:** 40-45 hours (Chrome only)
**Dependencies:** Phases 0-3 complete
**Status:** ⚠️ Ready after Phase 3

---

**🎉 Chrome Extension Ready for Launch!**
**🦊 Firefox Extension in Phase 5**
