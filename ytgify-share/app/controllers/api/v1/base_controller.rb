# frozen_string_literal: true

module Api
  module V1
    class BaseController < ApplicationController
      # Skip CSRF verification for API requests (if it exists)
      skip_before_action :verify_authenticity_token, raise: false

      # Use JWT authentication for API
      before_action :authenticate_user!

      # Common error handling
      rescue_from ActiveRecord::RecordNotFound, with: :record_not_found
      rescue_from ActiveRecord::RecordInvalid, with: :record_invalid
      rescue_from ActionController::ParameterMissing, with: :parameter_missing

      protected

      def current_user
        @current_user ||= begin
          if request.headers["Authorization"].present?
            # JWT authentication
            token = request.headers["Authorization"].split(" ").last
            jwt_payload = JWT.decode(token, ENV.fetch("JWT_SECRET_KEY", "changeme-in-production")).first

            # Check if token has been revoked (added to denylist)
            jti = jwt_payload["jti"]
            return nil if jti.blank? || JwtDenylist.exists?(jti: jti)

            # Load user and verify JTI matches (supports rotation on password change)
            user = User.find(jwt_payload["sub"])
            return nil if user.jti != jti

            user
          else
            # Fallback to session-based auth
            super
          end
        rescue JWT::DecodeError, JWT::ExpiredSignature
          nil
        end
      end

      def authenticate_user!
        render_unauthorized unless current_user
      end

      private

      def record_not_found(exception)
        log_api_error("RecordNotFound", exception)
        render json: {
          error: "Record not found",
          message: exception.message
        }, status: :not_found
      end

      def record_invalid(exception)
        log_api_error("RecordInvalid", exception, details: exception.record.errors.full_messages)
        render json: {
          error: "Validation failed",
          message: exception.message,
          details: exception.record.errors.full_messages
        }, status: :unprocessable_entity
      end

      def parameter_missing(exception)
        log_api_error("ParameterMissing", exception)
        render json: {
          error: "Parameter missing",
          message: exception.message
        }, status: :bad_request
      end

      # Log API errors with context for debugging
      def log_api_error(error_type, exception, details: nil)
        log_data = {
          error_type: error_type,
          message: exception.message,
          path: request.path,
          method: request.method,
          user_id: current_user&.id
        }
        log_data[:details] = details if details.present?

        Rails.logger.warn("[API Error] #{log_data.to_json}")
      end

      def render_unauthorized
        render json: {
          error: "Unauthorized",
          message: "You must be logged in to access this resource"
        }, status: :unauthorized
      end

      def render_forbidden
        render json: {
          error: "Forbidden",
          message: "You do not have permission to access this resource"
        }, status: :forbidden
      end

      # Standardized error response helper for consistent API error format
      # @param error [String] Error type (e.g., "Validation failed", "Not found")
      # @param message [String] Human-readable error message
      # @param details [Array] Optional array of specific error details
      # @param status [Symbol] HTTP status code
      # @param log [Boolean] Whether to log this error (default: true)
      def render_error(error:, message:, status:, details: [], log: true)
        if log
          log_data = {
            error_type: error,
            message: message,
            path: request.path,
            method: request.method,
            user_id: current_user&.id,
            status: status
          }
          log_data[:details] = details if details.present?
          Rails.logger.warn("[API Error] #{log_data.to_json}")
        end

        response = { error: error, message: message }
        response[:details] = details if details.present?
        render json: response, status: status
      end
    end
  end
end
