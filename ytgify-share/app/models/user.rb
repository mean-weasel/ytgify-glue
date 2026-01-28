class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable, :trackable,
         :jwt_authenticatable, :omniauthable,
         jwt_revocation_strategy: JwtDenylist,
         omniauth_providers: [ :google_oauth2 ]

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
  before_update :rotate_jti_on_security_change

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

  # OmniAuth methods
  # Find or create user from OmniAuth callback (used by web app)
  def self.from_omniauth(auth)
    # First try to find by provider/uid
    user = find_by(provider: auth.provider, uid: auth.uid)
    return user if user

    # Then try to find by email and link the account
    user = find_by(email: auth.info.email)
    if user
      user.update!(provider: auth.provider, uid: auth.uid)
      return user
    end

    # Create new user
    create!(
      provider: auth.provider,
      uid: auth.uid,
      email: auth.info.email,
      username: generate_username_from_email(auth.info.email),
      display_name: auth.info.name,
      password: Devise.friendly_token[0, 20]
    )
  end

  # Find or create user from Google ID token (used by extensions API)
  def self.find_or_create_from_google(uid:, email:, name:)
    # First try to find by provider/uid
    user = find_by(provider: "google_oauth2", uid: uid)
    return user if user

    # Then try to find by email and link the account
    user = find_by(email: email)
    if user
      user.update!(provider: "google_oauth2", uid: uid)
      return user
    end

    # Create new user
    create!(
      provider: "google_oauth2",
      uid: uid,
      email: email,
      username: generate_username_from_email(email),
      display_name: name,
      password: Devise.friendly_token[0, 20]
    )
  end

  # Generate a unique username from email
  def self.generate_username_from_email(email)
    base_username = email.split("@").first.gsub(/[^a-zA-Z0-9_]/, "_")[0, 25]
    username = base_username

    # Ensure uniqueness by appending numbers if needed
    counter = 1
    while exists?(username: username)
      username = "#{base_username[0, 25 - counter.to_s.length - 1]}_#{counter}"
      counter += 1
    end

    username
  end

  # Rotate JTI to invalidate all existing tokens (logout from all devices)
  def rotate_jti!
    update!(jti: SecureRandom.uuid)
  end

  private

  def generate_jti
    self.jti ||= SecureRandom.uuid
  end

  # Automatically rotate JTI when password or email changes (security measure)
  def rotate_jti_on_security_change
    if encrypted_password_changed? || email_changed?
      self.jti = SecureRandom.uuid
    end
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
