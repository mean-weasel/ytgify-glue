require "test_helper"

module Api
  module V1
    class LikesControllerTest < ActionDispatch::IntegrationTest
      fixtures :users, :gifs

      setup do
        @alice = users(:one)
        @bob = users(:two)
        @gif = gifs(:alice_public_gif)

        # Clean up existing likes
        Like.where(user: @bob, gif: @gif).destroy_all
        Like.where(user: @alice, gif: @gif).destroy_all
      end

      # ========== AUTHENTICATION TESTS ==========

      test "should require JWT token for create" do
        post api_v1_gif_likes_path(@gif), as: :json
        assert_response :unauthorized

        json = JSON.parse(response.body)
        assert_equal "Unauthorized", json["error"]
      end

      test "should reject invalid JWT token for create" do
        post api_v1_gif_likes_path(@gif),
             headers: { "Authorization" => "Bearer invalid_token" },
             as: :json

        assert_response :unauthorized
      end

      test "should reject expired JWT token for create" do
        expired_token = generate_expired_jwt_token(@bob)

        post api_v1_gif_likes_path(@gif),
             headers: { "Authorization" => "Bearer #{expired_token}" },
             as: :json

        assert_response :unauthorized
      end

      # ========== TOGGLE LIKE SUCCESS TESTS ==========

      test "should create like when not exists" do
        assert_difference('Like.count', 1) do
          post api_v1_gif_likes_path(@gif),
               headers: auth_headers(@bob),
               as: :json
        end

        assert_response :created
        json = JSON.parse(response.body)
        assert_equal "Like added", json["message"]
        assert json["liked"]
        assert_kind_of Integer, json["like_count"]
      end

      test "should remove like when exists" do
        Like.create!(user: @bob, gif: @gif)

        assert_difference('Like.count', -1) do
          post api_v1_gif_likes_path(@gif),
               headers: auth_headers(@bob),
               as: :json
        end

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal "Like removed", json["message"]
        assert_not json["liked"]
      end

      test "should increment like_count on create" do
        initial_count = @gif.reload.like_count || 0

        post api_v1_gif_likes_path(@gif),
             headers: auth_headers(@bob),
             as: :json

        assert_response :created
        json = JSON.parse(response.body)
        assert_equal initial_count + 1, json["like_count"]
        assert_equal initial_count + 1, @gif.reload.like_count
      end

      test "should decrement like_count on destroy" do
        Like.create!(user: @bob, gif: @gif)
        @gif.reload
        initial_count = @gif.like_count

        post api_v1_gif_likes_path(@gif),
             headers: auth_headers(@bob),
             as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal initial_count - 1, json["like_count"]
      end

      # ========== ERROR HANDLING TESTS ==========

      test "should return 404 for non-existent GIF" do
        post api_v1_gif_likes_path(gif_id: "00000000-0000-0000-0000-000000000000"),
             headers: auth_headers(@bob),
             as: :json

        assert_response :not_found
        json = JSON.parse(response.body)
        assert_equal "Record not found", json["error"]
      end

      test "should return 404 for invalid UUID format" do
        post api_v1_gif_likes_path(gif_id: "invalid-id"),
             headers: auth_headers(@bob),
             as: :json

        assert_response :not_found
      end

      # ========== JSON RESPONSE FORMAT TESTS ==========

      test "create response includes all required fields" do
        post api_v1_gif_likes_path(@gif),
             headers: auth_headers(@bob),
             as: :json

        assert_response :created
        json = JSON.parse(response.body)

        assert_includes json, "message"
        assert_includes json, "liked"
        assert_includes json, "like_count"
        assert_equal true, json["liked"]
        assert_kind_of Integer, json["like_count"]
      end

      test "destroy response includes all required fields" do
        Like.create!(user: @bob, gif: @gif)

        post api_v1_gif_likes_path(@gif),
             headers: auth_headers(@bob),
             as: :json

        assert_response :ok
        json = JSON.parse(response.body)

        assert_includes json, "message"
        assert_includes json, "liked"
        assert_includes json, "like_count"
        assert_equal false, json["liked"]
      end

      test "like_count accuracy verification" do
        # Create multiple likes
        user3 = User.create!(
          email: "user3@example.com",
          username: "user3",
          password: "password123"
        )

        Like.create!(user: @alice, gif: @gif)
        Like.create!(user: user3, gif: @gif)
        @gif.reload
        expected_count = @gif.like_count

        post api_v1_gif_likes_path(@gif),
             headers: auth_headers(@bob),
             as: :json

        json = JSON.parse(response.body)
        assert_equal expected_count + 1, json["like_count"]
      end

      # ========== EDGE CASES ==========

      test "can like own GIF" do
        post api_v1_gif_likes_path(@gif),
             headers: auth_headers(@alice),
             as: :json

        assert_response :created
        json = JSON.parse(response.body)
        assert json["liked"]
      end

      test "can like private GIF" do
        private_gif = Gif.create!(
          user: @alice,
          title: "Private GIF",
          privacy: :private_access
        )

        post api_v1_gif_likes_path(private_gif),
             headers: auth_headers(@bob),
             as: :json

        assert_response :created
        json = JSON.parse(response.body)
        assert json["liked"]
      end

      test "multiple users can like same GIF" do
        # Bob likes
        post api_v1_gif_likes_path(@gif),
             headers: auth_headers(@bob),
             as: :json
        assert_response :created

        # Alice likes
        post api_v1_gif_likes_path(@gif),
             headers: auth_headers(@alice),
             as: :json
        assert_response :created

        # Both likes should exist
        assert Like.exists?(user: @bob, gif: @gif)
        assert Like.exists?(user: @alice, gif: @gif)
      end

      test "toggling like twice returns to original state" do
        initial_count = @gif.reload.like_count || 0

        # First toggle - like
        post api_v1_gif_likes_path(@gif),
             headers: auth_headers(@bob),
             as: :json
        assert_response :created

        # Second toggle - unlike
        post api_v1_gif_likes_path(@gif),
             headers: auth_headers(@bob),
             as: :json
        assert_response :ok

        # Count should be back to original
        assert_equal initial_count, @gif.reload.like_count
        assert_not Like.exists?(user: @bob, gif: @gif)
      end

      # ========== BASE CONTROLLER ERROR HANDLING TESTS ==========

      test "should handle missing Authorization header" do
        post api_v1_gif_likes_path(@gif), as: :json

        assert_response :unauthorized
        json = JSON.parse(response.body)
        assert_equal "Unauthorized", json["error"]
        assert_equal "You must be logged in to access this resource", json["message"]
      end

      test "should handle malformed Authorization header" do
        post api_v1_gif_likes_path(@gif),
             headers: { "Authorization" => "NotBearer token123" },
             as: :json

        assert_response :unauthorized
      end

      test "should handle JWT DecodeError gracefully" do
        post api_v1_gif_likes_path(@gif),
             headers: { "Authorization" => "Bearer malformed.jwt.token" },
             as: :json

        assert_response :unauthorized
      end

      private

      def auth_headers(user)
        token = generate_jwt_token(user)
        { "Authorization" => "Bearer #{token}" }
      end

      def generate_jwt_token(user)
        # Ensure user has jti (fixtures might not have it)
        user.update_column(:jti, SecureRandom.uuid) if user.jti.nil?

        payload = {
          sub: user.id,
          jti: user.jti,
          exp: 15.minutes.from_now.to_i
        }
        JWT.encode(payload, ENV.fetch('JWT_SECRET_KEY', 'changeme-in-production'))
      end

      def generate_expired_jwt_token(user)
        # Ensure user has jti (fixtures might not have it)
        user.update_column(:jti, SecureRandom.uuid) if user.jti.nil?

        payload = {
          sub: user.id,
          jti: user.jti,
          exp: 1.hour.ago.to_i  # Expired
        }
        JWT.encode(payload, ENV.fetch('JWT_SECRET_KEY', 'changeme-in-production'))
      end
    end
  end
end
