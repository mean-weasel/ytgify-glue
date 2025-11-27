class User < ApplicationRecord
  include Devise::JWT::RevocationStrategies::Denylist

  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable, :trackable,
         :jwt_authenticatable, jwt_revocation_strategy: self

  # Associations
  has_one_attached :avatar
  has_many :gifs, dependent: :destroy
  has_many :likes, dependent: :destroy
  has_many :liked_gifs, through: :likes, source: :gif
  has_many :comments, dependent: :destroy

  # Follow associations
  has_many :following_relationships, class_name: "Follow",
           foreign_key: "follower_id", dependent: :destroy
  has_many :follower_relationships, class_name: "Follow",
           foreign_key: "following_id", dependent: :destroy
  has_many :following, through: :following_relationships, source: :following
  has_many :followers, through: :follower_relationships, source: :follower

  # Collection associations
  has_many :collections, dependent: :destroy

  # Notification associations
  has_many :notifications, as: :recipient, dependent: :destroy

  # Validations
  validates :username, presence: true,
                       uniqueness: { case_sensitive: false },
                       format: { with: /\A[a-zA-Z0-9_]+\z/, message: "only allows letters, numbers, and underscores" },
                       length: { minimum: 3, maximum: 30 }
  validates :email, presence: true, uniqueness: true
  validates :display_name, length: { maximum: 50 }, allow_blank: true
  validates :bio, length: { maximum: 500 }, allow_blank: true

  # Callbacks
  before_validation :generate_jti, on: :create
  before_validation :set_display_name, if: :new_record?
  after_initialize :set_default_preferences, if: :new_record?

  # Scopes
  scope :verified, -> { where(is_verified: true) }
  scope :recent, -> { order(created_at: :desc) }

  # Instance methods
  def following?(user)
    # Will be implemented when Follow model is added
    false
  end

  def avatar_url(variant: :thumb)
    return nil unless avatar.attached?

    case variant
    when :thumb
      avatar.variant(resize_to_limit: [ 100, 100 ])
    when :medium
      avatar.variant(resize_to_limit: [ 300, 300 ])
    else
      avatar
    end
  end

  # Preference getters/setters
  def default_privacy
    preferences["default_privacy"] || "public"
  end

  def default_privacy=(value)
    self.preferences = preferences.merge("default_privacy" => value)
  end

  def recently_used_tags
    preferences["recently_used_tags"] || []
  end

  def add_recent_tag(tag)
    tags = recently_used_tags
    tags.unshift(tag).uniq!
    tags = tags.first(10) # Keep only last 10
    self.preferences = preferences.merge("recently_used_tags" => tags)
    save
  end

  # Check if this user is following another user
  def following?(user)
    return false unless user
    following_relationships.exists?(following_id: user.id)
  end

  # Check if this user has liked a GIF
  def liked?(gif)
    return false unless gif
    likes.exists?(gif_id: gif.id)
  end

  # Scopes
  def self.followed_by(user)
    joins(:follower_relationships).where(follows: { follower_id: user.id })
  end

  private

  def generate_jti
    self.jti ||= SecureRandom.uuid
  end

  def set_display_name
    self.display_name ||= username
  end

  def set_default_preferences
    self.preferences ||= {
      "default_privacy" => "public",
      "default_upload_behavior" => "show_options",
      "recently_used_tags" => []
    }
  end
end
