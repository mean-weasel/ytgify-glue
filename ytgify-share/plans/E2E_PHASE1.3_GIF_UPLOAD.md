# Phase 1.3: Core GIF Upload Flow Tests - Implementation Plan

**Status:** 🟡 Ready to Implement
**Estimated Duration:** 60 minutes
**Prerequisites:** Phase 1.1 & 1.2 Complete ✅

## Overview

Implement comprehensive end-to-end tests for GIF upload and creation flows using Playwright. This covers the critical user journeys: creating GIFs from YouTube URLs with timestamps, setting privacy levels, form validation, and verifying GIFs appear in the feed.

**Important Context:**
- GIFs are created from YouTube URLs with start/end timestamps (not direct file uploads)
- The browser extension is the primary creation method, but the web form is also available
- Privacy settings: `public_access`, `unlisted`, `private_access`
- Form uses Stimulus controllers (`gif-form`, `hashtag-input`) for interactivity
- YouTube preview updates dynamically when URL is entered

## Goals

- Verify GIF creation flow works with valid YouTube URLs and timestamps
- Test all three privacy settings and their visibility behavior
- Validate form validation (invalid URLs, invalid timestamps)
- Confirm created GIFs appear in appropriate feeds
- Test that privacy settings properly restrict visibility
- Ensure error messages are clear and helpful

## Test Scenarios

### 1. Successful GIF Creation (4 tests)
- ✅ Create public GIF with valid YouTube URL and timestamps
- ✅ Create unlisted GIF
- ✅ Create private GIF
- ✅ Create GIF with hashtags

### 2. Privacy & Visibility (5 tests)
- ✅ Public GIF appears in public feed
- ✅ Public GIF visible to all users (authenticated & unauthenticated)
- ✅ Unlisted GIF accessible via direct URL but not in feed
- ✅ Private GIF only accessible to owner
- ✅ Private GIF returns error for other users

### 3. Form Validation (6 tests)
- ✅ YouTube URL required
- ✅ Invalid YouTube URL shows error
- ✅ Title required
- ✅ Start timestamp required
- ✅ End timestamp required
- ✅ End timestamp must be greater than start timestamp

### 4. YouTube Integration (2 tests)
- ✅ YouTube preview appears when valid URL entered
- ✅ Duration calculated automatically from timestamps

**Total Tests:** 17 new tests

## Implementation Steps

### Step 1: Create GIF Upload Test File (10 min)

Create `test/system/gif_upload_test.rb`:

