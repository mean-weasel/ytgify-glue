class GifHashtag < ApplicationRecord
  # Associations
  belongs_to :gif, touch: true
  belongs_to :hashtag, counter_cache: :usage_count

  # Validations
  validates :gif_id, presence: true
  validates :hashtag_id, presence: true
  validates :hashtag_id, uniqueness: { scope: :gif_id }

  # Callbacks
  after_destroy :decrement_hashtag_usage

  private

  def decrement_hashtag_usage
    hashtag.decrement_usage! if hashtag
  end
end
