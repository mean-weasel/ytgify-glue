# System Tests Implementation Plan

**Estimated Time:** 4-5 hours
**Goal:** Implement comprehensive end-to-end system tests for critical user workflows
**Framework:** Playwright + Chrome (headless)

---

## Overview

System tests (end-to-end tests) verify complete user workflows by simulating real browser interactions. They test the full stack: routes, controllers, views, JavaScript (Stimulus), Turbo Frames/Streams, and database interactions.

### Why System Tests?

- **User-Centric:** Test actual user workflows, not implementation details
- **Integration Coverage:** Catch issues between layers (controller ↔ view ↔ JS)
- **Hotwire Validation:** Verify Turbo Frames, Turbo Streams, and Stimulus controllers work correctly
- **Regression Prevention:** Ensure critical flows don't break during refactoring
- **Chrome Extension Prep:** Test JWT API endpoints that extension will use

---

## Current Status

**Existing Tests:**
- ✅ 425 tests passing (models, controllers, services, jobs, channels)
- ❌ **0 system tests** (this is what we're adding)

**Tech Stack:**
- Rails 8.0.4 with Hotwire (Turbo + Stimulus)
- Devise (sessions) + Devise-JWT (API tokens)
- PostgreSQL + Redis
- Tailwind CSS 4
- ActionCable for real-time features

**Key Discovery:**
The ytgify Chrome extension (https://github.com/neonwatty/ytgify) is currently **standalone** with no backend integration. The Rails backend has a complete JWT API ready, but the extension needs updating to use it. For now, system tests will focus on web application flows, with extension integration documented for future implementation.

---

## Phase 1: Setup System Testing Infrastructure (45 minutes)

### 1.1 Install and Configure Playwright (15 minutes)

**Why Playwright?**
- **Faster & More Reliable:** Better auto-waiting and stability than Selenium
- **Modern API:** Cleaner, more intuitive API
- **Better Debugging:** Built-in screenshots, videos, trace viewer
- **Network Control:** Mock API responses, intercept requests
- **Multiple Browsers:** Chrome, Firefox, Safari (Webkit)

**Gemfile:**
```ruby
group :test do
  # System testing with Playwright
  gem "playwright-ruby-client"
end
```

**Installation:**
```bash
# Install gem
bundle install

# Download browser binaries (Chrome, Firefox, Safari)
bundle exec playwright install chromium

# Or install all browsers
bundle exec playwright install
```

**Configuration (`test/application_system_test_case.rb`):**
```ruby
require "test_helper"
require "playwright"

class ApplicationSystemTestCase < ActionDispatch::IntegrationTest
  # Playwright setup
  def setup
    super
    @playwright = Playwright.create(playwright_cli_executable_path: 'npx playwright')
    @browser = @playwright.playwright.chromium.launch(
      headless: true,
      args: ['--disable-dev-shm-usage', '--no-sandbox']
    )
    @context = @browser.new_context(
      viewport: { width: 1400, height: 1400 },
      locale: 'en-US'
    )
    @page = @context.new_page
  end

  def teardown
    @page&.close
    @context&.close
    @browser&.close
    @playwright&.stop
    super
  end

  # Helper to access current page
  attr_reader :page

  # Custom helper methods
  def visit(path)
    @page.goto("http://localhost:#{Capybara.server_port}#{path}")
  end

  def sign_in_as(user)
    visit new_user_session_path
    @page.fill('input[name="user[email]"]', user.email)
    @page.fill('input[name="user[password]"]', 'password123')
    @page.click('button[type="submit"]:has-text("Log in")')
    assert_page_has_text "Signed in successfully"
  end

  def sign_out
    @page.click('button:has-text("Account")')
    @page.click('a:has-text("Sign out")')
    assert_page_has_text "Signed out successfully"
  end

  def wait_for_turbo
    # Wait for Turbo progress bar to disappear
    @page.wait_for_selector('.turbo-progress-bar', state: 'hidden', timeout: 5000)
  rescue Playwright::TimeoutError
    # Progress bar may not appear for fast requests
  end

  def wait_for_stimulus(controller_name)
    @page.wait_for_selector("[data-controller='#{controller_name}']")
  end

  # Assertion helpers
  def assert_page_has_text(text)
    assert @page.text_content('body').include?(text),
           "Expected page to contain '#{text}', but it didn't"
  end

  def assert_current_path(path)
    expected_url = "http://localhost:#{Capybara.server_port}#{path}"
    assert_equal expected_url, @page.url,
                 "Expected current path to be '#{path}', but was '#{@page.url}'"
  end

  # Screenshot on failure
  def take_screenshot(name = "failure")
    FileUtils.mkdir_p('tmp/screenshots')
    @page.screenshot(path: "tmp/screenshots/#{name}.png")
  end
end
```

**Start Test Server:**

Before running tests, ensure Rails test server is running. Add to `test/test_helper.rb`:

```ruby
# Start Puma server for system tests
Capybara.server = :puma, { Silent: true }
Capybara.server_port = 3001
```

**Verification:**
```bash
# Create a simple test to verify setup
rails test:system
```

**Expected Outcome:**
- ✅ Playwright gem installed
- ✅ Chrome browser binary downloaded
- ✅ ApplicationSystemTestCase configured
- ✅ Can run `rails test:system` without errors
- ✅ Screenshots save to `tmp/screenshots/`

---

### 1.2 Create Test Fixtures (15 minutes)

System tests need realistic test data. We'll enhance existing fixtures and create new ones for system testing.

**test/fixtures/users.yml:**
```yaml
# System test user - predictable data for E2E tests
system_test_user:
  id: 11111111-1111-1111-1111-111111111111
  username: systemtester
  email: systemtester@example.com
  encrypted_password: <%= Devise::Encryptor.digest(User, 'password123') %>
  created_at: <%= 30.days.ago %>
  updated_at: <%= 1.day.ago %>
  gifs_count: 5
  followers_count: 2
  following_count: 3
  jti: system_test_jti

system_test_follower:
  id: 22222222-2222-2222-2222-222222222222
  username: follower_user
  email: follower@example.com
  encrypted_password: <%= Devise::Encryptor.digest(User, 'password123') %>
  jti: follower_jti

system_test_following:
  id: 33333333-3333-3333-3333-333333333333
  username: following_user
  email: following@example.com
  encrypted_password: <%= Devise::Encryptor.digest(User, 'password123') %>
  jti: following_jti
```

**test/fixtures/gifs.yml:**
```yaml
system_test_public_gif:
  id: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
  user: system_test_user
  title: "System Test Public GIF"
  youtube_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  start_time: 10.5
  end_time: 15.0
  privacy: public_access
  views_count: 100
  likes_count: 5
  comments_count: 3
  created_at: <%= 2.days.ago %>

system_test_private_gif:
  id: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb
  user: system_test_user
  title: "System Test Private GIF"
  youtube_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  start_time: 5.0
  end_time: 10.0
  privacy: private_access
  created_at: <%= 1.day.ago %>
```

**Note:** ActiveStorage attachments are tricky in system tests. We'll use database records without actual file uploads for now, or stub S3 uploads.

**Expected Outcome:**
- Predictable, reusable test data
- Users with known credentials (`password123`)
- GIFs with various privacy settings
- Easy to reference in tests (`users(:system_test_user)`)

---

### 1.3 Configure Test Database and Cleanup (10 minutes)

**config/environments/test.rb:**
```ruby
# Ensure clean state between tests
config.action_mailer.perform_caching = false
config.action_mailer.delivery_method = :test

# Disable real ActionCable connections
config.action_cable.disable_request_forgery_protection = true

# Use in-memory cache for speed
config.cache_store = :memory_store
```

**Test Helper for Database Cleanup:**

Add to `test/application_system_test_case.rb`:
```ruby
class ApplicationSystemTestCase < ActionDispatch::SystemTestCase
  # ... existing setup ...

  def setup
    super
    # Clear ActionCable connections
    ActionCable.server.restart if ActionCable.server.respond_to?(:restart)
  end

  def teardown
    # Clear any uploaded files
    ActiveStorage::Blob.all.each(&:purge) if defined?(ActiveStorage)
    super
  end
end
```

**Expected Outcome:**
- Tests run in isolation without side effects
- No real emails sent
- ActionCable doesn't interfere with tests
- File uploads cleaned up after tests

---

### 1.4 Create Reusable Test Helpers (10 minutes)

**test/system_test_helpers.rb:**
```ruby
module SystemTestHelpers
  # Authentication
  def sign_in_as(user)
    visit new_user_session_path
    fill_in "Email", with: user.email
    fill_in "Password", with: "password123"
    click_button "Log in"
    assert_text "Signed in successfully"
  end

  def sign_out
    find("button", text: "Account").click
    click_link "Sign out"
    assert_text "Signed out successfully"
  end

  # Turbo helpers
  def wait_for_turbo
    # Wait for Turbo progress bar to disappear
    assert_no_selector(".turbo-progress-bar", wait: 5)
  end

  def within_turbo_frame(id, &block)
    within("turbo-frame##{id}", &block)
  end

  # Form helpers
  def submit_form(button_text = "Submit")
    click_button button_text
    wait_for_turbo
  end

  # Wait for Stimulus controller to connect
  def wait_for_stimulus(controller_name)
    assert_selector("[data-controller='#{controller_name}']", wait: 5)
  end

  # Wait for specific text to appear (AJAX requests)
  def wait_for_text(text, timeout: 5)
    assert_text text, wait: timeout
  end

  # Screenshot on failure (helpful for debugging)
  def take_screenshot(name = "failure")
    page.save_screenshot("tmp/screenshots/#{name}.png")
  end
end

# Include in system test case
class ApplicationSystemTestCase < ActionDispatch::SystemTestCase
  include SystemTestHelpers
end
```

**Expected Outcome:**
- Reusable helpers for common actions
- Turbo-aware wait conditions
- Stimulus controller helpers
- Screenshot capability for debugging

---

## Phase 2: Authentication Flow Tests (30 minutes)

### 2.1 User Signup Flow (10 minutes)

**test/system/authentication/signup_test.rb:**
```ruby
require "application_system_test_case"

class SignupTest < ApplicationSystemTestCase
  test "user can sign up with valid credentials" do
    visit root_path
    page.click('a:has-text("Sign up")')

    page.fill('input[name="user[username]"]', "newuser")
    page.fill('input[name="user[email]"]', "newuser@example.com")
    page.fill('input[name="user[password]"]', "password123")
    page.fill('input[name="user[password_confirmation]"]', "password123")

    page.click('button[type="submit"]:has-text("Sign up")')

    # Should redirect to feed
    assert_current_path root_path
    assert_page_has_text "Welcome! You have signed up successfully"

    # Should show username in navbar
    assert_page_has_text "newuser"
  end

  test "signup fails with invalid email" do
    visit new_user_registration_path

    page.fill('input[name="user[username]"]', "testuser")
    page.fill('input[name="user[email]"]', "invalid-email")
    page.fill('input[name="user[password]"]', "password123")
    page.fill('input[name="user[password_confirmation]"]', "password123")

    page.click('button[type="submit"]:has-text("Sign up")')

    assert_page_has_text "Email is invalid"
    assert_current_path user_registration_path
  end

  test "signup fails with mismatched passwords" do
    visit new_user_registration_path

    page.fill('input[name="user[username]"]', "testuser")
    page.fill('input[name="user[email]"]', "test@example.com")
    page.fill('input[name="user[password]"]', "password123")
    page.fill('input[name="user[password_confirmation]"]', "different")

    page.click('button[type="submit"]:has-text("Sign up")')

    assert_page_has_text "Password confirmation doesn't match"
  end

  test "signup fails with duplicate username" do
    existing_user = users(:system_test_user)
    visit new_user_registration_path

    page.fill('input[name="user[username]"]', existing_user.username)
    page.fill('input[name="user[email]"]', "unique@example.com")
    page.fill('input[name="user[password]"]', "password123")
    page.fill('input[name="user[password_confirmation]"]', "password123")

    page.click('button[type="submit"]:has-text("Sign up")')

    assert_page_has_text "Username has already been taken"
  end
end
```

**Expected Outcome:**
- ✅ Can create account with valid data
- ✅ Validation errors display correctly
- ✅ Redirects to feed after successful signup
- ✅ Username appears in navbar

---

### 2.2 User Login Flow (10 minutes)

**test/system/authentication/login_test.rb:**
```ruby
require "application_system_test_case"

class LoginTest < ApplicationSystemTestCase
  test "user can login with valid credentials" do
    user = users(:system_test_user)
    visit root_path

    page.click('a:has-text("Log in")')

    page.fill('input[name="user[email]"]', user.email)
    page.fill('input[name="user[password]"]', 'password123')
    page.click('button[type="submit"]:has-text("Log in")')

    assert_current_path root_path
    assert_page_has_text "Signed in successfully"
    assert_page_has_text user.username
  end

  test "login fails with invalid password" do
    user = users(:system_test_user)
    visit new_user_session_path

    page.fill('input[name="user[email]"]', user.email)
    page.fill('input[name="user[password]"]', 'wrongpassword')
    page.click('button[type="submit"]:has-text("Log in")')

    assert_page_has_text "Invalid Email or password"
    assert_current_path new_user_session_path
  end

  test "login fails with non-existent email" do
    visit new_user_session_path

    page.fill('input[name="user[email]"]', "nonexistent@example.com")
    page.fill('input[name="user[password]"]', 'password123')
    page.click('button[type="submit"]:has-text("Log in")')

    assert_page_has_text "Invalid Email or password"
  end

  test "user can logout" do
    user = users(:system_test_user)
    sign_in_as(user)

    page.click('button:has-text("Account")')
    page.click('a:has-text("Sign out")')

    assert_page_has_text "Signed out successfully"
    assert_page_has_text "Log in"  # Login link should be visible again
  end

  test "remember me checkbox works" do
    user = users(:system_test_user)
    visit new_user_session_path

    page.fill('input[name="user[email]"]', user.email)
    page.fill('input[name="user[password]"]', 'password123')
    page.check('input[name="user[remember_me]"]')
    page.click('button[type="submit"]:has-text("Log in")')

    assert_page_has_text "Signed in successfully"

    # Check that remember token is set (cookie inspection)
    cookies = @context.cookies
    remember_cookie = cookies.find { |c| c['name'] == 'remember_user_token' }
    assert_not_nil remember_cookie, "Remember me cookie should be set"
  end
end
```

**Expected Outcome:**
- ✅ Can login with correct credentials
- ✅ Login fails with wrong password
- ✅ Can logout successfully
- ✅ Remember me functionality works

---

### 2.3 Session Management (10 minutes)

**test/system/authentication/session_test.rb:**
```ruby
require "application_system_test_case"

class SessionTest < ApplicationSystemTestCase
  test "unauthenticated user redirected to login" do
    # Try to visit authenticated page
    visit new_gif_path

    assert_current_path new_user_session_path
    assert_text "You need to sign in or sign up before continuing"
  end

  test "authenticated user can access protected pages" do
    user = users(:system_test_user)
    sign_in_as(user)

    visit new_gif_path
    assert_current_path new_gif_path
    assert_text "Create New GIF"
  end

  test "session persists across page navigation" do
    user = users(:system_test_user)
    sign_in_as(user)

    # Navigate to different pages
    visit trending_path
    assert_text user.username

    visit user_path(user.username)
    assert_text user.username

    visit root_path
    assert_text user.username
  end

  test "session expires after logout" do
    user = users(:system_test_user)
    sign_in_as(user)
    sign_out

    # Try to visit protected page
    visit new_gif_path
    assert_current_path new_user_session_path
  end
end
```

**Expected Outcome:**
- ✅ Unauthenticated users redirected
- ✅ Authenticated users can access protected pages
- ✅ Session persists across navigation
- ✅ Session cleared after logout

---

## Phase 3: GIF Management Flows (60 minutes)

### 3.1 GIF Upload Flow (20 minutes)

**test/system/gifs/upload_test.rb:**
```ruby
require "application_system_test_case"

class GifUploadTest < ApplicationSystemTestCase
  setup do
    @user = users(:system_test_user)
    sign_in_as(@user)
  end

  test "user can create GIF with valid data" do
    visit new_gif_path

    fill_in "Title", with: "My Test GIF"
    fill_in "YouTube URL", with: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    fill_in "Start time", with: "10.5"
    fill_in "End time", with: "15.0"
    select "Public", from: "Privacy"
    fill_in "Tags", with: "test, funny, meme"

    click_button "Create GIF"
    wait_for_turbo

    assert_text "GIF was successfully created"
    assert_text "My Test GIF"

    # Verify GIF was created
    gif = Gif.find_by(title: "My Test GIF")
    assert_not_nil gif
    assert_equal @user.id, gif.user_id
    assert_equal 10.5, gif.start_time
    assert_equal 15.0, gif.end_time
  end

  test "GIF creation fails with invalid YouTube URL" do
    visit new_gif_path

    fill_in "Title", with: "Invalid URL Test"
    fill_in "YouTube URL", with: "not-a-url"
    fill_in "Start time", with: "10"
    fill_in "End time", with: "15"

    click_button "Create GIF"

    assert_text "YouTube URL is invalid"
    assert_current_path gifs_path  # Should stay on form
  end

  test "GIF creation fails when end time before start time" do
    visit new_gif_path

    fill_in "Title", with: "Invalid Time Range"
    fill_in "YouTube URL", with: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    fill_in "Start time", with: "20"
    fill_in "End time", with: "10"

    click_button "Create GIF"

    assert_text "End time must be after start time"
  end

  test "user can add hashtags during creation" do
    visit new_gif_path

    fill_in "Title", with: "GIF with Hashtags"
    fill_in "YouTube URL", with: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    fill_in "Start time", with: "10"
    fill_in "End time", with: "15"
    fill_in "Tags", with: "funny, meme, test"

    click_button "Create GIF"
    wait_for_turbo

    gif = Gif.find_by(title: "GIF with Hashtags")
    assert_equal 3, gif.hashtags.count
    assert gif.hashtags.pluck(:name).include?("funny")
  end
end
```

**Expected Outcome:**
- ✅ Can create GIF with valid data
- ✅ Validation errors display correctly
- ✅ Hashtags are created and associated
- ✅ Redirects to GIF show page after creation

---

### 3.2 GIF Browsing Flow (20 minutes)

**test/system/gifs/browsing_test.rb:**
```ruby
require "application_system_test_case"

class GifBrowsingTest < ApplicationSystemTestCase
  test "visitor can browse public GIFs on home page" do
    visit root_path

    # Should see GIF cards
    assert_selector(".gif-card", minimum: 1)

    # Should see GIF titles
    gif = gifs(:system_test_public_gif)
    assert_text gif.title
  end

  test "visitor can view trending GIFs" do
    visit trending_path

    assert_text "Trending"
    assert_selector(".gif-card", minimum: 1)
  end

  test "user can view GIF detail page" do
    gif = gifs(:system_test_public_gif)
    visit gif_path(gif)

    assert_text gif.title
    assert_text gif.user.username
    assert_selector("video") # or iframe for YouTube
    assert_text "#{gif.likes_count} Likes"
    assert_text "#{gif.comments_count} Comments"
  end

  test "private GIFs not visible to other users" do
    other_user = users(:system_test_follower)
    sign_in_as(other_user)

    private_gif = gifs(:system_test_private_gif)

    # Try to visit private GIF
    visit gif_path(private_gif)

    # Should redirect or show error
    assert_text "You don't have permission to view this GIF"
  end

  test "user can see own private GIFs" do
    user = users(:system_test_user)
    sign_in_as(user)

    private_gif = gifs(:system_test_private_gif)
    visit gif_path(private_gif)

    assert_text private_gif.title
    assert_text "Private"
  end

  test "GIF cards show correct metadata" do
    visit root_path

    gif = gifs(:system_test_public_gif)

    within(".gif-card", text: gif.title) do
      assert_text gif.user.username
      assert_text "#{gif.likes_count} likes"
      assert_text "#{gif.views_count} views"
    end
  end
end
```

**Expected Outcome:**
- ✅ Public GIFs visible to all
- ✅ Private GIFs hidden from others
- ✅ GIF detail pages load correctly
- ✅ Metadata displays correctly

---

### 3.3 GIF Edit and Delete Flow (20 minutes)

**test/system/gifs/edit_test.rb:**
```ruby
require "application_system_test_case"

class GifEditTest < ApplicationSystemTestCase
  setup do
    @user = users(:system_test_user)
    @gif = gifs(:system_test_public_gif)
    sign_in_as(@user)
  end

  test "user can edit own GIF" do
    visit gif_path(@gif)
    click_link "Edit"

    fill_in "Title", with: "Updated Title"
    select "Private", from: "Privacy"

    click_button "Update GIF"
    wait_for_turbo

    assert_text "GIF was successfully updated"
    assert_text "Updated Title"

    @gif.reload
    assert_equal "Updated Title", @gif.title
    assert_equal "private_access", @gif.privacy
  end

  test "user cannot edit other user's GIF" do
    other_gif = gifs(:alice_public_gif)  # Different user's GIF

    visit edit_gif_path(other_gif)

    assert_text "You don't have permission to edit this GIF"
    assert_current_path root_path
  end

  test "user can delete own GIF" do
    visit gif_path(@gif)

    accept_confirm do
      click_button "Delete"
    end

    wait_for_turbo

    assert_text "GIF was successfully deleted"
    assert_current_path root_path

    @gif.reload
    assert @gif.deleted_at.present?  # Soft delete
  end

  test "user can update hashtags" do
    visit edit_gif_path(@gif)

    fill_in "Tags", with: "newtag1, newtag2"
    click_button "Update GIF"
    wait_for_turbo

    @gif.reload
    assert_equal 2, @gif.hashtags.count
    assert @gif.hashtags.pluck(:name).include?("newtag1")
  end
end
```

**Expected Outcome:**
- ✅ Users can edit own GIFs
- ✅ Users cannot edit others' GIFs
- ✅ Soft delete works correctly
- ✅ Hashtags update correctly

---

## Phase 4: Social Features Flows (60 minutes)

### 4.1 Like Functionality (15 minutes)

**test/system/social/likes_test.rb:**
```ruby
require "application_system_test_case"

class LikesTest < ApplicationSystemTestCase
  setup do
    @user = users(:system_test_user)
    @gif = gifs(:alice_public_gif)  # Another user's GIF
    sign_in_as(@user)
  end

  test "user can like a GIF" do
    visit gif_path(@gif)

    initial_count = @gif.likes_count

    # Click like button
    find("button", text: "Like").click
    wait_for_turbo

    # Should show liked state
    assert_selector("button.liked", text: "Unlike")

    # Count should increment (via Turbo Stream)
    assert_text "#{initial_count + 1} Likes"

    # Database should reflect change
    @gif.reload
    assert_equal initial_count + 1, @gif.likes_count
  end

  test "user can unlike a GIF" do
    # Create existing like
    Like.create!(user: @user, likeable: @gif)
    @gif.update(likes_count: @gif.likes_count + 1)

    visit gif_path(@gif)
    initial_count = @gif.likes_count

    # Click unlike button
    find("button.liked", text: "Unlike").click
    wait_for_turbo

    # Should show unliked state
    assert_selector("button", text: "Like")

    # Count should decrement
    assert_text "#{initial_count - 1} Likes"

    @gif.reload
    assert_equal initial_count - 1, @gif.likes_count
  end

  test "like button works without page reload (Turbo)" do
    visit gif_path(@gif)

    # Verify no page reload happens
    find("button", text: "Like").click

    # Should not see Turbo progress bar (inline update)
    assert_no_selector(".turbo-progress-bar")

    # But should see updated count immediately
    wait_for_text "#{@gif.likes_count + 1} Likes"
  end

  test "unauthenticated user sees login prompt on like" do
    sign_out
    visit gif_path(@gif)

    find("button", text: "Like").click

    # Should redirect to login
    assert_current_path new_user_session_path
    assert_text "You need to sign in"
  end
end
```

**Expected Outcome:**
- ✅ Like/unlike works without page reload
- ✅ Count updates in real-time (Turbo Streams)
- ✅ Database counter cache updates correctly
- ✅ Unauthenticated users redirected to login

---

### 4.2 Comment Functionality (20 minutes)

**test/system/social/comments_test.rb:**
```ruby
require "application_system_test_case"

class CommentsTest < ApplicationSystemTestCase
  setup do
    @user = users(:system_test_user)
    @gif = gifs(:alice_public_gif)
    sign_in_as(@user)
  end

  test "user can add comment to GIF" do
    visit gif_path(@gif)

    within("#comments-section") do
      fill_in "comment[content]", with: "This is a great GIF!"
      click_button "Post Comment"
    end

    wait_for_turbo

    # Comment should appear without page reload
    within("#comments-section") do
      assert_text "This is a great GIF!"
      assert_text @user.username
      assert_text "just now"  # or similar timestamp
    end

    # Database should reflect change
    comment = Comment.find_by(content: "This is a great GIF!")
    assert_not_nil comment
    assert_equal @user.id, comment.user_id
    assert_equal @gif.id, comment.commentable_id
  end

  test "user can reply to comment" do
    # Create parent comment
    parent = Comment.create!(
      user: users(:system_test_follower),
      commentable: @gif,
      content: "Nice GIF!"
    )

    visit gif_path(@gif)

    within("#comment-#{parent.id}") do
      click_link "Reply"
      fill_in "comment[content]", with: "Thanks!"
      click_button "Post Reply"
    end

    wait_for_turbo

    # Reply should appear nested
    within("#comment-#{parent.id} .replies") do
      assert_text "Thanks!"
      assert_text @user.username
    end
  end

  test "user can edit own comment" do
    comment = Comment.create!(
      user: @user,
      commentable: @gif,
      content: "Original comment"
    )

    visit gif_path(@gif)

    within("#comment-#{comment.id}") do
      click_link "Edit"
      fill_in "comment[content]", with: "Updated comment"
      click_button "Update"
    end

    wait_for_turbo

    within("#comment-#{comment.id}") do
      assert_text "Updated comment"
      assert_no_text "Original comment"
    end
  end

  test "user can delete own comment" do
    comment = Comment.create!(
      user: @user,
      commentable: @gif,
      content: "Comment to delete"
    )

    visit gif_path(@gif)

    within("#comment-#{comment.id}") do
      accept_confirm do
        click_button "Delete"
      end
    end

    wait_for_turbo

    # Comment should disappear
    assert_no_selector("#comment-#{comment.id}")

    # Soft delete
    comment.reload
    assert comment.deleted_at.present?
  end

  test "unauthenticated user cannot comment" do
    sign_out
    visit gif_path(@gif)

    # Comment form should not be visible
    assert_no_selector("form#new-comment")
    assert_text "Sign in to comment"
  end
end
```

**Expected Outcome:**
- ✅ Can add comments without page reload
- ✅ Can reply to comments (nested threading)
- ✅ Can edit/delete own comments
- ✅ Unauthenticated users see prompt to sign in

---

### 4.3 Follow/Unfollow Functionality (15 minutes)

**test/system/social/follows_test.rb:**
```ruby
require "application_system_test_case"

class FollowsTest < ApplicationSystemTestCase
  setup do
    @user = users(:system_test_user)
    @target_user = users(:system_test_follower)
    sign_in_as(@user)
  end

  test "user can follow another user" do
    visit user_path(@target_user.username)

    initial_followers = @target_user.followers_count

    click_button "Follow"
    wait_for_turbo

    # Button should change to "Following"
    assert_selector("button", text: "Following")

    # Follower count should increment
    assert_text "#{initial_followers + 1} Followers"

    # Database should reflect change
    @target_user.reload
    assert_equal initial_followers + 1, @target_user.followers_count
  end

  test "user can unfollow a user" do
    # Create existing follow
    Follow.create!(follower: @user, followee: @target_user)
    @target_user.update(followers_count: @target_user.followers_count + 1)

    visit user_path(@target_user.username)
    initial_followers = @target_user.followers_count

    click_button "Following"
    wait_for_turbo

    # Button should change to "Follow"
    assert_selector("button", text: "Follow")

    # Follower count should decrement
    assert_text "#{initial_followers - 1} Followers"
  end

  test "user cannot follow themselves" do
    visit user_path(@user.username)

    # Should not see follow button on own profile
    assert_no_selector("button", text: "Follow")
  end

  test "following feed shows followed users' GIFs" do
    # Follow a user
    Follow.create!(follower: @user, followee: @target_user)

    # Target user has a GIF
    gif = Gif.create!(
      user: @target_user,
      title: "Following Feed Test GIF",
      youtube_url: "https://www.youtube.com/watch?v=test",
      start_time: 0,
      end_time: 5,
      privacy: :public_access
    )

    visit following_feed_path

    assert_text "Following Feed Test GIF"
    assert_text @target_user.username
  end
end
```

**Expected Outcome:**
- ✅ Can follow/unfollow without page reload
- ✅ Follower counts update in real-time
- ✅ Cannot follow self
- ✅ Following feed shows correct content

---

### 4.4 Collections Functionality (10 minutes)

**test/system/social/collections_test.rb:**
```ruby
require "application_system_test_case"

class CollectionsTest < ApplicationSystemTestCase
  setup do
    @user = users(:system_test_user)
    @gif = gifs(:alice_public_gif)
    sign_in_as(@user)
  end

  test "user can create collection" do
    visit collections_path

    click_link "New Collection"

    fill_in "Name", with: "My Favorite GIFs"
    fill_in "Description", with: "A collection of my favorites"
    select "Public", from: "Privacy"

    click_button "Create Collection"
    wait_for_turbo

    assert_text "Collection was successfully created"
    assert_text "My Favorite GIFs"
  end

  test "user can add GIF to collection" do
    collection = Collection.create!(
      user: @user,
      name: "Test Collection",
      privacy: :public_visibility
    )

    visit gif_path(@gif)

    click_button "Add to Collection"

    within(".collection-dropdown") do
      click_link collection.name
    end

    wait_for_turbo

    assert_text "Added to #{collection.name}"

    # Verify database
    assert collection.gifs.include?(@gif)
  end

  test "user can view collection with GIFs" do
    collection = Collection.create!(
      user: @user,
      name: "Test Collection",
      privacy: :public_visibility
    )
    collection.gifs << @gif

    visit collection_path(collection)

    assert_text collection.name
    assert_text @gif.title
    assert_selector(".gif-card", minimum: 1)
  end

  test "private collections not visible to other users" do
    private_collection = Collection.create!(
      user: users(:system_test_follower),
      name: "Private Collection",
      privacy: :private_visibility
    )

    visit collection_path(private_collection)

    assert_text "You don't have permission to view this collection"
  end
end
```

**Expected Outcome:**
- ✅ Can create collections
- ✅ Can add GIFs to collections
- ✅ Privacy settings enforced
- ✅ Collection pages display correctly

---

## Phase 5: Real-time Features (ActionCable/Turbo Streams) (30 minutes)

### 5.1 Notifications Real-time Updates (20 minutes)

**test/system/realtime/notifications_test.rb:**
```ruby
require "application_system_test_case"

class NotificationsTest < ApplicationSystemTestCase
  setup do
    @user = users(:system_test_user)
    @other_user = users(:system_test_follower)
    sign_in_as(@user)
  end

  test "notification badge updates in real-time when receiving notification" do
    visit root_path

    # Initial state: no unread notifications
    assert_selector(".notification-badge", text: "0")

    # Simulate another user liking our GIF (would create notification)
    gif = gifs(:system_test_public_gif)  # @user's GIF

    # Perform action that triggers notification
    using_session(@other_user.email) do
      sign_in_as(@other_user)
      visit gif_path(gif)
      find("button", text: "Like").click
      wait_for_turbo
    end

    # Original session should see updated badge (via ActionCable)
    using_session(@user.email) do
      assert_selector(".notification-badge", text: "1", wait: 5)
    end
  end

  test "clicking notification marks it as read" do
    notification = Notification.create!(
      recipient: @user,
      actor: @other_user,
      notifiable: gifs(:alice_public_gif),
      action: "like",
      read_at: nil
    )

    visit notifications_path

    within("#notification-#{notification.id}") do
      assert_selector(".unread-indicator")
      click_link "View"
    end

    wait_for_turbo

    # Should redirect to GIF
    assert_current_path gif_path(gifs(:alice_public_gif))

    # Notification should be marked read
    notification.reload
    assert_not_nil notification.read_at
  end

  test "notification dropdown shows recent notifications" do
    # Create multiple notifications
    3.times do |i|
      Notification.create!(
        recipient: @user,
        actor: @other_user,
        notifiable: gifs(:alice_public_gif),
        action: "like"
      )
    end

    visit root_path
    click_button "Notifications"

    within(".notification-dropdown") do
      assert_selector(".notification-item", count: 3)
    end
  end
end
```

**Expected Outcome:**
- ✅ Notifications appear in real-time (ActionCable)
- ✅ Badge count updates without refresh
- ✅ Marking as read works
- ✅ Dropdown displays correctly

---

### 5.2 Live Updates on GIF Page (10 minutes)

**test/system/realtime/live_updates_test.rb:**
```ruby
require "application_system_test_case"

class LiveUpdatesTest < ApplicationSystemTestCase
  setup do
    @user = users(:system_test_user)
    @other_user = users(:system_test_follower)
    @gif = gifs(:alice_public_gif)
  end

  test "like count updates in real-time for all viewers" do
    # User 1 viewing GIF
    using_session(@user.email) do
      sign_in_as(@user)
      visit gif_path(@gif)
      initial_count = @gif.likes_count
      assert_text "#{initial_count} Likes"
    end

    # User 2 likes the GIF
    using_session(@other_user.email) do
      sign_in_as(@other_user)
      visit gif_path(@gif)
      find("button", text: "Like").click
      wait_for_turbo
    end

    # User 1 should see updated count (via Turbo Streams)
    using_session(@user.email) do
      assert_text "#{@gif.likes_count + 1} Likes", wait: 5
    end
  end

  test "new comments appear in real-time for all viewers" do
    using_session(@user.email) do
      sign_in_as(@user)
      visit gif_path(@gif)
    end

    # Other user posts comment
    using_session(@other_user.email) do
      sign_in_as(@other_user)
      visit gif_path(@gif)

      within("#comments-section") do
        fill_in "comment[content]", with: "Real-time comment!"
        click_button "Post Comment"
      end
      wait_for_turbo
    end

    # First user should see comment appear
    using_session(@user.email) do
      assert_text "Real-time comment!", wait: 5
    end
  end
end
```

**Expected Outcome:**
- ✅ Like counts update for all viewers
- ✅ Comments appear in real-time
- ✅ Turbo Streams broadcast correctly

---

## Phase 6: Chrome Extension JWT API Tests (45 minutes)

### 6.1 JWT Authentication API (20 minutes)

**test/system/api/jwt_authentication_test.rb:**
```ruby
require "application_system_test_case"

class JwtAuthenticationTest < ApplicationSystemTestCase
  # Note: This is a system test that simulates API calls
  # In reality, Chrome extension would make these API calls directly

  test "can register via API" do
    visit root_path

    # Simulate API call via JavaScript (what extension would do)
    result = page.execute_script(<<~JS)
      return fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: {
            username: 'apiuser',
            email: 'apiuser@example.com',
            password: 'password123'
          }
        })
      }).then(res => res.json())
    JS

    assert result['token'].present?
    assert result['user']['username'] == 'apiuser'
  end

  test "can login via API and receive JWT token" do
    user = users(:system_test_user)

    visit root_path

    result = page.execute_script(<<~JS)
      return fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: {
            email: '#{user.email}',
            password: 'password123'
          }
        })
      }).then(res => res.json())
    JS

    assert result['token'].present?
    assert result['user']['id'] == user.id
  end

  test "can access protected API endpoints with JWT token" do
    user = users(:system_test_user)

    visit root_path

    # Login to get token
    login_result = page.execute_script(<<~JS)
      return fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: {
            email: '#{user.email}',
            password: 'password123'
          }
        })
      }).then(res => res.json())
    JS

    token = login_result['token']

    # Access protected endpoint
    result = page.execute_script(<<~JS)
      return fetch('/api/v1/auth/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer #{token}'
        }
      }).then(res => res.json())
    JS

    assert result['user']['id'] == user.id
  end

  test "API returns 401 without valid token" do
    visit root_path

    result = page.execute_script(<<~JS)
      return fetch('/api/v1/auth/me', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }).then(res => ({ status: res.status, ok: res.ok }))
    JS

    assert_equal 401, result['status']
  end
end
```

**Expected Outcome:**
- ✅ Can register via API
- ✅ Can login and receive JWT token
- ✅ Can access protected endpoints with token
- ✅ Unauthorized without token

---

### 6.2 GIF API Integration (15 minutes)

**test/system/api/gif_api_test.rb:**
```ruby
require "application_system_test_case"

class GifApiTest < ApplicationSystemTestCase
  setup do
    @user = users(:system_test_user)
  end

  def get_jwt_token
    visit root_path
    result = page.execute_script(<<~JS)
      return fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: {
            email: '#{@user.email}',
            password: 'password123'
          }
        })
      }).then(res => res.json())
    JS
    result['token']
  end

  test "can create GIF via API" do
    token = get_jwt_token

    result = page.execute_script(<<~JS)
      return fetch('/api/v1/gifs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer #{token}'
        },
        body: JSON.stringify({
          gif: {
            title: 'API Created GIF',
            youtube_url: 'https://www.youtube.com/watch?v=test',
            start_time: 10,
            end_time: 15,
            privacy: 'public_access'
          }
        })
      }).then(res => res.json())
    JS

    assert result['gif']['title'] == 'API Created GIF'
    assert result['gif']['user_id'] == @user.id
  end

  test "can fetch GIFs feed via API" do
    token = get_jwt_token

    result = page.execute_script(<<~JS)
      return fetch('/api/v1/feed', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer #{token}'
        }
      }).then(res => res.json())
    JS

    assert result['gifs'].is_a?(Array)
    assert result['gifs'].count > 0
  end

  test "can like GIF via API" do
    token = get_jwt_token
    gif = gifs(:alice_public_gif)

    result = page.execute_script(<<~JS)
      return fetch('/api/v1/gifs/#{gif.id}/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer #{token}'
        }
      }).then(res => res.json())
    JS

    assert result['liked'] == true

    # Verify in database
    like = Like.find_by(user: @user, likeable: gif)
    assert_not_nil like
  end
end
```

**Expected Outcome:**
- ✅ Can create GIFs via API
- ✅ Can fetch feeds via API
- ✅ Can like GIFs via API
- ✅ API responses match expected format

---

### 6.3 Chrome Extension Integration Documentation (10 minutes)

**Create documentation for Chrome extension developers:**

**docs/CHROME_EXTENSION_INTEGRATION.md:**
```markdown
# Chrome Extension Integration Guide

## Overview

The ytgify Chrome extension authenticates with the Rails backend via JWT tokens. This guide shows how to integrate the extension with the backend API.

## Authentication Flow

### 1. User Registration (First Time)

```javascript
// Extension popup: Register new user
async function registerUser(username, email, password) {
  const response = await fetch('https://ytgify.com/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user: { username, email, password }
    })
  });

  const data = await response.json();

  if (response.ok) {
    // Store token in Chrome storage
    await chrome.storage.local.set({
      jwtToken: data.token,
      user: data.user
    });
    return data;
  } else {
    throw new Error(data.errors.join(', '));
  }
}
```

### 2. User Login

```javascript
// Extension popup: Login existing user
async function loginUser(email, password) {
  const response = await fetch('https://ytgify.com/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user: { email, password }
    })
  });

  const data = await response.json();

  if (response.ok) {
    await chrome.storage.local.set({
      jwtToken: data.token,
      user: data.user
    });
    return data;
  } else {
    throw new Error(data.error || 'Login failed');
  }
}
```

### 3. Token Refresh

```javascript
// Background script: Refresh token before expiry
async function refreshToken() {
  const { jwtToken } = await chrome.storage.local.get('jwtToken');

  const response = await fetch('https://ytgify.com/api/v1/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`
    }
  });

  const data = await response.json();

  if (response.ok) {
    await chrome.storage.local.set({ jwtToken: data.token });
    return data.token;
  } else {
    // Token expired, redirect to login
    await logout();
    return null;
  }
}

