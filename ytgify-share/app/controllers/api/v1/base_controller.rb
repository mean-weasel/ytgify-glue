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
          if request.headers['Authorization'].present?
            # JWT authentication
            token = request.headers['Authorization'].split(' ').last
            jwt_payload = JWT.decode(token, ENV.fetch('JWT_SECRET_KEY', 'changeme-in-production')).first
            User.find(jwt_payload['sub'])
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
        render json: {
          error: 'Record not found',
          message: exception.message
        }, status: :not_found
      end

      def record_invalid(exception)
        render json: {
          error: 'Validation failed',
          message: exception.message,
          details: exception.record.errors.full_messages
        }, status: :unprocessable_entity
      end

      def parameter_missing(exception)
        render json: {
          error: 'Parameter missing',
          message: exception.message
        }, status: :bad_request
      end

      def render_unauthorized
        render json: {
          error: 'Unauthorized',
          message: 'You must be logged in to access this resource'
        }, status: :unauthorized
      end

      def render_forbidden
        render json: {
          error: 'Forbidden',
          message: 'You do not have permission to access this resource'
        }, status: :forbidden
      end
    end
  end
end
