# frozen_string_literal: true

# Scheduled job to update cached user engagement metrics
# Runs every 6 hours via sidekiq-cron
class UpdateUserEngagementStatsJob < ApplicationJob
  queue_as :low_priority

  def perform
    # Update engagement stats for active users (users who posted in last 90 days)
    active_users = User.joins(:gifs)
                       .where("gifs.created_at > ?", 90.days.ago)
                       .distinct

    active_users.find_each do |user|
      update_user_stats(user)
    end

    Rails.logger.info "Updated engagement stats for #{active_users.count} active users"
  end

  private

  def update_user_stats(user)
    # Recalculate gifs counter cache in case it's out of sync
    User.reset_counters(user.id, :gifs)

    # Note: total_likes_received is a denormalized column, not a counter_cache
    # It would need to be recalculated manually if needed
  end
end
