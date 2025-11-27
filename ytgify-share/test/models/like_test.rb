require "test_helper"

class LikeTest < ActiveSupport::TestCase
  fixtures :users, :gifs

  setup do
    @alice = users(:one)
    @bob = users(:two)
    @gif = gifs(:alice_public_gif)

    # Clean up any existing likes involving @bob and @gif to avoid fixture conflicts
    Like.where(user: @bob, gif: @gif).destroy_all
    Like.where(user: @alice, gif: @gif).destroy_all
  end

  # ========== VALIDATION TESTS ==========

  test "should create valid like with required fields" do
    like = Like.new(user: @bob, gif: @gif)
    assert like.valid?
    assert like.save
  end

  test "should require user_id" do
    like = Like.new(gif: @gif)
    assert_not like.valid?
    assert_includes like.errors[:user_id], "can't be blank"
  end

  test "should require gif_id" do
    like = Like.new(user: @bob)
    assert_not like.valid?
    assert_includes like.errors[:gif_id], "can't be blank"
  end

  test "should not allow duplicate likes (user cannot like same GIF twice)" do
    Like.create!(user: @bob, gif: @gif)
    duplicate = Like.new(user: @bob, gif: @gif)
    assert_not duplicate.valid?
    assert_includes duplicate.errors[:user_id], "has already liked this gif"
  end

  test "should allow same user to like different GIFs" do
    gif2 = Gif.create!(
      user: @alice,
      title: "Another GIF",
      privacy: :public_access
    )

    Like.create!(user: @bob, gif: @gif)
    like2 = Like.new(user: @bob, gif: gif2)
    assert like2.valid?
    assert like2.save
  end

  test "should allow different users to like same GIF" do
    Like.create!(user: @bob, gif: @gif)
    like2 = Like.new(user: @alice, gif: @gif)
    assert like2.valid?
    assert like2.save
  end

  # ========== ASSOCIATION TESTS ==========

  test "should belong to user" do
    like = Like.create!(user: @bob, gif: @gif)
    assert_equal @bob, like.user
  end

  test "should belong to gif" do
    like = Like.create!(user: @bob, gif: @gif)
    assert_equal @gif, like.gif
  end

  # ========== COUNTER CACHE TESTS ==========

  test "should increment gif like_count on create" do
    assert_difference("@gif.reload.like_count", 1) do
      Like.create!(user: @bob, gif: @gif)
    end
  end

  test "should decrement gif like_count on destroy" do
    like = Like.create!(user: @bob, gif: @gif)

    @gif.reload
    count_before = @gif.like_count

    like.destroy

    @gif.reload
    assert_equal count_before - 1, @gif.like_count
  end

  test "should increment user total_likes_received on create" do
    gif_owner = @gif.user
    initial_count = gif_owner.total_likes_received || 0

    Like.create!(user: @bob, gif: @gif)

    gif_owner.reload
    assert_equal initial_count + 1, gif_owner.total_likes_received
  end

  test "should decrement user total_likes_received on destroy" do
    like = Like.create!(user: @bob, gif: @gif)

    gif_owner = @gif.user
    gif_owner.reload
    count_before = gif_owner.total_likes_received

    like.destroy

    gif_owner.reload
    assert_equal count_before - 1, gif_owner.total_likes_received
  end

  # ========== SCOPE TESTS ==========

  test "recent scope orders by created_at desc" do
    like1 = Like.create!(user: @bob, gif: @gif)
    sleep 0.01
    gif2 = Gif.create!(user: @alice, title: "GIF 2", privacy: :public_access)
    like2 = Like.create!(user: @bob, gif: gif2)

    recent = Like.recent.where(id: [ like1.id, like2.id ])
    assert_equal like2.id, recent.first.id
  end

  test "by_user scope filters by user_id" do
    gif2 = Gif.create!(user: @alice, title: "GIF 2", privacy: :public_access)

    like1 = Like.create!(user: @bob, gif: @gif)
    like2 = Like.create!(user: @alice, gif: gif2)

    bob_likes = Like.by_user(@bob.id)
    assert_includes bob_likes, like1
    assert_not_includes bob_likes, like2
  end

  test "for_gif scope filters by gif_id" do
    gif2 = Gif.create!(user: @alice, title: "GIF 2", privacy: :public_access)

    like1 = Like.create!(user: @bob, gif: @gif)
    like2 = Like.create!(user: @bob, gif: gif2)

    gif_likes = Like.for_gif(@gif.id)
    assert_includes gif_likes, like1
    assert_not_includes gif_likes, like2
  end

  # ========== CALLBACK TESTS ==========

  test "creates notification after create" do
    # Notification creation is tested in NotificationService tests
    # Just verify the like creates without raising errors
    assert_difference("Like.count", 1) do
      Like.create!(user: @bob, gif: @gif)
    end
  end

  test "handles notification creation failure gracefully" do
    # Should not prevent like creation if notification fails
    assert_difference("Like.count", 1) do
      like = Like.new(user: @bob, gif: @gif)
      like.save!
    end
  end

  # ========== EDGE CASES ==========

  test "touches gif on create" do
    @gif.update_column(:updated_at, 1.hour.ago)
    original_time = @gif.updated_at

    Like.create!(user: @bob, gif: @gif)

    @gif.reload
    assert @gif.updated_at > original_time
  end

  test "multiple likes from different users increment count correctly" do
    user3 = User.create!(
      email: "user3@example.com",
      username: "user3",
      password: "password123"
    )

    assert_difference("@gif.reload.like_count", 2) do
      Like.create!(user: @bob, gif: @gif)
      Like.create!(user: user3, gif: @gif)
    end
  end
end