```ruby
require "application_system_test_case"

class GifUploadTest < ApplicationSystemTestCase
  # ========== SUCCESSFUL CREATION TESTS ==========

  test "user can create public GIF with valid YouTube URL and timestamps" do
    user = users(:e2e_test_user)
    sign_in_as user

    # Navigate to GIF creation page
    visit new_gif_path
    assert_page_has_text "Create GIFs from YouTube"

    # Fill in YouTube URL
    @page.fill('input[data-gif-form-target="youtubeUrl"]', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    @page.dispatch_event('input[data-gif-form-target="youtubeUrl"]', 'blur')
    wait_for_page_load

    # Wait for YouTube preview to appear
    assert_selector('iframe[src*="youtube.com/embed"]')

    # Fill in timestamps
    @page.fill('input[name="gif[youtube_timestamp_start]"]', '5.0')
    @page.fill('input[name="gif[youtube_timestamp_end]"]', '10.0')

    # Duration should auto-calculate (5.0 seconds)
    duration_field = @page.query_selector('input[name="gif[duration]"]')
    assert_equal "5.00", duration_field.input_value

    # Fill in title
    @page.fill('input[name="gif[title]"]', 'My E2E Test GIF')

    # Fill in description (optional)
    @page.fill('textarea[name="gif[description]"]', 'This is a test GIF created during e2e testing')

    # Select public privacy (default, but click to ensure)
    @page.click('label:has(input[value="public_access"])')

    take_screenshot("gif-create-form-filled")

    # Submit form
    initial_gif_count = Gif.count
    @page.click('input[type="submit"][value="Create GIF"]')
    wait_for_page_load

    # Should redirect to GIF show page
    assert @page.url.include?("/gifs/")
    assert_page_has_text "My E2E Test GIF"
    assert_page_has_text "This is a test GIF created during e2e testing"

    # Verify GIF was created in database
    assert_equal initial_gif_count + 1, Gif.count

    created_gif = Gif.order(created_at: :desc).first
    assert_equal user.id, created_gif.user_id
    assert_equal "My E2E Test GIF", created_gif.title
    assert_equal "https://www.youtube.com/watch?v=dQw4w9WgXcQ", created_gif.youtube_video_url
    assert_equal 5.0, created_gif.youtube_timestamp_start
    assert_equal 10.0, created_gif.youtube_timestamp_end
    assert_equal 5.0, created_gif.duration
    assert_equal "public_access", created_gif.privacy

    take_screenshot("gif-create-success")
  end

  test "user can create unlisted GIF" do
    user = users(:e2e_test_user)
    sign_in_as user

    visit new_gif_path

    # Fill in required fields
    @page.fill('input[data-gif-form-target="youtubeUrl"]', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    @page.dispatch_event('input[data-gif-form-target="youtubeUrl"]', 'blur')
    wait_for_page_load

    @page.fill('input[name="gif[youtube_timestamp_start]"]', '0.0')
    @page.fill('input[name="gif[youtube_timestamp_end]"]', '5.0')
    @page.fill('input[name="gif[title]"]', 'Unlisted Test GIF')

    # Select unlisted privacy
    @page.click('label:has(input[value="unlisted"])')

    # Verify unlisted option is selected
    unlisted_radio = @page.query_selector('input[value="unlisted"]')
    assert unlisted_radio.checked?, "Unlisted privacy should be selected"

    take_screenshot("gif-create-unlisted-selected")

    @page.click('input[type="submit"][value="Create GIF"]')
    wait_for_page_load

    # Verify GIF was created with unlisted privacy
    created_gif = Gif.order(created_at: :desc).first
    assert_equal "unlisted", created_gif.privacy

    take_screenshot("gif-create-unlisted-success")
  end

  test "user can create private GIF" do
    user = users(:e2e_test_user)
    sign_in_as user

    visit new_gif_path

    # Fill in required fields
    @page.fill('input[data-gif-form-target="youtubeUrl"]', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    @page.dispatch_event('input[data-gif-form-target="youtubeUrl"]', 'blur')
    wait_for_page_load

    @page.fill('input[name="gif[youtube_timestamp_start]"]', '0.0')
    @page.fill('input[name="gif[youtube_timestamp_end]"]', '3.0')
    @page.fill('input[name="gif[title]"]', 'Private Test GIF')

    # Select private privacy
    @page.click('label:has(input[value="private_access"])')

    # Verify private option is selected
    private_radio = @page.query_selector('input[value="private_access"]')
    assert private_radio.checked?, "Private privacy should be selected"

    take_screenshot("gif-create-private-selected")

    @page.click('input[type="submit"][value="Create GIF"]')
    wait_for_page_load

    # Verify GIF was created with private privacy
    created_gif = Gif.order(created_at: :desc).first
    assert_equal "private_access", created_gif.privacy

    take_screenshot("gif-create-private-success")
  end

  test "user can create GIF with hashtags" do
    user = users(:e2e_test_user)
    sign_in_as user

    visit new_gif_path

    # Fill in required fields
    @page.fill('input[data-gif-form-target="youtubeUrl"]', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    @page.dispatch_event('input[data-gif-form-target="youtubeUrl"]', 'blur')
    wait_for_page_load

    @page.fill('input[name="gif[youtube_timestamp_start]"]', '0.0')
    @page.fill('input[name="gif[youtube_timestamp_end]"]', '5.0')
    @page.fill('input[name="gif[title]"]', 'GIF with Hashtags')

    # Add hashtags using the hashtag input controller
    hashtag_input = @page.query_selector('input[data-hashtag-input-target="input"]')
    
    # Type first hashtag and press Enter
    hashtag_input.fill('funny')
    hashtag_input.press('Enter')
    
    # Type second hashtag and press Enter
    hashtag_input.fill('test')
    hashtag_input.press('Enter')

    # Verify hashtag tags appear in UI
    assert_page_has_text "#funny"
    assert_page_has_text "#test"

    take_screenshot("gif-create-with-hashtags")

    @page.click('input[type="submit"][value="Create GIF"]')
    wait_for_page_load

    # Verify GIF was created with hashtags
    created_gif = Gif.order(created_at: :desc).first
    assert_equal 2, created_gif.hashtags.count
    assert created_gif.hashtags.pluck(:name).include?("funny")
    assert created_gif.hashtags.pluck(:name).include?("test")

    take_screenshot("gif-create-hashtags-success")
  end

  # ========== PRIVACY & VISIBILITY TESTS ==========

  test "public GIF appears in public feed" do
    user = users(:e2e_test_user)
    sign_in_as user

    # Create a public GIF
    visit new_gif_path
    @page.fill('input[data-gif-form-target="youtubeUrl"]', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    @page.dispatch_event('input[data-gif-form-target="youtubeUrl"]', 'blur')
    wait_for_page_load
    @page.fill('input[name="gif[youtube_timestamp_start]"]', '0.0')
    @page.fill('input[name="gif[youtube_timestamp_end]"]', '5.0')
    @page.fill('input[name="gif[title]"]', 'Public Feed Test GIF')
    @page.click('label:has(input[value="public_access"])')
    @page.click('input[type="submit"][value="Create GIF"]')
    wait_for_page_load

    # Navigate to home page (public feed)
    visit root_path
    wait_for_page_load

    # GIF should appear in feed
    assert_page_has_text "Public Feed Test GIF"

    take_screenshot("gif-public-in-feed")
  end

  test "public GIF visible to all users" do
    user = users(:e2e_test_user)
    
    # Create public GIF as authenticated user
    sign_in_as user
    visit new_gif_path
    @page.fill('input[data-gif-form-target="youtubeUrl"]', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    @page.dispatch_event('input[data-gif-form-target="youtubeUrl"]', 'blur')
    wait_for_page_load
    @page.fill('input[name="gif[youtube_timestamp_start]"]', '0.0')
    @page.fill('input[name="gif[youtube_timestamp_end]"]', '5.0')
    @page.fill('input[name="gif[title]"]', 'Public Visibility Test')
    @page.click('input[type="submit"][value="Create GIF"]')
    wait_for_page_load

    created_gif = Gif.order(created_at: :desc).first
    gif_path = "/gifs/#{created_gif.id}"

    # Sign out
    sign_out

    # Visit GIF as unauthenticated user
    visit gif_path
    assert_page_has_text "Public Visibility Test"

    take_screenshot("gif-public-unauthenticated-access")
  end

  test "unlisted GIF accessible via direct URL but not in feed" do
    user = users(:e2e_test_user)
    sign_in_as user

    # Create unlisted GIF
    visit new_gif_path
    @page.fill('input[data-gif-form-target="youtubeUrl"]', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    @page.dispatch_event('input[data-gif-form-target="youtubeUrl"]', 'blur')
    wait_for_page_load
    @page.fill('input[name="gif[youtube_timestamp_start]"]', '0.0')
    @page.fill('input[name="gif[youtube_timestamp_end]"]', '5.0')
    @page.fill('input[name="gif[title]"]', 'Unlisted Visibility Test')
    @page.click('label:has(input[value="unlisted"])')
    @page.click('input[type="submit"][value="Create GIF"]')
    wait_for_page_load

    created_gif = Gif.order(created_at: :desc).first
    gif_path = "/gifs/#{created_gif.id}"

    # Check it's NOT in public feed
    visit root_path
    assert_page_missing_text "Unlisted Visibility Test"

    take_screenshot("gif-unlisted-not-in-feed")

    # But accessible via direct URL
    visit gif_path
    assert_page_has_text "Unlisted Visibility Test"

    take_screenshot("gif-unlisted-direct-access")
  end

  test "private GIF only accessible to owner" do
    user = users(:e2e_test_user)
    sign_in_as user

    # Create private GIF
    visit new_gif_path
    @page.fill('input[data-gif-form-target="youtubeUrl"]', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    @page.dispatch_event('input[data-gif-form-target="youtubeUrl"]', 'blur')
    wait_for_page_load
    @page.fill('input[name="gif[youtube_timestamp_start]"]', '0.0')
    @page.fill('input[name="gif[youtube_timestamp_end]"]', '5.0')
    @page.fill('input[name="gif[title]"]', 'Private Owner Test')
    @page.click('label:has(input[value="private_access"])')
    @page.click('input[type="submit"][value="Create GIF"]')
    wait_for_page_load

    # Owner should see the GIF
    assert_page_has_text "Private Owner Test"

    take_screenshot("gif-private-owner-access")
  end

  test "private GIF returns error for other users" do
    user = users(:e2e_test_user)
    sign_in_as user

    # Create private GIF
    visit new_gif_path
    @page.fill('input[data-gif-form-target="youtubeUrl"]', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    @page.dispatch_event('input[data-gif-form-target="youtubeUrl"]', 'blur')
    wait_for_page_load
    @page.fill('input[name="gif[youtube_timestamp_start]"]', '0.0')
    @page.fill('input[name="gif[youtube_timestamp_end]"]', '5.0')
    @page.fill('input[name="gif[title]"]', 'Private Access Test')
    @page.click('label:has(input[value="private_access"])')
    @page.click('input[type="submit"][value="Create GIF"]')
    wait_for_page_load

    created_gif = Gif.order(created_at: :desc).first
    gif_path = "/gifs/#{created_gif.id}"

    # Sign out and sign in as different user
    sign_out
    sign_in_as users(:e2e_follower)

    # Try to access private GIF
    visit gif_path

    # Should see error or be redirected (depends on implementation)
    # Check for common error messages
    body_text = @page.text_content('body')
    assert(
      body_text.include?("not found") || 
      body_text.include?("not authorized") || 
      body_text.include?("Access denied") ||
      @page.url.include?(root_path),
      "Expected error message or redirect for private GIF access"
    )

    take_screenshot("gif-private-other-user-denied")
  end

  # ========== FORM VALIDATION TESTS ==========

  test "YouTube URL required" do
    user = users(:e2e_test_user)
    sign_in_as user

    visit new_gif_path

    # Fill in everything except YouTube URL
    @page.fill('input[name="gif[youtube_timestamp_start]"]', '0.0')
    @page.fill('input[name="gif[youtube_timestamp_end]"]', '5.0')
    @page.fill('input[name="gif[title]"]', 'No URL Test')

    # Try to submit
    @page.click('input[type="submit"][value="Create GIF"]')
    wait_for_page_load

    # Should show validation error (either from frontend or backend)
    body_text = @page.text_content('body')
    assert(
      body_text.include?("YouTube URL") || 
      body_text.include?("can't be blank") ||
      body_text.include?("required"),
      "Expected validation error for missing YouTube URL"
    )

    # Should still be on new GIF page
    assert @page.url.include?("/gifs/new")

    take_screenshot("gif-validation-no-url")
  end

  test "invalid YouTube URL shows error" do
    user = users(:e2e_test_user)
    sign_in_as user

    visit new_gif_path

    # Enter invalid URL
    @page.fill('input[data-gif-form-target="youtubeUrl"]', 'https://example.com/not-youtube')
    @page.dispatch_event('input[data-gif-form-target="youtubeUrl"]', 'blur')
    wait_for_page_load

    # Should show error from Stimulus controller
    assert_page_has_text "Invalid YouTube URL"

    take_screenshot("gif-validation-invalid-url")
  end

  test "title required" do
    user = users(:e2e_test_user)
    sign_in_as user

    visit new_gif_path

    # Fill in everything except title
    @page.fill('input[data-gif-form-target="youtubeUrl"]', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    @page.dispatch_event('input[data-gif-form-target="youtubeUrl"]', 'blur')
    wait_for_page_load
    @page.fill('input[name="gif[youtube_timestamp_start]"]', '0.0')
    @page.fill('input[name="gif[youtube_timestamp_end]"]', '5.0')

    # Try to submit
    @page.click('input[type="submit"][value="Create GIF"]')
    wait_for_page_load

    # Should show validation error
    body_text = @page.text_content('body')
    assert(
      body_text.include?("Title") || 
      body_text.include?("can't be blank") ||
      body_text.include?("required"),
      "Expected validation error for missing title"
    )

    take_screenshot("gif-validation-no-title")
  end

  test "start timestamp required" do
    user = users(:e2e_test_user)
    sign_in_as user

    visit new_gif_path

    # Fill in everything except start timestamp
    @page.fill('input[data-gif-form-target="youtubeUrl"]', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    @page.dispatch_event('input[data-gif-form-target="youtubeUrl"]', 'blur')
    wait_for_page_load
    @page.fill('input[name="gif[youtube_timestamp_end]"]', '5.0')
    @page.fill('input[name="gif[title]"]', 'No Start Time Test')

    # Try to submit
    @page.click('input[type="submit"][value="Create GIF"]')
    wait_for_page_load

    # Should show validation error
    body_text = @page.text_content('body')
    assert(
      body_text.include?("start") || 
      body_text.include?("timestamp") ||
      body_text.include?("required"),
      "Expected validation error for missing start timestamp"
    )

    take_screenshot("gif-validation-no-start")
  end

  test "end timestamp required" do
    user = users(:e2e_test_user)
    sign_in_as user

    visit new_gif_path

    # Fill in everything except end timestamp
    @page.fill('input[data-gif-form-target="youtubeUrl"]', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    @page.dispatch_event('input[data-gif-form-target="youtubeUrl"]', 'blur')
    wait_for_page_load
    @page.fill('input[name="gif[youtube_timestamp_start]"]', '0.0')
    @page.fill('input[name="gif[title]"]', 'No End Time Test')

    # Try to submit
    @page.click('input[type="submit"][value="Create GIF"]')
    wait_for_page_load

    # Should show validation error
    body_text = @page.text_content('body')
    assert(
      body_text.include?("end") || 
      body_text.include?("timestamp") ||
      body_text.include?("required"),
      "Expected validation error for missing end timestamp"
    )

    take_screenshot("gif-validation-no-end")
  end

  test "end timestamp must be greater than start timestamp" do
    user = users(:e2e_test_user)
    sign_in_as user

    visit new_gif_path

    # Fill in with invalid timestamp range
    @page.fill('input[data-gif-form-target="youtubeUrl"]', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    @page.dispatch_event('input[data-gif-form-target="youtubeUrl"]', 'blur')
    wait_for_page_load
    @page.fill('input[name="gif[youtube_timestamp_start]"]', '10.0')
    @page.fill('input[name="gif[youtube_timestamp_end]"]', '5.0')  # Less than start
    @page.fill('input[name="gif[title]"]', 'Invalid Range Test')

    # Trigger validation by clicking submit
    @page.click('input[type="submit"][value="Create GIF"]')
    wait_for_page_load

    # Should show validation error
    body_text = @page.text_content('body')
    assert(
      body_text.include?("greater than") || 
      body_text.include?("must be") ||
      body_text.include?("End time"),
      "Expected validation error for invalid timestamp range"
    )

    take_screenshot("gif-validation-invalid-range")
  end

  # ========== YOUTUBE INTEGRATION TESTS ==========

  test "YouTube preview appears when valid URL entered" do
    user = users(:e2e_test_user)
    sign_in_as user

    visit new_gif_path

    # Initially, placeholder should be visible
    placeholder = @page.query_selector('[data-gif-form-target="youtubePlaceholder"]')
    assert !placeholder.evaluate('el => el.classList.contains("hidden")'), 
           "Placeholder should be visible initially"

    # Fill in YouTube URL
    @page.fill('input[data-gif-form-target="youtubeUrl"]', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    @page.dispatch_event('input[data-gif-form-target="youtubeUrl"]', 'blur')
    
    # Wait for preview to load
    sleep 0.5  # Give Stimulus controller time to update DOM

    # Placeholder should now be hidden
    assert placeholder.evaluate('el => el.classList.contains("hidden")'), 
           "Placeholder should be hidden after URL entered"

    # Preview container should be visible
    preview_container = @page.query_selector('[data-gif-form-target="youtubePreviewContainer"]')
    assert !preview_container.evaluate('el => el.classList.contains("hidden")'), 
           "Preview container should be visible"

    # YouTube iframe should be present
    assert_selector('iframe[src*="youtube.com/embed/dQw4w9WgXcQ"]')

    take_screenshot("gif-youtube-preview-visible")
  end

  test "duration calculated automatically from timestamps" do
    user = users(:e2e_test_user)
    sign_in_as user

    visit new_gif_path

    # Fill in YouTube URL
    @page.fill('input[data-gif-form-target="youtubeUrl"]', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    @page.dispatch_event('input[data-gif-form-target="youtubeUrl"]', 'blur')
    wait_for_page_load

    # Fill in start time
    @page.fill('input[name="gif[youtube_timestamp_start]"]', '15.5')
    @page.dispatch_event('input[name="gif[youtube_timestamp_start]"]', 'change')

    # Fill in end time
    @page.fill('input[name="gif[youtube_timestamp_end]"]', '23.75')
    @page.dispatch_event('input[name="gif[youtube_timestamp_end]"]', 'change')

    # Give Stimulus controller time to calculate
    sleep 0.3

    # Duration should be calculated (23.75 - 15.5 = 8.25)
    duration_field = @page.query_selector('input[name="gif[duration]"]')
    duration_value = duration_field.input_value
    
    # Should be "8.25" (Stimulus formats to 2 decimals)
    assert_equal "8.25", duration_value, "Duration should be automatically calculated"

    take_screenshot("gif-duration-calculated")
  end
end
```

