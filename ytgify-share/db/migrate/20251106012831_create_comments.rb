class CreateComments < ActiveRecord::Migration[8.0]
  def change
    create_table :comments, id: :uuid do |t|
      t.uuid :user_id, null: false
      t.uuid :gif_id, null: false
      t.text :content, null: false
      t.uuid :parent_comment_id

      # Nested comment support
      t.integer :reply_count, default: 0, null: false

      # Engagement counters
      t.integer :like_count, default: 0, null: false

      # Soft delete
      t.datetime :deleted_at

      t.timestamps
    end

    add_foreign_key :comments, :users
    add_foreign_key :comments, :gifs
    add_foreign_key :comments, :comments, column: :parent_comment_id
    add_index :comments, :user_id
    add_index :comments, :gif_id
    add_index :comments, :parent_comment_id
    add_index :comments, [ :gif_id, :created_at ]
    add_index :comments, :deleted_at
    add_index :comments, :created_at
  end
end
