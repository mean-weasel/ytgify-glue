# Development Roadmap

**Related:** [Overview](00-OVERVIEW.md) | [Features](03-FEATURES.md) | [Architecture](04-ARCHITECTURE.md) | [Current Status](01-CURRENT-STATUS.md)

---

## Overview

This roadmap outlines the phased development approach for ytgify, integrating Claude Code agents throughout the process.

---

## Phase 1: Foundation (Weeks 1-4)

**Prerequisites:**
- ✅ Set up Rails 8 project with Hotwire + Tailwind
- ✅ Install and configure Devise + devise-jwt
- ✅ Database schema and migrations
- ✅ ActiveStorage configuration with S3
- ✅ Basic models (User, Gif, Like, Comment)
- Extension API integration (JWT auth endpoints)

**Tasks:**
1. Create missing models (Follow, Collection, Hashtag)
2. Add API endpoints for social features
3. Install and configure PgSearch for search

**🤖 Use Claude Code Agents:**

**Before starting implementation:**
```
Use @agent-Plan to:
- Review the current codebase structure
- Identify existing patterns to follow
- Plan the implementation approach for social models
- Break down tasks into smaller steps
```

**When exploring existing code:**
```
Use @agent-Explore to:
- Find similar model implementations (e.g., "How is the Like model structured?")
- Locate controller patterns (e.g., "Show me the API controller authentication pattern")
- Search for test examples (e.g., "Find model test examples with associations")
- Understand file organization (e.g., "How are serializers organized?")
```

**Example workflow:**
```
1. @agent-Explore "Find all model files and their associations to understand the pattern"
2. @agent-Plan "Create implementation plan for Follow model following existing patterns"
3. Implement based on agent recommendations
4. @agent-Explore "Find all controller tests to understand testing pattern"
5. Write tests following discovered patterns
```

---

## Phase 2: Core Features (Weeks 5-8)

**Tasks:**
- Home feed with Turbo Frames (trending, recent)
- GIF detail pages (server-rendered)
- User profiles with Turbo Frame tabs
- Like & comment functionality (Turbo Streams)
- Basic search (PgSearch)
- ViewComponents for reusable UI

**🤖 Use Claude Code Agents:**

**Before building Turbo Frame features:**
```
Use @agent-Explore to:
- "Search for any existing Turbo Frame implementations in the codebase"
- "Find view files and their structure to understand the pattern"
- "Locate JavaScript controllers to see if Stimulus is already configured"
```

**When planning feed implementation:**
```
Use @agent-Plan to:
- "Design the trending algorithm based on current Gif model structure"
- "Plan the feed controller architecture with caching strategy"
- "Create implementation steps for infinite scroll with Turbo Frames"
```

**For ViewComponent migration:**
```
Use @agent-Explore to:
- "Find all React components in app/frontend/components"
- "Identify reusable UI patterns across components"
- "Show me the Tailwind configuration and theme setup"

Then use @agent-Plan to:
- "Create migration plan from React Button component to ViewComponent"
- "Plan component hierarchy for ViewComponents matching current React structure"
```

**Example workflow:**
```
1. @agent-Explore "Find all Gif-related views and partials"
2. @agent-Plan "Design GIF detail page with Turbo Frames for comments section"
3. Implement view templates
4. @agent-Explore "Search for existing Stimulus controllers"
5. @agent-Plan "Create Stimulus controller for infinite scroll using IntersectionObserver"
```

---

## Phase 3: Social & Remix (Weeks 9-12)

**Tasks:**
- Remix functionality (Stimulus controller + Canvas + GIF.js)
- Follow system (Turbo Stream updates)
- Collections (CRUD via Turbo Frames)
- Hashtags (auto-suggest via Stimulus)
- Notifications (ActionCable + Turbo Streams)

**🤖 Use Claude Code Agents:**

**For remix editor (complex feature):**
```
Use @agent-Explore to:
- "Find existing GIF processing code in jobs and models"
- "Search for any Canvas or image manipulation libraries"
- "Locate file upload handling in controllers"

Use @agent-Plan to:
- "Design remix editor architecture with Canvas API and GIF.js"
- "Plan the client-side GIF generation workflow"
- "Create step-by-step implementation for text overlay editor"
- "Design the upload flow for remixed GIFs to S3"
```

**For real-time features:**
```
Use @agent-Explore to:
- "Check if ActionCable is configured"
- "Find any existing broadcast or channel code"
- "Search for WebSocket or real-time implementations"

Use @agent-Plan to:
- "Design notification system with ActionCable channels"
- "Plan Turbo Stream broadcasts for live updates"
- "Create implementation steps for real-time comment updates"
```

