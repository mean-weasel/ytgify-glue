class HomeController < ApplicationController
  before_action :authenticate_user!, only: [ :following ]

  def feed
    if user_signed_in?
      # Personalized feed using FeedService
      gifs = FeedService.generate_for_user(current_user, page: params[:page] || 1, per_page: 20)
      @pagy, @gifs = pagy_array(gifs, page: params[:page], items: 20)
    else
      # Public feed for non-authenticated users
      @pagy, @gifs = pagy(Gif.not_deleted
                              .public_only
                              .recent
                              .with_attached_file
                              .includes(:user, :hashtags),
                          page: params[:page], items: 20)
    end

    respond_to do |format|
      format.html
      format.turbo_stream
    end
  end

  def trending
    @pagy, @gifs = pagy(Gif.trending
                            .not_deleted
                            .public_only
                            .with_attached_file
                            .includes(:user, :hashtags),
                        page: params[:page], items: 20)

    respond_to do |format|
      format.html
      format.turbo_stream
    end
  end

  def following
    gifs = FeedService.following(current_user, page: params[:page] || 1, per_page: 20)
    @pagy, @gifs = pagy_array(gifs, page: params[:page], items: 20)

    respond_to do |format|
      format.html
      format.turbo_stream
    end
  end
end
