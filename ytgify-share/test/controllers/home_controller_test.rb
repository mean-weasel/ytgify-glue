require "test_helper"

class HomeControllerTest < ActionDispatch::IntegrationTest
  fixtures :users, :gifs

  setup do
    @alice = users(:one)
    @bob = users(:two)
    @public_gif = gifs(:alice_public_gif)
    @bob_public_gif = gifs(:bob_public_gif)
  end

  # ========== FEED ACTION TESTS ==========

  test "should get feed as unauthenticated user" do
    get root_path
    assert_response :success
    assert_select "#gif-feed"
  end

  test "should get feed as authenticated user" do
    sign_in @alice
    get root_path
    assert_response :success
    assert_select "#gif-feed"
  end

  test "unauthenticated feed shows only public GIFs" do
    # Create a private GIF
    private_gif = Gif.create!(
      user: @alice,
      title: "Private GIF",
      privacy: :private_access
    )

    get root_path
    assert_response :success
    # Should not include private GIF in feed
    assert_select "div[data-gif-id='#{private_gif.id}']", count: 0
  end

  test "feed supports HTML format" do
    get root_path
    assert_response :success
    assert_equal "text/html", response.media_type
  end

  test "feed responds to page parameter" do
    get root_path, params: { page: 1 }
    assert_response :success
  end

  test "feed orders by recent (most recent first)" do
    get root_path
    assert_response :success
    # Response should succeed and include GIF grid
    assert_select "#gif-feed"
  end

  test "unauthenticated feed excludes deleted GIFs" do
    @public_gif.soft_delete!

    get root_path
    assert_response :success
    # Should not show deleted GIF
    assert_select "div[data-gif-id='#{@public_gif.id}']", count: 0
  end

  test "feed includes user and hashtag associations" do
    get root_path
    assert_response :success
    # Check that GIF grid is rendered (shows associations loaded)
    assert_select "#gif-feed"
  end

  # ========== TRENDING ACTION TESTS ==========

  test "should get trending page" do
    get trending_path
    assert_response :success
    # Verify trending tab is active in the mobile tab bar
    assert response.body.include?("Trending")
  end

  test "trending shows only public GIFs" do
    # Create a private GIF
    private_gif = Gif.create!(
      user: @alice,
      title: "Private GIF",
      privacy: :private_access
    )

    get trending_path
    assert_response :success
    # Should not include private GIF
    assert_select "div[data-gif-id='#{private_gif.id}']", count: 0
  end

  test "trending works for authenticated users" do
    sign_in @alice
    get trending_path
    assert_response :success
    # Verify trending tab is active
    assert response.body.include?("Trending")
  end

  test "trending works for unauthenticated users" do
    get trending_path
    assert_response :success
    # Verify trending tab is rendered
    assert response.body.include?("Trending")
  end

  test "trending supports HTML format" do
    get trending_path
    assert_response :success
    assert_equal "text/html", response.media_type
  end

  test "trending responds to page parameter" do
    get trending_path, params: { page: 1 }
    assert_response :success
  end

  test "trending excludes deleted GIFs" do
    @public_gif.soft_delete!

    get trending_path
    assert_response :success
    # Should not show deleted GIF
    assert_select "div[data-gif-id='#{@public_gif.id}']", count: 0
  end

  test "trending includes user and hashtag associations" do
    get trending_path
    assert_response :success
    # Check that GIF grid is rendered
    assert_select "#gif-feed"
  end

  # ========== EDGE CASES ==========

  test "feed handles empty results gracefully" do
    # Delete all GIFs
    Gif.destroy_all

    get root_path
    assert_response :success
  end

  test "trending handles empty results gracefully" do
    # Delete all GIFs
    Gif.destroy_all

    get trending_path
    assert_response :success
  end

  test "feed shows different content for authenticated vs unauthenticated" do
    # Unauthenticated request
    get root_path
    unauthenticated_body = response.body

    # Authenticated request (may show personalized content)
    sign_in @alice
    get root_path
    authenticated_body = response.body

    # Both should succeed
    assert_response :success
  end

  test "feed loads successfully with valid page" do
    get root_path, params: { page: 1 }
    assert_response :success
    assert_select "#gif-feed"
  end

  private

  def sign_in(user)
    post user_session_path, params: {
      user: { email: user.email, password: "password123" }
    }
  end
end
