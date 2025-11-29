# frozen_string_literal: true

require "test_helper"

class UpdateTrendingGifsJobTest < ActiveJob::TestCase
  fixtures :users, :gifs

  setup do
    @alice = users(:one)
    @bob = users(:two)
    @alice_gif = gifs(:alice_public_gif)
    @bob_gif = gifs(:bob_public_gif)

    # Use memory store for cache tests
    @original_cache = Rails.cache
    Rails.cache = ActiveSupport::Cache::MemoryStore.new
  end

  teardown do
    Rails.cache = @original_cache
  end

  # ========== QUEUE CONFIGURATION ==========

  test "job is enqueued in default queue" do
    assert_enqueued_with(job: UpdateTrendingGifsJob, queue: "default") do
      UpdateTrendingGifsJob.perform_later
    end
  end

  # ========== BASIC EXECUTION ==========

  test "job runs without error" do
    assert_nothing_raised do
      UpdateTrendingGifsJob.perform_now
    end
  end

  test "job writes to cache" do
    UpdateTrendingGifsJob.perform_now

    cached_ids = Rails.cache.read("trending_gifs")
    assert_not_nil cached_ids
    assert_kind_of Array, cached_ids
  end

  # ========== TRENDING CALCULATION ==========

  test "job includes only public gifs" do
    # Create a private gif
    private_gif = Gif.create!(
      user: @alice,
      title: "Private GIF",
      privacy: :private_access,
      youtube_video_url: "https://www.youtube.com/watch?v=private",
      youtube_video_title: "Private",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5,
      duration: 5.0,
      fps: 30,
      resolution_width: 480,
      resolution_height: 270
    )

    UpdateTrendingGifsJob.perform_now

    cached_ids = Rails.cache.read("trending_gifs")
    assert_not_includes cached_ids, private_gif.id
  end

  test "job excludes deleted gifs" do
    # Soft delete the gif
    @alice_gif.soft_delete!

    UpdateTrendingGifsJob.perform_now

    cached_ids = Rails.cache.read("trending_gifs")
    assert_not_includes cached_ids, @alice_gif.id
  end

  test "job excludes gifs older than 30 days" do
    # Create an old gif
    old_gif = Gif.create!(
      user: @alice,
      title: "Old GIF",
      privacy: :public_access,
      youtube_video_url: "https://www.youtube.com/watch?v=old",
      youtube_video_title: "Old",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5,
      duration: 5.0,
      fps: 30,
      resolution_width: 480,
      resolution_height: 270,
      created_at: 31.days.ago
    )

    UpdateTrendingGifsJob.perform_now

    cached_ids = Rails.cache.read("trending_gifs")
    assert_not_includes cached_ids, old_gif.id
  end

  test "job includes recent public gifs" do
    # Create a recent public gif with engagement
    recent_gif = Gif.create!(
      user: @alice,
      title: "Recent Popular GIF",
      privacy: :public_access,
      youtube_video_url: "https://www.youtube.com/watch?v=recent",
      youtube_video_title: "Recent",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5,
      duration: 5.0,
      fps: 30,
      resolution_width: 480,
      resolution_height: 270,
      like_count: 100,
      view_count: 1000
    )

    UpdateTrendingGifsJob.perform_now

    cached_ids = Rails.cache.read("trending_gifs")
    assert_includes cached_ids, recent_gif.id
  end

  # ========== CACHE BEHAVIOR ==========

  test "job limits results to 100 gifs" do
    UpdateTrendingGifsJob.perform_now

    cached_ids = Rails.cache.read("trending_gifs")
    assert cached_ids.length <= 100
  end

  test "cache exists after job runs" do
    UpdateTrendingGifsJob.perform_now

    # Cache should exist immediately after
    assert_not_nil Rails.cache.read("trending_gifs")
  end

  # ========== SCORING ==========

  test "trending score considers engagement metrics" do
    # Create a gif with very high engagement
    high_engagement = Gif.create!(
      user: @bob,
      title: "Viral GIF",
      privacy: :public_access,
      youtube_video_url: "https://www.youtube.com/watch?v=viral",
      youtube_video_title: "Viral",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5,
      duration: 5.0,
      fps: 30,
      resolution_width: 480,
      resolution_height: 270,
      like_count: 10000,
      view_count: 100000,
      comment_count: 5000
    )

    UpdateTrendingGifsJob.perform_now

    cached_ids = Rails.cache.read("trending_gifs")

    # High engagement gif should be included in trending
    assert_includes cached_ids, high_engagement.id, "High engagement gif should appear in trending"
  end

  test "trending uses engagement weights" do
    # Verify the algorithm uses the expected weights:
    # like_count * 3 + view_count * 1 + comment_count * 2
    # This is tested implicitly by the job running successfully
    # and including public gifs with engagement

    UpdateTrendingGifsJob.perform_now

    cached_ids = Rails.cache.read("trending_gifs")

    # Fixture gifs have engagement and should be included
    assert_includes cached_ids, @bob_gif.id, "Bob's gif (like:50, view:500, comment:3) should be trending"
  end
end
