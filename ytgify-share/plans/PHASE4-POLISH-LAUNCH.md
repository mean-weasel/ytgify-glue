# Phase 4: Polish & Launch Implementation Plan

**Related:** [Roadmap](05-ROADMAP.md) | [Performance & Security](11-PERFORMANCE-SECURITY.md) | [Launch Strategy](08-LAUNCH-STRATEGY.md)

---

## Overview

This plan provides a prioritized, step-by-step approach to launch readiness for ytgify. Tasks are ordered by criticality: Security → Performance → Testing → Mobile → Launch Prep.

**Estimated Timeline:** 3-4 weeks
**Current Status:** Phase 3 Complete (Hotwire + ActionCable notifications)

---

## Priority 1: Security Audit & Hardening (Week 1)

### 1.1 Install & Run Security Audit Tools

**Commands:**
```bash
# Already in Gemfile, verify
bundle list | grep -E "brakeman|bundler-audit"

# Run Brakeman (Rails security scanner)
bundle exec brakeman -A -z --confidence-level 2

# Run bundler-audit (check for vulnerable gems)
bundle exec bundler-audit check --update

# Optional: Add to CI/CD
bundle exec brakeman -o brakeman-report.html
```

**Success Criteria:**
- Zero high/medium confidence vulnerabilities
- All gems up-to-date with no known CVEs
- Report saved for documentation

**Common Rails Vulnerabilities to Check:**
1. **SQL Injection:** ✅ Using ActiveRecord (parameterized queries)
2. **XSS:** Check `html_safe`, `raw`, user-generated content
3. **CSRF:** ✅ Rails defaults enabled
4. **Mass Assignment:** Check strong parameters
5. **Authentication Bypass:** Verify `before_action :authenticate_user!`
6. **File Upload Attacks:** GIF validation needed

---

### 1.2 Implement Rack::Attack Rate Limiting

**File:** `config/initializers/rack_attack.rb`

**Implementation:**
```ruby
# config/initializers/rack_attack.rb
class Rack::Attack
  # Configuration
  Rack::Attack.cache.store = ActiveSupport::Cache::RedisCacheStore.new(url: ENV['REDIS_URL'])

  # 1. Throttle login attempts by email
  throttle('limit logins per email', limit: 5, period: 60.seconds) do |req|
    if req.path == '/users/sign_in' && req.post?
      req.params['user']['email'].to_s.downcase.presence
    end
  end

  # 2. Throttle API auth attempts by IP
  throttle('limit api auth per ip', limit: 5, period: 60.seconds) do |req|
    if req.path.start_with?('/api/v1/auth/') && req.post?
      req.ip
    end
  end

  # 3. Throttle API requests by authenticated user
  throttle('limit api requests per user', limit: 300, period: 5.minutes) do |req|
    if req.path.start_with?('/api/v1/')
      # Extract JWT token and get user_id
      token = req.env['HTTP_AUTHORIZATION']&.split(' ')&.last
      begin
        payload = JWT.decode(token, ENV['JWT_SECRET_KEY'], true, algorithm: 'HS256').first
        payload['sub'] # user_id
      rescue
        nil
      end
    end
  end

  # 4. Throttle unauthenticated API requests by IP
  throttle('limit api requests per ip', limit: 100, period: 5.minutes) do |req|
    req.ip if req.path.start_with?('/api/v1/')
  end

  # 5. Throttle GIF uploads
  throttle('limit gif uploads', limit: 10, period: 1.hour) do |req|
    if req.path == '/gifs' && req.post?
      req.env['warden']&.user&.id
    end
  end

  # 6. Throttle search queries
  throttle('limit search queries', limit: 30, period: 1.minute) do |req|
    if req.path == '/gifs' && req.get? && req.params['q'].present?
      req.ip
    end
  end

  # 7. Block repeated failed logins from same IP
  blocklist('block failed login attempts') do |req|
    Rack::Attack::Allow2Ban.filter(req.ip, maxretry: 10, findtime: 10.minutes, bantime: 1.hour) do
      req.path == '/users/sign_in' && req.post? && req.env['warden'].nil?
    end
  end

  # Response for throttled requests
  self.throttled_responder = lambda do |env|
    retry_after = env['rack.attack.match_data'][:period]
    [
      429,
      {
        'Content-Type' => 'application/json',
        'Retry-After' => retry_after.to_s
      },
      [{ error: 'Rate limit exceeded. Please try again later.' }.to_json]
    ]
  end
end
```

**File:** `config/application.rb` (add middleware)
```ruby
# After line 10 or in config block
config.middleware.use Rack::Attack
```

**Testing Rate Limits:**
```bash
# Test login throttle
for i in {1..6}; do
  curl -X POST http://localhost:3000/users/sign_in \
    -d "user[email]=test@example.com&user[password]=wrong" \
    -c cookies.txt -b cookies.txt
done
# 6th request should return 429

# Test API throttle
for i in {1..101}; do
  curl http://localhost:3000/api/v1/gifs
done
# 101st request should return 429
```

**Success Criteria:**
- Rate limits prevent brute force attacks
- API abuse prevented
- Legitimate users not affected
- 429 responses include Retry-After header

---

### 1.3 Content Security Policy (CSP)

**File:** `config/initializers/content_security_policy.rb`

