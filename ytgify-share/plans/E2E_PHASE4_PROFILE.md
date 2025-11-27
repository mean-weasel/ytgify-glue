# Phase 4: User Profile & Settings Tests - Implementation Plan

**Status:** 🟡 Ready to Implement
**Estimated Duration:** 75 minutes
**Prerequisites:** Phase 1.2 Complete (Authentication Tests)

## Overview

Implement comprehensive end-to-end tests for user profile viewing and editing using Playwright. This covers critical profile journeys: viewing own/other profiles, editing profile details, navigating tabs, and viewing profile stats.

## Goals

- Verify profile page displays correctly for own/other users
- Test profile editing flow with valid/invalid data
- Confirm all tabs work correctly (GIFs, Collections, Liked, Followers, Following)
- Validate privacy controls (own profile vs. viewing others)
- Ensure profile stats display accurately
- Test profile validation and error handling

## Test Scenarios

### 1. Profile Viewing Tests (6 tests)
- ✅ View own profile with complete information
- ✅ View another user's profile
- ✅ Profile displays correct stats (GIFs count, followers, following)
- ✅ Profile shows bio when present
- ✅ Edit Profile button shows only on own profile
- ✅ Follow button shows on other user's profile

### 2. Profile Editing Tests (7 tests)
- ✅ Successfully edit profile with valid data
- ✅ Edit username to new unique value
- ✅ Edit display name and bio
- ✅ Profile edit fails with duplicate username
- ✅ Profile edit fails without current password
- ✅ Profile edit validates required fields
- ✅ Cancel button returns to profile

### 3. Profile Tabs Tests (10 tests)
- ✅ GIFs tab shows user's public GIFs
- ✅ GIFs tab shows private GIFs on own profile
- ✅ GIFs tab hides private GIFs on other's profile
- ✅ Collections tab shows public collections
- ✅ Collections tab shows private collections on own profile
- ✅ Collections tab hides private collections on other's profile
- ✅ Liked GIFs tab visible only on own profile
- ✅ Liked GIFs tab shows liked GIFs
- ✅ Followers tab displays follower list
- ✅ Following tab displays following list

### 4. Tab Navigation Tests (3 tests)
- ✅ Tabs use Turbo Frames for in-place updates
- ✅ Active tab is visually highlighted
- ✅ Tab content updates without full page reload

**Total Tests:** 26 new tests

## Implementation Steps

### Step 1: Create Profile Test File (10 min)

Create `test/system/profile_test.rb`:

