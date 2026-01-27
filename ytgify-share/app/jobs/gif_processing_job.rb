# frozen_string_literal: true

# Job to process GIF files after upload
# Extracts metadata, generates thumbnails, and optimizes the file
class GifProcessingJob < ApplicationJob
  queue_as :default

  # Default frame delay if not specified in GIF (in hundredths of a second)
  DEFAULT_DELAY_CS = 10 # 10 centiseconds = 100ms = 10fps

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
    blob = gif.file.blob
    gif.file_size = blob.byte_size

    # Download file temporarily to analyze with Vips
    blob.open do |tempfile|
      extract_gif_metadata(gif, tempfile.path)
    end
  rescue LoadError => e
    # Vips library not available - skip metadata extraction but continue
    Rails.logger.warn "Vips library not available, skipping GIF metadata extraction: #{e.message}"
  rescue StandardError => e
    Rails.logger.error "Failed to analyze GIF #{gif.id}: #{e.message}"
  end

  def extract_gif_metadata(gif, file_path)
    # Load the GIF with all pages (frames) for animation info
    image = Vips::Image.new_from_file(file_path, access: :sequential, n: -1)

    # Extract dimensions (width is consistent, height is total height of all frames)
    gif.resolution_width = image.width

    # Get number of frames from n-pages property
    frame_count = image.get("n-pages") rescue 1
    frame_count = [ frame_count.to_i, 1 ].max

    # Height per frame (total height / number of frames)
    gif.resolution_height = image.height / frame_count

    # Get frame delays (in centiseconds, i.e., 1/100th of a second)
    # GIF delay is stored in "gif-delay" as an array of integers
    delays = begin
      image.get("gif-delay")
    rescue Vips::Error
      nil
    end

    if delays.is_a?(Array) && delays.any?
      # Use average delay if delays vary per frame
      avg_delay_cs = delays.sum.to_f / delays.size
      avg_delay_cs = DEFAULT_DELAY_CS if avg_delay_cs <= 0
    else
      avg_delay_cs = DEFAULT_DELAY_CS
    end

    # Calculate FPS from delay (delay is in centiseconds)
    # fps = 100 / delay_in_centiseconds
    gif.fps = (100.0 / avg_delay_cs).round

    # Calculate duration in seconds
    # duration = frame_count * delay_in_seconds
    gif.duration = (frame_count * avg_delay_cs / 100.0).round(2)

    Rails.logger.info "GIF #{gif.id} metadata: #{gif.resolution_width}x#{gif.resolution_height}, " \
                      "#{frame_count} frames, #{gif.fps} fps, #{gif.duration}s"
  rescue Vips::Error => e
    Rails.logger.error "Vips error analyzing GIF #{gif.id}: #{e.message}"
  end

  def generate_variants(gif)
    # Generate thumbnail variant
    gif.file.variant(:thumb).processed

    # Generate medium variant
    gif.file.variant(:medium).processed
  rescue LoadError => e
    # Vips library not available - skip variant generation but continue
    Rails.logger.warn "Vips library not available, skipping variant generation: #{e.message}"
  rescue StandardError => e
    Rails.logger.error "Failed to generate variants for Gif #{gif.id}: #{e.message}"
  end
end
