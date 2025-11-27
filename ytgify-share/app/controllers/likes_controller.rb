class LikesController < ApplicationController
  before_action :authenticate_user!
  before_action :set_gif

  def toggle
    like = @gif.likes.find_by(user: current_user)

    if like
      like.destroy
      liked = false
    else
      @gif.likes.create!(user: current_user)
      liked = true
    end

    respond_to do |format|
      format.json { render json: { liked: liked, like_count: @gif.reload.like_count } }
      format.turbo_stream do
        render turbo_stream: turbo_stream.replace(
          "like_#{@gif.id}",
          partial: "likes/like_button",
          locals: { gif: @gif }
        )
      end
    end
  end

  private

  def set_gif
    @gif = Gif.find(params[:id])
  end
end