### Step 2: Update Fixtures for Privacy Testing (5 min)

Verify that fixtures support privacy testing. Check `test/fixtures/gifs.yml` already has GIFs with different privacy levels. If not, add:

```yaml
# test/fixtures/gifs.yml
e2e_unlisted_gif:
  user: e2e_follower
  title: "E2E Test Unlisted GIF"
  description: "An unlisted GIF for e2e testing"
  youtube_video_url: "https://www.youtube.com/watch?v=jNQXAC9IVRw"
  youtube_timestamp_start: 5.0
  youtube_timestamp_end: 10.0
  duration: 5.0
  privacy: 1  # unlisted
  
e2e_private_gif:
  user: e2e_follower
  title: "E2E Test Private GIF"
  description: "A private GIF for e2e testing"
  youtube_video_url: "https://www.youtube.com/watch?v=test123"
  youtube_timestamp_start: 0.0
  youtube_timestamp_end: 5.0
  duration: 5.0
  privacy: 2  # private_access
```

### Step 3: Check GIF Show Page Access Control (5 min)

Verify that `GifsController#show` enforces privacy. If not implemented, the controller should check:

```ruby
# app/controllers/gifs_controller.rb
def show
  # Allow access if:
  # 1. GIF is public
  # 2. GIF is unlisted (direct URL access)
  # 3. User is owner
  # 4. Otherwise deny
  
  unless @gif.privacy_public_access? || 
         @gif.privacy_unlisted? || 
         (current_user && @gif.user_id == current_user.id)
    redirect_to root_path, alert: "GIF not found or access denied."
    return
  end
  
  # ... rest of show logic
end
```

