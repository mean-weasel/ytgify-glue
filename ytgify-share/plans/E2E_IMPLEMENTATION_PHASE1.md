# E2E Tests - Phase 1 Implementation Plan

**Goal:** Establish system test infrastructure and implement first critical e2e tests
**Time Estimate:** 2-2.5 hours
**Coverage:** Infrastructure setup, Authentication flows, GIF creation (core journey)

---

## Overview

This is a detailed, step-by-step implementation plan for the first set of e2e tests. We'll build:

1. **Infrastructure** - Playwright setup, test helpers, fixtures
2. **Authentication Tests** - Signup, login, logout, session management
3. **Core GIF Upload Test** - End-to-end GIF creation flow

---

## Phase 1.1: Install & Configure Playwright (30 minutes)

### Step 1.1.1: Add Playwright Gem (5 minutes)

**File:** `Gemfile`

Add to the test group (around line 72):

```ruby
group :test do
  # Existing gems...
  gem "simplecov", require: false
  gem "simplecov-html", require: false

  # System testing with Playwright
  gem "playwright-ruby-client"
end
```

**Commands:**
```bash
cd /Users/jeremywatt/Desktop/ytgify-share

# Install gem
bundle install

# Install Playwright browser binaries
npx playwright install chromium

# Verify installation
npx playwright --version
```

**Expected Output:**
```
Fetching playwright-ruby-client...
...
Successfully installed playwright-ruby-client
Installing browsers (chromium, chromium-headless-shell)
Playwright 1.x.x installed successfully
```

---

### Step 1.1.2: Create ApplicationSystemTestCase (10 minutes)

**File:** `test/application_system_test_case.rb` (NEW FILE)

```ruby
require "test_helper"
require "playwright"

class ApplicationSystemTestCase < ActionDispatch::IntegrationTest
  # Playwright setup
  def setup
    super

    # Start Playwright
    @playwright = Playwright.create(playwright_cli_executable_path: 'npx playwright')
    @browser = @playwright.playwright.chromium.launch(
      headless: true,  # Set to false for debugging
      args: ['--disable-dev-shm-usage', '--no-sandbox']
    )

    # Create browser context with viewport
    @context = @browser.new_context(
      viewport: { width: 1400, height: 1400 },
      locale: 'en-US'
    )

    # Create page
    @page = @context.new_page
  end

  def teardown
    # Take screenshot on failure
    if !passed? && @page
      take_screenshot("failure-#{name}")
    end

    # Cleanup
    @page&.close
    @context&.close
    @browser&.close
    @playwright&.stop
    super
  end

  # Helper to access current page
  attr_reader :page

  # ========== NAVIGATION HELPERS ==========

  def visit(path)
    # Use test server port (3001 to avoid conflicts)
    @page.goto("http://localhost:3001#{path}")
    wait_for_page_load
  end

  def wait_for_page_load
    # Wait for page to be fully loaded
    @page.wait_for_load_state('domcontentloaded', timeout: 10000)
  end

  # ========== AUTHENTICATION HELPERS ==========

  def sign_in_as(user)
    visit new_user_session_path

    # Fill in form
    @page.fill('input[name="user[email]"]', user.email)
    @page.fill('input[name="user[password]"]', 'password123')

    # Submit
    @page.click('input[type="submit"]')

    # Wait for redirect
    wait_for_page_load

    # Verify signed in
    assert_page_has_text user.username
  end

  def sign_out
    # Click account menu
    @page.click('button:has-text("Account")')

    # Click sign out link
    @page.click('a:has-text("Sign out")')

    wait_for_page_load
  end

  # ========== TURBO HELPERS ==========

  def wait_for_turbo
    # Wait for Turbo progress bar to disappear
    begin
      @page.wait_for_selector('.turbo-progress-bar', state: 'hidden', timeout: 5000)
    rescue Playwright::TimeoutError
      # Progress bar may not appear for fast requests
    end
  end

  def wait_for_stimulus(controller_name)
    @page.wait_for_selector("[data-controller='#{controller_name}']", timeout: 5000)
  end

  # ========== ASSERTION HELPERS ==========

  def assert_page_has_text(text)
    body_text = @page.text_content('body')
    assert body_text.include?(text),
           "Expected page to contain '#{text}', but page contains:\n#{body_text[0..500]}"
  end

  def assert_page_missing_text(text)
    body_text = @page.text_content('body')
    assert !body_text.include?(text),
           "Expected page NOT to contain '#{text}', but it was found"
  end

  def assert_current_path(expected_path)
    current_url = @page.url
    expected_url = "http://localhost:3001#{expected_path}"

    assert_equal expected_url, current_url,
                 "Expected path to be '#{expected_path}', but was '#{current_url}'"
  end

  def assert_selector(selector, **options)
    timeout = options[:timeout] || 5000
    count = options[:count]

    if count
      elements = @page.query_selector_all(selector)
      assert_equal count, elements.length,
                   "Expected #{count} elements matching '#{selector}', found #{elements.length}"
    else
      element = @page.wait_for_selector(selector, timeout: timeout)
      assert_not_nil element, "Expected to find element matching '#{selector}'"
    end
  end

  def assert_no_selector(selector, **options)
    timeout = options[:timeout] || 1000

    begin
      @page.wait_for_selector(selector, state: 'hidden', timeout: timeout)
      # Element not found or hidden - good!
    rescue Playwright::TimeoutError
      # Element still visible - assertion failed
      flunk "Expected NOT to find element matching '#{selector}', but it was found"
    end
  end

  # ========== UTILITY HELPERS ==========

  def take_screenshot(name = "screenshot")
    FileUtils.mkdir_p('tmp/screenshots')
    timestamp = Time.now.strftime("%Y%m%d-%H%M%S")
    filename = "#{name}-#{timestamp}.png"
    @page.screenshot(path: "tmp/screenshots/#{filename}")
    puts "📸 Screenshot saved: tmp/screenshots/#{filename}"
  end

  def accept_confirm(&block)
    # Handle JavaScript confirm dialogs
    @page.once('dialog', ->(dialog) {
      dialog.accept
    })
    yield
  end

  def dismiss_confirm(&block)
    # Handle JavaScript confirm dialogs
    @page.once('dialog', ->(dialog) {
      dialog.dismiss
    })
    yield
  end

  # Check if test passed (for teardown)
  def passed?
    !failure && !error
  end
end
```

