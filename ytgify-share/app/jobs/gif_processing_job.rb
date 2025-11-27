# frozen_string_literal: true

# Job to process GIF files after upload
# Extracts metadata, generates thumbnails, and optimizes the file
class GifProcessingJob < ApplicationJob
  queue_as :default

  def perform(gif_id)
    gif = Gif.find(gif_id)
    return unless gif.file.attached?

    # Extract GIF metadata
    analyze_file(gif)

    # Generate variants (thumbnails)
    generate_variants(gif)

    # Update GIF record with metadata
    gif.save!
  rescue ActiveRecord::RecordNotFound
    Rails.logger.warn "GifProcessingJob: Gif #{gif_id} not found"
  end

  private

  def analyze_file(gif)
    # This will be implemented with actual GIF analysis
    # For now, just extract basic file information
    blob = gif.file.blob
    gif.file_size = blob.byte_size

    # TODO: Use ImageMagick or similar to extract:
    # - resolution_width and resolution_height
    # - fps
    # - actual duration
  end

  def generate_variants(gif)
    # Generate thumbnail variant
    gif.file.variant(:thumb).processed

    # Generate medium variant
    gif.file.variant(:medium).processed
  rescue StandardError => e
    Rails.logger.error "Failed to generate variants for Gif #{gif.id}: #{e.message}"
  end
end
