# frozen_string_literal: true

# Scheduled job to calculate and cache trending GIFs
# Runs every 15 minutes via sidekiq-cron
class UpdateTrendingGifsJob < ApplicationJob
  queue_as :default

  def perform
    # Calculate trending score based on:
    # - Recent likes (past 7 days)
    # - Recent views (past 7 days)
    # - Recent comments (past 7 days)
    # - Recency (newer = higher score)

    trending_gifs = Gif.not_deleted
                       .public_only
                       .where('created_at > ?', 30.days.ago)
                       .order(Arel.sql('(like_count * 3 + view_count * 1 + comment_count * 2) / EXTRACT(EPOCH FROM (NOW() - created_at)) DESC'))
                       .limit(100)

    # Cache the trending GIFs in Redis
    Rails.cache.write('trending_gifs', trending_gifs.pluck(:id), expires_in: 15.minutes)

    Rails.logger.info "Updated trending GIFs cache with #{trending_gifs.count} GIFs"
  end
end
