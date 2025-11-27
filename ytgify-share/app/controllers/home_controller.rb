class HomeController < ApplicationController
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
                            .includes(:user, :hashtags),
                        page: params[:page], items: 20)

    respond_to do |format|
      format.html
      format.turbo_stream
    end
  end
end