**Implementation:**
```ruby
# config/initializers/content_security_policy.rb
Rails.application.configure do
  config.content_security_policy do |policy|
    policy.default_src :self, :https
    policy.font_src    :self, :https, :data
    policy.img_src     :self, :https, :data, :blob,
                       'https://*.amazonaws.com' # S3 for GIFs
    policy.object_src  :none
    policy.script_src  :self, :https
    policy.style_src   :self, :https
    # Allow @vite/client for development
    if Rails.env.development?
      policy.script_src :self, :https, :unsafe_eval, :unsafe_inline
      policy.style_src  :self, :https, :unsafe_inline
    end
    
    policy.connect_src :self, :https, 'ws://localhost:3000' # ActionCable
    
    # Allow ActionCable WebSocket
    policy.connect_src :self, :https, 
                       Rails.env.development? ? 'ws://localhost:3000' : 'wss://ytgify.com'
  end

  # Generate nonces for inline scripts
  config.content_security_policy_nonce_generator = ->(request) { SecureRandom.base64(16) }
  
  # Report CSP violations (optional)
  # config.content_security_policy_report_only = true
end
```

**Testing:**
```bash
# Start server and check headers
curl -I http://localhost:3000 | grep -i content-security-policy

# Check browser console for CSP violations
# Visit each page and check for errors
```

**Success Criteria:**
- CSP header present on all pages
- No console errors in browser
- WebSocket connections work
- GIFs load from S3

---

### 1.4 File Upload Security (GIF Validation)

**File:** `app/models/gif.rb` (add validation)

**Implementation:**
```ruby
# app/models/gif.rb - Add after has_one_attached :file
validate :acceptable_file_type
validate :acceptable_file_size

private

def acceptable_file_type
  return unless file.attached?
  
  acceptable_types = ['image/gif']
  unless acceptable_types.include?(file.content_type)
    errors.add(:file, 'must be a GIF')
  end
end

def acceptable_file_size
  return unless file.attached?
  
  max_size = 10.megabytes
  if file.byte_size > max_size
    errors.add(:file, "is too large (max #{max_size / 1.megabyte}MB)")
  end
end
```

**File:** `app/controllers/gifs_controller.rb` (add to create action)

**Additional Security:**
```ruby
# Optional: Scan uploaded files for malware (if budget allows)
# Use ClamAV or cloud service like VirusTotal API

# config/environments/production.rb - Add virus scanning
config.active_storage.analyzers << ActiveStorage::Analyzer::VideoAnalyzer
config.active_storage.previewers << ActiveStorage::Previewer::VideoPreviewer
```

**Testing:**
```bash
# Test file type validation
# Try uploading PNG, JPG (should fail)
# Try uploading GIF (should succeed)

# Test file size validation
# Try uploading 11MB GIF (should fail)
```

**Success Criteria:**
- Only GIF files accepted
- Files under 10MB only
- Error messages user-friendly
- Malicious files rejected

---

### 1.5 CSRF/XSS Verification Checklist

**Manual Review:**

1. **Check all forms have CSRF tokens:**
```bash
# Search for forms without authenticity token
grep -r "form_with\|form_for\|form_tag" app/views/ | \
  grep -v "authenticity_token"
```

2. **Check for dangerous methods:**
```bash
# Find potentially unsafe HTML rendering
grep -r "html_safe\|raw\|sanitize" app/

# Review each occurrence
# Only use html_safe on trusted content (not user input)
```

3. **Verify user input is sanitized:**
```bash
# Check controller strong parameters
grep -r "params.require\|params.permit" app/controllers/
```

**Files to Review:**
- `app/views/gifs/_form.html.erb` - User input for title, description
- `app/views/comments/_form.html.erb` - Comment content
- `app/views/users/show.html.erb` - User bio, display_name
- All API controllers - JSON responses

**Fix Example (if found):**
```erb
<!-- BAD -->
<%= @gif.title.html_safe %>

<!-- GOOD -->
<%= @gif.title %>

<!-- GOOD (if HTML needed) -->
<%= sanitize @gif.description, tags: %w(p br strong em) %>
```

**Success Criteria:**
- All forms have CSRF protection
- No user input rendered with html_safe
- All user content properly escaped
- API endpoints validate input

---

### 1.6 Secure Headers

**File:** `config/initializers/secure_headers.rb` (create new)

```ruby
# config/initializers/secure_headers.rb
SecureHeaders::Configuration.default do |config|
  config.x_frame_options = 'DENY'
  config.x_content_type_options = 'nosniff'
  config.x_xss_protection = '1; mode=block'
  config.x_download_options = 'noopen'
  config.x_permitted_cross_domain_policies = 'none'
  config.referrer_policy = 'strict-origin-when-cross-origin'
  
  # HSTS (HTTPS only)
  config.hsts = "max-age=#{1.year.to_i}; includeSubDomains; preload"
end
```

**Or use Rails 8 defaults:**
```ruby
# config/environments/production.rb
# Already has:
config.force_ssl = true # Enables HSTS
config.assume_ssl = true
```

**Success Criteria:**
- Security headers present in responses
- HSTS enforces HTTPS
- Clickjacking prevented

---

## Priority 2: Performance Optimization (Week 2)

### 2.1 Database Query Analysis (N+1 Detection)

**Install Bullet gem (development only):**

```ruby
# Gemfile - in development group
group :development do
  gem 'bullet'
end
```

```bash
bundle install
```

