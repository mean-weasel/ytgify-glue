class CreateCollections < ActiveRecord::Migration[8.0]
  def change
    create_table :collections, id: :uuid do |t|
      t.uuid :user_id, null: false
      t.string :name, null: false
      t.text :description
      t.boolean :is_public, default: false, null: false
      t.integer :gifs_count, default: 0, null: false
      t.timestamps

      t.index :user_id
      t.index [ :user_id, :created_at ]
      t.index :is_public
    end

    add_foreign_key :collections, :users
  end
end