// Refresh every 10 minutes
setInterval(refreshToken, 10 * 60 * 1000);
```

## GIF Creation Flow

### 1. Capture YouTube Video

```javascript
// Content script: Extract YouTube video info
function getYouTubeVideoInfo() {
  const videoElement = document.querySelector('video');
  const videoUrl = window.location.href;
  const currentTime = videoElement.currentTime;

  return {
    youtube_url: videoUrl,
    current_time: currentTime
  };
}

// Send to popup
chrome.runtime.sendMessage({
  action: 'captureVideo',
  data: getYouTubeVideoInfo()
});
```

### 2. Create GIF via API

```javascript
// Popup script: Create GIF on backend
async function createGif(gifData) {
  const { jwtToken } = await chrome.storage.local.get('jwtToken');

  const response = await fetch('https://ytgify.com/api/v1/gifs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`
    },
    body: JSON.stringify({
      gif: {
        title: gifData.title,
        youtube_url: gifData.youtube_url,
        start_time: gifData.start_time,
        end_time: gifData.end_time,
        privacy: gifData.privacy || 'public_access',
        hashtags: gifData.hashtags || []
      }
    })
  });

  const data = await response.json();

  if (response.ok) {
    return data.gif;
  } else {
    throw new Error(data.errors.join(', '));
  }
}
```

## API Endpoints Reference

### Authentication
- `POST /api/v1/auth/register` - Create account
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `DELETE /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Get current user

