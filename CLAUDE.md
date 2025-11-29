# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YTgify is a YouTube GIF creation platform consisting of three integrated components:
- **ytgify/** - Chrome Manifest V3 extension (React + TypeScript)
- **ytgify-firefox/** - Firefox WebExtension (React + TypeScript)
- **ytgify-share/** - Rails 8 backend with Hotwire (no React/Vue)

Each sub-project has its own CLAUDE.md with component-specific details.

## Root Commands

```bash
# Development
npm run backend:start       # Rails dev server (port 3000)
npm run backend:test        # Rails test mode (port 3001)
npm run extension:build     # Chrome production build
npm run extension:build:dev # Chrome dev build (watch mode)

# CI/CD
npm run ci:chrome           # Lint + typecheck + tests + build
npm run ci:firefox          # Lint + typecheck + tests + build
npm run ci:rails            # Rails tests
npm run ci:all              # All CI checks

# Integration tests (requires Rails backend running on port 3001)
npm run test:integration
```

## Component Commands

**Chrome Extension (ytgify/):**
```bash
npm run build              # Production build
npm run dev               # Watch mode
npm run validate:pre-push # Full validation before PR
npm run test:e2e          # E2E tests (headless)
npm run test:e2e:headed   # E2E with visible browser
```

**Firefox Extension (ytgify-firefox/):**
```bash
npm run build             # Webpack build
npm run dev              # Watch mode + Firefox reload
npm run validate         # Typecheck + lint + unit tests
npm run test:selenium:mock # Mock E2E (headless)
```

**Rails Backend (ytgify-share/):**
```bash
bin/dev                  # Rails + Tailwind
bin/rails test           # All tests
bin/rails test path/to/test.rb -n test_method_name  # Single test
```

## Architecture

### Extension Architecture (Chrome & Firefox)
- **Content Script**: YouTube integration, frame capture, GIF processing, React overlay wizard
- **Background**: Message routing (service worker on Chrome, event page on Firefox)
- **Popup**: Settings UI, button visibility controls

GIF creation flow: User triggers wizard → parameter collection → frame extraction from canvas → text overlay → GIF encoding (gifenc primary, gif.js fallback) → download to browser → optional cloud upload

### Rails Backend Architecture
- **Tech**: Rails 8.0.4, PostgreSQL (UUID primary keys), Hotwire (Turbo + Stimulus), Tailwind CSS 4
- **Auth**: Devise (web sessions) + JWT (API for extensions)
- **Real-time**: ActionCable + Turbo Streams
- **Storage**: AWS S3 via ActiveStorage
- **Jobs**: Sidekiq + Redis

Key models: User → Gif → Like, Comment, Collection, Notification (polymorphic)

### Extension ↔ Backend Integration
- Extensions authenticate via JWT tokens (Authorization: Bearer)
- Upload endpoint: POST /api/v1/gifs with multipart form data
- Test credentials: test@example.com / password123

## Cross-Project Patterns

### API Differences
- Chrome: `chrome.*` API (callback-based, some Promise support)
- Firefox: `browser.*` API (Promise-based)

### Message Passing
Both extensions use typed request/response patterns. Message types defined in `src/types/messages.ts` and `src/shared/messages.ts`. Use type guards for safe handling.

### Storage
- Extensions: `chrome.storage.sync`/`browser.storage.local` for settings
- Backend: PostgreSQL + S3

## Testing

### E2E Test Videos
Both extensions use generated test videos with mock YouTube servers. Run `npm run generate:test-videos` in extension directory if videos are missing.

### Integration Tests
Verify full flow: Extension → Backend API → Database

```bash
# Terminal 1: Rails test mode
cd ytgify-share && RAILS_ENV=test bin/rails server -p 3001

# Terminal 2: Run integration tests
cd ytgify && npm run test:e2e:upload
```

## Key Constraints

- YouTube Shorts: Disabled (technical limitations)
- Max GIF duration: ~30 seconds
- Memory limit: Reject if `(width * height * 4 * 2) / (1024 * 1024) > 1000 MB`
- Localhost permissions: Dev/test only, stripped by production builds
