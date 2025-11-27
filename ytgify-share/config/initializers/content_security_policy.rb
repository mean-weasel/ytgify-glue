# Content Security Policy Configuration
# Protect against XSS attacks by controlling which resources can be loaded
#
# Documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP

Rails.application.config.content_security_policy do |policy|
  # ============================================================================
  # Default Policy
  # ============================================================================

  # Default source for everything not explicitly defined
  policy.default_src :self, :https

  # ============================================================================
  # Script Sources
  # ============================================================================

  # Allow scripts from self and specific CDNs for ES modules
  policy.script_src :self,
                    :unsafe_inline, # Required for importmaps inline scripts
                    "https://esm.sh",        # GIF.js and gifuct-js CDN
                    "https://cdn.jsdelivr.net" # Backup CDN if needed

  # ============================================================================
  # Style Sources
  # ============================================================================

  # Allow styles from self and inline styles (required for Tailwind)
  policy.style_src :self,
                   :unsafe_inline # Required for Tailwind CSS utilities

  # ============================================================================
  # Image Sources
  # ============================================================================

  # Allow images from self, data URIs, and S3
  policy.img_src :self,
                 :https,
                 :data,
                 :blob, # For canvas/blob URLs in remix editor
                 "https://*.amazonaws.com" # S3 buckets

  # ============================================================================
  # Font Sources
  # ============================================================================

  # Allow fonts from self and data URIs
  policy.font_src :self,
                  :https,
                  :data

  # ============================================================================
  # Connect Sources (AJAX/Fetch/WebSocket)
  # ============================================================================

  # Allow connections to self and ActionCable
  policy.connect_src :self,
                     :https,
                     "ws://localhost:*",   # Development ActionCable
                     "wss://*.fly.dev",    # Production ActionCable (if using Fly.io)
                     "https://*.amazonaws.com", # S3 API calls
                     "https://esm.sh"      # ES module imports

  # ============================================================================
  # Media Sources
  # ============================================================================

  # Allow media from self and S3
  policy.media_src :self,
                   "https://*.amazonaws.com"

  # ============================================================================
  # Object/Embed Sources
  # ============================================================================

  # Disallow plugins (Flash, Java, etc.)
  policy.object_src :none
  policy.base_uri :self

  # ============================================================================
  # Form Actions
  # ============================================================================

  # Only allow forms to submit to self
  policy.form_action :self

  # ============================================================================
  # Frame Sources
  # ============================================================================

  # Prevent embedding in iframes (clickjacking protection)
  policy.frame_ancestors :none

  # Allow embedding content in frames from self
  policy.frame_src :self

  # ============================================================================
  # Worker Sources
  # ============================================================================

  # Allow web workers from self and blob (for GIF.js workers)
  policy.worker_src :self, :blob

  # ============================================================================
  # Upgrade Insecure Requests
  # ============================================================================

  # Upgrade HTTP requests to HTTPS in production
  # policy.upgrade_insecure_requests true if Rails.env.production?
end

# Generate nonces for inline scripts (more secure alternative to unsafe_inline)
# Rails.application.config.content_security_policy_nonce_generator = ->(request) {
#   SecureRandom.base64(16)
# }

# For importmaps, we need to use a specific nonce directives
Rails.application.config.content_security_policy_nonce_generator = ->(request) {
  request.session.id.to_s
}

Rails.application.config.content_security_policy_nonce_directives = %w[script-src]

# Report CSP violations (useful for debugging and monitoring)
# Rails.application.config.content_security_policy_report_only = false

# Environment-specific overrides
if Rails.env.development?
  # More permissive policy for development
  Rails.application.config.content_security_policy do |policy|
    policy.connect_src :self,
                       :https,
                       "http://localhost:*",
                       "ws://localhost:*",
                       "https://esm.sh",
                       "https://*.amazonaws.com"
  end
end

if Rails.env.production?
  # Stricter policy for production
  Rails.application.config.content_security_policy do |policy|
    # Add your production domain for ActionCable
    # policy.connect_src :self,
    #                    :https,
    #                    "wss://yourdomain.com",
    #                    "https://*.amazonaws.com",
    #                    "https://esm.sh"

    # Upgrade all HTTP requests to HTTPS
    policy.upgrade_insecure_requests true
  end
end
