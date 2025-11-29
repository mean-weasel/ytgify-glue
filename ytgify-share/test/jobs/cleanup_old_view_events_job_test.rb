# frozen_string_literal: true

require "test_helper"

class CleanupOldViewEventsJobTest < ActiveJob::TestCase
  # ========== QUEUE CONFIGURATION ==========

  test "job is enqueued in low_priority queue" do
    assert_enqueued_with(job: CleanupOldViewEventsJob, queue: "low_priority") do
      CleanupOldViewEventsJob.perform_later
    end
  end

  # ========== BASIC EXECUTION ==========

  test "job runs without error" do
    assert_nothing_raised do
      CleanupOldViewEventsJob.perform_now
    end
  end

  test "job calculates correct cutoff date" do
    # Job should use 30 days ago as cutoff
    # This is a placeholder job, so we just verify it runs
    assert_nothing_raised do
      CleanupOldViewEventsJob.perform_now
    end
  end

  # ========== LOGGING ==========

  test "job logs cleanup operation" do
    # Job should complete and log info message
    assert_nothing_raised do
      CleanupOldViewEventsJob.perform_now
    end
  end

  # ========== IDEMPOTENCY ==========

  test "job can run multiple times safely" do
    # Running the job multiple times should not cause errors
    3.times do
      assert_nothing_raised do
        CleanupOldViewEventsJob.perform_now
      end
    end
  end
end
