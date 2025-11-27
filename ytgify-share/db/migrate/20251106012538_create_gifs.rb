class CreateGifs < ActiveRecord::Migration[8.0]
  def change
    create_table :gifs, id: :uuid do |t|
      t.uuid :user_id, null: false
      t.string :title
      t.text :description

      # YouTube source metadata
      t.string :youtube_video_url
      t.string :youtube_video_title
      t.string :youtube_channel_name
      t.float :youtube_timestamp_start
      t.float :youtube_timestamp_end

      # GIF properties
      t.float :duration
      t.integer :fps
      t.integer :resolution_width
      t.integer :resolution_height
      t.bigint :file_size

      # Text overlay
      t.boolean :has_text_overlay, default: false
      t.jsonb :text_overlay_data

      # Remix support
      t.boolean :is_remix, default: false
      t.uuid :parent_gif_id
      t.integer :remix_count, default: 0, null: false

      # Privacy enum (0=public, 1=unlisted, 2=private)
      t.integer :privacy, default: 0, null: false

      # Engagement counters
      t.integer :view_count, default: 0, null: false
      t.integer :like_count, default: 0, null: false
      t.integer :comment_count, default: 0, null: false
      t.integer :share_count, default: 0, null: false

      # Soft delete
      t.datetime :deleted_at

      t.timestamps
    end

    add_foreign_key :gifs, :users
    add_foreign_key :gifs, :gifs, column: :parent_gif_id
    add_index :gifs, :user_id
    add_index :gifs, [:user_id, :created_at]
    add_index :gifs, :parent_gif_id
    add_index :gifs, :privacy
    add_index :gifs, :deleted_at
    add_index :gifs, :created_at
  end
end
