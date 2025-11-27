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
    # Recalculate counter caches in case they're out of sync
    User.reset_counters(user.id, :gifs, :total_likes_received)

    # These will be implemented when Follow model exists:
    # User.reset_counters(user.id, :followers, :following)
  end
end
