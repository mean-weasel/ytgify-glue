class AddPerformanceIndexesToGifs < ActiveRecord::Migration[8.0]
  def change
    # Index for popular queries: ORDER BY like_count DESC, view_count DESC
    # This covers the .popular scope
    add_index :gifs, [ :like_count, :view_count ],
              order: { like_count: :desc, view_count: :desc },
              name: 'index_gifs_on_popularity'

    # Index for trending queries: WHERE created_at > X ORDER BY like_count DESC, view_count DESC
    # This covers the .trending scope
    add_index :gifs, [ :created_at, :like_count, :view_count ],
              order: { created_at: :desc, like_count: :desc, view_count: :desc },
              name: 'index_gifs_on_trending'

    # Composite index for public feed queries (most common pattern)
    # WHERE deleted_at IS NULL AND privacy = 'public_access' ORDER BY created_at DESC
    add_index :gifs, [ :deleted_at, :privacy, :created_at ],
              order: { created_at: :desc },
              name: 'index_gifs_on_public_feed'
  end
end
