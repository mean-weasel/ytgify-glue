# frozen_string_literal: true

module Api
  module V1
    class GifsController < BaseController
      skip_before_action :authenticate_user!, only: [ :index, :show ]
      before_action :set_gif, only: [ :show, :update, :destroy ]
      before_action :authorize_gif_owner!, only: [ :update, :destroy ]

      # GET /api/v1/gifs
      def index
        gifs = Gif.not_deleted.public_only.recent

        # Filter by user if requested
        gifs = gifs.by_user(params[:user_id]) if params[:user_id].present?

        # Filter by type
        gifs = gifs.originals if params[:type] == "original"
        gifs = gifs.remixes if params[:type] == "remix"

        # Pagination
        page = params[:page]&.to_i || 1
        per_page = [ params[:per_page]&.to_i || 20, 100 ].min

        gifs = gifs.offset((page - 1) * per_page).limit(per_page)

        render json: {
          gifs: gifs.map { |gif| gif_json(gif) },
          pagination: {
            page: page,
            per_page: per_page,
            total: Gif.not_deleted.public_only.count
          }
        }, status: :ok
      end

      # GET /api/v1/gifs/:id
      def show
        # Increment view count asynchronously
        @gif.increment_view_count! unless current_user&.id == @gif.user_id

        render json: { gif: gif_json(@gif, detailed: true) }, status: :ok
      end

      # POST /api/v1/gifs
      def create
        # Extract file from params (must attach after save with UUID primary keys)
        file_param = params.dig(:gif, :file)

        # Build GIF without file
        gif = current_user.gifs.build(gif_params.except(:file))

        if gif.save
          # Attach file AFTER save (required for UUID primary keys)
          if file_param
            gif.file.attach(file_param)
            # Queue GIF processing job only if file attached
            # Skip in test environment (libvips not available in CI)
            GifProcessingJob.perform_later(gif.id) unless Rails.env.test?
          end

          render json: {
            message: "GIF created successfully",
            gif: gif_json(gif)
          }, status: :created
        else
          render json: {
            error: "GIF creation failed",
            details: gif.errors.full_messages
          }, status: :unprocessable_entity
        end
      end

      # PATCH/PUT /api/v1/gifs/:id
      def update
        if @gif.update(gif_update_params)
          render json: {
            message: "GIF updated successfully",
            gif: gif_json(@gif)
          }, status: :ok
        else
          render json: {
            error: "GIF update failed",
            details: @gif.errors.full_messages
          }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/gifs/:id
      def destroy
        @gif.soft_delete!
        render json: { message: "GIF deleted successfully" }, status: :ok
      end

      private

      def set_gif
        @gif = Gif.find(params[:id])
      end

      def authorize_gif_owner!
        render_forbidden unless @gif.user_id == current_user.id
      end

      def gif_params
        params.require(:gif).permit(
          :title, :description, :privacy,
          :youtube_video_url, :youtube_video_title, :youtube_channel_name,
          :youtube_timestamp_start, :youtube_timestamp_end,
          :has_text_overlay, :text_overlay_data, :parent_gif_id,
          :file,
          hashtag_names: []
        )
      end

      def gif_update_params
        params.require(:gif).permit(
          :title, :description, :privacy,
          :has_text_overlay, :text_overlay_data,
          hashtag_names: []
        )
      end

      def gif_json(gif, detailed: false)
        data = {
          id: gif.id,
          title: gif.title,
          description: gif.description,
          file_url: gif.file_url,
          thumbnail_url: gif.thumbnail_url,
          privacy: gif.privacy,
          duration: gif.duration,
          fps: gif.fps,
          resolution_width: gif.resolution_width,
          resolution_height: gif.resolution_height,
          file_size: gif.file_size,
          has_text_overlay: gif.has_text_overlay,
          is_remix: gif.is_remix,
          remix_count: gif.remix_count,
          view_count: gif.view_count,
          like_count: gif.like_count,
          comment_count: gif.comment_count,
          share_count: gif.share_count,
          created_at: gif.created_at,
          updated_at: gif.updated_at,
          hashtag_names: gif.hashtag_names,
          user: {
            id: gif.user.id,
            username: gif.user.username,
            display_name: gif.user.display_name,
            avatar_url: gif.user.avatar.attached? ? url_for(gif.user.avatar) : nil,
            is_verified: gif.user.is_verified
          }
        }

        if detailed
          data.merge!({
            youtube_video_url: gif.youtube_video_url,
            youtube_video_title: gif.youtube_video_title,
            youtube_channel_name: gif.youtube_channel_name,
            youtube_timestamp_start: gif.youtube_timestamp_start,
            youtube_timestamp_end: gif.youtube_timestamp_end,
            text_overlay_data: gif.text_overlay_data,
            parent_gif_id: gif.parent_gif_id,
            liked_by_current_user: current_user ? gif.liked_by?(current_user) : false
          })
        end

        data
      end
    end
  end
end
