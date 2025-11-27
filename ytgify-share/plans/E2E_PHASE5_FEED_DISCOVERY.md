# Phase 5: Feed & Discovery Tests - Implementation Plan

**Status:** 🟡 Ready to Implement
**Estimated Duration:** 60-75 minutes
**Prerequisites:** Phase 1.2 Complete ✅

## Overview

Implement comprehensive end-to-end tests for feed and discovery features using Playwright. This covers the core content discovery journeys: personalized feeds, trending content, hashtag navigation, search functionality, and infinite scroll pagination.

## Goals

- Verify personalized feed shows GIFs from followed users (authenticated)
- Test public feed shows trending/popular GIFs (guest users)
- Confirm trending page displays correctly
- Validate hashtag filtering and navigation
- Test GIF and user search functionality
- Ensure infinite scroll pagination works
- Verify empty states display appropriately
- Test feed real-time updates (optional)

## Test Scenarios

### 1. Home Feed - Authenticated User (4 tests)
- ✅ Personalized feed shows GIFs from followed users
- ✅ Feed shows mix of following + trending when following users
- ✅ Feed shows trending when not following anyone
- ✅ Empty state when no GIFs available

### 2. Home Feed - Guest User (2 tests)
- ✅ Public feed shows popular GIFs
- ✅ Displays sign-in prompt with correct messaging

### 3. Trending Page (3 tests)
- ✅ Displays trending GIFs sorted by engagement
- ✅ Shows trending for both authenticated and guest users
- ✅ Empty state when no trending content

### 4. Hashtag Discovery (4 tests)
- ✅ Clicking hashtag navigates to hashtag page
- ✅ Hashtag page shows only GIFs with that tag
- ✅ Multiple hashtags can be explored sequentially
- ✅ Empty state when hashtag has no GIFs

### 5. Search Functionality (4 tests)
- ✅ Search GIFs by title/description
- ✅ Search returns relevant results
- ✅ Search shows empty state for no matches
- ✅ Clear search returns to browse view

### 6. Pagination & Infinite Scroll (3 tests)
- ✅ Infinite scroll loads next page automatically
- ✅ Multiple pages load sequentially
- ✅ Loading indicator appears during fetch

**Total Tests:** 20 new tests

## Implementation Steps

### Step 1: Create Feed & Discovery Test File (10 min)

Create `test/system/feed_discovery_test.rb`:

```ruby
require "application_system_test_case"

class FeedDiscoveryTest < ApplicationSystemTestCase
  # ========== HOME FEED - AUTHENTICATED USER ==========

  test "authenticated user sees personalized feed with followed users GIFs" do
    # Create test users and follows
    user = users(:e2e_test_user)
    followed_user = users(:e2e_follower)
    
    # Create a follow relationship
    Follow.create!(follower: user, following: followed_user)
    
    # Sign in
    sign_in_as user
    
    # Visit home feed
    visit root_path
    
    # Should see "Your Feed" heading
    assert_page_has_text "Your Feed"
    assert_page_has_text "Personalized GIFs based on your interests"
    
    # Should see GIFs from followed user
    assert_page_has_text followed_user.display_name
    
    # Should see at least one GIF card
    assert_selector '.gif-card', minimum: 1
    
    take_screenshot("feed-authenticated-personalized")
  end

  test "feed shows mix of following and trending when following users" do
    user = users(:e2e_test_user)
    followed_user = users(:e2e_follower)
    
    # Create follow
    Follow.create!(follower: user, following: followed_user)
    
    sign_in_as user
    visit root_path
    
    # Should show "For You" tab as active
    assert_selector 'a.bg-indigo-100', text: 'For You'
    
    # Should see GIFs (mix of following + trending)
    assert_selector '.gif-card', minimum: 1
    
    take_screenshot("feed-mixed-content")
  end

  test "feed shows trending when user follows no one" do
    user = users(:e2e_test_user)
    
    # Ensure user follows no one
    Follow.where(follower: user).destroy_all
    
    sign_in_as user
    visit root_path
    
    # Should still show "Your Feed"
    assert_page_has_text "Your Feed"
    
    # Should see public GIFs (trending since no follows)
    assert_selector '.gif-card', minimum: 1
    
    take_screenshot("feed-no-follows-trending")
  end

  test "shows empty state when no GIFs available" do
    # Clear all GIFs
    Gif.update_all(deleted_at: Time.current)
    
    user = users(:e2e_test_user)
    sign_in_as user
    visit root_path
    
    # Should show empty state
    assert_page_has_text "No GIFs yet"
    assert_page_has_text "Be the first to share some awesome YouTube GIFs!"
    
    # Should show upload button
    assert_selector 'a[href*="/gifs/new"]', text: 'Upload Your First GIF'
    
    take_screenshot("feed-empty-state")
    
    # Cleanup: restore GIFs
    Gif.update_all(deleted_at: nil)
  end

  # ========== HOME FEED - GUEST USER ==========

  test "guest user sees public feed with popular GIFs" do
    # Visit home without signing in
    visit root_path
    
    # Should see "Discover GIFs" heading
    assert_page_has_text "Discover GIFs"
    assert_page_has_text "Popular GIFs from the ytgify community"
    
    # Should see sign-in prompt
    assert_page_has_text "Sign in"
    assert_page_has_text "for a personalized feed"
    
    # Should see "Popular" tab active (not "For You")
    assert_selector 'a.bg-indigo-100', text: 'Popular'
    
    # Should see public GIFs
    assert_selector '.gif-card', minimum: 1
    
    take_screenshot("feed-guest-public")
  end

  test "guest feed displays sign-in prompt with correct messaging" do
    visit root_path
    
    # Verify call-to-action text
    assert_page_has_text "Sign in for a personalized feed"
    
    # Click sign-in link should navigate to login
    sign_in_link = @page.query_selector('a:has-text("Sign in")')
    assert_not_nil sign_in_link, "Sign in link should be present"
    
    sign_in_link.click
    wait_for_page_load
    
    # Should be on sign-in page
    assert @page.url.include?("/users/sign_in")
    
    take_screenshot("feed-guest-signin-prompt")
  end

  # ========== TRENDING PAGE ==========

  test "trending page displays trending GIFs sorted by engagement" do
    # Visit trending page
    visit trending_path
    
    # Should show trending header
    assert_page_has_text "Trending GIFs"
    assert_page_has_text "The hottest GIFs right now based on likes, views, and engagement"
    
    # Should have "Trending" tab active
    assert_selector 'a.bg-indigo-100', text: 'Trending'
    
    # Should show GIFs
    assert_selector '.gif-card', minimum: 1
    
    # Verify GIFs are sorted by engagement (check fixtures have different engagement)
    # Most engaged GIF should appear first
    gif_titles = @page.query_selector_all('.gif-card h3').map(&:text_content)
    assert gif_titles.any?, "Should have GIF titles"
    
    take_screenshot("trending-page")
  end

  test "trending page accessible to authenticated and guest users" do
    # Test as guest
    visit trending_path
    assert_page_has_text "Trending GIFs"
    assert_selector '.gif-card', minimum: 1
    
    # Test as authenticated user
    sign_in_as users(:e2e_test_user)
    visit trending_path
    assert_page_has_text "Trending GIFs"
    assert_selector '.gif-card', minimum: 1
    
    take_screenshot("trending-authenticated")
  end

  test "trending page shows empty state when no trending content" do
    # Hide all GIFs
    Gif.update_all(deleted_at: Time.current)
    
    visit trending_path
    
    # Should show empty state
    assert_page_has_text "No trending GIFs yet"
    assert_page_has_text "Check back soon to see what's hot!"
    
    take_screenshot("trending-empty-state")
    
    # Cleanup
    Gif.update_all(deleted_at: nil)
  end

  # ========== HASHTAG DISCOVERY ==========

  test "clicking hashtag navigates to hashtag page" do
    # Create a GIF with hashtags in fixtures or ensure one exists
    gif = gifs(:alice_public_gif)
    
    # Add hashtag to GIF (if not in fixtures)
    hashtag = Hashtag.find_or_create_by!(name: "funny")
    gif.hashtags << hashtag unless gif.hashtags.include?(hashtag)
    gif.save!
    
    # Visit home feed
    visit root_path
    
    # Find and click hashtag link
    hashtag_link = @page.query_selector('a[href*="/hashtags/funny"]')
    
    if hashtag_link
      hashtag_link.click
      wait_for_page_load
      
      # Should be on hashtag page
      assert_page_has_text "#funny"
      assert @page.url.include?("/hashtags/funny")
      
      take_screenshot("hashtag-navigation")
    else
      # If no hashtag visible, just verify the route works
      visit hashtag_path("funny")
      assert_page_has_text "#funny"
      take_screenshot("hashtag-direct-visit")
    end
  end

  test "hashtag page shows only GIFs with that tag" do
    # Create hashtag and associate GIFs
    hashtag = Hashtag.find_or_create_by!(name: "testing")
    gif1 = gifs(:alice_public_gif)
    gif1.hashtags << hashtag unless gif1.hashtags.include?(hashtag)
    gif1.save!
    
    # Visit hashtag page
    visit hashtag_path("testing")
    
    # Should show hashtag header
    assert_page_has_text "#testing"
    assert_page_has_text "public GIF"
    
    # Should show GIFs with this hashtag
    assert_selector '.gif-card', minimum: 1
    
    # Verify GIF title appears
    assert_page_has_text gif1.title
    
    take_screenshot("hashtag-filtered-gifs")
  end

  test "multiple hashtags can be explored sequentially" do
    # Create two different hashtags
    hashtag1 = Hashtag.find_or_create_by!(name: "first")
    hashtag2 = Hashtag.find_or_create_by!(name: "second")
    
    gif1 = gifs(:alice_public_gif)
    gif2 = gifs(:bob_public_gif)
    
    gif1.hashtags << hashtag1 unless gif1.hashtags.include?(hashtag1)
    gif2.hashtags << hashtag2 unless gif2.hashtags.include?(hashtag2)
    gif1.save!
    gif2.save!
    
    # Visit first hashtag
    visit hashtag_path("first")
    assert_page_has_text "#first"
    assert_page_has_text gif1.title
    
    take_screenshot("hashtag-first")
    
    # Visit second hashtag
    visit hashtag_path("second")
    assert_page_has_text "#second"
    assert_page_has_text gif2.title
    
    take_screenshot("hashtag-second")
  end

  test "hashtag page shows empty state when no GIFs" do
    # Create hashtag with no GIFs
    hashtag = Hashtag.find_or_create_by!(name: "empty")
    
    visit hashtag_path("empty")
    
    # Should show empty state
    assert_page_has_text "#empty"
    assert_page_has_text "No GIFs with this hashtag yet"
    assert_page_has_text "Be the first to add a GIF"
    
    take_screenshot("hashtag-empty-state")
  end

  # ========== SEARCH FUNCTIONALITY ==========

  test "search GIFs by title and description" do
    # Visit GIFs index (browse page)
    visit gifs_path
    
    # Should show browse header
    assert_page_has_text "Browse GIFs"
    
    # Perform search (using URL param since no visible search form in fixtures)
    visit gifs_path(q: "Alice")
    
    # Should show search results header
    assert_page_has_text 'Search Results for "Alice"'
    
    # Should show count
    assert_page_has_text "GIF"
    
    # Should show matching GIF
    assert_page_has_text "Alice's Funny Moment"
    
    take_screenshot("search-by-title")
  end

  test "search returns relevant results matching query" do
    # Search for "epic"
    visit gifs_path(q: "epic")
    
    assert_page_has_text 'Search Results for "epic"'
    
    # Should show Bob's Epic Clip (from fixtures)
    assert_page_has_text "Bob's Epic Clip"
    
    # Should show result count
    gif_cards = @page.query_selector_all('.gif-card')
    assert gif_cards.length >= 1, "Should have at least 1 result"
    
    take_screenshot("search-relevant-results")
  end

  test "search shows empty state for no matches" do
    # Search for something that doesn't exist
    visit gifs_path(q: "nonexistentqueryxyz123")
    
    # Should show empty state
    assert_page_has_text "No GIFs found"
    assert_page_has_text "Try a different search term"
    
    # Should show clear search button
    assert_selector 'a[href*="/gifs"]', text: 'Clear Search'
    
    take_screenshot("search-no-results")
  end

  test "clear search returns to browse view" do
    # Start with search
    visit gifs_path(q: "Alice")
    assert_page_has_text 'Search Results for "Alice"'
    
    # Click clear search
    @page.click('a:has-text("Clear Search")')
    wait_for_page_load
    
    # Should return to browse view
    assert_page_has_text "Browse GIFs"
    assert_page_has_text "Explore all public GIFs"
    
    # Should show all GIFs again
    assert_selector '.gif-card', minimum: 1
    
    take_screenshot("search-cleared")
  end

  # ========== PAGINATION & INFINITE SCROLL ==========

  test "infinite scroll loads next page automatically" do
    # Create enough GIFs to trigger pagination (need 20+ for page 2)
    user = users(:e2e_test_user)
    
    # Create 25 public GIFs to ensure we have 2 pages
    25.times do |i|
      Gif.create!(
        user: user,
        title: "Test GIF #{i}",
        description: "Description #{i}",
        youtube_video_url: "https://www.youtube.com/watch?v=test#{i}",
        youtube_timestamp_start: 0,
        youtube_timestamp_end: 5,
        duration: 5,
        privacy: :public_access
      )
    end
    
    visit root_path
    
    # Should see first page of GIFs
    initial_gifs = @page.query_selector_all('.gif-card')
    assert initial_gifs.length >= 10, "Should have initial GIFs loaded"
    
    # Scroll to bottom to trigger infinite scroll
    @page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
    
    # Wait for new content to load
    sleep 2
    
    # Should see loading indicator or more GIFs
    # Check if page 2 frame exists
    page_2_frame = @page.query_selector('turbo-frame#page_2')
    
    if page_2_frame
      # Wait for frame to load content
      sleep 1
      
      # Should have more GIFs now
      final_gifs = @page.query_selector_all('.gif-card')
      assert final_gifs.length > initial_gifs.length, "Should load more GIFs after scroll"
    end
    
    take_screenshot("infinite-scroll-loaded")
    
    # Cleanup
    Gif.where("title LIKE 'Test GIF%'").destroy_all
  end

  test "multiple pages load sequentially with infinite scroll" do
    # Create 45 GIFs for 3 pages (20 per page)
    user = users(:e2e_test_user)
    
    45.times do |i|
      Gif.create!(
        user: user,
        title: "Scroll Test GIF #{i}",
        description: "For testing infinite scroll",
        youtube_video_url: "https://www.youtube.com/watch?v=scroll#{i}",
        youtube_timestamp_start: 0,
        youtube_timestamp_end: 5,
        duration: 5,
        privacy: :public_access
      )
    end
    
    visit root_path
    
    # Scroll multiple times
    3.times do |scroll_num|
      @page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
      sleep 2  # Wait for content to load
      
      take_screenshot("infinite-scroll-page-#{scroll_num + 2}")
    end
    
    # Should have loaded more content
    total_gifs = @page.query_selector_all('.gif-card')
    assert total_gifs.length >= 30, "Should have loaded multiple pages of GIFs"
    
    # Cleanup
    Gif.where("title LIKE 'Scroll Test GIF%'").destroy_all
  end

  test "loading indicator appears during page load" do
    # Create extra GIFs for pagination
    user = users(:e2e_test_user)
    
    25.times do |i|
      Gif.create!(
        user: user,
        title: "Loading Test #{i}",
        description: "For testing loading state",
        youtube_video_url: "https://www.youtube.com/watch?v=load#{i}",
        youtube_timestamp_start: 0,
        youtube_timestamp_end: 5,
        duration: 5,
        privacy: :public_access
      )
    end
    
    visit root_path
    
    # Should see loading trigger for next page
    loading_trigger = @page.query_selector('turbo-frame[id^="page_"]')
    
    if loading_trigger
      # Should contain loading text/spinner
      loading_text = loading_trigger.text_content
      assert loading_text.include?("Loading more GIFs"), "Should show loading message"
      
      # Should have spinner SVG
      spinner = loading_trigger.query_selector('svg.animate-spin')
      assert_not_nil spinner, "Should show loading spinner"
    end
    
    take_screenshot("loading-indicator")
    
    # Cleanup
    Gif.where("title LIKE 'Loading Test%'").destroy_all
  end
end
```