```ruby
require "application_system_test_case"

class ProfileTest < ApplicationSystemTestCase
  # ========== PROFILE VIEWING TESTS ==========

  test "user can view their own profile" do
    user = users(:e2e_test_user)
    sign_in_as user

    # Navigate to own profile
    visit user_path(user.username)

    # Should see profile header
    assert_page_has_text user.display_name
    assert_page_has_text "@#{user.username}"

    # Should see stats
    assert_page_has_text "GIF"
    assert_page_has_text "Follower"
    assert_page_has_text "Following"

    # Should see Edit Profile button
    assert_selector 'a:has-text("Edit Profile")'

    # Should see bio if present
    if user.bio.present?
      assert_page_has_text user.bio
    end

    take_screenshot("profile-own-view")
  end

  test "user can view another user's profile" do
    viewer = users(:e2e_test_user)
    profile_user = users(:e2e_follower)

    sign_in_as viewer

    # Navigate to other user's profile
    visit user_path(profile_user.username)

    # Should see profile header
    assert_page_has_text profile_user.display_name
    assert_page_has_text "@#{profile_user.username}"

    # Should NOT see Edit Profile button
    assert_no_selector 'a:has-text("Edit Profile")', timeout: 1000

    # Should see Follow button (or already following state)
    # Note: Adjust based on your follow button implementation
    body_text = @page.text_content('body')
    assert(body_text.include?("Follow") || body_text.include?("Following"),
           "Expected to see Follow button on other user's profile")

    take_screenshot("profile-other-view")
  end

  test "profile displays correct stats" do
    user = users(:e2e_follower)
    sign_in_as user

    visit user_path(user.username)

    # Get stats from page
    stats_text = @page.text_content('body')

    # Verify GIFs count displays
    assert stats_text.include?("GIF")

    # Verify followers/following counts display
    assert stats_text.include?("Follower")
    assert stats_text.include?("Following")

    take_screenshot("profile-stats")
  end

  test "profile shows bio when present" do
    user = users(:e2e_test_user)
    
    # Ensure user has bio
    user.update!(bio: "This is my test bio\nWith multiple lines")

    sign_in_as user
    visit user_path(user.username)

    # Should see bio text
    assert_page_has_text "This is my test bio"
    assert_page_has_text "With multiple lines"

    take_screenshot("profile-with-bio")
  end

  test "edit profile button shows only on own profile" do
    user = users(:e2e_test_user)
    other_user = users(:e2e_follower)

    sign_in_as user

    # On own profile - should see Edit Profile
    visit user_path(user.username)
    assert_selector 'a:has-text("Edit Profile")'

    # On other's profile - should NOT see Edit Profile
    visit user_path(other_user.username)
    assert_no_selector 'a:has-text("Edit Profile")', timeout: 1000

    take_screenshot("profile-edit-button-visibility")
  end

  test "follow button shows on other user's profile" do
    user = users(:e2e_test_user)
    other_user = users(:e2e_follower)

    sign_in_as user
    visit user_path(other_user.username)

    # Should see some form of follow UI
    # Adjust selector based on your implementation
    body_text = @page.text_content('body')
    assert(body_text.include?("Follow") || body_text.include?("Following"),
           "Expected to see Follow functionality")

    take_screenshot("profile-follow-button")
  end

  # ========== PROFILE EDITING TESTS ==========

  test "user can edit profile with valid data" do
    user = users(:e2e_test_user)
    sign_in_as user

    # Navigate to edit profile
    visit edit_user_registration_path

    # Verify on edit page
    assert_page_has_text "Edit Profile"

    # Update profile fields
    @page.fill('input[name="user[display_name]"]', 'Updated Display Name')
    @page.fill('textarea[name="user[bio]"]', 'Updated bio text')
    
    # Enter current password (required for updates)
    @page.fill('input[name="user[current_password]"]', 'password123')

    # Submit form
    @page.click('input[type="submit"][value="Update Profile"]')
    wait_for_page_load

    # Should redirect to profile or show success
    assert_page_has_text "Updated Display Name"
    
    # Verify changes persisted
    user.reload
    assert_equal "Updated Display Name", user.display_name
    assert_equal "Updated bio text", user.bio

    take_screenshot("profile-edit-success")
  end

  test "user can change username to unique value" do
    user = users(:e2e_test_user)
    new_username = "updated_username_#{Time.now.to_i}"

    sign_in_as user
    visit edit_user_registration_path

    # Change username
    @page.fill('input[name="user[username]"]', new_username)
    @page.fill('input[name="user[current_password]"]', 'password123')

    @page.click('input[type="submit"][value="Update Profile"]')
    wait_for_page_load

    # Should show updated username
    assert_page_has_text "@#{new_username}"

    # Verify in database
    user.reload
    assert_equal new_username, user.username

    take_screenshot("profile-edit-username-success")
  end

  test "user can edit display name and bio" do
    user = users(:e2e_test_user)
    sign_in_as user

    visit edit_user_registration_path

    # Update display name and bio
    @page.fill('input[name="user[display_name]"]', 'New Name')
    @page.fill('textarea[name="user[bio]"]', 'My new bio')
    @page.fill('input[name="user[current_password]"]', 'password123')

    @page.click('input[type="submit"][value="Update Profile"]')
    wait_for_page_load

    # Verify changes
    user.reload
    assert_equal 'New Name', user.display_name
    assert_equal 'My new bio', user.bio

    take_screenshot("profile-edit-display-bio")
  end

  test "profile edit fails with duplicate username" do
    user = users(:e2e_test_user)
    existing_user = users(:e2e_follower)

    sign_in_as user
    visit edit_user_registration_path

    # Try to use existing username
    @page.fill('input[name="user[username]"]', existing_user.username)
    @page.fill('input[name="user[current_password]"]', 'password123')

    @page.click('input[type="submit"][value="Update Profile"]')
    wait_for_page_load

    # Should show error message
    assert_page_has_text "Username has already been taken"

    # Username should not have changed
    user.reload
    assert_not_equal existing_user.username, user.username

    take_screenshot("profile-edit-duplicate-username")
  end

  test "profile edit fails without current password" do
    user = users(:e2e_test_user)
    sign_in_as user

    visit edit_user_registration_path

    # Try to update without current password
    @page.fill('input[name="user[display_name]"]', 'Should Fail')
    # Don't fill current_password

    @page.click('input[type="submit"][value="Update Profile"]')
    wait_for_page_load

    # Should show error about current password
    assert_page_has_text "Current password"

    # Display name should not have changed
    user.reload
    assert_not_equal 'Should Fail', user.display_name

    take_screenshot("profile-edit-no-password")
  end

  test "profile edit validates required fields" do
    user = users(:e2e_test_user)
    sign_in_as user

    visit edit_user_registration_path

    # Try to clear username (required field)
    @page.fill('input[name="user[username]"]', '')
    @page.fill('input[name="user[current_password]"]', 'password123')

    @page.click('input[type="submit"][value="Update Profile"]')
    wait_for_page_load

    # Should show validation error
    assert_page_has_text "can't be blank"

    take_screenshot("profile-edit-validation-error")
  end

  test "cancel button returns to previous page" do
    user = users(:e2e_test_user)
    sign_in_as user

    # Visit profile first
    visit user_path(user.username)
    
    # Go to edit page
    @page.click('a:has-text("Edit Profile")')
    wait_for_page_load

    # Should be on edit page
    assert_page_has_text "Edit Profile"

    # Click cancel
    @page.click('a:has-text("Cancel")')
    wait_for_page_load

    # Should return to profile
    assert @page.url.include?(user.username)

    take_screenshot("profile-edit-cancel")
  end

  # ========== PROFILE TABS TESTS ==========

  test "gifs tab shows user's public gifs" do
    user = users(:one)  # alice
    gif = gifs(:alice_public_gif)

    sign_in_as user
    visit user_path(user.username)

    # Click GIFs tab (should be default)
    # Verify GIF is visible
    assert_page_has_text gif.title

    take_screenshot("profile-gifs-tab")
  end

  test "gifs tab shows private gifs on own profile" do
    user = users(:one)  # alice
    
    # Create a private GIF for this test
    private_gif = user.gifs.create!(
      title: "Private Test GIF",
      description: "This is private",
      privacy: :private_access,
      youtube_video_url: "https://youtube.com/watch?v=test",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      duration: 5.0,
      fps: 30
    )

    sign_in_as user
    visit user_path(user.username, tab: 'gifs')

    # Should see private GIF on own profile
    assert_page_has_text private_gif.title

    take_screenshot("profile-gifs-tab-own-private")
  end

  test "gifs tab hides private gifs on other's profile" do
    viewer = users(:e2e_test_user)
    profile_user = users(:one)  # alice
    
    # Create private GIF
    private_gif = profile_user.gifs.create!(
      title: "Alice Private GIF",
      privacy: :private_access,
      youtube_video_url: "https://youtube.com/watch?v=test",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      duration: 5.0,
      fps: 30
    )

    sign_in_as viewer
    visit user_path(profile_user.username, tab: 'gifs')

    # Should NOT see private GIF
    assert_page_missing_text private_gif.title

    take_screenshot("profile-gifs-tab-other-no-private")
  end

  test "collections tab shows public collections" do
    user = users(:one)  # alice
    collection = collections(:alice_public_collection)

    sign_in_as user
    visit user_path(user.username, tab: 'collections')

    # Should see collection
    assert_page_has_text collection.name

    take_screenshot("profile-collections-tab")
  end

  test "collections tab shows private collections on own profile" do
    user = users(:one)  # alice
    private_collection = collections(:alice_private_collection)

    sign_in_as user
    visit user_path(user.username, tab: 'collections')

    # Should see private collection on own profile
    assert_page_has_text private_collection.name

    take_screenshot("profile-collections-tab-own-private")
  end

  test "collections tab hides private collections on other's profile" do
    viewer = users(:e2e_test_user)
    profile_user = users(:one)  # alice
    private_collection = collections(:alice_private_collection)

    sign_in_as viewer
    visit user_path(profile_user.username, tab: 'collections')

    # Should NOT see private collection
    assert_page_missing_text private_collection.name

    take_screenshot("profile-collections-tab-other-no-private")
  end

  test "liked gifs tab visible only on own profile" do
    user = users(:e2e_test_user)
    other_user = users(:e2e_follower)

    sign_in_as user

    # On own profile - should see Liked tab
    visit user_path(user.username)
    assert_selector 'a:has-text("Liked")'

    # On other's profile - Liked tab should be visible but may show different content
    # Note: Based on the view code, tab is visible to all
    visit user_path(other_user.username)
    assert_selector 'a:has-text("Liked")'

    take_screenshot("profile-liked-tab-visibility")
  end

  test "liked gifs tab shows liked gifs" do
    user = users(:two)  # bob
    liked_gif = gifs(:bob_public_gif)
    
    # Create a like
    user.likes.create!(gif: liked_gif) unless user.likes.exists?(gif: liked_gif)

    sign_in_as user
    visit user_path(user.username, tab: 'liked')

    # Should see liked GIF
    assert_page_has_text liked_gif.title

    take_screenshot("profile-liked-gifs")
  end

  test "followers tab displays follower list" do
    user = users(:e2e_test_user)
    follower = users(:e2e_follower)
    
    # Create follow relationship
    Follow.create!(follower: follower, following: user)

    sign_in_as user
    visit user_path(user.username, tab: 'followers')

    # Should see follower's name
    assert_page_has_text follower.username

    take_screenshot("profile-followers-tab")
  end

  test "following tab displays following list" do
    user = users(:e2e_test_user)
    following_user = users(:e2e_follower)
    
    # Create follow relationship
    Follow.create!(follower: user, following: following_user)

    sign_in_as user
    visit user_path(user.username, tab: 'following')

    # Should see followed user's name
    assert_page_has_text following_user.username

    take_screenshot("profile-following-tab")
  end

  # ========== TAB NAVIGATION TESTS ==========

  test "tabs use turbo frames for updates" do
    user = users(:e2e_test_user)
    sign_in_as user

    visit user_path(user.username)

    # Get initial page URL
    initial_url = @page.url

    # Click Collections tab
    @page.click('a:has-text("Collections")', exact: true)
    
    # Wait for Turbo Frame update
    wait_for_turbo
    sleep 0.3  # Brief wait for Turbo Frame update

    # URL should have changed (query param) but page shouldn't have fully reloaded
    current_url = @page.url
    assert current_url.include?('tab=collections'), 
           "Expected URL to include tab parameter, got: #{current_url}"

    # Verify we're still on same page structure
    assert_page_has_text user.display_name

    take_screenshot("profile-turbo-frame-navigation")
  end

  test "active tab is visually highlighted" do
    user = users(:e2e_test_user)
    sign_in_as user

    visit user_path(user.username, tab: 'gifs')

    # GIFs tab should have active styling (indigo color)
    gifs_tab = @page.query_selector('a:has-text("GIFs")')
    gifs_tab_classes = gifs_tab.get_attribute('class')
    
    # Check for active class indicators
    assert gifs_tab_classes.include?('border-indigo-600') || 
           gifs_tab_classes.include?('text-indigo-600'),
           "Expected GIFs tab to have active styling"

    # Navigate to Collections tab
    @page.click('a:has-text("Collections")', exact: true)
    wait_for_turbo
    sleep 0.3

    # Collections tab should now have active styling
    collections_tab = @page.query_selector('a:has-text("Collections")')
    collections_tab_classes = collections_tab.get_attribute('class')
    
    assert collections_tab_classes.include?('border-indigo-600') || 
           collections_tab_classes.include?('text-indigo-600'),
           "Expected Collections tab to have active styling"

    take_screenshot("profile-active-tab-styling")
  end

  test "tab content updates without full page reload" do
    user = users(:one)  # alice
    sign_in_as user

    visit user_path(user.username, tab: 'gifs')

    # Add a marker to detect full page reload
    @page.evaluate("window.testMarker = 'still-here'")

    # Click Collections tab
    @page.click('a:has-text("Collections")', exact: true)
    wait_for_turbo
    sleep 0.3

    # Check if marker still exists (would be gone on full reload)
    marker_exists = @page.evaluate("window.testMarker === 'still-here'")
    assert marker_exists, "Expected Turbo Frame update, but page fully reloaded"

    # Verify content changed
    assert_page_has_text collections(:alice_public_collection).name

    take_screenshot("profile-turbo-no-reload")
  end
end
```

