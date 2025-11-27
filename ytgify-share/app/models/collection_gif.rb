# frozen_string_literal: true

class CollectionGif < ApplicationRecord
  # Associations
  belongs_to :collection, counter_cache: :gifs_count
  belongs_to :gif

  # Validations
  validates :collection_id, presence: true
  validates :gif_id, presence: true
  validates :gif_id, uniqueness: { scope: :collection_id }
  validates :position, numericality: { greater_than_or_equal_to: 0 }

  # Callbacks
  before_validation :set_default_position, on: :create
  after_create :create_notification

  private

  def set_default_position
    return if position.present?
    max_position = collection.collection_gifs.maximum(:position) || -1
    self.position = max_position + 1
  end

  def create_notification
    NotificationService.create_collection_add_notification(self)
  rescue => e
    Rails.logger.error "Failed to create collection add notification: #{e.message}"
  end
end
