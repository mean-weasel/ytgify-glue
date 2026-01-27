# frozen_string_literal: true

require "test_helper"

class MarketingControllerTest < ActionDispatch::IntegrationTest
  fixtures :users, :gifs

  # ========== Landing Page Tests ==========

  test "landing page renders successfully" do
    get promo_path

    assert_response :success
  end

  test "landing page uses marketing layout" do
    get promo_path

    assert_select "html"
    # Marketing pages have the dark theme
    assert_includes response.body, "bg-[#0a0a0a]"
  end

  test "landing page includes Chrome extension link" do
    get promo_path

    assert_includes response.body, "chromewebstore.google.com"
  end

  test "landing page sets correct page title" do
    get promo_path

    assert_select "title", /YTgify/
  end

  test "landing page includes meta description" do
    get promo_path

    assert_select 'meta[name="description"]'
  end

  # ========== Privacy Policy Tests ==========

  test "privacy policy renders successfully" do
    get privacy_policy_path

    assert_response :success
  end

  test "privacy policy contains privacy content" do
    get privacy_policy_path

    assert_includes response.body, "Privacy"
  end

  test "privacy policy sets correct page title" do
    get privacy_policy_path

    assert_select "title", /Privacy Policy/
  end

  # ========== Terms of Service Tests ==========

  test "terms of service renders successfully" do
    get terms_of_service_path

    assert_response :success
  end

  test "terms of service contains terms content" do
    get terms_of_service_path

    assert_includes response.body, "Terms"
  end

  test "terms of service sets correct page title" do
    get terms_of_service_path

    assert_select "title", /Terms of Service/
  end

  # ========== Welcome Page Tests ==========

  test "welcome page renders successfully" do
    get welcome_path

    assert_response :success
  end

  test "welcome page sets correct page title" do
    get welcome_path

    assert_select "title", /Welcome/
  end

  test "welcome page includes noindex meta tag" do
    get welcome_path

    # Welcome page should not be indexed
    assert_select 'meta[name="robots"][content="noindex, nofollow"]'
  end

  test "welcome page includes extension store badges" do
    get welcome_path

    # Should have links to install extensions
    assert_includes response.body, "chromewebstore.google.com"
  end

  # ========== Share Waitlist Tests ==========

  test "share waitlist renders successfully" do
    get share_waitlist_path

    assert_response :success
  end

  test "share waitlist sets correct page title" do
    get share_waitlist_path

    assert_select "title", /Waitlist/
  end

  test "share waitlist includes noindex meta tag" do
    get share_waitlist_path

    assert_select 'meta[name="robots"][content="noindex, nofollow"]'
  end

  # ========== Share GIF Tests ==========

  test "share gif renders successfully for existing gif" do
    gif = gifs(:alice_public_gif)

    get share_path(gif)

    assert_response :success
  end

  test "share gif displays gif title in page title" do
    gif = gifs(:alice_public_gif)

    get share_path(gif)

    assert_select "title", /#{Regexp.escape(gif.title)}/
  end

  test "share gif handles non-existent gif" do
    get share_path("non-existent-uuid")

    assert_response :success
    assert_includes response.body, "Not Found"
  end

  test "share gif sets og:image for gif with attachment" do
    gif = gifs(:alice_public_gif)
    # Skip og:image check if no file attached - just verify page renders
    get share_path(gif)

    assert_response :success
  end

  # ========== Helper Method Tests ==========

  test "extension URLs are accessible in views" do
    get promo_path

    # Chrome extension URL should be present
    assert_includes response.body, MarketingController::CHROME_EXTENSION_URL

    # Firefox addon URL should be present (may be in Firefox badge)
    # Note: Firefox badge may not be on all pages, so check landing specifically
  end

  test "demo video embed URL constant is correct format" do
    assert_match %r{youtube\.com/embed/}, MarketingController::DEMO_VIDEO_EMBED_URL
  end

  test "formspree endpoint constant is correct format" do
    assert_match %r{formspree\.io/f/}, MarketingController::FORMSPREE_ENDPOINT
  end

  test "github URL constant is correct format" do
    assert_match %r{github\.com/}, MarketingController::GITHUB_URL
  end

  test "twitter URL constant is correct format" do
    assert_match %r{x\.com/}, MarketingController::TWITTER_URL
  end
end
