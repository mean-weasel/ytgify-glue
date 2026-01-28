class ApplicationController < ActionController::Base
  # Include Pagy for pagination
  include Pagy::Backend

  # Configure Devise permitted parameters
  before_action :configure_permitted_parameters, if: :devise_controller?

  # Handle RecordNotFound for web requests
  rescue_from ActiveRecord::RecordNotFound, with: :handle_record_not_found

  protected

  def handle_record_not_found(exception)
    # Log the error with context
    Rails.logger.warn(
      "[RecordNotFound] #{exception.message} | " \
      "path=#{request.path} | " \
      "user_id=#{current_user&.id}"
    )

    respond_to do |format|
      # JSON requests get a 404 response
      format.json { render json: { error: "Record not found" }, status: :not_found }

      # Turbo Stream requests get a 404 (turbo can't follow redirects)
      format.turbo_stream { head :not_found }

      # Regular HTML requests get redirected with a flash message
      format.html do
        flash[:alert] = "The page you were looking for could not be found."
        redirect_to root_path
      end

      # Default fallback
      format.any { head :not_found }
    end
  end

  def configure_permitted_parameters
    # Permit additional parameters for sign up
    devise_parameter_sanitizer.permit(:sign_up, keys: [ :username, :display_name, :bio ])

    # Permit additional parameters for account update
    devise_parameter_sanitizer.permit(:account_update, keys: [ :username, :display_name, :bio ])
  end

  # Redirect to home page after successful sign in
  def after_sign_in_path_for(resource)
    root_path
  end
end
