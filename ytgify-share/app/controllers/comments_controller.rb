class CommentsController < ApplicationController
  include ActionView::RecordIdentifier

  before_action :authenticate_user!
  before_action :set_gif, only: [ :create ]
  before_action :set_comment, only: [ :edit, :update, :destroy ]
  before_action :authorize_comment_owner!, only: [ :edit, :update ]
  before_action :authorize_comment_or_gif_owner!, only: [ :destroy ]

  def create
    @comment = @gif.comments.build(comment_params)
    @comment.user = current_user

    # Check if this is a reply
    is_reply = @comment.parent_comment_id.present?
    @parent_comment = Comment.find(@comment.parent_comment_id) if is_reply

    respond_to do |format|
      if @comment.save
        format.turbo_stream do
          streams = []

          if is_reply
            # Prepend reply to parent's reply list
            streams << turbo_stream.prepend(
              "replies_#{@parent_comment.id}",
              partial: "comments/comment",
              locals: { comment: @comment }
            )
            # Clear reply form
            streams << turbo_stream.replace(
              "reply_form_#{@parent_comment.id}",
              html: ""
            )
            # Update parent reply count
            streams << turbo_stream.replace(
              "reply_count_#{@parent_comment.id}",
              html: "<span class='text-sm text-gray-600'>#{@parent_comment.reload.reply_count} #{@parent_comment.reply_count == 1 ? 'reply' : 'replies'}</span>"
            )
          else
            # Original top-level comment logic
            streams << turbo_stream.prepend(
              "comments",
              partial: "comments/comment",
              locals: { comment: @comment }
            )
            streams << turbo_stream.replace(
              "new_comment",
              partial: "comments/form",
              locals: { gif: @gif, comment: nil }
            )
          end

          # Always update gif comment count
          streams << turbo_stream.replace(
            "comment_count_#{@gif.id}",
            partial: "comments/count",
            locals: { gif: @gif.reload }
          )
          streams << turbo_stream.replace(
            "comment_count_header_#{@gif.id}",
            html: "<span id='comment_count_header_#{@gif.id}' class='text-gray-600'>(#{@gif.reload.comment_count})</span>"
          )

          render turbo_stream: streams
        end
        format.html { redirect_to @gif, notice: "Comment posted successfully!" }
      else
        format.turbo_stream do
          if is_reply
            render turbo_stream: turbo_stream.replace(
              "reply_form_#{@parent_comment.id}",
              partial: "comments/reply_form",
              locals: { gif: @gif, parent_comment: @parent_comment, comment: @comment }
            ), status: :unprocessable_entity
          else
            render turbo_stream: turbo_stream.replace(
              "new_comment",
              partial: "comments/form",
              locals: { gif: @gif, comment: @comment }
            ), status: :unprocessable_entity
          end
        end
        format.html {
          redirect_to @gif,
          alert: "Failed to post comment: #{@comment.errors.full_messages.to_sentence}"
        }
      end
    end
  end

  def edit
    respond_to do |format|
      format.turbo_stream do
        render turbo_stream: turbo_stream.replace(
          dom_id(@comment),
          partial: "comments/edit_form",
          locals: { comment: @comment }
        )
      end
      format.html { redirect_to @gif }
    end
  end

  def update
    respond_to do |format|
      if @comment.update(comment_params)
        format.turbo_stream do
          render turbo_stream: turbo_stream.replace(
            dom_id(@comment),
            partial: "comments/comment",
            locals: { comment: @comment.reload }
          )
        end
        format.json do
          render json: {
            message: "Comment updated successfully",
            comment: {
              id: @comment.id,
              content: @comment.content,
              updated_at: @comment.updated_at
            }
          }, status: :ok
        end
        format.html { redirect_to @gif, notice: "Comment updated successfully!" }
      else
        format.turbo_stream do
          render turbo_stream: turbo_stream.replace(
            dom_id(@comment),
            partial: "comments/edit_form",
            locals: { comment: @comment }
          ), status: :unprocessable_entity
        end
        format.json do
          render json: {
            error: "Comment update failed",
            details: @comment.errors.full_messages
          }, status: :unprocessable_entity
        end
        format.html { redirect_to @gif, alert: "Failed to update comment: #{@comment.errors.full_messages.to_sentence}" }
      end
    end
  end

  def destroy
    @comment.soft_delete!

    respond_to do |format|
      format.turbo_stream do
        render turbo_stream: [
          # Remove the comment
          turbo_stream.remove(@comment),
          # Update comment count in stats bar
          turbo_stream.replace(
            "comment_count_#{@gif.id}",
            partial: "comments/count",
            locals: { gif: @gif.reload }
          ),
          # Update comment count in section header
          turbo_stream.replace(
            "comment_count_header_#{@gif.id}",
            html: "<span id='comment_count_header_#{@gif.id}' class='text-gray-600'>(#{@gif.reload.comment_count})</span>"
          )
        ]
      end
      format.html { redirect_to @gif, notice: "Comment deleted successfully." }
    end
  end

  private

  def set_gif
    @gif = Gif.find(params[:gif_id])
  end

  def set_comment
    @comment = Comment.find(params[:id])
    @gif = @comment.gif
  rescue ActiveRecord::RecordNotFound
    respond_to do |format|
      format.turbo_stream { head :not_found }
      format.json { render json: { error: "Comment not found" }, status: :not_found }
      format.html { redirect_to root_path, alert: "Comment not found" }
    end
  end

  def authorize_comment_owner!
    return if current_user == @comment.user

    respond_to do |format|
      format.turbo_stream { head :forbidden }
      format.json { render json: { error: "Not authorized" }, status: :forbidden }
      format.html { redirect_to @gif, alert: "You're not authorized to perform this action." }
    end
  end

  def authorize_comment_or_gif_owner!
    return if current_user == @comment.user || current_user == @gif.user

    respond_to do |format|
      format.turbo_stream { head :forbidden }
      format.json { render json: { error: "Not authorized" }, status: :forbidden }
      format.html { redirect_to @gif, alert: "You're not authorized to delete this comment." }
    end
  end

  def comment_params
    params.require(:comment).permit(:content, :parent_comment_id)
  end
end
