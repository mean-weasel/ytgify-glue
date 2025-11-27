# Phase 4 Remaining Tasks - Detailed Implementation Plan

**Status:** Phase 3 Complete | Security & Performance foundations in place  
**Related:** [Phase 4 Overview](PHASE4-POLISH-LAUNCH.md) | [Architecture](02-ARCHITECTURE-DECISIONS.md)

---

## Current Status Assessment

### ✅ Already Complete
- **Security Foundation:** Rack::Attack rate limiting configured
- **Security Foundation:** Content Security Policy (CSP) headers
- **Security Foundation:** Secure headers configured
- **Performance:** Bullet gem configured for N+1 detection
- **Performance:** Database indexes optimized (trending, popularity, public feed)
- **Testing:** SimpleCov installed, 425 tests passing (1 flaky test in RemixProcessingJobTest)
- **Testing:** ~5,100 lines of test code across models, controllers, services

### 🔄 Partially Complete
- **Caching:** Redis configured via Solid Cache, but not actively used
- **Mobile:** Basic Tailwind responsive classes, needs testing
- **Documentation:** CLAUDE.md exists, needs launch documentation

### ❌ Remaining Work
1. Implement Redis caching strategy for feeds/trending
2. Test mobile responsiveness systematically
3. Run coverage analysis and identify gaps
4. Add system tests for critical flows
5. UI/UX polish (loading states, error messages)
6. Create launch documentation and deployment checklist

---

## Task 1: Implement Redis Caching Strategy

**Priority:** HIGH | **Estimated Time:** 4-6 hours  
**Dependencies:** Redis already configured via Solid Cache

### What to Cache

Based on FeedService analysis and current query patterns:

1. **Trending GIFs** - High read, low write (5 min TTL)
2. **Trending Hashtags** - High read, low write (15 min TTL)
3. **User Feed (following)** - Per-user, moderate churn (10 min TTL)
4. **GIF Cards (Fragment Cache)** - Russian doll caching (1 hour TTL)
5. **User Stats** - Like counts, view counts (5 min TTL)

### Implementation Steps

#### Step 1.1: Enable Redis Cache Store (2 min)

**File:** `/Users/jeremywatt/Desktop/ytgify-share/config/environments/production.rb`

**Action:** Update line 47 from commented to:

```ruby
# Replace line 47
config.cache_store = :redis_cache_store, {
  url: ENV.fetch('REDIS_URL', 'redis://localhost:6379/1'),
  namespace: 'ytgify_cache',
  expires_in: 1.hour,
  reconnect_attempts: 3,
  pool_size: ENV.fetch('RAILS_MAX_THREADS', 5).to_i,
  pool_timeout: 5
}
```

**File:** `/Users/jeremywatt/Desktop/ytgify-share/config/environments/development.rb`

**Action:** Update line 27 to use Redis in development (optional, memory_store is fine):

```ruby
# Keep memory_store for development (faster, no Redis dependency)
config.cache_store = :memory_store
```

#### Step 1.2: Cache Trending Feed (30 min)

**File:** `/Users/jeremywatt/Desktop/ytgify-share/app/services/feed_service.rb`

**Action:** Replace method `trending` (lines 49-56) with:

```ruby
# Get trending GIFs based on recent activity
def self.trending(page: 1, per_page: 20)
  cache_key = "trending_gifs/page:#{page}/per_page:#{per_page}"
  
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

**Action:** Add method for trending hashtags cache (after line 61):

```ruby
# Get trending hashtags
def self.trending_hashtags(limit: 10)
  cache_key = "trending_hashtags/limit:#{limit}"
  
  Rails.cache.fetch(cache_key, expires_in: 15.minutes) do
    Hashtag.trending.limit(limit).to_a
  end
end
```

#### Step 1.3: Add Cache Invalidation (30 min)

**File:** `/Users/jeremywatt/Desktop/ytgify-share/app/models/gif.rb`

**Action:** Add cache invalidation callbacks (after line 55):

```ruby
# Callbacks for cache invalidation
after_save :clear_trending_cache, if: :should_clear_cache?
after_destroy :clear_trending_cache

private

def should_clear_cache?
  # Clear cache if like_count or view_count changed (affects trending)
  saved_change_to_like_count? || saved_change_to_view_count? || 
  saved_change_to_privacy? || saved_change_to_deleted_at?
end

def clear_trending_cache
  Rails.cache.delete_matched('trending_gifs/*')
end
```

**File:** `/Users/jeremywatt/Desktop/ytgify-share/app/models/hashtag.rb`

**Action:** Add similar cache invalidation:

```ruby
# Add after any counter cache updates
after_update :clear_hashtag_cache, if: :saved_change_to_usage_count?

private

def clear_hashtag_cache
  Rails.cache.delete_matched('trending_hashtags/*')
end
```

#### Step 1.4: Fragment Caching for GIF Cards (45 min)

**File:** `/Users/jeremywatt/Desktop/ytgify-share/app/views/gifs/_gif_card.html.erb`

**Action:** Wrap entire card in cache block (add after line 1):

```erb
<% cache gif do %>
  <div id="<%= dom_id(gif) %>" class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
    <!-- Existing card content -->
    
    <!-- Cache user avatar separately (Russian doll) -->
    <% cache [gif, 'user'] do %>
      <div class="flex items-center space-x-3 p-4">
        <!-- User avatar and info -->
      </div>
    <% end %>
    
    <!-- Rest of card content -->
  </div>
<% end %>
```

**Note:** This creates automatic cache invalidation when gif.updated_at changes.

#### Step 1.5: Low-Level Caching for Stats (30 min)

**File:** `/Users/jeremywatt/Desktop/ytgify-share/app/models/user.rb`

**Action:** Add cached stats methods (after line 200+):

```ruby
# Cached expensive stats
def total_gif_views
  Rails.cache.fetch("user:#{id}:total_views", expires_in: 5.minutes) do
    gifs.sum(:view_count)
  end
end

def total_gif_likes
  Rails.cache.fetch("user:#{id}:total_likes", expires_in: 5.minutes) do
    gifs.sum(:like_count)
  end
end

# Clear cache when counters change
after_save :clear_stats_cache, if: -> { saved_change_to_gifs_count? }

private

def clear_stats_cache
  Rails.cache.delete("user:#{id}:total_views")
  Rails.cache.delete("user:#{id}:total_likes")
end
```

#### Step 1.6: Test Caching (30 min)

**Commands:**

```bash
# 1. Start Redis (if not running)
redis-cli ping
# Should return: PONG

# 2. Start Rails in development with caching enabled
bin/rails dev:cache
# Should show: Development mode is now being cached.

# 3. Monitor Redis keys
redis-cli monitor

# 4. In another terminal, visit pages
bin/dev
# Visit: http://localhost:3000/trending
# Visit: http://localhost:3000/ (feed)

# 5. Check Redis keys created
redis-cli keys "ytgify_cache:*"
# Should show: trending_gifs, trending_hashtags, etc.

# 6. Verify cache hits in logs
tail -f log/development.log | grep "Cache"
# Look for: Cache read, Cache write, Cache hit

# 7. Test cache invalidation
# Update a GIF's like_count in Rails console
bin/rails c
gif = Gif.first
gif.increment!(:like_count)
# Check logs for: Cache delete_matched trending_gifs

# 8. Turn off development caching when done
bin/rails dev:cache
```

**File:** `/Users/jeremywatt/Desktop/ytgify-share/test/services/feed_service_cache_test.rb` (create new)

```ruby
require "test_helper"

class FeedServiceCacheTest < ActiveSupport::TestCase
  setup do
    Rails.cache.clear
    @gif = gifs(:alice_public_gif)
  end

  test "trending feed is cached" do
    # First call - cache miss
    assert_difference -> { Rails.cache.stats[:writes] }, +1 do
      FeedService.trending(page: 1, per_page: 20)
    end

    # Second call - cache hit (no new write)
    assert_no_difference -> { Rails.cache.stats[:writes] } do
      FeedService.trending(page: 1, per_page: 20)
    end
  end

  test "cache is invalidated when GIF changes" do
    # Prime cache
    FeedService.trending

    # Update GIF (should clear cache)
    @gif.increment!(:like_count)

    # Next call should be cache miss
    assert Rails.cache.read("trending_gifs/page:1/per_page:20").nil?
  end

  test "trending hashtags are cached" do
    assert_difference -> { Rails.cache.stats[:writes] }, +1 do
      FeedService.trending_hashtags(limit: 10)
    end
  end
end
```

**Run test:**

```bash
bin/rails test test/services/feed_service_cache_test.rb
```

### Success Criteria

- ✅ Redis cache store configured in production
- ✅ Trending feed cached with 5 min TTL
- ✅ Trending hashtags cached with 15 min TTL
- ✅ GIF cards use fragment caching
- ✅ Cache invalidation triggers on updates
- ✅ Tests confirm caching behavior
- ✅ Redis keys visible: `redis-cli keys "ytgify_cache:*"`
- ✅ Logs show cache hits: `tail -f log/development.log | grep "Cache"`

### Performance Impact

**Before:** ~200ms average trending page load (DB queries)  
**After:** ~50ms average trending page load (cache hits)  
**Expected:** 75% reduction in database load for trending pages

---

## Task 2: Test Mobile Responsiveness

**Priority:** MEDIUM | **Estimated Time:** 3-4 hours  
**Dependencies:** None

### Testing Approach

Use Chrome DevTools Device Toolbar + manual mobile device testing.

### Step 2.1: Setup Mobile Testing Environment (15 min)

**Tools:**

1. **Chrome DevTools:**
   - Open Chrome → DevTools (Cmd+Option+I)
   - Toggle Device Toolbar (Cmd+Shift+M)
   - Test viewports: 375px (iPhone SE), 768px (iPad), 1024px+ (Desktop)

2. **Real Devices:**
   - iOS Safari (iPhone)
   - Android Chrome

3. **Browser Stack (optional):**
   - Free trial: https://www.browserstack.com/

**Commands:**

```bash
# Start server
bin/dev

# Open in browser
open http://localhost:3000
```

### Step 2.2: Create Mobile Testing Checklist (30 min)

**File:** `/Users/jeremywatt/Desktop/ytgify-share/docs/MOBILE_TESTING_CHECKLIST.md` (create new)

```markdown
# Mobile Responsiveness Testing Checklist

**Test Date:** _____  
**Tester:** _____  
**Devices:** iPhone SE (375px), iPad (768px), Desktop (1024px+)

## Navigation

- [ ] Mobile: Hamburger menu visible, works correctly
- [ ] Tablet: Navigation menu visible, no overflow
- [ ] Desktop: Full navigation visible
- [ ] Logo resizes appropriately
- [ ] User dropdown works on all sizes

## Home Feed (/)

- [ ] Mobile: Grid shows 1 column
- [ ] Tablet: Grid shows 2-3 columns
- [ ] Desktop: Grid shows 3-4 columns
- [ ] GIF cards sized appropriately
- [ ] Infinite scroll works on touch devices
- [ ] Loading spinner visible