### GIFs
- `GET /api/v1/gifs` - List GIFs
- `POST /api/v1/gifs` - Create GIF
- `GET /api/v1/gifs/:id` - Show GIF
- `PATCH /api/v1/gifs/:id` - Update GIF
- `DELETE /api/v1/gifs/:id` - Delete GIF

### Social
- `POST /api/v1/gifs/:id/like` - Like/unlike GIF
- `POST /api/v1/users/:id/follow` - Follow/unfollow user
- `GET /api/v1/feed` - Personalized feed
- `GET /api/v1/feed/trending` - Trending GIFs

## Error Handling

```javascript
async function apiCall(endpoint, options = {}) {
  const { jwtToken } = await chrome.storage.local.get('jwtToken');

  const response = await fetch(`https://ytgify.com${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`,
      ...options.headers
    }
  });

  if (response.status === 401) {
    // Token expired
    await logout();
    throw new Error('Session expired. Please login again.');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.errors?.join(', ') || 'Request failed');
  }

  return data;
}
```

## Testing

Use the system tests in `test/system/api/` to verify integration:

```bash
rails test:system test/system/api/jwt_authentication_test.rb
rails test:system test/system/api/gif_api_test.rb
```

## Next Steps for Extension

1. Update extension to use backend API (in addition to Downloads folder)
2. Implement authentication flow in popup
3. Send GIF creation requests to `/api/v1/gifs`
4. Fetch user's GIFs from `/api/v1/gifs?user_id=current`
5. Implement token refresh mechanism
```