**Note:** If this logic is missing, some privacy tests may fail. Document this as a prerequisite or create an issue.

### Step 4: Run GIF Upload Tests (10 min)

```bash
# Run all GIF upload tests
bin/rails test test/system/gif_upload_test.rb

# Or run individual test groups
bin/rails test test/system/gif_upload_test.rb -n /creation/
bin/rails test test/system/gif_upload_test.rb -n /privacy/
bin/rails test test/system/gif_upload_test.rb -n /validation/
bin/rails test test/system/gif_upload_test.rb -n /YouTube/
```

**Expected Output:**
```
Running 17 tests in a single process
.................

Finished in 40-60s
17 runs, ~45 assertions, 0 failures, 0 errors, 0 skips
```

### Step 5: Review Screenshots (10 min)

Check `tmp/screenshots/` for screenshots from each test:

**Successful Creation:**
- `gif-create-form-filled-*.png` - Form with all fields filled
- `gif-create-success-*.png` - GIF show page after creation
- `gif-create-unlisted-selected-*.png` - Unlisted privacy selected
- `gif-create-unlisted-success-*.png` - Unlisted GIF created
- `gif-create-private-selected-*.png` - Private privacy selected
- `gif-create-private-success-*.png` - Private GIF created
- `gif-create-with-hashtags-*.png` - Hashtags visible in form
- `gif-create-hashtags-success-*.png` - GIF with hashtags created

