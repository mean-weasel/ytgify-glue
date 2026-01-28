# frozen_string_literal: true

module Api
  module V1
    class LikesController < BaseController
      # POST /api/v1/gifs/:gif_id/likes (toggle like)
      def create
        gif = Gif.find(params[:gif_id])
        existing_like = current_user.likes.find_by(gif_id: gif.id)

        if existing_like
          # Unlike (remove like)
          existing_like.destroy
          render json: {
            message: "Like removed",
            liked: false,
            like_count: gif.reload.like_count
          }, status: :ok
        else
          # Like
          like = current_user.likes.build(gif_id: gif.id)

          if like.save
            render json: {
              message: "Like added",
              liked: true,
              like_count: gif.reload.like_count
            }, status: :created
          else
            render_error(
              error: "Validation failed",
              message: "Failed to add like",
              details: like.errors.full_messages,
              status: :unprocessable_entity
            )
          end
        end
      end

      # DELETE /api/v1/gifs/:gif_id/likes/:id
      def destroy
        like = current_user.likes.find(params[:id])
        gif = like.gif

        like.destroy
        render json: {
          message: "Like removed",
          liked: false,
          like_count: gif.reload.like_count
        }, status: :ok
      end
    end
  end
end
