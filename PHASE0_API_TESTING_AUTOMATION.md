# Phase 0: API Testing Automation - Complete

Automated Playwright E2E tests for verifying Chrome extension → Backend API connectivity.

## What Was Created

### 1. Playwright E2E Test Suite
**File:** `ytgify/tests/e2e/api-connectivity.spec.ts`

Four comprehensive test cases:
- ✅ Chrome extension can communicate with backend API (comprehensive check)
- ✅ Extension popup can access backend API
- ✅ CORS allows chrome-extension origin
- ✅ JWT authentication flow works end-to-end

**Tests verify:**
- CORS configuration (`chrome-extension://*` origin allowed)
- Public API endpoints (`GET /api/v1/gifs`)
- Authentication (`POST /api/v1/auth/login`)
- Authenticated requests (`GET /api/v1/auth/me`)
- JWT token handling

### 2. NPM Test Commands
**File:** `ytgify/package.json` (updated)

```bash
# Run API connectivity tests (headless)
npm run test:api

# Run with visible browser (for debugging)
npm run test:api:headed

# Run in debug mode (step-by-step)
npm run test:api:debug

# Start backend server
npm run backend:start
```

### 3. Backend Startup Script
**File:** `ytgify/scripts/start-backend-for-tests.sh`

Automated script that:
- Checks if backend directory exists
- Verifies Doppler is installed and configured
- Checks if server is already running
- Installs dependencies
- Sets up database
- Seeds test data
- Starts Rails server

### 4. Documentation
**File:** `ytgify/tests/e2e/API_TESTING_README.md`

Comprehensive guide covering:
- Quick start instructions
- What's being tested
- Prerequisites
- Troubleshooting common issues
- CI/CD integration considerations
- Manual testing alternative

### 5. Legacy Manual Test Script (Updated)
**File:** `ytgify/test-api.js`

Browser console script for manual testing (still useful for quick checks).

---

## How to Run the Tests

### Step 1: Start the Backend

**Terminal 1:**
```bash
cd ytgify-share
doppler run -- bin/dev
```

Wait for:
```
* Listening on http://localhost:3000
```

### Step 2: Run the Tests

**Terminal 2:**
```bash
cd ytgify

# Build extension first (if not already built)
npm run build

# Run API tests
npm run test:api
```

### Expected Output

```
🧪 Starting Chrome Extension API Connectivity Tests...

📊 API Connectivity Test Results:
✅ Passed: 8
❌ Failed: 0

✅ GET /api/v1/gifs returns 200 OK: Status: 200
✅ CORS header present: Origin: chrome-extension://...
✅ Response is valid JSON: Received 3 GIFs
✅ OPTIONS preflight successful: Status: 200
✅ POST method allowed in CORS: Methods: GET, POST, PATCH, DELETE, OPTIONS
✅ Login successful: User: gifmaster
✅ JWT token in Authorization header: Token present
✅ Authenticated request successful: Status: 200
✅ User profile retrieved: Email: gifmaster@example.com

Running 4 tests using 1 worker

  ✓ Chrome extension can communicate with backend API (2.3s)
  ✓ Extension popup can access backend API (1.1s)
  ✓ CORS allows chrome-extension origin (0.8s)
  ✓ JWT authentication flow works end-to-end (1.5s)

  4 passed (6.2s)
```

---

## Test Architecture

### How It Works

1. **Playwright launches Chromium** with extension loaded (`dist/` directory)
2. **Extension is loaded** with unique extension ID
3. **Tests access service worker** via `context.serviceWorkers()[0]`
4. **JavaScript executes** in extension context (has `chrome` API access)
5. **Fetch requests are made** from extension to backend
6. **Results are captured** and assertions are made

### Key Implementation Details

```typescript
// Get service worker (background page)
const serviceWorkers = context.serviceWorkers();
const backgroundPage = serviceWorkers[0];

// Execute code in extension context
const result = await backgroundPage.evaluate(async () => {
  // This code runs INSIDE the extension
  const response = await fetch('http://localhost:3000/api/v1/gifs');
  return { ok: response.ok, status: response.status };
});

// Assert on results
expect(result.ok).toBe(true);
```

### Why This Works

- **Real Chrome extension context:** Tests run in actual extension environment
- **Real CORS:** Browser enforces CORS just like production
- **Real JWT flow:** Complete authentication cycle is tested
- **Automated:** No manual browser interaction required

---