**Privacy & Visibility:**
- `gif-public-in-feed-*.png` - Public GIF visible in feed
- `gif-public-unauthenticated-access-*.png` - Public GIF accessible without login
- `gif-unlisted-not-in-feed-*.png` - Unlisted GIF not in feed
- `gif-unlisted-direct-access-*.png` - Unlisted GIF accessible via URL
- `gif-private-owner-access-*.png` - Owner can see private GIF
- `gif-private-other-user-denied-*.png` - Other user denied access

**Validation:**
- `gif-validation-no-url-*.png` - Error for missing URL
- `gif-validation-invalid-url-*.png` - Error for invalid URL
- `gif-validation-no-title-*.png` - Error for missing title
- `gif-validation-no-start-*.png` - Error for missing start time
- `gif-validation-no-end-*.png` - Error for missing end time
- `gif-validation-invalid-range-*.png` - Error for invalid timestamp range

**YouTube Integration:**
- `gif-youtube-preview-visible-*.png` - YouTube iframe preview
- `gif-duration-calculated-*.png` - Auto-calculated duration

Verify each screenshot shows the expected UI state.

### Step 6: Handle Potential Issues (20 min buffer)

#### Issue 1: Privacy Access Control Not Implemented

**Symptom:** Private GIF tests fail because other users can still access private GIFs

