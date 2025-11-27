# frozen_string_literal: true

module Api
  module V1
    class FollowsController < BaseController
      before_action :set_target_user, only: [:create, :destroy]

      # POST /api/v1/users/:user_id/follow (toggle follow)
      def create
        is_following = Follow.toggle(current_user, @target_user)

        render json: {
          following: is_following,
          follower_count: @target_user.reload.follower_count,
          following_count: @target_user.following_count
        }, status: :ok
      end

      # DELETE /api/v1/users/:user_id/follow (toggle unfollow)
      alias_method :destroy, :create

      # GET /api/v1/users/:user_id/followers
      def followers
        @user = User.find(params[:user_id])
        @followers = @user.followers
                          .order('follows.created_at DESC')
                          .offset(offset)
                          .limit(per_page)

        render json: {
          followers: @followers.as_json(only: [:id, :username, :display_name, :is_verified]),
          pagination: {
            page: page,
            per_page: per_page,
            total: @user.follower_count
          }
        }
      end

      # GET /api/v1/users/:user_id/following
      def following
        @user = User.find(params[:user_id])
        @following = @user.following
                          .order('follows.created_at DESC')
                          .offset(offset)
                          .limit(per_page)

        render json: {
          following: @following.as_json(only: [:id, :username, :display_name, :is_verified]),
          pagination: {
            page: page,
            per_page: per_page,
            total: @user.following_count
          }
        }
      end

      private

      def set_target_user
        @target_user = User.find(params[:user_id])

        if @target_user == current_user
          render json: { error: 'Cannot follow yourself' }, status: :unprocessable_entity
        end
      end

      def page
        [params[:page]&.to_i || 1, 1].max
      end

      def per_page
        [[params[:per_page]&.to_i || 20, 1].max, 100].min
      end

      def offset
        (page - 1) * per_page
      end
    end
  end
end
