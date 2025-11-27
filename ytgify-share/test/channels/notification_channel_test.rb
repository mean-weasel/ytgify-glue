require "test_helper"

class NotificationChannelTest < ActionCable::Channel::TestCase
  setup do
    @user = User.create!(
      username: "testuser_channel",
      email: "channel@example.com",
      password: "password123",
      jti: SecureRandom.uuid
    )
  end

  teardown do
    @user.destroy if @user&.persisted?
  end

  test "subscribes successfully with authenticated user" do
    stub_connection current_user: @user

    subscribe

    assert subscription.confirmed?
    assert_has_stream_for @user
  end

  test "streams notifications for current user" do
    stub_connection current_user: @user

    subscribe

    # Verify the user is subscribed to their notification stream
    assert_has_stream_for @user
  end

  test "unsubscribes and stops all streams" do
    stub_connection current_user: @user

    subscribe
    assert subscription.confirmed?

    unsubscribe

    assert_no_streams
  end
end
