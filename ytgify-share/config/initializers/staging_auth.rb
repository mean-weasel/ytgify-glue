# frozen_string_literal: true

# HTTP Basic Auth protection for staging environment
# Enabled when STAGING_AUTH=true is set in environment variables
#
# Required environment variables when enabled:
#   STAGING_AUTH=true
#   STAGING_USER=<username>
#   STAGING_PASSWORD=<password>
#
# Store these in Doppler (staging config) or Railway environment variables

if ENV["STAGING_AUTH"] == "true"
  # Custom middleware that skips auth for healthcheck endpoint
  class StagingAuthMiddleware
    def initialize(app)
      @app = app
      @auth = Rack::Auth::Basic.new(app, "Staging Environment") do |username, password|
        expected_user = ENV.fetch("STAGING_USER", "")
        expected_password = ENV.fetch("STAGING_PASSWORD", "")

        # Prevent timing attacks with secure_compare
        ActiveSupport::SecurityUtils.secure_compare(username, expected_user) &
          ActiveSupport::SecurityUtils.secure_compare(password, expected_password)
      end
    end

    def call(env)
      # Skip auth for healthcheck endpoint
      if env["PATH_INFO"] == "/up"
        @app.call(env)
      else
        @auth.call(env)
      end
    end
  end

  Rails.application.config.middleware.use StagingAuthMiddleware
end
