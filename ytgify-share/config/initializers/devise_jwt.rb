# frozen_string_literal: true

# Validate JWT secret in production
if Rails.env.production?
  jwt_secret = ENV['JWT_SECRET_KEY']

  if jwt_secret.blank?
    raise 'FATAL: JWT_SECRET_KEY environment variable must be set in production!'
  end

  if jwt_secret == 'changeme-in-production' || jwt_secret == 'changeme'
    raise 'FATAL: JWT_SECRET_KEY cannot use default value! Generate a secure secret with: openssl rand -hex 32'
  end

  if jwt_secret.length < 32
    raise "FATAL: JWT_SECRET_KEY is too short (#{jwt_secret.length} chars). Must be at least 32 characters for security."
  end
end

Devise.setup do |config|
  config.jwt do |jwt|
    jwt.secret = ENV.fetch('JWT_SECRET_KEY', Rails.env.development? ? 'dev-secret-key-change-in-production' : nil)
    jwt.dispatch_requests = [
      ['POST', %r{^/api/v1/auth/login$}],
      ['POST', %r{^/api/v1/auth/register$}]
    ]
    jwt.revocation_requests = [
      ['DELETE', %r{^/api/v1/auth/logout$}]
    ]
    jwt.expiration_time = 15.minutes.to_i
  end
end
