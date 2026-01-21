class FollowsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_user
  before_action :prevent_self_follow

  def toggle
    follow = current_user.following_relationships.find_by(following_id: @user.id)
    is_following = false

    begin
      if follow
        follow.destroy!
        is_following = false
        message = "Successfully unfollowed #{@user.username}"
      else
        current_user.following_relationships.create!(following_id: @user.id)
        is_following = true
        message = "Successfully followed #{@user.username}"
      end

      # Reload user to get updated counter caches
      @user.reload

      respond_to do |format|
        format.turbo_stream do
          render turbo_stream: [
            turbo_stream.replace(
              "follow_button_#{@user.id}",
              partial: "follows/button",
              locals: { user: @user }
            ),
            turbo_stream.replace(
              "follower_count_#{@user.id}",
              partial: "follows/follower_count",
              locals: { user: @user }
            )
          ]
        end

        format.json do
          render json: {
            following: is_following,
            follower_count: @user.follower_count,
            following_count: @user.following_count,
            message: message
          }, status: :ok
        end

        format.html do
          redirect_back fallback_location: app_user_path(@user.username), notice: message
        end
      end
    rescue ActiveRecord::RecordInvalid => e
      respond_to do |format|
        format.turbo_stream do
          render turbo_stream: turbo_stream.replace(
            "follow_button_#{@user.id}",
            partial: "follows/button",
            locals: { user: @user, error: e.message }
          ), status: :unprocessable_entity
        end

        format.json do
          render json: { error: e.message }, status: :unprocessable_entity
        end

        format.html do
          redirect_back fallback_location: app_user_path(@user.username), alert: "Failed to update follow status"
        end
      end
    rescue => e
      Rails.logger.error "FollowsController#toggle error: #{e.message}"
      Rails.logger.error e.backtrace.join("\n")

      respond_to do |format|
        format.turbo_stream do
          render turbo_stream: turbo_stream.replace(
            "follow_button_#{@user.id}",
            partial: "follows/button",
            locals: { user: @user, error: "Something went wrong" }
          ), status: :internal_server_error
        end

        format.json do
          render json: { error: "Something went wrong" }, status: :internal_server_error
        end

        format.html do
          redirect_back fallback_location: app_user_path(@user.username), alert: "Something went wrong"
        end
      end
    end
  end

  private

  def set_user
    @user = User.find_by!(username: params[:username])
  rescue ActiveRecord::RecordNotFound
    respond_to do |format|
      format.turbo_stream { head :not_found }
      format.json { render json: { error: "User not found" }, status: :not_found }
      format.html { redirect_to root_path, alert: "User not found" }
    end
  end

  def prevent_self_follow
    return unless @user && current_user == @user

    respond_to do |format|
      format.turbo_stream { head :forbidden }
      format.json { render json: { error: "You can't follow yourself" }, status: :forbidden }
      format.html { redirect_back fallback_location: root_path, alert: "You can't follow yourself" }
    end
  end
end
