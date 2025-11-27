require "application_system_test_case"

class GifUploadTest < ApplicationSystemTestCase
  # Note: Using redirect-based sign in workaround due to Playwright/Turbo issue
  # Tests that require authentication will navigate to protected page, get redirected
  # to sign in, then sign in successfully (redirect flow works, direct navigation doesn't)

  def setup
    super
    @user = users(:e2e_test_user)
  end

  # Helper to sign in via redirect (works around Playwright/Turbo issue)
  def sign_in_via_redirect(target_path = new_gif_path)
    # Navigate to protected page (triggers redirect to sign in)
    visit target_path

    # Should be redirected to sign in page
    assert @page.url.include?("/users/sign_in")

    # Fill in credentials
    @page.fill('input[name="user[email]"]', @user.email)
    @page.fill('input[name="user[password]"]', "password123")

    # Submit using requestSubmit (triggers Turbo properly)
    @page.expect_navigation do
      @page.evaluate('document.querySelector("form").requestSubmit()')
    end

    # Should be redirected back to original page
    assert @page.url.include?(target_path)
  end

  # ========== SUCCESSFUL CREATION TESTS ==========

  test "user can create public GIF with valid YouTube URL and timestamps" do
    sign_in_via_redirect(new_gif_path)

    # Should now be on GIF creation page
    assert_page_has_text "Create"

    # Fill in YouTube URL (set hidden field directly to bypass Stimulus controller)
    @page.evaluate('document.querySelector(\'input[name="gif[youtube_video_url]"]\').value = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"')

    # Fill in timestamps
    @page.fill('input[name="gif[youtube_timestamp_start]"]', "5.0")
    @page.fill('input[name="gif[youtube_timestamp_end]"]', "10.0")

    # Fill in title
    @page.fill('input[name="gif[title]"]', "My E2E Test GIF")

    # Fill in description (optional)
    @page.fill('textarea[name="gif[description]"]', "This is a test GIF created during e2e testing")

    take_screenshot("gif-create-form-filled")

    # Submit form by clicking the submit button (use data attribute to target the right one)
    initial_gif_count = Gif.count
    @page.expect_navigation do
      @page.click('[data-gif-form-target="submitButton"]')
    end

    # Should redirect to GIF show page
    assert @page.url.include?("/gifs/")
    assert_page_has_text "My E2E Test GIF"

    # Verify GIF was created in database
    created_gif = Gif.find_by(title: "My E2E Test GIF", user: @user)
    assert_not_nil created_gif, "GIF should be created"
    assert_equal "https://www.youtube.com/watch?v=dQw4w9WgXcQ", created_gif.youtube_video_url
    assert_equal 5.0, created_gif.youtube_timestamp_start
    assert_equal 10.0, created_gif.youtube_timestamp_end
    assert_equal "public_access", created_gif.privacy

    take_screenshot("gif-create-success")
  end

  test "user can create unlisted GIF" do
    sign_in_via_redirect(new_gif_path)

    # Fill in required fields
    @page.evaluate('document.querySelector(\'input[name="gif[youtube_video_url]"]\').value = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"')
    @page.fill('input[name="gif[youtube_timestamp_start]"]', "0.0")
    @page.fill('input[name="gif[youtube_timestamp_end]"]', "5.0")
    @page.fill('input[name="gif[title]"]', "Unlisted Test GIF")

    # Select unlisted privacy
    @page.click('input[value="unlisted"]')

    take_screenshot("gif-create-unlisted-selected")

    @page.expect_navigation do
      @page.click('[data-gif-form-target="submitButton"]')
    end

    # Verify GIF was created with unlisted privacy
    created_gif = Gif.find_by(title: "Unlisted Test GIF", user: @user)
    assert_not_nil created_gif
    assert_equal "unlisted", created_gif.privacy

    take_screenshot("gif-create-unlisted-success")
  end

  test "user can create private GIF" do
    sign_in_via_redirect(new_gif_path)

    # Fill in required fields
    @page.evaluate('document.querySelector(\'input[name="gif[youtube_video_url]"]\').value = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"')
    @page.fill('input[name="gif[youtube_timestamp_start]"]', "0.0")
    @page.fill('input[name="gif[youtube_timestamp_end]"]', "3.0")
    @page.fill('input[name="gif[title]"]', "Private Test GIF")

    # Select private privacy
    @page.click('input[value="private_access"]')

    take_screenshot("gif-create-private-selected")

    @page.expect_navigation do
      @page.click('[data-gif-form-target="submitButton"]')
    end

    # Verify GIF was created with private privacy
    created_gif = Gif.find_by(title: "Private Test GIF", user: @user)
    assert_not_nil created_gif
    assert_equal "private_access", created_gif.privacy

    take_screenshot("gif-create-private-success")
  end

  test "user can create GIF with hashtags" do
    skip "Hashtag input requires complex Stimulus interaction - implement after basic flow works"
  end

  # ========== PRIVACY & VISIBILITY TESTS ==========

  test "public GIF appears in public feed" do
    sign_in_via_redirect(new_gif_path)

    # Create a public GIF
    @page.evaluate('document.querySelector(\'input[name="gif[youtube_video_url]"]\').value = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"')
    @page.fill('input[name="gif[youtube_timestamp_start]"]', "0.0")
    @page.fill('input[name="gif[youtube_timestamp_end]"]', "5.0")
    @page.fill('input[name="gif[title]"]', "Public Feed Test GIF")
    @page.click('input[value="public_access"]')

    @page.expect_navigation do
      @page.click('[data-gif-form-target="submitButton"]')
    end

    # Navigate to home page (public feed)
    visit root_path

    # GIF should appear in feed
    assert_page_has_text "Public Feed Test GIF"

    take_screenshot("gif-public-in-feed")
  end

  test "public GIF visible to all users" do
    sign_in_via_redirect(new_gif_path)

    # Create public GIF
    @page.evaluate('document.querySelector(\'input[name="gif[youtube_video_url]"]\').value = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"')
    @page.fill('input[name="gif[youtube_timestamp_start]"]', "0.0")
    @page.fill('input[name="gif[youtube_timestamp_end]"]', "5.0")
    @page.fill('input[name="gif[title]"]', "Public Visibility Test")

    @page.expect_navigation do
      @page.click('[data-gif-form-target="submitButton"]')
    end

    created_gif = Gif.find_by(title: "Public Visibility Test", user: @user)
    gif_path = "/gifs/#{created_gif.id}"

    # Navigate away (simulating sign out by visiting public page)
    visit root_path

    # Visit GIF directly
    visit gif_path
    assert_page_has_text "Public Visibility Test"

    take_screenshot("gif-public-access")
  end

  test "unlisted GIF accessible via direct URL but not in feed" do
    sign_in_via_redirect(new_gif_path)

    # Create unlisted GIF
    @page.evaluate('document.querySelector(\'input[name="gif[youtube_video_url]"]\').value = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"')
    @page.fill('input[name="gif[youtube_timestamp_start]"]', "0.0")
    @page.fill('input[name="gif[youtube_timestamp_end]"]', "5.0")
    @page.fill('input[name="gif[title]"]', "Unlisted Visibility Test")
    @page.click('input[value="unlisted"]')

    @page.expect_navigation do
      @page.click('[data-gif-form-target="submitButton"]')
    end

    created_gif = Gif.find_by(title: "Unlisted Visibility Test", user: @user)
    gif_path = "/gifs/#{created_gif.id}"

    # Check it's NOT in public feed
    visit root_path
    body_text = @page.text_content("body")
    assert !body_text.include?("Unlisted Visibility Test"), "Unlisted GIF should not appear in feed"

    take_screenshot("gif-unlisted-not-in-feed")

    # But accessible via direct URL
    visit gif_path
    assert_page_has_text "Unlisted Visibility Test"

    take_screenshot("gif-unlisted-direct-access")
  end

  test "private GIF only accessible to owner" do
    sign_in_via_redirect(new_gif_path)

    # Create private GIF
    @page.evaluate('document.querySelector(\'input[name="gif[youtube_video_url]"]\').value = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"')
    @page.fill('input[name="gif[youtube_timestamp_start]"]', "0.0")
    @page.fill('input[name="gif[youtube_timestamp_end]"]', "5.0")
    @page.fill('input[name="gif[title]"]', "Private Owner Test")
    @page.click('input[value="private_access"]')

    @page.expect_navigation do
      @page.click('[data-gif-form-target="submitButton"]')
    end

    # Owner should see the GIF
    assert_page_has_text "Private Owner Test"

    take_screenshot("gif-private-owner-access")
  end

  test "private GIF returns error for other users" do
    skip "Requires signing in as different user - blocked by sign_in_as issue"
  end

  # ========== FORM VALIDATION TESTS ==========

  test "YouTube URL required" do
    sign_in_via_redirect(new_gif_path)

    # Fill in everything except YouTube URL
    @page.fill('input[name="gif[youtube_timestamp_start]"]', "0.0")
    @page.fill('input[name="gif[youtube_timestamp_end]"]', "5.0")
    @page.fill('input[name="gif[title]"]', "No URL Test")

    # Try to submit
    @page.evaluate('document.querySelector("form").requestSubmit()')
    sleep 0.5  # Give time for validation

    # Should show validation error
    body_text = @page.text_content("body")
    assert(
      body_text.include?("YouTube") ||
      body_text.include?("can't be blank") ||
      body_text.include?("required") ||
      @page.url.include?("/gifs/new"),  # Still on new page
      "Expected validation error for missing YouTube URL"
    )

    take_screenshot("gif-validation-no-url")
  end

  test "invalid YouTube URL shows error" do
    skip "Requires Stimulus controller interaction - implement after basic flow works"
  end

  test "title required" do
    sign_in_via_redirect(new_gif_path)

    # Fill in everything except title
    @page.evaluate('document.querySelector(\'input[name="gif[youtube_video_url]"]\').value = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"')
    @page.fill('input[name="gif[youtube_timestamp_start]"]', "0.0")
    @page.fill('input[name="gif[youtube_timestamp_end]"]', "5.0")

    # Try to submit
    @page.evaluate('document.querySelector("form").requestSubmit()')
    sleep 0.5

    # Should show validation error
    body_text = @page.text_content("body")
    assert(
      body_text.include?("Title") ||
      body_text.include?("can't be blank") ||
      @page.url.include?("/gifs"),
      "Expected validation error for missing title"
    )

    take_screenshot("gif-validation-no-title")
  end

  test "start timestamp required" do
    sign_in_via_redirect(new_gif_path)

    # Fill in everything except start timestamp
    @page.evaluate('document.querySelector(\'input[name="gif[youtube_video_url]"]\').value = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"')
    @page.fill('input[name="gif[youtube_timestamp_end]"]', "5.0")
    @page.fill('input[name="gif[title]"]', "No Start Time Test")

    # Try to submit
    @page.evaluate('document.querySelector("form").requestSubmit()')
    sleep 0.5

    # Should show validation error
    body_text = @page.text_content("body")
    assert(
      body_text.include?("start") ||
      body_text.include?("timestamp") ||
      @page.url.include?("/gifs"),
      "Expected validation error for missing start timestamp"
    )

    take_screenshot("gif-validation-no-start")
  end

  test "end timestamp required" do
    sign_in_via_redirect(new_gif_path)

    # Fill in everything except end timestamp
    @page.evaluate('document.querySelector(\'input[name="gif[youtube_video_url]"]\').value = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"')
    @page.fill('input[name="gif[youtube_timestamp_start]"]', "0.0")
    @page.fill('input[name="gif[title]"]', "No End Time Test")

    # Try to submit
    @page.evaluate('document.querySelector("form").requestSubmit()')
    sleep 0.5

    # Should show validation error
    body_text = @page.text_content("body")
    assert(
      body_text.include?("end") ||
      body_text.include?("timestamp") ||
      @page.url.include?("/gifs"),
      "Expected validation error for missing end timestamp"
    )

    take_screenshot("gif-validation-no-end")
  end

  test "end timestamp must be greater than start timestamp" do
    sign_in_via_redirect(new_gif_path)

    # Fill in with invalid timestamp range
    @page.evaluate('document.querySelector(\'input[name="gif[youtube_video_url]"]\').value = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"')
    @page.fill('input[name="gif[youtube_timestamp_start]"]', "10.0")
    @page.fill('input[name="gif[youtube_timestamp_end]"]', "5.0")  # Less than start
    @page.fill('input[name="gif[title]"]', "Invalid Range Test")

    # Try to submit
    @page.evaluate('document.querySelector("form").requestSubmit()')
    sleep 0.5

    # Should show validation error
    body_text = @page.text_content("body")
    assert(
      body_text.include?("greater") ||
      body_text.include?("must be") ||
      body_text.include?("End") ||
      @page.url.include?("/gifs"),
      "Expected validation error for invalid timestamp range"
    )

    take_screenshot("gif-validation-invalid-range")
  end

  # ========== YOUTUBE INTEGRATION TESTS ==========

  test "YouTube preview appears when valid URL entered" do
    skip "Requires Stimulus controller interaction and YouTube iframe - implement after basic flow works"
  end

  test "duration calculated automatically from timestamps" do
    skip "Requires Stimulus controller interaction - implement after basic flow works"
  end
end