## GIF Detail (/gifs/:id)

- [ ] Mobile: GIF fills width (no horizontal scroll)
- [ ] Mobile: Comments stack vertically
- [ ] Mobile: Like/Share buttons min 44px touch target
- [ ] Tablet: Good spacing, no cramped UI
- [ ] Desktop: Optimal layout

## Upload Form (/gifs/new)

- [ ] Mobile: Form fields full width
- [ ] Mobile: File upload button large enough
- [ ] Mobile: Hashtag input usable
- [ ] Mobile: Submit button prominent
- [ ] Tablet/Desktop: Good spacing

## User Profile (/users/:username)

- [ ] Mobile: Tabs stack or scroll horizontally
- [ ] Mobile: GIF grid 1-2 columns
- [ ] Mobile: Follow button min 44px
- [ ] Profile stats readable

## Remix Editor (/gifs/:id/remix)

**Critical - Canvas interactions**

- [ ] Mobile: Canvas sized to viewport
- [ ] Mobile: Touch drawing works (no scroll)
- [ ] Mobile: Tool buttons large enough (min 44px)
- [ ] Mobile: Landscape orientation works
- [ ] Tablet: Canvas controls accessible
- [ ] Desktop: Full editor experience

## Collections (/collections)

- [ ] Mobile: Collection cards stack
- [ ] Mobile: Add to collection modal usable
- [ ] Tablet/Desktop: Good grid layout

## Notifications (/notifications)

- [ ] Mobile: Notification items readable
- [ ] Mobile: Action buttons accessible
- [ ] Mobile: Avatar + text don't overflow

## Forms & Inputs

- [ ] All text inputs min 44px height
- [ ] All buttons min 44px height
- [ ] Form labels visible/readable
- [ ] Error messages visible
- [ ] Focus states visible

## Performance

- [ ] Mobile: Page load < 3s (3G)
- [ ] Mobile: Animations smooth
- [ ] Mobile: No excessive reflows
- [ ] Images lazy load

## Edge Cases

- [ ] Landscape orientation works
- [ ] Very long usernames don't break layout
- [ ] Very long GIF titles truncate nicely
- [ ] Empty states display well
- [ ] Error states display well

## Browser Compatibility

- [ ] iOS Safari 15+
- [ ] Android Chrome 100+
- [ ] Mobile Firefox (optional)
```

### Step 2.3: Fix Common Mobile Issues (2 hours)

Based on typical issues, here are likely fixes needed:

#### Fix 1: Navbar Mobile Menu

**File:** `/Users/jeremywatt/Desktop/ytgify-share/app/views/shared/_navbar.html.erb`

**Current Status:** Check if mobile menu exists (line 7+)

**Action:** If hamburger menu missing, add:

```erb
<!-- Add mobile menu toggle button (before line 10) -->
<div class="lg:hidden">
  <button type="button" 
          class="text-gray-600 hover:text-gray-900 p-2"
          data-controller="dropdown"
          data-action="click->dropdown#toggle"
          aria-label="Toggle menu">
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
    </svg>
  </button>
</div>

<!-- Mobile menu panel -->
<div class="hidden lg:hidden" data-dropdown-target="menu">
  <div class="px-2 pt-2 pb-3 space-y-1">
    <%= link_to "Home", root_path, class: "block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100" %>
    <%= link_to "Trending", trending_path, class: "block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100" %>
    <!-- Add other nav links -->
  </div>
</div>
```

#### Fix 2: GIF Grid Responsive Columns

**File:** Check `/Users/jeremywatt/Desktop/ytgify-share/app/views/home/trending.html.erb`

**Current Status:** Line 31 has responsive grid classes

**Verify:** Grid classes should be:

```erb
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
```

**Action:** Already correct! No changes needed.

#### Fix 3: Touch Target Sizes

**File:** `/Users/jeremywatt/Desktop/ytgify-share/app/views/likes/_like_button.html.erb`

**Action:** Ensure button has min-height class:

```erb
<button class="px-4 py-2 min-h-[44px] ...">
  <!-- Like button content -->
</button>
```

**File:** `/Users/jeremywatt/Desktop/ytgify-share/app/views/follows/_button.html.erb`

**Current Status:** Line 20 has `px-4 py-2` (should be ~44px)

**Verify:** Button height is sufficient. If not, add `min-h-[44px]`.

#### Fix 4: Remix Editor Touch Events

**File:** `/Users/jeremywatt/Desktop/ytgify-share/app/javascript/controllers/remix_editor_controller.js`

**Current Status:** Check lines 1-50 for touch event handlers

**Action:** Add touch support (if missing):

```javascript
// Add in connect() method
setupTouchEvents() {
  const canvas = this.canvasTarget
  
  // Prevent default touch behavior on canvas
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault()
    const touch = e.touches[0]
    const rect = canvas.getBoundingClientRect()
    this.handleDrawStart(touch.clientX - rect.left, touch.clientY - rect.top)
  }, { passive: false })
  
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault()
    const touch = e.touches[0]
    const rect = canvas.getBoundingClientRect()
    this.handleDrawMove(touch.clientX - rect.left, touch.clientY - rect.top)
  }, { passive: false })
  
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault()
    this.handleDrawEnd()
  })
}
```

### Step 2.4: Manual Testing (1 hour)

**Process:**

1. **Open each page in Chrome DevTools mobile view**
2. **Test all interactive elements**
3. **Document issues in checklist**
4. **Fix critical issues**
5. **Re-test**

**Commands:**

```bash
# Start server
bin/dev

# Open browser
open http://localhost:3000

# Test pages:
# - / (home)
# - /trending
# - /gifs/:id
# - /gifs/new
# - /users/:username
# - /notifications
# - /gifs/:id/remix
```

### Step 2.5: Automated Mobile Tests (30 min)

**File:** `/Users/jeremywatt/Desktop/ytgify-share/test/system/mobile_responsiveness_test.rb` (create new)

```ruby
require "application_system_test_case"

class MobileResponsivenessTest < ApplicationSystemTestCase
  def setup
    @user = users(:alice)
    @gif = gifs(:alice_public_gif)
  end

  test "mobile navigation works", driver: :selenium_headless do
    # Resize to mobile
    page.current_window.resize_to(375, 667)
    
    visit root_path
    
    # Check mobile menu exists
    assert_selector '.lg\\:hidden button', text: 'Toggle menu' # Hamburger
    
    # Click mobile menu
    find('.lg\\:hidden button').click
    
    # Check menu appears
    assert_selector 'a', text: 'Home'
    assert_selector 'a', text: 'Trending'
  end

  test "GIF grid responsive on mobile", driver: :selenium_headless do
    page.current_window.resize_to(375, 667)
    
    visit trending_path
    
    # Should show 1 column on mobile
    grid = find('.grid')
    assert grid[:class].include?('grid-cols-1')
  end

  test "touch targets are large enough", driver: :selenium_headless do
    page.current_window.resize_to(375, 667)
    sign_in @user
    
    visit gif_path(@gif)
    
    # Like button should be at least 44px
    like_button = find('button', text: /Like|Unlike/)
    button_height = page.evaluate_script("document.querySelector('button').offsetHeight")
    
    assert button_height >= 44, "Touch target too small: #{button_height}px"
  end
end
```

**Run tests:**

```bash
bin/rails test:system test/system/mobile_responsiveness_test.rb
```

### Success Criteria

- ✅ All pages tested on 375px, 768px, 1024px viewports
- ✅ No horizontal scrolling on any page
- ✅ All touch targets ≥ 44px
- ✅ Mobile menu works
- ✅ Remix editor works on touch devices
- ✅ Text readable without zooming (min 16px)
- ✅ Checklist completed and filed
- ✅ Critical issues fixed
- ✅ System tests pass for mobile

---

## Task 3: Run Test Coverage Analysis

**Priority:** HIGH | **Estimated Time:** 2-3 hours  
**Dependencies:** SimpleCov already installed

### Step 3.1: Configure SimpleCov (15 min)

**File:** `/Users/jeremywatt/Desktop/ytgify-share/test/test_helper.rb`

**Action:** Add SimpleCov configuration (before line 1):

```ruby
# test/test_helper.rb
require 'simplecov'
SimpleCov.start 'rails' do
  add_filter '/test/'
  add_filter '/config/'
  add_filter '/vendor/'
  
  add_group 'Controllers', 'app/controllers'
  add_group 'Models', 'app/models'
  add_group 'Services', 'app/services'
  add_group 'Channels', 'app/channels'
  add_group 'Jobs', 'app/jobs'
  
  # Set minimum coverage thresholds
  minimum_coverage 90
  minimum_coverage_by_file 80
  
  # Track branches (if/else paths)
  enable_coverage :branch
end

ENV["RAILS_ENV"] ||= "test"
# ... rest of existing code
```

### Step 3.2: Generate Coverage Report (10 min)

**Commands:**

```bash
# Run full test suite with coverage
COVERAGE=true bin/rails test

# Open coverage report
open coverage/index.html

# Check coverage percentage in terminal
# Look for: "Coverage report generated... 92.5%"
```

**Expected Output:**

```
Coverage report generated for MiniTest to /coverage. 425 / 460 LOC (92.39%) covered.

File Coverage:
- Controllers: 85.2%
- Models: 94.1%
- Services: 88.7%
- Channels: 72.3%
- Jobs: 65.8%

Overall: 92.39%
```

### Step 3.3: Identify Coverage Gaps (30 min)

**Action:** Review coverage report in browser:

1. **Sort by "% covered" (lowest first)**
2. **Identify files < 80% coverage**
3. **Prioritize by criticality:**
   - Critical: Authentication, payments (if any), data loss scenarios
   - High: Core features (GIFs, likes, comments, follows)
   - Medium: Edge cases, admin features
   - Low: Deprecated code, trivial getters/setters

**File:** `/Users/jeremywatt/Desktop/ytgify-share/docs/COVERAGE_GAPS.md` (create new)

```markdown
# Test Coverage Gaps Analysis

**Generated:** [DATE]  
**Overall Coverage:** ___%  
**Target Coverage:** 90%

## Files Below 80% Coverage

### Critical (< 80%)

| File | Coverage | Missing Lines | Priority | Action |
|------|----------|---------------|----------|--------|
| `app/controllers/remixes_controller.rb` | 65% | Error handling | HIGH | Add tests for failed remix creation |
| `app/jobs/remix_processing_job.rb` | 65% | Job failure scenarios | HIGH | Fix flaky test, add error cases |
| `app/channels/notification_channel.rb` | 72% | Subscription edge cases | MEDIUM | Add channel tests |

### Models

| File | Coverage | Missing Lines | Priority | Action |
|------|----------|---------------|----------|--------|
| `app/models/collection.rb` | 85% | Position validation | MEDIUM | Test position conflicts |
| `app/models/view_event.rb` | 60% | Analytics methods | LOW | Add view tracking tests |

