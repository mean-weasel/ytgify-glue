# CLAUDE.md

This file provides guidance to Claude Code when working with the ytgify ecosystem.

## 🎯 Project Overview

**ytgify** is a social platform for creating, sharing, and discovering GIFs from YouTube videos. The project consists of **three separate codebases** that need to be integrated:

1. **Browser Extensions** (Chrome & Firefox) - Create GIFs from YouTube videos
2. **Web Backend** (Rails) - Social platform for sharing and discovery
3. **Integration Status:** ⚠️ **NOT YET INTEGRATED** - Extensions are standalone, backend API is ready

---

## 🤖 Task Agent Usage Guidelines

**IMPORTANT**: Use specialized Task agents liberally for exploration, planning, and research tasks.

### When to Use Task Agents

**Explore Agent** (use `subagent_type=Explore`):
- Understanding codebase structure and architecture
- Finding where features are implemented across multiple files
- Exploring error handling patterns, API endpoints, or design patterns
- Questions like "How does X work?", "Where is Y handled?", "What's the structure of Z?"
- Set thoroughness: `quick` (basic), `medium` (moderate), or `very thorough` (comprehensive)

**Example Usage:**
```typescript
Task(
  subagent_type="Explore",
  prompt="medium: How does the GIF encoding pipeline work in the Chrome extension?",
  description="Explore GIF encoding"
)

Task(
  subagent_type="Explore",
  prompt="very thorough: Find all places where JWT authentication is used in ytgify-share",
  description="Explore JWT auth"
)
```

**Plan Agent** (use `subagent_type=Plan`):
- Breaking down complex feature implementations
- Designing multi-step refactoring approaches
- Planning architectural changes or migrations

**Example Usage:**
```typescript
Task(
  subagent_type="Plan",
  prompt="very thorough: Design a plan to integrate JWT authentication into the Chrome extension popup",
  description="Plan auth integration"
)

Task(
  subagent_type="Plan",
  prompt="medium: Create implementation plan for syncing local GIFs to backend",
  description="Plan GIF sync"
)
```

**General-Purpose Agent** (use `subagent_type=general-purpose`):
- Multi-step tasks requiring multiple tool invocations
- Documentation lookups via WebSearch/WebFetch
- Complex searches across many files with multiple rounds

**Example Usage:**
```typescript
Task(
  subagent_type="general-purpose",
  prompt="Search Rails 8 Hotwire documentation for Turbo Streams patterns and find examples",
  description="Find Turbo docs"
)
```

### Best Practices

1. **Use agents proactively** - Don't wait for complex tasks to get overwhelming
2. **Be specific with thoroughness** - `quick` for simple queries, `very thorough` for critical understanding
3. **Leverage for cross-codebase analysis** - Agents excel at finding patterns across multiple files
4. **Document findings** - Agents provide comprehensive reports; use them for planning

---

## 📁 Directory Structure

```
ytgify-glue/
├── ytgify/              # Chrome browser extension (TypeScript + React)
├── ytgify-firefox/      # Firefox browser extension (TypeScript + React)
├── ytgify-share/        # Rails 8 + Hotwire backend
└── plans/               # Integration strategy and documentation
```

---

## 📱 ytgify (Chrome Extension)

**Path:** `/Users/jeremywatt/Desktop/ytgify-glue/ytgify`

### What It Does
- Integrates with YouTube video player (adds GIF creation button)
- Extracts video frames using Canvas API
- Encodes frames to GIF format (gifenc, gifski, or gif.js)
- Stores GIFs locally in IndexedDB (YouTubeGifStore)
- Provides text overlay editor for customization

### Current Status
- ✅ Fully functional standalone extension
- ❌ **NO backend integration** - uses only local storage
- ❌ No user authentication
- ❌ No cloud storage or social features

### Technology Stack
- **Language:** TypeScript
- **UI:** React 19 + Tailwind CSS + shadcn/ui
- **Build:** Webpack
- **Storage:** Chrome storage API + IndexedDB
- **Testing:** Jest (unit) + Playwright (E2E)

### Key Files
- `manifest.json` - Chrome extension manifest
- `src/background/index.ts` - Service worker (message routing)
- `src/content/index.ts` - Content script (YouTube integration)
- `src/content/gif-processor.ts` - GIF creation pipeline
- `src/popup/index.tsx` - Extension popup UI
- `tests/e2e/` - Playwright E2E tests
- `tests/unit/` - Jest unit tests