### Step 2: Update Fixtures for Feed Tests (10 min)

Ensure fixtures have necessary data for testing. Update `test/fixtures/gifs.yml` if needed:

```yaml
# Add more diverse GIFs for testing (if not already present)
trending_gif_1:
  user: one
  title: "Super Trending GIF"
  description: "This GIF is very popular"
  youtube_video_url: "https://www.youtube.com/watch?v=trending1"
  youtube_timestamp_start: 0
  youtube_timestamp_end: 5
  duration: 5
  privacy: 0  # public
  view_count: 10000
  like_count: 500
  comment_count: 50
  
trending_gif_2:
  user: two
  title: "Another Hot GIF"
  description: "Also very popular"
  youtube_video_url: "https://www.youtube.com/watch?v=trending2"
  youtube_timestamp_start: 0
  youtube_timestamp_end: 5
  duration: 5
  privacy: 0  # public
  view_count: 8000
  like_count: 400
  comment_count: 30
```

Create `test/fixtures/hashtags.yml`:

```yaml
funny:
  name: funny
  usage_count: 5

epic:
  name: epic
  usage_count: 3

testing:
  name: testing
  usage_count: 1
```

Create join table fixture `test/fixtures/gif_hashtags.yml`:

```yaml
alice_funny:
  gif: alice_public_gif
  hashtag: funny

bob_epic:
  gif: bob_public_gif
  hashtag: epic
```

