class CreateCollectionGifs < ActiveRecord::Migration[8.0]
  def change
    create_table :collection_gifs, id: :uuid do |t|
      t.uuid :collection_id, null: false
      t.uuid :gif_id, null: false
      t.integer :position, default: 0, null: false
      t.datetime :added_at, default: -> { 'CURRENT_TIMESTAMP' }

      t.index [:collection_id, :gif_id], unique: true, name: 'index_collection_gifs_unique'
      t.index :gif_id
      t.index [:collection_id, :position]
    end

    add_foreign_key :collection_gifs, :collections
    add_foreign_key :collection_gifs, :gifs
  end
end
