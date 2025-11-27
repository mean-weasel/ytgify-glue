# Cache Management Rake Tasks
#
# Usage:
#   bin/rails cache:warm              # Warm all caches
#   bin/rails cache:warm:trending     # Warm trending GIFs cache
#   bin/rails cache:warm:popular      # Warm popular GIFs cache
#   bin/rails cache:warm:hashtags     # Warm trending hashtags cache
#   bin/rails cache:clear             # Clear all feed caches
#   bin/rails cache:clear:trending    # Clear trending caches
#   bin/rails cache:clear:hashtags    # Clear hashtag caches

namespace :cache do
  desc "Warm all caches (trending, popular, hashtags)"
  task warm: :environment do
    puts "🔥 Warming all caches..."
    start_time = Time.current

    # Warm trending cache (first 3 pages)
    Rake::Task["cache:warm:trending"].invoke

    # Warm popular cache (first 3 pages)
    Rake::Task["cache:warm:popular"].invoke

    # Warm trending hashtags cache
    Rake::Task["cache:warm:hashtags"].invoke

    elapsed = (Time.current - start_time).round(2)
    puts "✅ All caches warmed successfully in #{elapsed}s"
  end

  namespace :warm do
    desc "Warm trending GIFs cache (first 3 pages)"
    task trending: :environment do
      puts "🔥 Warming trending GIFs cache..."

      # Warm first 3 pages of trending GIFs
      (1..3).each do |page|
        FeedService.trending(page: page, per_page: 20)
        print "."
      end

      puts " ✅ Trending cache warmed (3 pages)"
    end

    desc "Warm popular GIFs cache (first 3 pages)"
    task popular: :environment do
      puts "🔥 Warming popular GIFs cache..."

      # Warm first 3 pages of popular GIFs
      (1..3).each do |page|
        FeedService.popular(page: page, per_page: 20)
        print "."
      end

      puts " ✅ Popular cache warmed (3 pages)"
    end

    desc "Warm trending hashtags cache"
    task hashtags: :environment do
      puts "🔥 Warming trending hashtags cache..."

      # Warm trending hashtags (top 10)
      FeedService.trending_hashtags(limit: 10)

      puts " ✅ Hashtags cache warmed"
    end
  end

  desc "Clear all feed caches"
  task clear: :environment do
    puts "🧹 Clearing all feed caches..."

    FeedService.clear_all_caches

    puts "✅ All feed caches cleared"
  end

  namespace :clear do
    desc "Clear trending and popular caches"
    task trending: :environment do
      puts "🧹 Clearing trending caches..."

      FeedService.clear_trending_cache

      puts "✅ Trending caches cleared"
    end

    desc "Clear hashtag caches"
    task hashtags: :environment do
      puts "🧹 Clearing hashtag caches..."

      FeedService.clear_hashtag_cache

      puts "✅ Hashtag caches cleared"
    end
  end

  desc "Clear and warm all caches"
  task refresh: :environment do
    puts "♻️  Refreshing all caches..."

    Rake::Task["cache:clear"].invoke
    Rake::Task["cache:warm"].invoke

    puts "✅ All caches refreshed"
  end

  desc "Display cache statistics"
  task stats: :environment do
    puts "📊 Cache Statistics"
    puts "=" * 50

    # Check if trending cache exists
    trending_cached = Rails.cache.exist?("feed/trending/page_1/per_20")
    puts "Trending page 1: #{trending_cached ? '✅ Cached' : '❌ Not cached'}"

    # Check if popular cache exists
    popular_cached = Rails.cache.exist?("feed/popular/page_1/per_20")
    puts "Popular page 1:  #{popular_cached ? '✅ Cached' : '❌ Not cached'}"

    # Check if hashtags cache exists
    hashtags_cached = Rails.cache.exist?("feed/trending_hashtags/limit_10")
    puts "Trending hashtags: #{hashtags_cached ? '✅ Cached' : '❌ Not cached'}"

    puts "=" * 50

    # Display cache store info
    puts "Cache store: #{Rails.cache.class.name}"
  end
end
