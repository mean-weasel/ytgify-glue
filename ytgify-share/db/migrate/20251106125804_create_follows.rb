class CreateFollows < ActiveRecord::Migration[8.0]
  def change
    create_table :follows, id: :uuid do |t|
      t.uuid :follower_id, null: false
      t.uuid :following_id, null: false
      t.timestamps

      t.index [:follower_id, :following_id], unique: true, name: 'index_follows_on_follower_and_following'
      t.index :following_id
      t.index :created_at
    end

    add_foreign_key :follows, :users, column: :follower_id
    add_foreign_key :follows, :users, column: :following_id

    # Check constraint to prevent self-follows
    add_check_constraint :follows, "follower_id != following_id", name: "follows_no_self_follow"
  end
end
