# CLAUDE.md - YTgify Rails Backend

This file provides guidance to Claude Code (claude.ai/code) when working with the Rails backend.

## Technology Stack

**Rails 8 + Hotwire (Turbo + Stimulus) - NO React/Vue**

- **Backend:** Rails 8.0.4, PostgreSQL (UUID primary keys)
- **Frontend:** Hotwire (Turbo + Stimulus), Tailwind CSS 4
- **Auth:** Devise (web sessions) + JWT (API for extensions)
- **Jobs:** Sidekiq + Redis
- **Real-time:** ActionCable + Turbo Streams
- **Storage:** AWS S3 via ActiveStorage

**DO:** ERB views, Turbo Frames/Streams, Stimulus controllers
**DON'T:** React, Vue, webpack, separate frontend apps

## Commands

```bash
# Development
bin/dev                                    # Start Rails + Tailwind
bin/rails test                             # Run all tests
bin/rails test test/models/gif_test.rb    # Run specific test

# Database
bin/rails db:migrate                       # Run migrations
bin/rails db:reset                         # Reset database
bin/rails db:seed                          # Seed test user (test@example.com / password123)

# Generators (always use --primary-key-type=uuid)
bin/rails g model Feature user:references name:string --primary-key-type=uuid
bin/rails g controller Features index show
bin/rails g stimulus feature-name

# Background jobs
bundle exec sidekiq                        # Start Sidekiq
# Dashboard: http://localhost:3000/sidekiq
```

## Architecture

### Route Structure

```ruby
# Marketing (root level - public)
/                       # Landing page
/welcome                # Device detection welcome
/privacy-policy         # Privacy policy
/terms-of-service       # Terms of service

# Blog (public)
/blog                   # Blog index
/blog/tag/:tag          # Filter by tag
/blog/:slug             # Individual post

# Share (public)
/share                  # Waitlist signup
/share/:id              # Shared GIF view

# App (authenticated - /app scope)
/app                    # Feed
/app/trending           # Trending GIFs
/app/gifs/:id           # GIF detail (likes, comments, remix)
/app/users/:username    # User profile (followers, following)
/app/collections        # User collections
/app/hashtags/:name     # Hashtag view
/app/notifications      # Notifications

# API (for extensions - /api/v1)
POST /api/v1/auth/login       # JWT login
POST /api/v1/auth/register    # JWT register
POST /api/v1/auth/refresh     # Token refresh
GET  /api/v1/auth/me          # Current user
POST /api/v1/gifs             # Upload GIF
GET  /api/v1/feed             # Personalized feed
```

### Key Patterns

- **UUID Primary Keys:** All models use UUIDs (always use `--primary-key-type=uuid`)
- **Dual Auth:** Web (Devise sessions) + API (JWT tokens via `Authorization: Bearer`)
- **Counter Caches:** User, Gif, Collection, Hashtag (auto-update on association changes)
- **Soft Deletes:** Gif, Comment (use `soft_delete!`, `.not_deleted` scope)

### Core Models

```
User (Devise + JWT)
├── has_many :gifs, :likes, :comments, :collections
├── has_many :notifications (polymorphic recipient)
└── Self-referential: :following, :followers (via Follow model)

Gif (central model)
├── belongs_to :user, :parent_gif (for remixes)
├── has_many :likes, :comments, :collections, :hashtags, :view_events
├── has_one_attached :file (S3)
└── Enum :privacy (public_access, unlisted, private_access)

Notification (polymorphic)
├── recipient, actor, notifiable (all polymorphic)
├── Actions: "like", "comment", "follow", "collection_add"
└── Real-time: ActionCable (NotificationChannel)
```

### Services

- `FeedService` - Personalized/trending feeds with caching
- `NotificationService` - Creates & broadcasts real-time notifications
- `BlogService` - Markdown parsing with frontmatter, syntax highlighting (Rouge)

### Blog System

Blog posts are markdown files in `content/blog/`:

```markdown
---
title: "Post Title"
description: "Meta description"
date: "2025-01-15"
tags: ["tutorial", "gif"]
thumbnail: "marketing/image.png"
readTime: 3
---

Content here...
```

`BlogService` handles:
- Frontmatter parsing
- Markdown → HTML conversion
- Syntax highlighting
- Tag filtering
- Related posts

### Stimulus Controllers

