require "test_helper"

module Api
  module V1
    class FeedControllerTest < ActionDispatch::IntegrationTest
      fixtures :users, :gifs

      setup do
        @alice = users(:one)
        @bob = users(:two)

        # Ensure users have jti
        @alice.update_column(:jti, SecureRandom.uuid) if @alice.jti.nil?
        @bob.update_column(:jti, SecureRandom.uuid) if @bob.jti.nil?

        # Create some test GIFs
        @public_gif = gifs(:alice_public_gif)
      end

      # ========== INDEX (PERSONALIZED FEED) TESTS ==========

      test "index should require authentication" do
        get api_v1_feed_path, as: :json
        assert_response :unauthorized
      end

      test "index should return personalized feed when authenticated" do
        get api_v1_feed_path,
            headers: auth_headers(@alice),
            as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_includes json, "gifs"
        assert_includes json, "pagination"
        assert_kind_of Array, json["gifs"]
      end

      test "index response includes pagination metadata" do
        get api_v1_feed_path,
            headers: auth_headers(@alice),
            as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        pagination = json["pagination"]

        assert_includes pagination, "page"
        assert_includes pagination, "per_page"
        assert_includes pagination, "total"
      end

      test "index supports pagination parameters" do
        get api_v1_feed_path(page: 1, per_page: 5),
            headers: auth_headers(@alice),
            as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal 1, json["pagination"]["page"]
        assert_equal 5, json["pagination"]["per_page"]
      end

      # ========== PUBLIC FEED TESTS ==========

      test "public feed should not require authentication" do
        get api_v1_feed_public_path, as: :json
        assert_response :ok
      end

      test "public feed should return public GIFs" do
        get api_v1_feed_public_path, as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_includes json, "gifs"
        assert_includes json, "pagination"
        assert_kind_of Array, json["gifs"]
      end

      test "public feed response includes pagination" do
        get api_v1_feed_public_path, as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        pagination = json["pagination"]

        assert_includes pagination, "page"
        assert_includes pagination, "per_page"
        assert_includes pagination, "total"
        assert_kind_of Integer, pagination["total"]
      end

      test "public feed supports pagination parameters" do
        get api_v1_feed_public_path(page: 2, per_page: 10), as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal 2, json["pagination"]["page"]
        assert_equal 10, json["pagination"]["per_page"]
      end

      test "public feed pagination defaults to page 1 and per_page 20" do
        get api_v1_feed_public_path, as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal 1, json["pagination"]["page"]
        assert_equal 20, json["pagination"]["per_page"]
      end

      # ========== TRENDING FEED TESTS ==========

      test "trending should not require authentication" do
        get api_v1_feed_trending_path, as: :json
        assert_response :ok
      end

      test "trending should return trending GIFs" do
        get api_v1_feed_trending_path, as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_includes json, "gifs"
        assert_includes json, "pagination"
        assert_kind_of Array, json["gifs"]
      end

      test "trending response includes pagination" do
        get api_v1_feed_trending_path, as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        pagination = json["pagination"]

        assert_includes pagination, "page"
        assert_includes pagination, "per_page"
        assert_includes pagination, "total"
      end

      test "trending supports pagination parameters" do
        get api_v1_feed_trending_path(page: 1, per_page: 15), as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal 1, json["pagination"]["page"]
        assert_equal 15, json["pagination"]["per_page"]
      end

      # ========== RECENT FEED TESTS ==========

      test "recent should not require authentication" do
        get api_v1_feed_recent_path, as: :json
        assert_response :ok
      end

      test "recent should return recent GIFs" do
        get api_v1_feed_recent_path, as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_includes json, "gifs"
        assert_includes json, "pagination"
        assert_kind_of Array, json["gifs"]
      end

      test "recent response includes pagination with total count" do
        get api_v1_feed_recent_path, as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        pagination = json["pagination"]

        assert_includes pagination, "page"
        assert_includes pagination, "per_page"
        assert_includes pagination, "total"
        assert_kind_of Integer, pagination["total"]
      end

      test "recent supports pagination parameters" do
        get api_v1_feed_recent_path(page: 3, per_page: 25), as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal 3, json["pagination"]["page"]
        assert_equal 25, json["pagination"]["per_page"]
      end

      # ========== POPULAR FEED TESTS ==========

      test "popular should not require authentication" do
        get api_v1_feed_popular_path, as: :json
        assert_response :ok
      end

      test "popular should return popular GIFs" do
        get api_v1_feed_popular_path, as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_includes json, "gifs"
        assert_includes json, "pagination"
        assert_kind_of Array, json["gifs"]
      end

      test "popular response includes pagination" do
        get api_v1_feed_popular_path, as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        pagination = json["pagination"]

        assert_includes pagination, "page"
        assert_includes pagination, "per_page"
        assert_includes pagination, "total"
      end

      test "popular supports pagination parameters" do
        get api_v1_feed_popular_path(page: 1, per_page: 30), as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal 1, json["pagination"]["page"]
        assert_equal 30, json["pagination"]["per_page"]
      end

      # ========== FOLLOWING FEED TESTS ==========

      test "following should require authentication" do
        get api_v1_feed_following_path, as: :json
        assert_response :unauthorized
      end

      test "following should return GIFs from followed users" do
        # Alice follows Bob
        Follow.create!(follower: @alice, following: @bob)

        get api_v1_feed_following_path,
            headers: auth_headers(@alice),
            as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_includes json, "gifs"
        assert_includes json, "pagination"
        assert_kind_of Array, json["gifs"]
      end

      test "following response includes pagination" do
        get api_v1_feed_following_path,
            headers: auth_headers(@alice),
            as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        pagination = json["pagination"]

        assert_includes pagination, "page"
        assert_includes pagination, "per_page"
        assert_includes pagination, "total"
        assert_kind_of Integer, pagination["total"]
      end

      test "following supports pagination parameters" do
        get api_v1_feed_following_path(page: 1, per_page: 10),
            headers: auth_headers(@alice),
            as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal 1, json["pagination"]["page"]
        assert_equal 10, json["pagination"]["per_page"]
      end

      test "following returns empty when not following anyone" do
        # Ensure Alice doesn't follow anyone
        Follow.where(follower: @alice).destroy_all

        get api_v1_feed_following_path,
            headers: auth_headers(@alice),
            as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal [], json["gifs"]
        assert_equal 0, json["pagination"]["total"]
      end

      # ========== PAGINATION ENFORCEMENT TESTS ==========

      test "pagination enforces minimum page of 1" do
        get api_v1_feed_public_path(page: 0), as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal 1, json["pagination"]["page"]
      end

      test "pagination enforces minimum per_page of 1" do
        get api_v1_feed_public_path(per_page: 0), as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal 1, json["pagination"]["per_page"]
      end

      test "pagination enforces maximum per_page of 100" do
        get api_v1_feed_public_path(per_page: 200), as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal 100, json["pagination"]["per_page"]
      end

      test "pagination handles negative page values" do
        get api_v1_feed_public_path(page: -5), as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal 1, json["pagination"]["page"]
      end

      # ========== AUTHENTICATION ERROR TESTS ==========

      test "index should reject invalid JWT token" do
        get api_v1_feed_path,
            headers: { "Authorization" => "Bearer invalid_token" },
            as: :json

        assert_response :unauthorized
      end

      test "index should reject expired JWT token" do
        expired_token = generate_expired_jwt_token(@alice)

        get api_v1_feed_path,
            headers: { "Authorization" => "Bearer #{expired_token}" },
            as: :json

        assert_response :unauthorized
      end

      test "following should reject invalid JWT token" do
        get api_v1_feed_following_path,
            headers: { "Authorization" => "Bearer invalid_token" },
            as: :json

        assert_response :unauthorized
      end

      # ========== EDGE CASES ==========

      test "public feed works for authenticated users" do
        get api_v1_feed_public_path,
            headers: auth_headers(@alice),
            as: :json

        assert_response :ok
      end

      test "trending works for authenticated users" do
        get api_v1_feed_trending_path,
            headers: auth_headers(@alice),
            as: :json

        assert_response :ok
      end

      test "all feed endpoints return consistent JSON structure" do
        endpoints = [
          [ :get, api_v1_feed_path, auth_headers(@alice) ],
          [ :get, api_v1_feed_public_path, {} ],
          [ :get, api_v1_feed_trending_path, {} ],
          [ :get, api_v1_feed_recent_path, {} ],
          [ :get, api_v1_feed_popular_path, {} ],
          [ :get, api_v1_feed_following_path, auth_headers(@alice) ]
        ]

        endpoints.each do |method, path, headers|
          send(method, path, headers: headers, as: :json)
          assert_response :ok

          json = JSON.parse(response.body)
          assert_includes json, "gifs"
          assert_includes json, "pagination"
          assert_kind_of Array, json["gifs"]
          assert_kind_of Hash, json["pagination"]
        end
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
