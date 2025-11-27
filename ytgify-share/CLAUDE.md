# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🤖 Task Agent Usage Guidelines

**IMPORTANT**: Use specialized Task agents liberally for exploration, planning, and research tasks.

### When to Use Task Agents

**Explore Agent** (use `subagent_type=Explore`):
- Understanding codebase structure and architecture
- Finding where features are implemented across multiple files
- Exploring error handling patterns, API endpoints, or design patterns
- Questions like "How does X work?", "Where is Y handled?", "What's the structure of Z?"
- Set thoroughness: `quick` (basic), `medium` (moderate), or `very thorough` (comprehensive)

**Plan Agent** (use `subagent_type=Plan`):
- Breaking down complex feature implementations
- Designing multi-step refactoring approaches
- Planning architectural changes or migrations

**General-Purpose Agent** (use `subagent_type=general-purpose`):
- Multi-step tasks requiring multiple tool invocations
- Documentation lookups via WebSearch/WebFetch
- Complex searches across many files with multiple rounds

### Example Usage

Before implementing any feature, use agents to understand existing patterns and plan your approach:

```python
# Explore existing implementations
Task(subagent_type="Explore", prompt="medium: Show me how notifications are implemented", description="Explore notifications")

# Plan new features
Task(subagent_type="Plan", prompt="very thorough: Design a remix editor with Canvas API and GIF.js", description="Plan remix editor")

# Look up documentation
Task(subagent_type="general-purpose", prompt="Search Rails 8 Hotwire Turbo Streams documentation and find examples of real-time updates", description="Find Turbo docs")
```

## Technology Stack

**Rails 8 + Hotwire (Turbo + Stimulus) - NO React/Vue**

- **Backend:** Rails 8.0.4, PostgreSQL (UUID primary keys)
- **Frontend:** Hotwire (Turbo + Stimulus), Tailwind CSS 4
- **Auth:** Devise (web sessions) + JWT (API)
- **Jobs:** Sidekiq + Redis
- **Real-time:** ActionCable + Turbo Streams

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

# Generators (always use --primary-key-type=uuid)
bin/rails g model Feature user:references name:string --primary-key-type=uuid
bin/rails g controller Features index show
bin/rails g stimulus feature-name

# Background jobs
bundle exec sidekiq                        # Start Sidekiq
# Dashboard: http://localhost:3000/sidekiq
```

## Architecture

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
├── has_many :likes, :comments, :collections, :hashtags
├── has_one_attached :file (S3)
└── Enum :privacy (public_access, unlisted, private_access)

Notification (polymorphic)
├── recipient, actor, notifiable (all polymorphic)
├── Actions: "like", "comment", "follow", "collection_add"
└── Real-time: ActionCable (NotificationChannel)
```

### Services

- `FeedService` - Personalized/trending feeds
- `NotificationService` - Creates & broadcasts notifications

### Hotwire Patterns

- **Turbo Frames:** In-place updates (GIF cards, profile tabs)
- **Turbo Streams:** Real-time updates (likes, notifications, comments)
- **Stimulus:** JS enhancements (`app/javascript/controllers/`)

### Routes

- **Web:** `/`, `/trending`, `/gifs/:id`, `/users/:username`, `/notifications`
- **API:** `/api/v1/auth/*`, `/api/v1/gifs`, `/api/v1/feed`

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

## Testing

### Running Tests

**IMPORTANT: Never run tests in the background**
- Always wait for test completion before proceeding
- Use synchronous test execution to see results immediately
- Background tests hide failures and make debugging difficult

```bash
bin/rails test                             # All tests (parallel)
PARALLEL_WORKERS=0 bin/rails test         # Sequential (avoid macOS fork issues)
bin/rails test test/models/gif_test.rb    # Specific file
bin/rails test test/models/gif_test.rb -n test_name  # Specific test
bin/rails test test/system/                # Run all system tests
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

# Usage
test "should show gif" do
  sign_in users(:one)
  get gif_path(gifs(:alice_public_gif))
  assert_response :success
end
```

### Test Best Practices

**Fixture Management:**
- Counter cache columns must match actual associations
- Empty fixtures for test isolation (e.g., `follows.yml` is empty to avoid pollution)
- Use relative counts: `assert_equal initial_count + 1, Model.count`

**ActiveStorage in Tests:**
- File attachments can be flaky in parallel tests
- Disable parallelization for ActiveStorage tests: `parallelize(workers: 1)`
- Use `StringIO.new(File.binread(path))` for reliable file uploads
- Make assertions flexible to handle attachment timing issues

**Parallel Testing:**
- Avoid `.last` in parallel tests (use specific queries with `.where().order().first`)
- Use `Notification.find_by(notifiable: obj, action: "action")` instead of `.last`
- Clean up fixtures before creating test data to avoid duplicates

## Environment Variables

```bash
DATABASE_URL=postgresql://localhost/ytgify_development
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET, AWS_S3_REGION
JWT_SECRET_KEY, JWT_REFRESH_SECRET_KEY
REDIS_URL=redis://localhost:6379/0
```

## Key Directories

- `plans/` - Architecture & planning docs
- `app/services/` - Business logic (FeedService, NotificationService)
- `app/javascript/controllers/` - Stimulus controllers
- `app/views/shared/` - Shared partials

## Current Status

Phase 3 Complete: Social platform with Hotwire + ActionCable notifications
**Next:** Remix editor (Canvas API + GIF.js)
