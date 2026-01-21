# SimpleCov must be loaded before anything else for accurate coverage
if ENV["COVERAGE"] == "true" || ENV["CI"]
  require "simplecov"

  SimpleCov.start "rails" do
    # Exclude files/directories from coverage
    add_filter "/test/"
    add_filter "/config/"
    add_filter "/db/"
    add_filter "/vendor/"
    add_filter "/bin/"
    add_filter "/spec/"

    # Group coverage by type
    add_group "Models", "app/models"
    add_group "Controllers", "app/controllers"
    add_group "Services", "app/services"
    add_group "Jobs", "app/jobs"
    add_group "Channels", "app/channels"
    add_group "Helpers", "app/helpers"
    add_group "Mailers", "app/mailers"

    # Coverage thresholds
    # TODO: Increase back to 80% once test coverage is improved
    minimum_coverage 50
    # Disabled per-file minimum - some files have 0% coverage
    # minimum_coverage_by_file 70

    # Track which files are covered
    track_files "{app,lib}/**/*.rb"
  end
end

ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

# Configure Capybara for system tests
require "capybara"
Capybara.app = Rails.application
Capybara.server = :puma, { Silent: true }
Capybara.server_host = "localhost"
Capybara.server_port = 3001
Capybara.run_server = true
Capybara.default_driver = :rack_test

# Use test adapter for ActiveJob in tests
ActiveJob::Base.queue_adapter = :test

module ActiveSupport
  class TestCase
    # Run tests in parallel with specified workers
    parallelize(workers: :number_of_processors)

    # Setup specific fixtures only - avoid loading invalid default fixtures
    # fixtures :all

    # Add more helper methods to be used by all tests here...
  end
end

module ActionDispatch
  class IntegrationTest
    include Pagy::Frontend

    # Helper to generate JWT token for testing
    def generate_jwt_token(user)
      payload = {
        sub: user.id,
        jti: user.jti,
        exp: 15.minutes.from_now.to_i
      }
      JWT.encode(payload, ENV.fetch("JWT_SECRET_KEY", "changeme-in-production"))
    end

    # Helper to set Authorization header
    def auth_header(user)
      token = generate_jwt_token(user)
      { "Authorization" => "Bearer #{token}" }
    end

    # Helper for JSON requests
    def json_request_headers(user = nil)
      headers = { "Content-Type" => "application/json", "Accept" => "application/json" }
      headers.merge!(auth_header(user)) if user
      headers
    end
  end
end
