class ViewEvent < ApplicationRecord
  # Polymorphic association for viewer (User or anonymous session)
  belongs_to :viewer, polymorphic: true, optional: true
  belongs_to :gif

  # Validations
  validates :gif_id, presence: true
  validates :viewer_type, presence: true

  # Scopes
  scope :recent, -> { order(created_at: :desc) }
  scope :for_gif, ->(gif_id) { where(gif_id: gif_id) }
  scope :for_viewer, ->(viewer) { where(viewer: viewer) }
  scope :unique_views, -> { where(is_unique: true) }
  scope :in_period, ->(start_time, end_time) { where(created_at: start_time..end_time) }
  scope :today, -> { where('created_at >= ?', Time.current.beginning_of_day) }
  scope :this_week, -> { where('created_at >= ?', Time.current.beginning_of_week) }
  scope :this_month, -> { where('created_at >= ?', Time.current.beginning_of_month) }

  # Class methods
  def self.record_view(gif:, viewer: nil, ip_address: nil, user_agent: nil, referer: nil)
    # Determine if this is a unique view
    is_unique = if viewer
      !exists?(gif: gif, viewer: viewer, created_at: 24.hours.ago..Time.current)
    else
      !exists?(gif: gif, ip_address: ip_address, created_at: 24.hours.ago..Time.current)
    end

    view_event = create!(
      gif: gif,
      viewer: viewer,
      viewer_type: viewer ? viewer.class.name : 'Anonymous',
      ip_address: ip_address,
      user_agent: user_agent,
      referer: referer,
      is_unique: is_unique
    )

    # Increment GIF view count if unique
    gif.increment_view_count! if is_unique

    view_event
  rescue ActiveRecord::RecordInvalid => e
    Rails.logger.error "Failed to record view: #{e.message}"
    nil
  end

  # Analytics methods
  def self.unique_viewers_count(gif)
    where(gif: gif, is_unique: true).count
  end

  def self.total_views_count(gif)
    where(gif: gif).count
  end

  def self.views_by_day(gif, days: 7)
    where(gif: gif)
      .where('created_at >= ?', days.days.ago)
      .group("DATE(created_at)")
      .count
  end

  def self.top_referrers(gif, limit: 10)
    where(gif: gif)
      .where.not(referer: nil)
      .group(:referer)
      .count
      .sort_by { |_, count| -count }
      .first(limit)
      .to_h
  end
end
