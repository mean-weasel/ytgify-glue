# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2025_11_18_222446) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "active_storage_attachments", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.uuid "record_id", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "collection_gifs", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "collection_id", null: false
    t.uuid "gif_id", null: false
    t.integer "position", default: 0, null: false
    t.datetime "added_at", default: -> { "CURRENT_TIMESTAMP" }
    t.index ["collection_id", "gif_id"], name: "index_collection_gifs_unique", unique: true
    t.index ["collection_id", "position"], name: "index_collection_gifs_on_collection_id_and_position"
    t.index ["gif_id"], name: "index_collection_gifs_on_gif_id"
  end

  create_table "collections", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.string "name", null: false
    t.text "description"
    t.boolean "is_public", default: false, null: false
    t.integer "gifs_count", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["is_public"], name: "index_collections_on_is_public"
    t.index ["user_id", "created_at"], name: "index_collections_on_user_id_and_created_at"
    t.index ["user_id"], name: "index_collections_on_user_id"
  end

  create_table "comments", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.uuid "gif_id", null: false
    t.text "content", null: false
    t.uuid "parent_comment_id"
    t.integer "reply_count", default: 0, null: false
    t.integer "like_count", default: 0, null: false
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_at"], name: "index_comments_on_created_at"
    t.index ["deleted_at"], name: "index_comments_on_deleted_at"
    t.index ["gif_id", "created_at"], name: "index_comments_on_gif_id_and_created_at"
    t.index ["gif_id"], name: "index_comments_on_gif_id"
    t.index ["parent_comment_id"], name: "index_comments_on_parent_comment_id"
    t.index ["user_id"], name: "index_comments_on_user_id"
  end

  create_table "follows", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "follower_id", null: false
    t.uuid "following_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_at"], name: "index_follows_on_created_at"
    t.index ["follower_id", "following_id"], name: "index_follows_on_follower_and_following", unique: true
    t.index ["following_id"], name: "index_follows_on_following_id"
    t.check_constraint "follower_id <> following_id", name: "follows_no_self_follow"
  end

  create_table "gif_hashtags", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "gif_id", null: false
    t.uuid "hashtag_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_at"], name: "index_gif_hashtags_on_created_at"
    t.index ["gif_id", "hashtag_id"], name: "index_gif_hashtags_unique", unique: true
    t.index ["hashtag_id"], name: "index_gif_hashtags_on_hashtag_id"
  end

  create_table "gifs", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.string "title"
    t.text "description"
    t.string "youtube_video_url"
    t.string "youtube_video_title"
    t.string "youtube_channel_name"
    t.float "youtube_timestamp_start"
    t.float "youtube_timestamp_end"
    t.float "duration"
    t.integer "fps"
    t.integer "resolution_width"
    t.integer "resolution_height"
    t.bigint "file_size"
    t.boolean "has_text_overlay", default: false
    t.jsonb "text_overlay_data"
    t.boolean "is_remix", default: false
    t.uuid "parent_gif_id"
    t.integer "remix_count", default: 0, null: false
    t.integer "privacy", default: 0, null: false
    t.integer "view_count", default: 0, null: false
    t.integer "like_count", default: 0, null: false
    t.integer "comment_count", default: 0, null: false
    t.integer "share_count", default: 0, null: false
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_at", "like_count", "view_count"], name: "index_gifs_on_trending", order: :desc
    t.index ["created_at"], name: "index_gifs_on_created_at"
    t.index ["deleted_at", "privacy", "created_at"], name: "index_gifs_on_public_feed", order: { created_at: :desc }
    t.index ["deleted_at"], name: "index_gifs_on_deleted_at"
    t.index ["like_count", "view_count"], name: "index_gifs_on_popularity", order: :desc
    t.index ["parent_gif_id"], name: "index_gifs_on_parent_gif_id"
    t.index ["privacy"], name: "index_gifs_on_privacy"
    t.index ["user_id", "created_at"], name: "index_gifs_on_user_id_and_created_at"
    t.index ["user_id"], name: "index_gifs_on_user_id"
  end

  create_table "hashtags", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "name", null: false
    t.string "slug", null: false
    t.integer "usage_count", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_at"], name: "index_hashtags_on_created_at"
    t.index ["name"], name: "index_hashtags_on_name", unique: true
    t.index ["slug"], name: "index_hashtags_on_slug", unique: true
    t.index ["usage_count"], name: "index_hashtags_on_usage_count"
  end

  create_table "jwt_denylists", force: :cascade do |t|
    t.string "jti"
    t.datetime "exp"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["jti"], name: "index_jwt_denylists_on_jti", unique: true
  end

  create_table "likes", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.uuid "gif_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_at"], name: "index_likes_on_created_at"
    t.index ["gif_id"], name: "index_likes_on_gif_id"
    t.index ["user_id", "gif_id"], name: "index_likes_on_user_id_and_gif_id", unique: true
  end

  create_table "notifications", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "recipient_type", null: false
    t.uuid "recipient_id", null: false
    t.string "actor_type", null: false
    t.uuid "actor_id", null: false
    t.string "notifiable_type", null: false
    t.uuid "notifiable_id", null: false
    t.string "action", null: false
    t.datetime "read_at"
    t.text "data"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["actor_type", "actor_id"], name: "index_notifications_on_actor"
    t.index ["created_at"], name: "index_notifications_on_created_at"
    t.index ["notifiable_type", "notifiable_id"], name: "index_notifications_on_notifiable"
    t.index ["notifiable_type", "notifiable_id"], name: "index_notifications_on_notifiable_type_and_notifiable_id"
    t.index ["recipient_type", "recipient_id", "created_at"], name: "idx_on_recipient_type_recipient_id_created_at_b03107666b"
    t.index ["recipient_type", "recipient_id", "read_at"], name: "idx_on_recipient_type_recipient_id_read_at_50191a301d"
    t.index ["recipient_type", "recipient_id"], name: "index_notifications_on_recipient"
  end

  create_table "users", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "username", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.integer "sign_in_count", default: 0, null: false
    t.datetime "current_sign_in_at"
    t.datetime "last_sign_in_at"
    t.string "current_sign_in_ip"
    t.string "last_sign_in_ip"
    t.string "jti", null: false
    t.string "display_name"
    t.text "bio"
    t.string "website"
    t.string "twitter_handle"
    t.string "youtube_channel"
    t.boolean "is_verified", default: false
    t.integer "gifs_count", default: 0, null: false
    t.integer "total_likes_received", default: 0, null: false
    t.integer "follower_count", default: 0, null: false
    t.integer "following_count", default: 0, null: false
    t.jsonb "preferences", default: {"default_privacy" => "public", "recently_used_tags" => [], "default_upload_behavior" => "show_options"}
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["jti"], name: "index_users_on_jti", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
    t.index ["username"], name: "index_users_on_username", unique: true
  end

  create_table "view_events", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "viewer_id"
    t.string "viewer_type", default: "User", null: false
    t.uuid "gif_id", null: false
    t.string "ip_address"
    t.string "user_agent"
    t.string "referer"
    t.integer "duration"
    t.boolean "is_unique", default: true
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_at"], name: "index_view_events_on_created_at"
    t.index ["gif_id", "created_at"], name: "index_view_events_on_gif_id_and_created_at"
    t.index ["gif_id"], name: "index_view_events_on_gif_id"
    t.index ["viewer_id", "gif_id", "created_at"], name: "index_view_events_on_viewer_gif_created"
    t.index ["viewer_type", "viewer_id"], name: "index_view_events_on_viewer_type_and_viewer_id"
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "collection_gifs", "collections"
  add_foreign_key "collection_gifs", "gifs"
  add_foreign_key "collections", "users"
  add_foreign_key "comments", "comments", column: "parent_comment_id"
  add_foreign_key "comments", "gifs"
  add_foreign_key "comments", "users"
  add_foreign_key "follows", "users", column: "follower_id"
  add_foreign_key "follows", "users", column: "following_id"
  add_foreign_key "gif_hashtags", "gifs"
  add_foreign_key "gif_hashtags", "hashtags"
  add_foreign_key "gifs", "gifs", column: "parent_gif_id"
  add_foreign_key "gifs", "users"
  add_foreign_key "likes", "gifs"
  add_foreign_key "likes", "users"
  add_foreign_key "view_events", "gifs"
end
