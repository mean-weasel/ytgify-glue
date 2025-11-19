# ytgify-glue

Complete ytgify ecosystem: Chrome/Firefox browser extensions + Rails backend.

## Directory Structure

```
ytgify-glue/
├── ytgify/              # Chrome extension
├── ytgify-firefox/      # Firefox extension
├── ytgify-share/        # Rails 8 + Hotwire backend
└── plans/               # Integration documentation
```

## Running Integration Tests

Integration tests verify the full flow: **Extension → Backend API → Database**.

These tests require both the Rails backend and Chrome extension to be running.

### Prerequisites

1. Rails backend running (port 3001 for tests)
2. Extension built and loaded in Chrome
3. Test database prepared

### Quick Start

```bash
# Terminal 1: Start Rails backend in test mode
cd ytgify-share
bin/rails db:test:prepare
RAILS_ENV=test bin/rails server -p 3001

# Terminal 2: Build extension
cd ytgify
npm install
npm run build

# Terminal 3: Load extension in Chrome
# 1. Go to chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select ytgify/dist folder

# Terminal 4: Run integration tests
cd ytgify
npm run test:e2e:upload
```

### Root-Level Commands

From the project root:

```bash
npm run backend:start       # Start Rails (development, port 3000)
npm run backend:test        # Start Rails (test mode, port 3001)
npm run extension:build     # Build Chrome extension (production)
npm run extension:build:dev # Build Chrome extension (development)
```

## Integration Test Coverage

**Manual Upload Flow** (`ytgify/tests/e2e-upload/upload-flow.spec.ts`):

1. ✅ Anonymous user - No upload button visible
2. ✅ Authenticated user - Manual upload via button + backend verification
3. ✅ Upload button always available for authenticated users
4. ✅ Upload failure handling (500 error)
5. ✅ Privacy settings (private uploads)
6. ✅ Token expiration handling (401 error)

All tests verify:
- Upload button visibility based on auth state
- User clicks "Upload to Cloud" button
- Upload status updates (uploading → success/failed)
- Error messages displayed to user
- GIF uploaded to backend database

## Development Workflow

### Individual Components

**Chrome Extension:**
```bash
cd ytgify
npm install
npm run dev              # Watch mode
npm test                 # Unit tests
npm run test:e2e:mock    # E2E tests (mock videos)
```

**Rails Backend:**
```bash
cd ytgify-share
bundle install
bin/dev                  # Rails + Tailwind
bin/rails test           # All tests
```

### Manual Testing Flow

1. **Start backend:** `cd ytgify-share && bin/dev`
2. **Build extension:** `cd ytgify && npm run build`
3. **Load extension:** chrome://extensions → Load unpacked → `ytgify/dist`
4. **Sign in:** Open extension popup, use test@example.com / password123
5. **Test upload:**
   - Navigate to any YouTube video
   - Click ytgify button to create GIF
   - On success screen, click "Upload to Cloud"
   - Verify success/failure message appears
6. **Verify in backend:** http://localhost:3000 (check GIFs page)

## Test Credentials

```
Email:    test@example.com
Username: testuser
Password: password123
```

Created automatically by E2E test fixtures.

## Documentation

- **Integration Strategy:** `plans/BROWSER_EXTENSION_INTEGRATION_STRATEGY.md`
- **Chrome Extension:** `ytgify/README.md` + `ytgify/CLAUDE.md`
- **Rails Backend:** `ytgify-share/CLAUDE.md`
- **Root Guide:** `CLAUDE.md`