# frozen_string_literal: true

class Users::OmniauthCallbacksController < Devise::OmniauthCallbacksController
  # Skip CSRF verification for OmniAuth callbacks
  skip_before_action :verify_authenticity_token, only: [ :google_oauth2, :failure ]

  # Handle Google OAuth 2.0 callback
  def google_oauth2
    @user = User.from_omniauth(request.env["omniauth.auth"])

    if @user.persisted?
      flash[:notice] = I18n.t("devise.omniauth_callbacks.success", kind: "Google")
      sign_in_and_redirect @user, event: :authentication
    else
      # User couldn't be persisted, redirect to registration with OAuth data
      session["devise.google_data"] = request.env["omniauth.auth"].except(:extra)
      redirect_to new_user_registration_url, alert: @user.errors.full_messages.join("\n")
    end
  end

  # Handle OAuth failure (e.g., user cancels or error occurs)
  def failure
    redirect_to root_path, alert: "Authentication failed: #{failure_message}"
  end

  private

  def failure_message
    exception = request.env["omniauth.error"]
    if exception.respond_to?(:message)
      exception.message
    else
      params[:message] || "Unknown error"
    end
  end
end