**Create test directory:**
```bash
mkdir -p test/system
mkdir -p tmp/screenshots
```

---

### Step 1.1.3: Configure Test Server (10 minutes)

**File:** `test/test_helper.rb`

Add after existing configuration (around line 10):

```ruby
# ... existing SimpleCov config ...

ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

# Configure test server for system tests
# Use port 3001 to avoid conflicts with development server
if defined?(Capybara)
  Capybara.server = :puma, { Silent: true }
  Capybara.server_port = 3001
else
  # Define minimal Capybara config for system tests
  module Capybara
    def self.server_port
      3001
    end
  end
end

module ActiveSupport
  class TestCase
    # ... existing config ...
  end
end
```

---

### Step 1.1.4: Create System Test Fixtures (5 minutes)

We need predictable test data for system tests. Update existing fixtures:

**File:** `test/fixtures/users.yml`

Add at the end:

```yaml
# System test user - predictable credentials for E2E tests
e2e_test_user:
  id: <%= SecureRandom.uuid %>
  username: e2e_tester
  email: e2e@example.com
  encrypted_password: <%= Devise::Encryptor.digest(User, 'password123') %>
  created_at: <%= 30.days.ago %>
  updated_at: <%= 1.day.ago %>
  gifs_count: 0
  followers_count: 0
  following_count: 0
  jti: <%= SecureRandom.uuid %>

e2e_follower:
  id: <%= SecureRandom.uuid %>
  username: e2e_follower
  email: follower@e2e.com
  encrypted_password: <%= Devise::Encryptor.digest(User, 'password123') %>
  gifs_count: 2
  followers_count: 0
  following_count: 0
  jti: <%= SecureRandom.uuid %>
```

**File:** `test/fixtures/gifs.yml`

Add at the end:

```yaml
e2e_public_gif:
  id: <%= SecureRandom.uuid %>
  user: e2e_follower
  title: "E2E Test Public GIF"
  youtube_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  start_time: 10.5
  end_time: 15.0
  privacy: public_access
  views_count: 50
  likes_count: 3
  comments_count: 1
  created_at: <%= 2.days.ago %>
```

---

### Step 1.1.5: Verify Setup with Smoke Test (5 minutes)

Create a simple test to verify everything works:

