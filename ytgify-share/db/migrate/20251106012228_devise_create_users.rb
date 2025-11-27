# frozen_string_literal: true

class DeviseCreateUsers < ActiveRecord::Migration[8.0]
  def change
    create_table :users, id: :uuid do |t|
      ## Database authenticatable
      t.string :email,              null: false, default: ""
      t.string :encrypted_password, null: false, default: ""

      ## Username (unique identifier)
      t.string :username, null: false

      ## Recoverable
      t.string   :reset_password_token
      t.datetime :reset_password_sent_at

      ## Rememberable
      t.datetime :remember_created_at

      ## Trackable
      t.integer  :sign_in_count, default: 0, null: false
      t.datetime :current_sign_in_at
      t.datetime :last_sign_in_at
      t.string   :current_sign_in_ip
      t.string   :last_sign_in_ip

      ## JWT Authentication
      t.string :jti, null: false

      ## Profile fields
      t.string :display_name
      t.text :bio
      t.string :website
      t.string :twitter_handle
      t.string :youtube_channel
      t.boolean :is_verified, default: false

      ## Counter caches
      t.integer :gifs_count, default: 0, null: false
      t.integer :total_likes_received, default: 0, null: false
      t.integer :follower_count, default: 0, null: false
      t.integer :following_count, default: 0, null: false

      ## Preferences (JSONB)
      t.jsonb :preferences, default: {
        default_privacy: 'public',
        default_upload_behavior: 'show_options',
        recently_used_tags: []
      }

      t.timestamps null: false
    end

    add_index :users, :email, unique: true
    add_index :users, :username, unique: true
    add_index :users, :reset_password_token, unique: true
    add_index :users, :jti, unique: true
  end
end
