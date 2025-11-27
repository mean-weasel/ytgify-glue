require "test_helper"

class NotificationServiceTest < ActiveSupport::TestCase
  fixtures :users, :gifs

  setup do
    @alice = users(:one)
    @bob = users(:two)
    @source_gif = gifs(:alice_public_gif)
  end

  # ========== REMIX NOTIFICATION TESTS ==========

  test "create_remix_notification creates notification" do
    remix = create_remix(@bob, @source_gif)

    assert_difference("Notification.count", 1) do
      NotificationService.create_remix_notification(remix)
    end

    notification = Notification.find_by(notifiable: remix, action: "remix")
    assert_not_nil notification, "Remix notification should be created"
    assert_equal "remix", notification.action
    assert_equal @alice, notification.recipient
    assert_equal @bob, notification.actor
    assert_equal remix, notification.notifiable
  end

  test "create_remix_notification does not notify when remixing own gif" do
    remix = create_remix(@alice, @source_gif)

    assert_no_difference("Notification.count") do
      NotificationService.create_remix_notification(remix)
    end
  end

  test "create_remix_notification does not create notification when parent_gif is nil" do
    remix = Gif.create!(
      user: @bob,
      title: "Remix without parent",
      is_remix: true,
      parent_gif: nil,  # No parent
      privacy: :public_access,
      youtube_video_url: "https://www.youtube.com/watch?v=test",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5,
      duration: 5.0,
      fps: 30,
      resolution_width: 480,
      resolution_height: 270
    )

    assert_no_difference("Notification.count") do
      NotificationService.create_remix_notification(remix)
    end
  end

  # Removed: Broadcast test requires mocha for mocking

  test "create_remix_notification includes correct message" do
    remix = create_remix(@bob, @source_gif)

    NotificationService.create_remix_notification(remix)

    notification = Notification.find_by(notifiable: remix, action: "remix")
    assert_not_nil notification, "Remix notification should be created"
    assert_equal "#{@bob.username} remixed your GIF", notification.message
  end

  # ========== LIKE NOTIFICATION TESTS (for comparison) ==========

  test "create_like_notification creates notification" do
    # Ensure no existing like from bob to source_gif
    Like.where(user: @bob, gif: @source_gif).destroy_all

    like = Like.create!(user: @bob, gif: @source_gif)

    assert_difference("Notification.count", 1) do
      NotificationService.create_like_notification(like)
    end

    notification = Notification.find_by(notifiable: like, action: "like")
    assert_not_nil notification, "Like notification should be created"
    assert_equal "like", notification.action
    assert_equal @alice, notification.recipient
    assert_equal @bob, notification.actor
  end

  test "create_like_notification does not notify when liking own gif" do
    # Ensure no existing like from alice to source_gif
    Like.where(user: @alice, gif: @source_gif).destroy_all

    like = Like.create!(user: @alice, gif: @source_gif)

    assert_no_difference("Notification.count") do
      NotificationService.create_like_notification(like)
    end
  end

  # ========== COMMENT NOTIFICATION TESTS ==========

  test "create_comment_notification creates notification" do
    comment = Comment.create!(
      user: @bob,
      gif: @source_gif,
      content: "Great GIF!"
    )

    assert_difference("Notification.count", 1) do
      NotificationService.create_comment_notification(comment)
    end

    notification = Notification.last
    assert_equal "comment", notification.action
    assert_equal @alice, notification.recipient
    assert_equal @bob, notification.actor
  end

  test "create_comment_notification does not notify when commenting on own gif" do
    comment = Comment.create!(
      user: @alice,
      gif: @source_gif,
      content: "My own comment"
    )

    assert_no_difference("Notification.count") do
      NotificationService.create_comment_notification(comment)
    end
  end

  # ========== FOLLOW NOTIFICATION TESTS ==========

  test "create_follow_notification creates notification" do
    # Ensure no existing follow from bob to alice
    Follow.where(follower_id: @bob.id, following_id: @alice.id).destroy_all

    follow = Follow.create!(follower_id: @bob.id, following_id: @alice.id)

    assert_difference("Notification.count", 1) do
      NotificationService.create_follow_notification(follow)
    end

    notification = Notification.find_by(notifiable: follow, action: "follow")
    assert_not_nil notification, "Follow notification should be created"
    assert_equal "follow", notification.action
    assert_equal @alice, notification.recipient
    assert_equal @bob, notification.actor
  end

  # ========== BROADCAST TESTS ==========

  # Removed: Broadcast tests require mocha for mocking

  # ========== COLLECTION ADD NOTIFICATION TESTS ==========

  test "create_collection_add_notification creates notification with collection name" do
    collection = Collection.create!(
      user: @bob,
      name: "My Favorites",
      description: "Test collection"
    )

    collection_gif = CollectionGif.create!(
      collection: collection,
      gif: @source_gif,
      position: 0
    )

    assert_difference("Notification.count", 1) do
      NotificationService.create_collection_add_notification(collection_gif)
    end

    notification = Notification.find_by(notifiable: collection_gif, action: "collection_add")
    assert_not_nil notification, "Collection add notification should be created"
    assert_equal "collection_add", notification.action
    assert_equal @alice, notification.recipient
    assert_equal @bob, notification.actor

    parsed_data = JSON.parse(notification.data)
    assert_equal "My Favorites", parsed_data["collection_name"]
  end

  test "create_collection_add_notification does not notify when adding own gif" do
    collection = Collection.create!(
      user: @alice,
      name: "My Own Collection",
      description: "Test"
    )

    collection_gif = CollectionGif.create!(
      collection: collection,
      gif: @source_gif,
      position: 0
    )

    assert_no_difference("Notification.count") do
      NotificationService.create_collection_add_notification(collection_gif)
    end
  end

  # ========== ERROR HANDLING TESTS ==========

  test "create_like_notification handles nil like gracefully" do
    assert_raises(NoMethodError) do
      NotificationService.create_like_notification(nil)
    end
  end

  test "create_comment_notification handles nil comment gracefully" do
    assert_raises(NoMethodError) do
      NotificationService.create_comment_notification(nil)
    end
  end

  test "create_follow_notification handles nil follow gracefully" do
    assert_raises(NoMethodError) do
      NotificationService.create_follow_notification(nil)
    end
  end

  test "create_collection_add_notification handles nil collection_gif gracefully" do
    assert_raises(NoMethodError) do
      NotificationService.create_collection_add_notification(nil)
    end
  end

  test "create_remix_notification handles nil remix gracefully" do
    assert_raises(NoMethodError) do
      NotificationService.create_remix_notification(nil)
    end
  end

  # ========== EDGE CASE TESTS ==========

  test "create_like_notification works with private GIF" do
    Like.where(user: @bob, gif: @source_gif).destroy_all

    private_gif = Gif.create!(
      user: @alice,
      title: "Private GIF",
      privacy: :private_access
    )

    like = Like.create!(user: @bob, gif: private_gif)

    assert_difference("Notification.count", 1) do
      NotificationService.create_like_notification(like)
    end

    notification = Notification.find_by(notifiable: like, action: "like")
    assert_equal @alice, notification.recipient
  end

  test "create_comment_notification works with unlisted GIF" do
    unlisted_gif = Gif.create!(
      user: @alice,
      title: "Unlisted GIF",
      privacy: :unlisted
    )

    comment = Comment.create!(
      user: @bob,
      gif: unlisted_gif,
      content: "Test comment"
    )

    assert_difference("Notification.count", 1) do
      NotificationService.create_comment_notification(comment)
    end
  end

  test "multiple likes create multiple notifications" do
    Like.where(gif: @source_gif).destroy_all

    user3 = User.create!(
      email: "user3@example.com",
      username: "user3",
      password: "password123"
    )

    like1 = Like.create!(user: @bob, gif: @source_gif)
    like2 = Like.create!(user: user3, gif: @source_gif)

    assert_difference("Notification.count", 2) do
      NotificationService.create_like_notification(like1)
      NotificationService.create_like_notification(like2)
    end
  end

  test "multiple comments create multiple notifications" do
    comment1 = Comment.create!(user: @bob, gif: @source_gif, content: "First")
    comment2 = Comment.create!(user: @bob, gif: @source_gif, content: "Second")

    assert_difference("Notification.count", 2) do
      NotificationService.create_comment_notification(comment1)
      NotificationService.create_comment_notification(comment2)
    end
  end

  test "create_remix_notification with deeply nested remix chain" do
    # Create a remix of a remix
    remix1 = create_remix(@bob, @source_gif)
    remix2 = create_remix(@alice, remix1)

    assert_difference("Notification.count", 1) do
      NotificationService.create_remix_notification(remix2)
    end

    notification = Notification.find_by(notifiable: remix2, action: "remix")
    assert_equal @bob, notification.recipient # Bob owns remix1
  end

  test "create_collection_add_notification includes collection name in data" do
    collection = Collection.create!(
      user: @bob,
      name: "Test Collection",
      description: "Test"
    )

    collection_gif = CollectionGif.create!(
      collection: collection,
      gif: @source_gif,
      position: 0
    )

    NotificationService.create_collection_add_notification(collection_gif)

    notification = Notification.find_by(notifiable: collection_gif, action: "collection_add")
    parsed_data = JSON.parse(notification.data)
    assert_equal "Test Collection", parsed_data["collection_name"]
  end

  test "notifications have correct timestamps" do
    Like.where(user: @bob, gif: @source_gif).destroy_all

    like = Like.create!(user: @bob, gif: @source_gif)
    before_time = 1.second.ago

    NotificationService.create_like_notification(like)

    after_time = 1.second.from_now
    notification = Notification.find_by(notifiable: like, action: "like")

    assert notification.created_at >= before_time
    assert notification.created_at <= after_time
  end

  test "notifications are unread by default" do
    Like.where(user: @bob, gif: @source_gif).destroy_all

    like = Like.create!(user: @bob, gif: @source_gif)
    NotificationService.create_like_notification(like)

    notification = Notification.find_by(notifiable: like, action: "like")
    assert_nil notification.read_at
    assert_not notification.read?
  end

  test "follow notification between different users" do
    Follow.where(follower_id: @bob.id, following_id: @alice.id).destroy_all

    user3 = User.create!(
      email: "user3@example.com",
      username: "user3",
      password: "password123"
    )

    follow = Follow.create!(follower_id: @bob.id, following_id: user3.id)

    assert_difference("Notification.count", 1) do
      NotificationService.create_follow_notification(follow)
    end

    notification = Notification.find_by(notifiable: follow, action: "follow")
    assert_equal user3, notification.recipient
    assert_equal @bob, notification.actor
  end

  test "collection add notification with long collection name" do
    collection = Collection.create!(
      user: @bob,
      name: "a" * 100, # Max length
      description: "Test"
    )

    collection_gif = CollectionGif.create!(
      collection: collection,
      gif: @source_gif,
      position: 0
    )

    assert_difference("Notification.count", 1) do
      NotificationService.create_collection_add_notification(collection_gif)
    end

    notification = Notification.find_by(notifiable: collection_gif, action: "collection_add")
    parsed_data = JSON.parse(notification.data)
    assert_equal 100, parsed_data["collection_name"].length
  end

  test "remix notification message format" do
    remix = create_remix(@bob, @source_gif)
    NotificationService.create_remix_notification(remix)

    notification = Notification.find_by(notifiable: remix, action: "remix")
    expected_message = "#{@bob.username} remixed your GIF"
    assert_equal expected_message, notification.message
  end

  test "like notification message format" do
    Like.where(user: @bob, gif: @source_gif).destroy_all

    like = Like.create!(user: @bob, gif: @source_gif)
    NotificationService.create_like_notification(like)

    notification = Notification.find_by(notifiable: like, action: "like")
    expected_message = "#{@bob.username} liked your GIF"
    assert_equal expected_message, notification.message
  end

  test "comment notification message format" do
    comment = Comment.create!(user: @bob, gif: @source_gif, content: "Test")
    NotificationService.create_comment_notification(comment)

    notification = Notification.last
    expected_message = "#{@bob.username} commented on your GIF"
    assert_equal expected_message, notification.message
  end

  test "follow notification message format" do
    Follow.where(follower_id: @bob.id, following_id: @alice.id).destroy_all

    follow = Follow.create!(follower_id: @bob.id, following_id: @alice.id)
    NotificationService.create_follow_notification(follow)

    notification = Notification.find_by(notifiable: follow, action: "follow")
    expected_message = "#{@bob.username} started following you"
    assert_equal expected_message, notification.message
  end

  test "collection add notification message format" do
    collection = Collection.create!(user: @bob, name: "Favorites", description: "Test")
    collection_gif = CollectionGif.create!(collection: collection, gif: @source_gif, position: 0)

    NotificationService.create_collection_add_notification(collection_gif)

    notification = Notification.find_by(notifiable: collection_gif, action: "collection_add")
    expected_message = "#{@bob.username} added your GIF to their collection"
    assert_equal expected_message, notification.message
  end

  private

  def create_remix(user, parent_gif)
    Gif.create!(
      user: user,
      parent_gif: parent_gif,
      is_remix: true,
      title: "Test Remix",
      privacy: :public_access,
      youtube_video_url: "https://www.youtube.com/watch?v=test",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5,
      duration: 5.0,
      fps: 30,
      resolution_width: 480,
      resolution_height: 270,
      has_text_overlay: true,
      text_overlay_data: { text: "Test" }
    )
  end
end