**File:** `test/system/smoke_test.rb` (NEW FILE)

```ruby
require "application_system_test_case"

class SmokeTest < ApplicationSystemTestCase
  test "can visit home page" do
    visit root_path

    assert_page_has_text "ytgify"
    take_screenshot("smoke-test-home")
  end

  test "can visit trending page" do
    visit trending_path

    assert_page_has_text "Trending"
    take_screenshot("smoke-test-trending")
  end
end
```

**Run smoke test:**
```bash
# Start test server in background (if not already running)
bin/rails test:system test/system/smoke_test.rb
```

**Expected Output:**
```
Run options: --seed XXXXX

# Running:

..

Finished in 3.5s, 0.57 runs/s, 0.57 assertions/s.
2 runs, 2 assertions, 0 failures, 0 errors, 0 skips
```

---

## Phase 1.2: Authentication Flow Tests (45 minutes)

### Step 1.2.1: User Signup Tests (15 minutes)

**File:** `test/system/authentication/signup_test.rb` (NEW FILE)

```ruby
require "application_system_test_case"

class SignupTest < ApplicationSystemTestCase
  test "user can sign up with valid credentials" do
    visit root_path

    # Click sign up link
    @page.click('a:has-text("Sign up")')
    wait_for_page_load

    # Fill in registration form
    @page.fill('input[name="user[username]"]', "newe2euser")
    @page.fill('input[name="user[email]"]', "newe2e@example.com")
    @page.fill('input[name="user[password]"]', "password123")
    @page.fill('input[name="user[password_confirmation]"]', "password123")

    # Submit form
    @page.click('input[type="submit"]')
    wait_for_page_load

    # Should redirect to root path
    assert_current_path root_path

    # Should show username in navbar
    assert_page_has_text "newe2euser"

    # Verify user was created in database
    user = User.find_by(username: "newe2euser")
    assert_not_nil user
    assert_equal "newe2e@example.com", user.email

    take_screenshot("signup-success")
  end

  test "signup fails with invalid email" do
    visit new_user_registration_path

    @page.fill('input[name="user[username]"]', "testuser")
    @page.fill('input[name="user[email]"]', "invalid-email")
    @page.fill('input[name="user[password]"]', "password123")
    @page.fill('input[name="user[password_confirmation]"]', "password123")

    @page.click('input[type="submit"]')
    wait_for_page_load

    # Should show error message
    assert_page_has_text "Email is invalid"

    # Should stay on registration page
    assert_current_path user_registration_path

    take_screenshot("signup-invalid-email")
  end

  test "signup fails with mismatched passwords" do
    visit new_user_registration_path

    @page.fill('input[name="user[username]"]', "testuser")
    @page.fill('input[name="user[email]"]', "test@example.com")
    @page.fill('input[name="user[password]"]', "password123")
    @page.fill('input[name="user[password_confirmation]"]', "different456")

    @page.click('input[type="submit"]')
    wait_for_page_load

    assert_page_has_text "Password confirmation doesn't match"

    take_screenshot("signup-password-mismatch")
  end

  test "signup fails with duplicate username" do
    existing_user = users(:e2e_test_user)
    visit new_user_registration_path

    @page.fill('input[name="user[username]"]', existing_user.username)
    @page.fill('input[name="user[email]"]', "unique@example.com")
    @page.fill('input[name="user[password]"]', "password123")
    @page.fill('input[name="user[password_confirmation]"]', "password123")

    @page.click('input[type="submit"]')
    wait_for_page_load

    assert_page_has_text "Username has already been taken"

    take_screenshot("signup-duplicate-username")
  end
end
```

**Create directory:**
```bash
mkdir -p test/system/authentication
```

**Run signup tests:**
```bash
bin/rails test:system test/system/authentication/signup_test.rb
```

---

### Step 1.2.2: User Login Tests (15 minutes)

**File:** `test/system/authentication/login_test.rb` (NEW FILE)

