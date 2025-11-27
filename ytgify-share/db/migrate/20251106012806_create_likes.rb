class CreateLikes < ActiveRecord::Migration[8.0]
  def change
    create_table :likes, id: :uuid do |t|
      t.uuid :user_id, null: false
      t.uuid :gif_id, null: false

      t.timestamps
    end

    add_foreign_key :likes, :users
    add_foreign_key :likes, :gifs
    add_index :likes, [:user_id, :gif_id], unique: true
    add_index :likes, :gif_id
    add_index :likes, :created_at
  end
end