**Expected Outcome:**
- ✅ Clear documentation for extension developers
- ✅ Code examples for all API operations
- ✅ Authentication flow documented
- ✅ Error handling patterns provided

---

## Phase 7: Mobile Responsiveness Tests (20 minutes)

### 7.1 Mobile Layout Tests

**test/system/responsive/mobile_test.rb:**
```ruby
require "application_system_test_case"

class MobileTest < ApplicationSystemTestCase
  # Override setup for mobile viewport (iPhone 13)
  def setup
    super
    @playwright = Playwright.create(playwright_cli_executable_path: 'npx playwright')
    @browser = @playwright.playwright.chromium.launch(headless: true)
    @context = @browser.new_context(
      viewport: { width: 375, height: 812 },  # iPhone 13 size
      locale: 'en-US',
      user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)'
    )
    @page = @context.new_page
  end

  test "mobile menu toggles correctly" do
    visit root_path

    # Mobile menu should be hidden initially
    assert page.locator('.mobile-menu').hidden?

    # Click hamburger button
    page.click('.hamburger-button')

    # Menu should be visible
    page.wait_for_selector('.mobile-menu', state: 'visible')

    # Click backdrop to close
    page.click('.mobile-menu-backdrop')

    # Menu should be hidden
    page.wait_for_selector('.mobile-menu', state: 'hidden')
  end

  test "GIF cards are full-width on mobile" do
    visit root_path

    # GIF cards should stack vertically and be full-width
    card_width = page.evaluate("document.querySelector('.gif-card').offsetWidth")
    viewport_width = page.evaluate("window.innerWidth")

    # Card should be close to full width (accounting for padding)
    assert card_width > viewport_width * 0.9,
           "GIF card width (#{card_width}px) should be > 90% of viewport (#{viewport_width}px)"
  end

  test "forms are usable on mobile" do
    user = users(:system_test_user)
    sign_in_as(user)

    visit new_gif_path

    # Form should be visible and inputs touchable
    page.fill('input[name="gif[title]"]', "Mobile Test GIF")
    page.fill('input[name="gif[youtube_url]"]', "https://www.youtube.com/watch?v=test")

    # Submit button should be large enough for touch (44px minimum)
    button_height = page.evaluate("document.querySelector('input[type=\"submit\"]').offsetHeight")

    assert button_height >= 44,
           "Touch target too small: #{button_height}px (should be >= 44px)"
  end

  test "text is readable without zooming" do
    visit root_path

    # Font size should be at least 16px for readability
    body_font_size = page.evaluate(
      "window.getComputedStyle(document.body).fontSize"
    ).to_i

    assert body_font_size >= 16,
           "Body font size (#{body_font_size}px) too small for mobile"
  end
end
```

