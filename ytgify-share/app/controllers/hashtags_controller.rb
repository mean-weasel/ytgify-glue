class HashtagsController < ApplicationController
  def index
    # Determine sort order
    sort_order = params[:sort] || "alphabetical"

    base_query = Hashtag.all

    case sort_order
    when "popular"
      base_query = base_query.order(usage_count: :desc, name: :asc)
    when "recent"
      base_query = base_query.order(created_at: :desc)
    else # alphabetical
      base_query = base_query.order(name: :asc)
    end

    @pagy, @hashtags = pagy(base_query, page: params[:page], items: 30)

    respond_to do |format|
      format.html
      format.turbo_stream
    end
  end

  def trending
    # Cache trending hashtags for 15 minutes
    @trending_hashtags = Rails.cache.fetch("trending_hashtags", expires_in: 15.minutes) do
      Hashtag.trending.limit(50).to_a
    end

    @pagy, @hashtags = pagy_array(@trending_hashtags, page: params[:page], items: 20)

    respond_to do |format|
      format.html
      format.turbo_stream
    end
  end

  def show
    @hashtag = Hashtag.find_by!(name: params[:name])

    @pagy, @gifs = pagy(@hashtag.gifs
                                .public_only
                                .with_attached_file
                                .includes(:user, :hashtags)
                                .order(created_at: :desc),
                        page: params[:page], items: 20)
  end
end