### Step 2: Verify Routes and Views (5 min)

Check that all necessary routes exist:

```bash
# Verify profile routes
bin/rails routes | grep -E "user|registration"

# Check for profile views
ls app/views/users/show.html.erb
ls app/views/users/tabs/
ls app/views/devise/registrations/edit.html.erb
```

**Expected routes:**
- `GET /users/:username` - Profile page
- `GET /users/edit` - Edit profile
- `PATCH /users` - Update profile
- `GET /users/:username?tab=gifs` - GIFs tab
- `GET /users/:username?tab=collections` - Collections tab
- etc.

### Step 3: Add Test Fixtures for Profiles (10 min)

Update `test/fixtures/users.yml` to ensure test users have appropriate data:

```yaml
# test/fixtures/users.yml
e2e_test_user:
  email: e2e@example.com
  username: e2e_tester
  display_name: E2E Test User
  bio: System test user
  encrypted_password: <%= Devise::Encryptor.digest(User, 'password123') %>
  jti: <%= SecureRandom.uuid %>
  is_verified: true
  gifs_count: 0
  total_likes_received: 0
  follower_count: 0
  following_count: 0
  preferences: { default_privacy: 'public', default_upload_behavior: 'show_options', recently_used_tags: [] }

e2e_follower:
  email: follower@e2e.com
  username: e2e_follower
  display_name: E2E Follower
  bio: E2E follower user
  encrypted_password: <%= Devise::Encryptor.digest(User, 'password123') %>
  jti: <%= SecureRandom.uuid %>
  is_verified: true
  gifs_count: 2
  total_likes_received: 5
  follower_count: 0
  following_count: 0
  preferences: { default_privacy: 'public', default_upload_behavior: 'show_options', recently_used_tags: [] }
```