### Architecture
```
┌─────────────────────────────────────────────┐
│ YouTube Page                                 │
│  ├─ Content Script (injected)               │
│  │   ├─ YouTube Button Integration          │
│  │   ├─ Overlay Wizard (multi-screen UI)    │
│  │   ├─ Frame Extractor (Canvas-based)      │
│  │   └─ GIF Processor (encoding)            │
│  └─ Storage: IndexedDB (local only)         │
└─────────────────────────────────────────────┘
         ↕ Message Passing
┌─────────────────────────────────────────────┐
│ Background Service Worker                    │
│  ├─ Message Router                           │
│  ├─ Job Management                           │
│  └─ Engagement Tracker                       │
└─────────────────────────────────────────────┘
         ↕
┌─────────────────────────────────────────────┐
│ Extension Popup                              │
│  ├─ GIF Library Browser                      │
│  ├─ Settings                                 │
│  └─ Newsletter Signup                        │
└─────────────────────────────────────────────┘
```

### Commands
```bash
cd ytgify

# Development
npm install
npm run dev          # Build in watch mode
npm run build        # Production build

# Testing
npm run test         # Jest unit tests
npm run test:e2e     # Playwright E2E (real YouTube)
npm run test:e2e:mock # Playwright E2E (mock videos)
npm run test:watch   # Jest watch mode

# Validation
npm run validate:pre-push  # Full validation suite
```

---

## 🦊 ytgify-firefox (Firefox Extension)

**Path:** `/Users/jeremywatt/Desktop/ytgify-glue/ytgify-firefox`

### What It Does
Identical functionality to Chrome extension, with Firefox-specific optimizations.

### Current Status
- ✅ Fully functional standalone extension
- ❌ **NO backend integration** - uses only local storage
- ❌ No user authentication
- ❌ No cloud storage or social features

### Key Differences from Chrome
- Uses Firefox `browser.*` API (Promise-based) instead of Chrome callbacks
- Event page instead of service worker
- Manifest includes `browser_specific_settings.gecko`
- Extension ID: `ytgify@firefox.extension`
- Minimum Firefox version: 109.0

### Technology Stack
Same as Chrome extension (TypeScript, React, Webpack, etc.)

### Commands
```bash
cd ytgify-firefox

# Same commands as Chrome extension
npm install
npm run dev
npm run build
npm run test
npm run test:e2e
```

---

## 🌐 ytgify-share (Rails Backend)

**Path:** `/Users/jeremywatt/Desktop/ytgify-glue/ytgify-share`

### What It Does
Social web platform for sharing, discovering, and remixing GIFs. Provides:
- User authentication (web sessions + JWT API for extensions)
- GIF upload, storage (S3), and management
- Social features: likes, comments, follows, collections
- Feed algorithms: personalized, trending, hashtag-based
- Real-time notifications via ActionCable

