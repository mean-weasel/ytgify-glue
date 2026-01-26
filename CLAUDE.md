# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YTgify is a YouTube GIF creation platform consisting of three integrated components:
- **ytgify/** - Chrome Manifest V3 extension (React + TypeScript) - v1.0.19
- **ytgify-firefox/** - Firefox WebExtension (React + TypeScript) - v1.0.19
- **ytgify-share/** - Rails 8 backend with Hotwire (marketing site + social platform + API)

Each sub-project has its own CLAUDE.md with component-specific details.

## Current Status

**Extensions:** Published to Chrome Web Store and Firefox Add-ons (v1.0.19)
**Backend:** Production-ready with marketing site, blog, and social features
**Integration:** Full JWT authentication and GIF upload from extensions to backend

## First Time Setup

```bash
# 1. Install Doppler CLI (https://docs.doppler.com/docs/install-cli)
# 2. Login to Doppler
doppler login

# 3. Configure Doppler for both projects
make setup
```

**Doppler projects required:**
- `ytgify` - Chrome extension credentials (GOOGLE_CLIENT_ID)
- `ytgify-share` - Rails backend credentials (RAILS_MASTER_KEY, DATABASE_URL, AWS_*, etc.)

## Development Commands (Makefile)

```bash
# Daily development
make dev-backend         # Rails server on port 3000 (Doppler + mise)
make dev-extension-build # Build extension for local testing (Doppler)
make dev-extension       # Extension with watch mode (Doppler)

# Build
make build               # Production extension build
make build-production    # Chrome Web Store build (strips localhost)

# Test
make test                # Run all tests
make test-backend        # Rails tests only
make test-extension      # Extension tests only

# Utilities
make check-doppler       # Verify Doppler configuration
make db-reset            # Reset database and seed test data
make clean               # Clean build artifacts
make install             # Install all dependencies
```

## Legacy npm Commands (CI/CD)

```bash
npm run ci:chrome           # Lint + typecheck + tests + build
npm run ci:firefox          # Lint + typecheck + tests + build
npm run ci:rails            # Rails tests
npm run ci:all              # All CI checks
npm run test:integration    # Integration tests (requires Rails on port 3000)
```

**Local development always uses Doppler** for credentials (Google OAuth, AWS, etc.).

## Architecture

### Extension Architecture (Chrome & Firefox)
- **Content Script**: YouTube integration, frame capture, GIF processing, React overlay wizard
- **Background**: Message routing (service worker on Chrome, event page on Firefox)
- **Popup**: Settings UI, user profile, authentication state

**GIF Creation Flow:**
1. User triggers wizard on YouTube video
2. Parameter collection (start/end time, resolution, FPS)
3. Frame extraction from video canvas
4. Optional text overlay
5. GIF encoding (gifenc primary, gif.js fallback)
6. Download to browser
7. Optional cloud upload to backend (JWT authenticated)

### Rails Backend Architecture

**Tech Stack:**
- Rails 8.0.4, PostgreSQL (UUID primary keys)
- Hotwire (Turbo Frames/Streams + Stimulus), Tailwind CSS 4
- Devise (web sessions) + JWT (API for extensions)
- ActionCable + Turbo Streams (real-time)
- AWS S3 via ActiveStorage
- Sidekiq + Redis (background jobs)

**Route Structure:**
```
Marketing (root level):
  /                     Landing page
  /welcome              Device detection welcome
  /privacy-policy       Privacy policy
  /terms-of-service     Terms of service
  /blog                 Blog index
  /blog/tag/:tag        Blog tag filter
  /blog/:slug           Blog post
  /share                Waitlist signup
  /share/:id            Shared GIF view

App (authenticated, /app scope):
  /app                  Feed
  /app/trending         Trending GIFs
  /app/gifs/:id         GIF detail
  /app/users/:username  User profile
  /app/collections      User collections
  /app/notifications    Notifications

API (for extensions, /api/v1):
  POST /api/v1/auth/login     JWT login
  POST /api/v1/auth/register  JWT register
  POST /api/v1/auth/refresh   Token refresh
  POST /api/v1/gifs           Upload GIF
  GET  /api/v1/feed           Personalized feed
```

**Key Models:**
- User (Devise + JWT) → Gif, Like, Comment, Collection, Follow, Notification
- Gif → Likes, Comments, Hashtags, ViewEvents, Remixes (parent_gif)
- Notification (polymorphic: recipient, actor, notifiable)

**Services:**
- `FeedService` - Personalized/trending feeds
- `NotificationService` - Creates & broadcasts real-time notifications
- `BlogService` - Markdown parsing with frontmatter, syntax highlighting

### Extension ↔ Backend Integration

Both extensions include full backend integration:
- JWT authentication (login, register, token refresh)
- GIF upload to `/api/v1/gifs` with multipart form data
- User profile caching and sync
- Rate limiting and retry logic
- Test credentials: `test@example.com` / `password123`

## CI/CD Pipeline

**Change Detection:** CI uses `dorny/paths-filter` to run only affected workflows.

**Workflows:**
1. **Chrome Extension** - Lint, typecheck, coverage, build, E2E tests (4 Playwright shards)
2. **Firefox Extension** - Lint, typecheck, coverage, build, E2E tests (3 Selenium shards)
3. **Rails Backend** - Security scan (Brakeman), lint (RuboCop), tests (PostgreSQL)
4. **Integration Tests** - 4 parallel shards with separate DBs, full extension→backend flow

**Branch Protection:** Main branch requires PRs (no direct pushes).

## Testing

### E2E Tests
- Chrome: Playwright with 4 parallel shards
- Firefox: Selenium WebDriver with 3 parallel shards
- Both use generated test videos with mock YouTube servers

### Integration Tests
```bash
# Terminal 1: Start Rails
cd ytgify-share && bin/rails server

# Terminal 2: Run integration tests
cd ytgify && REAL_BACKEND=true npm run test:e2e:upload
```

### Rails Tests
```bash
bin/rails test                             # All tests (parallel)
bin/rails test test/models/gif_test.rb    # Specific file
```

## Key Directories

```
ytgify-glue/
├── ytgify/              # Chrome extension
├── ytgify-firefox/      # Firefox extension
├── ytgify-share/        # Rails backend
│   ├── app/
│   │   ├── controllers/
│   │   │   ├── api/v1/      # API endpoints
│   │   │   ├── marketing_controller.rb
│   │   │   └── blog_controller.rb
│   │   ├── services/        # FeedService, NotificationService, BlogService
│   │   └── javascript/controllers/  # 20+ Stimulus controllers
│   └── content/blog/        # Markdown blog posts
├── .github/workflows/   # CI/CD
└── plans/               # Architecture docs (archived)
```

## Key Constraints

- YouTube Shorts: Disabled (technical limitations)
- Max GIF duration: ~30 seconds
- Memory limit: Reject if `(width * height * 4 * 2) / (1024 * 1024) > 1000 MB`
- Localhost permissions: Dev/test only, stripped by production builds
