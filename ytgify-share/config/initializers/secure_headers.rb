# Secure Headers Configuration
# Additional security headers beyond Content Security Policy
#
# Documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers

Rails.application.config.action_dispatch.default_headers.merge!(
  {
    # ============================================================================
    # X-Frame-Options
    # ============================================================================
    # Prevent clickjacking by not allowing the site to be framed
    'X-Frame-Options' => 'DENY',

    # ============================================================================
    # X-Content-Type-Options
    # ============================================================================
    # Prevent MIME type sniffing
    'X-Content-Type-Options' => 'nosniff',

    # ============================================================================
    # X-XSS-Protection
    # ============================================================================
    # Enable browser's XSS filter (legacy browsers)
    # Note: Modern browsers rely on CSP instead
    'X-XSS-Protection' => '1; mode=block',

    # ============================================================================
    # Referrer-Policy
    # ============================================================================
    # Control how much referrer information is sent
    'Referrer-Policy' => 'strict-origin-when-cross-origin',

    # ============================================================================
    # Permissions-Policy (formerly Feature-Policy)
    # ============================================================================
    # Control which browser features and APIs can be used
    'Permissions-Policy' => [
      'camera=()',           # Disable camera
      'microphone=()',       # Disable microphone
      'geolocation=()',      # Disable geolocation
      'payment=()',          # Disable payment API
      'usb=()',             # Disable USB access
      'magnetometer=()',    # Disable magnetometer
      'gyroscope=()',       # Disable gyroscope
      'accelerometer=()'    # Disable accelerometer
    ].join(', ')
  }
)

# ============================================================================
# HTTP Strict Transport Security (HSTS)
# ============================================================================
# Force HTTPS for all future requests (production only)
if Rails.env.production?
  Rails.application.config.action_dispatch.default_headers.merge!(
    {
      # HSTS: Force HTTPS for 1 year, including subdomains
      'Strict-Transport-Security' => 'max-age=31536000; includeSubDomains; preload'
    }
  )
end

# ============================================================================
# Additional Security Middleware
# ============================================================================

# Ensure secure cookies in production
if Rails.env.production?
  Rails.application.config.session_store :cookie_store,
    key: '_ytgify_session',
    secure: true,           # Only send over HTTPS
    httponly: true,         # Prevent JavaScript access
    same_site: :lax         # CSRF protection
end
