# Phase 2 Frontend Implementation - Quick Reference

## Overview

**Objective:** Build React frontend to connect with Phase 1 Rails API backend
**Timeline:** 3-4 weeks
**Architecture:** React 19 + TypeScript + Vite → Rails 8 API
**Status:** Ready to start

---

## Technology Stack

**Core:**
- React 19 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- React Router v6

**State & Data:**
- TanStack Query (React Query) - Server state
- Zustand - Client state (auth)
- React Hook Form + Zod - Forms

**Utilities:**
- axios - HTTP client
- date-fns - Date formatting
- react-intersection-observer - Infinite scroll
- react-hot-toast - Notifications

---

## Week-by-Week Breakdown

### Week 1: Foundation (Days 1-5)
**Goal:** Working authentication and basic feed

**Days 1-2: Project Setup**
- Initialize Vite React app
- Install dependencies (Tailwind, shadcn/ui, React Query, etc.)
- Configure Tailwind CSS with design tokens
- Setup path aliases (@/ imports)
- Install core shadcn/ui components

**Day 2: Core Infrastructure**
- Create directory structure
- Build API client with axios
- Define TypeScript types for all API entities
- Create API service functions (auth, gifs, feed, etc.)
- Setup React Query with QueryClient

**Day 3: Authentication & Layout**
- Setup React Query Provider
- Create auth store (Zustand) with token persistence
- Build Navbar component
- Build AppLayout component
- Create LoginPage and RegisterPage
- Setup routing with React Router
- Add protected routes

**Days 3-4: GIF Components**
- Create GifCard component (display, user info, stats)
- Create GifGrid component
- Build FeedPage with tabs (For You, Trending, Recent, Popular, Following)
- Implement infinite scroll with React Query
- Add loading skeletons

**Day 5: Interactions**
- Create LikeButton with optimistic updates
- Update GifCard with interactive buttons
- Add error boundary
- Create loading states
- Test end-to-end flow

**Deliverable:** Working app where users can log in and browse infinite-scroll feeds

---

### Week 2: GIF Detail & Comments (Days 1-5)
**Goal:** Complete GIF detail page with all interactions

**Days 1-2: Feed Polish**
- Optimize infinite scroll performance
- Add feed switching animations
- Improve loading states
- Add pull-to-refresh (mobile)
- Error handling for failed requests

**Day 3: GIF Detail Foundation**
- Create GifDetailPage route
- Build GifDetail component (large display)
- Show GIF metadata (title, description, user, stats)
- Add ShareButton component
- Add SaveToCollectionButton (prep)

**Day 4: Comments Section**
- Create CommentList component
- Create CommentItem component (with threading support)
- Create CommentForm component
- Implement comment posting with optimistic updates
- Add comment editing/deleting

**Day 5: Related Content**
- Add related GIFs section (similar hashtags)
- Make hashtags clickable → navigate to explore
- Add remix indicator (if parent_gif_id exists)
- Performance optimization (lazy loading images)

**Deliverable:** Fully functional GIF detail page with likes, comments, sharing

---

### Week 3: User Profiles & Social Features (Days 1-5)
**Goal:** Complete social features (profiles, following)

**Days 1-2: GIF Detail Polish**
- Complete all GIF detail interactions
- Add copy link functionality
- Add share to social media (future)
- Test all interaction flows
- Bug fixes

**Day 3: User Profile Foundation**
- Create ProfilePage route (/@username)
- Build user header (avatar, bio, stats)
- Add FollowButton component with optimistic updates
- Create Tabs (GIFs, Likes, Collections)

