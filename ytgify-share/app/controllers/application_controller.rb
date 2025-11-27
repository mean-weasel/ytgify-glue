class ApplicationController < ActionController::Base
  # Include Pagy for pagination
  include Pagy::Backend

  # Configure Devise permitted parameters
  before_action :configure_permitted_parameters, if: :devise_controller?

  protected

  def configure_permitted_parameters
    # Permit additional parameters for sign up
    devise_parameter_sanitizer.permit(:sign_up, keys: [:username, :display_name, :bio])

    # Permit additional parameters for account update
    devise_parameter_sanitizer.permit(:account_update, keys: [:username, :display_name, :bio])
  end

  # Redirect to home page after successful sign in
  def after_sign_in_path_for(resource)
    root_path
  end
end
