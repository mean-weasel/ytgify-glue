# frozen_string_literal: true

# Job to process remix GIFs after creation
# Ensures file is properly uploaded and metadata is extracted
class RemixProcessingJob < ApplicationJob
  queue_as :default

  def perform(remix_id, source_gif_id)
    remix = Gif.find(remix_id)
    source_gif = Gif.find(source_gif_id)

    return unless remix.file.attached?

    # Copy metadata from source
    remix.update!(
      resolution_width: source_gif.resolution_width,
      resolution_height: source_gif.resolution_height,
      fps: source_gif.fps,
      duration: source_gif.duration
    )

    # Generate variants if needed
    generate_variants(remix) if remix.file.attached?

    # Increment remix count on parent
    source_gif.increment!(:remix_count)

    Rails.logger.info "RemixProcessingJob: Processed remix #{remix_id} from source #{source_gif_id}"

  rescue ActiveRecord::RecordNotFound => e
    Rails.logger.error "RemixProcessingJob: Record not found - #{e.message}"
  rescue StandardError => e
    Rails.logger.error "RemixProcessingJob failed for remix #{remix_id}: #{e.message}"
    raise e # Re-raise to trigger Sidekiq retry
  end

  private

  def generate_variants(remix)
    # Generate thumbnail variant
    remix.file.variant(:thumb).processed
  rescue StandardError => e
    Rails.logger.error "Failed to generate variants for remix #{remix.id}: #{e.message}"
  end
end