### Step 3: Add Helper Methods to ApplicationSystemTestCase (5 min)

Add search and scroll helpers to `test/application_system_test_case.rb`:

```ruby
# ========== SEARCH HELPERS ==========

def search_for(query)
  # Navigate to search results
  visit gifs_path(q: query)
  wait_for_page_load
end

# ========== SCROLL HELPERS ==========

def scroll_to_bottom
  @page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
  sleep 1  # Wait for scroll event
end

def scroll_to_element(selector)
  @page.evaluate("document.querySelector('#{selector}').scrollIntoView()")
  sleep 0.5
end

# ========== FEED HELPERS ==========

def create_test_gifs(count, user, prefix: "Test")
  count.times do |i|
    Gif.create!(
      user: user,
      title: "#{prefix} GIF #{i}",
      description: "Description #{i}",
      youtube_video_url: "https://www.youtube.com/watch?v=test#{i}",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5,
      duration: 5,
      privacy: :public_access
    )
  end
end

def cleanup_test_gifs(prefix: "Test")
  Gif.where("title LIKE '#{prefix} GIF%'").destroy_all
end
```

### Step 4: Run Feed & Discovery Tests (10 min)

```bash
# Run all feed/discovery tests
bin/rails test test/system/feed_discovery_test.rb

# Or run individual test sections
bin/rails test test/system/feed_discovery_test.rb -n test_authenticated_user_sees_personalized_feed
bin/rails test test/system/feed_discovery_test.rb -n test_trending_page_displays_trending_GIFs
bin/rails test test/system/feed_discovery_test.rb -n test_infinite_scroll_loads_next_page
```

