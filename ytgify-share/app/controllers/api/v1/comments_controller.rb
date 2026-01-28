# frozen_string_literal: true

module Api
  module V1
    class CommentsController < BaseController
      skip_before_action :authenticate_user!, only: [ :index ]
      before_action :set_comment, only: [ :update, :destroy ]
      before_action :authorize_comment_owner!, only: [ :update, :destroy ]

      # GET /api/v1/gifs/:gif_id/comments
      def index
        gif = Gif.find(params[:gif_id])
        comments = gif.comments.not_deleted.top_level.recent

        # Pagination
        page = params[:page]&.to_i || 1
        per_page = [ params[:per_page]&.to_i || 20, 100 ].min

        comments = comments.offset((page - 1) * per_page).limit(per_page)

        render json: {
          comments: comments.map { |comment| comment_json(comment, include_replies: true) },
          pagination: {
            page: page,
            per_page: per_page,
            total: gif.comments.not_deleted.top_level.count
          }
        }, status: :ok
      end

      # POST /api/v1/gifs/:gif_id/comments
      def create
        gif = Gif.find(params[:gif_id])
        comment = gif.comments.build(comment_params.merge(user_id: current_user.id))

        if comment.save
          render json: {
            message: "Comment created successfully",
            comment: comment_json(comment)
          }, status: :created
        else
          render_error(
            error: "Validation failed",
            message: "Comment creation failed",
            details: comment.errors.full_messages,
            status: :unprocessable_entity
          )
        end
      end

      # PATCH/PUT /api/v1/comments/:id
      def update
        if @comment.update(comment_update_params)
          render json: {
            message: "Comment updated successfully",
            comment: comment_json(@comment)
          }, status: :ok
        else
          render_error(
            error: "Validation failed",
            message: "Comment update failed",
            details: @comment.errors.full_messages,
            status: :unprocessable_entity
          )
        end
      end

      # DELETE /api/v1/comments/:id
      def destroy
        @comment.soft_delete!
        render json: { message: "Comment deleted successfully" }, status: :ok
      end

      private

      def set_comment
        @comment = Comment.find(params[:id])
      end

      def authorize_comment_owner!
        render_forbidden unless @comment.user_id == current_user.id
      end

      def comment_params
        params.require(:comment).permit(:content, :parent_comment_id)
      end

      def comment_update_params
        params.require(:comment).permit(:content)
      end

      def comment_json(comment, include_replies: false)
        data = {
          id: comment.id,
          content: comment.content,
          reply_count: comment.reply_count,
          like_count: comment.like_count,
          created_at: comment.created_at,
          updated_at: comment.updated_at,
          is_deleted: comment.deleted?,
          user: {
            id: comment.user.id,
            username: comment.user.username,
            display_name: comment.user.display_name,
            avatar_url: comment.user.avatar.attached? ? url_for(comment.user.avatar) : nil,
            is_verified: comment.user.is_verified
          }
        }

        if include_replies && comment.has_replies?
          data[:replies] = comment.replies.not_deleted.recent.limit(3).map { |reply| comment_json(reply) }
        end

        data
      end
    end
  end
end