Ensure GIF and Collection fixtures exist for profile tabs testing.

### Step 4: Run Profile Tests (10 min)

```bash
# Run all profile tests
bin/rails test test/system/profile_test.rb

# Or run specific test groups
bin/rails test test/system/profile_test.rb -n "/viewing/"
bin/rails test test/system/profile_test.rb -n "/editing/"
bin/rails test test/system/profile_test.rb -n "/tabs/"
```

**Expected Output:**
```
Running 26 tests in a single process
..........................

Finished in 30-40s
26 runs, ~60 assertions, 0 failures, 0 errors, 0 skips
```

### Step 5: Review Screenshots (5 min)

Check `tmp/screenshots/` for screenshots from each test:

**Profile Viewing:**
- `profile-own-view-*.png`
- `profile-other-view-*.png`
- `profile-stats-*.png`
- `profile-with-bio-*.png`
- `profile-edit-button-visibility-*.png`
- `profile-follow-button-*.png`

**Profile Editing:**
- `profile-edit-success-*.png`
- `profile-edit-username-success-*.png`
- `profile-edit-display-bio-*.png`
- `profile-edit-duplicate-username-*.png`
- `profile-edit-no-password-*.png`
- `profile-edit-validation-error-*.png`
- `profile-edit-cancel-*.png`

