class CreateHashtags < ActiveRecord::Migration[8.0]
  def change
    create_table :hashtags, id: :uuid do |t|
      t.string :name, null: false
      t.string :slug, null: false
      t.integer :usage_count, default: 0, null: false

      t.timestamps
    end
    add_index :hashtags, :name, unique: true
    add_index :hashtags, :slug, unique: true
    add_index :hashtags, :usage_count
    add_index :hashtags, :created_at
  end
end
