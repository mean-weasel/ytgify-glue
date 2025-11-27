class CreateNotifications < ActiveRecord::Migration[8.0]
  def change
    create_table :notifications, id: :uuid do |t|
      t.references :recipient, polymorphic: true, type: :uuid, null: false
      t.references :actor, polymorphic: true, type: :uuid, null: false
      t.references :notifiable, polymorphic: true, type: :uuid, null: false
      t.string :action, null: false
      t.datetime :read_at
      t.text :data # JSON data for additional notification context

      t.timestamps
    end

    add_index :notifications, [:recipient_type, :recipient_id, :read_at]
    add_index :notifications, [:recipient_type, :recipient_id, :created_at]
    add_index :notifications, [:notifiable_type, :notifiable_id]
    add_index :notifications, :created_at
  end
end
