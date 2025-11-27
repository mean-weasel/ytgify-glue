# ytgify - YouTube GIF Platform

A social-first web platform for discovering, sharing, and remixing YouTube GIFs.

---

## ⚠️ IMPORTANT: Technology Stack

**This application uses Rails 8 + Hotwire (Turbo + Stimulus), NOT React.**

### Tech Stack:
- **Backend:** Ruby on Rails 8.0.4
- **Frontend:** Hotwire (Turbo Rails + Stimulus)
- **JavaScript:** Importmap-rails (no build step)
- **Styling:** Tailwind CSS 4
- **Database:** PostgreSQL
- **Auth:** Devise (sessions + JWT for extension)
- **Storage:** AWS S3 via ActiveStorage
- **Jobs:** Sidekiq + Redis
- **Real-time:** Turbo Streams over ActionCable

### ❌ What We DON'T Use:
- NO React, Vue, or other JavaScript frameworks
- NO webpack, Vite, or npm build process for frontend
- NO separate frontend application

### ✅ What We DO Use:
- Server-rendered ERB views
- Turbo Frames for dynamic updates
- Turbo Streams for real-time features
- Stimulus controllers for JavaScript enhancements
- Tailwind CSS for styling

---

## Quick Start

### Prerequisites
- Ruby 3.4.5
- PostgreSQL 14+
- Redis 7+
- Node.js 20+ (for Tailwind CSS only)

### Setup

```bash
# Install dependencies
bundle install

# Setup database
rails db:create db:migrate db:seed

# Start development server (Rails + Tailwind watcher)
bin/dev
```

Visit `http://localhost:3000`

### Run Tests

```bash
# All tests
rails test

# Specific test
rails test test/models/gif_test.rb
```

**Current Status:** ✅ All 425 tests passing

---

## Production Deployment

Ready to deploy? See our comprehensive guides:

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete deployment guide (Kamal, Docker, environment setup)
- **[CLAUDE.md](CLAUDE.md)** - Development guidelines and project instructions

### Quick Deploy

```bash
# Using Kamal (zero-downtime Docker deployments)
kamal setup    # First time only
kamal deploy   # Deploy latest changes
```

### Performance Features

- ✅ **Caching:** Redis-backed caching with 75% database load reduction
- ✅ **CDN Ready:** Asset pipeline with gzip compression
- ✅ **Rate Limiting:** Rack::Attack protection against abuse
- ✅ **Security:** CSP headers, secure sessions, HSTS in production
- ✅ **Monitoring:** Built-in health checks and logging

---

## Project Structure

```
app/
├── controllers/
│   ├── api/v1/          # API for Chrome extension (JWT auth)
│   └── *.rb             # Web controllers (session auth)
├── models/              # ActiveRecord models
├── views/
│   ├── layouts/         # Application layouts
│   ├── home/            # Feed, trending pages
│   ├── gifs/            # GIF detail, upload
│   ├── users/           # Profiles
│   └── shared/          # Partials (navbar, flash, etc)
├── javascript/
│   └── controllers/     # Stimulus controllers
└── assets/
    └── tailwind/        # Tailwind CSS

plans/                   # Comprehensive planning docs
├── 00-OVERVIEW.md
├── 01-CURRENT-STATUS.md
├── HOTWIRE-IMPLEMENTATION.md  # ⭐ Implementation guide
└── ...
```

---

## Architecture Overview

### Dual Auth System

1. **Web App (Hotwire):** Devise sessions (cookies)
2. **Chrome Extension:** JWT tokens via API

Both use the same backend, but different authentication strategies.

### Phase 1 Complete ✅

- ✅ Follow system (user-to-user following)
- ✅ Collections (organize GIFs)
- ✅ Hashtags (trending, discovery)
- ✅ Feed algorithm (personalized feeds)
- ✅ ViewEvent analytics
- ✅ All API endpoints
- ✅ 107 passing tests

### Phase 2 In Progress 🚧

- ✅ Hotwire setup complete
- 🚧 Building views and controllers
- ⏳ Authentication UI
- ⏳ Feed page with Turbo Frames
- ⏳ GIF detail pages
- ⏳ User profiles

---

## Key Features (Planned)