**Configuration:**
```ruby
# config/environments/development.rb - after Rails.application.configure do
config.after_initialize do
  Bullet.enable = true
  Bullet.alert = true
  Bullet.bullet_logger = true
  Bullet.console = true
  Bullet.rails_logger = true
  Bullet.add_footer = true
end
```

**Run Analysis:**
```bash
# Start server
bin/dev

# Visit all major pages and trigger queries:
# - Home feed (/)
# - Trending (/trending)
# - GIF detail (/gifs/:id)
# - User profile (/users/:username)
# - Collections (/collections)
# - Hashtags (/hashtags/:name)
# - Notifications (/notifications)

# Check logs for N+1 warnings
tail -f log/development.log | grep "N+1"

# Check browser footer for alerts
```

**Common N+1 Fixes Found:**

1. **FeedService - Missing includes:**
```ruby
# app/services/feed_service.rb - Line 11
# BEFORE
following_gifs = Gif.where(user_id: following_ids)
                    .not_deleted
                    .public_only
                    .recent
                    .limit(per_page / 2)

# AFTER
following_gifs = Gif.where(user_id: following_ids)
                    .not_deleted
                    .public_only
                    .recent
                    .includes(:user, :hashtags)
                    .limit(per_page / 2)

# Same fix for trending_gifs (line 17)
```

2. **Notifications - Missing includes:**
```ruby
# app/controllers/notifications_controller.rb
# Check if includes(:actor, :notifiable) is present
@pagy, @notifications = pagy(
  current_user.notifications
              .includes(:actor, notifiable: :user)
              .order(created_at: :desc),
  items: 20
)
```

3. **Comments - Missing user includes:**
```ruby
# app/controllers/gifs_controller.rb - Line 44
# Already has includes(:user) - ✅
@comments = @gif.comments.includes(:user).order(created_at: :desc).limit(20)
```

**Success Criteria:**
- Zero N+1 queries in development logs
- All list views use `includes()` for associations
- Bullet gem shows no warnings

---

### 2.2 Add Missing Database Indexes

**Analysis - Check for missing indexes:**

```bash
# Check current indexes
bin/rails db:schema:dump
grep "index" db/schema.rb

# Analyze slow queries (if production data available)
# Use PostgreSQL pg_stat_statements extension
```

**Recommended Indexes (based on common queries):**

```ruby
# Create migration
bin/rails g migration AddPerformanceIndexes
```

**File:** `db/migrate/XXXXXX_add_performance_indexes.rb`

```ruby
class AddPerformanceIndexes < ActiveRecord::Migration[8.0]
  def change
    # Composite index for trending GIFs query
    # WHERE created_at > ? ORDER BY like_count DESC, view_count DESC
    add_index :gifs, [:created_at, :like_count, :view_count],
              where: "deleted_at IS NULL AND privacy = 0",
              name: 'index_gifs_trending'
    
    # Index for popular GIFs query
    # ORDER BY like_count DESC, view_count DESC
    add_index :gifs, [:like_count, :view_count],
              where: "deleted_at IS NULL AND privacy = 0",
              name: 'index_gifs_popular'
    
    # Index for user's GIFs
    # Already exists: index_gifs_on_user_id_and_created_at ✅
    
    # Index for hashtag usage_count (trending hashtags)
    # Already exists: index_hashtags_on_usage_count ✅
    
    # Index for collection GIFs ordering
    # Already exists: index_collection_gifs_on_collection_id_and_position ✅
    
    # Index for unread notifications
    add_index :notifications, [:recipient_id, :read_at, :created_at],
              where: "read_at IS NULL",
              name: 'index_notifications_unread'
  end
end
```

**Run migration:**
```bash
bin/rails db:migrate
```

**Verify indexes:**
```bash
# Check in PostgreSQL
bin/rails dbconsole
\d+ gifs
\d+ notifications
\q
```

**Success Criteria:**
- All frequent queries have appropriate indexes
- No full table scans on large tables
- Query performance improved (use EXPLAIN ANALYZE)

---

### 2.3 Implement Caching Strategy

**Redis Setup (already configured via Solid Cache):**

```bash
# Verify Redis is running
redis-cli ping
# Should return: PONG

# Check current cache store
grep cache_store config/environments/production.rb
```

**File:** `config/environments/production.rb`

```ruby
# Update cache store to use Redis
config.cache_store = :redis_cache_store, {
  url: ENV.fetch('REDIS_URL', 'redis://localhost:6379/1'),
  namespace: 'ytgify',
  expires_in: 1.hour,
  reconnect_attempts: 3
}
```

**1. Fragment Caching (Russian Doll):**

**File:** `app/views/gifs/_gif_card.html.erb`

```erb
<!-- Wrap GIF card in cache -->
<% cache gif do %>
  <div id="<%= dom_id(gif) %>" class="gif-card">
    <!-- Existing card content -->
    <% cache [gif, 'user'] do %>
      <%= render 'users/avatar', user: gif.user %>
    <% end %>
    
    <% cache [gif, 'hashtags'] do %>
      <%= render 'hashtags/tags', hashtags: gif.hashtags %>
    <% end %>
  </div>
<% end %>
```

**2. Collection/Action Caching:**

**File:** `app/controllers/hashtags_controller.rb`

```ruby
# Cache trending hashtags
def trending
  @trending_hashtags = Rails.cache.fetch('trending_hashtags', expires_in: 15.minutes) do
    Hashtag.trending.limit(20).to_a
  end
end
```