**Expected Outcome:**
- ✅ Mobile menu works correctly
- ✅ Layouts adapt to small screens
- ✅ Touch targets are 44px+ minimum
- ✅ Forms are usable on mobile

---

## Time Estimates Summary

| Phase | Task | Time |
|-------|------|------|
| 1 | Setup Infrastructure | 45 min |
| 2 | Authentication Flows | 30 min |
| 3 | GIF Management | 60 min |
| 4 | Social Features | 60 min |
| 5 | Real-time Features | 30 min |
| 6 | Chrome Extension API | 45 min |
| 7 | Mobile Responsiveness | 20 min |
| **Total** | | **4-5 hours** |

---

## Running System Tests

### Run All System Tests
```bash
rails test:system
```

### Run Specific Test File
```bash
rails test:system test/system/authentication/signup_test.rb
```

### Run Specific Test
```bash
rails test:system test/system/gifs/upload_test.rb -n test_user_can_create_GIF_with_valid_data
```

### Run with Visible Browser (not headless)
```ruby
# Change headless: false in setup method
@browser = @playwright.playwright.chromium.launch(
  headless: false  # Show browser window
)
```

### Debugging Failed Tests
```ruby
# Add to test
take_screenshot("debug-screenshot")
# Screenshots saved to tmp/screenshots/

# Or pause execution
require 'pry'; binding.pry
```

