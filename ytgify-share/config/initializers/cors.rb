# Be sure to restart your server when you modify this file.

# Avoid CORS issues when API is called from the frontend app.
# Handle Cross-Origin Resource Sharing (CORS) in order to accept cross-origin Ajax requests.

# Read more: https://github.com/cyu/rack-cors

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  # Production: Restrict to specific origins only
  unless Rails.env.development?
    allow do
      # Chrome extension origins (all extension IDs use chrome-extension://)
      # Firefox extension origins (all extension IDs use moz-extension://)
      origins(
        /chrome-extension:\/\/.*/,
        /moz-extension:\/\/.*/,
        ENV.fetch('FRONTEND_URL', 'https://ytgify.com'),  # Production web app domain
        /https:\/\/ytgify\.(com|app)/  # Allow both .com and .app domains
      )

      resource '/api/*',
        headers: :any,
        methods: [:get, :post, :put, :patch, :delete, :options, :head],
        expose: ['Authorization'],
        credentials: true,  # Allow credentials with specific origins
        max_age: 3600
    end
  end

  # Development: Allow all origins for easier testing
  if Rails.env.development?
    allow do
      origins '*'

      resource '*',
        headers: :any,
        methods: [:get, :post, :put, :patch, :delete, :options, :head],
        expose: ['Authorization'],
        credentials: false,  # Must be false when using wildcard
        max_age: 3600
    end
  end
end