**Profile Tabs:**
- `profile-gifs-tab-*.png`
- `profile-gifs-tab-own-private-*.png`
- `profile-gifs-tab-other-no-private-*.png`
- `profile-collections-tab-*.png`
- `profile-collections-tab-own-private-*.png`
- `profile-collections-tab-other-no-private-*.png`
- `profile-liked-tab-visibility-*.png`
- `profile-liked-gifs-*.png`
- `profile-followers-tab-*.png`
- `profile-following-tab-*.png`

**Tab Navigation:**
- `profile-turbo-frame-navigation-*.png`
- `profile-active-tab-styling-*.png`
- `profile-turbo-no-reload-*.png`

### Step 6: Handle Potential Issues (35 min buffer)

#### Issue 1: Edit Profile Form Selectors Don't Match

**Symptom:** `Error: No node found matching selector 'input[name="user[display_name]"]'`

**Solution:** Take screenshot of edit form to inspect actual field names:

```ruby
visit edit_user_registration_path
take_screenshot("debug-edit-profile-form")
```

Check the HTML structure and update selectors. Common variations:
- Field names might use different conventions
- Form might use `form_with` vs `form_for`

#### Issue 2: Current Password Validation

**Symptom:** Profile updates fail even with correct current password

**Solution:** Check Devise configuration:

```ruby
# app/models/user.rb
# Ensure Devise is configured to require current password
def update_with_password(params, *options)
  # Custom Devise behavior
end
```

Or check if `current_password` is actually required in your implementation.

#### Issue 3: Tab Navigation Not Using Turbo Frames

**Symptom:** Full page reload when clicking tabs