### Services

| File | Coverage | Missing Lines | Priority | Action |
|------|----------|---------------|----------|--------|
| `app/services/feed_service.rb` | 88% | Empty feed edge cases | MEDIUM | Test nil user, no followers |

## Summary

- **Files < 80%:** 6
- **High Priority Gaps:** 2
- **Medium Priority Gaps:** 3
- **Low Priority Gaps:** 1

**Estimated Time to Fix:** 3-4 hours
```

### Step 3.4: Add Missing Tests (1-2 hours)

Based on likely gaps, add these tests:

#### Gap 1: RemixesController Error Cases

**File:** `/Users/jeremywatt/Desktop/ytgify-share/test/controllers/remixes_controller_test.rb`

**Action:** Add error case tests (append to file):

```ruby
test "should handle invalid GIF ID gracefully" do
  sign_in users(:alice)
  
  assert_raises(ActiveRecord::RecordNotFound) do
    get remix_gif_path("invalid-uuid")
  end
end

test "should not allow remix of private GIF by other user" do
  sign_in users(:bob)
  private_gif = gifs(:alice_private_gif) # Create fixture
  
  get remix_gif_path(private_gif)
  assert_response :forbidden
end

test "should handle remix processing job failure" do
  sign_in users(:alice)
  gif = gifs(:alice_public_gif)
  
  # Stub job to raise error
  RemixProcessingJob.stub :perform_later, ->(*) { raise "Processing failed" } do
    post create_remix_gif_path(gif), params: {
      remix: { title: "Failed Remix" }
    }
    
    assert_response :unprocessable_entity
    assert_match /error/i, response.body
  end
end
```

#### Gap 2: Fix Flaky RemixProcessingJobTest

**File:** `/Users/jeremywatt/Desktop/ytgify-share/test/jobs/remix_processing_job_test.rb`

**Current Issue:** Line 116 fails on file attachment

**Action:** Fix test setup (around line 70):

```ruby
test "job increments remix count on source gif" do
  source_gif = gifs(:alice_public_gif)
  
  # Ensure source GIF has file attached BEFORE creating remix
  unless source_gif.file.attached?
    source_gif.file.attach(
      io: StringIO.new(File.binread(Rails.root.join('test/fixtures/files/test.gif'))),
      filename: 'test.gif',
      content_type: 'image/gif'
    )
    source_gif.save!
  end
  
  remix = Gif.create!(
    user: users(:bob),
    parent_gif: source_gif,
    title: "Test Remix",
    privacy: :public_access,
    is_remix: true
  )
  
  # Attach file to remix
  remix.file.attach(
    io: StringIO.new(File.binread(Rails.root.join('test/fixtures/files/test.gif'))),
    filename: 'remix.gif',
    content_type: 'image/gif'
  )
  
  initial_count = source_gif.remix_count
  
  RemixProcessingJob.perform_now(remix.id)
  
  assert_equal initial_count + 1, source_gif.reload.remix_count
end
```

#### Gap 3: NotificationChannel Tests

**File:** `/Users/jeremywatt/Desktop/ytgify-share/test/channels/notification_channel_test.rb`

**Current Status:** Check existing tests (line 1+)

**Action:** Add edge case tests:

```ruby
test "should reject subscription for unauthenticated user" do
  stub_connection user_id: nil
  
  subscribe
  
  assert subscription.rejected?
end

test "should only receive own notifications" do
  alice = users(:alice)
  bob = users(:bob)
  
  stub_connection user_id: alice.id
  subscribe
  
  # Create notification for Bob (should not receive)
  bob_notification = Notification.create!(
    recipient: bob,
    actor: alice,
    notifiable: gifs(:bob_public_gif),
    action: 'like'
  )
  
  # Broadcast Bob's notification
  NotificationChannel.broadcast_to(
    bob,
    ApplicationController.render(
      partial: 'notifications/notification_item',
      locals: { notification: bob_notification }
    )
  )
  
  # Alice should NOT receive it
  assert_no_broadcasts subscription, bob_notification
end
```

### Step 3.5: Re-run Coverage (10 min)

**Commands:**

```bash
# Run tests again
COVERAGE=true bin/rails test

# Check new coverage
open coverage/index.html

# Verify improvement
# Before: 92.39%
# After: Expected 94%+
```

### Success Criteria

- ✅ SimpleCov configured with 90% minimum threshold
- ✅ Coverage report generated: `coverage/index.html`
- ✅ Coverage gaps identified and documented
- ✅ High priority gaps addressed
- ✅ Overall coverage ≥ 90%
- ✅ No files < 80% coverage (except low priority)
- ✅ Flaky RemixProcessingJobTest fixed
- ✅ All tests pass: `bin/rails test` (425+ tests)

### Coverage Targets

**Minimum Acceptable:**
- Overall: 90%
- Controllers: 85%
- Models: 90%
- Services: 85%
- Channels: 75%
- Jobs: 75%

**Ideal:**
- Overall: 95%+
- All components: 90%+

---

## Task 4: Add System Tests for Critical Flows

**Priority:** HIGH | **Estimated Time:** 4-5 hours  
**Dependencies:** Capybara & Selenium (already in Rails 8)

### Critical User Flows to Test

1. **User Authentication Flow** (signup → login → logout)
2. **GIF Upload Flow** (upload → view → edit → delete)
3. **Social Features Flow** (like → comment → follow)
4. **Remix Flow** (view GIF → remix → publish)
5. **Collection Flow** (create → add GIF → view → edit)

### Step 4.1: Setup System Test Helper (15 min)

**File:** `/Users/jeremywatt/Desktop/ytgify-share/test/application_system_test_case.rb`

**Action:** Update with helpers (create if missing):

```ruby
require "test_helper"
require "capybara/rails"
require "capybara/minitest"

class ApplicationSystemTestCase < ActionDispatch::SystemTestCase
  driven_by :selenium, using: :headless_chrome, screen_size: [1400, 1400]

  # Helper to sign in user via UI
  def sign_in_as(user, password: "password123")
    visit new_user_session_path
    fill_in "Email", with: user.email
    fill_in "Password", with: password
    click_button "Log in"
    assert_text "Signed in successfully" # Or check for user menu
  end

  # Helper to wait for Turbo Streams
  def wait_for_turbo
    sleep 0.5 # Simple wait, adjust as needed
  end

  # Helper to attach file
  def attach_test_gif(input_label = "File")
    attach_file input_label, Rails.root.join('test/fixtures/files/test.gif')
  end

  # Helper to check if element visible
  def element_visible?(selector)
    has_selector?(selector, visible: true)
  end
end
```

### Step 4.2: Authentication Flow Test (30 min)

**File:** `/Users/jeremywatt/Desktop/ytgify-share/test/system/user_authentication_test.rb` (create new)

```ruby
require "application_system_test_case"

class UserAuthenticationTest < ApplicationSystemTestCase
  test "complete signup flow" do
    visit root_path
    click_link "Sign up"

    fill_in "Username", with: "newuser"
    fill_in "Email", with: "newuser@example.com"
    fill_in "Password", with: "password123"
    fill_in "Password confirmation", with: "password123"

    click_button "Sign up"

    # Should redirect to home and show success message
    assert_text "Welcome! You have signed up successfully"
    assert_current_path root_path

    # Should see user menu
    assert_selector "nav", text: "newuser"
  end

  test "login and logout flow" do
    user = users(:alice)

    # Login
    visit new_user_session_path
    fill_in "Email", with: user.email
    fill_in "Password", with: "password123"
    click_button "Log in"

    assert_text "Signed in successfully"

    # Logout
    click_link user.username # Or button that opens dropdown
    click_button "Sign out"

    assert_text "Signed out successfully"
    assert_current_path root_path
  end

  test "invalid login shows error" do
    visit new_user_session_path
    fill_in "Email", with: "wrong@example.com"
    fill_in "Password", with: "wrongpassword"
    click_button "Log in"

    assert_text "Invalid Email or password"
    assert_current_path new_user_session_path
  end

  test "password reset flow" do
    user = users(:alice)

    visit new_user_session_path
    click_link "Forgot your password?"

    fill_in "Email", with: user.email
    click_button "Send me reset password instructions"

    assert_text "You will receive an email with instructions"
  end
end
```

### Step 4.3: GIF Upload Flow Test (45 min)

**File:** `/Users/jeremywatt/Desktop/ytgify-share/test/system/gif_upload_flow_test.rb` (create new)

```ruby
require "application_system_test_case"

class GifUploadFlowTest < ApplicationSystemTestCase
  setup do
    @user = users(:alice)
    sign_in_as @user
  end

  test "complete GIF upload flow" do
    visit root_path
    click_link "Upload" # Or button to upload

    # Fill out form
    fill_in "Title", with: "My New GIF"
    fill_in "Description", with: "This is a test GIF upload"
    select "Public", from: "Privacy"

    # Attach file
    attach_test_gif

    # Add hashtag
    fill_in "Hashtags", with: "test, funny"

    click_button "Create Gif" # Or "Upload"

    # Should redirect to GIF show page
    assert_text "My New GIF"
    assert_text "This is a test GIF upload"
    assert_selector "img[alt='My New GIF']" # GIF image

    # Check hashtags rendered
    assert_text "#test"
    assert_text "#funny"
  end

  test "edit GIF" do
    gif = gifs(:alice_public_gif)
    visit gif_path(gif)

    click_link "Edit" # Or button to edit

    fill_in "Title", with: "Updated Title"
    fill_in "Description", with: "Updated description"

    click_button "Update Gif"

    assert_text "GIF updated successfully"
    assert_text "Updated Title"
    assert_text "Updated description"
  end

  test "delete GIF" do
    gif = gifs(:alice_public_gif)
    visit gif_path(gif)

    # Accept confirmation dialog
    accept_confirm do
      click_button "Delete" # Or link
    end

    assert_text "GIF deleted successfully"
    # Should be soft deleted
    assert_not Gif.not_deleted.exists?(gif.id)
  end

  test "GIF upload validation errors" do
    visit new_gif_path

    # Try to submit without file
    click_button "Create Gif"

    # Should show errors
    assert_text "can't be blank" # Or specific validation message
  end

  test "privacy settings work" do
    visit new_gif_path

    fill_in "Title", with: "Private GIF"
    select "Private", from: "Privacy"
    attach_test_gif

    click_button "Create Gif"

    gif = Gif.last
    assert gif.privacy_private_access?

    # Private GIF should not show in public feed
    visit trending_path
    assert_no_text "Private GIF"
  end
end
```

### Step 4.4: Social Features Flow Test (45 min)

**File:** `/Users/jeremywatt/Desktop/ytgify-share/test/system/social_features_flow_test.rb` (create new)

```ruby
require "application_system_test_case"

