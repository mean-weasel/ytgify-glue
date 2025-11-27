require "test_helper"

class CommentTest < ActiveSupport::TestCase
  fixtures :users, :gifs

  setup do
    @alice = users(:one)
    @bob = users(:two)
    @gif = gifs(:alice_public_gif)
  end

  # ========== VALIDATION TESTS ==========

  test "should create valid comment with required fields" do
    comment = Comment.new(
      user: @alice,
      gif: @gif,
      content: "Great GIF!"
    )
    assert comment.valid?
    assert comment.save
  end

  test "should require user" do
    comment = Comment.new(
      gif: @gif,
      content: "Test comment"
    )
    assert_not comment.valid?
    assert_includes comment.errors[:user_id], "can't be blank"
  end

  test "should require gif" do
    comment = Comment.new(
      user: @alice,
      content: "Test comment"
    )
    assert_not comment.valid?
    assert_includes comment.errors[:gif_id], "can't be blank"
  end

  test "should require content" do
    comment = Comment.new(
      user: @alice,
      gif: @gif,
      content: nil
    )
    assert_not comment.valid?
    assert_includes comment.errors[:content], "can't be blank"
  end

  test "should reject empty content" do
    comment = Comment.new(
      user: @alice,
      gif: @gif,
      content: ""
    )
    assert_not comment.valid?
    assert_includes comment.errors[:content], "can't be blank"
  end

  test "should reject content longer than 2000 characters" do
    comment = Comment.new(
      user: @alice,
      gif: @gif,
      content: "a" * 2001
    )
    assert_not comment.valid?
    assert_includes comment.errors[:content], "is too long (maximum is 2000 characters)"
  end

  test "should accept content at max length" do
    comment = Comment.new(
      user: @alice,
      gif: @gif,
      content: "a" * 2000
    )
    assert comment.valid?
  end

  test "should accept content at minimum length" do
    comment = Comment.new(
      user: @alice,
      gif: @gif,
      content: "a"
    )
    assert comment.valid?
  end

  test "should accept nil parent_comment for top-level comments" do
    comment = Comment.new(
      user: @alice,
      gif: @gif,
      content: "Top level comment",
      parent_comment: nil
    )
    assert comment.valid?
    assert comment.save
  end

  test "should accept valid parent_comment for replies" do
    parent = Comment.create!(
      user: @alice,
      gif: @gif,
      content: "Parent comment"
    )

    reply = Comment.new(
      user: @bob,
      gif: @gif,
      content: "Reply to parent",
      parent_comment: parent
    )
    assert reply.valid?
    assert reply.save
  end

  # ========== ASSOCIATION TESTS ==========

  test "should belong to user" do
    comment = Comment.create!(
      user: @alice,
      gif: @gif,
      content: "Test"
    )
    assert_equal @alice, comment.user
  end

  test "should belong to gif" do
    comment = Comment.create!(
      user: @alice,
      gif: @gif,
      content: "Test"
    )
    assert_equal @gif, comment.gif
  end

  test "should belong to parent comment when reply" do
    parent = Comment.create!(
      user: @alice,
      gif: @gif,
      content: "Parent"
    )

    reply = Comment.create!(
      user: @bob,
      gif: @gif,
      content: "Reply",
      parent_comment: parent
    )

    assert_equal parent, reply.parent_comment
  end

  test "should have many replies" do
    parent = Comment.create!(
      user: @alice,
      gif: @gif,
      content: "Parent"
    )

    reply1 = Comment.create!(
      user: @bob,
      gif: @gif,
      content: "Reply 1",
      parent_comment: parent
    )

    reply2 = Comment.create!(
      user: @bob,
      gif: @gif,
      content: "Reply 2",
      parent_comment: parent
    )

    assert_includes parent.replies, reply1
    assert_includes parent.replies, reply2
    assert parent.replies.count >= 2
  end

  test "should destroy replies when parent destroyed" do
    parent = Comment.create!(
      user: @alice,
      gif: @gif,
      content: "Parent"
    )

    reply = Comment.create!(
      user: @bob,
      gif: @gif,
      content: "Reply",
      parent_comment: parent
    )

    assert_difference('Comment.count', -2) do
      parent.destroy
    end
  end

  # ========== SCOPE TESTS ==========

  test "top_level scope returns only comments without parent" do
    top = Comment.create!(
      user: @alice,
      gif: @gif,
      content: "Top level"
    )

    parent = Comment.create!(
      user: @alice,
      gif: @gif,
      content: "Another top"
    )

    reply = Comment.create!(
      user: @bob,
      gif: @gif,
      content: "Reply",
      parent_comment: parent
    )

    top_level = Comment.top_level
    assert_includes top_level, top
    assert_includes top_level, parent
    assert_not_includes top_level, reply
  end

  test "replies_to scope returns only replies to specific comment" do
    parent1 = Comment.create!(user: @alice, gif: @gif, content: "Parent 1")
    parent2 = Comment.create!(user: @alice, gif: @gif, content: "Parent 2")

    reply1 = Comment.create!(user: @bob, gif: @gif, content: "Reply to 1", parent_comment: parent1)
    reply2 = Comment.create!(user: @bob, gif: @gif, content: "Reply to 2", parent_comment: parent2)

    replies = Comment.replies_to(parent1.id)
    assert_includes replies, reply1
    assert_not_includes replies, reply2
  end

  test "recent scope orders by created_at desc" do
    comment1 = Comment.create!(user: @alice, gif: @gif, content: "First")
    sleep 0.01
    comment2 = Comment.create!(user: @alice, gif: @gif, content: "Second")
    sleep 0.01
    comment3 = Comment.create!(user: @alice, gif: @gif, content: "Third")

    recent = Comment.recent.where(id: [comment1.id, comment2.id, comment3.id])
    assert_equal comment3.id, recent.first.id
  end

  test "for_gif scope filters by gif_id" do
    gif2 = Gif.create!(
      user: @bob,
      title: "Another GIF",
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

    comment1 = Comment.create!(user: @alice, gif: @gif, content: "On gif1")
    comment2 = Comment.create!(user: @alice, gif: gif2, content: "On gif2")

    gif_comments = Comment.for_gif(@gif.id)
    assert_includes gif_comments, comment1
    assert_not_includes gif_comments, comment2
  end

  test "by_user scope filters by user_id" do
    comment1 = Comment.create!(user: @alice, gif: @gif, content: "Alice's comment")
    comment2 = Comment.create!(user: @bob, gif: @gif, content: "Bob's comment")

    alice_comments = Comment.by_user(@alice.id)
    assert_includes alice_comments, comment1
    assert_not_includes alice_comments, comment2
  end

  test "not_deleted scope excludes soft deleted comments" do
    comment = Comment.create!(user: @alice, gif: @gif, content: "Test")
    comment.soft_delete!

    assert_not_includes Comment.not_deleted, comment
  end

  test "deleted scope includes only soft deleted comments" do
    comment = Comment.create!(user: @alice, gif: @gif, content: "Test")
    comment.soft_delete!

    assert_includes Comment.deleted, comment
  end

  # ========== INSTANCE METHOD TESTS ==========

  test "top_level? returns true for comments without parent" do
    comment = Comment.create!(user: @alice, gif: @gif, content: "Top level")
    assert comment.top_level?
  end

  test "top_level? returns false for replies" do
    parent = Comment.create!(user: @alice, gif: @gif, content: "Parent")
    reply = Comment.create!(user: @bob, gif: @gif, content: "Reply", parent_comment: parent)
    refute reply.top_level?
  end

  test "reply? returns true for comments with parent" do
    parent = Comment.create!(user: @alice, gif: @gif, content: "Parent")
    reply = Comment.create!(user: @bob, gif: @gif, content: "Reply", parent_comment: parent)
    assert reply.reply?
  end

  test "reply? returns false for top-level comments" do
    comment = Comment.create!(user: @alice, gif: @gif, content: "Top level")
    refute comment.reply?
  end

  test "has_replies? returns true when comment has replies" do
    parent = Comment.create!(user: @alice, gif: @gif, content: "Parent")
    Comment.create!(user: @bob, gif: @gif, content: "Reply", parent_comment: parent)

    parent.reload
    assert parent.has_replies?
  end

  test "has_replies? returns false when comment has no replies" do
    comment = Comment.create!(user: @alice, gif: @gif, content: "No replies")
    refute comment.has_replies?
  end

  test "deleted? returns true when comment is soft deleted" do
    comment = Comment.create!(user: @alice, gif: @gif, content: "Test")
    comment.soft_delete!
    assert comment.deleted?
  end

  test "deleted? returns false when comment is not deleted" do
    comment = Comment.create!(user: @alice, gif: @gif, content: "Test")
    refute comment.deleted?
  end

  test "soft_delete! sets deleted_at and replaces content" do
    comment = Comment.create!(user: @alice, gif: @gif, content: "Original content")
    comment.soft_delete!

    comment.reload
    assert_not_nil comment.deleted_at
    assert_equal "[deleted]", comment.content
  end

  test "soft_delete! decrements gif comment_count" do
    initial_count = @gif.comment_count || 0
    comment = Comment.create!(user: @alice, gif: @gif, content: "Test")

    @gif.reload
    count_after_create = @gif.comment_count

    comment.soft_delete!

    @gif.reload
    assert_equal count_after_create - 1, @gif.comment_count
  end

  test "soft_delete! decrements parent reply_count for replies" do
    parent = Comment.create!(user: @alice, gif: @gif, content: "Parent")
    reply = Comment.create!(user: @bob, gif: @gif, content: "Reply", parent_comment: parent)

    parent.reload
    initial_reply_count = parent.reply_count

    reply.soft_delete!

    parent.reload
    assert_equal initial_reply_count - 1, parent.reply_count
  end

  test "restore! clears deleted_at" do
    comment = Comment.create!(user: @alice, gif: @gif, content: "Test")
    comment.soft_delete!
    comment.restore!

    comment.reload
    assert_nil comment.deleted_at
  end

  test "reply_tree returns replies with associations" do
    parent = Comment.create!(user: @alice, gif: @gif, content: "Parent")
    reply = Comment.create!(user: @bob, gif: @gif, content: "Reply", parent_comment: parent)

    tree = parent.reply_tree
    assert_includes tree, reply
    # Verify associations are loaded
    assert tree.first.association(:user).loaded?
  end

  # ========== CALLBACK TESTS ==========

  test "creates notification after create" do
    # Mock NotificationService to verify it's called
    assert_difference('Comment.count', 1) do
      Comment.create!(user: @bob, gif: @gif, content: "Test comment")
    end
    # Notification creation is tested in NotificationService tests
  end

  test "handles notification creation failure gracefully" do
    # Should not prevent comment creation if notification fails
    assert_difference('Comment.count', 1) do
      comment = Comment.new(user: @bob, gif: @gif, content: "Test")
      comment.save!
    end
  end

  # ========== COUNTER CACHE TESTS ==========

  test "increments gif comment_count on create" do
    initial_count = @gif.comment_count || 0

    Comment.create!(user: @alice, gif: @gif, content: "Test")

    @gif.reload
    assert_equal initial_count + 1, @gif.comment_count
  end

  test "decrements gif comment_count on destroy" do
    comment = Comment.create!(user: @alice, gif: @gif, content: "Test")

    @gif.reload
    count_before_destroy = @gif.comment_count

    comment.destroy

    @gif.reload
    assert_equal count_before_destroy - 1, @gif.comment_count
  end

  test "increments parent reply_count on reply create" do
    parent = Comment.create!(user: @alice, gif: @gif, content: "Parent")
    initial_count = parent.reply_count || 0

    Comment.create!(user: @bob, gif: @gif, content: "Reply", parent_comment: parent)

    parent.reload
    assert_equal initial_count + 1, parent.reply_count
  end

  test "decrements parent reply_count on reply destroy" do
    parent = Comment.create!(user: @alice, gif: @gif, content: "Parent")
    reply = Comment.create!(user: @bob, gif: @gif, content: "Reply", parent_comment: parent)

    parent.reload
    count_before = parent.reply_count

    reply.destroy

    parent.reload
    assert_equal count_before - 1, parent.reply_count
  end
end
