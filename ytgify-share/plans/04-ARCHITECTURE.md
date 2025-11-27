# Technical Architecture

**Related:** [Overview](00-OVERVIEW.md) | [Features](03-FEATURES.md) | [Decisions](02-ARCHITECTURE-DECISIONS.md) | [Roadmap](05-ROADMAP.md)

---

## Table of Contents

- [2.0 Hotwire Documentation & Resources](#20-hotwire-documentation--resources)
- [2.1 Environment & Secrets Management](#21-environment--secrets-management)
- [2.2 Frontend Architecture](#22-frontend-architecture)
- [2.3 Backend Architecture](#23-backend-architecture)
- [2.4 Database](#24-database)
- [2.5 File Storage](#25-file-storage)
- [2.6 Background Jobs & Real-Time Features](#26-background-jobs--real-time-features)
- [2.7 Testing Strategy](#27-testing-strategy)

---

## 2.0 Hotwire Documentation & Resources 📚

**Essential Reading for Hotwire Implementation:**

#### Official Documentation
- **Hotwire Handbook:** https://hotwired.dev/
- **Turbo Reference:** https://turbo.hotwired.dev/reference
- **Stimulus Reference:** https://stimulus.hotwired.dev/reference
- **Rails Turbo Guide:** https://guides.rubyonrails.org/working_with_javascript_in_rails.html#turbo

#### Key Concepts

**Turbo Drive** (SPA-like navigation without full page reloads)
- Docs: https://turbo.hotwired.dev/handbook/drive
- Intercepts link clicks and form submissions
- Uses `fetch()` to load new pages in background
- Swaps `<body>` content without full reload
- Preserves scroll position

**Turbo Frames** (Partial page updates for specific sections)
- Docs: https://turbo.hotwired.dev/handbook/frames
- Scopes navigation to specific part of page
- Example: Tab navigation, modal content, infinite scroll
- Use `turbo_frame_tag` helper in views
- Lazy loading with `loading: :lazy` attribute

```erb
<!-- Example: Tab navigation with Turbo Frames -->
<%= turbo_frame_tag "profile_content" do %>
  <div class="tabs">
    <%= link_to "Posts", profile_posts_path %>
    <%= link_to "Likes", profile_likes_path %>
  </div>
  <%= render @posts %>
<% end %>
```

**Turbo Streams** (Real-time partial page updates via WebSocket or HTTP)
- Docs: https://turbo.hotwired.dev/handbook/streams
- Seven actions: `append`, `prepend`, `replace`, `update`, `remove`, `before`, `after`
- Broadcast changes to multiple users via ActionCable
- Example: New comment appears for all viewers

```ruby
# Example: Broadcast new comment to all viewers
class Comment < ApplicationRecord
  after_create_commit do
    broadcast_prepend_to(
      "gif_#{gif_id}_comments",
      target: "comments_list",
      partial: "comments/comment",
      locals: { comment: self }
    )
  end
end
```

**Stimulus** (Targeted JavaScript for specific interactive components)
- Docs: https://stimulus.hotwired.dev/handbook/introduction
- Modest JavaScript framework
- Connects JS behavior to HTML via `data-controller` attributes
- Perfect for: dropdowns, modals, copy-to-clipboard, drag-and-drop
- Example use cases:
  - GIF remix editor (Canvas manipulation)
  - Infinite scroll (IntersectionObserver)
  - Tag autocomplete (AJAX suggestions)
  - Copy share link (Clipboard API)

```javascript
// Example: Copy to clipboard Stimulus controller
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["source"]

  copy() {
    navigator.clipboard.writeText(this.sourceTarget.value)
    // Show success message
  }
}
```

**ActionCable** (WebSocket for real-time features)
- Docs: https://guides.rubyonrails.org/action_cable_overview.html
- Integrated with Rails 8
- Powers Turbo Streams for real-time updates
- Use for: live notifications, new comments, like counts

#### Tutorials & Examples
- **Hotwire for Rails Developers (eBook):** https://pragprog.com/titles/dhotwire/hotwire-for-rails-developers/
- **GoRails Hotwire Screencasts:** https://gorails.com/series/hotwire-rails
- **Turbo Rails Tutorial:** https://www.hotrails.dev/turbo-rails
- **Stimulus Components Library:** https://www.stimulus-components.com/

#### Common Patterns for ytgify

**Pattern 1: Infinite Scroll Feed**
```erb
<%= turbo_frame_tag "gifs_feed" do %>
  <div data-controller="infinite-scroll">
    <%= render @gifs %>
    <%= turbo_frame_tag "gifs_feed",
        src: gifs_path(page: @next_page),
        loading: :lazy if @next_page %>
  </div>
<% end %>
```

**Pattern 2: Like Button with Live Updates**
```ruby
# Controller
def like
  @like_result = Like.toggle(current_user, @gif)
  respond_to do |format|
    format.turbo_stream # Renders app/views/gifs/like.turbo_stream.erb
  end
end
```

```erb
<!-- app/views/gifs/like.turbo_stream.erb -->
<%= turbo_stream.replace "like_button_#{@gif.id}" do %>
  <%= render "gifs/like_button", gif: @gif %>
<% end %>
<%= turbo_stream.replace "like_count_#{@gif.id}" do %>
  <%= @gif.like_count %> likes
<% end %>
```

**Pattern 3: Real-time Comments**
```ruby
# app/models/comment.rb
class Comment < ApplicationRecord
  after_create_commit do
    broadcast_prepend_to(
      "gif_#{gif_id}_comments",
      target: "comments_list",
      partial: "comments/comment"
    )
  end
end
```

```erb
<!-- app/views/gifs/show.html.erb -->
<%= turbo_stream_from "gif_#{@gif.id}_comments" %>
<div id="comments_list">
  <%= render @gif.comments %>
</div>
```

---

### 2.1 Environment & Secrets Management

#### Doppler Configuration
✅ **Already configured** - All secrets managed via Doppler for secure environment variable management.

**Configured secrets:**
- `AWS_ACCESS_KEY_ID` - AWS access key for S3 authentication
- `AWS_SECRET_ACCESS_KEY` - AWS secret key for S3 authentication
- `AWS_S3_BUCKET` - S3 bucket name for storing GIFs
- `AWS_S3_REGION` - AWS region for the S3 bucket
- `JWT_SECRET_KEY` - Secret for signing JWT access tokens (for extension API)
- `JWT_REFRESH_SECRET_KEY` - Secret for signing JWT refresh tokens (for extension API)

**Integration:**
- Doppler CLI installed and configured in development
- Rails accesses these via standard `ENV['KEY_NAME']` calls
- Production deployment uses Doppler integration or exported environment variables

---

### 2.2 Frontend Architecture

#### Technology Stack
- **Ruby on Rails 8** - Full-stack framework with built-in Hotwire support
- **Hotwire (Turbo + Stimulus)** - Modern reactive UI with minimal JavaScript
  - **Turbo Drive** - SPA-like navigation without full page reloads
  - **Turbo Frames** - Partial page updates (feeds, comments, modals)
  - **Turbo Streams** - Real-time updates via WebSocket (likes, comments, notifications)
  - **Stimulus** - Lightweight JavaScript framework for targeted interactivity
- **Vite Rails** - Fast asset bundling with HMR (for JavaScript libraries like GIF.js)
- **Tailwind CSS** - Utility-first CSS framework for styling
- **ViewComponent** - Component-based architecture for reusable UI (server-rendered)

#### Why Rails 8 + Hotwire?
✅ **SEO-first:** Server-rendered HTML for all pages (critical for GIF discovery)
✅ **Fast initial load:** No large JavaScript bundle download
✅ **Real-time features:** Turbo Streams perfect for social features (likes, comments, notifications)
✅ **Simpler architecture:** No API serialization, no client-side state management
✅ **Progressive enhancement:** Works without JavaScript, better with it
✅ **Mobile-friendly:** Works great on all browsers without heavy client-side code

#### JavaScript Libraries (bundled with Vite Rails)
- **GIF.js** or **gifshot** - Client-side GIF generation for remix editor
- **TomSelect** or **Choices.js** - Enhanced select dropdowns (tag auto-suggest)
- **Flatpickr** - Date pickers for filtering
- **Clipboard.js** or native Clipboard API - Copy to clipboard functionality
- **Intersection Observer API** (native) - Infinite scroll, lazy loading

#### Project Structure
```
app/
  assets/
    stylesheets/
      application.tailwind.css  → Tailwind CSS entry point
  javascript/
    controllers/               → Stimulus controllers
      gif_editor_controller.js
      infinite_scroll_controller.js
      like_button_controller.js
      clipboard_controller.js
      tag_autocomplete_controller.js
    libs/                      → Third-party JS libraries
      gif.js
  views/
    layouts/
      application.html.erb
    gifs/
      index.html.erb
      show.html.erb
      _gif.html.erb            → Partial for GIF card
    components/                → ViewComponents
      gif_card_component.rb
      user_avatar_component.rb
  components/                  → ViewComponent classes
    gif_card_component.rb
    user_avatar_component.rb
```

#### Routing Strategy
**Server-side routing (Rails resourceful routes) + Turbo navigation**

```ruby
# config/routes.rb
Rails.application.routes.draw do
  # Authentication (Devise)
  devise_for :users

  # Web pages (server-rendered)
  root 'home#index'
  get 'explore', to: 'gifs#explore'
  get 'trending', to: 'gifs#trending'
  get 'search', to: 'gifs#search'

  # GIF resources
  resources :gifs do
    member do
      post 'like'
      delete 'unlike'
      post 'view'
    end
    resources :comments
    get 'remixes', to: 'gifs#remixes'
  end

  # User profiles
  get '@:username', to: 'users#show', as: :user_profile
  get '@:username/:slug', to: 'gifs#show_by_username'

  # Collections
  resources :collections do
    post 'add_gif', on: :member
    delete 'remove_gif/:gif_id', on: :member
  end

  # Settings
  get 'settings', to: 'users#settings'
  patch 'settings', to: 'users#update_settings'

  # API endpoints (for extension)
  namespace :api do
    namespace :auth do
      post 'register'
      post 'login'
      post 'logout'
      post 'refresh'
      get 'me'
    end

    resources :gifs, only: [:create, :update, :destroy]
    get 'tags/autocomplete', to: 'tags#autocomplete'
    get 'tags/popular', to: 'tags#popular'
    get 'tags/recent', to: 'tags#recent'
    get 'users/me/preferences', to: 'users#preferences'
    patch 'users/me/preferences', to: 'users#update_preferences'
  end
end
```

#### Responsive Design
- Mobile-first Tailwind CSS classes
- Grid layouts adapt to screen size (`grid-cols-1 md:grid-cols-3 lg:grid-cols-4`)
- Touch-friendly UI (large tap targets, swipe gestures via **Stimulus**)
- Optimized GIF loading on mobile (ActiveStorage variants for smaller files)
- Turbo works great on mobile browsers (no special configuration needed)

---

### 2.3 Backend Architecture

#### Technology Stack
- **Ruby on Rails 8** - Full-stack web framework
- **Devise** - Authentication solution with Warden
- **devise-jwt** - JWT token authentication for extension API
- **Rack CORS** - Handle Cross-Origin Resource Sharing for API requests
- **ActiveStorage** - File upload and storage (S3 integration)
- **ActiveJob** - Background job interface (Sidekiq backend)
- **ActionCable** - WebSocket support (for Turbo Streams)
- **Rack::Attack** - Rate limiting and throttling

#### API Design
**Hybrid approach:**
- **Web app:** Server-rendered HTML (no JSON API needed)
- **Extension:** RESTful JSON API at `/api/*` endpoints

**API Endpoints for Extension:**
```
Auth:
POST   /api/auth/register              → User signup
POST   /api/auth/login                 → User login, returns JWT
POST   /api/auth/logout                → Invalidate refresh token
POST   /api/auth/refresh               → Refresh access token
GET    /api/auth/me                    → Get current user info

GIFs:
POST   /api/gifs                   → Upload new GIF
PATCH  /api/gifs/:id               → Update metadata
DELETE /api/gifs/:id               → Delete GIF

Tags:
GET    /api/tags/autocomplete      → Auto-suggest tags (query param: q)
GET    /api/tags/popular           → Popular/trending tags
GET    /api/tags/recent            → User's recently used tags

User Preferences:
GET    /api/users/me/preferences   → Get preferences
PATCH  /api/users/me/preferences   → Update preferences
```

**Web app uses standard Rails actions (no JSON serialization needed):**
- Controllers render HTML/Turbo Stream responses
- Forms submit via Turbo (either Frame or Stream responses)
- Partials re-rendered server-side and pushed via Turbo Stream

#### Authentication
**Dual authentication strategy:**

1. **Web users:** Session-based auth via Devise
   - HTTP-only cookies
   - CSRF protection
   - Standard Devise helpers (`current_user`, `authenticate_user!`)

2. **Extension users:** JWT tokens via devise-jwt
   - Access token (short-lived, 15 minutes)
   - Refresh token (long-lived, 7 days)
   - Bearer token authentication for API endpoints
   - Stored in extension's chrome.storage

**Shared user model:**
```ruby
# app/models/user.rb
class User < ApplicationRecord
  devise :database_authenticatable, :registerable, :recoverable,
         :rememberable, :validatable, :trackable,
         :jwt_authenticatable, jwt_revocation_strategy: JwtDenylist
end
```

#### File Upload Handling
**ActiveStorage + Direct S3 Uploads**

```ruby
# app/models/gif.rb
class Gif < ApplicationRecord
  has_one_attached :base_gif
  has_one_attached :final_gif
  has_one_attached :thumbnail

  validates :base_gif, content_type: ['image/gif'],
                       size: { less_than: 50.megabytes }
end
```

**Direct uploads from browser/extension:**
- ActiveStorage generates pre-signed S3 URLs
- Client uploads directly to S3 (bypasses Rails server)
- Callback to Rails creates Gif record
- Background job generates thumbnail via ActiveJob

---

### 2.4 Database

#### Technology Stack
- **PostgreSQL** - Relational database with JSON support and full-text search
- **Rails ActiveRecord** - ORM for database interactions
- **pg gem** - PostgreSQL adapter for Ruby
- **PgSearch gem** - Full-text search capabilities

#### Rails Models & Schema

**Users Table:**
```ruby
# db/migrate/..._create_users.rb
create_table :users, id: :uuid do |t|
  t.string :username, null: false, index: { unique: true }
  t.string :email, null: false, index: { unique: true }
  t.string :encrypted_password, null: false

  # Profile
  t.string :display_name
  t.text :bio
  t.string :website
  t.string :twitter_handle
  t.string :youtube_channel
  t.boolean :is_verified, default: false

  # Counter caches
  t.integer :gifs_count, default: 0
  t.integer :total_likes_received, default: 0
  t.integer :follower_count, default: 0
  t.integer :following_count, default: 0

  # Preferences (JSONB)
  t.jsonb :preferences, default: {
    default_privacy: 'public',
    default_upload_behavior: 'show_options',
    recently_used_tags: []
  }

  # Devise
  t.datetime :reset_password_sent_at
  t.datetime :remember_created_at
  t.integer :sign_in_count, default: 0
  t.datetime :current_sign_in_at
  t.datetime :last_sign_in_at
  t.string :current_sign_in_ip
  t.string :last_sign_in_ip

  t.timestamps
end
```

**GIFs Table:**
```ruby
# db/migrate/..._create_gifs.rb
create_table :gifs, id: :uuid do |t|
  t.uuid :user_id, null: false, index: true
  t.string :title
  t.text :description

  # YouTube source
  t.string :youtube_video_url
  t.string :youtube_video_title
  t.string :youtube_channel_name
  t.float :youtube_timestamp_start
  t.float :youtube_timestamp_end

  # GIF properties
  t.float :duration
  t.integer :fps
  t.integer :resolution_width
  t.integer :resolution_height
  t.bigint :file_size

  # Text overlay
  t.boolean :has_text_overlay, default: false
  t.jsonb :text_overlay_data

  # Remix
  t.boolean :is_remix, default: false
  t.uuid :parent_gif_id, index: true
  t.integer :remix_count, default: 0

  # Privacy
  t.integer :privacy, default: 0 # enum: public, unlisted, private

  # Engagement (counter caches)
  t.integer :view_count, default: 0
  t.integer :like_count, default: 0
  t.integer :comment_count, default: 0
  t.integer :share_count, default: 0

  # Soft delete
  t.datetime :deleted_at, index: true

  t.timestamps

  add_foreign_key :gifs, :users
  add_foreign_key :gifs, :gifs, column: :parent_gif_id
  add_index :gifs, [:user_id, :created_at]
  add_index :gifs, :privacy
end
```

**Likes Table:**
```ruby
create_table :likes do |t|
  t.uuid :user_id, null: false
  t.uuid :gif_id, null: false
  t.timestamps

  add_index :likes, [:user_id, :gif_id], unique: true
  add_index :likes, :gif_id
end
```

**Follows Table:**
```ruby
create_table :follows do |t|
  t.uuid :follower_id, null: false
  t.uuid :following_id, null: false
  t.timestamps

  add_index :follows, [:follower_id, :following_id], unique: true
  add_index :follows, :following_id
end
```

**Comments Table:**
```ruby
create_table :comments, id: :uuid do |t|
  t.uuid :gif_id, null: false, index: true
  t.uuid :user_id, null: false
  t.uuid :parent_comment_id, index: true
  t.text :content, null: false
  t.integer :like_count, default: 0
  t.datetime :deleted_at
  t.timestamps
end
```

**Collections Table:**
```ruby
create_table :collections, id: :uuid do |t|
  t.uuid :user_id, null: false, index: true
  t.string :name, null: false
  t.text :description
  t.boolean :is_public, default: false
  t.integer :gifs_count, default: 0
  t.timestamps
end
```

**CollectionGifs Table (join table):**
```ruby
create_table :collection_gifs do |t|
  t.uuid :collection_id, null: false
  t.uuid :gif_id, null: false
  t.datetime :added_at, default: -> { 'CURRENT_TIMESTAMP' }

  add_index :collection_gifs, [:collection_id, :gif_id], unique: true
end
```

**Hashtags Table:**
```ruby
create_table :hashtags do |t|
  t.string :tag, null: false, index: { unique: true }
  t.integer :usage_count, default: 0
  t.timestamps
end
```

**GifHashtags Table (join table):**
```ruby
create_table :gif_hashtags do |t|
  t.uuid :gif_id, null: false
  t.bigint :hashtag_id, null: false

  add_index :gif_hashtags, [:gif_id, :hashtag_id], unique: true
  add_index :gif_hashtags, :hashtag_id
end
```

#### Indexes & Performance
- **User lookups:** `username`, `email` (unique indexes)
- **GIF queries:** Composite index on `(user_id, created_at)`, `privacy`, `is_remix`, `parent_gif_id`
- **Full-text search:** PostgreSQL GIN index on `title`, `description`, `youtube_video_title`
- **Trending:** Composite index on `created_at` + engagement columns
- **Counter caches:** Automatic via ActiveRecord (e.g., `gifs_count` on User, `like_count` on Gif)

---

### 2.5 File Storage

#### Technology Stack
- **AWS S3** - Object storage for GIF files, thumbnails (✅ already configured)
- **AWS CloudFront** - CDN for fast global delivery
- **Rails ActiveStorage** - File attachment framework
  - Seamless S3 integration via `aws-sdk-s3` gem
  - Direct uploads from browser to S3
  - URL helpers and image processing
  - Variants for responsive images

#### Storage Configuration
```ruby
# config/storage.yml
amazon:
  service: S3
  access_key_id: <%= ENV['AWS_ACCESS_KEY_ID'] %>
  secret_access_key: <%= ENV['AWS_SECRET_ACCESS_KEY'] %>
  region: <%= ENV['AWS_S3_REGION'] %>
  bucket: <%= ENV['AWS_S3_BUCKET'] %>

# config/environments/production.rb
config.active_storage.service = :amazon
```

#### Storage Organization
ActiveStorage automatically organizes files by model/attachment:
```
/gifs/
  /:model/:id/:attachment/:blob_id/
    base_gif.gif
    final_gif.gif
    thumbnail.jpg
```

#### CDN & Optimization
- **CloudFront CDN** - Serve GIFs via CDN for fast global delivery
- Cache-Control headers (long cache for immutable GIFs)
- ActiveStorage provides signed URLs for secure access (if needed)
- Lazy loading on web app (intersection observer via **Stimulus**)
- ActiveStorage variants for responsive images:
  ```ruby
  # app/models/gif.rb
  def thumbnail_small
    thumbnail.variant(resize_to_limit: [300, 300])
  end
  ```

---

### 2.6 Background Jobs & Real-Time Features

#### Technology Stack
- **Sidekiq** - Background job processing (uses Redis)
- **Redis** - In-memory data store for Sidekiq queue and caching
- **ActiveJob** - Rails interface for background jobs
- **sidekiq-cron** - Scheduled jobs (for trending score recalculation)
- **ActionCable** - WebSocket support for Turbo Streams

#### Background Jobs (via Sidekiq)
```ruby
# app/jobs/generate_gif_thumbnail_job.rb
class GenerateGifThumbnailJob < ApplicationJob
  queue_as :default

  def perform(gif_id)
    gif = Gif.find(gif_id)
    # Generate thumbnail using image_processing gem
  end
end

# app/jobs/recalculate_trending_scores_job.rb
class RecalculateTrendingScoresJob < ApplicationJob
  queue_as :low_priority

  def perform
    # Calculate trending scores for all recent GIFs
    # Cache results in Redis
  end
end
```

**Scheduled jobs (via sidekiq-cron):**
```ruby
# config/schedule.yml
recalculate_trending:
  cron: "*/15 * * * *" # Every 15 minutes
  class: RecalculateTrendingScoresJob
```

#### Real-Time Features (via Turbo Streams + ActionCable)

**Turbo Streams broadcast for real-time updates:**

```ruby
# app/models/like.rb
class Like < ApplicationRecord
  after_create_commit :broadcast_like
  after_destroy_commit :broadcast_unlike

  private

  def broadcast_like
    broadcast_update_to(
      "gif_#{gif_id}_likes",
      target: "gif_#{gif_id}_like_count",
      partial: "gifs/like_count",
      locals: { gif: gif }
    )
  end
end
```

**Real-time notifications:**
```ruby
# app/models/notification.rb
class Notification < ApplicationRecord
  after_create_commit do
    broadcast_prepend_to(
      "user_#{user_id}_notifications",
      target: "notifications_list",
      partial: "notifications/notification",
      locals: { notification: self }
    )
  end
end
```

---

### 2.7 Testing Strategy

#### Testing Stack
- **Minitest** - Rails default testing framework
  - Model tests (validations, associations, business logic)
  - Controller tests (request specs, Turbo responses)
  - Integration tests (full user flows)
  - System tests (browser-based via Capybara + Selenium)
- **Capybara** - Integration testing with browser simulation
- **Selenium WebDriver** - Browser automation for system tests
- **Playwright** (optional) - Alternative to Selenium for E2E tests

#### Test Organization
```
test/
  models/
    user_test.rb
    gif_test.rb
    like_test.rb
  controllers/
    gifs_controller_test.rb
    api/gifs_controller_test.rb
  integration/
    user_flow_test.rb
  system/
    remix_flow_test.rb
    feed_navigation_test.rb
  fixtures/
    users.yml
    gifs.yml
```

#### Testing Turbo/Stimulus
```ruby
# test/system/like_button_test.rb
class LikeButtonTest < ApplicationSystemTestCase
  test "like button updates count via Turbo Stream" do
    gif = gifs(:one)
    visit gif_path(gif)

    assert_selector "#like_button_#{gif.id}"
    click_button "Like"

    # Wait for Turbo Stream response
    assert_text "1 like"
    assert_selector "#like_button_#{gif.id}.liked"
  end
end
```

---

**Next Steps:**
- Review [02-ARCHITECTURE-DECISIONS.md](02-ARCHITECTURE-DECISIONS.md) for React vs Hotwire decision
- Check [03-FEATURES.md](03-FEATURES.md) for feature requirements
- Use [05-ROADMAP.md](05-ROADMAP.md) for implementation phases
