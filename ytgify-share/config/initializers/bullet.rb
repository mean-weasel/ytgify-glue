# Bullet Configuration
# Detects N+1 queries and unused eager loading
#
# Documentation: https://github.com/flyerhzm/bullet

if defined?(Bullet)
  Bullet.enable = true

  # ============================================================================
  # Notification Methods
  # ============================================================================

  # Show alerts in browser (DISABLED - too intrusive)
  Bullet.alert = false

  # Log to Rails logger
  Bullet.rails_logger = true

  # Show in browser console
  Bullet.console = true

  # Add warnings to footer (useful for development)
  Bullet.add_footer = true if Rails.env.development?

  # ============================================================================
  # Detection Settings
  # ============================================================================

  # Detect N+1 queries
  Bullet.n_plus_one_query_enable = true

  # Detect unused eager loading
  Bullet.unused_eager_loading_enable = true

  # Detect unnecessary count queries
  Bullet.counter_cache_enable = true

  # ============================================================================
  # Whitelist (Skip specific queries)
  # ============================================================================

  # Add whitelisted associations if needed
  # Bullet.add_whitelist(type: :n_plus_one_query, class_name: "User", association: :gifs)
end
