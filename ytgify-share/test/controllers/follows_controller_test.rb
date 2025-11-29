require "test_helper"

class FollowsControllerTest < ActionDispatch::IntegrationTest
  fixtures :users, :follows

  setup do
    @alice = users(:one)
    @bob = users(:two)
  end

  # Authentication Tests
  test "toggle requires authentication" do
    post follow_user_path(@bob.username)
    assert_redirected_to new_user_session_path
  end

  # Follow Functionality Tests
  test "follow user creates follow relationship" do
    sign_in @alice

    assert_difference -> { Follow.count }, 1 do
      assert_difference -> { @bob.reload.follower_count }, 1 do
        assert_difference -> { @alice.reload.following_count }, 1 do
          post follow_user_path(@bob.username)
        end
      end
    end

    assert_response :redirect
    assert Follow.exists?(follower: @alice, following: @bob)
  end

  test "unfollow user destroys follow relationship" do
    sign_in @alice
    @alice.following_relationships.create!(following: @bob)
    @alice.reload
    @bob.reload

    assert_difference -> { Follow.count }, -1 do
      assert_difference -> { @bob.reload.follower_count }, -1 do
        assert_difference -> { @alice.reload.following_count }, -1 do
          post follow_user_path(@bob.username)
        end
      end
    end

    assert_response :redirect
    assert_not Follow.exists?(follower: @alice, following: @bob)
  end

  test "toggle creates follow if not following" do
    sign_in @alice

    assert_not @alice.following?(@bob)

    post follow_user_path(@bob.username)

    assert @alice.reload.following?(@bob)
  end

  test "toggle destroys follow if already following" do
    sign_in @alice
    @alice.following_relationships.create!(following: @bob)

    assert @alice.reload.following?(@bob)

    post follow_user_path(@bob.username)

    assert_not @alice.reload.following?(@bob)
  end

  # Counter Cache Tests
  test "following increments both counters" do
    sign_in @alice

    initial_follower_count = @bob.follower_count
    initial_following_count = @alice.following_count

    post follow_user_path(@bob.username)

    assert_equal initial_follower_count + 1, @bob.reload.follower_count
    assert_equal initial_following_count + 1, @alice.reload.following_count
  end

  test "unfollowing decrements both counters" do
    sign_in @alice
    @alice.following_relationships.create!(following: @bob)
    @alice.reload
    @bob.reload

    initial_follower_count = @bob.follower_count
    initial_following_count = @alice.following_count

    post follow_user_path(@bob.username)

    assert_equal initial_follower_count - 1, @bob.reload.follower_count
    assert_equal initial_following_count - 1, @alice.reload.following_count
  end

  # Turbo Stream Response Tests
  test "turbo stream response for follow" do
    sign_in @alice

    post follow_user_path(@bob.username), headers: { "Accept" => "text/vnd.turbo-stream.html" }

    assert_response :success
    assert_equal "text/vnd.turbo-stream.html; charset=utf-8", response.content_type
    assert_match /follow_button_#{@bob.id}/, response.body
    assert_match /follower_count_#{@bob.id}/, response.body
  end

  test "turbo stream response for unfollow" do
    sign_in @alice
    @alice.following_relationships.create!(following: @bob)

    post follow_user_path(@bob.username), headers: { "Accept" => "text/vnd.turbo-stream.html" }

    assert_response :success
    assert_equal "text/vnd.turbo-stream.html; charset=utf-8", response.content_type
  end

  # JSON Response Tests
  test "json response for follow" do
    sign_in @alice

    post follow_user_path(@bob.username), headers: { "Accept" => "application/json" }

    assert_response :success
    json = JSON.parse(response.body)
    assert_equal true, json["following"]
    # Verify counters are present and updated
    assert json.key?("follower_count"), "Response should include follower_count"
    assert json.key?("following_count"), "Response should include following_count"
    assert json["follower_count"] >= 0, "Follower count should be non-negative"
    assert json["following_count"] >= 0, "Following count should be non-negative"
    assert_includes json["message"], "Successfully followed"
  end

  test "json response for unfollow" do
    sign_in @alice
    @alice.following_relationships.create!(following: @bob)
    @alice.reload
    @bob.reload

    post follow_user_path(@bob.username), headers: { "Accept" => "application/json" }

    assert_response :success
    json = JSON.parse(response.body)
    assert_equal false, json["following"]
    assert_equal 0, json["follower_count"]
    assert_equal 0, json["following_count"]
    assert_includes json["message"], "Successfully unfollowed"
  end

  # HTML Response Tests
  test "html response redirects back" do
    sign_in @alice

    post follow_user_path(@bob.username), headers: { "Accept" => "text/html" }

    assert_response :redirect
    follow_redirect!
    assert_response :success
  end

  # Self-Follow Prevention Tests
  test "cannot follow yourself" do
    sign_in @alice

    assert_no_difference -> { Follow.count } do
      post follow_user_path(@alice.username)
    end

    # HTML format redirects with alert
    assert_response :redirect
  end

  test "self-follow returns forbidden for turbo stream" do
    sign_in @alice

    post follow_user_path(@alice.username), headers: { "Accept" => "text/vnd.turbo-stream.html" }

    assert_response :forbidden
  end

  test "self-follow returns forbidden for json" do
    sign_in @alice

    post follow_user_path(@alice.username), headers: { "Accept" => "application/json" }

    assert_response :forbidden
    json = JSON.parse(response.body)
    assert_includes json["error"], "can't follow yourself"
  end

  # User Not Found Tests
  test "nonexistent user returns not found" do
    sign_in @alice

    post follow_user_path("nonexistent"), headers: { "Accept" => "application/json" }

    assert_response :not_found
    json = JSON.parse(response.body)
    assert_equal "User not found", json["error"]
  end

  test "nonexistent user returns not found for turbo stream" do
    sign_in @alice

    post follow_user_path("nonexistent"), headers: { "Accept" => "text/vnd.turbo-stream.html" }

    assert_response :not_found
  end

  test "nonexistent user redirects for html" do
    sign_in @alice

    post follow_user_path("nonexistent"), headers: { "Accept" => "text/html" }

    assert_response :redirect
    assert_redirected_to root_path
  end

  # Self-Follow HTML Tests
  test "self-follow redirects back for html" do
    sign_in @alice

    post follow_user_path(@alice.username), headers: { "Accept" => "text/html" }

    assert_response :redirect
  end

  # Edge Cases
  test "double follow doesn't create duplicate" do
    sign_in @alice

    # First follow
    post follow_user_path(@bob.username)
    assert @alice.reload.following?(@bob)

    # Second follow (should unfollow)
    post follow_user_path(@bob.username)
    assert_not @alice.reload.following?(@bob)
  end

  test "rapid toggles work correctly" do
    sign_in @alice

    # Follow
    post follow_user_path(@bob.username)
    assert @alice.reload.following?(@bob)

    # Unfollow
    post follow_user_path(@bob.username)
    assert_not @alice.reload.following?(@bob)

    # Follow again
    post follow_user_path(@bob.username)
    assert @alice.reload.following?(@bob)
  end

  test "counters remain accurate after multiple toggles" do
    sign_in @alice

    # Start at 0
    assert_equal 0, @bob.follower_count
    assert_equal 0, @alice.following_count

    # Follow
    post follow_user_path(@bob.username)
    assert_equal 1, @bob.reload.follower_count
    assert_equal 1, @alice.reload.following_count

    # Unfollow
    post follow_user_path(@bob.username)
    assert_equal 0, @bob.reload.follower_count
    assert_equal 0, @alice.reload.following_count

    # Follow again
    post follow_user_path(@bob.username)
    assert_equal 1, @bob.reload.follower_count
    assert_equal 1, @alice.reload.following_count
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
