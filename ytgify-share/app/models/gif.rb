class Gif < ApplicationRecord
  # Associations
  belongs_to :user, counter_cache: true
  belongs_to :parent_gif, class_name: 'Gif', optional: true, counter_cache: :remix_count

  has_many :remixes, class_name: 'Gif', foreign_key: :parent_gif_id, dependent: :nullify
  has_many :likes, dependent: :destroy
  has_many :liking_users, through: :likes, source: :user
  has_many :comments, dependent: :destroy

  # Collection associations
  has_many :collection_gifs, dependent: :destroy
  has_many :collections, through: :collection_gifs

  # Hashtag associations
  has_many :gif_hashtags, dependent: :destroy
  has_many :hashtags, through: :gif_hashtags

  # Analytics associations
  has_many :view_events, dependent: :destroy

  # ActiveStorage attachments
  has_one_attached :file do |attachable|
    attachable.variant :thumb, resize_to_limit: [200, 200]
    attachable.variant :medium, resize_to_limit: [600, 600]
  end

  # Validations
  validates :user_id, presence: true
  validates :title, length: { maximum: 100 }
  validates :description, length: { maximum: 2000 }
  validates :privacy, presence: true
  validates :youtube_timestamp_start, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :youtube_timestamp_end, numericality: { greater_than: :youtube_timestamp_start }, allow_nil: true, if: :youtube_timestamp_start?
  validates :duration, numericality: { greater_than: 0 }, allow_nil: true
  validates :fps, numericality: { greater_than: 0, less_than_or_equal_to: 60 }, allow_nil: true

  # Enums
  enum :privacy, { public_access: 0, unlisted: 1, private_access: 2 }, prefix: :privacy

  # Scopes
  scope :not_deleted, -> { where(deleted_at: nil) }
  scope :deleted, -> { where.not(deleted_at: nil) }
  scope :public_only, -> { where(privacy: 0) }
  scope :recent, -> { order(created_at: :desc) }
  scope :popular, -> { order(like_count: :desc, view_count: :desc) }
  scope :trending, -> { where('created_at > ?', 7.days.ago).order(like_count: :desc, view_count: :desc) }
  scope :by_user, ->(user_id) { where(user_id: user_id) }
  scope :originals, -> { where(is_remix: false) }
  scope :remixes, -> { where(is_remix: true) }

  # Callbacks
  before_validation :calculate_duration, if: :youtube_timestamps_changed?
  before_save :set_remix_flag, if: :parent_gif_id_changed?

  # Cache invalidation callbacks
  after_commit :clear_feed_caches, on: [:create, :update, :destroy]

  # Instance methods
  def soft_delete!
    update(deleted_at: Time.current)
  end

  def restore!
    update(deleted_at: nil)
  end

  def deleted?
    deleted_at.present?
  end

  def increment_view_count!
    increment!(:view_count)
  end

  def increment_share_count!
    increment!(:share_count)
  end

  def liked_by?(user)
    return false unless user
    likes.exists?(user_id: user.id)
  end

  def remix_of?(gif)
    parent_gif_id == gif.id
  end

  def youtube_clip?
    youtube_video_url.present?
  end

  def has_text?
    has_text_overlay && text_overlay_data.present?
  end

  # Public URL for sharing
  def public_url
    # Will be implemented with actual domain
    "https://ytgify.com/gifs/#{id}"
  end

  # File URL
  def file_url
    return nil unless file.attached?

    # Use only_path for API responses (host added by API client if needed)
    Rails.application.routes.url_helpers.rails_blob_path(file, only_path: true)
  rescue => e
    Rails.logger.warn "Failed to generate file URL for GIF #{id}: #{e.message}"
    nil
  end

  # Thumbnail URL
  def thumbnail_url
    return nil unless file.attached?

    # For GIFs, just return the file URL
    # (Animated GIFs don't benefit from thumbnails, and variant processing can fail)
    file_url
  rescue => e
    # Fallback if variant generation fails
    Rails.logger.warn "Failed to generate thumbnail for GIF #{id}: #{e.message}"
    nil
  end

  # Check if user can remix this GIF
  def remixable_by?(user)
    # Public GIFs can be remixed by anyone (authenticated)
    return true if privacy_public_access?

    # Owner can always remix their own GIFs
    return true if user && self.user_id == user.id

    # Unlisted GIFs cannot be remixed by others
    false
  end

  # Get remix parameters for editor
  def remix_params
    {
      id: id,
      file_url: file_url,
      title: title,
      width: resolution_width || 500,
      height: resolution_height || 500,
      fps: fps || 15,
      duration: duration
    }
  end

  # Hashtag management
  def update_hashtags_from_text(text)
    new_hashtags = Hashtag.parse_from_text(text)
    self.hashtags = new_hashtags
  end

  def add_hashtag(hashtag_or_name)
    hashtag = hashtag_or_name.is_a?(Hashtag) ? hashtag_or_name : Hashtag.find_or_create_by_name(hashtag_or_name)
    return false unless hashtag
    return false if hashtags.include?(hashtag)

    hashtags << hashtag
    true
  rescue ActiveRecord::RecordInvalid
    false
  end

  def remove_hashtag(hashtag_or_name)
    hashtag = hashtag_or_name.is_a?(Hashtag) ? hashtag_or_name : Hashtag.find_by(name: hashtag_or_name.to_s.strip.downcase.delete_prefix('#'))
    return false unless hashtag

    hashtags.delete(hashtag)
  end

  def hashtag_names
    hashtags.pluck(:name)
  end

  def hashtag_names=(names)
    return if names.blank?

    tag_names = names.is_a?(Array) ? names : [names]
    tag_names = tag_names.map(&:to_s).map(&:strip).reject(&:blank?).uniq

    new_hashtags = tag_names.map do |name|
      Hashtag.find_or_create_by_name(name)
    end.compact

    self.hashtags = new_hashtags
  end

  private

  def calculate_duration
    if youtube_timestamp_start.present? && youtube_timestamp_end.present?
      self.duration = youtube_timestamp_end - youtube_timestamp_start
    end
  end

  def set_remix_flag
    self.is_remix = parent_gif_id.present?
  end

  def youtube_timestamps_changed?
    youtube_timestamp_start_changed? || youtube_timestamp_end_changed?
  end

  def clear_feed_caches
    # Clear trending and popular caches when GIFs are created/updated/deleted
    FeedService.clear_trending_cache
  rescue => e
    # Log error but don't fail the transaction
    Rails.logger.error "Failed to clear feed caches: #{e.message}"
  end
end
