# frozen_string_literal: true

class Follow < ApplicationRecord
  # Associations
  belongs_to :follower, class_name: 'User', counter_cache: :following_count
  belongs_to :following, class_name: 'User', counter_cache: :follower_count

  # Validations
  validates :follower_id, presence: true
  validates :following_id, presence: true
  validates :follower_id, uniqueness: { scope: :following_id, message: "already following this user" }
  validate :cannot_follow_self

  # Callbacks
  after_create :create_notification

  # Scopes
  scope :recent, -> { order(created_at: :desc) }
  scope :for_follower, ->(user_id) { where(follower_id: user_id) }
  scope :for_following, ->(user_id) { where(following_id: user_id) }

  # Class methods
  def self.toggle(follower, following)
    return false if follower.id == following.id

    follow = find_by(follower: follower, following: following)
    if follow
      follow.destroy
      false # now unfollowed
    else
      create!(follower: follower, following: following)
      true # now following
    end
  rescue ActiveRecord::RecordInvalid
    false
  end

  private

  def cannot_follow_self
    if follower_id.present? && follower_id == following_id
      errors.add(:follower_id, "cannot follow yourself")
    end
  end

  def create_notification
    NotificationService.create_follow_notification(self)
  rescue => e
    Rails.logger.error "Failed to create follow notification: #{e.message}"
  end
end
