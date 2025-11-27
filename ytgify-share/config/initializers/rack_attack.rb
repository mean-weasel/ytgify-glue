# Rack::Attack Configuration
# Protect the application from brute force attacks, scrapers, and other malicious traffic
#
# Documentation: https://github.com/rack/rack-attack

class Rack::Attack
  # ============================================================================
  # Safelist: Trusted IPs (allow internal traffic)
  # ============================================================================

  # Always allow requests from localhost (development/health checks)
  Rack::Attack.safelist('allow-localhost') do |req|
    req.ip == '127.0.0.1' || req.ip == '::1'
  end

  # ============================================================================
  # Blocklist: Known bad actors
  # ============================================================================

  # Block requests from specific IPs
  # Rack::Attack.blocklist('block-bad-actors') do |req|
  #   # Check against a database of blocked IPs
  #   BlockedIp.where(ip_address: req.ip).exists?
  # end

  # ============================================================================
  # Throttles: Rate limiting
  # ============================================================================

  # 1. Login Attempts - Prevent brute force
  # Limit to 5 login attempts per email per minute
  throttle('logins/email', limit: 5, period: 1.minute) do |req|
    if req.path == '/users/sign_in' && req.post?
      # Use email or IP if email isn't present
      req.params['user']&.dig('email') || req.ip
    end
  end

  # 2. API Authentication - Prevent credential stuffing
  # Limit to 5 API auth attempts per IP per minute
  throttle('api/auth/ip', limit: 5, period: 1.minute) do |req|
    if req.path.start_with?('/api/v1/auth') && (req.post? || req.put?)
      req.ip
    end
  end

  # 3. GIF Uploads - Prevent spam and abuse
  # Limit to 10 uploads per hour per authenticated user
  throttle('uploads/user', limit: 10, period: 1.hour) do |req|
    if req.path == '/gifs' && req.post?
      # Extract user ID from JWT or session
      user_id_from_request(req)
    end
  end

  # 4. GIF Upload by IP (for unauthenticated attempts)
  # Limit to 3 uploads per hour per IP
  throttle('uploads/ip', limit: 3, period: 1.hour) do |req|
    if req.path == '/gifs' && req.post?
      req.ip unless user_id_from_request(req) # Only throttle if not authenticated
    end
  end

  # 5. Search Queries - Prevent scraping
  # Limit to 30 searches per minute per IP
  throttle('search/ip', limit: 30, period: 1.minute) do |req|
    if req.path == '/search' || req.path.start_with?('/api/v1/search')
      req.ip
    end
  end

  # 6. API Requests by User - Prevent API abuse
  # Limit to 300 requests per 5 minutes per authenticated user
  throttle('api/user', limit: 300, period: 5.minutes) do |req|
    if req.path.start_with?('/api/v1/')
      user_id_from_request(req)
    end
  end

  # 7. API Requests by IP - Prevent DDoS
  # Limit to 100 requests per 5 minutes per IP
  throttle('api/ip', limit: 100, period: 5.minutes) do |req|
    if req.path.start_with?('/api/v1/')
      req.ip
    end
  end

  # 8. Registration - Prevent fake account creation
  # Limit to 3 registrations per hour per IP
  throttle('registrations/ip', limit: 3, period: 1.hour) do |req|
    if req.path == '/users' && req.post?
      req.ip
    end
  end

  # 9. Password Reset - Prevent enumeration attacks
  # Limit to 5 password reset attempts per hour per IP
  throttle('password_resets/ip', limit: 5, period: 1.hour) do |req|
    if req.path == '/users/password' && req.post?
      req.ip
    end
  end

  # 10. Comment Creation - Prevent spam
  # Limit to 10 comments per minute per user
  throttle('comments/user', limit: 10, period: 1.minute) do |req|
    if req.path.start_with?('/gifs/') && req.path.include?('/comments') && req.post?
      user_id_from_request(req)
    end
  end

  # ============================================================================
  # Response Customization
  # ============================================================================

  # Custom response when throttle limit is exceeded
  self.throttled_responder = lambda do |request|
    match_data = request.env['rack.attack.match_data']
    now = match_data[:epoch_time]

    headers = {
      'RateLimit-Limit' => match_data[:limit].to_s,
      'RateLimit-Remaining' => '0',
      'RateLimit-Reset' => (now + (match_data[:period] - now % match_data[:period])).to_s,
      'Content-Type' => 'application/json',
      'Retry-After' => match_data[:period].to_s
    }

    body = {
      error: 'Rate limit exceeded. Please try again later.',
      retry_after: match_data[:period]
    }.to_json

    [429, headers, [body]]
  end

  # Custom response when request is blocked
  self.blocklisted_responder = lambda do |_request|
    [403, { 'Content-Type' => 'application/json' }, [{ error: 'Access forbidden' }.to_json]]
  end

  # ============================================================================
  # Logging and Monitoring
  # ============================================================================

  # Log blocked requests
  ActiveSupport::Notifications.subscribe('rack.attack') do |_name, _start, _finish, _request_id, payload|
    req = payload[:request]

    if [:throttle, :blocklist].include?(req.env['rack.attack.match_type'])
      Rails.logger.warn(
        "[Rack::Attack] #{req.env['rack.attack.match_type']}: " \
        "#{req.env['rack.attack.matched']} - " \
        "IP: #{req.ip}, Path: #{req.path}"
      )
    end
  end

  # ============================================================================
  # Helper Methods
  # ============================================================================

  # Extract user ID from JWT token or session
  def self.user_id_from_request(req)
    # Try JWT first (API requests)
    if req.env['HTTP_AUTHORIZATION']&.start_with?('Bearer ')
      token = req.env['HTTP_AUTHORIZATION'].split(' ').last
      begin
        payload = JWT.decode(token, ENV.fetch('JWT_SECRET_KEY', 'changeme'), true, algorithm: 'HS256')
        return payload[0]['sub'] # User ID from JWT
      rescue JWT::DecodeError, JWT::ExpiredSignature
        nil
      end
    end

    # Fall back to session (web requests)
    req.session['warden.user.user.key']&.first&.first rescue nil
  end

  # ============================================================================
  # Cache Store Configuration
  # ============================================================================

  # Use Redis for distributed rate limiting (production)
  # In development, use memory store
  if Rails.env.production?
    Rack::Attack.cache.store = ActiveSupport::Cache::RedisCacheStore.new(
      url: ENV.fetch('REDIS_URL', 'redis://localhost:6379/0')
    )
  else
    # Memory store for development
    Rack::Attack.cache.store = ActiveSupport::Cache::MemoryStore.new
  end
end