**Day 4: Profile Content**
- Implement GIFs tab (user's uploaded GIFs)
- Implement Likes tab (GIFs user liked)
- Implement Collections tab (user's collections - preview)
- Add infinite scroll for each tab
- Show followers/following counts with click → modal/page

**Day 5: Follow System Polish**
- Create followers list view
- Create following list view
- Add follow suggestions (optional)
- Test all social interactions
- Mobile responsiveness check

**Deliverable:** Complete user profiles with follow system

---

### Week 4: Collections, Search & Polish (Days 1-5)
**Goal:** Complete remaining features and polish

**Days 1-2: Collections**
- Create CollectionsPage (list all collections)
- Create CollectionDetailPage (collection + GIFs)
- Build CreateCollectionDialog
- Build AddToCollectionDialog (from GIF detail)
- Implement add/remove GIF from collection
- Add reorder functionality (drag-and-drop with dnd-kit)

**Day 3: Explore & Search**
- Create ExplorePage
- Build SearchBar component
- Add search autocomplete
- Display trending hashtags
- Show search results grid
- Add hashtag filter chips

**Day 4: Hashtag Navigation**
- Make all hashtag clicks navigate to explore
- Filter GIFs by hashtag
- Show hashtag usage count
- Related hashtags section

**Day 5: Final Polish & Testing**
- Cross-browser testing
- Mobile responsiveness fixes
- Loading state polish
- Error message improvements
- Performance optimization
- Accessibility audit (keyboard nav, ARIA labels)
- Documentation

**Deliverable:** Production-ready MVP frontend

---

## Key Features Checklist

### High Priority (Week 1-2) ✅
- [ ] Authentication (login, register, logout)
- [ ] Feed page with infinite scroll
- [ ] Multiple feed types (personalized, trending, recent, popular, following)
- [ ] GIF cards with user info, stats, hashtags
- [ ] GIF detail page
- [ ] Like/unlike functionality
- [ ] Comments section with threading
- [ ] Share functionality

### Medium Priority (Week 3) ✅
- [ ] User profiles (info, GIFs grid, tabs)
- [ ] Follow/unfollow system
- [ ] Followers/following lists
- [ ] Profile tabs (GIFs, Likes, Collections)

### Lower Priority (Week 4) ✅
- [ ] Collections (create, edit, delete)
- [ ] Add/remove GIFs from collections
- [ ] Reorder GIFs in collections
- [ ] Search functionality
- [ ] Hashtag exploration
- [ ] Trending hashtags

---

## File Structure

```
frontend/src/
├── components/
│   ├── ui/              # shadcn/ui (button, card, dialog, etc.)
│   ├── layout/          # Navbar, AppLayout, Footer
│   ├── gif/             # GifCard, GifGrid, GifDetail, LikeButton
│   ├── user/            # UserAvatar, FollowButton, UserCard
│   ├── comment/         # CommentList, CommentItem, CommentForm
│   ├── collection/      # CollectionCard, CollectionGrid, dialogs
│   └── common/          # ErrorBoundary, LoadingStates, EmptyState
├── pages/
│   ├── auth/            # LoginPage, RegisterPage
│   ├── feed/            # FeedPage
│   ├── gif/             # GifDetailPage
│   ├── user/            # ProfilePage
│   ├── collection/      # CollectionsPage, CollectionDetailPage
│   └── explore/         # ExplorePage
├── lib/
│   ├── api/             # API client + service functions
│   ├── hooks/           # Custom React hooks
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   ├── constants/       # Constants
│   └── query-client.ts  # React Query config
├── stores/
│   ├── auth-store.ts    # Zustand auth store
│   └── ui-store.ts      # Zustand UI store (optional)
├── App.tsx
├── main.tsx
└── index.css
```

---

## API Integration Points

All endpoints from Phase 1 backend are available at `/api/v1/`:

**Auth:** `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/refresh`, `/auth/me`

**GIFs:** `/gifs` (CRUD)

**Likes:** `/gifs/:gif_id/likes` (create, delete)

**Comments:** `/gifs/:gif_id/comments` (CRUD)

**Follows:** `/users/:id/follow` (create, delete), `/users/:id/followers`, `/users/:id/following`

**Collections:** `/collections` (CRUD), `/collections/:id/add_gif`, `/collections/:id/remove_gif`, `/collections/:id/reorder`

**Hashtags:** `/hashtags`, `/hashtags/:id`, `/hashtags/trending`

**Feeds:** `/feed`, `/feed/public`, `/feed/trending`, `/feed/recent`, `/feed/popular`, `/feed/following`

---

## State Management

**Server State (React Query):**
- All API data (GIFs, users, comments, collections)
- Automatic caching, background refetching
- Optimistic updates for mutations

**Client State (Zustand):**
- Auth state (user, tokens)
- UI preferences (theme, sidebar state)

**Local State (useState):**
- Form inputs
- Transient UI state

**URL State (React Router):**
- Current page, query parameters

---

## Testing Priority

**Must Test:**
1. Authentication flow (login → feed → logout)
2. Feed loading and infinite scroll
3. Like/unlike with optimistic updates
4. Comment posting
5. Follow/unfollow
6. Add GIF to collection

**Should Test:**
- API client error handling
- Form validation
- Protected routes
- Token refresh logic

**Nice to Have:**
- E2E with Playwright
- Accessibility
- Cross-browser testing

---

## Commands Reference

```bash
# Setup
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install

# Development
npm run dev              # Start dev server (port 5173)
npm run build            # Production build
npm run preview          # Preview production build

# Testing
npm run test             # Run Vitest tests
npm run test:ui          # Vitest UI
npm run test:coverage    # Coverage report

# Linting
npm run lint             # ESLint
npm run format           # Prettier
```

---

## Success Metrics

**Week 1:** Users can log in and browse feeds
**Week 2:** Users can view GIFs, like, and comment
**Week 3:** Users can follow others and view profiles
**Week 4:** Complete MVP with collections and search

**Definition of Done:**
- All features working on desktop and mobile
- Loading states and error handling for all API calls
- Optimistic updates for key interactions
- Accessible (keyboard navigation, screen readers)
- Responsive design (mobile-first)
- No critical bugs
- Documented codebase

---

## Quick Start Guide

1. **Read full plan:** [PHASE2-FRONTEND-IMPLEMENTATION-PLAN.md](PHASE2-FRONTEND-IMPLEMENTATION-PLAN.md)

2. **Day 1 Morning - Setup:**
   ```bash
   npm create vite@latest frontend -- --template react-ts
   cd frontend
   npm install # Core dependencies
   npm install tailwindcss postcss autoprefixer
   npm install @tanstack/react-query react-router-dom zustand
   npm install react-hook-form zod axios date-fns
   npx tailwindcss init -p
   npx shadcn-ui@latest init
   ```

3. **Day 1 Afternoon - API Client:**
   - Create `src/lib/api/client.ts` (axios setup)
   - Create `src/lib/types/api.ts` (TypeScript types)
   - Create API service functions (auth, gifs, feed, etc.)

4. **Day 2 - Auth & Layout:**
   - Setup React Query Provider
   - Create auth store (Zustand)
   - Build Navbar and AppLayout
   - Create LoginPage and RegisterPage
   - Setup routing

5. **Day 3-5 - Feed:**
   - Build GifCard and GifGrid
   - Create FeedPage with tabs
   - Implement infinite scroll
   - Add LikeButton with optimistic updates

**By end of Week 1:** Working demo with auth and feeds!

---

**For detailed code examples and step-by-step instructions, see:**
[PHASE2-FRONTEND-IMPLEMENTATION-PLAN.md](PHASE2-FRONTEND-IMPLEMENTATION-PLAN.md)
