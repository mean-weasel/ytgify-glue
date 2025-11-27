class CreateGifHashtags < ActiveRecord::Migration[8.0]
  def change
    create_table :gif_hashtags, id: :uuid do |t|
      t.uuid :gif_id, null: false
      t.uuid :hashtag_id, null: false

      t.timestamps

      t.index [:gif_id, :hashtag_id], unique: true, name: 'index_gif_hashtags_unique'
      t.index :hashtag_id
      t.index :created_at
    end

    add_foreign_key :gif_hashtags, :gifs
    add_foreign_key :gif_hashtags, :hashtags
  end
end
