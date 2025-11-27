class Like < ApplicationRecord
  # Associations
  belongs_to :user
  belongs_to :gif, counter_cache: :like_count, touch: true

  # Validations
  validates :user_id, presence: true, uniqueness: { scope: :gif_id, message: "has already liked this gif" }
  validates :gif_id, presence: true

  # Callbacks
  after_create :increment_user_likes_received
  after_create :create_notification
  after_destroy :decrement_user_likes_received

  # Scopes
  scope :recent, -> { order(created_at: :desc) }
  scope :by_user, ->(user_id) { where(user_id: user_id) }
  scope :for_gif, ->(gif_id) { where(gif_id: gif_id) }

  private

  def increment_user_likes_received
    gif.user.increment!(:total_likes_received)
  end

  def decrement_user_likes_received
    gif.user.decrement!(:total_likes_received)
  end

  def create_notification
    NotificationService.create_like_notification(self)
  rescue => e
    Rails.logger.error "Failed to create like notification: #{e.message}"
  end
end
