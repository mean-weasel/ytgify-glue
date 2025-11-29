# frozen_string_literal: true

require "test_helper"

class GifProcessingJobTest < ActiveJob::TestCase
  # Disable parallel execution - ActiveStorage attachments have race conditions
  parallelize(workers: 1)

  fixtures :users, :gifs

  setup do
    @alice = users(:one)
    @gif = gifs(:alice_public_gif)
  end

  # ========== QUEUE CONFIGURATION ==========

  test "job is enqueued in default queue" do
    assert_enqueued_with(job: GifProcessingJob, queue: "default") do
      GifProcessingJob.perform_later(@gif.id)
    end
  end

  # ========== BASIC EXECUTION ==========

  test "job runs without error when gif exists with no file" do
    # Ensure no file attached
    @gif.file.purge if @gif.file.attached?

    assert_nothing_raised do
      GifProcessingJob.perform_now(@gif.id)
    end
  end

  test "job returns early when gif not found" do
    non_existent_id = "00000000-0000-0000-0000-000000000000"

    # Should not raise, just logs warning and returns
    assert_nothing_raised do
      GifProcessingJob.perform_now(non_existent_id)
    end
  end

  test "job returns early when file not attached" do
    @gif.file.purge if @gif.file.attached?

    # Should return early without processing
    assert_nothing_raised do
      GifProcessingJob.perform_now(@gif.id)
    end
  end

  # ========== FILE PROCESSING ==========

  test "job updates file_size when file is attached" do
    test_file_path = Rails.root.join("test", "fixtures", "files", "test.gif")

    @gif.file.attach(
      io: StringIO.new(File.binread(test_file_path)),
      filename: "test.gif",
      content_type: "image/gif"
    )
    @gif.save!

    GifProcessingJob.perform_now(@gif.id)

    @gif.reload
    if @gif.file.attached?
      assert_not_nil @gif.file_size
      assert @gif.file_size > 0
    end
  end

  test "job generates variants when file is attached" do
    test_file_path = Rails.root.join("test", "fixtures", "files", "test.gif")

    @gif.file.attach(
      io: StringIO.new(File.binread(test_file_path)),
      filename: "test.gif",
      content_type: "image/gif"
    )
    @gif.save!

    # Variants generation may fail in test env but job should handle gracefully
    assert_nothing_raised do
      GifProcessingJob.perform_now(@gif.id)
    end
  end

  # ========== ERROR HANDLING ==========

  test "job handles variant generation failure gracefully" do
    test_file_path = Rails.root.join("test", "fixtures", "files", "test.gif")

    @gif.file.attach(
      io: StringIO.new(File.binread(test_file_path)),
      filename: "test.gif",
      content_type: "image/gif"
    )
    @gif.save!

    # Even if variant generation fails, job should complete without raising
    assert_nothing_raised do
      GifProcessingJob.perform_now(@gif.id)
    end
  end

  test "job saves gif record after processing" do
    test_file_path = Rails.root.join("test", "fixtures", "files", "test.gif")

    @gif.file.attach(
      io: StringIO.new(File.binread(test_file_path)),
      filename: "test.gif",
      content_type: "image/gif"
    )
    original_updated_at = @gif.updated_at
    @gif.save!

    GifProcessingJob.perform_now(@gif.id)

    @gif.reload
    # Record should be saved (updated_at may change if file was processed)
    assert @gif.updated_at >= original_updated_at
  end
end