**File:** `app/services/feed_service.rb`

```ruby
# Cache trending feed
def self.trending(page: 1, per_page: 20)
  cache_key = "trending_gifs/page:#{page}"
  
  Rails.cache.fetch(cache_key, expires_in: 5.minutes) do
    Gif.trending
       .not_deleted
       .public_only
       .includes(:user, :hashtags)
       .offset((page - 1) * per_page)
       .limit(per_page)
       .to_a
  end
end
```

**3. Low-Level Caching:**

```ruby
# Cache expensive computations
def expensive_stat
  Rails.cache.fetch("user_#{id}/total_views", expires_in: 1.hour) do
    gifs.sum(:view_count)
  end
end
```

**4. Cache Invalidation:**

```ruby
# app/models/gif.rb - Add callbacks
after_save :clear_cache
after_destroy :clear_cache

private

def clear_cache
  # Invalidate trending cache when GIF changes
  Rails.cache.delete('trending_gifs/page:1')
  
  # Touch associated records to invalidate fragment cache
  user.touch if user
end
```

**Testing Cache:**

```bash
# Check cache keys in Redis
redis-cli keys "ytgify:*"

# Monitor cache hits/misses
redis-cli monitor

# Test performance improvement
# Before caching: Check response time
# After caching: Should be significantly faster
```

**Success Criteria:**
- Trending page loads from cache
- Fragment caching reduces DB queries
- Cache invalidation works correctly
- Redis memory usage monitored

---

### 2.4 ActiveStorage Optimization

**File:** `config/environments/production.rb`

```ruby
# Change from local to S3
config.active_storage.service = :amazon

# Enable image processing optimizations
config.active_storage.variant_processor = :vips # Faster than MiniMagick
```

**File:** `config/storage.yml`

```yaml
amazon:
  service: S3
  access_key_id: <%= ENV['AWS_ACCESS_KEY_ID'] %>
  secret_access_key: <%= ENV['AWS_SECRET_ACCESS_KEY'] %>
  region: <%= ENV['AWS_S3_REGION'] %>
  bucket: <%= ENV['AWS_S3_BUCKET'] %>
  # Enable CloudFront CDN
  public: true
  # Cache control headers
  cache_control: "public, max-age=31536000, immutable"
```

**CloudFront CDN Setup:**

1. Create CloudFront distribution pointing to S3 bucket
2. Update `config/environments/production.rb`:

```ruby
# Use CloudFront URL for assets
config.action_controller.asset_host = 'https://d1234567890.cloudfront.net'
```

**Optimize GIF Variants:**

```ruby
# app/models/gif.rb
has_one_attached :file do |attachable|
  # Optimize variants
  attachable.variant :thumb, resize_to_limit: [200, 200], format: :gif
  attachable.variant :medium, resize_to_limit: [600, 600], format: :gif
  # Add preview variant
  attachable.variant :preview, resize_to_limit: [400, 400], quality: 80
end
```

**Success Criteria:**
- GIFs served from CloudFront CDN
- Fast load times globally
- Cache headers set correctly
- Image processing fast (VIPS)

---

## Priority 3: Test Coverage (Week 2-3)

### 3.1 Analyze Current Coverage

**Install SimpleCov:**

```ruby
# Gemfile - test group
group :test do
  gem 'simplecov', require: false
  gem 'simplecov-html', require: false
end
```

```bash
bundle install
```

**File:** `test/test_helper.rb` (add at top)

```ruby
# test/test_helper.rb
require 'simplecov'
SimpleCov.start 'rails' do
  add_filter '/test/'
  add_filter '/config/'
  add_group 'Controllers', 'app/controllers'
  add_group 'Models', 'app/models'
  add_group 'Services', 'app/services'
  add_group 'Channels', 'app/channels'
end

ENV["RAILS_ENV"] ||= "test"
# ... rest of existing code
```

**Run tests and generate report:**

```bash
# Run all tests
COVERAGE=true bin/rails test

# Open coverage report
open coverage/index.html
```

**Current Coverage Analysis:**

Based on existing test files (~5,114 lines), estimated coverage:
- **Models:** ~90% (good coverage)
- **Controllers:** ~70% (need more edge cases)
- **Services:** ~80% (good coverage)
- **Channels:** ~60% (need more tests)
- **System Tests:** 0% (NOT YET IMPLEMENTED)

**Coverage Gaps to Address:**

1. **Missing Controller Tests:**
   - `RemixesController` - Remix creation edge cases
   - `CollectionsController` - Authorization checks
   - API error responses (4xx, 5xx)

2. **Missing Model Tests:**
   - `Collection` - Position ordering
   - `ViewEvent` - Analytics tracking
   - Edge cases for validations

3. **Missing Integration Tests:**
   - Full user flows (signup → upload → like → comment)
   - Authentication flows
   - Real-time notification delivery

---

### 3.2 Priority System Tests

**Install Capybara & Selenium:**

```ruby
# Gemfile - already included in Rails 8
# group :test do
#   gem 'capybara'
#   gem 'selenium-webdriver'
# end
```

**Create system tests:**

```bash
# Generate system test files
bin/rails g system_test user_authentication
bin/rails g system_test gif_upload
bin/rails g system_test social_features
bin/rails g system_test remix_editor
```

**1. Authentication Flow Test:**

**File:** `test/system/user_authentications_test.rb`

