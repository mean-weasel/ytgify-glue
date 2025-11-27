# ytgify Full-Stack Web Application

**Related:** [Current Status](01-CURRENT-STATUS.md) | [Features](03-FEATURES.md) | [Architecture](04-ARCHITECTURE.md) | [Roadmap](05-ROADMAP.md)

---

## ⚠️ IMPORTANT: Technology Stack Decision

**This application uses Rails 8 + Hotwire (Turbo + Stimulus), NOT React.**

**DO NOT implement any React, Vue, or other JavaScript framework components.**

If you're implementing features, use:
- ✅ Rails views (ERB templates)
- ✅ Turbo Frames for dynamic updates
- ✅ Turbo Streams for real-time features
- ✅ Stimulus controllers for JavaScript interactions
- ✅ Tailwind CSS for styling
- ❌ NO React, NO Vue, NO separate frontend build

---

## Overview

A social-first web platform for discovering, sharing, organizing, and remixing YouTube GIFs created with the ytgify Chrome extension. Built with **Ruby on Rails 8 + Hotwire** for server-rendered HTML with modern interactivity.

---

## 🚀 Quick Start: Using Claude Code Agents

**Before diving into the detailed plans, leverage Claude Code's AI agents to understand the current codebase and plan your implementation:**

### Step 1: Explore the Current Application

```bash
# Get a high-level overview
@agent-Explore "medium: Analyze the overall application structure and tech stack"

# Understand the backend
@agent-Explore "medium: Show me all models, their associations, and database schema"
@agent-Explore "quick: Find all API controllers and their endpoints"

# Check frontend setup
@agent-Explore "quick: Find React components and frontend structure"
@agent-Explore "quick: Check if Turbo/Stimulus is configured"
```

### Step 2: Understand What's Already Built

```bash
# Review existing authentication
@agent-Explore "medium: Analyze the authentication system (Devise, JWT, sessions)"

# Check file upload setup
@agent-Explore "quick: Find ActiveStorage configuration and file upload handling"

# Review social features
@agent-Explore "quick: Check if Follow, Collection, Hashtag models exist"
```

### Step 3: Plan Your Implementation

```bash
# Decide on architecture
@agent-Plan "medium: Evaluate keeping React vs refactoring to Hotwire based on current code"

# Plan missing features
@agent-Plan "medium: Create implementation plan for social models (Follow, Collection, Hashtag)"
@agent-Plan "very thorough: Design feed algorithm implementation with caching"
@agent-Plan "very thorough: Plan remix editor with Canvas API and GIF.js"
```

### Step 4: Reference the Detailed Plans

Use this documentation as a **reference architecture** and **feature specification**. The agents will help you:
- ✅ Understand how the current code maps to the plans
- ✅ Identify gaps between current implementation and specifications
- ✅ Generate step-by-step implementation guides
- ✅ Find existing patterns to follow
- ✅ Plan testing strategies

**💡 Pro Tip:** Throughout this documentation, you'll find **🤖 agent prompts** for specific features. Use these to get targeted help!

**Full agent guide:** [06-AGENT-REFERENCE.md](06-AGENT-REFERENCE.md)

---

## Core Vision

**Primary Use Case:** Social sharing and discovery of YouTube GIFs

**Target Audience:** Casual meme makers, content creators, marketers

**Key Differentiator:** Remix functionality - anyone can take a base GIF and add their own text overlay

**Technical Philosophy:** Server-first architecture with strategic client-side interactivity where needed

---

## Key Features

### 🔐 User Authentication & Profiles
- Email/password via Devise
- Social login (Google, GitHub)
- JWT tokens for Chrome extension
- Public profiles with customizable info
- User preferences synced to extension

### 🎬 GIF Upload & Processing
- Upload from Chrome extension while watching YouTube
- Server-side thumbnail generation
- Metadata extraction (video source, timestamps, properties)
- Text overlay configuration storage
- Privacy levels (public, unlisted, private)

### 🌟 Discovery & Feed
- Algorithmic feed (trending, recent, recommended)
- Full-text search across GIFs
- Browse by category and hashtags
- Infinite scroll pagination
- Filtering and sorting options

### 💬 Social Features
- Like and comment on GIFs
- Follow creators
- Save GIFs to collections
- Hashtag system
- Share to social media
- Real-time notifications

### 🎨 Remix Functionality (Core Innovation)
- Web-based Canvas editor for text overlays
- Add custom text to any public GIF
- Track remix chains (original → remix → remix of remix)
- Attribution to original creators
- Viral loop: encourages creative reuse

### 📊 User Library
- Organize personal GIFs
- Create named collections
- Filter and search your library
- Bulk actions (privacy changes, tagging)
- Analytics on performance

---

## Current Status

**Backend:** 90% complete (excellent foundation)
- ✅ User authentication (Devise + JWT)
- ✅ GIF upload API
- ✅ File storage (ActiveStorage + S3)
- ✅ Like and comment system
- ✅ Background job processing (Sidekiq)

**Frontend:** 40% complete (React 19)
- ✅ Authentication pages
- ✅ Basic layout and navigation
- ✅ shadcn/ui components
- ⚠️ Feed and discovery pages stubbed
- ❌ Remix editor not started

**Missing Features:**
- ❌ Follow system (models + UI)
- ❌ Collections/saves
- ❌ Hashtag system
- ❌ Feed algorithm
- ❌ Trending algorithm
- ❌ Remix editor (Canvas + GIF.js)
- ❌ Real-time features (if using Hotwire)

**Detailed status:** [01-CURRENT-STATUS.md](01-CURRENT-STATUS.md)

---

## Technology Stack