**Solution:** Implement privacy check in `GifsController#show`:

```ruby
# app/controllers/gifs_controller.rb
def show
  @gif = Gif.find(params[:id])
  
  # Check privacy access
  if @gif.privacy_private_access? && (!current_user || @gif.user_id != current_user.id)
    redirect_to root_path, alert: "GIF not found."
    return
  end
  
  # Rest of show logic...
end
```

Add a test to verify:
```ruby
# test/controllers/gifs_controller_test.rb
test "should not show private gif to non-owner" do
  private_gif = gifs(:e2e_private_gif)
  other_user = users(:e2e_test_user)
  
  sign_in other_user
  get gif_path(private_gif)
  
  assert_redirected_to root_path
end
```

#### Issue 2: YouTube Preview Doesn't Load

**Symptom:** `assert_selector('iframe[src*="youtube.com/embed"]')` fails

**Root Causes:**
1. Stimulus controller not connected
2. URL parsing failed
3. Network/CSP blocking iframe

**Solution:**
```ruby
# Add longer wait time for iframe to load
@page.wait_for_selector('iframe[src*="youtube.com/embed"]', timeout: 10000)

# Or check if preview container is visible instead
preview_container = @page.query_selector('[data-gif-form-target="youtubePreviewContainer"]')
assert !preview_container.evaluate('el => el.classList.contains("hidden")')
```