```ruby
require "application_system_test_case"

class UserAuthenticationsTest < ApplicationSystemTestCase
  test "user can sign up, sign in, and sign out" do
    # Sign up
    visit root_path
    click_on "Sign up"
    
    fill_in "Username", with: "testuser"
    fill_in "Email", with: "test@example.com"
    fill_in "Password", with: "password123"
    fill_in "Password confirmation", with: "password123"
    
    click_on "Sign up"
    assert_text "Welcome! You have signed up successfully."
    
    # Sign out
    click_on "testuser" # Profile dropdown
    click_on "Sign out"
    assert_text "Signed out successfully"
    
    # Sign in
    click_on "Sign in"
    fill_in "Email", with: "test@example.com"
    fill_in "Password", with: "password123"
    click_on "Log in"
    
    assert_text "Signed in successfully"
  end
  
  test "invalid login shows error" do
    visit new_user_session_path
    fill_in "Email", with: "wrong@example.com"
    fill_in "Password", with: "wrongpassword"
    click_on "Log in"
    
    assert_text "Invalid Email or password"
  end
end
```

**2. GIF Upload Test:**

**File:** `test/system/gif_uploads_test.rb`

```ruby
require "application_system_test_case"

class GifUploadsTest < ApplicationSystemTestCase
  setup do
    @user = users(:alice)
    sign_in @user
  end
  
  test "user can upload a GIF" do
    visit new_gif_path
    
    fill_in "Title", with: "My Test GIF"
    fill_in "Description", with: "This is a test GIF"
    select "Public", from: "Privacy"
    
    # Attach GIF file
    attach_file "File", Rails.root.join('test', 'fixtures', 'files', 'test.gif')
    
    click_on "Create Gif"
    
    assert_text "GIF uploaded successfully"
    assert_text "My Test GIF"
  end
  
  test "GIF upload validation errors" do
    visit new_gif_path
    
    # Try to submit without file
    click_on "Create Gif"
    
    # Should show error (implementation-dependent)
    assert_selector "form#new_gif"
  end
end
```

**3. Social Features Test:**

**File:** `test/system/social_features_test.rb`

```ruby
require "application_system_test_case"

class SocialFeaturesTest < ApplicationSystemTestCase
  setup do
    @user = users(:alice)
    @other_user = users(:bob)
    @gif = gifs(:alice_public_gif)
    sign_in @user
  end
  
  test "user can like and unlike a GIF" do
    visit gif_path(@gif)
    
    # Like GIF (using Turbo Streams)
    assert_changes -> { @gif.reload.like_count }, from: 0, to: 1 do
      click_on "Like" # Or find button by data attribute
      sleep 0.5 # Wait for Turbo Stream
    end
    
    # Unlike GIF
    assert_changes -> { @gif.reload.like_count }, from: 1, to: 0 do
      click_on "Unlike"
      sleep 0.5
    end
  end
  
  test "user can comment on a GIF" do
    visit gif_path(@gif)
    
    fill_in "Comment", with: "Great GIF!"
    click_on "Post Comment"
    
    # Should see comment appear (via Turbo Stream)
    assert_text "Great GIF!"
  end
  
  test "user can follow another user" do
    visit user_path(@other_user.username)
    
    click_on "Follow"
    sleep 0.5 # Wait for Turbo Stream
    
    assert_text "Following"
    
    # Check follow count updated
    assert_equal 1, @user.reload.following_count
  end
end
```

**4. Remix Editor Test:**

**File:** `test/system/remix_editors_test.rb`

```ruby
require "application_system_test_case"

class RemixEditorsTest < ApplicationSystemTestCase
  setup do
    @user = users(:alice)
    @gif = gifs(:alice_public_gif)
    sign_in @user
  end
  
  test "user can access remix editor", js: true do
    visit gif_path(@gif)
    click_on "Remix"
    
    # Should navigate to remix editor
    assert_current_path remix_gif_path(@gif)
    
    # Check canvas is present
    assert_selector "canvas#remix-canvas"
  end
  
  test "remix editor loads GIF", js: true do
    visit remix_gif_path(@gif)
    
    # Wait for JavaScript to load
    sleep 1
    
    # Check canvas has dimensions
    canvas = find("canvas#remix-canvas")
    assert canvas[:width].to_i > 0
  end
end
```

**Run system tests:**

```bash
# Run all system tests
bin/rails test:system

# Run specific test
bin/rails test:system test/system/user_authentications_test.rb
```

**Success Criteria:**
- All critical user flows tested
- System tests pass consistently
- No flaky tests
- Tests run in CI/CD

---

### 3.3 Integration Test Priorities

**File:** `test/integration/gif_workflow_test.rb`

```ruby
require "test_helper"

class GifWorkflowTest < ActionDispatch::IntegrationTest
  test "complete GIF workflow: upload, like, comment, remix" do
    # Sign up
    post user_registration_path, params: {
      user: {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        password_confirmation: 'password123'
      }
    }
    assert_response :redirect
    follow_redirect!
    
    # Upload GIF
    post gifs_path, params: {
      gif: {
        title: 'My GIF',
        privacy: 'public_access',
        file: fixture_file_upload('test.gif', 'image/gif')
      }
    }
    assert_response :redirect
    gif = Gif.last
    
    # Like GIF
    post like_gif_path(gif)
    assert_response :success # Turbo Stream response
    assert_equal 1, gif.reload.like_count
    
    # Comment on GIF
    post gif_comments_path(gif), params: {
      comment: { content: 'Nice GIF!' }
    }
    assert_response :success
    assert_equal 1, gif.reload.comment_count
    
    # Access remix editor
    get remix_gif_path(gif)
    assert_response :success
  end
end
```

