require "test_helper"

module Api
  module V1
    class FollowsControllerTest < ActionDispatch::IntegrationTest
      fixtures :users, :follows

      setup do
        @alice = users(:one)
        @bob = users(:two)

        # Ensure users have jti
        @alice.update_column(:jti, SecureRandom.uuid) if @alice.jti.nil?
        @bob.update_column(:jti, SecureRandom.uuid) if @bob.jti.nil?

        # Clean up existing follows
        Follow.where(follower: @alice, following: @bob).destroy_all
        Follow.where(follower: @bob, following: @alice).destroy_all
      end

      # ========== AUTHENTICATION TESTS ==========

      test "create should require JWT token" do
        post api_v1_user_follow_path(user_id: @bob.id), as: :json
        assert_response :unauthorized

        json = JSON.parse(response.body)
        assert_equal "Unauthorized", json["error"]
      end

      test "create should reject invalid JWT token" do
        post api_v1_user_follow_path(user_id: @bob.id),
             headers: { "Authorization" => "Bearer invalid_token" },
             as: :json

        assert_response :unauthorized
      end

      test "create should reject expired JWT token" do
        expired_token = generate_expired_jwt_token(@alice)

        post api_v1_user_follow_path(user_id: @bob.id),
             headers: { "Authorization" => "Bearer #{expired_token}" },
             as: :json

        assert_response :unauthorized
      end

      # ========== TOGGLE FOLLOW SUCCESS TESTS ==========

      test "should create follow when not following" do
        assert_difference("Follow.count", 1) do
          post api_v1_user_follow_path(user_id: @bob.id),
               headers: auth_headers(@alice),
               as: :json
        end

        assert_response :ok
        json = JSON.parse(response.body)
        assert json["following"]
        assert_kind_of Integer, json["follower_count"]
        assert_kind_of Integer, json["following_count"]
      end

      test "should destroy follow when already following" do
        Follow.create!(follower: @alice, following: @bob)

        assert_difference("Follow.count", -1) do
          post api_v1_user_follow_path(user_id: @bob.id),
               headers: auth_headers(@alice),
               as: :json
        end

        assert_response :ok
        json = JSON.parse(response.body)
        assert_not json["following"]
      end

      test "DELETE should also toggle follow" do
        assert_difference("Follow.count", 1) do
          delete api_v1_user_follow_path(user_id: @bob.id) + ".json",
                 headers: auth_headers(@alice)
        end

        assert_response :ok
        json = JSON.parse(response.body)
        assert json["following"]
      end

      test "should increment follower_count on follow" do
        initial_count = @bob.reload.follower_count || 0

        post api_v1_user_follow_path(user_id: @bob.id),
             headers: auth_headers(@alice),
             as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal initial_count + 1, json["follower_count"]
        assert_equal initial_count + 1, @bob.reload.follower_count
      end

      test "should decrement follower_count on unfollow" do
        Follow.create!(follower: @alice, following: @bob)
        @bob.reload
        initial_count = @bob.follower_count

        post api_v1_user_follow_path(user_id: @bob.id),
             headers: auth_headers(@alice),
             as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal initial_count - 1, json["follower_count"]
      end

      # ========== SELF-FOLLOW PREVENTION ==========

      test "should prevent user from following themselves" do
        assert_no_difference("Follow.count") do
          post api_v1_user_follow_path(user_id: @alice.id),
               headers: auth_headers(@alice),
               as: :json
        end

        assert_response :unprocessable_entity
        json = JSON.parse(response.body)
        assert_equal "Cannot follow yourself", json["error"]
      end

      # ========== ERROR HANDLING TESTS ==========

      test "should return 404 for non-existent user" do
        post api_v1_user_follow_path(user_id: "00000000-0000-0000-0000-000000000000"),
             headers: auth_headers(@alice),
             as: :json

        assert_response :not_found
        json = JSON.parse(response.body)
        assert_equal "Record not found", json["error"]
      end

      test "should return 404 for invalid UUID format" do
        post api_v1_user_follow_path(user_id: "invalid-id"),
             headers: auth_headers(@alice),
             as: :json

        assert_response :not_found
      end

      # ========== JSON RESPONSE FORMAT TESTS ==========

      test "follow response includes all required fields" do
        post api_v1_user_follow_path(user_id: @bob.id),
             headers: auth_headers(@alice),
             as: :json

        assert_response :ok
        json = JSON.parse(response.body)

        assert_includes json, "following"
        assert_includes json, "follower_count"
        assert_includes json, "following_count"
        assert_equal true, json["following"]
        assert_kind_of Integer, json["follower_count"]
        assert_kind_of Integer, json["following_count"]
      end

      test "unfollow response includes all required fields" do
        Follow.create!(follower: @alice, following: @bob)

        post api_v1_user_follow_path(user_id: @bob.id),
             headers: auth_headers(@alice),
             as: :json

        assert_response :ok
        json = JSON.parse(response.body)

        assert_includes json, "following"
        assert_includes json, "follower_count"
        assert_includes json, "following_count"
        assert_equal false, json["following"]
      end

      # ========== FOLLOWERS ENDPOINT TESTS ==========

      test "followers should return user's followers list" do
        # Create some followers
        Follow.create!(follower: @alice, following: @bob)
        user3 = User.create!(
          email: "user3@example.com",
          username: "user3",
          password: "password123"
        )
        Follow.create!(follower: user3, following: @bob)

        get api_v1_user_followers_path(user_id: @bob.id),
            headers: auth_headers(@alice),
            as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_includes json, "followers"
        assert_includes json, "pagination"
        assert_kind_of Array, json["followers"]
        assert_operator json["followers"].length, :>=, 2
      end

      test "followers response includes user fields" do
        Follow.create!(follower: @alice, following: @bob)

        get api_v1_user_followers_path(user_id: @bob.id),
            headers: auth_headers(@alice),
            as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        follower = json["followers"].first

        assert_includes follower, "id"
        assert_includes follower, "username"
        assert_includes follower, "display_name"
        assert_includes follower, "is_verified"
      end

      test "followers supports pagination" do
        # Create multiple followers
        5.times do |i|
          user = User.create!(
            email: "follower#{i}@example.com",
            username: "follower#{i}",
            password: "password123"
          )
          Follow.create!(follower: user, following: @bob)
        end

        get api_v1_user_followers_path(user_id: @bob.id, page: 1, per_page: 2),
            headers: auth_headers(@alice),
            as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal 2, json["followers"].length
        assert_equal 1, json["pagination"]["page"]
        assert_equal 2, json["pagination"]["per_page"]
        assert_operator json["pagination"]["total"], :>=, 5
      end

      test "followers pagination defaults to page 1 and per_page 20" do
        get api_v1_user_followers_path(user_id: @bob.id),
            headers: auth_headers(@alice),
            as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal 1, json["pagination"]["page"]
        assert_equal 20, json["pagination"]["per_page"]
      end

      test "followers pagination enforces min per_page of 1" do
        get api_v1_user_followers_path(user_id: @bob.id, per_page: 0),
            headers: auth_headers(@alice),
            as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal 1, json["pagination"]["per_page"]
      end

      test "followers pagination enforces max per_page of 100" do
        get api_v1_user_followers_path(user_id: @bob.id, per_page: 200),
            headers: auth_headers(@alice),
            as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal 100, json["pagination"]["per_page"]
      end

      # ========== FOLLOWING ENDPOINT TESTS ==========

      test "following should return users being followed" do
        # Alice follows some users
        Follow.create!(follower: @alice, following: @bob)
        user3 = User.create!(
          email: "user3@example.com",
          username: "user3",
          password: "password123"
        )
        Follow.create!(follower: @alice, following: user3)

        get api_v1_user_following_path(user_id: @alice.id),
            headers: auth_headers(@alice),
            as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_includes json, "following"
        assert_includes json, "pagination"
        assert_kind_of Array, json["following"]
        assert_equal 2, json["following"].length
      end

      test "following response includes user fields" do
        Follow.create!(follower: @alice, following: @bob)

        get api_v1_user_following_path(user_id: @alice.id),
            headers: auth_headers(@alice),
            as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        following = json["following"].first

        assert_includes following, "id"
        assert_includes following, "username"
        assert_includes following, "display_name"
        assert_includes following, "is_verified"
      end

      test "following supports pagination" do
        # Alice follows multiple users
        5.times do |i|
          user = User.create!(
            email: "following#{i}@example.com",
            username: "following#{i}",
            password: "password123"
          )
          Follow.create!(follower: @alice, following: user)
        end

        get api_v1_user_following_path(user_id: @alice.id, page: 1, per_page: 2),
            headers: auth_headers(@alice),
            as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal 2, json["following"].length
        assert_equal 1, json["pagination"]["page"]
        assert_equal 2, json["pagination"]["per_page"]
        assert_operator json["pagination"]["total"], :>=, 5
      end

      test "following pagination defaults to page 1 and per_page 20" do
        get api_v1_user_following_path(user_id: @alice.id),
            headers: auth_headers(@alice),
            as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal 1, json["pagination"]["page"]
        assert_equal 20, json["pagination"]["per_page"]
      end

      # ========== EDGE CASES ==========

      test "multiple users can follow same user" do
        # Alice follows Bob
        post api_v1_user_follow_path(user_id: @bob.id),
             headers: auth_headers(@alice),
             as: :json
        assert_response :ok

        # Create another user who follows Bob
        user3 = User.create!(
          email: "user3@example.com",
          username: "user3",
          password: "password123",
          jti: SecureRandom.uuid
        )
        post api_v1_user_follow_path(user_id: @bob.id),
             headers: auth_headers(user3),
             as: :json
        assert_response :ok

        # Both follows should exist
        assert Follow.exists?(follower: @alice, following: @bob)
        assert Follow.exists?(follower: user3, following: @bob)
      end

      test "user can follow multiple users" do
        user3 = User.create!(
          email: "user3@example.com",
          username: "user3",
          password: "password123"
        )

        initial_count = Follow.where(follower: @alice).count

        post api_v1_user_follow_path(user_id: @bob.id),
             headers: auth_headers(@alice),
             as: :json
        post api_v1_user_follow_path(user_id: user3.id),
             headers: auth_headers(@alice),
             as: :json

        assert_equal initial_count + 2, Follow.where(follower: @alice).count
      end

      test "toggling follow twice returns to original state" do
        initial_count = @bob.reload.follower_count || 0

        # First toggle - follow
        post api_v1_user_follow_path(user_id: @bob.id),
             headers: auth_headers(@alice),
             as: :json
        assert_response :ok

        # Second toggle - unfollow
        post api_v1_user_follow_path(user_id: @bob.id),
             headers: auth_headers(@alice),
             as: :json
        assert_response :ok

        # Count should be back to original
        assert_equal initial_count, @bob.reload.follower_count
        assert_not Follow.exists?(follower: @alice, following: @bob)
      end

      test "followers endpoint works without authentication" do
        Follow.create!(follower: @alice, following: @bob)

        get api_v1_user_followers_path(user_id: @bob.id), as: :json

        assert_response :unauthorized
      end

      test "following endpoint works without authentication" do
        Follow.create!(follower: @alice, following: @bob)

        get api_v1_user_following_path(user_id: @alice.id), as: :json

        assert_response :unauthorized
      end

      private

      def auth_headers(user)
        token = generate_jwt_token(user)
        { "Authorization" => "Bearer #{token}" }
      end

      def generate_jwt_token(user)
        # Ensure user has jti
        user.update_column(:jti, SecureRandom.uuid) if user.jti.nil?

        payload = {
          sub: user.id,
          jti: user.jti,
          exp: 15.minutes.from_now.to_i
        }
        JWT.encode(payload, ENV.fetch("JWT_SECRET_KEY", "changeme-in-production"))
      end

      def generate_expired_jwt_token(user)
        # Ensure user has jti
        user.update_column(:jti, SecureRandom.uuid) if user.jti.nil?

        payload = {
          sub: user.id,
          jti: user.jti,
          exp: 1.hour.ago.to_i  # Expired
        }
        JWT.encode(payload, ENV.fetch("JWT_SECRET_KEY", "changeme-in-production"))
      end
    end
  end
end
