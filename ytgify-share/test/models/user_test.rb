require "test_helper"

class UserTest < ActiveSupport::TestCase
  test "should create valid user with required fields" do
    user = User.new(
      email: "test@example.com",
      username: "testuser",
      password: "password123",
      password_confirmation: "password123"
    )
    assert user.save, "User should be valid with required fields"
  end

  test "should not create user without email" do
    user = User.new(username: "testuser", password: "password123")
    assert_not user.save, "User should not be valid without email"
  end

  test "should not create user without username" do
    user = User.new(email: "test@example.com", password: "password123")
    assert_not user.save, "User should not be valid without username"
  end

  test "should not create user with duplicate email" do
    user1 = User.create!(
      email: "existing@example.com",
      username: "existing",
      password: "password123"
    )
    user2 = User.new(
      email: user1.email,
      username: "different",
      password: "password123"
    )
    assert_not user2.save, "User should not be valid with duplicate email"
  end

  test "should not create user with duplicate username" do
    user1 = User.create!(
      email: "existing@example.com",
      username: "existing",
      password: "password123"
    )
    user2 = User.new(
      email: "different@example.com",
      username: user1.username,
      password: "password123"
    )
    assert_not user2.save, "User should not be valid with duplicate username"
  end

  test "should generate jti on create" do
    user = User.create!(
      email: "test@example.com",
      username: "testuser",
      password: "password123"
    )
    assert_not_nil user.jti, "JTI should be generated on create"
  end

  test "should set default preferences" do
    user = User.create!(
      email: "test@example.com",
      username: "testuser",
      password: "password123"
    )
    assert_equal 'public', user.default_privacy
    assert_equal [], user.recently_used_tags
  end

  test "should add recent tags" do
    user = User.create!(
      email: "test@example.com",
      username: "testuser",
      password: "password123"
    )
    user.add_recent_tag('funny')
    user.add_recent_tag('epic')

    assert_includes user.recently_used_tags, 'funny'
    assert_includes user.recently_used_tags, 'epic'
  end

  # ========================================
  # COMPREHENSIVE VALIDATION TESTS
  # ========================================

  # Email validations
  test "should require email" do
    user = User.new(username: "testuser", password: "password123")
    assert_not user.valid?
    assert_includes user.errors[:email], "can't be blank"
  end

  test "should reject duplicate email case insensitively" do
    User.create!(email: "Test@Example.Com", username: "user1", password: "password123")
    user2 = User.new(email: "test@example.com", username: "user2", password: "password123")
    assert_not user2.valid?
    assert_includes user2.errors[:email], "has already been taken"
  end

  test "should reject invalid email format" do
    user = User.new(username: "testuser", password: "password123", email: "notanemail")
    assert_not user.valid?
    assert_includes user.errors[:email], "is invalid"
  end

  # Username validations
  test "should reject username with special characters" do
    user = User.new(
      email: "test@example.com",
      username: "test@user!",
      password: "password123"
    )
    assert_not user.valid?
    assert_includes user.errors[:username], "only allows letters, numbers, and underscores"
  end

  test "should reject username with spaces" do
    user = User.new(
      email: "test@example.com",
      username: "test user",
      password: "password123"
    )
    assert_not user.valid?
    assert_includes user.errors[:username], "only allows letters, numbers, and underscores"
  end

  test "should reject username shorter than minimum" do
    user = User.new(
      email: "test@example.com",
      username: "ab",
      password: "password123"
    )
    assert_not user.valid?
    assert_includes user.errors[:username], "is too short (minimum is 3 characters)"
  end

  test "should reject username longer than maximum" do
    user = User.new(
      email: "test@example.com",
      username: "a" * 31,
      password: "password123"
    )
    assert_not user.valid?
    assert_includes user.errors[:username], "is too long (maximum is 30 characters)"
  end

  test "should accept username at minimum length" do
    user = User.new(
      email: "test@example.com",
      username: "abc",
      password: "password123"
    )
    assert user.valid?
  end

  test "should accept username at maximum length" do
    user = User.new(
      email: "test@example.com",
      username: "a" * 30,
      password: "password123"
    )
    assert user.valid?
  end

  test "should accept username with underscores" do
    user = User.new(
      email: "test@example.com",
      username: "test_user_123",
      password: "password123"
    )
    assert user.valid?
  end

  test "should reject duplicate username case insensitively" do
    User.create!(email: "user1@example.com", username: "TestUser", password: "password123")
    user2 = User.new(email: "user2@example.com", username: "testuser", password: "password123")
    assert_not user2.valid?
    assert_includes user2.errors[:username], "has already been taken"
  end

  # Display name validations
  test "should accept blank display name" do
    user = User.new(
      email: "test@example.com",
      username: "testuser",
      password: "password123",
      display_name: ""
    )
    assert user.valid?
  end

  test "should reject display name longer than 50 characters" do
    user = User.new(
      email: "test@example.com",
      username: "testuser",
      password: "password123",
      display_name: "a" * 51
    )
    assert_not user.valid?
    assert_includes user.errors[:display_name], "is too long (maximum is 50 characters)"
  end

  test "should accept display name at maximum length" do
    user = User.new(
      email: "test@example.com",
      username: "testuser",
      password: "password123",
      display_name: "a" * 50
    )
    assert user.valid?
  end

  # Bio validations
  test "should accept blank bio" do
    user = User.new(
      email: "test@example.com",
      username: "testuser",
      password: "password123",
      bio: ""
    )
    assert user.valid?
  end

  test "should reject bio longer than 500 characters" do
    user = User.new(
      email: "test@example.com",
      username: "testuser",
      password: "password123",
      bio: "a" * 501
    )
    assert_not user.valid?
    assert_includes user.errors[:bio], "is too long (maximum is 500 characters)"
  end

  test "should accept bio at maximum length" do
    user = User.new(
      email: "test@example.com",
      username: "testuser",
      password: "password123",
      bio: "a" * 500
    )
    assert user.valid?
  end

  # Password validations (Devise)
  test "should require password on create" do
    user = User.new(email: "test@example.com", username: "testuser")
    assert_not user.valid?
    assert_includes user.errors[:password], "can't be blank"
  end

  test "should require minimum password length" do
    user = User.new(
      email: "test@example.com",
      username: "testuser",
      password: "short"
    )
    assert_not user.valid?
    assert_includes user.errors[:password], "is too short (minimum is 6 characters)"
  end

  test "should accept password at minimum length" do
    user = User.new(
      email: "test@example.com",
      username: "testuser",
      password: "abcdef"
    )
    assert user.valid?
  end

  # ========================================
  # CALLBACK TESTS
  # ========================================

  test "should set display_name from username if not provided" do
    user = User.create!(
      email: "test@example.com",
      username: "cooluser",
      password: "password123"
    )
    assert_equal "cooluser", user.display_name
  end

  test "should not override display_name if provided" do
    user = User.create!(
      email: "test@example.com",
      username: "cooluser",
      display_name: "Cool Person",
      password: "password123"
    )
    assert_equal "Cool Person", user.display_name
  end

  test "should initialize default preferences" do
    user = User.create!(
      email: "test@example.com",
      username: "testuser",
      password: "password123"
    )
    assert_not_nil user.preferences
    assert_equal 'public', user.preferences['default_privacy']
    assert_equal 'show_options', user.preferences['default_upload_behavior']
    assert_equal [], user.preferences['recently_used_tags']
  end

  # ========================================
  # ASSOCIATION TESTS
  # ========================================

  test "following? returns false for nil user" do
    user = User.create!(email: "test@example.com", username: "testuser", password: "password123")
    assert_not user.following?(nil)
  end

  test "following? returns true when following user" do
    user1 = User.create!(email: "user1@example.com", username: "user1", password: "password123")
    user2 = User.create!(email: "user2@example.com", username: "user2", password: "password123")

    Follow.create!(follower: user1, following: user2)

    assert user1.following?(user2)
    assert_not user2.following?(user1)
  end

  test "liked? returns false for nil gif" do
    user = User.create!(email: "test@example.com", username: "testuser", password: "password123")
    assert_not user.liked?(nil)
  end

  test "liked? returns true when user has liked gif" do
    user1 = User.create!(email: "user1@example.com", username: "user1", password: "password123")
    user2 = User.create!(email: "user2@example.com", username: "user2", password: "password123")

    gif = Gif.create!(
      user: user2,
      title: "Test GIF",
      privacy: "public_access"
    )

    Like.create!(user: user1, gif: gif)

    assert user1.liked?(gif)
    assert_not user2.liked?(gif)
  end

  # ========================================
  # PREFERENCE METHODS TESTS
  # ========================================

  test "default_privacy getter returns default value" do
    user = User.create!(email: "test@example.com", username: "testuser", password: "password123")
    assert_equal 'public', user.default_privacy
  end

  test "default_privacy setter updates preferences" do
    user = User.create!(email: "test@example.com", username: "testuser", password: "password123")
    user.default_privacy = 'private'
    assert_equal 'private', user.default_privacy
  end

  test "add_recent_tag adds tag to beginning of list" do
    user = User.create!(email: "test@example.com", username: "testuser", password: "password123")
    user.add_recent_tag('tag1')
    user.add_recent_tag('tag2')

    assert_equal ['tag2', 'tag1'], user.reload.recently_used_tags
  end

  test "add_recent_tag keeps only unique tags" do
    user = User.create!(email: "test@example.com", username: "testuser", password: "password123")
    user.add_recent_tag('tag1')
    user.add_recent_tag('tag2')
    user.add_recent_tag('tag1')

    tags = user.reload.recently_used_tags
    assert_equal ['tag1', 'tag2'], tags
  end

  test "add_recent_tag keeps only last 10 tags" do
    user = User.create!(email: "test@example.com", username: "testuser", password: "password123")

    15.times do |i|
      user.add_recent_tag("tag#{i}")
    end

    tags = user.reload.recently_used_tags
    assert_equal 10, tags.length
    assert_includes tags, 'tag14'
    assert_not_includes tags, 'tag0'
  end

  # ========================================
  # SCOPE TESTS
  # ========================================

  test "verified scope returns only verified users" do
    verified = User.create!(
      email: "verified@example.com",
      username: "verified",
      password: "password123",
      is_verified: true
    )
    unverified = User.create!(
      email: "unverified@example.com",
      username: "unverified",
      password: "password123",
      is_verified: false
    )

    result = User.verified
    assert_includes result, verified
    assert_not_includes result, unverified
  end

  test "recent scope orders by created_at desc" do
    user1 = User.create!(email: "user1@example.com", username: "user1", password: "password123")
    sleep 0.01
    user2 = User.create!(email: "user2@example.com", username: "user2", password: "password123")
    sleep 0.01
    user3 = User.create!(email: "user3@example.com", username: "user3", password: "password123")

    recent_users = User.recent.limit(3)
    assert_equal user3.id, recent_users[0].id
    assert_equal user2.id, recent_users[1].id
    assert_equal user1.id, recent_users[2].id
  end

  test "followed_by scope returns users followed by given user" do
    user1 = User.create!(email: "user1@example.com", username: "user1", password: "password123")
    user2 = User.create!(email: "user2@example.com", username: "user2", password: "password123")
    user3 = User.create!(email: "user3@example.com", username: "user3", password: "password123")

    Follow.create!(follower: user1, following: user2)
    Follow.create!(follower: user1, following: user3)

    followed = User.followed_by(user1)
    assert_includes followed, user2
    assert_includes followed, user3
    assert_not_includes followed, user1
  end
end