**File:** `test/integration/api_authentication_test.rb`

```ruby
require "test_helper"

class ApiAuthenticationTest < ActionDispatch::IntegrationTest
  test "API authentication flow: register, login, access protected endpoint" do
    # Register
    post api_v1_auth_register_path, params: {
      user: {
        username: 'apiuser',
        email: 'api@example.com',
        password: 'password123'
      }
    }, as: :json
    
    assert_response :created
    json = JSON.parse(response.body)
    assert json['token'].present?
    
    token = json['token']
    
    # Access protected endpoint
    get api_v1_auth_me_path, headers: {
      'Authorization' => "Bearer #{token}"
    }
    
    assert_response :success
    json = JSON.parse(response.body)
    assert_equal 'apiuser', json['username']
  end
  
  test "API rate limiting works" do
    # This requires rack-attack to be configured
    6.times do
      post api_v1_auth_login_path, params: {
        email: 'wrong@example.com',
        password: 'wrong'
      }, as: :json
    end
    
    # 6th request should be rate limited
    assert_response :too_many_requests
  end
end
```

**Success Criteria:**
- 90%+ test coverage
- All critical paths tested
- Integration tests cover multi-step workflows
- API tests cover auth and rate limiting

---

## Priority 4: Mobile Optimization (Week 3)

### 4.1 Responsive Design Checks

**Manual Testing Checklist:**

```bash
# Test on different screen sizes
# Chrome DevTools → Toggle Device Toolbar (Cmd+Shift+M)

# Test breakpoints:
# - Mobile: 375px (iPhone SE)
# - Tablet: 768px (iPad)
# - Desktop: 1024px+

# Pages to test:
# - Home feed
# - GIF detail
# - User profile
# - Upload form
# - Remix editor (critical!)
# - Collections
# - Notifications
```

**Common Issues to Fix:**

1. **Navigation - Mobile menu:**

**File:** `app/views/shared/_navbar.html.erb`

```erb
<!-- Add mobile menu toggle -->
<div class="lg:hidden">
  <button data-action="click->dropdown#toggle" class="mobile-menu-button">
    <!-- Hamburger icon -->
  </button>
</div>
```

2. **GIF Grid - Responsive columns:**

**File:** `app/views/gifs/_gif_grid.html.erb` (or similar)

```erb
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  <%= render gifs %>
</div>
```

3. **Forms - Stack on mobile:**

**File:** `app/views/gifs/_form.html.erb`

```erb
<div class="space-y-4">
  <!-- Each field gets full width on mobile -->
  <div class="flex flex-col sm:flex-row sm:space-x-4">
    <!-- Fields side-by-side on desktop -->
  </div>
</div>
```

**Success Criteria:**
- All pages work on mobile (375px width)
- Touch targets at least 44px
- No horizontal scrolling
- Text readable without zooming

---

### 4.2 Touch Interactions for Remix Editor

**File:** `app/javascript/controllers/remix_editor_controller.js`

```javascript
// Add touch event support
connect() {
  this.canvas = this.element.querySelector('#remix-canvas')
  this.setupTouchEvents()
}

setupTouchEvents() {
  // Prevent default touch behavior (scrolling while drawing)
  this.canvas.addEventListener('touchstart', (e) => {
    e.preventDefault()
    const touch = e.touches[0]
    this.handleDrawStart(touch.clientX, touch.clientY)
  }, { passive: false })
  
  this.canvas.addEventListener('touchmove', (e) => {
    e.preventDefault()
    const touch = e.touches[0]
    this.handleDrawMove(touch.clientX, touch.clientY)
  }, { passive: false })
  
  this.canvas.addEventListener('touchend', (e) => {
    e.preventDefault()
    this.handleDrawEnd()
  })
}

// Unified drawing handlers (work for mouse and touch)
handleDrawStart(x, y) {
  // Drawing logic
}

handleDrawMove(x, y) {
  // Drawing logic
}

handleDrawEnd() {
  // Drawing logic
}
```

**Mobile-specific UI adjustments:**

```javascript
// Larger touch targets on mobile
isMobile() {
  return window.innerWidth < 768
}

setupUI() {
  const buttonSize = this.isMobile() ? 'large' : 'medium'
  // Adjust UI accordingly
}
```

**Success Criteria:**
- Remix editor works on touch devices
- No accidental scrolling while editing
- Touch targets large enough
- Gestures intuitive (pinch to zoom, etc.)

---

### 4.3 Mobile-Specific Issues Testing

**Create mobile test checklist:**

```markdown
## Mobile Testing Checklist

### iOS Safari
- [ ] Home feed loads and scrolls
- [ ] GIF upload works
- [ ] Camera integration works (if applicable)
- [ ] Video plays inline
- [ ] Turbo Streams update correctly
- [ ] Notifications work
- [ ] Remix editor responsive

### Android Chrome
- [ ] Same as iOS Safari
- [ ] File picker works
- [ ] Share functionality works

### Mobile Edge Cases
- [ ] Landscape orientation
- [ ] Slow 3G network
- [ ] Offline mode (if implemented)
- [ ] Large files (slow upload)
```

