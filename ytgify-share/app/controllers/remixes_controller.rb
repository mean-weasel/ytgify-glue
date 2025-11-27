class RemixesController < ApplicationController
  before_action :authenticate_user!
  before_action :set_source_gif
  before_action :verify_remix_permissions

  # GET /gifs/:id/remix
  def new
    @source_gif = Gif.not_deleted.find(params[:id])
    @remix = current_user.gifs.build(
      parent_gif_id: @source_gif.id,
      privacy: :public_access
    )

    respond_to do |format|
      format.html
      format.json { render json: @source_gif.remix_params }
    end
  end

  # POST /gifs/:id/create_remix
  def create
    # Parse text overlay data from params
    text_overlay = parse_text_overlay_data

    # Build new GIF record
    @remix = current_user.gifs.build(remix_params.merge(
      parent_gif_id: @source_gif.id,
      is_remix: true,
      has_text_overlay: text_overlay.present?,
      text_overlay_data: text_overlay
    ))

    if @remix.save
      # Process remix asynchronously
      RemixProcessingJob.perform_later(@remix.id, @source_gif.id)

      # Send notification to original creator
      NotificationService.create_remix_notification(@remix) if @source_gif.user != current_user

      respond_to do |format|
        format.turbo_stream do
          render turbo_stream: turbo_stream.replace(
            "remix_editor",
            partial: "remixes/success",
            locals: { remix: @remix }
          )
        end
        format.json { render json: { id: @remix.id, url: gif_path(@remix) }, status: :created }
        format.html { redirect_to @remix, notice: "Remix created! Processing..." }
      end
    else
      respond_to do |format|
        format.turbo_stream do
          render turbo_stream: turbo_stream.replace(
            "remix_form_errors",
            partial: "shared/form_errors",
            locals: { object: @remix }
          ), status: :unprocessable_entity
        end
        format.json { render json: { errors: @remix.errors }, status: :unprocessable_entity }
        format.html { render :new, status: :unprocessable_entity }
      end
    end
  end

  private

  def set_source_gif
    @source_gif = Gif.not_deleted.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    redirect_to root_path, alert: "GIF not found"
  end

  def verify_remix_permissions
    unless @source_gif.remixable_by?(current_user)
      redirect_to @source_gif, alert: "This GIF cannot be remixed"
    end
  end

  def remix_params
    params.require(:remix).permit(
      :title,
      :description,
      :privacy,
      :file,
      hashtag_names: []
    )
  end

  def parse_text_overlay_data
    return {} unless params[:remix] && params[:remix][:text_overlay_data].present?

    overlay_data = params[:remix][:text_overlay_data]

    # Expected format:
    # {
    #   text: "Example text",
    #   font_family: "Arial",
    #   font_size: 48,
    #   font_weight: "bold",
    #   color: "#ffffff",
    #   outline_color: "#000000",
    #   outline_width: 2,
    #   position: { x: 0.5, y: 0.9 }  # Relative positions (0-1)
    # }

    {
      text: overlay_data[:text]&.strip || "",
      font_family: overlay_data[:font_family] || "Arial",
      font_size: (overlay_data[:font_size]&.to_i || 48).clamp(12, 120),
      font_weight: overlay_data[:font_weight] || "bold",
      color: overlay_data[:color] || "#ffffff",
      outline_color: overlay_data[:outline_color] || "#000000",
      outline_width: (overlay_data[:outline_width]&.to_i || 2).clamp(0, 10),
      position: {
        x: (overlay_data.dig(:position, :x)&.to_f || 0.5).clamp(0, 1),
        y: (overlay_data.dig(:position, :y)&.to_f || 0.9).clamp(0, 1)
      }
    }
  end
end
