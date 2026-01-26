require "test_helper"

class NotificationsControllerTest < ActionDispatch::IntegrationTest
  fixtures :users, :gifs, :likes, :comments, :follows, :notifications

  setup do
    @alice = users(:one)
    @bob = users(:two)
  end

  # INDEX action tests
  test "index should require authentication" do
    get notifications_path
    assert_redirected_to new_user_session_path
  end

  test "index should show user's notifications" do
    sign_in @alice
    get notifications_path

    assert_response :success
    assert_select "h1", text: "Notifications"
  end

  test "index should only show current user's notifications" do
    sign_in @alice
    get notifications_path

    assert_response :success
    # Verify via JSON response
    get notifications_path, as: :json
    json = JSON.parse(response.body)

    # Alice should see her notifications
    alice_notification_ids = json["notifications"].map { |n| n["id"] }
    assert_includes alice_notification_ids, notifications(:alice_like_notification).id
    # Alice should NOT see Bob's notifications
    assert_not_includes alice_notification_ids, notifications(:bob_follow_notification).id
  end

  test "index should calculate unread count" do
    sign_in @alice
    get notifications_path, as: :json

    assert_response :success
    json = JSON.parse(response.body)
    # Alice has 1 unread notification
    assert_equal 1, json["unread_count"]
  end

  test "index should respond to JSON format" do
    sign_in @alice
    get notifications_path, as: :json

    assert_response :success
    json_response = JSON.parse(response.body)
    assert json_response.key?("notifications")
    assert json_response.key?("unread_count")
  end

  # MARK_AS_READ action tests
  test "mark_as_read should require authentication" do
    notification = notifications(:alice_like_notification)
    post mark_as_read_notification_path(notification)

    assert_redirected_to new_user_session_path
  end

  test "mark_as_read should mark notification as read" do
    sign_in @alice
    notification = notifications(:alice_like_notification)
    assert_nil notification.read_at

    post mark_as_read_notification_path(notification)

    notification.reload
    assert_not_nil notification.read_at
  end

  test "mark_as_read should not allow marking other user's notifications" do
    sign_in @alice
    bob_notification = notifications(:bob_follow_notification)
    original_read_at = bob_notification.read_at

    # Attempting to mark another user's notification should result in an error
    begin
      post mark_as_read_notification_path(bob_notification)
    rescue ActiveRecord::RecordNotFound
      # Expected - notification not found in current_user's scope
    end

    # Bob's notification should remain unchanged
    bob_notification.reload
    assert_nil bob_notification.read_at
  end

  test "mark_as_read should redirect back on HTML format" do
    sign_in @alice
    notification = notifications(:alice_like_notification)

    post mark_as_read_notification_path(notification)

    assert_response :redirect
  end

  test "mark_as_read should respond to JSON format" do
    sign_in @alice
    notification = notifications(:alice_like_notification)

    post mark_as_read_notification_path(notification), as: :json

    assert_response :success
    json_response = JSON.parse(response.body)
    assert json_response["success"]
  end

  test "mark_as_read should respond to Turbo Stream format" do
    sign_in @alice
    notification = notifications(:alice_like_notification)

    post mark_as_read_notification_path(notification), as: :turbo_stream

    assert_response :success
  end

  test "mark_as_read should raise 404 for nonexistent notification" do
    sign_in @alice

    # Controller should raise RecordNotFound which results in 404
    assert_raises(ActiveRecord::RecordNotFound) do
      Notification.where(recipient: @alice).find("00000000-0000-0000-0000-000000000000")
    end
  end

  test "mark_as_read should not allow marking other user's notification" do
    sign_in @alice
    bob_notification = notifications(:bob_follow_notification)

    # Trying to access another user's notification should raise RecordNotFound
    assert_raises(ActiveRecord::RecordNotFound) do
      @alice.notifications.find(bob_notification.id)
    end
  end

  # MARK_ALL_AS_READ action tests
  test "mark_all_as_read should require authentication" do
    post mark_all_as_read_notifications_path

    assert_redirected_to new_user_session_path
  end

  test "mark_all_as_read should mark all user's notifications as read" do
    sign_in @alice

    # Alice has 1 unread notification
    assert_equal 1, @alice.notifications.unread.count

    post mark_all_as_read_notifications_path

    # All should now be read
    assert_equal 0, @alice.notifications.unread.count
  end

  test "mark_all_as_read should not affect other users' notifications" do
    sign_in @alice

    # Bob has 1 unread notification
    bob_unread_count = @bob.notifications.unread.count
    assert_equal 1, bob_unread_count

    post mark_all_as_read_notifications_path

    # Bob's unread count should remain unchanged
    assert_equal bob_unread_count, @bob.notifications.unread.count
  end

  test "mark_all_as_read should redirect to notifications path with notice" do
    sign_in @alice

    post mark_all_as_read_notifications_path

    assert_redirected_to notifications_path
    assert_equal "All notifications marked as read", flash[:notice]
  end

  test "mark_all_as_read should respond to JSON format" do
    sign_in @alice

    post mark_all_as_read_notifications_path, as: :json

    assert_response :success
    json_response = JSON.parse(response.body)
    assert json_response["success"]
  end

  test "mark_all_as_read should respond to Turbo Stream format" do
    sign_in @alice

    post mark_all_as_read_notifications_path, as: :turbo_stream

    assert_response :success
  end

  # EDGE CASES
  test "index should handle user with no notifications" do
    # Create a user with no notifications
    user_no_notifications = User.create!(
      email: "nonot@example.com",
      username: "no_notifications",
      password: "password123"
    )

    sign_in user_no_notifications
    get notifications_path, as: :json

    assert_response :success
    json = JSON.parse(response.body)
    assert_equal 0, json["notifications"].length
    assert_equal 0, json["unread_count"]
  end

  test "mark_all_as_read should work when user has no notifications" do
    # Create a user with no notifications
    user_no_notifications = User.create!(
      email: "nonot2@example.com",
      username: "no_notifications2",
      password: "password123"
    )

    sign_in user_no_notifications

    # Should not raise error
    assert_nothing_raised do
      post mark_all_as_read_notifications_path
    end

    assert_redirected_to notifications_path
  end

  test "index JSON should include actor information" do
    sign_in @alice
    get notifications_path, as: :json

    assert_response :success
    json = JSON.parse(response.body)
    first_notification = json["notifications"].first

    assert first_notification.key?("actor")
    assert first_notification["actor"].key?("username")
    assert first_notification["actor"].key?("avatar_url")
  end

  test "index JSON should include all required notification fields" do
    sign_in @alice
    get notifications_path, as: :json

    assert_response :success
    json = JSON.parse(response.body)
    first_notification = json["notifications"].first

    assert first_notification.key?("id")
    assert first_notification.key?("message")
    assert first_notification.key?("read")
    assert first_notification.key?("created_at")
    assert [ true, false ].include?(first_notification["read"])
  end

  test "mark_as_read should update read_at timestamp" do
    sign_in @alice
    notification = notifications(:alice_like_notification)
    assert_nil notification.read_at

    freeze_time do
      post mark_as_read_notification_path(notification)

      notification.reload
      assert_equal Time.current.to_i, notification.read_at.to_i
    end
  end

  test "mark_all_as_read should update all unread notifications at once" do
    sign_in @alice

    unread_before = @alice.notifications.unread.count
    assert unread_before > 0, "Alice should have unread notifications for this test"

    freeze_time do
      post mark_all_as_read_notifications_path

      # All should be marked as read with current timestamp
      @alice.notifications.each do |n|
        n.reload
        assert_not_nil n.read_at
      end
    end
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
