require "test_helper"

class FollowTest < ActiveSupport::TestCase
  def setup
    @user1 = User.create!(
      email: "user1@example.com",
      username: "user1",
      password: "password123"
    )
    @user2 = User.create!(
      email: "user2@example.com",
      username: "user2",
      password: "password123"
    )
  end

  test "should create valid follow" do
    follow = Follow.new(follower: @user1, following: @user2)
    assert follow.valid?
    assert follow.save
  end

  test "should not allow following yourself" do
    follow = Follow.new(follower: @user1, following: @user1)
    assert_not follow.valid?
    assert_includes follow.errors[:follower_id], "cannot follow yourself"
  end

  test "should not allow duplicate follows" do
    Follow.create!(follower: @user1, following: @user2)
    duplicate = Follow.new(follower: @user1, following: @user2)
    assert_not duplicate.valid?
  end

  test "toggle creates follow if none exists" do
    assert_difference 'Follow.count', 1 do
      result = Follow.toggle(@user1, @user2)
      assert result # returns true when following
    end
  end

  test "toggle destroys follow if exists" do
    Follow.create!(follower: @user1, following: @user2)

    assert_difference 'Follow.count', -1 do
      result = Follow.toggle(@user1, @user2)
      assert_not result # returns false when unfollowing
    end
  end

  test "toggle returns false for self-follow" do
    assert_no_difference 'Follow.count' do
      result = Follow.toggle(@user1, @user1)
      assert_not result
    end
  end

  test "updates follower counter cache" do
    initial_count = @user2.follower_count
    Follow.create!(follower: @user1, following: @user2)
    @user2.reload
    assert_equal initial_count + 1, @user2.follower_count
  end

  test "updates following counter cache" do
    initial_count = @user1.following_count
    Follow.create!(follower: @user1, following: @user2)
    @user1.reload
    assert_equal initial_count + 1, @user1.following_count
  end

  test "decrements counters on destroy" do
    follow = Follow.create!(follower: @user1, following: @user2)
    @user1.reload
    @user2.reload

    follower_count = @user2.follower_count
    following_count = @user1.following_count

    follow.destroy
    @user1.reload
    @user2.reload

    assert_equal follower_count - 1, @user2.follower_count
    assert_equal following_count - 1, @user1.following_count
  end

  test "should enforce database constraint for self-follow" do
    # Bypass model validation to test database constraint
    assert_raises ActiveRecord::StatementInvalid do
      Follow.connection.execute(
        "INSERT INTO follows (id, follower_id, following_id, created_at, updated_at)
         VALUES ('#{SecureRandom.uuid}', '#{@user1.id}', '#{@user1.id}', NOW(), NOW())"
      )
    end
  end

  test "for_follower scope returns follows by follower" do
    Follow.create!(follower: @user1, following: @user2)
    user3 = User.create!(email: "user3@example.com", username: "user3", password: "password123")
    Follow.create!(follower: user3, following: @user2)

    follows = Follow.for_follower(@user1.id)
    assert_equal 1, follows.count
    assert_equal @user1.id, follows.first.follower_id
  end

  test "for_following scope returns follows by following" do
    Follow.create!(follower: @user1, following: @user2)
    user3 = User.create!(email: "user3@example.com", username: "user3", password: "password123")
    Follow.create!(follower: @user1, following: user3)

    follows = Follow.for_following(@user2.id)
    assert_equal 1, follows.count
    assert_equal @user2.id, follows.first.following_id
  end

  test "recent scope orders by created_at desc" do
    follow1 = Follow.create!(follower: @user1, following: @user2)
    sleep 0.01 # Ensure different timestamps
    user3 = User.create!(email: "user3@example.com", username: "user3", password: "password123")
    follow2 = Follow.create!(follower: @user1, following: user3)

    recent_follows = Follow.recent
    assert_equal follow2.id, recent_follows.first.id
    assert_equal follow1.id, recent_follows.last.id
  end
end