### Core Features
- 🎬 Browse YouTube GIF feed (trending, recent, following)
- 👤 User profiles with GIF galleries
- ❤️ Like and comment on GIFs
- 📁 Collections for organizing GIFs
- 🏷️ Hashtag discovery and trending
- 👥 Follow other creators
- 🔍 Search by title, tags, creator

### Social Features
- 💬 Threaded comments
- ⭐ Collections (public/private)
- 🔥 Trending algorithm
- 📊 View counts and analytics

### Remix Editor (Future)
- ✨ Text overlay editor (Canvas API + GIF.js)
- 🎨 Remix existing GIFs
- 🌈 Filters and effects

---

## Development

### Generate Controller

```bash
rails g controller Home feed trending
```

### Generate Stimulus Controller

```bash
rails g stimulus infinite-scroll
```

### Create Migration

```bash
rails g migration AddFieldToModel field:type
rails db:migrate
```

### Start Dev Server

```bash
# Starts Rails + Tailwind watcher
bin/dev

# Or separately:
rails s              # Rails server
rails tailwindcss:watch  # Tailwind watcher
```

---

## API Documentation (for Chrome Extension)

### Authentication

```bash
POST /api/v1/auth/login
POST /api/v1/auth/register
DELETE /api/v1/auth/logout
POST /api/v1/auth/refresh
GET /api/v1/auth/me
```

### GIFs

```bash
GET    /api/v1/gifs           # List GIFs
POST   /api/v1/gifs           # Create GIF
GET    /api/v1/gifs/:id       # Show GIF
PATCH  /api/v1/gifs/:id       # Update GIF
DELETE /api/v1/gifs/:id       # Delete GIF
```

### Social

```bash
POST   /api/v1/gifs/:id/likes                # Toggle like
POST   /api/v1/users/:id/follow              # Toggle follow
GET    /api/v1/users/:id/followers           # List followers
GET    /api/v1/users/:id/following           # List following
GET    /api/v1/collections                   # List collections
POST   /api/v1/collections                   # Create collection
POST   /api/v1/collections/:id/add_gif       # Add GIF to collection
DELETE /api/v1/collections/:id/remove_gif/:gif_id  # Remove GIF
```

### Feed

```bash
GET /api/v1/feed              # Personalized feed
GET /api/v1/feed/public       # Public feed
GET /api/v1/feed/trending     # Trending GIFs
GET /api/v1/feed/recent       # Recent GIFs
GET /api/v1/feed/popular      # Popular GIFs
GET /api/v1/feed/following    # Following feed
```

All API endpoints require JWT authentication (except public feeds).

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://localhost/ytgify_development

# AWS S3 (for GIF storage)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=your_bucket
AWS_S3_REGION=us-east-1

# JWT (for Chrome extension API)
JWT_SECRET_KEY=your_secret_key
JWT_REFRESH_SECRET_KEY=your_refresh_secret

# Redis (for Sidekiq)
REDIS_URL=redis://localhost:6379/0
```

Use Doppler for secrets management (recommended).

---

## Testing

### Model Tests

```bash
rails test test/models/
```

### Controller Tests

```bash
rails test test/controllers/
```

### System Tests (with Hotwire)

```bash
rails test:system
```

---

## Deployment

### Production Setup

```bash
# Precompile assets
rails assets:precompile

# Run migrations
rails db:migrate

# Start server
bundle exec puma -C config/puma.rb
```

### Docker (via Kamal)

```bash
kamal setup
kamal deploy
```

---

## Contributing

### Before You Start

1. Read `plans/HOTWIRE-IMPLEMENTATION.md`
2. Understand the tech stack (Rails 8 + Hotwire, NOT React)
3. Follow Rails conventions
4. Write tests for new features

### Workflow

1. Create feature branch
2. Write tests
3. Implement feature with Hotwire
4. Ensure all tests pass
5. Submit PR

---

## Resources

- [Hotwire Implementation Guide](plans/HOTWIRE-IMPLEMENTATION.md) ⭐
- [Current Status](plans/01-CURRENT-STATUS.md)
- [Architecture Decisions](plans/02-ARCHITECTURE-DECISIONS.md)
- [Roadmap](plans/05-ROADMAP.md)

### External Docs
- [Rails Guides](https://guides.rubyonrails.org/)
- [Turbo Handbook](https://turbo.hotwired.dev/)
- [Stimulus Handbook](https://stimulus.hotwired.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## License

Copyright © 2025 ytgify