## Comparison: Manual vs Automated

| Aspect | Manual Test (test-api.js) | Automated Test (Playwright) |
|--------|---------------------------|------------------------------|
| **Speed** | ~2 minutes | ~6 seconds |
| **Reliability** | Human error-prone | 100% repeatable |
| **CI/CD** | ❌ Cannot automate | ✅ Fully automated |
| **Debugging** | Browser console only | Full Playwright tools |
| **Coverage** | What you remember to test | Comprehensive test suite |
| **Regression Prevention** | ❌ Manual re-testing | ✅ Automatic on every run |

---

## Integration with Existing Tests

The API tests use the same infrastructure as existing E2E tests:

### Shared Components
- **Fixtures:** `tests/e2e/fixtures.ts` (provides `context`, `extensionId`)
- **Helpers:** `tests/e2e/helpers/extension-helpers.ts` (`openExtensionPopup`, etc.)
- **Config:** `tests/playwright.config.ts` (Chromium with extension support)

### Test Organization
```
ytgify/tests/e2e/
├── api-connectivity.spec.ts     ← NEW: API tests
├── popup-cta.spec.ts            ← Existing: Popup tests
├── wizard-basic.spec.ts         ← Existing: Wizard tests
├── gif-output-validation.spec.ts
├── error-handling.spec.ts
└── ...
```

---

## Troubleshooting

### "Backend server is not running"

```bash
# Start backend first
cd ytgify-share
doppler run -- bin/dev

# Then run tests
cd ytgify
npm run test:api
```

### "Extension not loaded"

```bash
# Build extension first
npm run build

# Then run tests
npm run test:api
```

### "CORS errors"

Check `ytgify-share/config/initializers/cors.rb`:
```ruby
origins "chrome-extension://*"
expose: ["Authorization"]
credentials: true
```

Restart backend after changes.

### "Login failed: 401"

Seed database:
```bash
cd ytgify-share
doppler run -- bin/rails db:seed
```

### Debug Mode

Run tests in debug mode to step through:
```bash
npm run test:api:debug
```

Or headed mode to see browser:
```bash
npm run test:api:headed
```

---

## CI/CD Considerations

**Current Status:** Tests require running backend server.

**Options:**

### Option 1: Local Only (Recommended for now)
- Run API tests locally before merging PRs
- Add to developer pre-push checklist
- Skip in CI until backend deployment is automated

### Option 2: Docker Compose
```yaml
# docker-compose.test.yml
services:
  backend:
    build: ./ytgify-share
    environment:
      - DATABASE_URL=...
      - REDIS_URL=...
    ports:
      - "3000:3000"

  extension-tests:
    build: ./ytgify
    depends_on:
      - backend
    command: npm run test:api
```

### Option 3: Separate CI Jobs
```yaml
# .github/workflows/api-tests.yml
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - name: Start Rails server
      - name: Wait for health check

  extension-tests:
    needs: backend
    runs-on: ubuntu-latest
    steps:
      - name: Run API tests
```

**Recommendation:** Start with Option 1 (local only) for Phase 0-1, implement Option 2 (Docker Compose) for Phase 2+.

---

## Next Steps

### Immediate (Phase 0 Complete)
- [x] CORS configuration verified
- [x] S3 configuration verified
- [x] Service worker lifecycle documented
- [x] API connectivity automated testing created

### Phase 1: Authentication
- [ ] Implement JWT auth in extension
- [ ] Login/logout UI in popup
- [ ] Token storage and refresh
- [ ] Update API tests for auth flows

### Phase 2: GIF Upload
- [ ] Upload GIFs to backend
- [ ] Sync local GIFs to cloud
- [ ] Update API tests for upload flows

### Phase 3: Social Features
- [ ] Likes, comments, follows
- [ ] Collections
- [ ] Update API tests for social features

---

## Summary

**Phase 0 API Testing Automation is complete!** ✅

**What you can do now:**
1. Run automated API connectivity tests in seconds
2. Verify CORS configuration automatically
3. Test JWT authentication flow end-to-end
4. Catch API integration regressions early
5. Move confidently to Phase 1: Authentication

**Run the tests:**
```bash
# Terminal 1
cd ytgify-share && doppler run -- bin/dev

# Terminal 2
cd ytgify && npm run test:api
```

**See full details:**
- `ytgify/tests/e2e/API_TESTING_README.md`
- `ytgify/tests/e2e/api-connectivity.spec.ts`
