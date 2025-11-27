# Architecture Decisions

**Related:** [Overview](00-OVERVIEW.md) | [Current Status](01-CURRENT-STATUS.md) | [Architecture](04-ARCHITECTURE.md) | [Roadmap](05-ROADMAP.md)

---

## Table of Contents

- [Current Status: React vs Hotwire](#current-status-react-vs-hotwire)
- [Option 1: Keep React](#option-1-keep-react-recommended---pragmatic)
- [Option 2: Refactor to Hotwire](#option-2-refactor-to-hotwire-aligns-with-original-plan)
- [Option 3: Hybrid Approach](#option-3-hybrid-best-of-both-worlds)
- [Why Rails 8 + Hotwire?](#why-rails-8--hotwire)
- [When to Use JavaScript](#when-to-use-javascript-stimulus)
- [Extension Integration](#extension-integration)
- [Recommendation](#recommendation)

---

## Current Status: React vs Hotwire

**Important:** The current application uses **React 19 + Rails API** architecture, not Rails 8 + Hotwire as specified in some planning documents. Before proceeding, make a strategic decision:

### Current Implementation

**Frontend:** React 19 + TypeScript + Vite
- Modern, component-based architecture
- 40% of UI already implemented (auth, layout, basic pages)
- shadcn/ui component library integrated
- Type-safe API client configured
- Tailwind CSS for styling

**Backend:** Ruby on Rails 8 API mode
- JSON API endpoints for React frontend
- Separate API for Chrome extension (same endpoints)
- 90% complete with excellent patterns

---

## Option 1: Keep React (Recommended - Pragmatic)

### Benefits ✅

- **Modern, industry-standard approach**
  - React is the most popular frontend framework
  - Large ecosystem of libraries and tools
  - Easy to hire developers with React experience

- **40% of frontend already implemented**
  - Authentication pages complete
  - Layout and navigation working
  - shadcn/ui design system integrated
  - Type-safe API client configured

- **Better developer experience**
  - Hot module replacement (HMR) for instant updates
  - TypeScript for type safety
  - Component-based architecture
  - Excellent debugging tools (React DevTools)

- **Works well with existing stack**
  - Rails API backend already designed for React
  - API endpoints for extension can be reused
  - No need to rewrite existing work

- **Easier to hire for**
  - More developers know React than Hotwire
  - Can share frontend developers with other React projects
  - Industry-standard skillset

- **Performance is good**
  - Can implement SSR/SSG if SEO becomes critical
  - Code splitting for smaller initial bundles
  - Modern React is quite performant

### Trade-offs ⚠️

- **SEO challenges**
  - Client-side rendering means slower initial indexing
  - **Mitigation:** Add meta tags, Open Graph, server-side rendering for key pages

- **Larger JavaScript bundle**
  - Initial download ~200-300KB (gzipped)
  - **Mitigation:** Code splitting, lazy loading components

- **API serialization overhead**
  - Need to serialize/deserialize data
  - **Mitigation:** Use fast JSON serializers (Alba, Blueprinter)

- **Two codebases to maintain**
  - Frontend (React/TS) + Backend (Rails/Ruby)
  - **Mitigation:** Good separation of concerns, clear contracts

### Effort: 0 days (already done)

Continue building React components and features as planned.

---

## Option 2: Refactor to Hotwire (Aligns with Original Plan)

### Benefits ✅

- **Better SEO (server-rendered HTML)**
  - Every page is indexable by Google from day one
  - Critical for GIF discovery and viral growth
  - No need for SSR setup

- **Turbo Streams for real-time features**
  - Built-in WebSocket support via ActionCable
  - Real-time likes, comments, notifications
  - No separate WebSocket server needed

- **Less JavaScript, single language (Ruby)**
  - Write most logic in Ruby (server-side)
  - Only targeted JavaScript via Stimulus
  - Simpler mental model (one language)

- **Simpler architecture**
  - No API serialization needed for web app
  - Direct access to ActiveRecord from views
  - Fewer layers between user and database

- **Progressive enhancement**
  - Works without JavaScript (basic functionality)
  - Enhanced with JavaScript where needed
  - Better accessibility

- **Rails conventions**
  - Faster development with less decision fatigue
  - Follow Rails Way™ for consistency
  - Excellent for small teams

### Trade-offs ⚠️

- **Discard existing React work**
  - 40% of frontend needs to be rewritten
  - Waste ~2 weeks of development time

- **Less common skillset**
  - Harder to find developers with Hotwire experience
  - Steeper learning curve for React developers
  - Smaller ecosystem than React

- **Limited component ecosystem**
  - No shadcn/ui equivalent for Rails
  - Need to build or find ViewComponents
  - Less off-the-shelf solutions

- **Mobile app limitations**
  - If building native mobile apps later, need separate API anyway
  - Hotwire Native exists but less mature than React Native

- **Remix editor complexity**
  - Canvas-based GIF editor still needs JavaScript
  - Stimulus controller + GIF.js library
  - Similar complexity to React version

### Effort: 6-8 weeks

- Weeks 1-2: Add social models (same as React option)
- Weeks 3-5: Rewrite all views as ERB + Turbo Frames
- Weeks 6-7: Remix editor (Stimulus controller)
- Week 8: Testing, real-time features, polish

---

## Option 3: Hybrid (Best of Both Worlds)

### Approach

- **Keep React for authenticated app pages**
  - Dashboard, feed, user library
  - Remix editor (needs rich interactivity)
  - User settings, collections

- **Server-render public pages for SEO**
  - Homepage (for marketing)
  - GIF detail pages (for social sharing)
  - Explore/search pages (for discovery)
  - User profile pages (public view)

- **Use meta tags and OpenGraph**
  - Proper SEO for all public pages
  - Rich previews on Twitter, Discord, etc.

### Implementation

```ruby
# config/routes.rb
Rails.application.routes.draw do
  # Public pages (server-rendered for SEO)
  root 'home#index'  # Marketing page
  get '/g/:id', to: 'gifs#show'  # GIF detail (SEO critical)
  get '/@:username', to: 'users#show'  # Public profile

  # React SPA (authenticated app)
  get '/app/*path', to: 'react#index'  # Catch-all for React router

  # API for both React and extension
  namespace :api do
    # ... existing API
  end
end
```

### Benefits ✅

- **SEO where it matters** (public pages indexed)
- **Rich interactivity where needed** (React for app)
- **Reuse existing React work** (40% frontend done)
- **Best UX for authenticated users** (React SPA)

### Trade-offs ⚠️

- **More complex setup** (two rendering paths)
- **Dual code paths** (ERB for public, React for app)
- **Potential duplication** (components in both)

### Effort: 5-7 days

- Add server-rendered public pages
- Configure routing for hybrid approach
- Set up proper meta tags and OG tags

---

## Why Rails 8 + Hotwire?

If you choose to refactor to Hotwire, here's why it's compelling:

### SEO is Critical ✅

Server-rendered HTML ensures GIF pages are indexed by Google for:
- **Discovery:** Users find GIFs via Google search
- **Virality:** Links shared on social media preview properly
- **Growth:** SEO is a major acquisition channel

### Faster Initial Load ✅

- No large JavaScript bundle to download
- First paint happens immediately
- Better perceived performance

### Real-Time Features ✅

- Turbo Streams over ActionCable perfect for:
  - Live like counts
  - New comments appearing instantly
  - Real-time notifications
  - Collaborative features

### Mobile-Friendly ✅

- Works great on all browsers without heavy JS
- Progressive enhancement ensures basic functionality
- Smaller data transfer for mobile users

### Rails Conventions ✅

- Faster development with less decision fatigue
- Strong conventions for routing, views, controllers
- One language (Ruby) for most of the stack

---

## When to Use JavaScript (Stimulus)

Even with Hotwire, some features require client-side JavaScript:

### Essential JavaScript Use Cases

- **GIF remix editor** - Canvas API manipulation for text overlays
- **Infinite scroll** - IntersectionObserver for feed pagination
- **Clipboard** - Copy links, embed codes
- **Tag auto-suggest** - Real-time autocomplete
- **Form enhancements** - Date pickers, color pickers
- **Analytics tracking** - Custom event tracking
- **Drag and drop** - Reordering collections, organizing GIFs

### Stimulus Controller Pattern

```javascript
// app/javascript/controllers/gif_editor_controller.js
import { Controller } from "@hotwired/stimulus"
import GIF from "gif.js"

export default class extends Controller {
  static targets = ["canvas", "textInput", "preview"]

  connect() {
    this.loadBaseGif()
    this.setupCanvas()
  }

  updateTextOverlay() {
    // Redraw canvas with new text
  }

  async saveRemix() {
    // Generate GIF blob with GIF.js
    // Upload to S3 via ActiveStorage
    // Submit form to create Gif record
  }
}
```

**Key point:** Stimulus is targeted JavaScript for specific features, not a full frontend framework.

---

## Extension Integration

**Important:** The Chrome extension integration is **independent of frontend choice.**

### Extension Architecture

- Extension is a **separate codebase** (likely React-based)
- Uses **same API endpoints** regardless of web app frontend
- Authentication via **JWT tokens** (already implemented)
- API is shared between web app and extension

### Auth Flow

1. User clicks "Sign in" in extension
2. Opens ytgify.com/login in browser
3. User completes auth on web app (React or Rails views)
4. Web app provides JWT token
5. Extension stores token and can upload GIFs

### API Remains the Same

```ruby
# config/routes.rb
namespace :api do
  namespace :v1 do
    # Extension API (unchanged)
    resources :gifs, only: [:create, :update, :destroy]
    namespace :auth do
      post 'login'
      post 'register'
      post 'refresh'
      get 'me'
    end
  end
end
```

**No matter which frontend you choose (React or Hotwire), the API stays the same.**

---

## ✅ FINAL DECISION: Rails 8 + Hotwire (November 2025)

### Decision Made: Hotwire ✅

**IMPORTANT: DO NOT USE REACT. This project uses Rails 8 + Hotwire.**

**Rationale:**

1. **No existing frontend** - There was no React implementation, so nothing to throw away
2. **Better SEO** - Server-rendered HTML from day one for GIF discovery
3. **Simpler architecture** - One language (Ruby), no separate frontend build
4. **Rails conventions** - Leverage Rails Way™ for faster development
5. **Real-time built-in** - Turbo Streams over ActionCable for live updates
6. **Extension independence** - Chrome extension uses API endpoints (same either way)

### SEO Mitigation Strategy

If choosing React, implement these for SEO:

1. **Server-render public pages:**
   - Homepage (marketing)
   - GIF detail pages (critical for sharing)
   - Public profiles

2. **Proper meta tags:**
   ```erb
   <meta property="og:title" content="<%= @gif.title %>" />
   <meta property="og:image" content="<%= url_for(@gif.thumbnail) %>" />
   <meta property="og:url" content="<%= gif_url(@gif) %>" />
   <meta name="twitter:card" content="player" />
   ```

3. **Pre-rendering or SSG:**
   - Use Next.js-style pre-rendering for static content
   - Or implement server-side rendering for key pages

4. **Structured data:**
   ```html
   <script type="application/ld+json">
   {
     "@context": "https://schema.org",
     "@type": "VideoObject",
     "name": "<%= @gif.title %>",
     "thumbnailUrl": "<%= url_for(@gif.thumbnail) %>",
     "uploadDate": "<%= @gif.created_at.iso8601 %>"
   }
   </script>
   ```

### When to Reconsider Hotwire

- **If SEO becomes critical** and hybrid approach isn't sufficient
- **If team is all Ruby developers** with no React experience
- **If real-time features are essential** and WebSockets are complex with React
- **If going for extreme simplicity** and small team size

---

## Decision Matrix

| Criterion | React | Hotwire | Hybrid |
|-----------|-------|---------|--------|
| **Time to MVP** | 🟢 3-4 weeks | 🟡 6-8 weeks | 🟢 4-5 weeks |
| **SEO** | 🟡 Needs work | 🟢 Perfect | 🟢 Good |
| **Developer availability** | 🟢 Easy to hire | 🟡 Harder | 🟢 Easy |
| **Learning curve** | 🟢 Well-known | 🟡 New for team | 🟢 Familiar |
| **Real-time features** | 🟡 Need WebSocket setup | 🟢 Built-in | 🟡 Need setup |
| **Mobile app future** | 🟢 Share with React Native | 🟡 Need separate API | 🟢 API already there |
| **Remix editor** | 🟢 React + Canvas | 🟢 Stimulus + Canvas | 🟢 React + Canvas |
| **Waste existing work** | 🟢 None | 🔴 40% frontend | 🟢 None |
| **Bundle size** | 🟡 ~300KB | 🟢 ~50KB | 🟡 ~300KB |
| **Maintenance complexity** | 🟡 Two codebases | 🟢 One codebase | 🟡 Dual paths |

**Winner for ytgify:** React (or Hybrid)

---

## Next Steps After Decision

### If Keeping React

1. Continue building React components
2. Add server-rendered public pages (hybrid)
3. Implement feed and discovery features
4. Build remix editor (React + Canvas + GIF.js)
5. See [05-ROADMAP.md § Phase 2-3](05-ROADMAP.md)

### If Choosing Hotwire

1. Create migration plan for existing React work
2. Set up ViewComponents and Turbo
3. Rewrite authentication pages as ERB
4. Implement feed with Turbo Frames
5. Build remix editor with Stimulus
6. See [05-ROADMAP.md § Hotwire Migration](05-ROADMAP.md)

### If Going Hybrid

1. Add server-rendered routes for public pages
2. Keep React SPA for authenticated app
3. Ensure proper routing between the two
4. Implement meta tags and OG tags
5. See [05-ROADMAP.md § Hybrid Setup](05-ROADMAP.md)

---

**Summary:** React is recommended for ytgify due to existing work (40% done), faster MVP timeline (3-4 weeks), and easier hiring. SEO challenges can be mitigated with hybrid approach (server-render public pages). Hotwire is a valid alternative if SEO and simplicity are paramount, but requires 6-8 weeks to refactor.

**Next:** Review [03-FEATURES.md](03-FEATURES.md) for feature specifications, then [05-ROADMAP.md](05-ROADMAP.md) for implementation timeline.