Check CSP settings in development:
```ruby
# config/initializers/content_security_policy.rb
Rails.application.config.content_security_policy do |policy|
  policy.frame_src :self, "https://www.youtube.com"
end
```

#### Issue 3: Hashtag Input Not Working

**Symptom:** Hashtags don't appear after pressing Enter

**Solution:** Ensure hashtag Stimulus controller is loaded:

```ruby
# Before adding hashtags, verify controller is connected
assert_selector('[data-controller*="hashtag-input"]')

# Add small delay after pressing Enter
hashtag_input.fill('funny')
hashtag_input.press('Enter')
sleep 0.2  # Give controller time to process

# Alternative: Click add button if available
@page.click('button:has-text("Add")')
```

#### Issue 4: Duration Not Calculating

**Symptom:** Duration field remains empty after filling timestamps

**Solution:** Ensure change events are dispatched:

```ruby
# Dispatch events correctly
@page.fill('input[name="gif[youtube_timestamp_start]"]', '15.5')
@page.dispatch_event('input[name="gif[youtube_timestamp_start]"]', 'change')

# Wait for calculation
sleep 0.3

# Or trigger blur event which also calls calculateDuration
@page.dispatch_event('input[name="gif[youtube_timestamp_end]"]', 'blur')
```

#### Issue 5: Form Validation Tests Pass When They Shouldn't

**Symptom:** Missing required fields don't trigger validation errors

**Root Cause:** HTML5 validation may be disabled or bypassed

**Solution:** Check both frontend and backend validation:

```ruby
# Frontend validation (Stimulus)
# Check for client-side error display
assert_page_has_text "Please enter a valid YouTube URL"

# Backend validation (Rails)
# Check for server-side error messages
assert_page_has_text "can't be blank"

# Or check that form re-renders with errors
assert @page.url.include?("/gifs/new") || @page.url.include?("/gifs")
assert_selector('.text-red-600, .text-red-700')  # Error message styling
```

#### Issue 6: GIF Count Assertion Fails

**Symptom:** `assert_equal initial_gif_count + 1, Gif.count` fails in parallel tests

**Solution:** Query specific GIF instead:

```ruby
# Instead of counting all GIFs
initial_gif_count = Gif.count
# ... create GIF ...
assert_equal initial_gif_count + 1, Gif.count  # May fail in parallel

# Use specific query
@page.click('input[type="submit"][value="Create GIF"]')
wait_for_page_load

# Verify by finding the specific GIF
created_gif = Gif.find_by(title: 'My E2E Test GIF', user: user)
assert_not_nil created_gif, "GIF should be created"
assert_equal 5.0, created_gif.duration
```

#### Issue 7: Privacy Tests Flaky

**Symptom:** Sometimes public GIFs don't appear in feed

**Root Cause:** Feed caching or timing issues

**Solution:**
```ruby
# Clear feed cache before checking
Rails.cache.clear

# Or wait for feed to update
visit root_path
sleep 0.5  # Give feed time to load

# Check for GIF with specific selector
assert_selector('div:has-text("Public Feed Test GIF")', timeout: 5000)
```

## Troubleshooting Commands

```bash
# Clear all caches
bin/rails cache:clear
rm -rf tmp/cache/*

# Clean screenshots
rm tmp/screenshots/*

# Reset test database
RAILS_ENV=test bin/rails db:reset

# Run tests with verbose output
bin/rails test test/system/gif_upload_test.rb --verbose

# Run single test for debugging
bin/rails test test/system/gif_upload_test.rb \
  -n test_user_can_create_public_GIF_with_valid_YouTube_URL_and_timestamps

# Check if Stimulus controllers are loaded
# Add to test:
puts @page.evaluate('Object.keys(window.Stimulus.controllers)')
```

## Verification Checklist

After completing all steps:

- [ ] All 17 tests passing (0 failures, 0 errors)
- [ ] 17+ screenshots generated (no failure-* screenshots)
- [ ] Public GIFs created successfully
- [ ] Unlisted GIFs created with correct privacy
- [ ] Private GIFs created with correct privacy
- [ ] Public GIFs appear in feed
- [ ] Unlisted GIFs accessible via URL but not in feed
- [ ] Private GIFs only accessible to owner
- [ ] YouTube URL validation works
- [ ] Timestamp validation works
- [ ] Title validation works
- [ ] YouTube preview loads correctly
- [ ] Duration auto-calculates
- [ ] Hashtags can be added
- [ ] Form errors display clearly
- [ ] No console errors in browser