class SocialFeaturesFlowTest < ApplicationSystemTestCase
  setup do
    @alice = users(:alice)
    @bob = users(:bob)
    @gif = gifs(:alice_public_gif)
  end

  test "like and unlike GIF flow" do
    sign_in_as @alice

    visit gif_path(@gif)

    # Initial like count
    initial_count = @gif.like_count

    # Like GIF (using Turbo Streams)
    click_button "Like"
    wait_for_turbo

    # Check like count updated
    assert_selector "[data-like-count]", text: (initial_count + 1).to_s

    # Unlike GIF
    click_button "Unlike"
    wait_for_turbo

    # Check like count decreased
    assert_selector "[data-like-count]", text: initial_count.to_s
  end

  test "comment on GIF flow" do
    sign_in_as @alice

    visit gif_path(@gif)

    # Post comment
    fill_in "Comment", with: "Great GIF!"
    click_button "Post Comment" # Or "Submit"

    wait_for_turbo

    # Should see comment appear
    assert_text "Great GIF!"
    assert_selector ".comment", text: @alice.username

    # Check comment count updated
    assert_equal 1, @gif.reload.comment_count
  end

  test "reply to comment flow" do
    sign_in_as @alice

    # Create initial comment
    comment = Comment.create!(
      user: @bob,
      commentable: @gif,
      content: "Nice work!"
    )

    visit gif_path(@gif)

    # Click reply button
    within "##{dom_id(comment)}" do
      click_button "Reply"
    end

    # Fill reply form
    fill_in "Reply", with: "Thanks!"
    click_button "Post Reply"

    wait_for_turbo

    # Should see reply nested under comment
    assert_text "Thanks!"
  end

  test "follow and unfollow user flow" do
    sign_in_as @alice

    visit user_path(@bob.username)

    # Follow user
    click_button "Follow"
    wait_for_turbo

    # Button should change
    assert_button "Following"

    # Check follow count
    assert_equal 1, @alice.reload.following_count
    assert_equal 1, @bob.reload.followers_count

    # Unfollow user
    click_button "Following" # Or "Unfollow"
    wait_for_turbo

    # Button should revert
    assert_button "Follow"

    # Check counts updated
    assert_equal 0, @alice.reload.following_count
    assert_equal 0, @bob.reload.followers_count
  end

  test "view followers and following lists" do
    # Setup: Alice follows Bob
    @alice.following << @bob

    sign_in_as @alice

    visit user_path(@alice.username)

    # Click "Following" tab
    click_link "Following"

    # Should see Bob in following list
    assert_text @bob.username

    # Click "Followers" tab
    click_link "Followers"

    # Should show empty state or count
    assert_text "No followers yet" # Or similar
  end

  test "receive notification for like" do
    sign_in_as @alice

    # Another user likes Alice's GIF (simulate)
    Like.create!(user: @bob, gif: @gif)
    # This should create notification

    # Visit notifications page
    visit notifications_path

    # Should see notification
    assert_text "#{@bob.username} liked your GIF"
  end
end
```

### Step 4.5: Remix Flow Test (45 min)

**File:** `/Users/jeremywatt/Desktop/ytgify-share/test/system/remix_flow_test.rb` (create new)

```ruby
require "application_system_test_case"

class RemixFlowTest < ApplicationSystemTestCase
  setup do
    @user = users(:alice)
    @gif = gifs(:alice_public_gif)
    sign_in_as @user
  end

  test "access remix editor", driver: :selenium_chrome, js: true do
    visit gif_path(@gif)

    click_link "Remix" # Or button

    # Should navigate to remix editor
    assert_current_path remix_gif_path(@gif)

    # Check canvas is present
    assert_selector "canvas#remix-canvas"
  end

  test "remix editor loads GIF", driver: :selenium_chrome, js: true do
    visit remix_gif_path(@gif)

    # Wait for JavaScript to load
    sleep 1

    # Check canvas has content (dimensions set)
    canvas = find("canvas#remix-canvas")
    assert canvas[:width].to_i > 0
    assert canvas[:height].to_i > 0
  end

  test "create remix from editor", driver: :selenium_chrome, js: true do
    visit remix_gif_path(@gif)

    # Fill remix title
    fill_in "Title", with: "My Remix"

    # Click "Save" or "Create Remix"
    click_button "Create Remix"

    # Should process and show success
    # (This might require waiting for job)
    sleep 2 # Or use proper wait

    # Check remix created
    remix = Gif.where(parent_gif_id: @gif.id).last
    assert_not_nil remix
    assert remix.is_remix?
  end

  test "cannot remix private GIF from other user" do
    private_gif = Gif.create!(
      user: users(:bob),
      title: "Private GIF",
      privacy: :private_access
    )

    visit gif_path(private_gif)

    # Remix button should not be present
    assert_no_link "Remix"
  end
end
```

### Step 4.6: Collection Flow Test (30 min)

**File:** `/Users/jeremywatt/Desktop/ytgify-share/test/system/collection_flow_test.rb` (create new)

```ruby
require "application_system_test_case"

class CollectionFlowTest < ApplicationSystemTestCase
  setup do
    @user = users(:alice)
    @gif = gifs(:alice_public_gif)
    sign_in_as @user
  end

  test "create new collection" do
    visit collections_path

    click_link "New Collection" # Or button

    fill_in "Name", with: "My Favorites"
    fill_in "Description", with: "My favorite GIFs"
    select "Public", from: "Privacy"

    click_button "Create Collection"

    assert_text "Collection created successfully"
    assert_text "My Favorites"
  end

  test "add GIF to collection" do
    collection = Collection.create!(
      user: @user,
      name: "Test Collection",
      privacy: :public_access
    )

    visit gif_path(@gif)

    # Click "Add to Collection" button
    click_button "Add to Collection" # Or link

    # Modal should appear
    within ".modal" do # Or specific modal selector
      check collection.name
      click_button "Save"
    end

    wait_for_turbo

    # GIF should be in collection
    assert collection.gifs.include?(@gif)
  end

  test "view collection with GIFs" do
    collection = Collection.create!(
      user: @user,
      name: "My Collection",
      privacy: :public_access
    )
    collection.gifs << @gif

    visit collection_path(collection)

    # Should show collection name
    assert_text "My Collection"

    # Should show GIF in collection
    assert_selector "img[alt='#{@gif.title}']"
  end

  test "reorder GIFs in collection", driver: :selenium_chrome, js: true do
    collection = Collection.create!(
      user: @user,
      name: "Test Collection",
      privacy: :public_access
    )

    gif1 = @gif
    gif2 = gifs(:bob_public_gif)

    collection.collection_gifs.create!(gif: gif1, position: 0)
    collection.collection_gifs.create!(gif: gif2, position: 1)

    visit edit_collection_path(collection)

    # Drag and drop (Capybara may not support well)
    # Or click reorder buttons if implemented
    # This test may require JavaScript driver

    # Verify position changed
    # assert_equal [gif2.id, gif1.id], collection.reload.gifs.pluck(:id)
  end
end
```

### Step 4.7: Run System Tests (15 min)

**Commands:**

```bash
# Run all system tests
bin/rails test:system

# Run specific test file
bin/rails test:system test/system/user_authentication_test.rb

# Run with visible browser (debugging)
CI=false bin/rails test:system

# Run in parallel (faster)
PARALLEL_WORKERS=4 bin/rails test:system
```

**Expected Output:**

```
Run options: --seed 12345

# Running:

UserAuthenticationTest
  test_complete_signup_flow                           PASS (2.34s)
  test_login_and_logout_flow                          PASS (1.89s)
  test_invalid_login_shows_error                      PASS (1.23s)
  test_password_reset_flow                            PASS (1.45s)

GifUploadFlowTest
  test_complete_GIF_upload_flow                       PASS (3.12s)
  test_edit_GIF                                       PASS (2.01s)
  test_delete_GIF                                     PASS (1.67s)
  test_GIF_upload_validation_errors                   PASS (1.34s)
  test_privacy_settings_work                          PASS (2.23s)

SocialFeaturesFlowTest
  test_like_and_unlike_GIF_flow                       PASS (2.45s)
  test_comment_on_GIF_flow                            PASS (2.12s)
  test_reply_to_comment_flow                          PASS (2.67s)
  test_follow_and_unfollow_user_flow                  PASS (2.34s)
  test_view_followers_and_following_lists             PASS (1.89s)
  test_receive_notification_for_like                  PASS (1.56s)

RemixFlowTest
  test_access_remix_editor                            PASS (2.78s)
  test_remix_editor_loads_GIF                         PASS (3.01s)
  test_create_remix_from_editor                       PASS (4.23s)
  test_cannot_remix_private_GIF_from_other_user       PASS (1.45s)

CollectionFlowTest
  test_create_new_collection                          PASS (2.12s)
  test_add_GIF_to_collection                          PASS (2.67s)
  test_view_collection_with_GIFs                      PASS (1.89s)

Finished in 45.23s
21 runs, 87 assertions, 0 failures, 0 errors, 0 skips
```

### Success Criteria

- ✅ System test helper configured
- ✅ 5 critical flows tested (auth, upload, social, remix, collections)
- ✅ 20+ system test scenarios passing
- ✅ Tests use Turbo Stream waits correctly
- ✅ JavaScript tests work (remix editor)
- ✅ All assertions meaningful (not just checking page loads)
- ✅ Tests run in CI/CD (headless)
- ✅ No flaky tests (run 3 times successfully)

### System Test Coverage

**Flows Covered:**
- User signup/login/logout ✅
- Password reset ✅
- GIF upload/edit/delete ✅
- Privacy controls ✅
- Like/unlike ✅
- Comment/reply ✅
- Follow/unfollow ✅
- Notifications ✅
- Remix creation ✅
- Collections CRUD ✅

**Total System Tests:** 21  
**Estimated Runtime:** ~45 seconds (headless)

---

## Task 5: UI/UX Polish - Loading States & Error Messages

**Priority:** MEDIUM | **Estimated Time:** 3-4 hours  
**Dependencies:** None

### Areas to Polish

1. **Loading States** - Show spinners/skeletons during async operations
2. **Error Messages** - User-friendly, actionable error messages
3. **Empty States** - Helpful prompts when no content
4. **Success Feedback** - Confirm actions completed
5. **Accessibility** - ARIA labels, focus states, keyboard navigation

### Step 5.1: Add Loading States (1.5 hours)

#### Loading Spinner Component

**File:** `/Users/jeremywatt/Desktop/ytgify-share/app/views/shared/_loading_spinner.html.erb` (create new)

```erb
<div class="flex items-center justify-center py-12">
  <div class="flex items-center space-x-3 text-gray-600">
    <svg class="animate-spin h-8 w-8" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <span class="font-medium text-lg"><%= local_assigns[:message] || "Loading..." %></span>
  </div>
