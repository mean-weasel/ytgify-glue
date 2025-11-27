# frozen_string_literal: true

module Api
  module V1
    class HashtagsController < BaseController
      skip_before_action :authenticate_user!, only: [:index, :show, :trending, :search]

      # GET /api/v1/hashtags
      def index
        @hashtags = Hashtag.alphabetical
                           .offset(offset)
                           .limit(per_page)

        total = Hashtag.count

        render json: {
          hashtags: @hashtags.as_json(
            only: [:id, :name, :slug, :usage_count, :created_at]
          ),
          pagination: pagination_meta(total)
        }
      end

      # GET /api/v1/hashtags/trending
      def trending
        @hashtags = Hashtag.trending
                           .offset(offset)
                           .limit(per_page)

        total = Hashtag.where('usage_count > 0').count

        render json: {
          hashtags: @hashtags.as_json(
            only: [:id, :name, :slug, :usage_count, :created_at]
          ),
          pagination: pagination_meta(total)
        }
      end

      # GET /api/v1/hashtags/:id
      def show
        @hashtag = Hashtag.find_by!(slug: params[:id]) || Hashtag.find(params[:id])

        @gifs = @hashtag.gifs
                        .not_deleted
                        .public_only
                        .recent
                        .offset(offset)
                        .limit(per_page)

        render json: {
          hashtag: @hashtag.as_json(
            only: [:id, :name, :slug, :usage_count, :created_at]
          ),
          gifs: @gifs,
          pagination: pagination_meta(@gifs.count)
        }
      end

      # GET /api/v1/hashtags/search?q=term
      def search
        query = params[:q].to_s.strip.delete_prefix('#')
        limit = [params[:limit]&.to_i || 10, 20].min

        if query.blank?
          # Return trending hashtags when no query
          @hashtags = Rails.cache.fetch("hashtags:trending:#{limit}", expires_in: 15.minutes) do
            Hashtag.trending.limit(limit).to_a
          end
        else
          # Search by name prefix (case-insensitive)
          @hashtags = Hashtag.where('LOWER(name) LIKE ?', "#{query.downcase}%")
                             .order(usage_count: :desc, name: :asc)
                             .limit(limit)
        end

        render json: {
          hashtags: @hashtags.as_json(
            only: [:id, :name, :slug, :usage_count]
          ),
          query: query
        }
      end

      private

      def page
        [params[:page]&.to_i || 1, 1].max
      end

      def per_page
        [[params[:per_page]&.to_i || 20, 1].max, 100].min
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
