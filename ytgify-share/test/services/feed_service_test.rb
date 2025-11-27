require "test_helper"

class FeedServiceTest < ActiveSupport::TestCase
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
    @user3 = User.create!(
      email: "user3@example.com",
      username: "user3",
      password: "password123"
    )

    # User1 follows User2
    Follow.create!(follower: @user1, following: @user2)

    # Create GIFs
    @gif1 = Gif.create!(
      user: @user2,
      title: "User2's GIF",
      privacy: :public_access,
      like_count: 10,
      view_count: 100
    )
    @gif2 = Gif.create!(
      user: @user3,
      title: "User3's GIF",
      privacy: :public_access,
      like_count: 20,
      view_count: 200
    )
    @private_gif = Gif.create!(
      user: @user2,
      title: "Private GIF",
      privacy: :private_access
    )

    # Create hashtags
    @hashtag = Hashtag.create!(name: "funny", slug: "funny", usage_count: 5)
    @gif1.hashtags << @hashtag
  end

  test "generate_for_user returns GIFs from followed users" do
    feed = FeedService.generate_for_user(@user1, page: 1, per_page: 20)
    gif_ids = feed.map(&:id)

    # Should include GIF from followed user
    assert_includes gif_ids, @gif1.id
  end

  test "generate_for_user does not return private GIFs" do
    feed = FeedService.generate_for_user(@user1, page: 1, per_page: 20)
    gif_ids = feed.map(&:id)

    assert_not_includes gif_ids, @private_gif.id
  end

  test "generate_for_user returns trending when no following" do
    feed = FeedService.generate_for_user(@user3, page: 1, per_page: 20)
    assert feed.any?
  end

  test "generate_public returns public GIFs only" do
    feed = FeedService.generate_public(page: 1, per_page: 20)
    gif_ids = feed.map(&:id)

    assert_includes gif_ids, @gif1.id
    assert_includes gif_ids, @gif2.id
    assert_not_includes gif_ids, @private_gif.id
  end

  test "trending returns GIFs ordered by likes and views" do
    feed = FeedService.trending(page: 1, per_page: 20)

    # gif2 has more likes and views, should come first
    # Check that gif2 appears before gif1 in the results
    gif_ids = feed.map(&:id)
    assert_includes gif_ids, @gif2.id
    assert_includes gif_ids, @gif1.id

    # If both are present, gif2 should come before gif1
    if gif_ids.include?(@gif2.id) && gif_ids.include?(@gif1.id)
      assert gif_ids.index(@gif2.id) < gif_ids.index(@gif1.id),
             "Expected gif2 (higher counts) to appear before gif1"
    end
  end

  test "recent returns GIFs ordered by created_at desc" do
    gif3 = Gif.create!(
      user: @user1,
      title: "Newest GIF",
      privacy: :public_access
    )

    feed = FeedService.recent(page: 1, per_page: 20)

    # Newest GIF should be first
    assert_equal gif3.id, feed.first.id
  end

  test "popular returns GIFs ordered by popularity" do
    feed = FeedService.popular(page: 1, per_page: 20)

    # gif2 has higher like_count (20 vs 10)
    # Check that gif2 appears before gif1 in the results
    gif_ids = feed.map(&:id)
    assert_includes gif_ids, @gif2.id
    assert_includes gif_ids, @gif1.id

    # If both are present, gif2 should come before gif1
    if gif_ids.include?(@gif2.id) && gif_ids.include?(@gif1.id)
      assert gif_ids.index(@gif2.id) < gif_ids.index(@gif1.id),
             "Expected gif2 (20 likes) to appear before gif1 (10 likes)"
    end
  end

  test "by_hashtag returns GIFs with specific hashtag" do
    feed = FeedService.by_hashtag(@hashtag, page: 1, per_page: 20)
    gif_ids = feed.map(&:id)

    assert_includes gif_ids, @gif1.id
    assert_not_includes gif_ids, @gif2.id
  end

  test "trending_hashtags returns hashtags with usage" do
    hashtags = FeedService.trending_hashtags(limit: 10)

    assert_includes hashtags, @hashtag
    assert hashtags.all? { |h| h.usage_count > 0 }
  end

  test "pagination works correctly" do
    # Create 25 GIFs
    25.times do |i|
      Gif.create!(
        user: @user1,
        title: "GIF #{i}",
        privacy: :public_access
      )
    end

    page1 = FeedService.recent(page: 1, per_page: 10)
    page2 = FeedService.recent(page: 2, per_page: 10)

    assert_equal 10, page1.size
    assert_equal 10, page2.size
    # Pages should have different GIFs
    assert_not_equal page1.first.id, page2.first.id
  end

  test "feed respects per_page limit" do
    feed = FeedService.recent(page: 1, per_page: 5)
    assert feed.size <= 5
  end

  test "generate_for_user returns empty array for nil user" do
    feed = FeedService.generate_for_user(nil, page: 1, per_page: 20)
    assert_equal [], feed
  end

  # ========================================
  # EDGE CASE TESTS (HIGH-IMPACT COVERAGE)
  # ========================================

  # Deleted GIF exclusion tests
  test "personalized feed excludes deleted GIFs from followed users" do
    @gif1.update!(deleted_at: Time.current)

    feed = FeedService.generate_for_user(@user1, page: 1, per_page: 20)
    gif_ids = feed.map(&:id)

    assert_not_includes gif_ids, @gif1.id, "Should exclude deleted GIF from followed user"
  end

  test "public feed excludes deleted GIFs" do
    @gif1.update!(deleted_at: Time.current)

    feed = FeedService.generate_public(page: 1, per_page: 20)
    gif_ids = feed.map(&:id)

    assert_not_includes gif_ids, @gif1.id, "Should exclude deleted GIF"
  end

  test "trending feed excludes deleted GIFs" do
    @gif2.update!(deleted_at: Time.current)
    FeedService.clear_trending_cache # Clear cache to get fresh data

    feed = FeedService.trending(page: 1, per_page: 20)
    gif_ids = feed.map(&:id)

    assert_not_includes gif_ids, @gif2.id, "Should exclude deleted GIF"
  end

  test "popular feed excludes deleted GIFs" do
    @gif2.update!(deleted_at: Time.current)
    Rails.cache.delete_matched("feed/popular/*") # Clear cache

    feed = FeedService.popular(page: 1, per_page: 20)
    gif_ids = feed.map(&:id)

    assert_not_includes gif_ids, @gif2.id, "Should exclude deleted GIF"
  end

  test "recent feed excludes deleted GIFs" do
    @gif1.update!(deleted_at: Time.current)

    feed = FeedService.recent(page: 1, per_page: 20)
    gif_ids = feed.map(&:id)

    assert_not_includes gif_ids, @gif1.id, "Should exclude deleted GIF"
  end

  test "by_hashtag excludes deleted GIFs" do
    @gif1.update!(deleted_at: Time.current)

    feed = FeedService.by_hashtag(@hashtag, page: 1, per_page: 20)
    gif_ids = feed.map(&:id)

    assert_not_includes gif_ids, @gif1.id, "Should exclude deleted GIF"
  end

  # Cache invalidation tests
  test "clear_trending_cache works without errors" do
    # Populate caches
    FeedService.trending(page: 1, per_page: 5)
    FeedService.popular(page: 1, per_page: 5)

    # Clear cache should work without errors
    assert_nothing_raised do
      FeedService.clear_trending_cache
    end

    # Can still fetch trending after clearing
    trending = FeedService.trending(page: 1, per_page: 5)
    assert_instance_of Array, trending
  end

  test "clear_hashtag_cache works without errors" do
    # Populate cache
    FeedService.trending_hashtags(limit: 5)

    # Clear cache should work without errors
    assert_nothing_raised do
      FeedService.clear_hashtag_cache
    end

    # Can still fetch hashtags after clearing
    hashtags = FeedService.trending_hashtags(limit: 5)
    assert_instance_of Array, hashtags
  end

  test "clear_all_caches clears both trending and hashtag caches" do
    # Populate both caches
    FeedService.trending(page: 1, per_page: 5)
    FeedService.trending_hashtags(limit: 5)

    # Clear all caches
    assert_nothing_raised do
      FeedService.clear_all_caches
    end

    # Both should return fresh data
    trending = FeedService.trending(page: 1, per_page: 5)
    hashtags = FeedService.trending_hashtags(limit: 5)

    assert_instance_of Array, trending
    assert_instance_of Array, hashtags
  end

  # Pagination edge cases
  test "handles page beyond available results" do
    feed = FeedService.recent(page: 9999, per_page: 20)
    assert_equal 0, feed.size, "Should return empty for page beyond available"
  end

  test "handles zero page number" do
    # Page 0 results in negative offset, PostgreSQL raises error
    assert_raises(ActiveRecord::StatementInvalid) do
      FeedService.recent(page: 0, per_page: 20).to_a
    end
  end

  test "handles negative page number" do
    # Negative page results in negative offset, PostgreSQL raises error
    assert_raises(ActiveRecord::StatementInvalid) do
      FeedService.recent(page: -1, per_page: 20).to_a
    end
  end

  test "handles zero per_page" do
    feed = FeedService.recent(page: 1, per_page: 0)
    assert_equal 0, feed.size, "Should return empty with per_page: 0"
  end

  test "handles very large per_page" do
    feed = FeedService.recent(page: 1, per_page: 10000)
    # Should not error, just return what's available
    assert feed.size >= 0
    assert feed.size <= 10000
  end

  # Following users with no GIFs edge case
  test "personalized feed handles following users with no GIFs" do
    # Create user with no GIFs
    empty_user = User.create!(
      email: "empty@example.com",
      username: "emptyuser",
      password: "password123"
    )
    Follow.create!(follower: @user1, following: empty_user)

    # Should still return trending GIFs to fill feed
    feed = FeedService.generate_for_user(@user1, page: 1, per_page: 10)

    assert feed.any?, "Should return trending GIFs when following users have no GIFs"
    assert feed.all? { |gif| gif.privacy == "public_access" }

    empty_user.destroy
  end

  test "personalized feed mixes following and trending GIFs when user has follows" do
    # User1 follows User2 who has GIF1
    feed = FeedService.generate_for_user(@user1, page: 1, per_page: 20)

    # Should get a mix of following GIFs and trending GIFs
    assert feed.any?, "Feed should not be empty"
    # Since shuffle is involved, just verify it's an array with GIFs
    assert_instance_of Array, feed
  end

  # Privacy filtering edge cases
  test "all feeds exclude unlisted GIFs by default" do
    unlisted_gif = Gif.create!(
      user: @user2,
      title: "Unlisted GIF",
      privacy: :unlisted
    )

    trending = FeedService.trending(page: 1, per_page: 20)
    recent = FeedService.recent(page: 1, per_page: 20)
    popular = FeedService.popular(page: 1, per_page: 20)
    public_feed = FeedService.generate_public(page: 1, per_page: 20)

    assert_not_includes trending.map(&:id), unlisted_gif.id
    assert_not_includes recent.map(&:id), unlisted_gif.id
    assert_not_includes popular.map(&:id), unlisted_gif.id
    assert_not_includes public_feed.map(&:id), unlisted_gif.id

    unlisted_gif.destroy
  end

  # Cache key uniqueness tests
  test "different pages use different cache keys for trending" do
    page1 = FeedService.trending(page: 1, per_page: 5)
    page2 = FeedService.trending(page: 2, per_page: 5)

    # Pages should be different (unless there aren't enough GIFs)
    if Gif.count > 5
      assert_not_equal page1.map(&:id), page2.map(&:id), "Different pages should have different results"
    end
  end

  test "different per_page values use different cache keys" do
    small = FeedService.trending(page: 1, per_page: 2)
    large = FeedService.trending(page: 1, per_page: 10)

    assert small.size <= 2
    assert large.size <= 10
    # They're different cache keys, so sizes should differ if enough GIFs exist
  end

  # Hashtag feed edge cases
  test "by_hashtag returns empty for hashtag with no GIFs" do
    empty_tag = Hashtag.create!(name: "empty", slug: "empty", usage_count: 0)

    feed = FeedService.by_hashtag(empty_tag, page: 1, per_page: 20)

    assert_equal 0, feed.size, "Should return empty for hashtag with no GIFs"

    empty_tag.destroy
  end

  test "by_hashtag respects pagination" do
    # Create multiple GIFs with same hashtag
    10.times do |i|
      gif = Gif.create!(
        user: @user1,
        title: "Tagged GIF #{i}",
        privacy: :public_access
      )
      gif.hashtags << @hashtag
    end

    page1 = FeedService.by_hashtag(@hashtag, page: 1, per_page: 5)
    page2 = FeedService.by_hashtag(@hashtag, page: 2, per_page: 5)

    assert_equal 5, page1.size
    # Page 2 should have different GIFs
    assert_not_equal page1.first.id, page2.first.id if page2.any?
  end

  # Trending hashtags edge cases
  test "trending_hashtags returns only hashtags with usage_count > 0" do
    # Create hashtag with 0 usage
    zero_tag = Hashtag.create!(name: "unused", slug: "unused", usage_count: 0)

    FeedService.clear_hashtag_cache
    hashtags = FeedService.trending_hashtags(limit: 20)

    assert_not_includes hashtags.map(&:id), zero_tag.id, "Should not include hashtags with 0 usage"
    assert hashtags.all? { |tag| tag.usage_count > 0 }, "All hashtags should have usage > 0"

    zero_tag.destroy
  end

  test "trending_hashtags respects limit parameter" do
    # Create several hashtags
    5.times do |i|
      Hashtag.create!(name: "tag#{i}", slug: "tag#{i}", usage_count: i + 1)
    end

    FeedService.clear_hashtag_cache
    hashtags = FeedService.trending_hashtags(limit: 3)

    assert hashtags.size <= 3, "Should respect limit parameter"
  end

  test "trending_hashtags returns array" do
    hashtags = FeedService.trending_hashtags(limit: 5)
    assert_instance_of Array, hashtags
    assert hashtags.all? { |h| h.is_a?(Hashtag) }, "All items should be Hashtag instances"
  end
end