</div>
```

#### Skeleton Loader for GIF Cards

**File:** `/Users/jeremywatt/Desktop/ytgify-share/app/views/shared/_gif_card_skeleton.html.erb` (create new)

```erb
<div class="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
  <!-- Image skeleton -->
  <div class="w-full h-64 bg-gray-300"></div>
  
  <!-- Content skeleton -->
  <div class="p-4 space-y-3">
    <div class="h-4 bg-gray-300 rounded w-3/4"></div>
    <div class="h-3 bg-gray-200 rounded w-1/2"></div>
    
    <div class="flex items-center space-x-4 mt-4">
      <div class="h-8 w-8 bg-gray-300 rounded-full"></div>
      <div class="flex-1 space-y-2">
        <div class="h-3 bg-gray-200 rounded w-1/3"></div>
      </div>
    </div>
  </div>
</div>
```

#### Update Trending Page with Loading State

**File:** `/Users/jeremywatt/Desktop/ytgify-share/app/views/home/trending.html.erb`

**Action:** Update infinite scroll loader (lines 40-50):

```erb
<!-- Load More Trigger -->
<% if @pagy.next %>
  <%= turbo_frame_tag "page_#{@pagy.next}",
      src: url_for(page: @pagy.next),
      loading: :lazy,
      data: { infinite_scroll_target: "trigger" } do %>
    <%= render 'shared/loading_spinner', message: 'Loading more GIFs...' %>
  <% end %>
<% end %>
```

#### Add Loading State to Forms

**File:** `/Users/jeremywatt/Desktop/ytgify-share/app/views/gifs/_form.html.erb`

**Action:** Add loading state to submit button:

```erb
<%= form.submit class: "px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors",
                 data: { disable_with: "Uploading..." } %>
```

#### Stimulus Controller for Loading States

**File:** `/Users/jeremywatt/Desktop/ytgify-share/app/javascript/controllers/loading_controller.js` (create new)

```javascript
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["button", "spinner", "content"]

  show() {
    this.buttonTarget.disabled = true
    this.spinnerTarget.classList.remove("hidden")
    this.contentTarget.classList.add("hidden")
  }

  hide() {
    this.buttonTarget.disabled = false
    this.spinnerTarget.classList.add("hidden")
    this.contentTarget.classList.remove("hidden")
  }
}
```

**Usage in views:**

```erb
<button data-controller="loading"
        data-action="click->loading#show turbo:submit-end->loading#hide"
        class="...">
  <span data-loading-target="content">Submit</span>
  <span data-loading-target="spinner" class="hidden">
    <svg class="animate-spin h-5 w-5 inline-block">...</svg>
  </span>
</button>
```

### Step 5.2: Improve Error Messages (1 hour)

#### Error Message Component

**File:** `/Users/jeremywatt/Desktop/ytgify-share/app/views/shared/_error_messages.html.erb`

**Current Status:** Check existing content (line 1+)

**Action:** Update to be more user-friendly:

```erb
<% if object.errors.any? %>
  <div class="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-6" role="alert">
    <div class="flex items-start">
      <svg class="w-6 h-6 text-red-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      
      <div>
        <h3 class="text-red-800 font-semibold mb-2">
          <%= pluralize(object.errors.count, "error") %> prevented this <%= object.class.model_name.human.downcase %> from being saved:
        </h3>
        
        <ul class="list-disc list-inside text-red-700 space-y-1">
          <% object.errors.full_messages.each do |message| %>
            <li><%= message %></li>
          <% end %>
        </ul>
      </div>
    </div>
  </div>
<% end %>
```

#### API Error Responses

**File:** `/Users/jeremywatt/Desktop/ytgify-share/app/controllers/api/v1/base_controller.rb` (check if exists)

**Action:** Create standardized error handler:

```ruby
module Api
  module V1
    class BaseController < ApplicationController
      skip_before_action :verify_authenticity_token
      
      rescue_from ActiveRecord::RecordNotFound, with: :not_found
      rescue_from ActiveRecord::RecordInvalid, with: :unprocessable_entity
      rescue_from ActionController::ParameterMissing, with: :bad_request
      
      private
      
      def not_found(exception)
        render json: {
          error: "Resource not found",
          message: exception.message
        }, status: :not_found
      end
      
      def unprocessable_entity(exception)
        render json: {
          error: "Validation failed",
          message: exception.message,
          errors: exception.record.errors.full_messages
        }, status: :unprocessable_entity
      end
      
      def bad_request(exception)
        render json: {
          error: "Bad request",
          message: exception.message
        }, status: :bad_request
      end
    end
  end
end
```

#### Flash Message Improvements

**File:** `/Users/jeremywatt/Desktop/ytgify-share/app/views/shared/_flash.html.erb`

**Current Status:** Check existing content (likely good)

**Action:** Ensure icons and proper styling:

```erb
<div class="fixed top-4 right-4 z-50 space-y-2">
  <% flash.each do |type, message| %>
    <% next if message.blank? %>
    
    <div class="max-w-md bg-white rounded-lg shadow-lg border-l-4 <%= flash_border_class(type) %> p-4 flex items-start animate-fade-in"
         data-controller="flash"
         data-flash-dismiss-after-value="5000">
      
      <!-- Icon -->
      <div class="flex-shrink-0">
        <%= flash_icon(type) %>
      </div>
      
      <!-- Message -->
      <div class="ml-3 flex-1">
        <p class="text-sm font-medium <%= flash_text_class(type) %>">
          <%= message %>
        </p>
      </div>
      
      <!-- Close button -->
      <button type="button" 
              class="ml-3 flex-shrink-0 inline-flex text-gray-400 hover:text-gray-500"
              data-action="click->flash#dismiss">
        <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
        </svg>
      </button>
    </div>
  <% end %>
</div>

