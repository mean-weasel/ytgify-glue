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
    assert_equal "public", user.default_privacy
    assert_equal [], user.recently_used_tags
  end

  test "should add recent tags" do
    user = User.create!(
      email: "test@example.com",
      username: "testuser",
      password: "password123"
    )
    user.add_recent_tag("funny")
    user.add_recent_tag("epic")

    assert_includes user.recently_used_tags, "funny"
    assert_includes user.recently_used_tags, "epic"
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
    assert_equal "public", user.preferences["default_privacy"]
    assert_equal "show_options", user.preferences["default_upload_behavior"]
    assert_equal [], user.preferences["recently_used_tags"]
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
    assert_equal "public", user.default_privacy
  end

  test "default_privacy setter updates preferences" do
    user = User.create!(email: "test@example.com", username: "testuser", password: "password123")
    user.default_privacy = "private"
    assert_equal "private", user.default_privacy
  end

  test "add_recent_tag adds tag to beginning of list" do
    user = User.create!(email: "test@example.com", username: "testuser", password: "password123")
    user.add_recent_tag("tag1")
    user.add_recent_tag("tag2")

    assert_equal [ "tag2", "tag1" ], user.reload.recently_used_tags
  end

  test "add_recent_tag keeps only unique tags" do
    user = User.create!(email: "test@example.com", username: "testuser", password: "password123")
    user.add_recent_tag("tag1")
    user.add_recent_tag("tag2")
    user.add_recent_tag("tag1")

    tags = user.reload.recently_used_tags
    assert_equal [ "tag1", "tag2" ], tags
  end

  test "add_recent_tag keeps only last 10 tags" do
    user = User.create!(email: "test@example.com", username: "testuser", password: "password123")

    15.times do |i|
      user.add_recent_tag("tag#{i}")
    end

    tags = user.reload.recently_used_tags
    assert_equal 10, tags.length
    assert_includes tags, "tag14"
    assert_not_includes tags, "tag0"
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

  # ========================================
  # GOOGLE OAUTH TESTS
  # ========================================

  test "find_or_create_from_google creates new user" do
    assert_difference("User.count", 1) do
      user = User.find_or_create_from_google(
        uid: "google_uid_123",
        email: "googleuser@gmail.com",
        name: "Google User"
      )

      assert_equal "google_oauth2", user.provider
      assert_equal "google_uid_123", user.uid
      assert_equal "googleuser@gmail.com", user.email
      assert_equal "Google User", user.display_name
      assert user.username.start_with?("googleuser")
    end
  end

  test "find_or_create_from_google finds existing user by provider/uid" do
    existing = User.create!(
      provider: "google_oauth2",
      uid: "google_uid_456",
      email: "existing@gmail.com",
      username: "existinguser",
      password: Devise.friendly_token[0, 20]
    )

    assert_no_difference("User.count") do
      user = User.find_or_create_from_google(
        uid: "google_uid_456",
        email: "different@gmail.com",  # Email doesn't matter when uid matches
        name: "Different Name"
      )

      assert_equal existing.id, user.id
    end
  end

  test "find_or_create_from_google links existing email account to Google" do
    existing = User.create!(
      email: "linkme@gmail.com",
      username: "linkmeuser",
      password: "password123"
    )

    assert_nil existing.provider
    assert_nil existing.uid

    assert_no_difference("User.count") do
      user = User.find_or_create_from_google(
        uid: "google_uid_789",
        email: "linkme@gmail.com",
        name: "Link Me User"
      )

      assert_equal existing.id, user.id
      assert_equal "google_oauth2", user.reload.provider
      assert_equal "google_uid_789", user.uid
    end
  end

  test "find_or_create_from_google generates unique username on collision" do
    User.create!(
      email: "taken@example.com",
      username: "collision",
      password: "password123"
    )

    user = User.find_or_create_from_google(
      uid: "google_uid_collision",
      email: "collision@gmail.com",
      name: "Collision User"
    )

    assert_not_equal "collision", user.username
    assert user.username.start_with?("collision")
  end

  test "from_omniauth creates new user from Google auth hash" do
    auth = OmniAuth::AuthHash.new(
      provider: "google_oauth2",
      uid: "omni_uid_123",
      info: {
        email: "omniuser@gmail.com",
        name: "Omni User"
      }
    )

    assert_difference("User.count", 1) do
      user = User.from_omniauth(auth)

      assert_equal "google_oauth2", user.provider
      assert_equal "omni_uid_123", user.uid
      assert_equal "omniuser@gmail.com", user.email
      assert_equal "Omni User", user.display_name
    end
  end

  test "from_omniauth finds existing user by provider/uid" do
    existing = User.create!(
      provider: "google_oauth2",
      uid: "omni_uid_456",
      email: "omniexisting@gmail.com",
      username: "omniexisting",
      password: Devise.friendly_token[0, 20]
    )

    auth = OmniAuth::AuthHash.new(
      provider: "google_oauth2",
      uid: "omni_uid_456",
      info: {
        email: "different@gmail.com",
        name: "Different"
      }
    )

    assert_no_difference("User.count") do
      user = User.from_omniauth(auth)
      assert_equal existing.id, user.id
    end
  end

  test "from_omniauth links existing email account" do
    existing = User.create!(
      email: "omnilinkme@gmail.com",
      username: "omnilinkme",
      password: "password123"
    )

    auth = OmniAuth::AuthHash.new(
      provider: "google_oauth2",
      uid: "omni_uid_link",
      info: {
        email: "omnilinkme@gmail.com",
        name: "Omni Link Me"
      }
    )

    assert_no_difference("User.count") do
      user = User.from_omniauth(auth)
      assert_equal existing.id, user.id
      assert_equal "google_oauth2", user.reload.provider
      assert_equal "omni_uid_link", user.uid
    end
  end

  # ========================================
  # ACCOUNT LINKING EDGE CASES
  # ========================================

  test "user can still authenticate with password after Google linking" do
    # Create user with email/password
    user = User.create!(
      email: "linktest@gmail.com",
      username: "linktestuser",
      password: "password123"
    )

    # Password should work before linking
    assert user.valid_password?("password123")

    # Link to Google
    User.find_or_create_from_google(
      uid: "google_link_test_uid",
      email: "linktest@gmail.com",
      name: "Link Test User"
    )

    # Password should STILL work after linking
    user.reload
    assert user.valid_password?("password123")
    assert_equal "google_oauth2", user.provider
    assert_equal "google_link_test_uid", user.uid
  end

  test "linking replaces existing Google credentials with new ones" do
    # User already linked to one Google account
    user = User.create!(
      email: "multilink@gmail.com",
      username: "multilinkuser",
      password: "password123",
      provider: "google_oauth2",
      uid: "old_google_uid_123"
    )

    # Same email tries to link with different Google account
    # This should update the provider/uid to the new values
    auth = OmniAuth::AuthHash.new(
      provider: "google_oauth2",
      uid: "new_google_uid_456",
      info: {
        email: "multilink@gmail.com",
        name: "Multi Link User"
      }
    )

    # The from_omniauth method first checks provider/uid (won't match)
    # Then checks email (will match) and updates provider/uid
    result = User.from_omniauth(auth)

    assert_equal user.id, result.id
    assert_equal "google_oauth2", result.provider
    assert_equal "new_google_uid_456", result.uid
  end

  test "same user authenticating with same Google account returns same user" do
    # User with Google linked
    user = User.create!(
      email: "sameuser@gmail.com",
      username: "sameuser",
      password: "password123",
      provider: "google_oauth2",
      uid: "same_google_uid"
    )

    # Authenticate again with same Google account
    auth = OmniAuth::AuthHash.new(
      provider: "google_oauth2",
      uid: "same_google_uid",
      info: {
        email: "sameuser@gmail.com",
        name: "Same User"
      }
    )

    assert_no_difference("User.count") do
      result = User.from_omniauth(auth)
      assert_equal user.id, result.id
    end
  end

  test "find_or_create_from_google preserves existing user data on linking" do
    # User with custom settings
    user = User.create!(
      email: "preservedata@gmail.com",
      username: "customuser",
      password: "password123",
      display_name: "Custom Display Name",
      bio: "My custom bio",
      is_verified: true
    )

    # Link to Google
    result = User.find_or_create_from_google(
      uid: "preserve_uid",
      email: "preservedata@gmail.com",
      name: "Google Name"  # Different from display_name
    )

    assert_equal user.id, result.id
    # Original data should be preserved, not overwritten
    assert_equal "Custom Display Name", result.display_name  # NOT "Google Name"
    assert_equal "My custom bio", result.bio
    assert_equal true, result.is_verified
    # Only provider/uid should be updated
    assert_equal "google_oauth2", result.provider
    assert_equal "preserve_uid", result.uid
  end

  test "generate_username_from_email handles special characters" do
    auth = OmniAuth::AuthHash.new(
      provider: "google_oauth2",
      uid: "special_uid",
      info: {
        email: "user+test.special@gmail.com",
        name: "Special User"
      }
    )

    user = User.from_omniauth(auth)

    # Username should only contain letters, numbers, underscores
    assert_match(/\A[a-zA-Z0-9_]+\z/, user.username)
    # Should be based on email prefix with special chars converted
    assert user.username.start_with?("user_test_special") || user.username.start_with?("user")
  end

  test "generate_username_from_email handles very long email prefix" do
    auth = OmniAuth::AuthHash.new(
      provider: "google_oauth2",
      uid: "long_uid",
      info: {
        email: "verylongemailaddressprefixthatexceedstwentyfivecharacters@gmail.com",
        name: "Long Email User"
      }
    )

    user = User.from_omniauth(auth)

    # Username should be truncated to max 30 characters
    assert user.username.length <= 30
    assert user.valid?
  end

  test "find_or_create_from_google with same uid but different email finds by uid" do
    # Create user with Google linked
    user = User.create!(
      email: "original@gmail.com",
      username: "originaluser",
      password: Devise.friendly_token[0, 20],
      provider: "google_oauth2",
      uid: "persistent_uid"
    )

    # Try to find with same uid but different email
    # (User might have changed their Google email)
    result = User.find_or_create_from_google(
      uid: "persistent_uid",
      email: "changed@gmail.com",
      name: "Changed Email User"
    )

    # Should find by uid, not create new user
    assert_equal user.id, result.id
    # Email should NOT be updated (just finding by uid)
    assert_equal "original@gmail.com", result.email
  end

  test "JTI is regenerated when needed for token invalidation" do
    user = User.create!(
      email: "jtitest@example.com",
      username: "jtiuser",
      password: "password123"
    )

    original_jti = user.jti
    assert_not_nil original_jti

    # Simulate token invalidation by updating JTI
    user.update!(jti: SecureRandom.uuid)

    assert_not_equal original_jti, user.reload.jti
  end
end
