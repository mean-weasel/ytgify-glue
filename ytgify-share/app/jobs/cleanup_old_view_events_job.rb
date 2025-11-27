# frozen_string_literal: true

# Scheduled job to clean up old view event data
# Runs every hour via sidekiq-cron
class CleanupOldViewEventsJob < ApplicationJob
  queue_as :low_priority

  def perform
    # This will clean up view events older than 30 days
    # View events table will be created in Phase 1
    # For now, this is a placeholder

    cutoff_date = 30.days.ago
    Rails.logger.info "CleanupOldViewEventsJob: Would delete view events older than #{cutoff_date}"

    # TODO: Implement when ViewEvent model is created:
    # deleted_count = ViewEvent.where('created_at < ?', cutoff_date).delete_all
    # Rails.logger.info "Deleted #{deleted_count} old view events"
  end
end