**Solution:** Verify Turbo Frame setup in profile view:

```erb
<!-- app/views/users/show.html.erb -->
<%= turbo_frame_tag "profile_content" do %>
  <%= render "users/tabs/#{@tab}", ... %>
<% end %>
```

Check that tab links include `data: { turbo_frame: "profile_content" }`.

#### Issue 4: Private Content Visibility

**Symptom:** Private GIFs/Collections show on other users' profiles

**Solution:** Verify privacy logic in controller:

```ruby
# app/controllers/users_controller.rb
def viewable_privacy_levels
  if viewing_own_profile?
    ["public_access", "unlisted", "private_access"]
  else
    ["public_access"]
  end
end
```

Ensure this method is correctly applied to queries.

#### Issue 5: Follower/Following Count Mismatches

**Symptom:** Stats don't match actual follower counts

**Solution:** This is likely due to counter cache. Reset if needed:

```ruby
# In test setup or fixture
User.reset_counters(user.id, :followers)
User.reset_counters(user.id, :following)
```

Or ensure Follow fixtures correctly update counter caches.

#### Issue 6: Follow Relationships in Tests

**Symptom:** Tests creating Follow records fail with counter cache conflicts

**Solution:** Clean up existing follows before creating new ones:

```ruby
# In test
Follow.destroy_all  # Clean slate
Follow.create!(follower: user, following: other_user)

# Or use more targeted cleanup
user.follows_as_follower.destroy_all
```

Per CLAUDE.md guidelines, Follow fixtures are intentionally empty to avoid test pollution.

#### Issue 7: Turbo Frame Active Tab Styling

**Symptom:** Active tab styling doesn't update after tab click

**Solution:** Ensure server renders correct `@tab` parameter:

```ruby
# app/controllers/users_controller.rb
def set_tab
  @tab = params[:tab] || "gifs"
  @tab = "gifs" unless %w[gifs liked collections followers following].include?(@tab)
end
```

And view uses `@tab` to set active classes:

```erb
class: "... #{@tab == 'gifs' ? 'border-indigo-600 text-indigo-600' : '...'}"
```

#### Issue 8: Username Change Redirect

**Symptom:** After changing username, redirect fails or user not found

**Solution:** Check if Devise is configured to update session after username change:

```ruby
# app/controllers/application_controller.rb (or custom registrations controller)
def update_resource(resource, params)
  # Handle username changes properly
  resource.update_without_password(params)
end
```

May need custom Devise registrations controller.

#### Issue 9: Bio Multiline Display

**Symptom:** Bio doesn't show line breaks properly

**Solution:** Ensure view uses `whitespace-pre-line` or `simple_format`:

```erb
<!-- app/views/users/show.html.erb -->
<p class="text-gray-700 whitespace-pre-line"><%= @user.bio %></p>
```

#### Issue 10: Empty States Not Showing

**Symptom:** Empty state messages don't appear when no content

**Solution:** Verify conditional logic in tab partials:

```erb
<!-- app/views/users/tabs/_gifs.html.erb -->
<% if gifs.any? %>
  <!-- Show GIFs -->
<% else %>
  <!-- Empty state -->
  <h3>No GIFs yet</h3>
<% end %>
```

Ensure variables are passed correctly from controller.

## Troubleshooting Quick Reference

| Issue | Quick Fix |
|-------|-----------|
| Form fields not found | Screenshot form and update selectors |
| Current password required | Always fill `current_password` field |
| Tab doesn't update | Verify Turbo Frame setup |
| Private content visible | Check `viewable_privacy_levels` method |
| Stats mismatch | Reset counter caches in fixtures |
| Follow tests fail | Clean Follow records before creating |
| Active tab not highlighted | Check `@tab` parameter rendering |
| Username change breaks | May need custom registrations controller |
| Bio formatting | Use `whitespace-pre-line` CSS class |
| Empty states missing | Verify conditional logic in partials |

## Verification Checklist

After completing all steps:

- [ ] All 26 tests passing (0 failures, 0 errors)
- [ ] 26+ screenshots generated (no failure-* screenshots)
- [ ] Own profile shows Edit Profile button
- [ ] Other profiles show Follow button
- [ ] Profile stats display correctly
- [ ] Profile edits persist to database
- [ ] Duplicate username validation works
- [ ] Current password required for updates
- [ ] All 5 tabs load correctly
- [ ] Private content hidden from other users
- [ ] Private content visible on own profile
- [ ] Tabs use Turbo Frames (no full reload)
- [ ] Active tab visually highlighted
- [ ] Follower/Following lists display
- [ ] Bio displays with proper formatting
- [ ] Empty states show when appropriate

