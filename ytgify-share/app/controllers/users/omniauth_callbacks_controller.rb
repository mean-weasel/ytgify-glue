# frozen_string_literal: true

class Users::OmniauthCallbacksController < Devise::OmniauthCallbacksController
  # Skip CSRF verification for OmniAuth callbacks
  skip_before_action :verify_authenticity_token, only: [ :google_oauth2, :failure ]

  # Handle Google OAuth 2.0 callback
  def google_oauth2
    @user = User.from_omniauth(request.env["omniauth.auth"])

    if @user.persisted?
      # Check if this is from the browser extension
      if session["omniauth.source"] == "extension"
        extension_id = session["omniauth.extension_id"]
        session.delete("omniauth.source")
        session.delete("omniauth.extension_id")

        # Generate JWT for extension
        @jwt_token = generate_jwt_token(@user)
        @extension_id = extension_id
        @user_data = user_json(@user)

        # Sign in the user on web too
        sign_in @user, event: :authentication

        # Render extension callback page
        render "users/omniauth_callbacks/extension_callback", layout: false
      else
        flash[:notice] = I18n.t("devise.omniauth_callbacks.success", kind: "Google")
        sign_in_and_redirect @user, event: :authentication
      end
    else
      # User couldn't be persisted, redirect to registration with OAuth data
      session["devise.google_data"] = request.env["omniauth.auth"].except(:extra)
      redirect_to new_user_registration_url, alert: @user.errors.full_messages.join("\n")
    end
  end

  # Handle OAuth failure (e.g., user cancels or error occurs)
  # Must be public for skip_before_action callback
  def failure
    redirect_to root_path, alert: "Authentication failed: #{failure_message}"
  end

  private

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

  def failure_message
    exception = request.env["omniauth.error"]
    if exception.respond_to?(:message)
      exception.message
    else
      params[:message] || "Unknown error"
    end
  end
end
