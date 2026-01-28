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
        # Extract token and add JTI to denylist
        if request.headers["Authorization"].present?
          token = request.headers["Authorization"].split(" ").last
          begin
            jwt_payload = JWT.decode(token, ENV.fetch("JWT_SECRET_KEY", "changeme-in-production")).first
            jti = jwt_payload["jti"]
            exp = Time.at(jwt_payload["exp"])

            # Add to denylist (will be rejected on future requests)
            JwtDenylist.create!(jti: jti, exp: exp) if jti.present?
          rescue JWT::DecodeError, JWT::ExpiredSignature
            # Token already invalid, nothing to revoke
          end
        end

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
        client_id = ENV.fetch("GOOGLE_CLIENT_ID", nil)

        if client_id.blank?
          Rails.logger.error("GOOGLE_CLIENT_ID not configured")
          return nil
        end

        # In development/test, use manual JWT decoding to avoid SSL issues
        # In production, use full Google verification
        if Rails.env.development? || Rails.env.test?
          verify_google_id_token_development(id_token, client_id)
        else
          verify_google_id_token_production(id_token, client_id)
        end
      end

      # Development: decode JWT without signature verification (trusts Google's auth flow)
      def verify_google_id_token_development(id_token, client_id)
        # Decode without verification (safe in dev because token comes from Google's OAuth flow)
        payload = JWT.decode(id_token, nil, false).first

        # Basic validation
        unless payload["iss"] == "https://accounts.google.com" || payload["iss"] == "accounts.google.com"
          Rails.logger.error("Invalid Google token issuer: #{payload['iss']}")
          return nil
        end

        unless payload["aud"] == client_id
          Rails.logger.error("Invalid Google token audience: #{payload['aud']} (expected #{client_id})")
          return nil
        end

        if payload["exp"].to_i < Time.now.to_i
          Rails.logger.error("Google token expired")
          return nil
        end

        unless payload["email_verified"]
          Rails.logger.warn("Google email not verified for: #{payload['email']}")
          return nil
        end

        Rails.logger.info("Google token verified (dev mode) for: #{payload['email']}")
        payload
      rescue JWT::DecodeError => e
        Rails.logger.error("Failed to decode Google token: #{e.message}")
        nil
      end

      # Production: use full Google verification with signature check
      def verify_google_id_token_production(id_token, client_id)
        require "googleauth/id_tokens"

        payload = Google::Auth::IDTokens.verify_oidc(
          id_token,
          aud: client_id
        )

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