```ruby
require "application_system_test_case"

class LoginTest < ApplicationSystemTestCase
  test "user can login with valid credentials" do
    user = users(:e2e_test_user)

    visit root_path
    @page.click('a:has-text("Log in")')
    wait_for_page_load

    # Fill in login form
    @page.fill('input[name="user[email]"]', user.email)
    @page.fill('input[name="user[password]"]', 'password123')

    # Submit
    @page.click('input[type="submit"]')
    wait_for_page_load

    # Should redirect to root
    assert_current_path root_path

    # Should show username
    assert_page_has_text user.username

    # Should show "Account" button (sign of being logged in)
    assert_selector('button:has-text("Account")')

    take_screenshot("login-success")
  end

  test "login fails with invalid password" do
    user = users(:e2e_test_user)

    visit new_user_session_path

    @page.fill('input[name="user[email]"]', user.email)
    @page.fill('input[name="user[password]"]', 'wrongpassword')
    @page.click('input[type="submit"]')
    wait_for_page_load

    # Should show error
    assert_page_has_text "Invalid Email or password"

    # Should stay on login page
    assert_page_has_text "Welcome back"

    take_screenshot("login-invalid-password")
  end

  test "login fails with non-existent email" do
    visit new_user_session_path

    @page.fill('input[name="user[email]"]', "nonexistent@example.com")
    @page.fill('input[name="user[password]"]', 'password123')
    @page.click('input[type="submit"]')
    wait_for_page_load

    assert_page_has_text "Invalid Email or password"

    take_screenshot("login-nonexistent-email")
  end

  test "user can logout" do
    user = users(:e2e_test_user)
    sign_in_as(user)

    # Click account button
    @page.click('button:has-text("Account")')

    # Click sign out
    @page.click('a:has-text("Sign out")')
    wait_for_page_load

    # Should redirect to root
    assert_current_path root_path

    # Should show "Log in" link again
    assert_selector('a:has-text("Log in")')

    # Should NOT show username
    assert_page_missing_text user.username

    take_screenshot("logout-success")
  end
end
```

**Run login tests:**
```bash
bin/rails test:system test/system/authentication/login_test.rb
```

---

### Step 1.2.3: Session Persistence Tests (15 minutes)

**File:** `test/system/authentication/session_test.rb` (NEW FILE)

```ruby
require "application_system_test_case"

class SessionTest < ApplicationSystemTestCase
  test "unauthenticated user redirected from protected pages" do
    # Try to visit GIF creation page without logging in
    visit new_gif_path

    # Should redirect to login
    assert_current_path new_user_session_path

    # Should show message
    assert_page_has_text "You need to sign in or sign up before continuing"

    take_screenshot("session-redirect-unauthenticated")
  end

  test "authenticated user can access protected pages" do
    user = users(:e2e_test_user)
    sign_in_as(user)

    # Visit protected page
    visit new_gif_path

    # Should NOT redirect
    assert_current_path new_gif_path

    # Should show form
    assert_page_has_text "Create"

    take_screenshot("session-authenticated-access")
  end

  test "session persists across page navigation" do
    user = users(:e2e_test_user)
    sign_in_as(user)

    # Navigate to different pages
    visit trending_path
    assert_page_has_text user.username

    visit root_path
    assert_page_has_text user.username

    # Visit user profile
    visit user_path(user.username)
    assert_page_has_text user.username

    take_screenshot("session-persistence")
  end

  test "session expires after logout" do
    user = users(:e2e_test_user)
    sign_in_as(user)
    sign_out

    # Try to visit protected page
    visit new_gif_path

    # Should redirect to login
    assert_current_path new_user_session_path

    take_screenshot("session-expired-after-logout")
  end

  test "cannot access other users edit pages" do
    user = users(:e2e_test_user)
    other_user_gif = gifs(:e2e_public_gif)  # Belongs to e2e_follower

    sign_in_as(user)

    # Try to edit someone else's GIF
    visit edit_gif_path(other_user_gif)

    # Should redirect or show error
    # (Exact behavior depends on your authorization implementation)
    assert_page_has_text "You don't have permission"

    take_screenshot("session-authorization-denied")
  end
end
```

**Run session tests:**
```bash
bin/rails test:system test/system/authentication/session_test.rb
```

---

## Phase 1.3: Core GIF Upload Flow (45 minutes)

### Step 1.3.1: GIF Creation Test (30 minutes)

**File:** `test/system/gifs/upload_test.rb` (NEW FILE)

