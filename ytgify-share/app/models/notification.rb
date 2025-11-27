class Notification < ApplicationRecord
  belongs_to :recipient, polymorphic: true
  belongs_to :actor, polymorphic: true
  belongs_to :notifiable, polymorphic: true

  validates :action, presence: true

  # Scopes
  scope :unread, -> { where(read_at: nil) }
  scope :read, -> { where.not(read_at: nil) }
  scope :recent, -> { order(created_at: :desc) }
  scope :for_recipient, ->(recipient) { where(recipient: recipient) }

  # Mark notification as read
  def mark_as_read!
    update(read_at: Time.current) unless read?
  end

  # Check if notification is read
  def read?
    read_at.present?
  end

  # Get parsed JSON data
  def parsed_data
    return {} if data.blank?
    JSON.parse(data) rescue {}
  end

  # Set JSON data
  def set_data(hash)
    self.data = hash.to_json
  end

  # Generate notification message
  def message
    case action
    when "like"
      "#{actor_name} liked your GIF"
    when "comment"
      "#{actor_name} commented on your GIF"
    when "follow"
      "#{actor_name} started following you"
    when "collection_add"
      "#{actor_name} added your GIF to their collection"
    when "remix"
      "#{actor_name} remixed your GIF"
    else
      "#{actor_name} #{action}"
    end
  end

  private

  def actor_name
    actor.respond_to?(:username) ? actor.username : "Someone"
  end
end