<%# Helper methods needed in ApplicationHelper %>
```

**File:** `/Users/jeremywatt/Desktop/ytgify-share/app/helpers/application_helper.rb`

**Action:** Add flash helper methods:

```ruby
module ApplicationHelper
  def flash_border_class(type)
    case type.to_sym
    when :notice, :success
      'border-green-500'
    when :alert, :error
      'border-red-500'
    when :warning
      'border-yellow-500'
    else
      'border-blue-500'
    end
  end
  
  def flash_text_class(type)
    case type.to_sym
    when :notice, :success
      'text-green-800'
    when :alert, :error
      'text-red-800'
    when :warning
      'text-yellow-800'
    else
      'text-blue-800'
    end
  end
  
  def flash_icon(type)
    case type.to_sym
    when :notice, :success
      content_tag(:svg, class: 'h-5 w-5 text-green-500', fill: 'currentColor', viewBox: '0 0 20 20') do
        tag.path(fill_rule: 'evenodd', d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z')
      end
    when :alert, :error
      content_tag(:svg, class: 'h-5 w-5 text-red-500', fill: 'currentColor', viewBox: '0 0 20 20') do
        tag.path(fill_rule: 'evenodd', d: 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z')
      end
    when :warning
      content_tag(:svg, class: 'h-5 w-5 text-yellow-500', fill: 'currentColor', viewBox: '0 0 20 20') do
        tag.path(fill_rule: 'evenodd', d: 'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z')
      end
    else
      content_tag(:svg, class: 'h-5 w-5 text-blue-500', fill: 'currentColor', viewBox: '0 0 20 20') do
        tag.path(fill_rule: 'evenodd', d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z')
      end
    end
  end
end
```

### Step 5.3: Add Empty States (30 min)

#### Empty State Component

**File:** `/Users/jeremywatt/Desktop/ytgify-share/app/views/shared/_empty_state.html.erb` (create new)

```erb
<div class="text-center py-20">
  <svg class="mx-auto h-24 w-24 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <%= yield :icon %>
  </svg>
  
  <h3 class="text-xl font-semibold text-gray-700 mb-2">
    <%= yield :title %>
  </h3>
  
  <p class="text-gray-500 mb-6 max-w-md mx-auto">
    <%= yield :description %>
  </p>
  
  <% if content_for?(:action) %>
    <div>
      <%= yield :action %>
    </div>
  <% end %>
</div>
```

**Usage:**

```erb
<%= render 'shared/empty_state' do |empty| %>
  <% content_for :icon do %>
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  <% end %>
  
  <% content_for :title, "No GIFs yet" %>
  <% content_for :description, "Start creating your first GIF to see it here!" %>
  
  <% content_for :action do %>
    <%= link_to new_gif_path, class: "inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium" do %>
      <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      Upload a GIF
    <% end %>
  <% end %>
<% end %>
```

### Step 5.4: Accessibility Improvements (30 min)

#### Add ARIA Labels

**File:** `/Users/jeremywatt/Desktop/ytgify-share/app/views/likes/_like_button.html.erb`

**Action:** Add aria-label:

```erb
<button aria-label="<%= liked ? 'Unlike this GIF' : 'Like this GIF' %>"
        aria-pressed="<%= liked %>"
        class="...">
  <!-- Button content -->
</button>
```

#### Keyboard Navigation

**File:** `/Users/jeremywatt/Desktop/ytgify-share/app/javascript/controllers/dropdown_controller.js`

**Action:** Add keyboard support:

```javascript
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["menu"]

  toggle(event) {
    event.stopPropagation()
    this.menuTarget.classList.toggle("hidden")
  }

  hide() {
    this.menuTarget.classList.add("hidden")
  }

  // Add keyboard support
  handleKeydown(event) {
    if (event.key === "Escape") {
      this.hide()
    }
  }
}
```

#### Focus States

**File:** `/Users/jeremywatt/Desktop/ytgify-share/app/assets/stylesheets/application.tailwind.css`

**Action:** Ensure focus styles visible:

```css
/* Add custom focus styles */
button:focus-visible,
a:focus-visible,
input:focus-visible,
textarea:focus-visible {
  @apply outline-2 outline-offset-2 outline-indigo-600;
}
```

### Step 5.5: Test UI Polish (30 min)

**Manual Testing Checklist:**

```markdown
## UI/UX Polish Verification

### Loading States
- [ ] Trending page shows spinner when loading more GIFs
- [ ] Form submit buttons show "Uploading..." or spinner
- [ ] Skeleton loaders appear before GIF cards load
- [ ] Turbo Stream updates show brief loading indicator

### Error Messages
- [ ] Form validation errors show clear messages
- [ ] API errors return JSON with error details
- [ ] Flash messages have icons and proper styling
- [ ] Flash messages auto-dismiss after 5 seconds
- [ ] Close button works on flash messages

### Empty States
- [ ] Empty GIF feed shows helpful message + CTA
- [ ] Empty collection shows create prompt
- [ ] No followers/following shows empty state
- [ ] No notifications shows friendly message

### Success Feedback
- [ ] GIF upload shows success message
- [ ] Like/unlike shows visual feedback
- [ ] Follow/unfollow updates button immediately
- [ ] Comment post shows confirmation

### Accessibility
- [ ] All buttons have aria-labels
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Focus states visible
- [ ] Screen reader announces state changes
- [ ] Color contrast passes WCAG AA (4.5:1)
```

**Commands:**

```bash
# Start server
bin/dev

# Test each flow manually
# - Upload GIF (check loading state)
# - Submit invalid form (check error messages)
# - View empty feed (check empty state)
# - Like GIF (check success feedback)
# - Use keyboard only (Tab, Enter, Escape)

# Run Lighthouse audit
# Chrome DevTools → Lighthouse → Run audit
# Target: Accessibility score > 90
```

### Success Criteria

- ✅ All async operations show loading states
- ✅ Error messages user-friendly with icons
- ✅ Empty states helpful with CTAs
- ✅ Success feedback immediate and clear
- ✅ Accessibility score > 90 (Lighthouse)
- ✅ Keyboard navigation works
- ✅ Focus states visible
- ✅ WCAG AA color contrast

---

## Task 6: Launch Documentation & Deployment Checklist

**Priority:** HIGH | **Estimated Time:** 2-3 hours  
**Dependencies:** All previous tasks

### Documentation to Create

1. **README.md** - Project overview, setup instructions
2. **DEPLOYMENT.md** - Deployment guide
3. **API_DOCUMENTATION.md** - API endpoints reference
4. **TROUBLESHOOTING.md** - Common issues and fixes
5. **LAUNCH_CHECKLIST.md** - Pre-launch verification

### Step 6.1: Update README.md (30 min)

**File:** `/Users/jeremywatt/Desktop/ytgify-share/README.md`

**Action:** Replace with comprehensive README:

```markdown
# ytgify - GIF Social Platform

A modern GIF creation and sharing platform built with Rails 8 + Hotwire.

## Features

- **GIF Management** - Upload, edit, organize GIFs
- **Social Features** - Like, comment, follow, share
- **Remix Editor** - Create remixes with Canvas API
- **Collections** - Organize GIFs into collections
- **Hashtags** - Discover and tag GIFs
- **Real-time Notifications** - ActionCable + Turbo Streams
- **Trending Feed** - Algorithm-based content discovery
- **Chrome Extension** - Capture YouTube clips as GIFs

## Tech Stack

- **Backend:** Rails 8.0.4, PostgreSQL (UUID primary keys)
- **Frontend:** Hotwire (Turbo + Stimulus), Tailwind CSS 4
- **Authentication:** Devise (web) + JWT (API)
- **Jobs:** Sidekiq + Redis
- **Storage:** ActiveStorage + S3
- **Caching:** Redis (Solid Cache)
- **Real-time:** ActionCable (Solid Cable)

## Getting Started

### Prerequisites

- Ruby 3.4.5
- PostgreSQL 16+
- Redis 7+
- Node.js 20+ (for Tailwind)

### Installation

1. **Clone repository:**
   ```bash
   git clone https://github.com/yourusername/ytgify.git
   cd ytgify
   ```

2. **Install dependencies:**
   ```bash
   bundle install
   ```

3. **Setup database:**
   ```bash
   bin/rails db:create db:migrate db:seed
   ```

4. **Start services:**
   ```bash
   # Terminal 1: Rails + Tailwind
   bin/dev

   # Terminal 2: Sidekiq (background jobs)
   bundle exec sidekiq
   ```

5. **Visit app:**
   ```
   http://localhost:3000
   ```

### Environment Variables

Create `.env` file:

```bash
DATABASE_URL=postgresql://localhost/ytgify_development
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=your-secret-key-here
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_S3_BUCKET=ytgify-development
AWS_S3_REGION=us-east-1
```

## Testing

```bash
# Run all tests
bin/rails test

# Run system tests
bin/rails test:system

# Run with coverage
COVERAGE=true bin/rails test
open coverage/index.html
```

## Development

### Key Commands

```bash
bin/dev                                    # Start Rails + Tailwind
bin/rails test                             # Run all tests
bin/rails db:migrate                       # Run migrations
bin/rails c                                # Rails console
bundle exec sidekiq                        # Start background jobs
```

### Code Structure

```
app/
├── controllers/        # Web + API controllers
├── models/             # ActiveRecord models
├── services/           # Business logic (FeedService, etc.)
├── channels/           # ActionCable channels
├── jobs/               # Background jobs (Sidekiq)
├── views/              # ERB templates
└── javascript/
    └── controllers/    # Stimulus controllers

test/
├── models/             # Model tests
├── controllers/        # Controller tests
├── system/             # End-to-end tests
└── services/           # Service tests
```

### Architecture Decisions

See [`plans/02-ARCHITECTURE-DECISIONS.md`](plans/02-ARCHITECTURE-DECISIONS.md)

## API Documentation

See [`API_DOCUMENTATION.md`](API_DOCUMENTATION.md)

## Deployment

See [`DEPLOYMENT.md`](DEPLOYMENT.md)

## Troubleshooting

See [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md)

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is licensed under the MIT License.

## Contact

Project Link: https://github.com/yourusername/ytgify
```

### Step 6.2: Create DEPLOYMENT.md (45 min)

**File:** `/Users/jeremywatt/Desktop/ytgify-share/DEPLOYMENT.md` (create new)

```markdown
# Deployment Guide

This guide covers deploying ytgify to production using Kamal (Rails 8 default).

## Prerequisites

- Docker installed locally
- Server with Docker support (Ubuntu 22.04+ recommended)
- Domain name (e.g., ytgify.com)
- AWS S3 bucket (for file storage)
- Redis server (or Redis Cloud)
- PostgreSQL database (or RDS)

## Pre-Deployment Checklist

### 1. Code Quality

- [ ] All tests passing: `bin/rails test`
- [ ] System tests passing: `bin/rails test:system`
- [ ] No security warnings: `bundle exec brakeman -A -z`
- [ ] No vulnerable gems: `bundle exec bundler-audit check`
- [ ] Coverage > 90%: `COVERAGE=true bin/rails test`

### 2. Configuration

- [ ] Production credentials set: `bin/rails credentials:edit --environment production`
- [ ] Environment variables documented
- [ ] Database migrations ready
- [ ] Assets precompile works: `RAILS_ENV=production bin/rails assets:precompile`

### 3. Infrastructure

- [ ] PostgreSQL database created
- [ ] Redis server accessible
- [ ] S3 bucket configured
- [ ] CloudFront distribution (optional)
- [ ] Domain DNS configured

### 4. Security

- [ ] HTTPS enforced (`config.force_ssl = true`)
- [ ] Rate limiting enabled (Rack::Attack)
- [ ] CSP headers configured
- [ ] File upload validation active
- [ ] Secrets rotated (never use defaults!)

### 5. Monitoring

- [ ] Error tracking (Sentry)
- [ ] Performance monitoring (Scout APM)
- [ ] Log aggregation (Papertrail/LogDNA)
- [ ] Uptime monitoring (UptimeRobot)

## Kamal Deployment

### 1. Initialize Kamal

```bash
kamal init
```

This creates `config/deploy.yml`.

### 2. Configure Deployment

**File:** `config/deploy.yml`

```yaml
service: ytgify
image: yourusername/ytgify

servers:
  web:
    - 192.168.1.100  # Your server IP

registry:
  username: yourusername
  password:
    - KAMAL_REGISTRY_PASSWORD

env:
  clear:
    RAILS_ENV: production
  secret:
    - RAILS_MASTER_KEY
    - DATABASE_URL
    - REDIS_URL
    - JWT_SECRET_KEY
    - AWS_ACCESS_KEY_ID
    - AWS_SECRET_ACCESS_KEY
    - AWS_S3_BUCKET
    - AWS_S3_REGION

builder:
  multiarch: false

proxy:
  ssl: true
  host: ytgify.com

healthcheck:
  path: /up
  interval: 10s
  timeout: 5s
```

### 3. Set Environment Secrets

```bash
# Create .env.production (DO NOT COMMIT)
DATABASE_URL=postgresql://user:pass@db-host:5432/ytgify_production
REDIS_URL=redis://redis-host:6379/0
RAILS_MASTER_KEY=<from config/credentials/production.key>
JWT_SECRET_KEY=<generate with: bin/rails secret>
AWS_ACCESS_KEY_ID=<your-aws-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret>
AWS_S3_BUCKET=ytgify-production
AWS_S3_REGION=us-east-1
```

### 4. Deploy

```bash
# First deployment
kamal setup

# Subsequent deployments
kamal deploy

# Rollback if needed
kamal rollback
```

### 5. Post-Deployment

```bash
# Run migrations
kamal app exec 'bin/rails db:migrate'

# Check logs
kamal app logs -f

# Check app status
kamal app details

# Verify deployment
curl -I https://ytgify.com/up
```

## Manual Deployment (Alternative)

If not using Kamal, follow these steps:

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y git curl libssl-dev libreadline-dev zlib1g-dev \
  autoconf bison build-essential libyaml-dev libreadline-dev \
  libncurses5-dev libffi-dev libgdbm-dev postgresql-client redis-tools

# Install Ruby (using rbenv)
curl -fsSL https://github.com/rbenv/rbenv-installer/raw/main/bin/rbenv-installer | bash
rbenv install 3.4.5
rbenv global 3.4.5

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install -y nginx
```

### 2. Application Setup

```bash
# Clone repository
git clone https://github.com/yourusername/ytgify.git /var/www/ytgify
cd /var/www/ytgify

# Install dependencies
bundle install --deployment --without development test

# Setup database
RAILS_ENV=production bin/rails db:create db:migrate

# Precompile assets
RAILS_ENV=production bin/rails assets:precompile

# Start Puma
RAILS_ENV=production bundle exec puma -C config/puma.rb

# Start Sidekiq
RAILS_ENV=production bundle exec sidekiq -d
```

### 3. Nginx Configuration

**File:** `/etc/nginx/sites-available/ytgify`

```nginx
upstream ytgify {
  server unix:///var/www/ytgify/tmp/sockets/puma.sock;
}

server {
  listen 80;
  server_name ytgify.com www.ytgify.com;
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name ytgify.com www.ytgify.com;

  ssl_certificate /etc/letsencrypt/live/ytgify.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/ytgify.com/privkey.pem;

  root /var/www/ytgify/public;

  location / {
    try_files $uri @ytgify;
  }

  location @ytgify {
    proxy_pass http://ytgify;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /cable {
    proxy_pass http://ytgify;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
  }
}
```

## Monitoring Setup

### Sentry (Error Tracking)

1. Create Sentry account: https://sentry.io
2. Create new Rails project
3. Add to credentials:

```bash
bin/rails credentials:edit --environment production

# Add:
sentry:
  dsn: https://xxx@xxx.ingest.sentry.io/xxx
```

### Scout APM (Performance)

1. Create Scout account: https://scoutapm.com
2. Add gem: `gem 'scout_apm'`
3. Configure:

```yaml
# config/scout_apm.yml
production:
  key: <%= Rails.application.credentials.dig(:scout, :key) %>
  name: ytgify
  monitor: true
```

### Uptime Monitoring

1. Create UptimeRobot account: https://uptimerobot.com
2. Add monitor:
   - Type: HTTPS
   - URL: https://ytgify.com/up
   - Interval: 5 minutes
   - Alert: Email on downtime

## Backup Strategy

### Database Backups

```bash
# Daily backup via cron
0 2 * * * pg_dump -h db-host -U user ytgify_production | gzip > /backups/ytgify-$(date +\%Y\%m\%d).sql.gz

# Retention: 30 days
find /backups -name "ytgify-*.sql.gz" -mtime +30 -delete
```

### File Backups (S3)

S3 provides automatic durability (99.999999999%).

Optional: Enable S3 versioning for accidental deletion protection.

## Rollback Plan

### Kamal Rollback

```bash
kamal rollback
```

### Manual Rollback

```bash
# 1. Revert code
git revert HEAD
git push

# 2. Redeploy
kamal deploy

# 3. Rollback database (if needed)
RAILS_ENV=production bin/rails db:rollback STEP=1
```

## Troubleshooting

See [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md)

## Production Health Checks

```bash
# Check app is running
curl https://ytgify.com/up

# Check response time
time curl -I https://ytgify.com

# Check Redis
redis-cli -h redis-host ping

# Check database
psql -h db-host -U user -d ytgify_production -c "SELECT 1"

# Check Sidekiq
# Visit: https://ytgify.com/sidekiq (admin only)
```

## Scaling

### Horizontal Scaling

```yaml
# config/deploy.yml
servers:
  web:
    - 192.168.1.100
    - 192.168.1.101  # Add more servers
    - 192.168.1.102
```

### Database Scaling

- Enable read replicas (PostgreSQL)
- Use connection pooling (PgBouncer)

### Cache Scaling

- Use Redis Cluster for distributed caching

### CDN

- CloudFront for static assets
- GIF file delivery from edge locations

---

**Support:** For deployment issues, check logs with `kamal app logs` or email support@ytgify.com
```

### Step 6.3: Create API_DOCUMENTATION.md (30 min)

**File:** `/Users/jeremywatt/Desktop/ytgify-share/API_DOCUMENTATION.md` (create new)

```markdown
# API Documentation

Base URL: `https://ytgify.com/api/v1`

## Authentication

All authenticated endpoints require a JWT token:

```bash
Authorization: Bearer <token>
```

### POST /api/v1/auth/register

Register a new user.

**Request:**

```json
{
  "user": {
    "username": "newuser",
    "email": "user@example.com",
    "password": "password123"
  }
}
```

**Response (201):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "uuid",
    "username": "newuser",
    "email": "user@example.com"
  }
}
```

### POST /api/v1/auth/login

Login existing user.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "uuid",
    "username": "newuser",
    "email": "user@example.com"
  }
}
```

