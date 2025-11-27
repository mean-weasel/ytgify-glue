class FeedService
  # Cache expiration times
  TRENDING_CACHE_EXPIRES_IN = 15.minutes
  HASHTAGS_CACHE_EXPIRES_IN = 1.hour
  USER_FEED_CACHE_EXPIRES_IN = 5.minutes

  # Generate personalized feed for a user
  def self.generate_for_user(user, page: 1, per_page: 20)
    return [] unless user

    # Get GIFs from users the current user follows
    following_ids = user.following.pluck(:id)

    if following_ids.any?
      # Mix of following GIFs and trending GIFs
      following_gifs = Gif.where(user_id: following_ids)
                          .not_deleted
                          .public_only
                          .includes(:user, :hashtags)
                          .recent
                          .limit(per_page / 2)

      trending_gifs = Gif.trending
                         .not_deleted
                         .public_only
                         .includes(:user, :hashtags)
                         .where.not(user_id: following_ids + [user.id])
                         .limit(per_page / 2)

      # Combine and shuffle
      (following_gifs.to_a + trending_gifs.to_a).shuffle.first(per_page)
    else
      # No following, show trending
      Gif.trending
         .not_deleted
         .public_only
         .includes(:user, :hashtags)
         .offset((page - 1) * per_page)
         .limit(per_page)
    end
  end

  # Generate public feed (for non-authenticated users)
  def self.generate_public(page: 1, per_page: 20)
    Gif.trending
       .not_deleted
       .public_only
       .includes(:user, :hashtags)
       .offset((page - 1) * per_page)
       .limit(per_page)
  end

  # Get trending GIFs based on recent activity (with caching)
  def self.trending(page: 1, per_page: 20)
    cache_key = "feed/trending/page_#{page}/per_#{per_page}"

    Rails.cache.fetch(cache_key, expires_in: TRENDING_CACHE_EXPIRES_IN) do
      Gif.trending
         .not_deleted
         .public_only
         .includes(:user, :hashtags)
         .offset((page - 1) * per_page)
         .limit(per_page)
         .to_a # Convert to array for caching
    end
  end

  # Get trending hashtags (with caching)
  def self.trending_hashtags(limit: 10)
    cache_key = "feed/trending_hashtags/limit_#{limit}"

    Rails.cache.fetch(cache_key, expires_in: HASHTAGS_CACHE_EXPIRES_IN) do
      Hashtag.trending.limit(limit).to_a
    end
  end

  # Get recent GIFs
  def self.recent(page: 1, per_page: 20)
    Gif.recent
       .not_deleted
       .public_only
       .includes(:user, :hashtags)
       .offset((page - 1) * per_page)
       .limit(per_page)
  end

  # Get popular GIFs (by likes and views) (with caching)
  def self.popular(page: 1, per_page: 20)
    cache_key = "feed/popular/page_#{page}/per_#{per_page}"

    Rails.cache.fetch(cache_key, expires_in: TRENDING_CACHE_EXPIRES_IN) do
      Gif.popular
         .not_deleted
         .public_only
         .includes(:user, :hashtags)
         .offset((page - 1) * per_page)
         .limit(per_page)
         .to_a
    end
  end

  # Get GIFs for a specific hashtag
  def self.by_hashtag(hashtag, page: 1, per_page: 20)
    hashtag.gifs
           .not_deleted
           .public_only
           .includes(:user, :hashtags)
           .recent
           .offset((page - 1) * per_page)
           .limit(per_page)
  end

  # Cache invalidation helpers
  def self.clear_trending_cache
    Rails.cache.delete_matched("feed/trending/*")
    Rails.cache.delete_matched("feed/popular/*")
  end

  def self.clear_hashtag_cache
    Rails.cache.delete_matched("feed/trending_hashtags/*")
  end

  def self.clear_all_caches
    clear_trending_cache
    clear_hashtag_cache
  end
end