### Current Architecture
- **Backend:** Ruby on Rails 8, PostgreSQL, Redis, Sidekiq
- **Frontend:** React 19 + TypeScript + Vite
- **Auth:** Devise (sessions + JWT)
- **Storage:** AWS S3 via ActiveStorage
- **Styling:** Tailwind CSS + shadcn/ui components

### Alternative Architecture (Per Plan)
- **Frontend:** Rails + Hotwire (Turbo + Stimulus) instead of React
- **Benefits:** Better SEO, simpler codebase, real-time features
- **Trade-offs:** Discard React work, different skillset
- **Decision:** See [02-ARCHITECTURE-DECISIONS.md](02-ARCHITECTURE-DECISIONS.md)

---

## Extension Integration

The **ytgify Chrome extension** is a separate codebase that:
- Captures YouTube video frames
- Generates GIFs with text overlays
- Uploads to web app via API
- Uses JWT authentication (managed by web app)

**Auth flow:**
1. User clicks "Sign in" in extension
2. Opens ytgify.com/login in browser
3. Completes auth on web app
4. Web app provides JWT token
5. Extension stores token and can upload GIFs

**API endpoints** for extension remain unchanged regardless of frontend choice (React vs Hotwire).

---

## Next Steps

### For New Developers
1. Read [01-CURRENT-STATUS.md](01-CURRENT-STATUS.md) - understand what's built
2. Read [06-AGENT-REFERENCE.md](06-AGENT-REFERENCE.md) - learn to use development tools
3. Explore codebase using agent prompts
4. Review [03-FEATURES.md](03-FEATURES.md) for feature requirements

### For Product Planning
1. Review [03-FEATURES.md](03-FEATURES.md) - complete feature specs
2. Check [08-LAUNCH-STRATEGY.md](08-LAUNCH-STRATEGY.md) - launch plan
3. Review [09-SUCCESS-METRICS.md](09-SUCCESS-METRICS.md) - goals and KPIs

### For Tech Leads
1. Read [02-ARCHITECTURE-DECISIONS.md](02-ARCHITECTURE-DECISIONS.md) - React vs Hotwire
2. Review [04-ARCHITECTURE.md](04-ARCHITECTURE.md) - technical deep dive
3. Check [01-CURRENT-STATUS.md](01-CURRENT-STATUS.md) - current implementation
4. Plan with [05-ROADMAP.md](05-ROADMAP.md) - development phases

---

## Documentation Structure

All documentation is in the `plans/` directory:

**Essential (Read First):**
- [00-OVERVIEW.md](00-OVERVIEW.md) ← You are here
- [01-CURRENT-STATUS.md](01-CURRENT-STATUS.md) - Implementation tracking
- [02-ARCHITECTURE-DECISIONS.md](02-ARCHITECTURE-DECISIONS.md) - Key decisions

**Development (Daily Use):**
- [03-FEATURES.md](03-FEATURES.md) - Feature specifications
- [04-ARCHITECTURE.md](04-ARCHITECTURE.md) - Technical architecture
- [05-ROADMAP.md](05-ROADMAP.md) - Development timeline
- [06-AGENT-REFERENCE.md](06-AGENT-REFERENCE.md) - Agent usage guide

**Planning (Reference):**
- [07-FUTURE-FEATURES.md](07-FUTURE-FEATURES.md) - Post-MVP features
- [08-LAUNCH-STRATEGY.md](08-LAUNCH-STRATEGY.md) - Launch plan
- [09-SUCCESS-METRICS.md](09-SUCCESS-METRICS.md) - Goals and KPIs

**Operations (Specialist):**
- [10-DESIGN-UX.md](10-DESIGN-UX.md) - User experience
- [11-PERFORMANCE-SECURITY.md](11-PERFORMANCE-SECURITY.md) - Performance & security
- [12-MONITORING-LEGAL.md](12-MONITORING-LEGAL.md) - Monitoring & legal

**Navigation:** [README.md](README.md) - Full navigation guide

---

## Key Innovation: Remix Feature

The **remix functionality** is what makes ytgify unique. It creates a viral loop:

1. User A creates a GIF from YouTube video
2. User B discovers it and clicks "Remix"
3. Opens web-based editor (Canvas + text tools)
4. Adds their own funny text overlay
5. Saves as new GIF (linked to original)
6. User C discovers User B's remix, remixes again
7. Creates remix chains and encourages creativity

**Benefits:**
- 🔄 Viral loop - remixes generate more content
- 🎨 Creative collaboration - build on others' work
- 📈 Growth engine - each remix brings new users
- 🏆 Attribution - original creators get credit

**Implementation:** Web-based Canvas editor (no extension needed for remixing)

**Details:** [03-FEATURES.md § 1.5](03-FEATURES.md#15-remix-functionality)

---

## Questions?

- **"What should I build next?"** → See [01-CURRENT-STATUS.md § What's Missing](01-CURRENT-STATUS.md)
- **"How do I use agents to explore?"** → See [06-AGENT-REFERENCE.md](06-AGENT-REFERENCE.md)
- **"Should we use React or Hotwire?"** → See [02-ARCHITECTURE-DECISIONS.md](02-ARCHITECTURE-DECISIONS.md)
- **"What are the feature requirements?"** → See [03-FEATURES.md](03-FEATURES.md)
- **"How is the system architected?"** → See [04-ARCHITECTURE.md](04-ARCHITECTURE.md)
- **"What's the development timeline?"** → See [05-ROADMAP.md](05-ROADMAP.md)

---

**Ready to start?** Use the agent commands above to explore the codebase, or jump to [01-CURRENT-STATUS.md](01-CURRENT-STATUS.md) to see what's been built.
