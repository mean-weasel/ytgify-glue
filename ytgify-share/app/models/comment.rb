class Comment < ApplicationRecord
  # Associations
  belongs_to :user
  belongs_to :gif, counter_cache: :comment_count, touch: true
  belongs_to :parent_comment, class_name: 'Comment', optional: true, counter_cache: :reply_count

  has_many :replies, class_name: 'Comment', foreign_key: :parent_comment_id, dependent: :destroy

  # Validations
  validates :user_id, presence: true
  validates :gif_id, presence: true
  validates :content, presence: true, length: { minimum: 1, maximum: 2000 }

  # Callbacks
  after_create :create_notification

  # Scopes
  scope :not_deleted, -> { where(deleted_at: nil) }
  scope :deleted, -> { where.not(deleted_at: nil) }
  scope :recent, -> { order(created_at: :desc) }
  scope :top_level, -> { where(parent_comment_id: nil) }
  scope :replies_to, ->(comment_id) { where(parent_comment_id: comment_id) }
  scope :for_gif, ->(gif_id) { where(gif_id: gif_id) }
  scope :by_user, ->(user_id) { where(user_id: user_id) }

  # Instance methods
  def soft_delete!
    transaction do
      update(deleted_at: Time.current, content: '[deleted]')

      # Manually decrement counters since soft delete doesn't trigger destroy callbacks
      gif.decrement!(:comment_count)
      parent_comment.decrement!(:reply_count) if parent_comment.present?
    end
  end

  def restore!
    update(deleted_at: nil)
  end

  def deleted?
    deleted_at.present?
  end

  def top_level?
    parent_comment_id.nil?
  end

  def reply?
    parent_comment_id.present?
  end

  def has_replies?
    reply_count > 0
  end

  # Get all replies in a tree structure
  def reply_tree
    replies.includes(:user, :replies)
  end

  private

  def create_notification
    NotificationService.create_comment_notification(self)
  rescue => e
    Rails.logger.error "Failed to create comment notification: #{e.message}"
  end
end