```ruby
require "application_system_test_case"

class GifUploadTest < ApplicationSystemTestCase
  setup do
    @user = users(:e2e_test_user)
    sign_in_as(@user)
  end

  test "user can create GIF with valid data - complete flow" do
    # Start from home page
    visit root_path

    # Click "Create GIF" or similar button
    @page.click('a[href="/gifs/new"]')
    wait_for_page_load

    # Should be on new GIF page
    assert_current_path new_gif_path
    assert_page_has_text "Create"

    take_screenshot("gif-create-form")

    # Fill in the form
    @page.fill('input[name="gif[title]"]', "E2E Test GIF")
    @page.fill('input[name="gif[youtube_url]"]', "https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    @page.fill('input[name="gif[start_time]"]', "10.5")
    @page.fill('input[name="gif[end_time]"]', "15.0")

    # Select privacy
    @page.select_option('select[name="gif[privacy]"]', label: "Public")

    # Add tags/hashtags if field exists
    begin
      @page.fill('input[name="gif[tags]"]', "test, e2e, automated")
    rescue Playwright::Error
      # Tags field might not exist, skip
    end

    take_screenshot("gif-form-filled")

    # Submit form
    initial_gif_count = Gif.count
    @page.click('input[type="submit"]')
    wait_for_page_load

    # Should show success message
    assert_page_has_text "GIF was successfully created"

    # Should show the GIF details
    assert_page_has_text "E2E Test GIF"

    take_screenshot("gif-created-success")

    # Verify in database
    assert_equal initial_gif_count + 1, Gif.count, "GIF should be created in database"

    gif = Gif.find_by(title: "E2E Test GIF")
    assert_not_nil gif, "GIF should exist in database"
    assert_equal @user.id, gif.user_id, "GIF should belong to current user"
    assert_equal 10.5, gif.start_time, "Start time should match"
    assert_equal 15.0, gif.end_time, "End time should match"
    assert_equal "public_access", gif.privacy, "Privacy should be public"

    # GIF should appear on user's profile
    visit user_path(@user.username)
    assert_page_has_text "E2E Test GIF"

    take_screenshot("gif-on-profile")
  end

  test "GIF creation fails with invalid YouTube URL" do
    visit new_gif_path

    @page.fill('input[name="gif[title]"]', "Invalid URL Test")
    @page.fill('input[name="gif[youtube_url]"]', "not-a-valid-url")
    @page.fill('input[name="gif[start_time]"]', "10")
    @page.fill('input[name="gif[end_time]"]', "15")

    initial_count = Gif.count
    @page.click('input[type="submit"]')
    wait_for_page_load

    # Should show error
    assert_page_has_text "YouTube URL"
    assert_page_has_text "invalid"

    # Should stay on form
    assert_page_has_text "Create"

    # Should NOT create GIF
    assert_equal initial_count, Gif.count

    take_screenshot("gif-invalid-url")
  end

  test "GIF creation fails when end time before start time" do
    visit new_gif_path

    @page.fill('input[name="gif[title]"]', "Invalid Time Range")
    @page.fill('input[name="gif[youtube_url]"]', "https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    @page.fill('input[name="gif[start_time]"]', "20")
    @page.fill('input[name="gif[end_time]"]', "10")  # Before start time

    initial_count = Gif.count
    @page.click('input[type="submit"]')
    wait_for_page_load

    # Should show error
    assert_page_has_text "End time must be after start time"

    # Should NOT create GIF
    assert_equal initial_count, Gif.count

    take_screenshot("gif-invalid-time-range")
  end

  test "GIF creation requires title" do
    visit new_gif_path

    # Leave title blank
    @page.fill('input[name="gif[youtube_url]"]', "https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    @page.fill('input[name="gif[start_time]"]', "10")
    @page.fill('input[name="gif[end_time]"]', "15")

    initial_count = Gif.count
    @page.click('input[type="submit"]')
    wait_for_page_load

    # Should show error
    assert_page_has_text "Title can't be blank"

    # Should NOT create GIF
    assert_equal initial_count, Gif.count

    take_screenshot("gif-missing-title")
  end
end
```

**Create directory:**
```bash
mkdir -p test/system/gifs
```

**Run GIF upload tests:**
```bash
bin/rails test:system test/system/gifs/upload_test.rb
```

---

### Step 1.3.2: GIF Browsing Test (15 minutes)

**File:** `test/system/gifs/browsing_test.rb` (NEW FILE)