**Performance on Mobile:**

```javascript
// Reduce GIF quality on mobile to save bandwidth
// app/javascript/controllers/gif_form_controller.js

uploadTarget(e) {
  const file = e.target.files[0]
  
  // Check if mobile
  if (this.isMobile() && file.size > 5 * 1024 * 1024) {
    // Warn user about large file on mobile
    alert('This file is large. Upload may take a while on mobile.')
  }
}
```

**Success Criteria:**
- All features work on iOS Safari
- All features work on Android Chrome
- No layout issues in landscape
- Fast enough on 3G

---

## Priority 5: Launch Prep (Week 4)

### 5.1 Production Environment Setup

**File:** `.env.production` (DO NOT COMMIT - use Rails credentials instead)

```bash
# Generate production credentials
bin/rails credentials:edit --environment production

# Add to credentials:
secret_key_base: <generate with: bin/rails secret>
database:
  host: <RDS endpoint>
  username: <db user>
  password: <db password>
aws:
  access_key_id: <AWS key>
  secret_access_key: <AWS secret>
  bucket: ytgify-production
  region: us-east-1
jwt:
  secret_key: <generate with: bin/rails secret>
  refresh_secret_key: <generate with: bin/rails secret>
redis:
  url: redis://production-redis:6379/0
```

**File:** `config/database.yml` (update production)

```yaml
production:
  <<: *default
  host: <%= Rails.application.credentials.dig(:database, :host) %>
  database: ytgify_production
  username: <%= Rails.application.credentials.dig(:database, :username) %>
  password: <%= Rails.application.credentials.dig(:database, :password) %>
```

**File:** `config/environments/production.rb` (verify settings)

```ruby
# Check these are set:
config.force_ssl = true
config.log_level = :info
config.active_storage.service = :amazon
config.action_mailer.default_url_options = { host: 'ytgify.com', protocol: 'https' }
```

**Deployment Checklist:**

```bash
# 1. Precompile assets
RAILS_ENV=production bin/rails assets:precompile

# 2. Run migrations
RAILS_ENV=production bin/rails db:migrate

# 3. Check for missing environment variables
RAILS_ENV=production bin/rails runner 'puts ENV["DATABASE_URL"]'

# 4. Test production mode locally
RAILS_ENV=production bin/rails server

# 5. Check logs for errors
tail -f log/production.log
```

**Success Criteria:**
- All credentials stored securely
- Production environment boots without errors
- Database connection works
- S3 uploads work
- Redis connection works

---

### 5.2 Monitoring & Logging Setup

**1. Error Tracking (Sentry):**

```ruby
# Gemfile
gem 'sentry-ruby'
gem 'sentry-rails'
```

```bash
bundle install
```

**File:** `config/initializers/sentry.rb`

```ruby
Sentry.init do |config|
  config.dsn = Rails.application.credentials.dig(:sentry, :dsn)
  config.breadcrumbs_logger = [:active_support_logger, :http_logger]
  
  config.traces_sample_rate = 0.1 # 10% of requests
  config.environment = Rails.env
  config.enabled_environments = %w[production staging]
  
  # Filter sensitive data
  config.send_default_pii = false
  config.excluded_exceptions += ['ActionController::RoutingError']
end
```

**2. Performance Monitoring (Scout APM or New Relic):**

```ruby
# Gemfile
gem 'scout_apm'
```

```yaml
# config/scout_apm.yml
production:
  key: <%= Rails.application.credentials.dig(:scout, :key) %>
  name: ytgify
  monitor: true
```

**3. Log Management (LogDNA, Papertrail):**

```ruby
# config/environments/production.rb
config.logger = ActiveSupport::TaggedLogging.new(
  ActiveSupport::Logger.new(STDOUT)
)

# Add custom log tags
config.log_tags = [:request_id, :remote_ip, ->(req) { "user:#{req.cookie_jar[:user_id]}" }]
```

**4. Uptime Monitoring (UptimeRobot, Pingdom):**

```bash
# Configure /up health check
# Already exists at: config/routes.rb
get "up" => "rails/health#show", as: :rails_health_check

# Test it:
curl https://ytgify.com/up
# Should return 200 OK
```

**Success Criteria:**
- Errors reported to Sentry
- Performance metrics tracked
- Logs centralized and searchable
- Uptime monitored 24/7
- Alert notifications configured

---

### 5.3 Deployment Checklist

**Pre-Deployment:**

```markdown
## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing (bin/rails test)
- [ ] System tests passing (bin/rails test:system)
- [ ] No Brakeman security warnings
- [ ] No bundler-audit vulnerabilities
- [ ] No Bullet N+1 warnings
- [ ] SimpleCov coverage > 90%

### Configuration
- [ ] Production credentials set
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Assets precompiled
- [ ] Redis configured
- [ ] S3 bucket configured
- [ ] CloudFront distribution created

### Security
- [ ] HTTPS enforced (force_ssl = true)
- [ ] CSP headers configured
- [ ] Rate limiting enabled
- [ ] File upload validation active
- [ ] Secrets rotated
- [ ] Database backups enabled

### Monitoring
- [ ] Sentry error tracking configured
- [ ] APM (Scout/New Relic) configured
- [ ] Log aggregation configured
- [ ] Uptime monitoring configured
- [ ] Sidekiq dashboard secured

### Performance
- [ ] Database indexes added
- [ ] Caching configured (Redis)
- [ ] CDN configured (CloudFront)
- [ ] Fragment caching implemented
- [ ] N+1 queries eliminated

### Documentation
- [ ] README updated
- [ ] Deployment guide written
- [ ] API documentation current
- [ ] Environment setup guide
- [ ] Troubleshooting guide
```