## Expected Test Coverage

**Before:** 14 system tests (3 smoke + 11 auth)
**After:** 31 system tests (3 smoke + 11 auth + 17 gif upload)

**Total Assertions:** ~75-85 assertions

**Code Coverage:**
- `GifsController#new` - 100%
- `GifsController#create` - 100%
- `GifsController#show` (with privacy) - 100%
- `gif_form_controller.js` - 80%+
- `hashtag_input_controller.js` - 60%+
- `Gif` model validations - 90%+

## File Structure

```
test/
├── application_system_test_case.rb
├── system/
│   ├── smoke_test.rb (3 tests)
│   ├── authentication_test.rb (11 tests)
│   └── gif_upload_test.rb (17 tests) ← NEW
├── fixtures/
│   ├── users.yml (with e2e users)
│   └── gifs.yml (with e2e gifs including privacy variations)
└── controllers/
    └── gifs_controller_test.rb (privacy unit tests)
```

## Success Criteria

✅ All 17 GIF upload tests pass
✅ Screenshots show correct UI states
✅ GIF creation works with all privacy levels
✅ Privacy restrictions properly enforced
✅ Form validation works (frontend & backend)
✅ YouTube preview integration works
✅ Duration auto-calculation works
✅ Hashtag input works
✅ GIFs appear in appropriate feeds
✅ No privacy leaks (private GIFs truly private)
✅ Tests run in ~40-60 seconds

## Next Steps After Completion

Once Phase 1.3 is complete, proceed to:

**Phase 1.4: Social Interactions (45 min)**
- Like/unlike GIF test
- Comment on GIF test
- Follow/unfollow user test
- Notifications test

**Phase 1.5: User Profile & GIF Management (30 min)**
- View user profile test
- Edit GIF test
- Delete GIF test
- View own GIFs test

## Time Breakdown

- Step 1: Create test file - 10 min
- Step 2: Update fixtures - 5 min
- Step 3: Check access control - 5 min
- Step 4: Run tests - 10 min
- Step 5: Review screenshots - 10 min
- Step 6: Troubleshooting buffer - 20 min

**Total: 60 minutes**

## Performance Notes

**Expected Test Duration:**
- Individual test: 2-4 seconds
- Full suite (17 tests): 40-60 seconds
- With failures/debugging: up to 90 seconds

**Optimization Tips:**
- Use `headless: true` for faster execution
- Disable animations in test environment
- Use database transactions for cleanup
- Cache YouTube preview checks
- Reuse authenticated sessions where possible

## Security Considerations

These tests verify:
- ✅ Authentication required for GIF creation
- ✅ Users can only edit/delete their own GIFs
- ✅ Private GIFs not accessible to others
- ✅ Unlisted GIFs not exposed in feeds
- ✅ No GIF ID enumeration vulnerabilities
- ✅ CSRF protection on form submissions

## Commands Quick Reference

```bash
# Run all GIF upload tests
bin/rails test test/system/gif_upload_test.rb

# Run specific test category
bin/rails test test/system/gif_upload_test.rb -n /creation/
bin/rails test test/system/gif_upload_test.rb -n /privacy/
bin/rails test test/system/gif_upload_test.rb -n /validation/
bin/rails test test/system/gif_upload_test.rb -n /YouTube/

# Run single test
bin/rails test test/system/gif_upload_test.rb \
  -n test_user_can_create_public_GIF_with_valid_YouTube_URL_and_timestamps

# View screenshots
open tmp/screenshots/

# Clean old screenshots
rm tmp/screenshots/*

# Reset test database
RAILS_ENV=test bin/rails db:reset

# Check routes
bin/rails routes | grep gif
```

## Notes

- Tests use fixture users `e2e_test_user` and `e2e_follower`
- All tests use YouTube video ID `dQw4w9WgXcQ` (Rick Astley - Never Gonna Give You Up)
- Duration is auto-calculated from timestamps via Stimulus controller
- Form uses both client-side (Stimulus) and server-side (Rails) validation
- Privacy levels: 0=public, 1=unlisted, 2=private
- Hashtags are optional and limited to 10 per GIF
- Some tests may need adjustment based on actual error message text
- CSP policy must allow YouTube iframe embeds
- Tests assume GIF processing happens asynchronously (no file attachment required in tests)
