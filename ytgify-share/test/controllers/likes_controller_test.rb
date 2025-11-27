require "test_helper"

class LikesControllerTest < ActionDispatch::IntegrationTest
  fixtures :users, :gifs

  setup do
    @alice = users(:one)
    @bob = users(:two)
    @gif = gifs(:alice_public_gif)

    # Clean up existing likes for both users on this gif
    Like.where(user: @bob, gif: @gif).destroy_all
    Like.where(user: @alice, gif: @gif).destroy_all
  end

  # ========== AUTHENTICATION TESTS ==========

  test "should require authentication for toggle" do
    post like_gif_path(@gif), as: :json
    assert_response :unauthorized
  end

  test "should redirect to sign in when not authenticated (HTML)" do
    post like_gif_path(@gif)
    assert_redirected_to new_user_session_path
  end

  # ========== 404 ERROR TESTS ==========

  test "should return 404 when gif not found" do
    sign_in @bob

    post like_gif_path(id: "00000000-0000-0000-0000-000000000000"), as: :json
    assert_response :not_found
  end

  test "should return 404 for invalid UUID format" do
    sign_in @bob

    post like_gif_path(id: "invalid-id"), as: :json
    assert_response :not_found
  end

  # ========== SUCCESSFUL LIKE TOGGLE TESTS ==========

  test "should create like when toggling on" do
    sign_in @bob

    initial_count = @gif.reload.like_count || 0

    assert_difference('@gif.reload.like_count', 1) do
      post like_gif_path(@gif), as: :json
      assert_response :success
    end

    json = JSON.parse(response.body)
    assert json['liked']
    assert_equal initial_count + 1, json['like_count']
  end

  test "should destroy like when toggling off" do
    sign_in @bob
    Like.create!(user: @bob, gif: @gif)

    assert_difference('@gif.reload.like_count', -1) do
      post like_gif_path(@gif), as: :json
      assert_response :success
    end

    json = JSON.parse(response.body)
    assert_not json['liked']
  end

  test "toggle creates Like record when none exists" do
    sign_in @bob

    assert_difference('Like.count', 1) do
      post like_gif_path(@gif), as: :json
    end

    assert Like.exists?(user: @bob, gif: @gif)
  end

  test "toggle destroys Like record when it exists" do
    sign_in @bob
    Like.create!(user: @bob, gif: @gif)

    assert_difference('Like.count', -1) do
      post like_gif_path(@gif), as: :json
    end

    assert_not Like.exists?(user: @bob, gif: @gif)
  end

  # ========== RESPONSE FORMAT TESTS ==========

  test "should return JSON with liked status and count" do
    sign_in @bob

    post like_gif_path(@gif), as: :json
    assert_response :success

    json = JSON.parse(response.body)
    assert_includes json, 'liked'
    assert_includes json, 'like_count'
    assert json['liked'].is_a?(TrueClass) || json['liked'].is_a?(FalseClass)
    assert json['like_count'].is_a?(Integer)
  end

  test "should support Turbo Stream format" do
    sign_in @bob

    post like_gif_path(@gif), headers: { 'Accept' => 'text/vnd.turbo-stream.html' }
    assert_response :success
    assert_equal 'text/vnd.turbo-stream.html; charset=utf-8', response.content_type

    assert_match /turbo-stream/, response.body
    assert_match /like_#{@gif.id}/, response.body
  end

  test "JSON response reflects current like state" do
    sign_in @bob

    # First toggle - should like
    post like_gif_path(@gif), as: :json
    json1 = JSON.parse(response.body)
    assert json1['liked']

    # Second toggle - should unlike
    post like_gif_path(@gif), as: :json
    json2 = JSON.parse(response.body)
    assert_not json2['liked']
  end

  # ========== COUNTER CACHE TESTS ==========

  test "like count increments correctly" do
    sign_in @bob
    initial_count = @gif.like_count || 0

    post like_gif_path(@gif), as: :json

    @gif.reload
    assert_equal initial_count + 1, @gif.like_count
  end

  test "like count decrements correctly" do
    sign_in @bob
    Like.create!(user: @bob, gif: @gif)
    @gif.reload
    count_before = @gif.like_count

    post like_gif_path(@gif), as: :json

    @gif.reload
    assert_equal count_before - 1, @gif.like_count
  end

  # ========== EDGE CASE TESTS ==========

  test "multiple users can toggle likes on same gif" do
    sign_in @bob
    post like_gif_path(@gif), as: :json
    assert_response :success
    json_bob = JSON.parse(response.body)
    assert_includes json_bob, 'liked'

    sign_in @alice
    post like_gif_path(@gif), as: :json
    assert_response :success
    json_alice = JSON.parse(response.body)
    assert_includes json_alice, 'liked'

    # Verify both users can successfully toggle likes (regardless of initial state)
    assert_kind_of Integer, json_bob['like_count']
    assert_kind_of Integer, json_alice['like_count']
  end

  test "user can like multiple gifs" do
    sign_in @bob

    gif2 = Gif.create!(
      user: @alice,
      title: "Another GIF",
      privacy: :public_access
    )

    initial_count = Like.where(user: @bob).count

    post like_gif_path(@gif), as: :json
    post like_gif_path(gif2), as: :json

    assert_equal initial_count + 2, Like.where(user: @bob).count
  end

  test "can like private gif" do
    sign_in @bob

    private_gif = Gif.create!(
      user: @alice,
      title: "Private GIF",
      privacy: :private_access
    )

    post like_gif_path(private_gif), as: :json
    assert_response :success

    json = JSON.parse(response.body)
    assert json['liked']
  end

  test "can like unlisted gif" do
    sign_in @bob

    unlisted_gif = Gif.create!(
      user: @alice,
      title: "Unlisted GIF",
      privacy: :unlisted
    )

    post like_gif_path(unlisted_gif), as: :json
    assert_response :success

    json = JSON.parse(response.body)
    assert json['liked']
  end

  test "can like own gif" do
    sign_in @alice

    post like_gif_path(@gif), as: :json
    assert_response :success

    json = JSON.parse(response.body)
    assert json['liked']
  end

  private

  def sign_in(user)
    post user_session_path, params: {
      user: { email: user.email, password: "password123" }
    }
  end
end
