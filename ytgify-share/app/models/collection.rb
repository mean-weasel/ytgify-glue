# frozen_string_literal: true

class Collection < ApplicationRecord
  # Associations
  belongs_to :user
  has_many :collection_gifs, -> { order(position: :asc) }, dependent: :destroy
  has_many :gifs, through: :collection_gifs

  # Validations
  validates :user_id, presence: true
  validates :name, presence: true, length: { minimum: 1, maximum: 100 }
  validates :description, length: { maximum: 500 }, allow_blank: true
  validates :name, uniqueness: { scope: :user_id, case_sensitive: false }

  # Scopes
  scope :public_collections, -> { where(is_public: true) }
  scope :private_collections, -> { where(is_public: false) }
  scope :recent, -> { order(created_at: :desc) }
  scope :by_user, ->(user_id) { where(user_id: user_id) }
  scope :with_gifs, -> { where("gifs_count > 0") }

  # Instance methods
  def add_gif(gif, position: nil)
    return false if gifs.include?(gif)

    position ||= collection_gifs.maximum(:position).to_i + 1
    collection_gifs.create!(gif: gif, position: position)
  end

  def remove_gif(gif)
    collection_gifs.find_by(gif: gif)&.destroy
  end

  def reorder_gifs(gif_ids)
    transaction do
      gif_ids.each_with_index do |gif_id, index|
        collection_gifs.find_by(gif_id: gif_id)&.update!(position: index)
      end
    end
  end

  def visible_to?(viewer)
    is_public || user == viewer
  end
end