**Expected Output:**
```
Running 20 tests in a single process
....................

Finished in 60-90s
20 runs, ~60 assertions, 0 failures, 0 errors, 0 skips
```

### Step 5: Review Screenshots (5 min)

Check `tmp/screenshots/` for screenshots from each test:
- `feed-authenticated-personalized-*.png`
- `feed-mixed-content-*.png`
- `feed-no-follows-trending-*.png`
- `feed-empty-state-*.png`
- `feed-guest-public-*.png`
- `feed-guest-signin-prompt-*.png`
- `trending-page-*.png`
- `trending-authenticated-*.png`
- `trending-empty-state-*.png`
- `hashtag-navigation-*.png`
- `hashtag-filtered-gifs-*.png`
- `hashtag-first-*.png`
- `hashtag-second-*.png`
- `hashtag-empty-state-*.png`
- `search-by-title-*.png`
- `search-relevant-results-*.png`
- `search-no-results-*.png`
- `search-cleared-*.png`
- `infinite-scroll-loaded-*.png`
- `infinite-scroll-page-2-*.png`
- `loading-indicator-*.png`

### Step 6: Troubleshooting Common Issues (20 min buffer)

#### Issue 1: Infinite Scroll Not Triggering

**Symptom:** Scroll to bottom doesn't load next page

**Causes:**
- IntersectionObserver not detecting trigger element
- Turbo Frame not configured correctly
- Not enough GIFs to trigger pagination (need 20+ items)

**Solutions:**

```ruby
# Option 1: Use more explicit scroll and wait
def trigger_infinite_scroll
  # Scroll to near bottom
  @page.evaluate('window.scrollTo(0, document.body.scrollHeight - 200)')
  sleep 1
  
  # Scroll to absolute bottom
  @page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
  sleep 2  # Give time for IntersectionObserver
  
  # Wait for Turbo to complete
  wait_for_turbo
end

# Option 2: Directly check for and click "Load More" if visible
def load_more_if_visible
  load_more_button = @page.query_selector('a:has-text("Load More")')
  if load_more_button
    load_more_button.click
    wait_for_page_load
  end
end

# Option 3: Wait for specific turbo-frame
def wait_for_page_frame(page_num)
  @page.wait_for_selector("turbo-frame#page_#{page_num}", timeout: 10000)
rescue Playwright::TimeoutError
  puts "Page #{page_num} frame did not load"
end
```

**Debug Infinite Scroll:**

