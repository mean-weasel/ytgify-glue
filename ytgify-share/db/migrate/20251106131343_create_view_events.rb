class CreateViewEvents < ActiveRecord::Migration[8.0]
  def change
    create_table :view_events, id: :uuid do |t|
      t.uuid :viewer_id
      t.string :viewer_type, null: false, default: 'User'
      t.uuid :gif_id, null: false
      t.string :ip_address
      t.string :user_agent
      t.string :referer
      t.integer :duration # Duration of view in seconds
      t.boolean :is_unique, default: true # First-time view by this viewer
      t.timestamps

      t.index [ :viewer_type, :viewer_id ]
      t.index :gif_id
      t.index :created_at
      t.index [ :gif_id, :created_at ]
      t.index [ :viewer_id, :gif_id, :created_at ], name: 'index_view_events_on_viewer_gif_created'
    end

    add_foreign_key :view_events, :gifs
  end
end
