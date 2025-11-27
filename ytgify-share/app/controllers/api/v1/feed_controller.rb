# frozen_string_literal: true

module Api
  module V1
    class FeedController < BaseController
      skip_before_action :authenticate_user!, only: [ :public, :trending, :recent, :popular ]

      # GET /api/v1/feed
      # Personalized feed for authenticated users
      def index
        @gifs = FeedService.generate_for_user(
          current_user,
          page: page,
          per_page: per_page
        )

        render json: {
          gifs: @gifs,
          pagination: pagination_meta(@gifs.size)
        }
      end

      # GET /api/v1/feed/public
      # Public feed for non-authenticated users
      def public
        @gifs = FeedService.generate_public(
          page: page,
          per_page: per_page
        )

        total = Gif.not_deleted.public_only.count

        render json: {
          gifs: @gifs,
          pagination: pagination_meta(total)
        }
      end

      # GET /api/v1/feed/trending
      def trending
        @gifs = FeedService.trending(
          page: page,
          per_page: per_page
        )

        # For trending, we'll estimate total to avoid expensive count
        render json: {
          gifs: @gifs,
          pagination: pagination_meta(@gifs.size)
        }
      end

      # GET /api/v1/feed/recent
      def recent
        @gifs = FeedService.recent(
          page: page,
          per_page: per_page
        )

        total = Gif.not_deleted.public_only.count

        render json: {
          gifs: @gifs,
          pagination: pagination_meta(total)
        }
      end

      # GET /api/v1/feed/popular
      def popular
        @gifs = FeedService.popular(
          page: page,
          per_page: per_page
        )

        render json: {
          gifs: @gifs,
          pagination: pagination_meta(@gifs.size)
        }
      end

      # GET /api/v1/feed/following
      # GIFs from users the current user follows
      def following
        following_ids = current_user.following.pluck(:id)

        @gifs = Gif.where(user_id: following_ids)
                   .not_deleted
                   .public_only
                   .recent
                   .offset(offset)
                   .limit(per_page)

        total = Gif.where(user_id: following_ids).not_deleted.public_only.count

        render json: {
          gifs: @gifs,
          pagination: pagination_meta(total)
        }
      end

      private

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