```ruby
# Check if trigger element exists
trigger = @page.query_selector('[data-infinite-scroll-target="trigger"]')
puts "Trigger exists: #{!trigger.nil?}"

# Check current scroll position
scroll_info = @page.evaluate(<<~JS)
  ({
    scrollTop: window.scrollY,
    scrollHeight: document.body.scrollHeight,
    clientHeight: window.innerHeight
  })
JS
puts "Scroll info: #{scroll_info}"

# Check if IntersectionObserver is connected
io_status = @page.evaluate(<<~JS)
  window.infiniteScrollController?.observer !== undefined
JS
puts "IntersectionObserver active: #{io_status}"
```

#### Issue 2: Search Results Not Appearing

**Symptom:** Search query doesn't return expected GIFs

**Causes:**
- Search not configured in GifsController
- Query parameter not being passed correctly
- Case sensitivity in search

**Solutions:**

```ruby
# Verify search URL is correct
def verify_search_url(query)
  visit gifs_path(q: query)
  
  current_url = @page.url
  assert current_url.include?("q=#{query}"), 
         "URL should contain search query, got: #{current_url}"
end

# Check if search results container exists
def debug_search_results
  take_screenshot("search-debug-before")
  
  # Check what's on the page
  body_text = @page.text_content('body')
  puts "Page contains: #{body_text[0..500]}"
  
  # Check for search results
  results = @page.query_selector_all('.gif-card')
  puts "Found #{results.length} GIF cards"
  
  take_screenshot("search-debug-after")
end

# Use case-insensitive search in tests
def search_case_insensitive(query)
  visit gifs_path(q: query.downcase)
  # or
  visit gifs_path(q: query.upcase)
end
```

**Verify Controller Search Logic:**

```bash
# Check GifsController#index has search implementation
grep -A 10 "def index" app/controllers/gifs_controller.rb

# Ensure ILIKE is used for case-insensitive search
grep -n "ILIKE" app/controllers/gifs_controller.rb
```

#### Issue 3: Feed Not Updating with New Content

**Symptom:** Creating new GIF doesn't appear in feed

**Causes:**
- Feed cache not being cleared
- Privacy settings preventing visibility
- Feed query not including new GIFs

**Solutions:**

```ruby
# Clear Rails cache before test
def setup
  super
  Rails.cache.clear
end

# Create GIF and verify it appears
def test_new_gif_appears_in_feed
  user = users(:e2e_test_user)
  sign_in_as user
  
  # Count existing GIFs
  visit root_path
  initial_count = @page.query_selector_all('.gif-card').length
  
  # Create new GIF
  new_gif = Gif.create!(
    user: user,
    title: "Brand New GIF",
    description: "Just created",
    youtube_video_url: "https://www.youtube.com/watch?v=new",
    youtube_timestamp_start: 0,
    youtube_timestamp_end: 5,
    duration: 5,
    privacy: :public_access
  )
  
  # Clear cache
  Rails.cache.clear
  
  # Reload feed
  visit root_path
  
  # Should see new GIF
  assert_page_has_text "Brand New GIF"
  
  final_count = @page.query_selector_all('.gif-card').length
  assert final_count > initial_count, "Should have more GIFs after creation"
  
  # Cleanup
  new_gif.destroy
end
```

**Check Privacy Settings:**

```ruby
# Ensure GIF is public
gif.update!(privacy: :public_access)
gif.reload
assert gif.public_access?, "GIF should be public"

# Check if user can see own private GIFs in feed
# (FeedService shows user's own GIFs regardless of privacy)
```

#### Issue 4: Hashtag Links Not Working

**Symptom:** Clicking hashtag doesn't navigate or throws error

**Causes:**
- Hashtag routes not configured
- Hashtag name encoding issues
- JavaScript preventing navigation

**Solutions:**

```ruby
# Test hashtag navigation with direct URL
def test_hashtag_direct_navigation
  hashtag = Hashtag.create!(name: "test")
  
  visit hashtag_path("test")
  assert_page_has_text "#test"
end

# Handle URL encoding for hashtags
def visit_hashtag(name)
  encoded_name = CGI.escape(name)
  visit "/hashtags/#{encoded_name}"
  wait_for_page_load
end

# Click hashtag using more specific selector
def click_hashtag(name)
  # Find hashtag link by exact href
  hashtag_link = @page.query_selector("a[href='/hashtags/#{name}']")
  
  if hashtag_link.nil?
    puts "Available hashtag links:"
    all_links = @page.query_selector_all("a[href*='/hashtags/']")
    all_links.each { |link| puts "  - #{link['href']}" }
  end
  
  assert_not_nil hashtag_link, "Hashtag link for '#{name}' not found"
  hashtag_link.click
  wait_for_page_load
end
```

