# frozen_string_literal: true

module Api
  module V1
    class CollectionsController < BaseController
      skip_before_action :authenticate_user!, only: [ :index, :show ]
      before_action :set_collection, only: [ :show, :update, :destroy, :add_gif, :remove_gif, :reorder ]
      before_action :authorize_collection!, only: [ :update, :destroy, :add_gif, :remove_gif, :reorder ]

      # GET /api/v1/collections
      # GET /api/v1/users/:user_id/collections
      def index
        if params[:user_id]
          user = User.find(params[:user_id])
          @collections = user.collections
          @collections = @collections.public_collections unless user == current_user
        else
          authenticate_user!
          @collections = current_user.collections
        end

        @collections = @collections.recent
                                   .offset(offset)
                                   .limit(per_page)

        render json: {
          collections: @collections.as_json(
            only: [ :id, :name, :description, :is_public, :gifs_count, :created_at, :updated_at ],
            include: { user: { only: [ :id, :username, :display_name, :is_verified ] } }
          ),
          pagination: pagination_meta(@collections.count)
        }
      end

      # GET /api/v1/collections/:id
      def show
        unless @collection.visible_to?(current_user)
          return render_error(
            error: "Forbidden",
            message: "This collection is private",
            status: :forbidden
          )
        end

        @gifs = @collection.gifs
                          .not_deleted
                          .offset(offset)
                          .limit(per_page)

        render json: {
          collection: @collection.as_json(
            only: [ :id, :name, :description, :is_public, :gifs_count, :created_at, :updated_at ],
            include: { user: { only: [ :id, :username, :display_name, :is_verified ] } }
          ),
          gifs: @gifs,
          pagination: pagination_meta(@gifs.count)
        }
      end

      # POST /api/v1/collections
      def create
        @collection = current_user.collections.build(collection_params)

        if @collection.save
          render json: @collection, status: :created
        else
          render_error(
            error: "Validation failed",
            message: "Collection creation failed",
            details: @collection.errors.full_messages,
            status: :unprocessable_entity
          )
        end
      end

      # PATCH /api/v1/collections/:id
      def update
        if @collection.update(collection_params)
          render json: @collection
        else
          render_error(
            error: "Validation failed",
            message: "Collection update failed",
            details: @collection.errors.full_messages,
            status: :unprocessable_entity
          )
        end
      end

      # DELETE /api/v1/collections/:id
      def destroy
        @collection.destroy
        head :no_content
      end

      # POST /api/v1/collections/:id/add_gif
      def add_gif
        gif = Gif.find(params[:gif_id])

        if @collection.add_gif(gif)
          render json: {
            message: "GIF added to collection",
            collection: @collection,
            gifs_count: @collection.reload.gifs_count
          }
        else
          render_error(
            error: "Validation failed",
            message: "GIF is already in this collection",
            status: :unprocessable_entity
          )
        end
      end

      # DELETE /api/v1/collections/:id/remove_gif/:gif_id
      def remove_gif
        if @collection.remove_gif(Gif.find(params[:gif_id]))
          render json: {
            message: "GIF removed from collection",
            gifs_count: @collection.reload.gifs_count
          }
        else
          render_error(
            error: "Not found",
            message: "GIF is not in this collection",
            status: :not_found
          )
        end
      end

      # PATCH /api/v1/collections/:id/reorder
      def reorder
        @collection.reorder_gifs(params[:gif_ids])
        render json: { message: "Collection reordered" }
      end

      private

      def set_collection
        @collection = Collection.find(params[:id])
      end

      def authorize_collection!
        render_forbidden unless @collection.user == current_user
      end

      def collection_params
        params.require(:collection).permit(:name, :description, :is_public)
      end

      def page
        [ params[:page]&.to_i || 1, 1 ].max
      end

      def per_page
        [ [ params[:per_page]&.to_i || 20, 1 ].max, 100 ].min
      end

      def offset
        (page - 1) * per_page
      end

      def pagination_meta(total)
        {
          page: page,
          per_page: per_page,
          total: total
        }
      end
    end
  end
end
