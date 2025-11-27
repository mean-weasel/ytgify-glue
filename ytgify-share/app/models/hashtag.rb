class Hashtag < ApplicationRecord
  # Associations
  has_many :gif_hashtags, dependent: :destroy
  has_many :gifs, through: :gif_hashtags

  # Validations
  validates :name, presence: true, uniqueness: { case_sensitive: false }
  validates :slug, presence: true, uniqueness: { case_sensitive: false }
  validates :usage_count, numericality: { greater_than_or_equal_to: 0 }

  # Callbacks
  before_validation :generate_slug, if: :name_changed?
  before_validation :normalize_name

  # Cache invalidation callbacks
  after_commit :clear_hashtag_caches, on: [ :create, :update, :destroy ]

  # Scopes
  scope :trending, -> { where("usage_count > 0").order(usage_count: :desc, name: :asc) }
  scope :recent, -> { order(created_at: :desc) }
  scope :popular, -> { order(usage_count: :desc, name: :asc) }
  scope :alphabetical, -> { order(name: :asc) }

  # Class methods
  def self.find_or_create_by_name(name)
    normalized = name.to_s.strip.downcase.delete_prefix("#")
    return nil if normalized.blank?

    slug = normalized.parameterize
    find_or_create_by!(slug: slug) do |hashtag|
      hashtag.name = normalized
    end
  rescue ActiveRecord::RecordInvalid
    find_by(slug: slug)
  end

  def self.parse_from_text(text)
    return [] if text.blank?

    # Match hashtags: #word or #word_with_underscores
    text.scan(/#(\w+)/).flatten.uniq.map do |tag_name|
      find_or_create_by_name(tag_name)
    end.compact
  end

  # Instance methods
  def increment_usage!
    increment!(:usage_count)
  end

  def decrement_usage!
    decrement!(:usage_count) if usage_count > 0
  end

  def to_s
    "##{name}"
  end

  private

  def generate_slug
    self.slug = name.to_s.strip.downcase.parameterize
  end

  def normalize_name
    self.name = name.to_s.strip.downcase.delete_prefix("#") if name.present?
  end

  def clear_hashtag_caches
    # Clear trending hashtag caches when hashtags are created/updated/deleted
    FeedService.clear_hashtag_cache
  rescue => e
    # Log error but don't fail the transaction
    Rails.logger.error "Failed to clear hashtag caches: #{e.message}"
  end
end