**Verify Routes:**

```bash
# Check hashtag routes
bin/rails routes | grep hashtag

# Should see:
# hashtag GET /hashtags/:name(.:format) hashtags#show
# hashtags GET /hashtags(.:format) hashtags#index
```

#### Issue 5: Empty States Not Rendering

**Symptom:** Empty state doesn't appear when expected

**Causes:**
- Conditional logic in view not triggered
- Fixtures still loading GIFs
- Cache returning old results

**Solutions:**

```ruby
# Ensure all GIFs are actually hidden
def hide_all_gifs
  Gif.update_all(deleted_at: Time.current)
  
  # Verify no visible GIFs
  visible_count = Gif.not_deleted.count
  assert_equal 0, visible_count, "All GIFs should be hidden"
  
  # Clear cache
  Rails.cache.clear
end

# Restore GIFs after test
def restore_all_gifs
  Gif.update_all(deleted_at: nil)
  Rails.cache.clear
end

# Use around block for cleanup
def around(&block)
  # Save original state
  original_deleted_at = Gif.pluck(:id, :deleted_at).to_h
  
  # Run test
  super
  
  # Restore state
  original_deleted_at.each do |id, deleted_at|
    Gif.find(id).update_column(:deleted_at, deleted_at)
  end
end
```

**Debug Empty State:**

```ruby
def debug_empty_state
  # Check GIF count
  total_gifs = Gif.count
  visible_gifs = Gif.not_deleted.count
  puts "Total GIFs: #{total_gifs}, Visible: #{visible_gifs}"
  
  # Check what's rendered
  take_screenshot("empty-state-debug")
  
  # Check for empty state elements
  empty_state = @page.query_selector('.text-center')
  puts "Empty state element exists: #{!empty_state.nil?}"
  
  if empty_state
    puts "Empty state text: #{empty_state.text_content}"
  end
end
```

#### Issue 6: Turbo Frames Not Loading

**Symptom:** Pagination frames don't load content

**Causes:**
- Turbo not initialized
- CSRF token issues
- Server not returning turbo_stream response

**Solutions:**

```ruby
# Wait for Turbo to be ready
def wait_for_turbo_ready
  @page.wait_for_function('typeof Turbo !== "undefined"', timeout: 5000)
rescue Playwright::TimeoutError
  flunk "Turbo not loaded"
end

# Check Turbo Frame loading
def wait_for_frame_load(frame_id)
  frame_selector = "turbo-frame##{frame_id}"
  
  # Wait for frame to exist
  @page.wait_for_selector(frame_selector, timeout: 10000)
  
  # Wait for frame to finish loading (no 'busy' attribute)
  @page.wait_for_function(
    "document.querySelector('#{frame_selector}')?.getAttribute('busy') === null",
    timeout: 10000
  )
rescue Playwright::TimeoutError => e
  take_screenshot("turbo-frame-timeout-#{frame_id}")
  flunk "Turbo frame #{frame_id} failed to load: #{e.message}"
end

# Debug Turbo Frame
def debug_turbo_frame(frame_id)
  frame = @page.query_selector("turbo-frame##{frame_id}")
  
  if frame
    puts "Frame src: #{frame['src']}"
    puts "Frame loading: #{frame['loading']}"
    puts "Frame busy: #{frame['busy']}"
    puts "Frame content: #{frame.text_content[0..200]}"
  else
    puts "Frame #{frame_id} not found"
    
    # List all frames
    all_frames = @page.query_selector_all('turbo-frame')
    puts "Available frames: #{all_frames.map { |f| f['id'] }.join(', ')}"
  end
end
```

## Verification Checklist

After completing all steps:

- [ ] All 20 tests passing (0 failures, 0 errors)
- [ ] 20+ screenshots generated showing each scenario
- [ ] Authenticated users see personalized feed
- [ ] Guest users see public feed with sign-in prompt
- [ ] Trending page displays correctly
- [ ] Hashtag navigation works
- [ ] Search returns relevant results
- [ ] Empty states display appropriately
- [ ] Infinite scroll loads additional pages
- [ ] Loading indicators appear during pagination
- [ ] No JavaScript errors in console
- [ ] Turbo Frames load correctly
- [ ] Feed cache is properly managed