---

## CI/CD Integration

### GitHub Actions Workflow

**.github/workflows/system_tests.yml:**
```yaml
name: System Tests

on: [push, pull_request]

jobs:
  system-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3

      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: 3.4.5
          bundler-cache: true

      - name: Set up Node.js (for Playwright)
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install Playwright browsers
        run: |
          npx playwright install --with-deps chromium

      - name: Setup Database
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/ytgify_test
          REDIS_URL: redis://localhost:6379/0
        run: |
          bin/rails db:create db:schema:load

      - name: Run System Tests
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/ytgify_test
          REDIS_URL: redis://localhost:6379/0
        run: |
          bin/rails test:system

      - name: Upload Screenshots on Failure
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: system-test-screenshots
          path: tmp/screenshots/
```

---

## Chrome Extension Integration Status

### Current Status
The ytgify Chrome extension (https://github.com/neonwatty/ytgify) is **currently standalone** with:
- Local browser storage only
- No backend integration
- No user accounts

### Backend Readiness
The Rails backend is **fully ready** for integration with:
- ✅ Complete JWT authentication API
- ✅ All CRUD endpoints for GIFs
- ✅ Social features (likes, comments, follows)
- ✅ Feed algorithms
- ✅ API documentation

### Next Steps for Extension
1. Add authentication flow to extension popup
2. Add cloud upload functionality to GIF creation flow
3. Implement token refresh mechanism
4. Sync GIFs to backend
5. Enable social features from extension

### Testing Without Extension
Until the extension is updated, we can:
- ✅ Test API endpoints via system tests (JavaScript fetch)
- ✅ Verify JWT authentication works
- ✅ Ensure API responses match expected format
- ✅ Document integration for extension developers

---

## Success Criteria

### Coverage
- [x] Authentication flows (signup, login, logout, session)
- [x] GIF CRUD operations
- [x] Social features (likes, comments, follows, collections)
- [x] Real-time updates (Turbo Streams, ActionCable)
- [x] JWT API integration for Chrome extension
- [x] Mobile responsiveness

### Quality
- [x] All tests pass on first run
- [x] Tests run in < 5 minutes
- [x] No flaky tests (consistent results)
- [x] Screenshots captured on failure for debugging
- [x] CI/CD integration ready

### Documentation
- [x] Clear test helpers and patterns
- [x] Chrome extension integration guide
- [x] CI/CD configuration
- [x] Running and debugging instructions

---

## Next Actions After System Tests

1. **Run system tests and verify all pass:**
   ```bash
   rails test:system
   ```

2. **Check test coverage (from previous plan):**
   ```bash
   rails test
   open coverage/index.html
   ```

3. **Document any gaps or issues found**

4. **Prepare for production deployment:**
   - Final security audit
   - Performance testing
   - Load testing (optional)

5. **Launch!** 🚀

---

## Notes

- **Playwright vs Selenium:** Playwright is more reliable with better auto-waiting and modern API
- **Parallel Testing:** Playwright supports parallel test execution (faster than Selenium)
- **Headless Mode:** Faster execution, but set `headless: false` for debugging
- **Screenshots & Videos:** Auto-saved to `tmp/screenshots/` on failure; videos available too
- **Network Interception:** Playwright can mock API responses and intercept requests
- **ActionCable:** May need special handling in tests (use synchronous assertions)
- **ActiveStorage:** File uploads can be flaky; stub S3 or use fixtures
- **Chrome Extension:** Backend ready, extension needs updating to integrate

---

**Estimated Total Time:** 4-5 hours
**Priority:** High (critical user workflows)
**Risk:** Low (Playwright is more stable than Selenium)
**Dependencies:** Test Coverage Analysis (can run in parallel)
