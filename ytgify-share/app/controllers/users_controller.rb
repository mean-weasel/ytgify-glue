class UsersController < ApplicationController
  before_action :set_user
  before_action :set_tab

  def show
    case @tab
    when "gifs"
      load_user_gifs
    when "liked"
      load_liked_gifs
    when "collections"
      load_collections
    when "followers"
      load_followers
    when "following"
      load_following
    end

    respond_to do |format|
      format.html
      format.turbo_stream
    end
  end

  def followers
    @tab = "followers"
    load_followers

    respond_to do |format|
      format.html { render :show }
      format.turbo_stream
    end
  end

  def following
    @tab = "following"
    load_following

    respond_to do |format|
      format.html { render :show }
      format.turbo_stream
    end
  end

  private

  def set_user
    @user = User.find_by!(username: params[:username])
  end

  def set_tab
    @tab = params[:tab] || "gifs"
    # Validate tab to prevent errors
    @tab = "gifs" unless %w[gifs liked collections followers following].include?(@tab)
  end

  def load_user_gifs
    base_query = @user.gifs
                      .includes(:user, :hashtags)
                      .order(created_at: :desc)

    # Apply privacy filter
    base_query = base_query.where(privacy: viewable_privacy_levels)

    @pagy, @gifs = pagy(base_query, page: params[:page], items: 12)
  end

  def load_liked_gifs
    # Join through likes to maintain like timestamp ordering
    base_query = @user.liked_gifs
                      .includes(:user, :hashtags)
                      .order("likes.created_at DESC")

    # Apply privacy filter
    base_query = base_query.where(privacy: viewable_privacy_levels)

    @pagy, @gifs = pagy(base_query, page: params[:page], items: 12)
  end

  def load_collections
    base_query = @user.collections
                      .includes(:user)
                      .order(created_at: :desc)

    # Apply privacy filter for collections
    unless viewing_own_profile?
      base_query = base_query.where(is_public: true)
    end

    @pagy, @collections = pagy(base_query, page: params[:page], items: 12)
  end

  def load_followers
    @pagy, @followers = pagy(
      @user.followers.includes(:followers, :following).order("follows.created_at DESC"),
      page: params[:page],
      items: 20
    )
  end

  def load_following
    @pagy, @following = pagy(
      @user.following.includes(:followers, :following).order("follows.created_at DESC"),
      page: params[:page],
      items: 20
    )
  end

  def viewable_privacy_levels
    if viewing_own_profile?
      [ "public_access", "unlisted", "private_access" ]
    else
      [ "public_access" ]
    end
  end

  def viewing_own_profile?
    user_signed_in? && current_user == @user
  end
end