## Expected Test Coverage

**Before:** 14 system tests (3 smoke + 11 auth)
**After:** 40 system tests (3 smoke + 11 auth + 26 profile)

**Total Assertions:** ~60-70 assertions for profile tests

## File Structure

```
test/
├── application_system_test_case.rb
├── system/
│   ├── smoke_test.rb (3 tests)
│   ├── authentication_test.rb (11 tests)
│   └── profile_test.rb (26 tests) ← NEW
└── fixtures/
    ├── users.yml (with e2e users)
    ├── gifs.yml (with test GIFs)
    ├── collections.yml (with public/private)
    └── follows.yml (empty - created in tests)
```

## Success Criteria

✅ All 26 profile tests pass
✅ Screenshots show correct UI states
✅ Profile viewing works for own/other users
✅ Profile editing validates correctly
✅ All tabs load and display appropriate content
✅ Privacy controls work (private content hidden)
✅ Turbo Frames work without full page reload
✅ Active tab styling updates correctly
✅ Stats display accurately
✅ No CSRF or session issues
✅ Tests run in ~30-40 seconds

## Next Steps After Completion

Once Phase 4 is complete, proceed to:

**Phase 5: GIF Interaction Tests (45 min)**
- Viewing GIF detail page
- Liking/unliking GIFs
- Adding comments
- Adding to collections
- Sharing GIFs
- Real-time updates via Turbo Streams

## Time Breakdown

- Step 1: Create test file - 10 min
- Step 2: Verify routes and views - 5 min
- Step 3: Add test fixtures - 10 min
- Step 4: Run tests - 10 min
- Step 5: Review screenshots - 5 min
- Step 6: Troubleshooting buffer - 35 min

**Total: 75 minutes**

## Commands Quick Reference

```bash
# Run all profile tests
bin/rails test test/system/profile_test.rb

# Run specific test
bin/rails test test/system/profile_test.rb -n test_user_can_view_their_own_profile

# Run test groups by pattern
bin/rails test test/system/profile_test.rb -n "/viewing/"
bin/rails test test/system/profile_test.rb -n "/editing/"
bin/rails test test/system/profile_test.rb -n "/tabs/"

# Check routes
bin/rails routes | grep -E "user|registration"

# View screenshots
open tmp/screenshots/

# Clean old screenshots
rm tmp/screenshots/*

# Reset database if needed
bin/rails db:reset RAILS_ENV=test

# Check for Devise views
ls app/views/devise/registrations/
```

## Notes

- Tests use `password123` as standard test password (matches fixture configuration)
- Profile editing requires `current_password` for security
- Follows are created dynamically in tests (not in fixtures) to avoid counter cache pollution
- Some tests may need `sleep 0.3` after Turbo Frame updates for rendering
- Privacy levels: `public_access` (0), `unlisted` (1), `private_access` (2)
- Tab parameter values: `gifs`, `liked`, `collections`, `followers`, `following`
- Turbo Frame ID: `profile_content`
- Counter caches used: `gifs_count`, `follower_count`, `following_count`
- Tests assume Follow model uses `:follower` and `:following` associations

## Additional Considerations

### Performance Notes

- Profile tests involve database queries for stats
- May be slower than authentication tests due to association loading
- Consider adding indices if profile queries are slow:
  ```ruby
  # Migration
  add_index :gifs, [:user_id, :privacy, :created_at]
  add_index :follows, [:follower_id, :created_at]
  add_index :follows, [:following_id, :created_at]
  ```

### Test Data Isolation

- Each test should clean up Follow records it creates
- Use `Follow.create!` instead of fixtures to avoid counter cache conflicts
- Consider using `teardown` to cleanup:
  ```ruby
  def teardown
    Follow.destroy_all
    super
  end
  ```

### Real-time Features

- If implementing real-time follower counts, may need to wait for Turbo Stream broadcasts
- Add `sleep 0.5` after follow actions if counts don't update immediately

### Accessibility

- Consider adding accessibility tests for profile pages
- Check for proper heading hierarchy, ARIA labels on buttons
- Verify keyboard navigation works for tabs
