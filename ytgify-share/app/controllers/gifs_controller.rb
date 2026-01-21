class GifsController < ApplicationController
  include ActionView::RecordIdentifier

  before_action :authenticate_user!, except: [ :index, :show ]
  before_action :set_gif, only: [ :show, :edit, :update, :destroy ]
  before_action :authorize_user!, only: [ :edit, :update, :destroy ]

  def index
    @query = params[:q]

    if @query.present?
      # Search in title, description, and hashtags
      @pagy, @gifs = pagy(
        Gif.where(privacy: :public_access)
           .left_joins(:hashtags)
           .where("gifs.title ILIKE ? OR gifs.description ILIKE ? OR hashtags.name ILIKE ?",
                  "%#{@query}%", "%#{@query}%", "%#{@query}%")
           .distinct
           .includes(:user, :hashtags)
           .order(created_at: :desc),
        page: params[:page], items: 20
      )
    else
      # No search query, show recent public GIFs
      @pagy, @gifs = pagy(
        Gif.where(privacy: :public_access)
           .includes(:user, :hashtags)
           .order(created_at: :desc),
        page: params[:page], items: 20
      )
    end
  end

  def show
    # Track view event
    ViewEvent.record_view(
      gif: @gif,
      viewer: current_user,
      ip_address: request.remote_ip,
      user_agent: request.user_agent,
      referer: request.referer
    )

    @comments = @gif.comments.includes(:user).order(created_at: :desc).limit(20)
  end

  def new
    @gif = current_user.gifs.build
  end

  def create
    @gif = current_user.gifs.build(gif_params)

    if @gif.save
      # Process GIF asynchronously (thumbnail, etc.)
      # Skip in test environment (libvips not available in CI)
      GifProcessingJob.perform_later(@gif.id) if @gif.file.attached? && !Rails.env.test?

      redirect_to app_gif_path(@gif), notice: "GIF uploaded successfully!"
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    respond_to do |format|
      if @gif.update(gif_params)
        # Success - updated successfully
        format.turbo_stream do
          render turbo_stream: [
            # Replace GIF display with updated content
            turbo_stream.replace(
              dom_id(@gif),
              partial: "gifs/gif_display",
              locals: { gif: @gif.reload }
            ),
            # Optional: Show success flash message
            turbo_stream.prepend(
              "flash_messages",
              partial: "shared/flash",
              locals: { type: "notice", message: "GIF updated successfully!" }
            )
          ]
        end
        format.html { redirect_to app_gif_path(@gif), notice: "GIF updated successfully!" }
      else
        # Error - validation failed
        format.turbo_stream do
          render turbo_stream: turbo_stream.replace(
            dom_id(@gif, :edit),
            partial: "gifs/form",
            locals: { gif: @gif }
          ), status: :unprocessable_entity
        end
        format.html { render :edit, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    @gif.destroy
    redirect_to root_path, notice: "GIF deleted successfully."
  end

  private

  def set_gif
    @gif = Gif.find(params[:id])
  end

  def authorize_user!
    unless @gif.user == current_user
      redirect_to root_path, alert: "You're not authorized to perform this action."
    end
  end

  def gif_params
    params.require(:gif).permit(
      :title,
      :description,
      :youtube_video_url,
      :youtube_timestamp_start,
      :youtube_timestamp_end,
      :duration,
      :privacy,
      :file,
      hashtag_names: []
    )
  end
end
