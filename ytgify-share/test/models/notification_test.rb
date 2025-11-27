require "test_helper"

class NotificationTest < ActiveSupport::TestCase
  fixtures :users, :gifs, :likes, :comments, :follows, :notifications

  setup do
    @alice = users(:one)
    @bob = users(:two)
    @notification = notifications(:alice_like_notification)
  end

  test "should belong to recipient" do
    assert_equal @alice, @notification.recipient
  end

  test "should belong to actor" do
    assert_equal @bob, @notification.actor
  end

  test "should belong to notifiable" do
    assert_instance_of Like, @notification.notifiable
  end

  test "should require action" do
    notification = Notification.new(
      recipient: @alice,
      actor: @bob,
      notifiable: likes(:bob_like)
    )
    assert_not notification.valid?
    assert_includes notification.errors[:action], "can't be blank"
  end

  test "should have unread scope" do
    unread = Notification.unread
    assert_includes unread, notifications(:alice_like_notification)
    assert_not_includes unread, notifications(:alice_comment_notification)
  end

  test "should have read scope" do
    read = Notification.read
    assert_includes read, notifications(:alice_comment_notification)
    assert_not_includes read, notifications(:alice_like_notification)
  end

  test "should have recent scope" do
    recent = Notification.recent
    assert_equal Notification.order(created_at: :desc).to_a, recent.to_a
  end

  test "should have for_recipient scope" do
    alice_notifications = Notification.for_recipient(@alice)
    assert_includes alice_notifications, notifications(:alice_like_notification)
    assert_not_includes alice_notifications, notifications(:bob_follow_notification)
  end

  test "mark_as_read! should set read_at" do
    assert_nil @notification.read_at
    @notification.mark_as_read!
    assert_not_nil @notification.read_at
  end

  test "mark_as_read! should not update already read notification" do
    read_notification = notifications(:alice_comment_notification)
    original_read_at = read_notification.read_at
    read_notification.mark_as_read!
    assert_equal original_read_at.to_i, read_notification.read_at.to_i
  end

  test "read? should return false for unread notifications" do
    assert_not @notification.read?
  end

  test "read? should return true for read notifications" do
    assert notifications(:alice_comment_notification).read?
  end

  test "message should return correct format for like action" do
    notification = notifications(:alice_like_notification)
    assert_equal "#{@bob.username} liked your GIF", notification.message
  end

  test "message should return correct format for comment action" do
    notification = notifications(:alice_comment_notification)
    assert_equal "#{@bob.username} commented on your GIF", notification.message
  end

  test "message should return correct format for follow action" do
    notification = notifications(:bob_follow_notification)
    assert_equal "#{@alice.username} started following you", notification.message
  end

  test "parsed_data should return empty hash for nil data" do
    @notification.data = nil
    assert_equal({}, @notification.parsed_data)
  end

  test "parsed_data should parse JSON data" do
    @notification.set_data({ test: "value" })
    @notification.save!
    assert_equal({ "test" => "value" }, @notification.parsed_data)
  end

  test "set_data should convert hash to JSON" do
    @notification.set_data({ key: "value" })
    assert_equal({ key: "value" }.to_json, @notification.data)
  end

  # ========== ADDITIONAL VALIDATION TESTS ==========

  test "should accept all valid action values" do
    valid_actions = ["like", "comment", "follow", "collection_add", "remix"]

    valid_actions.each do |action|
      notification = Notification.new(
        recipient: @alice,
        actor: @bob,
        notifiable: @notification.notifiable,
        action: action
      )
      assert notification.valid?, "Action '#{action}' should be valid"
    end
  end

  test "should create valid notification with required fields" do
    gif = gifs(:alice_public_gif)
    notification = Notification.new(
      recipient: @alice,
      actor: @bob,
      notifiable: gif,
      action: "like"
    )
    assert notification.valid?
    assert notification.save
  end

  # ========== POLYMORPHIC ASSOCIATION EDGE CASES ==========

  test "should handle Gif as notifiable" do
    gif = gifs(:alice_public_gif)

    notification = Notification.create!(
      recipient: @alice,
      actor: @bob,
      notifiable: gif,
      action: "like"
    )
    assert_equal gif, notification.notifiable
    assert_kind_of Gif, notification.notifiable
  end

  test "should handle Comment as notifiable" do
    comment = Comment.create!(
      user: @bob,
      gif: gifs(:alice_public_gif),
      content: "Test comment"
    )

    notification = Notification.create!(
      recipient: @alice,
      actor: @bob,
      notifiable: comment,
      action: "comment"
    )
    assert_equal comment, notification.notifiable
    assert_kind_of Comment, notification.notifiable
  end

  # ========== SCOPE EDGE CASES ==========

  test "unread scope excludes read notifications" do
    read_notification = notifications(:alice_comment_notification)
    unread = Notification.unread

    assert_not_includes unread, read_notification
  end

  test "read scope excludes unread notifications" do
    unread_notification = notifications(:alice_like_notification)
    read = Notification.read

    assert_not_includes read, unread_notification
  end

  test "for_recipient returns empty for user with no notifications" do
    new_user = User.create!(
      email: "newuser@example.com",
      username: "newuser",
      password: "password123"
    )

    notifications = Notification.for_recipient(new_user)
    assert_equal 0, notifications.count
  end

  # ========== DATA PARSING EDGE CASES ==========

  test "parsed_data returns empty hash on invalid JSON" do
    @notification.update_column(:data, "invalid json {")
    assert_equal({}, @notification.parsed_data)
  end

  test "parsed_data returns empty hash when data is blank string" do
    @notification.data = ""
    assert_equal({}, @notification.parsed_data)
  end

  test "set_data handles nested hash" do
    nested_data = {
      user: { id: 1, name: "Test" },
      metadata: { count: 5 }
    }
    @notification.set_data(nested_data)
    @notification.save!

    parsed = @notification.parsed_data
    assert_equal 1, parsed["user"]["id"]
    assert_equal "Test", parsed["user"]["name"]
    assert_equal 5, parsed["metadata"]["count"]
  end

  # ========== MESSAGE GENERATION EDGE CASES ==========

  test "message returns correct string for collection_add action" do
    notification = Notification.create!(
      recipient: @alice,
      actor: @bob,
      notifiable: gifs(:alice_public_gif),
      action: "collection_add"
    )
    assert_equal "#{@bob.username} added your GIF to their collection", notification.message
  end

  test "message returns correct string for remix action" do
    notification = Notification.create!(
      recipient: @alice,
      actor: @bob,
      notifiable: gifs(:alice_public_gif),
      action: "remix"
    )
    assert_equal "#{@bob.username} remixed your GIF", notification.message
  end

  test "message returns generic string for unknown action" do
    notification = Notification.create!(
      recipient: @alice,
      actor: @bob,
      notifiable: gifs(:alice_public_gif),
      action: "custom_action"
    )
    assert_equal "#{@bob.username} custom_action", notification.message
  end

  test "message handles actor without username method" do
    gif = gifs(:alice_public_gif)
    # Create notification with Gif as actor (doesn't respond to username)
    notification = Notification.new(
      recipient: @alice,
      actor: gif,
      notifiable: gif,
      action: "like"
    )
    assert_equal "Someone liked your GIF", notification.message
  end

  # ========== INSTANCE METHOD EDGE CASES ==========

  test "mark_as_read! updates unread notification" do
    notification = Notification.create!(
      recipient: @alice,
      actor: @bob,
      notifiable: gifs(:alice_public_gif),
      action: "like"
    )

    assert_nil notification.read_at
    assert_not notification.read?

    notification.mark_as_read!
    notification.reload

    assert_not_nil notification.read_at
    assert notification.read?
  end

  test "read? correctly reflects read_at state" do
    # Unread notification
    unread = Notification.create!(
      recipient: @alice,
      actor: @bob,
      notifiable: gifs(:alice_public_gif),
      action: "like",
      read_at: nil
    )
    assert_not unread.read?

    # Read notification
    read = Notification.create!(
      recipient: @alice,
      actor: @bob,
      notifiable: gifs(:alice_public_gif),
      action: "comment",
      read_at: Time.current
    )
    assert read.read?
  end
end
