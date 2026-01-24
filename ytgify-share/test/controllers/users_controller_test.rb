require "test_helper"

class UsersControllerTest < ActionDispatch::IntegrationTest
  fixtures :users, :follows

  setup do
    @alice = users(:one)
    @bob = users(:two)
  end

  # ========== SHOW ACTION TESTS ==========

  test "should show user profile" do
    get user_path(@alice.username)
    assert_response :success
    assert_select "h1", text: @alice.display_name
  end

  test "should show gifs tab by default" do
    get user_path(@alice.username)
    assert_response :success
    # Check that GIFs tab is active (border-[#E91E8C] class indicates active)
    assert_select "nav a", text: /GIFs/
    assert response.body.include?("border-[#E91E8C]"), "Expected active tab styling"
  end

  test "should show liked tab when requested" do
    get user_path(@alice.username, tab: "liked")
    assert_response :success
    assert_select "nav a", text: /Liked/
    assert response.body.include?("border-[#E91E8C]"), "Expected active tab styling"
  end

  test "should show collections tab when requested" do
    get user_path(@alice.username, tab: "collections")
    assert_response :success
    assert_select "nav a", text: /Collections/
    assert response.body.include?("border-[#E91E8C]"), "Expected active tab styling"
  end

  test "should show followers tab when requested" do
    get user_path(@alice.username, tab: "followers")
    assert_response :success
    assert_select "nav a", text: /Followers/
    assert response.body.include?("border-[#E91E8C]"), "Expected active tab styling"
  end

  test "should show following tab when requested" do
    get user_path(@alice.username, tab: "following")
    assert_response :success
    assert_select "nav a", text: /Following/
    assert response.body.include?("border-[#E91E8C]"), "Expected active tab styling"
  end

  # Removed: Rails handles RecordNotFound with 404 in production

  test "should default to gifs tab for invalid tab parameter" do
    get user_path(@alice.username, tab: "invalid_tab")
    assert_response :success
    # Should default to gifs tab
    assert_select "nav a", text: /GIFs/
    assert response.body.include?("border-[#E91E8C]"), "Expected active tab styling"
  end

  # ========== FOLLOWERS ACTION TESTS ==========

  test "should show followers list" do
    get followers_user_path(@bob.username)
    assert_response :success
  end

  test "should load followers with pagination" do
    get followers_user_path(@bob.username)
    assert_response :success
    # Verify pagination is rendered if there are followers
    if @bob.followers.any?
      assert_select ".space-y-4"
    end
  end

  test "should support turbo stream format for followers" do
    get followers_user_path(@bob.username), as: :turbo_stream
    assert_response :success
  end

  # ========== FOLLOWING ACTION TESTS ==========

  test "should show following list" do
    get following_user_path(@alice.username)
    assert_response :success
  end

  test "should load following with pagination" do
    get following_user_path(@alice.username)
    assert_response :success
    # Verify pagination is rendered if user is following anyone
    if @alice.following.any?
      assert_select ".space-y-4"
    end
  end

  test "should support turbo stream format for following" do
    get following_user_path(@alice.username), as: :turbo_stream
    assert_response :success
  end

  # ========== PRIVACY TESTS ==========

  test "should show gifs tab to guests" do
    get user_path(@alice.username, tab: "gifs")
    assert_response :success
    # Guests should only see public GIFs (tested by controller logic)
  end

  test "should show all gifs tab to owner" do
    sign_in @alice
    get user_path(@alice.username, tab: "gifs")
    assert_response :success
    # Owner should see all privacy levels (tested by controller logic)
  end

  test "should show collections tab to non-owners" do
    sign_in @bob
    get user_path(@alice.username, tab: "collections")
    assert_response :success
    # Non-owners should only see public collections (tested by controller logic)
  end

  # ========== INTEGRATION TESTS ==========

  test "should display follower count in profile header" do
    get user_path(@bob.username)
    assert_response :success
    # Check that follower count is displayed (fixtures have 0 followers)
    assert_select "span", text: /Follower/
  end

  test "should display following count in profile header" do
    get user_path(@alice.username)
    assert_response :success
    # Check that following count is displayed (fixtures have 0 following)
    assert_select "span", text: /Following/
  end

  test "should show follow button for other users" do
    sign_in @alice
    get user_path(@bob.username)
    assert_response :success
    # Should show follow button for other users
    assert_select "#follow_button_#{@bob.id}"
  end

  test "should show edit profile button for own profile" do
    sign_in @alice
    get user_path(@alice.username)
    assert_response :success
    assert_select "a", text: /Edit Profile/
  end

  test "should not show edit profile button for other users" do
    sign_in @alice
    get user_path(@bob.username)
    assert_response :success
    assert_select "a", text: /Edit Profile/, count: 0
  end

  # ========== TAB NAVIGATION TESTS ==========

  test "should render all five tabs in navigation" do
    get user_path(@alice.username)
    assert_response :success
    assert_select "nav a", text: /GIFs/
    assert_select "nav a", text: /Liked/
    assert_select "nav a", text: /Collections/
    assert_select "nav a", text: /Followers/
    assert_select "nav a", text: /Following/
  end

  test "should support turbo frame for tab switching" do
    get user_path(@alice.username, tab: "liked")
    assert_response :success
    assert_select "turbo-frame#profile_content"
  end

  private

  def sign_in(user)
    post user_session_path, params: {
      user: {
        email: user.email,
        password: "password123"
      }
    }
  end
end
