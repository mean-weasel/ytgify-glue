class ChangeActiveStorageAttachmentsRecordIdToUuid < ActiveRecord::Migration[8.0]
  def up
    # Remove existing attachments (all are invalid with record_id = 0)
    execute "DELETE FROM active_storage_attachments"

    # Remove indexes that depend on record_id
    remove_index :active_storage_attachments,
      name: :index_active_storage_attachments_uniqueness,
      if_exists: true
    remove_index :active_storage_attachments,
      name: :index_active_storage_attachments_on_blob_id,
      if_exists: true

    # Drop and recreate column as UUID
    remove_column :active_storage_attachments, :record_id
    add_column :active_storage_attachments, :record_id, :uuid, null: false

    # Recreate indexes
    add_index :active_storage_attachments, :blob_id
    add_index :active_storage_attachments,
      [ :record_type, :record_id, :name, :blob_id ],
      name: :index_active_storage_attachments_uniqueness,
      unique: true
  end

  def down
    # Remove existing attachments
    execute "DELETE FROM active_storage_attachments"

    # Remove indexes
    remove_index :active_storage_attachments,
      name: :index_active_storage_attachments_uniqueness
    remove_index :active_storage_attachments, :blob_id

    # Drop and recreate column as bigint
    remove_column :active_storage_attachments, :record_id
    add_column :active_storage_attachments, :record_id, :bigint, null: false

    # Recreate indexes
    add_index :active_storage_attachments, :blob_id
    add_index :active_storage_attachments,
      [ :record_type, :record_id, :name, :blob_id ],
      name: :index_active_storage_attachments_uniqueness,
      unique: true
  end
end
