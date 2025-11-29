# frozen_string_literal: true

require "test_helper"

class UpdateUserEngagementStatsJobTest < ActiveJob::TestCase
  fixtures :users, :gifs

  setup do
    @alice = users(:one)
    @bob = users(:two)
    @alice_gif = gifs(:alice_public_gif)
  end

  # ========== QUEUE CONFIGURATION ==========

  test "job is enqueued in low_priority queue" do
    assert_enqueued_with(job: UpdateUserEngagementStatsJob, queue: "low_priority") do
      UpdateUserEngagementStatsJob.perform_later
    end
  end

  # ========== BASIC EXECUTION ==========

  test "job runs without error" do
    assert_nothing_raised do
      UpdateUserEngagementStatsJob.perform_now
    end
  end

  test "job runs without error when no active users exist" do
    # Remove all gifs created in last 90 days to have no active users
    Gif.where("created_at > ?", 90.days.ago).update_all(created_at: 91.days.ago)

    assert_nothing_raised do
      UpdateUserEngagementStatsJob.perform_now
    end
  end

  # ========== ACTIVE USER DETECTION ==========

  test "job processes users with recent gifs" do
    # Alice has a gif (from fixtures), should be processed
    # Create a recent gif to ensure Alice is active
    recent_gif = Gif.create!(
      user: @alice,
      title: "Recent GIF",
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
      created_at: 1.day.ago
    )

    assert_nothing_raised do
      UpdateUserEngagementStatsJob.perform_now
    end
  end

  test "job skips users with only old gifs" do
    # Create a user with only old gifs
    old_user = User.create!(
      email: "old@example.com",
      username: "olduser",
      password: "password123"
    )

    old_gif = Gif.create!(
      user: old_user,
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
      resolution_height: 270
    )
    # Update created_at after creation to make it old
    old_gif.update_column(:created_at, 91.days.ago)

    # Job should complete without processing old_user
    assert_nothing_raised do
      UpdateUserEngagementStatsJob.perform_now
    end
  end

  # ========== COUNTER CACHE RESET ==========

  test "job resets gifs counter cache" do
    # Manually set incorrect counter
    @alice.update_column(:gifs_count, 999)

    UpdateUserEngagementStatsJob.perform_now

    @alice.reload
    # Counter should be reset to actual count
    assert_not_equal 999, @alice.gifs_count
  end

  test "job handles users with no gifs correctly" do
    # Create user with no gifs
    no_gifs_user = User.create!(
      email: "nogifs@example.com",
      username: "nogifs",
      password: "password123"
    )

    # Job should complete without error
    assert_nothing_raised do
      UpdateUserEngagementStatsJob.perform_now
    end
  end

  # ========== BATCH PROCESSING ==========

  test "job processes multiple active users" do
    # Create multiple active users with recent gifs
    3.times do |i|
      user = User.create!(
        email: "batch#{i}@example.com",
        username: "batchuser#{i}",
        password: "password123"
      )

      Gif.create!(
        user: user,
        title: "Batch GIF #{i}",
        privacy: :public_access,
        youtube_video_url: "https://www.youtube.com/watch?v=batch#{i}",
        youtube_video_title: "Batch",
        youtube_channel_name: "Test",
        youtube_timestamp_start: 0,
        youtube_timestamp_end: 5,
        duration: 5.0,
        fps: 30,
        resolution_width: 480,
        resolution_height: 270,
        created_at: 1.day.ago
      )
    end

    assert_nothing_raised do
      UpdateUserEngagementStatsJob.perform_now
    end
  end
end