**For hashtag auto-suggest:**
```
Use @agent-Explore to:
- "Find the Hashtag model and its associations"
- "Search for existing autocomplete or search implementations"

Use @agent-Plan to:
- "Design autocomplete API endpoint with efficient queries"
- "Plan Stimulus controller for tag input with AJAX suggestions"
```

**Example workflow:**
```
1. @agent-Explore "Show me all GIF upload and processing code"
2. @agent-Plan "Design comprehensive remix editor implementation plan"
3. @agent-Explore "Find JavaScript bundling configuration for adding GIF.js"
4. Implement Stimulus controller for remix editor
5. @agent-Plan "Create testing strategy for remix editor functionality"
```

---

## Phase 4: Polish & Launch (Weeks 13-16)

**Tasks:**
- Mobile optimization (responsive Tailwind)
- Performance tuning (caching, CDN)
- Security audit (brakeman, bundler-audit)
- Beta testing
- Bug fixes
- Launch prep (landing page, marketing)

**🤖 Use Claude Code Agents:**

**For performance optimization:**
```
Use @agent-Explore to:
- "Find all database queries in controllers looking for N+1 issues"
- "Search for missing indexes on frequently queried columns"
- "Locate caching implementations to identify gaps"

Use @agent-Plan to:
- "Create caching strategy for trending GIFs using Redis"
- "Plan database query optimizations for feed algorithm"
- "Design CDN integration for static assets"
```

**For security audit:**
```
Use @agent-Explore to:
- "Search for all user input handling to check sanitization"
- "Find file upload validation code"
- "Locate authentication and authorization checks"
- "Search for any direct SQL queries that might be vulnerable"

Use @agent-Plan to:
- "Create security checklist based on OWASP top 10"
- "Plan rate limiting strategy for all public endpoints"
- "Design content security policy headers"
```

**For test coverage:**
```
Use @agent-Explore to:
- "Find all test files and identify coverage gaps"
- "Search for untested controllers or models"
- "Locate integration test examples"

Use @agent-Plan to:
- "Create comprehensive test plan for missing coverage"
- "Design system test scenarios for critical user flows"
```

**Example workflow:**
```
1. @agent-Explore "Analyze all controller queries for N+1 problems"
2. @agent-Plan "Create performance optimization roadmap with priorities"
3. @agent-Explore "Find all authentication and authorization code"
4. @agent-Plan "Design security audit checklist and remediation plan"
5. @agent-Explore "Map all test coverage and identify gaps"
6. @agent-Plan "Create testing strategy to achieve 90% coverage"
```

---

## Phase 5: Post-Launch (Ongoing)

**Tasks:**
- Monitor usage and bugs
- User feedback implementation
- Analytics & insights features
- Advanced web-based editor (advanced Canvas features)
- Additional creator tools

**🤖 Use Claude Code Agents:**

**For feature requests:**
```
Use @agent-Explore to:
- "Find similar features in codebase to understand implementation patterns"
- "Search for related code that can be extended"

Use @agent-Plan to:
- "Design new feature architecture fitting existing patterns"
- "Create implementation roadmap with dependencies"
```

**For bug investigation:**
```
Use @agent-Explore to:
- "Search for code related to reported bug area"
- "Find test files covering the buggy functionality"
- "Locate error handling and logging code"

Use @agent-Plan to:
- "Create debugging strategy and fix approach"
- "Plan regression test to prevent future occurrences"
```

---

## Agent Usage Best Practices 💡

**When to use @agent-Explore:**
- ✅ Finding existing code patterns
- ✅ Understanding codebase structure
- ✅ Locating specific implementations
- ✅ Searching for similar features
- ✅ Identifying code organization conventions
- ✅ Discovering test patterns

**When to use @agent-Plan:**
- ✅ Designing new feature architecture
- ✅ Breaking down complex tasks
- ✅ Creating implementation roadmaps
- ✅ Planning refactoring approaches
- ✅ Designing API endpoints
- ✅ Planning test strategies

**Thoroughness levels:**
- **"quick"** - Fast exploration for simple searches (1-2 file locations)
- **"medium"** - Moderate depth for feature planning (standard use case)
- **"very thorough"** - Deep analysis for complex refactoring or architecture decisions

**Example prompts:**

```bash
# Exploring existing patterns
@agent-Explore "quick: Find the User model and show its structure"
@agent-Explore "medium: Search for all Turbo Frame usage in views"
@agent-Explore "very thorough: Analyze the entire authentication system"

# Planning implementations
@agent-Plan "medium: Design Follow model with counter caches"
@agent-Plan "very thorough: Create comprehensive remix editor implementation plan"
@agent-Plan "quick: Plan migration to add hashtags table"
```

---

**Next:** Review [01-CURRENT-STATUS.md](01-CURRENT-STATUS.md) to understand what's already built, then start with Phase 1 tasks.