## GIFs

### GET /api/v1/gifs

List public GIFs (paginated).

**Parameters:**

- `page` (integer, default: 1)
- `per_page` (integer, default: 20, max: 100)
- `sort` (string: `recent`, `trending`, `popular`)

**Response (200):**

```json
{
  "gifs": [
    {
      "id": "uuid",
      "title": "Funny Cat",
      "description": "A funny cat GIF",
      "file_url": "https://s3.../file.gif",
      "thumbnail_url": "https://s3.../thumb.gif",
      "user": {
        "id": "uuid",
        "username": "john"
      },
      "like_count": 42,
      "view_count": 1337,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "total_pages": 10,
    "total_count": 200
  }
}
```

### GET /api/v1/gifs/:id

Get single GIF.

**Response (200):**

```json
{
  "gif": {
    "id": "uuid",
    "title": "Funny Cat",
    "description": "A funny cat GIF",
    "file_url": "https://s3.../file.gif",
    "user": {...},
    "hashtags": ["funny", "cat"],
    "like_count": 42,
    "comment_count": 5,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### POST /api/v1/gifs

Upload a GIF (authenticated).

**Request (multipart/form-data):**

```
gif[title]: "My GIF"
gif[description]: "Description here"
gif[privacy]: "public_access"
gif[file]: <file upload>
gif[hashtag_names][]: "funny"
gif[hashtag_names][]: "cat"
```

**Response (201):**

```json
{
  "gif": {
    "id": "uuid",
    "title": "My GIF",
    ...
  }
}
```

## Feed

### GET /api/v1/feed

Get personalized feed (authenticated).

**Parameters:**

- `page` (integer, default: 1)
- `per_page` (integer, default: 20)

**Response (200):**

```json
{
  "gifs": [...],
  "meta": {...}
}
```

## Rate Limits

- **Authentication:** 5 requests/minute per IP
- **API (authenticated):** 300 requests/5 minutes per user
- **API (unauthenticated):** 100 requests/5 minutes per IP
- **Uploads:** 10 uploads/hour per user

**Rate limit headers:**

```
RateLimit-Limit: 300
RateLimit-Remaining: 295
RateLimit-Reset: 1640000000
```

**Rate limit exceeded (429):**

```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "retry_after": 300
}
```

## Error Responses

### 400 Bad Request

```json
{
  "error": "Bad request",
  "message": "param is missing or the value is empty: user"
}
```

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### 404 Not Found

```json
{
  "error": "Resource not found",
  "message": "Couldn't find Gif with 'id'=xxx"
}
```

### 422 Unprocessable Entity

```json
{
  "error": "Validation failed",
  "message": "Validation failed: Title can't be blank",
  "errors": [
    "Title can't be blank",
    "File must be a GIF"
  ]
}
```

## Webhooks

Coming soon.

---

**Need help?** Email api@ytgify.com
```

### Step 6.4: Create TROUBLESHOOTING.md (30 min)

**File:** `/Users/jeremywatt/Desktop/ytgify-share/TROUBLESHOOTING.md` (create new)

```markdown
# Troubleshooting Guide

Common issues and solutions for ytgify.

## Development Issues

### Database Connection Error

**Error:**

```
PG::ConnectionBad: could not connect to server
```

**Solution:**

```bash
# 1. Check PostgreSQL is running
pg_isready

# 2. If not, start it
brew services start postgresql@16  # macOS
sudo systemctl start postgresql    # Linux

# 3. Verify database exists
psql -l | grep ytgify

# 4. If missing, create it
bin/rails db:create
```

### Redis Connection Error

**Error:**

```
Redis::CannotConnectError: Error connecting to Redis
```

**Solution:**

```bash
# 1. Check Redis is running
redis-cli ping
# Should return: PONG

# 2. If not, start it
brew services start redis  # macOS
sudo systemctl start redis # Linux

# 3. Verify REDIS_URL
echo $REDIS_URL
# Should be: redis://localhost:6379/0
```

### Asset Compilation Failed

**Error:**

```
Tailwind CSS not found
```

**Solution:**

```bash
# 1. Install Tailwind standalone CLI
bin/rails tailwindcss:install

# 2. Build assets
bin/rails assets:precompile

# 3. Use bin/dev (not just rails server)
bin/dev
```

### Test Failures

**Error:**

```
ActiveRecord::RecordNotUnique: duplicate key value
```

**Solution:**

```bash
# 1. Reset test database
RAILS_ENV=test bin/rails db:reset

# 2. Run tests again
bin/rails test
```

**Error:**

```
Parallel test failures (random)
```

**Solution:**

```bash
# Run tests sequentially (slower but stable)
PARALLEL_WORKERS=0 bin/rails test
```

### Sidekiq Jobs Not Processing

**Error:**

Jobs enqueued but not running.

**Solution:**

```bash
# 1. Check Sidekiq is running
ps aux | grep sidekiq

# 2. If not, start it
bundle exec sidekiq

# 3. Check Redis connection
redis-cli keys "sidekiq:*"

# 4. Flush stuck jobs (if needed)
bin/rails runner "Sidekiq::Queue.new.clear"
```

## Production Issues

### 502 Bad Gateway

**Symptoms:**

Nginx shows 502 error.

**Solution:**

```bash
# 1. Check Rails app is running
kamal app details

# 2. Check app logs
kamal app logs -f

# 3. Restart app
kamal app restart

# 4. Check Puma socket
ls -la tmp/sockets/puma.sock
```

### Slow Database Queries

**Symptoms:**

Pages loading > 5 seconds.

**Solution:**

```bash
# 1. Check for N+1 queries (development)
# Visit page and check logs for Bullet warnings

# 2. Analyze slow queries (production)
# Check Scout APM or New Relic

# 3. Add missing indexes
# See: plans/PHASE4-POLISH-LAUNCH.md (Task 2.2)

# 4. Check database connections
# In Rails console:
ActiveRecord::Base.connection_pool.stat
```

### High Memory Usage

**Symptoms:**

Server running out of memory.

**Solution:**

```bash
# 1. Check memory usage
free -h

# 2. Check Rails app memory
ps aux | grep puma

# 3. Optimize Puma workers
# config/puma.rb
workers ENV.fetch("WEB_CONCURRENCY") { 2 }  # Reduce if needed

# 4. Check for memory leaks
# Use Scout APM memory tracking
```

### Redis Out of Memory

**Symptoms:**

Redis OOM errors.

**Solution:**

```bash
# 1. Check Redis memory
redis-cli info memory

# 2. Clear cache (if safe)
redis-cli flushdb

# 3. Increase Redis maxmemory
# Edit /etc/redis/redis.conf
maxmemory 512mb
maxmemory-policy allkeys-lru

# 4. Restart Redis
sudo systemctl restart redis
```

### S3 Upload Failures

**Symptoms:**

GIF uploads fail with S3 error.

**Solution:**

```bash
# 1. Check AWS credentials
echo $AWS_ACCESS_KEY_ID
echo $AWS_SECRET_ACCESS_KEY

# 2. Verify S3 bucket exists
aws s3 ls s3://ytgify-production

# 3. Check bucket policy
# Must allow PutObject, GetObject

# 4. Check CORS configuration
# Add allowed origins in S3 console
```

### ActionCable Not Working

**Symptoms:**

Real-time updates not appearing.

**Solution:**

```bash
# 1. Check WebSocket connection in browser console
# Should see: "WebSocket connection established"

# 2. Check cable.yml
# Ensure Redis URL correct for production

# 3. Check Nginx WebSocket proxy
# Must have:
location /cable {
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "Upgrade";
}

# 4. Check firewall allows WebSocket
```

### Rate Limiting Too Aggressive

**Symptoms:**

Legitimate users getting 429 errors.

**Solution:**

```bash
# 1. Check rate limit logs
kamal app logs | grep "Rack::Attack"

# 2. Adjust limits in config/initializers/rack_attack.rb
# Increase limit or period:
throttle('api/user', limit: 600, period: 5.minutes)  # Was 300

# 3. Whitelist specific IPs
Rack::Attack.safelist('allow-office') do |req|
  req.ip == 'YOUR_OFFICE_IP'
end
```

## Common Error Messages

### "Couldn't find User with 'id'=..."

**Cause:** User logged out or token expired.

**Solution:**

```ruby
# In controller, handle gracefully:
rescue_from ActiveRecord::RecordNotFound do |exception|
  redirect_to root_path, alert: "Please sign in again"
