require "test_helper"

module Api
  module V1
    class HashtagsControllerTest < ActionDispatch::IntegrationTest
      setup do
        # Clear all hashtags before each test
        Hashtag.destroy_all

        # Create test hashtags with different usage counts
        @trending_hashtag = Hashtag.create!(name: "trending", slug: "trending", usage_count: 100)
        @popular_hashtag = Hashtag.create!(name: "popular", slug: "popular", usage_count: 50)
        @new_hashtag = Hashtag.create!(name: "newhashtag", slug: "newhashtag", usage_count: 0)
        @test_hashtag = Hashtag.create!(name: "test", slug: "test", usage_count: 25)
        @testing_hashtag = Hashtag.create!(name: "testing", slug: "testing", usage_count: 10)
      end

      # Search endpoint tests
      test "should search hashtags by prefix" do
        get search_api_v1_hashtags_path, params: { q: "test" }

        assert_response :success
        json = JSON.parse(response.body)

        assert_equal "test", json["query"]
        assert json["hashtags"].is_a?(Array)

        # Should return both "test" and "testing" (sorted by usage_count desc)
        hashtag_names = json["hashtags"].map { |h| h["name"] }
        assert_includes hashtag_names, "test"
        assert_includes hashtag_names, "testing"

        # Should be sorted by usage_count descending
        assert_equal "test", json["hashtags"].first["name"]
        assert_equal 25, json["hashtags"].first["usage_count"]
      end

      test "should search hashtags case-insensitively" do
        get search_api_v1_hashtags_path, params: { q: "TEST" }

        assert_response :success
        json = JSON.parse(response.body)

        hashtag_names = json["hashtags"].map { |h| h["name"] }
        assert_includes hashtag_names, "test"
        assert_includes hashtag_names, "testing"
      end

      test "should strip hash prefix from search query" do
        get search_api_v1_hashtags_path, params: { q: "#trending" }

        assert_response :success
        json = JSON.parse(response.body)

        assert_equal "trending", json["query"]
        hashtag_names = json["hashtags"].map { |h| h["name"] }
        assert_includes hashtag_names, "trending"
      end

      test "should return trending hashtags when query is empty" do
        get search_api_v1_hashtags_path, params: { q: "" }

        assert_response :success
        json = JSON.parse(response.body)

        assert_equal "", json["query"]
        assert json["hashtags"].is_a?(Array)

        # Should return trending hashtags sorted by usage_count
        assert_equal "trending", json["hashtags"].first["name"]
      end

      test "should return trending hashtags when query is not provided" do
        get search_api_v1_hashtags_path

        assert_response :success
        json = JSON.parse(response.body)

        assert json["hashtags"].is_a?(Array)
        # Should return hashtags sorted by usage_count
        if json["hashtags"].any?
          first_usage = json["hashtags"].first["usage_count"]
          second_usage = json["hashtags"].second&.fetch("usage_count", 0) || 0
          assert first_usage >= second_usage, "Hashtags should be sorted by usage_count descending"
        end
      end

      test "should respect limit parameter" do
        # Create more hashtags
        15.times do |i|
          Hashtag.create!(name: "tag#{i}", slug: "tag#{i}", usage_count: i)
        end

        get search_api_v1_hashtags_path, params: { q: "tag", limit: 5 }

        assert_response :success
        json = JSON.parse(response.body)

        assert_equal 5, json["hashtags"].length
      end

      test "should enforce maximum limit of 20" do
        # Create more hashtags
        25.times do |i|
          Hashtag.create!(name: "item#{i}", slug: "item#{i}", usage_count: i)
        end

        get search_api_v1_hashtags_path, params: { q: "item", limit: 50 }

        assert_response :success
        json = JSON.parse(response.body)

        assert json["hashtags"].length <= 20
      end

      test "should default to limit of 10" do
        # Create more hashtags
        15.times do |i|
          Hashtag.create!(name: "foo#{i}", slug: "foo#{i}", usage_count: i)
        end

        get search_api_v1_hashtags_path, params: { q: "foo" }

        assert_response :success
        json = JSON.parse(response.body)

        assert_equal 10, json["hashtags"].length
      end

      test "should return empty array when no matches found" do
        get search_api_v1_hashtags_path, params: { q: "nonexistent" }

        assert_response :success
        json = JSON.parse(response.body)

        assert_equal [], json["hashtags"]
        assert_equal "nonexistent", json["query"]
      end

      test "should only return id, name, slug, and usage_count fields" do
        get search_api_v1_hashtags_path, params: { q: "test" }

        assert_response :success
        json = JSON.parse(response.body)

        hashtag = json["hashtags"].first
        assert_not_nil hashtag["id"]
        assert_not_nil hashtag["name"]
        assert_not_nil hashtag["slug"]
        assert_not_nil hashtag["usage_count"]

        # Should not include timestamps
        assert_nil hashtag["created_at"]
        assert_nil hashtag["updated_at"]
      end

      test "should work without authentication" do
        # Don't sign in
        get search_api_v1_hashtags_path, params: { q: "test" }

        assert_response :success
      end

      test "should sort by usage_count desc then name asc" do
        # Create hashtags with same usage_count
        Hashtag.create!(name: "zebra", slug: "zebra", usage_count: 30)
        Hashtag.create!(name: "apple", slug: "apple", usage_count: 30)

        get search_api_v1_hashtags_path, params: { q: "" }

        assert_response :success
        json = JSON.parse(response.body)

        # Find the hashtags with usage_count 30
        same_usage_hashtags = json["hashtags"].select { |h| h["usage_count"] == 30 }

        if same_usage_hashtags.length >= 2
          # They should be sorted alphabetically
          names = same_usage_hashtags.map { |h| h["name"] }
          assert_equal names.sort, names, "Hashtags with same usage_count should be sorted alphabetically"
        end
      end
    end
  end
end