**Deployment Steps (Kamal - Already in Gemfile):**

```bash
# 1. Initialize Kamal
kamal init

# 2. Configure deployment
# Edit config/deploy.yml

# 3. Deploy to production
kamal deploy

# 4. Check deployment status
kamal app logs

# 5. Run migrations
kamal app exec 'bin/rails db:migrate'

# 6. Verify deployment
curl -I https://ytgify.com
```

**Post-Deployment:**

```bash
# Check production logs
kamal app logs -f

# Check Sidekiq is running
kamal app exec 'bundle exec sidekiqctl status'

# Check database migrations
kamal app exec 'bin/rails db:migrate:status'

# Monitor for errors in Sentry
# Visit Sentry dashboard

# Check performance in APM
# Visit Scout/New Relic dashboard
```

**Success Criteria:**
- Deployment completes without errors
- Application accessible via HTTPS
- All features working in production
- No error spikes in Sentry
- Performance within targets (< 2s page load)

---

### 5.4 Launch Day Operations

**1. Smoke Tests (Production):**

```bash
# Test critical user flows in production
# Use staging environment first!

# 1. User Registration
curl -X POST https://ytgify.com/users \
  -d "user[username]=testuser&user[email]=test@example.com&user[password]=password123"

# 2. User Login
curl -X POST https://ytgify.com/users/sign_in \
  -d "user[email]=test@example.com&user[password]=password123"

# 3. API Authentication
curl -X POST https://ytgify.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 4. Home Feed
curl https://ytgify.com/

# 5. Health Check
curl https://ytgify.com/up
```

**2. Performance Baseline:**

```bash
# Load testing with Apache Bench
ab -n 100 -c 10 https://ytgify.com/

# Or use k6 for more sophisticated tests
k6 run loadtest.js
```

**3. Monitoring Dashboard:**

```markdown
## Launch Day Monitoring

### Metrics to Watch
- [ ] Response times (p50, p95, p99)
- [ ] Error rate (< 0.1%)
- [ ] Database connections
- [ ] Redis memory usage
- [ ] Sidekiq queue length
- [ ] S3 upload success rate
- [ ] CDN hit rate

### Alert Thresholds
- Response time > 2s: WARNING
- Response time > 5s: CRITICAL
- Error rate > 1%: CRITICAL
- Database connections > 80%: WARNING
- Redis memory > 90%: WARNING
- Sidekiq queue > 100: WARNING
```

**4. Rollback Plan:**

```bash
# If issues occur, rollback quickly

# Kamal rollback
kamal rollback

# Or manual rollback
git revert HEAD
git push
kamal deploy
```

**Success Criteria:**
- All smoke tests pass
- No critical errors in first hour
- Performance within targets
- User signups working
- GIF uploads working

---

## Summary & Priority Matrix

### Week 1: Security (Critical)
- ✅ Brakeman & bundler-audit
- ✅ Rack::Attack rate limiting
- ✅ CSP headers
- ✅ File upload validation
- ✅ CSRF/XSS audit

### Week 2: Performance (High Priority)
- ✅ N+1 query elimination (Bullet gem)
- ✅ Database indexes
- ✅ Redis caching
- ✅ ActiveStorage optimization

### Week 2-3: Testing (High Priority)
- ✅ SimpleCov coverage analysis
- ✅ System tests (auth, upload, social, remix)
- ✅ Integration tests
- ✅ Achieve 90%+ coverage

### Week 3: Mobile (Medium Priority)
- ✅ Responsive design checks
- ✅ Touch interactions for remix editor
- ✅ Mobile-specific testing

### Week 4: Launch Prep (Critical)
- ✅ Production environment setup
- ✅ Monitoring & logging (Sentry, APM)
- ✅ Deployment checklist
- ✅ Launch day operations

---

## Quick Reference Commands

```bash
# Security
bundle exec brakeman -A -z --confidence-level 2
bundle exec bundler-audit check --update

# Performance
COVERAGE=true bin/rails test
open coverage/index.html

# Testing
bin/rails test
bin/rails test:system
bin/rails test test/models/gif_test.rb

# Deployment
kamal deploy
kamal app logs -f
kamal rollback

# Database
bin/rails db:migrate
bin/rails db:migrate:status

# Cache
redis-cli keys "ytgify:*"
redis-cli flushall
```

---

## Success Metrics

**Launch Readiness Criteria:**
- ✅ Zero high-severity security vulnerabilities
- ✅ 90%+ test coverage
- ✅ < 2s page load time (p95)
- ✅ < 200ms API response time (p95)
- ✅ Rate limiting prevents abuse
- ✅ Mobile-responsive on all pages
- ✅ Production environment stable
- ✅ Monitoring & alerts configured

**Post-Launch (First Week):**
- Error rate < 0.1%
- Uptime > 99.9%
- No security incidents
- User signups working
- GIF uploads working
- All critical features functional

---

**Next Steps:** Start with Priority 1 (Security) and work through each section systematically. Use the checklist format to track progress.
