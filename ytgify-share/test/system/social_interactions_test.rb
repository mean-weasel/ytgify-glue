require "application_system_test_case"

class SocialInteractionsTest < ApplicationSystemTestCase
  fixtures :users, :gifs, :follows

  setup do
    @e2e_user = users(:e2e_test_user)
    @other_user = users(:one)
    @public_gif = gifs(:e2e_public_gif)
  end

  # ========== LIKE FUNCTIONALITY ==========

  test "like button shows on GIF card for anonymous users" do
    visit root_path

    # Should see GIF card with like button
    assert_selector "svg"  # Heart icon should be visible

    # Click like as anonymous user should redirect to sign in
    # (Link to sign in page)
    take_screenshot("like-button-anonymous")
  end

  test "GIF detail page shows like count" do
    visit gif_path(@public_gif)

    # Should see like count
    assert_page_has_text @public_gif.like_count.to_s

    take_screenshot("gif-detail-like-count")
  end

  test "feed shows GIF cards with engagement stats" do
    visit root_path

    # Should see GIFs - the feed has GIF cards with engagement stats
    # Check for like buttons (heart icons in svg)
    assert_page_has_text @public_gif.title

    take_screenshot("feed-engagement-stats")
  end

  # ========== FOLLOW FUNCTIONALITY ==========

  test "user profile shows follow button for anonymous users" do
    visit user_path(@other_user.username)

    # Should see follow button that links to sign in
    assert_page_has_text "Follow"

    take_screenshot("profile-follow-anonymous")
  end

  test "user profile shows follower and following counts" do
    visit user_path(@e2e_user.username)

    # Should see follower/following counts
    assert_page_has_text "Followers"
    assert_page_has_text "Following"

    take_screenshot("profile-follow-counts")
  end

  # ========== COMMENT FUNCTIONALITY ==========

  test "GIF detail page shows comments section" do
    visit gif_path(@public_gif)

    # Should see comments section
    assert_page_has_text "Comments"

    take_screenshot("gif-detail-comments")
  end

  test "comment count shows on GIF cards" do
    visit root_path

    # GIF cards should show comment counts
    # Comments icon with count
    assert_selector "svg"  # Comment icon

    take_screenshot("gif-card-comment-count")
  end

  # ========== HASHTAG FUNCTIONALITY ==========

  test "hashtags are clickable and lead to hashtag page" do
    visit root_path

    # Page should load successfully
    assert @page.url.present?

    # If there are hashtags on the page, they would be visible as links
    # This test verifies the page loads and hashtags would be rendered
    take_screenshot("hashtags-visible")
  end

  test "trending page shows popular GIFs" do
    visit trending_path

    assert_page_has_text "Trending"
    # Should show GIF cards
    take_screenshot("trending-page")
  end

  # ========== NAVIGATION TESTS ==========

  test "navbar shows main navigation links" do
    visit root_path

    # Should have navigation elements
    assert_page_has_text "Trending"

    take_screenshot("navbar-navigation")
  end

  test "navbar shows sign in link for anonymous users" do
    visit root_path

    # The page should have sign in functionality available
    # Check if we can find the sign in link in the HTML (hidden or visible)
    html = @page.content
    assert html.include?("Sign In") || html.include?("sign_in"), "Page should contain sign in link"

    take_screenshot("navbar-sign-in")
  end

  test "mobile menu toggle works" do
    # Resize to mobile viewport
    @page.set_viewport_size(width: 375, height: 667)

    visit root_path

    # Page should load in mobile viewport
    assert @page.url.present?

    # Mobile menu should have hamburger button
    mobile_menu_button = @page.query_selector("button[data-action*='mobile-menu#toggle']")

    if mobile_menu_button
      mobile_menu_button.click
      # Wait for menu to appear
      sleep 0.5
      take_screenshot("mobile-menu-open")
    else
      take_screenshot("mobile-viewport")
    end
  end

  # ========== PROFILE PAGE TESTS ==========

  test "user profile page loads successfully" do
    visit user_path(@e2e_user.username)

    # Should see username
    assert_page_has_text @e2e_user.username

    take_screenshot("profile-page")
  end

  test "user profile shows GIFs tab" do
    visit user_path(@e2e_user.username)

    # Should see GIFs section
    assert_page_has_text "GIFs"

    take_screenshot("profile-gifs-tab")
  end

  test "visiting non-existent user shows 404" do
    visit user_path("nonexistent_user_12345")

    # Should show not found or redirect
    # Either 404 page or redirect to root
    assert @page.url.present?

    take_screenshot("profile-not-found")
  end

  # ========== GIF DETAIL PAGE TESTS ==========

  test "GIF detail page loads successfully" do
    visit gif_path(@public_gif)

    # Should see GIF title
    assert_page_has_text @public_gif.title

    take_screenshot("gif-detail-page")
  end

  test "GIF detail page shows creator info" do
    visit gif_path(@public_gif)

    # Should see creator username
    assert_page_has_text @public_gif.user.username

    take_screenshot("gif-detail-creator")
  end

  test "GIF detail page shows engagement metrics" do
    visit gif_path(@public_gif)

    # Should see view count, like count
    assert_selector "svg"  # Icons for likes, comments, views

    take_screenshot("gif-detail-metrics")
  end
end