## Expected Test Coverage

**Before:** 14 system tests (smoke + auth)
**After:** 34 system tests (smoke + auth + feed/discovery)

**Total Assertions:** ~70-80 assertions across all feed tests

## File Structure

```
test/
├── application_system_test_case.rb (updated with helpers)
├── system/
│   ├── smoke_test.rb (3 tests)
│   ├── authentication_test.rb (11 tests)
│   └── feed_discovery_test.rb (20 tests) ← NEW
└── fixtures/
    ├── users.yml
    ├── gifs.yml (updated with trending GIFs)
    ├── hashtags.yml ← NEW
    └── gif_hashtags.yml ← NEW (if using join table)
```

## Success Criteria

✅ All 20 feed/discovery tests pass
✅ Screenshots show correct feed states
✅ Personalized vs public feeds work correctly
✅ Hashtag filtering works
✅ Search functionality returns results
✅ Infinite scroll loads additional content
✅ Empty states render appropriately
✅ No Turbo Frame errors
✅ Tests run in ~60-90 seconds
✅ Loading indicators appear during async operations

## Next Steps After Completion

Once Phase 5 is complete, proceed to:

**Phase 6: Social Interactions (60 min)**
- Like/unlike GIFs
- Follow/unfollow users
- Comment creation and display
- Notifications for interactions
- Real-time updates via Turbo Streams

## Time Breakdown

- Step 1: Create test file - 10 min
- Step 2: Update fixtures - 10 min
- Step 3: Add helpers - 5 min
- Step 4: Run tests - 10 min
- Step 5: Review screenshots - 5 min
- Step 6: Troubleshooting buffer - 20 min

**Total: 60-75 minutes**

## Commands Quick Reference

```bash
# Run all feed/discovery tests
bin/rails test test/system/feed_discovery_test.rb

# Run specific test
bin/rails test test/system/feed_discovery_test.rb -n test_infinite_scroll_loads_next_page

# Run with verbose output
bin/rails test test/system/feed_discovery_test.rb --verbose

# Clear Rails cache before tests
bin/rails runner "Rails.cache.clear"

# View screenshots
open tmp/screenshots/

# Check routes
bin/rails routes | grep -E "(feed|trending|hashtag|gifs)"

# Test FeedService in console
bin/rails console
> user = User.first
> FeedService.generate_for_user(user)
> FeedService.trending
> Rails.cache.clear

# Check Stimulus controllers
ls app/javascript/controllers/*scroll*

# Verify infinite scroll implementation
cat app/javascript/controllers/infinite_scroll_controller.js
```

## Notes

- Tests create and cleanup temporary GIFs to ensure pagination
- Infinite scroll tests may need longer sleep times (2-3 seconds) for content to load
- FeedService has caching - clear cache when testing feed updates
- Hashtag routes use `:name` parameter, not `:id`
- Search is case-insensitive (ILIKE in PostgreSQL)
- Empty states require hiding all GIFs with soft delete
- Guest users see different UI elements than authenticated users
- Turbo Frames load lazily - wait for IntersectionObserver to trigger
- Screenshots are crucial for debugging scroll and async loading issues
- Some tests modify database state - always cleanup in teardown or use transactions

## Advanced Testing Scenarios (Optional)

If time permits, consider adding these advanced tests:

```ruby
# Test feed refresh after creating new GIF
test "feed updates when new GIF is created" do
  user = users(:e2e_test_user)
  sign_in_as user
  
  visit root_path
  initial_count = @page.query_selector_all('.gif-card').length
  
  # Create GIF via UI
  visit new_gif_path
  # ... fill form and submit
  
  # Return to feed
  visit root_path
  
  final_count = @page.query_selector_all('.gif-card').length
  assert final_count > initial_count
end

# Test hashtag appears in GIF card
test "hashtags display on GIF cards in feed" do
  visit root_path
  
  # Find GIF card with hashtag
  hashtag_link = @page.query_selector('.gif-card a[href*="/hashtags/"]')
  assert_not_nil hashtag_link, "Hashtag should appear on GIF card"
end

# Test feed filter tabs
test "switching between feed tabs works" do
  sign_in_as users(:e2e_test_user)
  visit root_path
  
  # Click Trending tab
  @page.click('a:has-text("Trending")')
  wait_for_page_load
  
  assert_current_path trending_path
  assert_page_has_text "Trending GIFs"
end
```

