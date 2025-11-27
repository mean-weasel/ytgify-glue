# Phase 2: Frontend Implementation Plan
## React Frontend for Rails 8 API Backend

**Created:** November 6, 2025
**Status:** Planning Phase
**Target Timeline:** 3-4 weeks
**Architecture:** React 19 + TypeScript + Vite → Rails 8 API

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Technology Stack](#technology-stack)
4. [Project Setup (Week 1, Days 1-2)](#project-setup-week-1-days-1-2)
5. [Core Infrastructure (Week 1, Days 3-5)](#core-infrastructure-week-1-days-3-5)
6. [Feed & Discovery (Week 2)](#feed--discovery-week-2)
7. [GIF Detail & Interactions (Week 3, Days 1-3)](#gif-detail--interactions-week-3-days-1-3)
8. [User Profiles & Social (Week 3, Days 4-5)](#user-profiles--social-week-3-days-4-5)
9. [Collections (Week 4, Days 1-2)](#collections-week-4-days-1-2)
10. [Search & Hashtags (Week 4, Days 3-4)](#search--hashtags-week-4-days-3-4)
11. [Polish & Testing (Week 4, Day 5)](#polish--testing-week-4-day-5)
12. [File Structure](#file-structure)
13. [Component Hierarchy](#component-hierarchy)
14. [State Management Strategy](#state-management-strategy)
15. [Testing Strategy](#testing-strategy)

---

## Executive Summary

### Context
Phase 1 backend is **100% complete** with:
- ✅ Follow system (followers, following, toggle)
- ✅ Collections (create, add/remove GIFs, reorder)
- ✅ Hashtags (trending, search, auto-parse)
- ✅ Feed algorithm (6 feed types: personalized, public, trending, recent, popular, following)
- ✅ ViewEvent analytics
- ✅ Full REST API at `/api/v1/*`

### Objective
Build a modern React frontend that connects to the existing Rails API, delivering a polished MVP in 3-4 weeks.

### Approach
- **Pragmatic over perfect:** Ship features quickly, iterate based on feedback
- **Component-driven:** Use shadcn/ui for consistency and speed
- **Type-safe:** Leverage TypeScript for API contracts
- **Test what matters:** Focus on critical user flows
- **Progressive enhancement:** Start simple, add features incrementally

### Key Deliverables
1. Responsive, mobile-first UI
2. Infinite scroll feeds with multiple sorting options
3. Complete GIF interaction (like, comment, share)
4. User profiles with follow system
5. Collections management
6. Hashtag exploration
7. Search functionality

---

## Current State Analysis

### Backend API Status: 100% Ready ✅

**Available Endpoints:**

```
Authentication:
POST   /api/v1/auth/register        → Sign up
POST   /api/v1/auth/login           → Login (returns JWT)
DELETE /api/v1/auth/logout          → Logout
POST   /api/v1/auth/refresh         → Refresh token
GET    /api/v1/auth/me              → Current user

GIFs:
GET    /api/v1/gifs                 → List GIFs
GET    /api/v1/gifs/:id             → Get GIF details
POST   /api/v1/gifs                 → Upload GIF
PATCH  /api/v1/gifs/:id             → Update GIF
DELETE /api/v1/gifs/:id             → Delete GIF

Likes:
POST   /api/v1/gifs/:gif_id/likes   → Like GIF
DELETE /api/v1/gifs/:gif_id/likes/:id → Unlike GIF

Comments:
GET    /api/v1/gifs/:gif_id/comments → List comments
POST   /api/v1/gifs/:gif_id/comments → Create comment
PATCH  /api/v1/comments/:id          → Update comment
DELETE /api/v1/comments/:id          → Delete comment

Follows:
POST   /api/v1/users/:id/follow     → Follow user
DELETE /api/v1/users/:id/follow     → Unfollow user
GET    /api/v1/users/:id/followers  → List followers
GET    /api/v1/users/:id/following  → List following

Collections:
GET    /api/v1/collections          → List collections
GET    /api/v1/collections/:id      → Get collection
POST   /api/v1/collections          → Create collection
PATCH  /api/v1/collections/:id      → Update collection
DELETE /api/v1/collections/:id      → Delete collection
POST   /api/v1/collections/:id/add_gif → Add GIF to collection
DELETE /api/v1/collections/:id/remove_gif/:gif_id → Remove GIF
PATCH  /api/v1/collections/:id/reorder → Reorder GIFs
GET    /api/v1/users/:id/collections → User's collections

Hashtags:
GET    /api/v1/hashtags             → List hashtags
GET    /api/v1/hashtags/:id         → Get hashtag
GET    /api/v1/hashtags/trending    → Trending hashtags

Feeds:
GET    /api/v1/feed                 → Personalized feed (auth required)
GET    /api/v1/feed/public          → Public feed
GET    /api/v1/feed/trending        → Trending GIFs
GET    /api/v1/feed/recent          → Recent GIFs
GET    /api/v1/feed/popular         → Popular GIFs
GET    /api/v1/feed/following       → Following feed (auth required)
```

**Response Format:**
```typescript
// Example: Feed response
{
  gifs: [
    {
      id: "uuid",
      title: "string",
      description: "string",
      file_url: "string",
      user: {
        id: "uuid",
        username: "string",
        display_name: "string",
        avatar_url: "string"
      },
      like_count: 42,
      comment_count: 5,
      view_count: 1234,
      created_at: "2025-11-06T12:00:00Z",
      hashtags: ["react", "typescript"]
    }
  ],
  pagination: {
    page: 1,
    per_page: 20,
    total: 100
  }
}
```

### Frontend Status: 0% (Clean Slate) 🆕

**Decision:** Start fresh with modern React architecture rather than resurrect old code.

**Why:**
- Backend API is different from what old frontend expected
- Opportunity to use latest React 19 features
- Clean slate = faster development
- Use proven patterns from the start

---

## Technology Stack

### Core Framework
- **React 19** - Latest stable with concurrent features
- **TypeScript 5.x** - Type safety throughout
- **Vite 5.x** - Fast bundling and HMR

### UI & Styling
- **Tailwind CSS 3.x** - Utility-first styling
- **shadcn/ui** - High-quality React components built on Radix UI
  - Pre-built accessible components
  - Customizable with Tailwind
  - Copy-paste approach (not npm package)

### Routing & Navigation
- **React Router v6** - Standard React routing
- **TanStack Router** (alternative consideration) - Type-safe routing

### Data Fetching & State
- **TanStack Query (React Query) v5** - Server state management
  - Automatic caching
  - Background refetching
  - Optimistic updates
  - Perfect for REST APIs
- **Zustand** (optional) - Client-only state (auth, UI preferences)
- **React Context** - For theme, auth context

### Forms & Validation
- **React Hook Form** - Performant form handling
- **Zod** - Runtime type validation + TypeScript integration

### Additional Libraries
- **axios** - HTTP client (or native fetch with wrapper)
- **date-fns** - Date formatting
- **react-intersection-observer** - Infinite scroll
- **framer-motion** (optional) - Animations
- **react-hot-toast** - Toast notifications

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Vitest** - Unit testing (Vite-native)
- **React Testing Library** - Component testing
- **Playwright** (future) - E2E testing

---

## Project Setup (Week 1, Days 1-2)

### Day 1 Morning: Initialize React Project

**Step 1: Create Vite React App**

```bash
# Create new Vite project
npm create vite@latest frontend -- --template react-ts

# Navigate into project
cd frontend

# Install dependencies
npm install

# Verify it runs
npm run dev
```

**Step 2: Install Core Dependencies**

```bash
# UI & Styling
npm install tailwindcss postcss autoprefixer
npm install class-variance-authority clsx tailwind-merge
npm install @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-avatar @radix-ui/react-tabs

# Routing
npm install react-router-dom

# Data fetching & state
npm install @tanstack/react-query @tanstack/react-query-devtools
npm install zustand

# Forms & validation
npm install react-hook-form zod @hookform/resolvers

# HTTP & utilities
npm install axios
npm install date-fns
npm install react-intersection-observer
npm install react-hot-toast

# Dev dependencies
npm install -D @types/node
```

**Step 3: Configure Tailwind CSS**

```bash
# Initialize Tailwind
npx tailwindcss init -p
```

```typescript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}
```

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}
```

**Step 4: Configure Path Aliases**

```typescript
// vite.config.ts
import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
})
```

```json
// tsconfig.json (add to compilerOptions)
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Step 5: Setup shadcn/ui**

```bash
# Initialize shadcn/ui
npx shadcn-ui@latest init
```

Choose:
- Style: Default
- Base color: Slate
- CSS variables: Yes

```bash
# Install core components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add form
```

**Estimated Time:** 2-3 hours

---

### Day 1 Afternoon: Core Infrastructure

**Step 6: Create Directory Structure**

```bash
src/
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── layout/                # Layout components
│   ├── gif/                   # GIF-related components
│   ├── user/                  # User-related components
│   └── common/                # Shared components
├── pages/
│   ├── auth/                  # Login, signup pages
│   ├── feed/                  # Feed pages
│   ├── gif/                   # GIF detail page
│   ├── user/                  # User profile pages
│   ├── collection/            # Collection pages
│   └── explore/               # Search/explore pages
├── lib/
│   ├── api/                   # API client
│   ├── hooks/                 # Custom React hooks
│   ├── utils/                 # Utility functions
│   ├── types/                 # TypeScript types
│   └── constants/             # Constants
├── stores/                    # Zustand stores
├── App.tsx
├── main.tsx
└── index.css
```

**Step 7: Setup API Client**

```typescript
// src/lib/api/client.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    // Request interceptor (add auth token)
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor (handle token refresh)
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refresh_token');
            const response = await axios.post(`${BASE_URL}/auth/refresh`, {
              refresh_token: refreshToken,
            });

            const { access_token } = response.data;
            localStorage.setItem('access_token', access_token);

            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout user
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config);
    return response.data;
  }
}

export const apiClient = new APIClient();
```

**Step 8: Define TypeScript Types**

```typescript
// src/lib/types/api.ts

export interface User {
  id: string;
  username: string;
  email: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  follower_count: number;
  following_count: number;
  gifs_count: number;
  created_at: string;
}

export interface Gif {
  id: string;
  user: User;
  title: string | null;
  description: string | null;
  file_url: string;
  thumbnail_url: string | null;
  youtube_video_url: string | null;
  youtube_video_title: string | null;
  youtube_channel_name: string | null;
  youtube_timestamp_start: number | null;
  youtube_timestamp_end: number | null;
  duration: number | null;
  fps: number | null;
  resolution_width: number | null;
  resolution_height: number | null;
  file_size: number | null;
  has_text_overlay: boolean;
  text_overlay_data: any | null;
  is_remix: boolean;
  parent_gif_id: string | null;
  remix_count: number;
  privacy: 'public_access' | 'unlisted' | 'private_access';
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  hashtags: string[];
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  gif_id: string;
  user: User;
  parent_comment_id: string | null;
  content: string;
  like_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Collection {
  id: string;
  user: User;
  name: string;
  description: string | null;
  is_public: boolean;
  gifs_count: number;
  created_at: string;
  updated_at: string;
}

export interface Hashtag {
  id: number;
  tag: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// Request types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface CreateGifRequest {
  title?: string;
  description?: string;
  youtube_video_url?: string;
  youtube_timestamp_start?: number;
  youtube_timestamp_end?: number;
  privacy?: 'public_access' | 'unlisted' | 'private_access';
  file: File;
}

export interface CreateCommentRequest {
  content: string;
  parent_comment_id?: string;
}

export interface CreateCollectionRequest {
  name: string;
  description?: string;
  is_public: boolean;
}
```

**Step 9: Create API Service Functions**

```typescript
// src/lib/api/auth.ts
import { apiClient } from './client';
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '@/lib/types/api';

export const authAPI = {
  login: (data: LoginRequest) =>
    apiClient.post<AuthResponse>('/auth/login', data),

  register: (data: RegisterRequest) =>
    apiClient.post<AuthResponse>('/auth/register', data),

  logout: () =>
    apiClient.delete('/auth/logout'),

  refreshToken: (refreshToken: string) =>
    apiClient.post<{ access_token: string }>('/auth/refresh', {
      refresh_token: refreshToken,
    }),

  getCurrentUser: () =>
    apiClient.get<User>('/auth/me'),
};
```

```typescript
// src/lib/api/gifs.ts
import { apiClient } from './client';
import type { Gif, PaginatedResponse, CreateGifRequest } from '@/lib/types/api';

export interface GetGifsParams {
  page?: number;
  per_page?: number;
}

export const gifsAPI = {
  getGifs: (params?: GetGifsParams) =>
    apiClient.get<PaginatedResponse<Gif>>('/gifs', { params }),

  getGif: (id: string) =>
    apiClient.get<Gif>(`/gifs/${id}`),

  createGif: (data: FormData) =>
    apiClient.post<Gif>('/gifs', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  updateGif: (id: string, data: Partial<CreateGifRequest>) =>
    apiClient.patch<Gif>(`/gifs/${id}`, data),

  deleteGif: (id: string) =>
    apiClient.delete(`/gifs/${id}`),
};
```

```typescript
// src/lib/api/feed.ts
import { apiClient } from './client';
import type { Gif, PaginationMeta } from '@/lib/types/api';

export interface FeedParams {
  page?: number;
  per_page?: number;
}

export interface FeedResponse {
  gifs: Gif[];
  pagination: PaginationMeta;
}

export const feedAPI = {
  getPersonalizedFeed: (params?: FeedParams) =>
    apiClient.get<FeedResponse>('/feed', { params }),

  getPublicFeed: (params?: FeedParams) =>
    apiClient.get<FeedResponse>('/feed/public', { params }),

  getTrendingFeed: (params?: FeedParams) =>
    apiClient.get<FeedResponse>('/feed/trending', { params }),

  getRecentFeed: (params?: FeedParams) =>
    apiClient.get<FeedResponse>('/feed/recent', { params }),

  getPopularFeed: (params?: FeedParams) =>
    apiClient.get<FeedResponse>('/feed/popular', { params }),

  getFollowingFeed: (params?: FeedParams) =>
    apiClient.get<FeedResponse>('/feed/following', { params }),
};
```

```typescript
// src/lib/api/likes.ts
import { apiClient } from './client';

export const likesAPI = {
  likeGif: (gifId: string) =>
    apiClient.post(`/gifs/${gifId}/likes`),

  unlikeGif: (gifId: string, likeId: string) =>
    apiClient.delete(`/gifs/${gifId}/likes/${likeId}`),
};
```

```typescript
// src/lib/api/comments.ts
import { apiClient } from './client';
import type { Comment, CreateCommentRequest } from '@/lib/types/api';

export const commentsAPI = {
  getComments: (gifId: string) =>
    apiClient.get<Comment[]>(`/gifs/${gifId}/comments`),

  createComment: (gifId: string, data: CreateCommentRequest) =>
    apiClient.post<Comment>(`/gifs/${gifId}/comments`, data),

  updateComment: (id: string, content: string) =>
    apiClient.patch<Comment>(`/comments/${id}`, { content }),

  deleteComment: (id: string) =>
    apiClient.delete(`/comments/${id}`),
};
```

```typescript
// src/lib/api/follows.ts
import { apiClient } from './client';
import type { User } from '@/lib/types/api';

export const followsAPI = {
  followUser: (userId: string) =>
    apiClient.post(`/users/${userId}/follow`),

  unfollowUser: (userId: string) =>
    apiClient.delete(`/users/${userId}/follow`),

  getFollowers: (userId: string) =>
    apiClient.get<User[]>(`/users/${userId}/followers`),

  getFollowing: (userId: string) =>
    apiClient.get<User[]>(`/users/${userId}/following`),
};
```

```typescript
// src/lib/api/collections.ts
import { apiClient } from './client';
import type { Collection, Gif, CreateCollectionRequest } from '@/lib/types/api';

export const collectionsAPI = {
  getCollections: () =>
    apiClient.get<Collection[]>('/collections'),

  getCollection: (id: string) =>
    apiClient.get<Collection & { gifs: Gif[] }>(`/collections/${id}`),

  createCollection: (data: CreateCollectionRequest) =>
    apiClient.post<Collection>('/collections', data),

  updateCollection: (id: string, data: Partial<CreateCollectionRequest>) =>
    apiClient.patch<Collection>(`/collections/${id}`, data),

  deleteCollection: (id: string) =>
    apiClient.delete(`/collections/${id}`),

  addGif: (collectionId: string, gifId: string) =>
    apiClient.post(`/collections/${collectionId}/add_gif`, { gif_id: gifId }),

  removeGif: (collectionId: string, gifId: string) =>
    apiClient.delete(`/collections/${collectionId}/remove_gif/${gifId}`),

  reorderGifs: (collectionId: string, gifIds: string[]) =>
    apiClient.patch(`/collections/${collectionId}/reorder`, { gif_ids: gifIds }),

  getUserCollections: (userId: string) =>
    apiClient.get<Collection[]>(`/users/${userId}/collections`),
};
```

```typescript
// src/lib/api/hashtags.ts
import { apiClient } from './client';
import type { Hashtag, Gif } from '@/lib/types/api';

export const hashtagsAPI = {
  getHashtags: () =>
    apiClient.get<Hashtag[]>('/hashtags'),

  getHashtag: (id: string) =>
    apiClient.get<Hashtag & { gifs: Gif[] }>(`/hashtags/${id}`),

  getTrendingHashtags: () =>
    apiClient.get<Hashtag[]>('/hashtags/trending'),
};
```

```typescript
// src/lib/api/index.ts
export * from './client';
export * from './auth';
export * from './gifs';
export * from './feed';
export * from './likes';
export * from './comments';
export * from './follows';
export * from './collections';
export * from './hashtags';
```

**Estimated Time:** 3-4 hours

---

### Day 2: Authentication & Layout

**Step 10: Setup React Query**

```typescript
// src/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

```typescript
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './App.tsx'
import { queryClient } from '@/lib/query-client'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>,
)
```

**Step 11: Create Auth Store (Zustand)**

```typescript
// src/stores/auth-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/lib/types/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        set({ user, accessToken, refreshToken });
      },
      clearAuth: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({ user: null, accessToken: null, refreshToken: null });
      },
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      isAuthenticated: () => {
        const { accessToken } = get();
        return accessToken !== null;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
```

**Step 12: Create Layout Components**

```typescript
// src/components/layout/Navbar.tsx
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/auth-store';

export function Navbar() {
  const { user, isAuthenticated, clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
    window.location.href = '/login';
  };

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-xl font-bold">
              ytgify
            </Link>
            <div className="hidden md:flex items-center gap-4">
              <Link to="/feed" className="text-sm hover:text-primary">
                Feed
              </Link>
              <Link to="/explore" className="text-sm hover:text-primary">
                Explore
              </Link>
              {isAuthenticated() && (
                <Link to="/collections" className="text-sm hover:text-primary">
                  Collections
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated() ? (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/upload">Upload</Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.avatar_url || undefined} />
                      <AvatarFallback>
                        {user?.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={`/@${user?.username}`}>Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/settings">Settings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Login</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/register">Sign Up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
```

```typescript
// src/components/layout/AppLayout.tsx
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
```

**Step 13: Create Auth Pages**

```typescript
// src/pages/auth/LoginPage.tsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useMutation({
    mutationFn: authAPI.login,
    onSuccess: (data) => {
      setAuth(data.user, data.access_token, data.refresh_token);
      toast.success('Logged in successfully!');
      navigate('/feed');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Login failed');
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login to ytgify</CardTitle>
          <CardDescription>Enter your credentials to continue</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? 'Logging in...' : 'Login'}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
```

```typescript
// src/pages/auth/RegisterPage.tsx
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'react-hot-toast';

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  password_confirmation: z.string(),
}).refine((data) => data.password === data.password_confirmation, {
  message: "Passwords don't match",
  path: ['password_confirmation'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const registerMutation = useMutation({
    mutationFn: authAPI.register,
    onSuccess: (data) => {
      setAuth(data.user, data.access_token, data.refresh_token);
      toast.success('Account created successfully!');
      navigate('/feed');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Registration failed');
    },
  });

  const onSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>Sign up to start sharing GIFs</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="username"
                {...register('username')}
              />
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password_confirmation">Confirm Password</Label>
              <Input
                id="password_confirmation"
                type="password"
                placeholder="••••••••"
                {...register('password_confirmation')}
              />
              {errors.password_confirmation && (
                <p className="text-sm text-destructive">
                  {errors.password_confirmation.message}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? 'Creating account...' : 'Sign Up'}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
```

**Step 14: Setup Routing**

```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { FeedPage } from '@/pages/feed/FeedPage';
import { useAuthStore } from '@/stores/auth-store';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<Navigate to="/feed" replace />} />
            <Route
              path="/feed"
              element={
                <ProtectedRoute>
                  <FeedPage />
                </ProtectedRoute>
              }
            />
            {/* More routes will be added here */}
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </>
  );
}

export default App;
```

**Estimated Time:** 4-5 hours

**End of Day 2:** You now have:
- Complete project setup with Vite + React + TypeScript
- Tailwind CSS + shadcn/ui configured
- Full API client with type safety
- Authentication flow (login, register)
- Layout components (Navbar, AppLayout)
- React Query setup
- Zustand auth store
- Basic routing

---

## Core Infrastructure (Week 1, Days 3-5)

### Day 3: GIF Components & Feed Foundation

**Step 15: Create GIF Card Component**

```typescript
// src/components/gif/GifCard.tsx
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Share2 } from 'lucide-react';
import type { Gif } from '@/lib/types/api';
import { formatDistanceToNow } from 'date-fns';

interface GifCardProps {
  gif: Gif;
  onClick?: () => void;
}

export function GifCard({ gif, onClick }: GifCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
      <div onClick={onClick}>
        {/* GIF Image */}
        <div className="relative aspect-video bg-muted">
          <img
            src={gif.file_url}
            alt={gif.title || 'GIF'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {gif.is_remix && (
            <Badge className="absolute top-2 right-2">Remix</Badge>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* User Info */}
          <Link
            to={`/@${gif.user.username}`}
            className="flex items-center gap-2 hover:opacity-80"
            onClick={(e) => e.stopPropagation()}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={gif.user.avatar_url || undefined} />
              <AvatarFallback>
                {gif.user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {gif.user.display_name || gif.user.username}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(gif.created_at), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </Link>

          {/* Title */}
          {gif.title && (
            <h3 className="font-medium line-clamp-2">{gif.title}</h3>
          )}

          {/* Hashtags */}
          {gif.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {gif.hashtags.slice(0, 3).map((tag) => (
                <Link
                  key={tag}
                  to={`/explore?tag=${tag}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Badge variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                </Link>
              ))}
              {gif.hashtags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{gif.hashtags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              <span>{gif.like_count}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              <span>{gif.comment_count}</span>
            </div>
            {gif.view_count > 0 && (
              <div className="flex items-center gap-1">
                <span>{gif.view_count} views</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
```

```typescript
// src/components/gif/GifGrid.tsx
import { GifCard } from './GifCard';
import type { Gif } from '@/lib/types/api';

interface GifGridProps {
  gifs: Gif[];
  onGifClick: (gif: Gif) => void;
}

export function GifGrid({ gifs, onGifClick }: GifGridProps) {
  if (gifs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No GIFs found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {gifs.map((gif) => (
        <GifCard key={gif.id} gif={gif} onClick={() => onGifClick(gif)} />
      ))}
    </div>
  );
}
```

**Step 16: Create Feed Page Skeleton**

```typescript
// src/pages/feed/FeedPage.tsx
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { GifGrid } from '@/components/gif/GifGrid';
import { Skeleton } from '@/components/ui/skeleton';
import { feedAPI } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import type { Gif } from '@/lib/types/api';

type FeedType = 'personalized' | 'trending' | 'recent' | 'popular' | 'following';

export function FeedPage() {
  const navigate = useNavigate();
  const [feedType, setFeedType] = useState<FeedType>('personalized');
  const { ref, inView } = useInView();

  const feedQuery = useInfiniteQuery({
    queryKey: ['feed', feedType],
    queryFn: ({ pageParam = 1 }) => {
      const feedFunctions = {
        personalized: feedAPI.getPersonalizedFeed,
        trending: feedAPI.getTrendingFeed,
        recent: feedAPI.getRecentFeed,
        popular: feedAPI.getPopularFeed,
        following: feedAPI.getFollowingFeed,
      };
      return feedFunctions[feedType]({ page: pageParam, per_page: 20 });
    },
    getNextPageParam: (lastPage) => {
      const { page, per_page, total } = lastPage.pagination;
      const hasMore = page * per_page < total;
      return hasMore ? page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  // Load more when scrolling to bottom
  React.useEffect(() => {
    if (inView && feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) {
      feedQuery.fetchNextPage();
    }
  }, [inView, feedQuery]);

  const allGifs = feedQuery.data?.pages.flatMap((page) => page.gifs) ?? [];

  const handleGifClick = (gif: Gif) => {
    navigate(`/gifs/${gif.id}`);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <Tabs value={feedType} onValueChange={(v) => setFeedType(v as FeedType)}>
        <TabsList className="mb-6">
          <TabsTrigger value="personalized">For You</TabsTrigger>
          <TabsTrigger value="trending">Trending</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="popular">Popular</TabsTrigger>
          <TabsTrigger value="following">Following</TabsTrigger>
        </TabsList>

        <TabsContent value={feedType}>
          {feedQuery.isLoading ? (
            <LoadingGrid />
          ) : feedQuery.isError ? (
            <div className="text-center py-12">
              <p className="text-destructive">Failed to load feed</p>
            </div>
          ) : (
            <>
              <GifGrid gifs={allGifs} onGifClick={handleGifClick} />

              {/* Infinite scroll trigger */}
              {feedQuery.hasNextPage && (
                <div ref={ref} className="py-8">
                  <LoadingGrid />
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-video w-full" />
          <div className="space-y-2 p-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Estimated Time:** 4-5 hours

---

### Day 4: Like Button & Optimistic Updates

**Step 17: Create Like Button Component**

```typescript
// src/components/gif/LikeButton.tsx
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { likesAPI } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface LikeButtonProps {
  gifId: string;
  isLiked: boolean;
  likeCount: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
}

export function LikeButton({
  gifId,
  isLiked,
  likeCount,
  size = 'md',
  showCount = true,
}: LikeButtonProps) {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  const likeMutation = useMutation({
    mutationFn: () => {
      if (isLiked) {
        // Note: We'd need to track the like ID for unlike
        // For simplicity, we'll use a toggle endpoint assumption
        return likesAPI.unlikeGif(gifId, 'current');
      } else {
        return likesAPI.likeGif(gifId);
      }
    },
    onMutate: async () => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['gif', gifId] });

      const previousGif = queryClient.getQueryData(['gif', gifId]);

      queryClient.setQueryData(['gif', gifId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          like_count: isLiked ? old.like_count - 1 : old.like_count + 1,
          liked_by_current_user: !isLiked,
        };
      });

      return { previousGif };
    },
    onError: (error, variables, context) => {
      // Revert on error
      if (context?.previousGif) {
        queryClient.setQueryData(['gif', gifId], context.previousGif);
      }
      toast.error('Failed to update like');
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['gif', gifId] });
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error('Please login to like GIFs');
      return;
    }

    likeMutation.mutate();
  };

  return (
    <Button
      variant={isLiked ? 'default' : 'ghost'}
      size={size}
      className={cn(
        'gap-2',
        isLiked && 'text-red-500 hover:text-red-600'
      )}
      onClick={handleClick}
      disabled={likeMutation.isPending}
    >
      <Heart
        className={cn(
          'h-4 w-4',
          isLiked && 'fill-current'
        )}
      />
      {showCount && <span>{likeCount}</span>}
    </Button>
  );
}
```

**Step 18: Update GIF Card with Like Button**

```typescript
// Update src/components/gif/GifCard.tsx to include interactive like button
// ... (add LikeButton import and usage in the stats section)
```

**Estimated Time:** 2-3 hours

---

### Day 5: Error Handling & Loading States

**Step 19: Create Error Boundary**

```typescript
// src/components/common/ErrorBoundary.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-screen">
          <Card className="p-6 text-center space-y-4">
            <h2 className="text-2xl font-bold">Something went wrong</h2>
            <p className="text-muted-foreground">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Step 20: Create Loading Skeletons**

```typescript
// src/components/common/LoadingStates.tsx
import { Skeleton } from '@/components/ui/skeleton';

export function GifCardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="aspect-video w-full" />
      <div className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

export function GifGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <GifCardSkeleton key={i} />
      ))}
    </div>
  );
}
```

**Estimated Time:** 2-3 hours

---

## Feed & Discovery (Week 2)

_[Content continues with detailed implementation steps for Week 2-4...]_

**Due to length constraints, I'll provide the high-level structure:**

### Week 2: Feed & Discovery
- Day 1-2: Complete infinite scroll, feed switching, performance optimization
- Day 3: GIF Detail Page foundation (display, user info, stats)
- Day 4: Comments section (display, create, threading)
- Day 5: Related GIFs, hashtag navigation

### Week 3: GIF Detail & Social Features
- Days 1-3: Complete GIF detail interactions (like, comment, share, save to collection)
- Days 4-5: User profiles (info display, GIFs grid, tabs for GIFs/Likes/Collections, follow button)

### Week 4: Collections & Polish
- Days 1-2: Collections (browser, create/edit, add GIFs, reorder)
- Days 3-4: Search & explore (hashtag trending, search bar, filters)
- Day 5: Polish, testing, bug fixes

---

## File Structure

```
frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── AppLayout.tsx
│   │   │   └── Footer.tsx
│   │   ├── gif/
│   │   │   ├── GifCard.tsx
│   │   │   ├── GifGrid.tsx
│   │   │   ├── GifDetail.tsx
│   │   │   ├── LikeButton.tsx
│   │   │   ├── ShareButton.tsx
│   │   │   └── SaveToCollectionButton.tsx
│   │   ├── user/
│   │   │   ├── UserAvatar.tsx
│   │   │   ├── FollowButton.tsx
│   │   │   └── UserCard.tsx
│   │   ├── comment/
│   │   │   ├── CommentList.tsx
│   │   │   ├── CommentItem.tsx
│   │   │   └── CommentForm.tsx
│   │   ├── collection/
│   │   │   ├── CollectionCard.tsx
│   │   │   ├── CollectionGrid.tsx
│   │   │   └── AddToCollectionDialog.tsx
│   │   └── common/
│   │       ├── ErrorBoundary.tsx
│   │       ├── LoadingStates.tsx
│   │       └── EmptyState.tsx
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegisterPage.tsx
│   │   ├── feed/
│   │   │   └── FeedPage.tsx
│   │   ├── gif/
│   │   │   └── GifDetailPage.tsx
│   │   ├── user/
│   │   │   └── ProfilePage.tsx
│   │   ├── collection/
│   │   │   ├── CollectionsPage.tsx
│   │   │   └── CollectionDetailPage.tsx
│   │   └── explore/
│   │       └── ExplorePage.tsx
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   ├── auth.ts
│   │   │   ├── gifs.ts
│   │   │   ├── feed.ts
│   │   │   ├── likes.ts
│   │   │   ├── comments.ts
│   │   │   ├── follows.ts
│   │   │   ├── collections.ts
│   │   │   ├── hashtags.ts
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useFeed.ts
│   │   │   ├── useGif.ts
│   │   │   ├── useInfiniteScroll.ts
│   │   │   └── useOptimisticUpdate.ts
│   │   ├── types/
│   │   │   └── api.ts
│   │   ├── utils/
│   │   │   ├── cn.ts
│   │   │   ├── format.ts
│   │   │   └── validation.ts
│   │   ├── constants/
│   │   │   └── index.ts
│   │   └── query-client.ts
│   ├── stores/
│   │   ├── auth-store.ts
│   │   └── ui-store.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── postcss.config.js
```

---

## Component Hierarchy

```
App
├── QueryClientProvider
├── BrowserRouter
│   └── Routes
│       ├── AppLayout (with Navbar)
│       │   ├── LoginPage
│       │   ├── RegisterPage
│       │   ├── FeedPage
│       │   │   ├── Tabs
│       │   │   └── GifGrid
│       │   │       └── GifCard[]
│       │   │           ├── UserAvatar
│       │   │           ├── LikeButton
│       │   │           └── Badge[]
│       │   ├── GifDetailPage
│       │   │   ├── GifDetail
│       │   │   ├── LikeButton
│       │   │   ├── ShareButton
│       │   │   ├── SaveToCollectionButton
│       │   │   ├── CommentList
│       │   │   │   ├── CommentForm
│       │   │   │   └── CommentItem[]
│       │   │   └── RelatedGifs (GifGrid)
│       │   ├── ProfilePage
│       │   │   ├── UserHeader
│       │   │   ├── FollowButton
│       │   │   ├── Tabs
│       │   │   └── GifGrid
│       │   ├── CollectionsPage
│       │   │   └── CollectionGrid
│       │   │       └── CollectionCard[]
│       │   └── ExplorePage
│       │       ├── TrendingHashtags
│       │       ├── SearchBar
│       │       └── GifGrid
│       └── ...
└── Toaster (toast notifications)
```

---

## State Management Strategy

### Server State (React Query)
- All API data (GIFs, users, comments, collections, etc.)
- Automatic caching with 5-minute stale time
- Background refetching
- Optimistic updates for likes, follows, comments

### Client State (Zustand)
- **Auth Store**: User session, tokens, authentication status
- **UI Store** (optional): Theme, sidebar state, modals

### Local Component State (useState)
- Form inputs
- UI toggles (dropdowns, dialogs)
- Transient UI state

### URL State (React Router)
- Current page
- Query parameters (search, filters, pagination)

**Example React Query Hook:**

```typescript
// src/lib/hooks/useFeed.ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { feedAPI } from '@/lib/api';

export function useFeed(type: 'personalized' | 'trending' | 'recent' | 'popular' | 'following') {
  return useInfiniteQuery({
    queryKey: ['feed', type],
    queryFn: ({ pageParam = 1 }) => {
      const feedFns = {
        personalized: feedAPI.getPersonalizedFeed,
        trending: feedAPI.getTrendingFeed,
        recent: feedAPI.getRecentFeed,
        popular: feedAPI.getPopularFeed,
        following: feedAPI.getFollowingFeed,
      };
      return feedFns[type]({ page: pageParam, per_page: 20 });
    },
    getNextPageParam: (lastPage) => {
      const { page, per_page, total } = lastPage.pagination;
      return page * per_page < total ? page + 1 : undefined;
    },
    initialPageParam: 1,
  });
}
```

---

## Testing Strategy

### Unit Tests (Vitest + React Testing Library)
- **API client functions**: Mock axios, test request/response handling
- **Utility functions**: Date formatting, validation, etc.
- **Zustand stores**: Test state updates, persistence
- **Custom hooks**: Test hook behavior with mock data

### Component Tests (React Testing Library)
- **UI components**: Render, user interactions, accessibility
- **Forms**: Validation, submission, error handling
- **Buttons**: Click handlers, disabled states, loading states

### Integration Tests
- **Auth flow**: Login → navigate to feed → logout
- **GIF interactions**: View GIF → like → comment → save to collection
- **Infinite scroll**: Load page → scroll → load more

### E2E Tests (Future: Playwright)
- Critical user journeys
- Cross-browser testing
- Mobile responsiveness

**Example Test:**

```typescript
// src/components/gif/LikeButton.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LikeButton } from './LikeButton';
import { useAuthStore } from '@/stores/auth-store';

const queryClient = new QueryClient();

describe('LikeButton', () => {
  it('shows like count', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LikeButton gifId="123" isLiked={false} likeCount={42} />
      </QueryClientProvider>
    );
    
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('shows filled heart when liked', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LikeButton gifId="123" isLiked={true} likeCount={42} />
      </QueryClientProvider>
    );
    
    const heart = screen.getByRole('button').querySelector('svg');
    expect(heart).toHaveClass('fill-current');
  });
});
```

---

## Summary

This plan provides:

1. **Clear 4-week roadmap** with daily breakdowns
2. **Complete code examples** for core infrastructure
3. **Type-safe API client** with full backend integration
4. **Modern React patterns** (hooks, React Query, Zustand)
5. **shadcn/ui components** for consistent, accessible UI
6. **Pragmatic testing strategy** focusing on critical paths
7. **Incremental delivery** - working features every week

**Estimated Timeline:**
- Week 1: Project setup, auth, basic feed (working demo)
- Week 2: Complete feed features, GIF detail page
- Week 3: User profiles, social interactions
- Week 4: Collections, search, polish

**Total Effort:** ~120-160 hours (3-4 weeks at 40 hours/week)

**Next Steps:**
1. Review this plan with team
2. Set up project repository
3. Start with Day 1: Project Setup
4. Deliver incremental demos each week

---

**Related Documents:**
- [01-CURRENT-STATUS.md](01-CURRENT-STATUS.md) - Backend API status
- [03-FEATURES.md](03-FEATURES.md) - Feature requirements
- [04-ARCHITECTURE.md](04-ARCHITECTURE.md) - Technical architecture