Located in `app/javascript/controllers/`:
- `carousel_controller.js` - GIF carousel rotation
- `device_detect_controller.js` - Mobile/desktop content switching
- `dropdown_controller.js` - Dropdown menus
- `email_capture_controller.js` - Email form handling
- `flash_controller.js` - Auto-dismiss flash messages
- `follow_controller.js` - Follow/unfollow with Turbo
- `infinite_scroll_controller.js` - Pagination
- `like_controller.js` - Like toggle with Turbo
- `loading_controller.js` - Loading states
- `remix_editor_controller.js` - GIF remix canvas
- `share_controller.js` - Share API integration
- And more...

## Common Patterns

### Turbo Streams (Real-time Updates)

```ruby
# Model broadcasts
after_create_commit -> { broadcast_prepend_to "features" }
after_update_commit -> { broadcast_replace_to "features" }
after_destroy_commit -> { broadcast_remove_to "features" }

# View
<%= turbo_stream_from @feature %>

# Controller
respond_to do |format|
  format.turbo_stream
  format.html { redirect_to features_path }
end
```

### Adding Notifications

```ruby
# Model callback
after_create :create_notification

def create_notification
  NotificationService.create_your_notification(self)
rescue => e
  Rails.logger.error "Failed notification: #{e.message}"
end

# Service (app/services/notification_service.rb)
def self.create_your_notification(record)
  return if record.user == record.target_user

  notification = Notification.create!(
    recipient: record.target_user,
    actor: record.user,
    notifiable: record,
    action: "your_action"
  )
  broadcast_notification(notification)
end
```

### Devise + Turbo Compatibility

Sign-in form uses `data: { turbo: false }` for proper flash messages:

```erb
<%= form_for(resource, html: { data: { turbo: false } }) do |f| %>
```

## Testing

### Running Tests

```bash
bin/rails test                             # All tests (parallel)
PARALLEL_WORKERS=0 bin/rails test         # Sequential (avoid macOS fork issues)
bin/rails test test/models/gif_test.rb    # Specific file
bin/rails test test/models/gif_test.rb -n test_name  # Specific test
```

### Test Helpers

```ruby
# Controller tests - sign in helper
def sign_in(user)
  post user_session_path, params: {
    user: { email: user.email, password: "password123" }
  }
end

# API tests - JWT helper
def generate_jwt_token(user)
  payload = { sub: user.id, exp: 24.hours.from_now.to_i }
  JWT.encode(payload, ENV.fetch('JWT_SECRET_KEY', 'changeme'))
end
```

### Test Best Practices

**Fixture Management:**
- Counter cache columns must match actual associations
- Empty fixtures for test isolation (e.g., `follows.yml` is empty)
- Use relative counts: `assert_equal initial_count + 1, Model.count`

**ActiveStorage in Tests:**
- File attachments can be flaky in parallel tests
- Use `StringIO.new(File.binread(path))` for reliable file uploads

**Parallel Testing:**
- Avoid `.last` in parallel tests
- Use `Notification.find_by(notifiable: obj, action: "action")` instead

## Environment Variables

```bash
DATABASE_URL=postgresql://localhost/ytgify_development
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET, AWS_S3_REGION
JWT_SECRET_KEY, JWT_REFRESH_SECRET_KEY
REDIS_URL=redis://localhost:6379/0
```

## Key Directories

```
ytgify-share/
├── app/
│   ├── controllers/
│   │   ├── api/v1/           # API endpoints for extensions
│   │   ├── marketing_controller.rb
│   │   ├── blog_controller.rb
│   │   └── home_controller.rb
│   ├── services/             # FeedService, NotificationService, BlogService
│   ├── javascript/controllers/  # Stimulus controllers
│   └── views/
│       ├── marketing/        # Landing, privacy, terms
│       ├── blog/             # Blog templates
│       └── devise/           # Auth views
├── content/blog/             # Markdown blog posts
├── config/
│   └── routes.rb             # All route definitions
└── test/                     # Minitest suite
```

## Current Status

**Implemented:**
- Marketing site (landing, privacy, terms, welcome)
- Blog system with markdown + tags
- Social platform (feed, likes, comments, follows, notifications)
- GIF upload + remix
- Collections and hashtags
- Real-time notifications via ActionCable
- JWT API for extensions
- Comprehensive test suite

**Focus Areas:**
- Test coverage improvements
- Performance optimization (Redis caching)
- Mobile responsive testing
