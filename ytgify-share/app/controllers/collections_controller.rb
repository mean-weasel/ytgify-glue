class CollectionsController < ApplicationController
  before_action :authenticate_user!, except: [ :index, :show ]
  before_action :set_collection, only: [ :show, :edit, :update, :destroy, :add_gif, :remove_gif ]
  before_action :authorize_collection!, only: [ :edit, :update, :destroy, :add_gif, :remove_gif ]

  def index
    @pagy, @collections = pagy(Collection.where(is_public: true)
                                         .includes(:user)
                                         .order(created_at: :desc),
                                page: params[:page], items: 20)
  end

  def show
    # Check privacy
    unless can_view_collection?
      redirect_to collections_path, alert: "You don't have permission to view this collection."
      return
    end

    @pagy, @gifs = pagy(@collection.gifs
                                   .includes(:user, :hashtags)
                                   .order(created_at: :desc),
                        page: params[:page], items: 20)
  end

  def new
    @collection = current_user.collections.build
  end

  def create
    @collection = current_user.collections.build(collection_params)

    if @collection.save
      redirect_to @collection, notice: "Collection created successfully!"
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @collection.update(collection_params)
      redirect_to @collection, notice: "Collection updated successfully!"
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @collection.destroy
    redirect_to user_path(current_user.username, tab: "collections"), notice: "Collection deleted."
  end

  # Add a GIF to the collection
  def add_gif
    gif = Gif.find(params[:gif_id])

    if @collection.gifs.include?(gif)
      render json: { error: "GIF already in collection" }, status: :unprocessable_entity
    else
      @collection.gifs << gif

      respond_to do |format|
        format.turbo_stream do
          render turbo_stream: turbo_stream.replace(
            "collection_button_#{gif.id}",
            partial: "collections/add_button",
            locals: { gif: gif, in_collection: true }
          )
        end
        format.json { render json: { success: true } }
        format.html { redirect_back fallback_location: @collection, notice: "GIF added to collection" }
      end
    end
  end

  # Remove a GIF from the collection
  def remove_gif
    gif = Gif.find(params[:gif_id])
    @collection.gifs.delete(gif)

    respond_to do |format|
      format.turbo_stream do
        render turbo_stream: turbo_stream.remove("gif_#{gif.id}")
      end
      format.json { render json: { success: true } }
      format.html { redirect_back fallback_location: @collection, notice: "GIF removed from collection" }
    end
  end

  private

  def set_collection
    @collection = Collection.find(params[:id])
  end

  def authorize_collection!
    unless current_user == @collection.user
      redirect_to collections_path, alert: "You're not authorized to perform this action."
    end
  end

  def can_view_collection?
    @collection.is_public ||
    (user_signed_in? && current_user == @collection.user)
  end

  def collection_params
    params.require(:collection).permit(:name, :description, :is_public)
  end
end