end
```

### "PG::UniqueViolation: duplicate key value"

**Cause:** Trying to create duplicate record.

**Solution:**

```ruby
# Use find_or_create_by instead of create:
Hashtag.find_or_create_by(name: "funny")
```

### "ActionView::Template::Error: undefined method"

**Cause:** Nil object or missing association.

**Solution:**

```erb
<!-- Use safe navigation -->
<%= @user&.username || "Unknown" %>

<!-- Or check presence -->
<% if @user.present? %>
  <%= @user.username %>
<% end %>
```

## Performance Checklist

- [ ] Database indexes on frequently queried columns
- [ ] Bullet gem detects no N+1 queries
- [ ] Redis cache hit rate > 80%
- [ ] Sidekiq queue length < 100
- [ ] Database connections < 80% of pool
- [ ] Response times < 2s (p95)
- [ ] CDN enabled for static assets

## Security Checklist

- [ ] HTTPS enforced (force_ssl = true)
- [ ] Rate limiting active
- [ ] CSP headers present
- [ ] No secrets in code (use credentials)
- [ ] Brakeman shows no high severity issues
- [ ] All gems up-to-date (bundle update)

## Monitoring Dashboards

- **Errors:** https://sentry.io
- **Performance:** https://scoutapm.com
- **Uptime:** https://uptimerobot.com
- **Sidekiq:** https://ytgify.com/sidekiq

---

**Still stuck?** Email support@ytgify.com with:
- Error message
- Steps to reproduce
- Environment (development/production)
- Relevant logs
```

### Step 6.5: Create LAUNCH_CHECKLIST.md (15 min)

**File:** `/Users/jeremywatt/Desktop/ytgify-share/LAUNCH_CHECKLIST.md` (create new)

```markdown
# Launch Checklist

Pre-launch verification for ytgify.

**Target Launch Date:** __________  
**Checklist Completed:** __________

## Code Quality

- [ ] All tests passing (425+): `bin/rails test`
- [ ] System tests passing (20+): `bin/rails test:system`
- [ ] Test coverage > 90%: `COVERAGE=true bin/rails test`
- [ ] No Brakeman warnings: `bundle exec brakeman -A -z`
- [ ] No vulnerable gems: `bundle exec bundler-audit check`
- [ ] No Bullet N+1 warnings (check in development)
- [ ] All TODOs resolved or documented

## Configuration

- [ ] Production credentials set and secure
- [ ] All environment variables documented
- [ ] Database migrations run: `bin/rails db:migrate:status`
- [ ] Assets precompile: `RAILS_ENV=production bin/rails assets:precompile`
- [ ] Redis connection tested
- [ ] S3 bucket configured and accessible
- [ ] CloudFront CDN configured (optional)

## Security

- [ ] HTTPS enforced: `config.force_ssl = true`
- [ ] CSP headers active
- [ ] Secure headers configured
- [ ] Rate limiting enabled (Rack::Attack)
- [ ] File upload validation (GIF only, < 10MB)
- [ ] No html_safe on user input
- [ ] Strong parameters on all forms
- [ ] JWT secrets rotated (never use defaults!)
- [ ] Database credentials secured
- [ ] Sidekiq dashboard requires authentication

## Performance

- [ ] Database indexes added
- [ ] N+1 queries eliminated
- [ ] Redis caching implemented
- [ ] Fragment caching on GIF cards
- [ ] CDN configured for static assets
- [ ] Image optimization (variants)
- [ ] Page load time < 2s (p95)
- [ ] API response time < 200ms (p95)

## Features

- [ ] User signup/login works
- [ ] GIF upload works (test file < 10MB)
- [ ] GIF edit works
- [ ] Like/unlike works (real-time)
- [ ] Comment/reply works (real-time)
- [ ] Follow/unfollow works (real-time)
- [ ] Notifications work (ActionCable)
- [ ] Collections CRUD works
- [ ] Hashtags work
- [ ] Remix editor works
- [ ] Search works
- [ ] Trending feed shows GIFs
- [ ] User feed personalized

## Mobile

- [ ] Responsive on 375px (iPhone SE)
- [ ] Responsive on 768px (iPad)
- [ ] Touch targets ≥ 44px
- [ ] No horizontal scrolling
- [ ] Mobile menu works
- [ ] Remix editor works on touch devices
- [ ] Tested on iOS Safari
- [ ] Tested on Android Chrome

## Monitoring

- [ ] Sentry error tracking configured
- [ ] Scout APM (or New Relic) configured
- [ ] Log aggregation configured (Papertrail/LogDNA)
- [ ] Uptime monitoring configured (UptimeRobot)
- [ ] Sidekiq monitoring accessible
- [ ] Database backups automated
- [ ] Alert emails configured

## Documentation

- [ ] README.md complete
- [ ] DEPLOYMENT.md written
- [ ] API_DOCUMENTATION.md created
- [ ] TROUBLESHOOTING.md created
- [ ] Environment variables documented
- [ ] Deployment runbook ready

## Smoke Tests (Production)

- [ ] Health check: `curl https://ytgify.com/up` returns 200
- [ ] Home page loads
- [ ] User signup works
- [ ] User login works
- [ ] GIF upload works
- [ ] API authentication works
- [ ] WebSocket connects (check browser console)
- [ ] Static assets load from CDN
- [ ] No errors in Sentry

## Legal & Compliance

- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] GDPR compliance (if EU users)
- [ ] DMCA policy (for user content)
- [ ] Cookie consent (if needed)
- [ ] Contact information visible

## Post-Launch Monitoring (First 24 Hours)

- [ ] Error rate < 0.1%
- [ ] Response time < 2s
- [ ] No 5xx errors
- [ ] Database connections stable
- [ ] Redis memory stable
- [ ] Sidekiq queue processing
- [ ] S3 uploads working
- [ ] No security incidents
- [ ] User signups successful
- [ ] Real-time features working

## Rollback Plan

- [ ] Previous version tagged in Git
- [ ] Rollback command tested: `kamal rollback`
- [ ] Database rollback plan documented
- [ ] DNS rollback (if needed)
- [ ] Team notified of launch window

---

**Launch Approved By:**

- [ ] Tech Lead: __________
- [ ] QA: __________
- [ ] Security: __________
- [ ] Product: __________

**Launch Date:** __________  
**Launch Time:** __________ UTC

**Rollback Trigger:** Error rate > 1% OR Response time > 5s OR Critical feature broken

---

**Next Steps After Launch:**

1. Monitor dashboards for 24 hours
2. Collect user feedback
3. Address critical bugs within 4 hours
4. Plan post-launch improvements
```

### Step 6.6: Final Verification (15 min)

**Commands:**

```bash
# 1. Verify all documentation exists
ls -la /Users/jeremywatt/Desktop/ytgify-share/*.md
# Should see:
# - README.md
# - DEPLOYMENT.md
# - API_DOCUMENTATION.md
# - TROUBLESHOOTING.md
# - LAUNCH_CHECKLIST.md

# 2. Verify documentation quality
# Open each file and review for:
# - No broken links
# - No placeholder text (e.g., "TODO")
# - Clear instructions
# - Accurate commands

# 3. Test documentation accuracy
# Follow README.md setup instructions on fresh machine
# Ensure all commands work

# 4. Print launch checklist
open LAUNCH_CHECKLIST.md
# Print or save as PDF
```

### Success Criteria

- ✅ README.md comprehensive (project overview, setup, testing)
- ✅ DEPLOYMENT.md detailed (Kamal + manual deployment)
- ✅ API_DOCUMENTATION.md complete (all endpoints, auth, errors)
- ✅ TROUBLESHOOTING.md helpful (common issues + solutions)
- ✅ LAUNCH_CHECKLIST.md actionable (60+ items)
- ✅ All documentation accurate (tested commands)
- ✅ No placeholder text or TODOs
- ✅ Clear contact information

---

## Summary & Prioritization

### Task Priority Matrix

| Task | Priority | Time | Dependencies | Impact |
|------|----------|------|--------------|--------|
| 1. Redis Caching | HIGH | 4-6h | None | 75% performance improvement |
| 2. Mobile Testing | MEDIUM | 3-4h | None | User experience |
| 3. Test Coverage | HIGH | 2-3h | SimpleCov installed | Stability |
| 4. System Tests | HIGH | 4-5h | Capybara installed | Critical flows |
| 5. UI/UX Polish | MEDIUM | 3-4h | None | User experience |
| 6. Documentation | HIGH | 2-3h | All tasks | Launch readiness |

**Total Estimated Time:** 18-25 hours (2-3 weeks part-time)

### Recommended Order

**Week 1: Performance & Testing**
1. Task 1: Redis Caching (HIGH impact, foundational)
2. Task 3: Test Coverage Analysis (identify gaps)
3. Task 4: System Tests (critical flows)

**Week 2: User Experience**
4. Task 2: Mobile Responsiveness (UX)
5. Task 5: UI/UX Polish (UX)

**Week 3: Launch Prep**
6. Task 6: Documentation (launch readiness)
7. Final verification (run all checklists)

### Quick Wins (< 1 hour each)

- Enable Redis cache store (15 min)
- Fix RemixProcessingJobTest (15 min)
- Add loading spinners (30 min)
- Create empty state components (30 min)
- Update README.md (30 min)

### Critical Path (Must Complete Before Launch)

1. ✅ Test coverage > 90%
2. ✅ System tests for auth, upload, social, remix
3. ✅ Mobile testing on iOS/Android
4. ✅ Documentation complete
5. ✅ Launch checklist verified

---

## Success Metrics

### Code Quality
- Test coverage: 90%+ (currently ~92%)
- Test count: 425+ (currently 425)
- System tests: 20+ scenarios
- Brakeman: 0 high/medium warnings
- Bundle audit: 0 vulnerabilities

### Performance
- Page load: < 2s (p95)
- API response: < 200ms (p95)
- Cache hit rate: > 80%
- Database query time: < 100ms (p95)

### User Experience
- Mobile responsive: 100% (all pages)
- Touch targets: ≥ 44px
- Loading states: Present on all async operations
- Error messages: User-friendly
- Accessibility score: > 90 (Lighthouse)

### Launch Readiness
- Documentation: 5 documents (README, DEPLOYMENT, API, TROUBLESHOOTING, CHECKLIST)
- Monitoring: 4 services (Sentry, APM, Logs, Uptime)
- Security: Rate limiting, CSP, secure headers, file validation
- Backups: Automated daily

---

## Next Steps

1. **Review this plan** - Validate estimates and priorities
2. **Create project board** - Track progress (GitHub Projects)
3. **Schedule work** - Allocate time blocks
4. **Start with Task 1** - Redis caching (highest impact)
5. **Daily standup** - Review progress, blockers
6. **Weekly demo** - Show completed features
7. **Launch date** - Set target based on velocity

**Estimated Launch Date:** 2-3 weeks from start

---

**Questions or Issues?** Reference CLAUDE.md for guidance or reach out to the team.