```ruby
require "application_system_test_case"

class GifBrowsingTest < ApplicationSystemTestCase
  test "visitor can browse public GIFs on home page" do
    visit root_path

    # Should see GIF cards
    gif = gifs(:e2e_public_gif)
    assert_page_has_text gif.title

    take_screenshot("gif-browse-home")
  end

  test "visitor can view GIF detail page" do
    gif = gifs(:e2e_public_gif)

    visit gif_path(gif)

    # Should show GIF details
    assert_page_has_text gif.title
    assert_page_has_text gif.user.username

    # Should show like count
    assert_page_has_text "#{gif.likes_count}"

    take_screenshot("gif-detail-page")
  end

  test "visitor can view trending page" do
    visit trending_path

    assert_page_has_text "Trending"

    # Should see GIFs
    gif = gifs(:e2e_public_gif)
    assert_page_has_text gif.title

    take_screenshot("gif-trending")
  end
end
```

**Run browsing tests:**
```bash
bin/rails test:system test/system/gifs/browsing_test.rb
```

---

## Running All Phase 1 Tests

### Run All System Tests
```bash
bin/rails test:system
```

### Run Specific Category
```bash
# Just authentication tests
bin/rails test:system test/system/authentication/

# Just GIF tests
bin/rails test:system test/system/gifs/
```

### Run with Visible Browser (for debugging)

Edit `test/application_system_test_case.rb`, line 12:

```ruby
headless: false,  # Change from true to false
```

Then run tests - you'll see browser windows.

---

## Troubleshooting

### Issue: "Connection refused" or "Server not running"

**Solution:** Ensure Rails server is running on port 3001:
```bash
# In separate terminal
bin/rails server -p 3001 -e test
```

Or configure Capybara to auto-start server (already done in test_helper.rb).

---

### Issue: "Playwright browser not installed"

**Solution:**
```bash
npx playwright install chromium
```

---

### Issue: "Element not found" errors

**Solution:** Add debugging:
```ruby
# In test, before the failing line
take_screenshot("debug-before-click")
puts @page.content  # Print HTML
```

Check screenshot to see actual page state.

---

### Issue: Tests timing out

**Solution:** Increase timeout in helper:
```ruby
@page.wait_for_selector(selector, timeout: 10000)  # 10 seconds
```

---

### Issue: Flaky tests

**Solution:** Add explicit waits:
```ruby
@page.wait_for_load_state('networkidle')  # Wait for all network requests
wait_for_turbo  # Wait for Turbo to finish
```

---

## Success Criteria

After Phase 1, you should have:

- ✅ **10+ system tests passing:**
  - 2 smoke tests
  - 4 signup tests
  - 4 login tests
  - 5 session tests
  - 4 GIF upload tests
  - 3 GIF browsing tests

- ✅ **Infrastructure in place:**
  - Playwright configured
  - Test helpers working
  - Screenshots on failure
  - Fixtures set up

- ✅ **Critical flows tested:**
  - User registration → login → create GIF → view GIF
  - End-to-end user journey working

---

## Next Steps (Future Phases)

After Phase 1 is complete and all tests pass:

1. **Phase 2:** Social features (likes, comments, follows)
2. **Phase 3:** Real-time updates (Turbo Streams, ActionCable)
3. **Phase 4:** Collections and hashtags
4. **Phase 5:** Mobile responsiveness
5. **Phase 6:** API/JWT tests for Chrome extension

---

## Time Tracking

| Task | Estimated | Actual |
|------|-----------|--------|
| Playwright setup | 30 min | ___ |
| Signup tests | 15 min | ___ |
| Login tests | 15 min | ___ |
| Session tests | 15 min | ___ |
| GIF upload tests | 30 min | ___ |
| GIF browsing tests | 15 min | ___ |
| **Total** | **2 hours** | ___ |

---

## Commands Quick Reference

```bash
# Install dependencies
bundle install
npx playwright install chromium

# Create directories
mkdir -p test/system/{authentication,gifs}
mkdir -p tmp/screenshots

# Run all system tests
bin/rails test:system

# Run specific test file
bin/rails test:system test/system/authentication/signup_test.rb

# Run specific test
bin/rails test:system test/system/gifs/upload_test.rb -n test_user_can_create_GIF_with_valid_data

# Debug mode (visible browser)
# Edit test/application_system_test_case.rb, set headless: false

# View screenshots
open tmp/screenshots/
```

---

**Ready to implement? Start with Step 1.1.1!**
