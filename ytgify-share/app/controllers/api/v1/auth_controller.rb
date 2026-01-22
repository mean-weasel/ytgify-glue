# frozen_string_literal: true

module Api
  module V1
    class AuthController < BaseController
      skip_before_action :authenticate_user!, only: [ :register, :login, :google ]

      # POST /api/v1/auth/register
      def register
        user = User.new(registration_params)

        if user.save
          token = generate_jwt_token(user)
          response.set_header("Authorization", "Bearer #{token}")
          render json: {
            message: "Registration successful",
            user: user_json(user),
            token: token
          }, status: :created
        else
          render json: {
            error: "Registration failed",
            details: user.errors.full_messages
          }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/auth/login
      def login
        user = User.find_by(email: login_params[:email])

        if user&.valid_password?(login_params[:password])
          token = generate_jwt_token(user)
          response.set_header("Authorization", "Bearer #{token}")
          render json: {
            message: "Login successful",
            user: user_json(user),
            token: token
          }, status: :ok
        else
          render json: {
            error: "Invalid credentials",
            message: "Email or password is incorrect"
          }, status: :unauthorized
        end
      end

      # POST /api/v1/auth/google
      # Authenticate with Google ID token (for browser extensions)
      def google
        id_token = params[:id_token]

        if id_token.blank?
          render json: {
            error: "Missing Google ID token"
          }, status: :bad_request
          return
        end

        begin
          # Verify the Google ID token
          payload = verify_google_id_token(id_token)

          if payload.nil?
            render json: {
              error: "Invalid Google token"
            }, status: :unauthorized
            return
          end

          # Find or create user from Google data
          user = User.find_or_create_from_google(
            uid: payload["sub"],
            email: payload["email"],
            name: payload["name"] || payload["email"].split("@").first
          )

          token = generate_jwt_token(user)
          response.set_header("Authorization", "Bearer #{token}")

          render json: {
            message: "Google authentication successful",
            user: user_json(user),
            token: token
          }, status: :ok
        rescue StandardError => e
          Rails.logger.error("Google auth error: #{e.message}")
          render json: {
            error: "Google authentication failed",
            message: e.message
          }, status: :unauthorized
        end
      end

      # DELETE /api/v1/auth/logout
      def logout
        # JWT will be added to denylist via devise-jwt
        render json: { message: "Logout successful" }, status: :ok
      end

      # POST /api/v1/auth/refresh
      def refresh
        token = generate_jwt_token(current_user)
        response.set_header("Authorization", "Bearer #{token}")
        render json: {
          message: "Token refreshed",
          token: token
        }, status: :ok
      end

      # GET /api/v1/auth/me
      def me
        render json: {
          user: user_json(current_user)
        }, status: :ok
      end

      private

      def registration_params
        params.require(:user).permit(:email, :username, :password, :password_confirmation, :display_name)
      end

      def login_params
        params.require(:user).permit(:email, :password)
      end

      def generate_jwt_token(user)
        payload = {
          sub: user.id,
          jti: user.jti,
          exp: 15.minutes.from_now.to_i
        }
        JWT.encode(payload, ENV.fetch("JWT_SECRET_KEY", "changeme-in-production"))
      end

      def user_json(user)
        {
          id: user.id,
          email: user.email,
          username: user.username,
          display_name: user.display_name,
          bio: user.bio,
          avatar_url: user.avatar.attached? ? url_for(user.avatar) : nil,
          is_verified: user.is_verified,
          gifs_count: user.gifs_count,
          total_likes_received: user.total_likes_received,
          follower_count: user.follower_count,
          following_count: user.following_count,
          created_at: user.created_at,
          updated_at: user.updated_at
        }
      end

      # Verify Google ID token using Google's public keys
      def verify_google_id_token(id_token)
        require "googleauth/id_tokens"

        client_id = ENV.fetch("GOOGLE_CLIENT_ID", nil)

        if client_id.blank?
          Rails.logger.error("GOOGLE_CLIENT_ID not configured")
          return nil
        end

        # Verify the token
        payload = Google::Auth::IDTokens.verify_oidc(
          id_token,
          aud: client_id
        )

        # Verify email is verified
        unless payload["email_verified"]
          Rails.logger.warn("Google email not verified for: #{payload['email']}")
          return nil
        end

        payload
      rescue Google::Auth::IDTokens::SignatureError,
             Google::Auth::IDTokens::AudienceMismatchError,
             Google::Auth::IDTokens::ExpiredTokenError => e
        Rails.logger.error("Google token verification failed: #{e.message}")
        nil
      end
    end
  end
end