### Current Status
- ✅ **Backend complete and tested** (425+ tests passing)
- ✅ **JWT API ready for browser extensions**
- ⚠️ Extensions not yet integrated (they don't call the API)
- Phase 3 complete: Hotwire + ActionCable notifications

### Technology Stack
- **Framework:** Ruby on Rails 8.0.4
- **Frontend:** Hotwire (Turbo + Stimulus) - **NOT React**
- **Database:** PostgreSQL 14+ (UUID primary keys)
- **Cache:** Redis + Solid Cache
- **Jobs:** Sidekiq 7.2
- **Storage:** AWS S3 via ActiveStorage
- **Real-time:** ActionCable (WebSocket)
- **Auth:** Devise (sessions) + devise-jwt (API)
- **Testing:** Minitest + SimpleCov + Playwright (for system tests)

### API Endpoints (Ready for Extensions)

**Authentication (JWT)**
```
POST   /api/v1/auth/register    - Create account, return JWT token
POST   /api/v1/auth/login       - Login, return JWT token
DELETE /api/v1/auth/logout      - Revoke JWT token (add to denylist)
POST   /api/v1/auth/refresh     - Refresh JWT token
GET    /api/v1/auth/me          - Get current user profile
```

**GIFs**
```
GET    /api/v1/gifs             - List public GIFs (paginated)
GET    /api/v1/gifs/:id         - Show GIF details
POST   /api/v1/gifs             - Create GIF (requires JWT)
PATCH  /api/v1/gifs/:id         - Update GIF (owner only)
DELETE /api/v1/gifs/:id         - Soft delete GIF (owner only)
```

**Social Features**
```
POST   /api/v1/gifs/:id/likes          - Toggle like
GET    /api/v1/gifs/:id/comments       - List comments
POST   /api/v1/gifs/:id/comments       - Add comment
POST   /api/v1/users/:id/follow        - Follow/unfollow user
GET    /api/v1/feed                    - Personalized feed
GET    /api/v1/feed/trending           - Trending GIFs
```

**Collections**
```
GET    /api/v1/collections              - List user's collections
POST   /api/v1/collections              - Create collection
POST   /api/v1/collections/:id/add_gif  - Add GIF to collection
```

### JWT Token Format
```json
{
  "sub": "user-uuid",
  "jti": "unique-token-id",
  "exp": 900  // 15 minutes from issue
}
```

**Usage:**
```
Authorization: Bearer <jwt-token>
```

### Key Models
- `User` - Devise + JWT, follower/following relationships
- `Gif` - Main content, soft deletes, privacy levels (public/unlisted/private)
- `Like` - Polymorphic likes on GIFs
- `Comment` - Comments on GIFs, supports threading
- `Follow` - Self-referential user following
- `Collection` - User-organized GIF collections
- `Hashtag` - GIF tagging and discovery
- `Notification` - Polymorphic notifications (likes, comments, follows)
- `ViewEvent` - Analytics tracking

### Architecture
```
┌──────────────────────────────────────────────┐
│ Web App (Hotwire)                            │
│  ├─ Turbo Frames (in-place updates)         │
│  ├─ Turbo Streams (real-time updates)       │
│  ├─ Stimulus Controllers (JS interactions)  │
│  └─ ERB Views (server-rendered)             │
└──────────────────────────────────────────────┘
         ↕
┌──────────────────────────────────────────────┐
│ Rails Controllers                            │
│  ├─ Web Controllers (Devise sessions)       │
│  └─ API::V1 Controllers (JWT auth)          │
└──────────────────────────────────────────────┘
         ↕
┌──────────────────────────────────────────────┐
│ Services + Jobs                              │
│  ├─ FeedService (personalized/trending)     │
│  ├─ NotificationService (ActionCable)       │
│  └─ Sidekiq Jobs (background processing)    │
└──────────────────────────────────────────────┘
         ↕
┌──────────────────────────────────────────────┐
│ Data Layer                                   │
│  ├─ PostgreSQL (primary data)               │
│  ├─ Redis (cache + Sidekiq queue)           │
│  └─ S3 (GIF file storage)                   │
└──────────────────────────────────────────────┘
```

### Commands
```bash
cd ytgify-share

# Development
bundle install
bin/dev              # Start Rails + Tailwind

# Testing
bin/rails test                              # All tests
bin/rails test test/models/gif_test.rb     # Specific test
bin/rails test:system                       # System tests (when added)
COVERAGE=true bin/rails test               # With coverage report

# Database
bin/rails db:migrate
bin/rails db:reset

# Background Jobs
bundle exec sidekiq  # Start Sidekiq worker

# Generators (always use UUID primary keys)
bin/rails g model Feature user:references name:string --primary-key-type=uuid
bin/rails g controller Features index show
bin/rails g stimulus feature-name
```

### Important Notes
- **DO NOT use React** - This is a Hotwire application (ERB + Turbo + Stimulus)
- **Always use UUIDs** - All models use UUID primary keys
- **Dual Authentication:**
  - Web: Devise sessions (cookies)
  - API: JWT tokens (Authorization header)
- **Counter Caches:** Automatically updated on associations (gifs_count, likes_count, etc.)
- **Soft Deletes:** Gif and Comment use `deleted_at` timestamp
- **Test Password:** All test fixtures use `password123`

---

## 📋 plans/ (Integration Documentation)

**Path:** `/Users/jeremywatt/Desktop/ytgify-glue/plans`

### What It Contains
Strategic planning documents for integrating the three codebases.

### Key Documents

**1. README.md**
Quick-start guide and navigation for all planning docs.

**2. BROWSER_EXTENSION_INTEGRATION_STRATEGY.md** ⭐ **MOST IMPORTANT**
- Comprehensive integration strategy (21KB)
- Current state analysis of all three codebases
- Gap analysis (what exists vs. what's needed)
- 4-phase integration plan (8 weeks):
  - Phase 1: Authentication (JWT) - Weeks 1-2
  - Phase 2: GIF Cloud Upload - Weeks 3-4
  - Phase 3: Social Features - Weeks 5-6
  - Phase 4: E2E Testing - Weeks 7-8
- Architecture decisions
- Risk assessment

**3. E2E Testing Plans**
- `E2E_PHASE1.2_AUTHENTICATION.md` - 11 auth flow tests (45 min)
- `SYSTEM_TESTS_PLAN.md` - Comprehensive system tests (4-5 hours)
- `HIGH_IMPACT_TEST_PLAN.md` - Strategy to reach 90% coverage (3-4 hours)

**4. Launch Preparation**
- `PHASE4-POLISH-LAUNCH.md` - Pre-launch checklist (security, performance, testing)
- `PHASE4-REMAINING-TASKS.md` - Outstanding tasks for ytgify-share

---

## 🔑 Key Insights for Claude Code

### The Integration Challenge

**Current State:**
```
┌─────────────┐     ┌─────────────┐
│   Chrome    │     │   Firefox   │
│  Extension  │     │  Extension  │
│             │     │             │
│  (Local     │     │  (Local     │
│   Storage)  │     │   Storage)  │
└─────────────┘     └─────────────┘

         NO CONNECTION ❌

         ┌─────────────┐
         │   Rails     │
         │   Backend   │
         │             │
         │  (JWT API   │
         │   Ready)    │
         └─────────────┘
```

**Goal:**
```
┌─────────────┐     ┌─────────────┐
│   Chrome    │     │   Firefox   │
│  Extension  │     │  Extension  │
│             │     │             │
│  JWT Auth   │     │  JWT Auth   │
│  Cloud Sync │     │  Cloud Sync │
└──────┬──────┘     └──────┬──────┘
       │                   │
       │   HTTPS + JWT     │
       └───────┬───────────┘
               ↓
         ┌─────────────┐
         │   Rails     │
         │   Backend   │
         │             │
         │  /api/v1/*  │
         │  (JWT API)  │
         └─────────────┘
```

### What Needs to Happen

1. **Extensions need to:**
   - Implement API client for JWT authentication
   - Store JWT tokens securely in browser storage
   - Upload GIFs to backend instead of (or in addition to) local storage
   - Call social API endpoints (like, comment, follow)
   - Handle token refresh and expiration

2. **Backend needs to:**
   - ✅ Already complete! Just needs CORS configuration
   - Add CORS headers for extension origins
   - Monitor API usage and performance

3. **Testing needs to:**
   - E2E tests across all three codebases
   - Auth flow testing
   - API integration testing
   - Cross-browser testing

### When Working On...

**Chrome Extension (`ytgify/`):**
- Focus: Implement API client, add auth UI, upload to backend
- Don't change: Core GIF creation logic (already works well)
- Test with: `npm run test:e2e` before making changes

**Firefox Extension (`ytgify-firefox/`):**
- Focus: Same changes as Chrome, but using `browser.*` API
- Keep in sync: Should have identical functionality to Chrome
- Test with: Same E2E tests as Chrome

**Rails Backend (`ytgify-share/`):**
- Focus: CORS configuration, API monitoring
- Don't change: Core API endpoints (already complete and tested)
- DO NOT add React: This is a Hotwire app (ERB + Turbo + Stimulus)
- Test with: `bin/rails test` to ensure no regressions

**Integration (`plans/`):**
- Refer to `BROWSER_EXTENSION_INTEGRATION_STRATEGY.md` for detailed plan
- Follow phase-by-phase approach
- Update progress in planning docs

---

## 🎯 Quick Reference

### Current Status Summary

| Component | Status | Key Details |
|-----------|--------|-------------|
| Chrome Extension | ✅ Complete (standalone) | Local-only, 25k LOC, no backend |
| Firefox Extension | ✅ Complete (standalone) | Nearly identical to Chrome |
| Rails Backend | ✅ API Ready | JWT auth, 425+ tests, 90% coverage |
| **Integration** | ❌ **NOT STARTED** | **8-week plan ready** |

### Integration Priority

1. **HIGH:** JWT Authentication - Extensions need to call `/api/v1/auth/*`
2. **HIGH:** GIF Cloud Upload - Extensions need to call `POST /api/v1/gifs`
3. **MEDIUM:** Social Features - Like, comment, follow APIs
4. **MEDIUM:** E2E Testing - Comprehensive test coverage

### Critical Paths

**Path 1: Authentication**
```
Extension Popup → Login Form → POST /api/v1/auth/login → Store JWT → Use JWT in subsequent requests
```

**Path 2: GIF Upload**
```
YouTube Page → Create GIF → Extension → POST /api/v1/gifs (with JWT) → S3 Storage → Database
```

**Path 3: Social Actions**
```
Extension → Like GIF → POST /api/v1/gifs/:id/likes (with JWT) → Update counter → Notify user
```

---

## 🚨 Important Warnings

1. **DO NOT add React to ytgify-share** - It's a Hotwire application
2. **DO NOT remove local storage from extensions** - Use hybrid strategy (local + cloud)
3. **DO NOT commit JWT secrets** - Use Rails credentials
4. **DO NOT skip E2E tests** - Critical for integration validation
5. **DO NOT modify extension manifest permissions** without testing
6. **ALWAYS use `--primary-key-type=uuid`** when generating Rails models
7. **ALWAYS run tests** before committing to any codebase

---

## 📚 Additional Resources

- **Integration Strategy:** `plans/BROWSER_EXTENSION_INTEGRATION_STRATEGY.md`
- **Backend Details:** `ytgify-share/CLAUDE.md`
- **Chrome Extension:** `ytgify/README.md`
- **Firefox Extension:** `ytgify-firefox/README.md`

---

**Last Updated:** 2025-11-09
**Integration Status:** Planning complete, implementation pending
