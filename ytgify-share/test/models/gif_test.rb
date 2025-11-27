require "test_helper"

class GifTest < ActiveSupport::TestCase
  fixtures :users, :gifs

  setup do
    @alice = users(:one)
    @bob = users(:two)
    @public_gif = gifs(:alice_public_gif)
    @bob_gif = gifs(:bob_public_gif)

    # Create private GIF for testing
    @private_gif = Gif.create!(
      user: @alice,
      title: "Private GIF",
      privacy: :private_access,
      youtube_video_url: "https://www.youtube.com/watch?v=test",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5,
      duration: 5.0,
      fps: 30,
      resolution_width: 480,
      resolution_height: 270
    )

    # Create unlisted GIF for testing
    @unlisted_gif = Gif.create!(
      user: @alice,
      title: "Unlisted GIF",
      privacy: :unlisted,
      youtube_video_url: "https://www.youtube.com/watch?v=test2",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5,
      duration: 5.0,
      fps: 30,
      resolution_width: 480,
      resolution_height: 270
    )
  end

  # ========== REMIXABLE_BY? TESTS ==========

  test "remixable_by? returns true for public gifs with authenticated user" do
    assert @public_gif.remixable_by?(@bob)
  end

  test "remixable_by? returns true for owner's public gif" do
    assert @public_gif.remixable_by?(@alice)
  end

  test "remixable_by? returns false for private gif by non-owner" do
    refute @private_gif.remixable_by?(@bob)
  end

  test "remixable_by? returns true for owner's private gif" do
    assert @private_gif.remixable_by?(@alice)
  end

  test "remixable_by? returns false for unlisted gif by non-owner" do
    refute @unlisted_gif.remixable_by?(@bob)
  end

  test "remixable_by? returns true for owner's unlisted gif" do
    assert @unlisted_gif.remixable_by?(@alice)
  end

  test "remixable_by? returns false when user is nil for private gif" do
    refute @private_gif.remixable_by?(nil)
  end

  test "remixable_by? returns true when user is nil for public gif" do
    assert @public_gif.remixable_by?(nil)
  end

  # ========== REMIX_PARAMS TESTS ==========

  test "remix_params returns correct structure" do
    params = @public_gif.remix_params

    assert_equal @public_gif.id, params[:id]
    assert_equal @public_gif.title, params[:title]
    assert_equal @public_gif.resolution_width, params[:width]
    assert_equal @public_gif.resolution_height, params[:height]
    assert_equal @public_gif.fps, params[:fps]
    assert_equal @public_gif.duration, params[:duration]
  end

  test "remix_params includes file_url" do
    params = @public_gif.remix_params
    assert params.key?(:file_url)
  end

  test "remix_params uses defaults for missing dimensions" do
    gif = Gif.create!(
      user: @alice,
      title: "Test",
      privacy: :public_access,
      youtube_video_url: "https://www.youtube.com/watch?v=test",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5,
      duration: 5.0,
      resolution_width: nil,  # Missing
      resolution_height: nil, # Missing
      fps: nil                # Missing
    )

    params = gif.remix_params

    assert_equal 500, params[:width]
    assert_equal 500, params[:height]
    assert_equal 15, params[:fps]
  end

  # ========== REMIX ASSOCIATIONS TESTS ==========

  test "gif can have a parent_gif" do
    remix = Gif.create!(
      user: @bob,
      title: "Remix",
      parent_gif: @public_gif,
      is_remix: true,
      privacy: :public_access,
      youtube_video_url: "https://www.youtube.com/watch?v=test",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5,
      duration: 5.0,
      fps: 30,
      resolution_width: 480,
      resolution_height: 270
    )

    assert_equal @public_gif, remix.parent_gif
    assert remix.is_remix
  end

  test "gif can have many remixes" do
    remix1 = Gif.create!(
      user: @bob,
      title: "Remix 1",
      parent_gif: @public_gif,
      is_remix: true,
      privacy: :public_access,
      youtube_video_url: "https://www.youtube.com/watch?v=test1",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5,
      duration: 5.0,
      fps: 30,
      resolution_width: 480,
      resolution_height: 270
    )

    remix2 = Gif.create!(
      user: @bob,
      title: "Remix 2",
      parent_gif: @public_gif,
      is_remix: true,
      privacy: :public_access,
      youtube_video_url: "https://www.youtube.com/watch?v=test2",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5,
      duration: 5.0,
      fps: 30,
      resolution_width: 480,
      resolution_height: 270
    )

    @public_gif.reload
    assert_includes @public_gif.remixes, remix1
    assert_includes @public_gif.remixes, remix2
    assert @public_gif.remixes.count >= 2
  end

  test "remix inherits nothing from parent automatically" do
    remix = Gif.create!(
      user: @bob,
      title: "Remix",
      parent_gif: @public_gif,
      is_remix: true,
      privacy: :public_access,
      youtube_video_url: "https://www.youtube.com/watch?v=test",
      youtube_video_title: "Different Title",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5,
      duration: 5.0,
      fps: 30,
      resolution_width: 480,
      resolution_height: 270
    )

    # Remix doesn't automatically inherit properties
    refute_equal @public_gif.title, remix.title
    refute_equal @public_gif.youtube_video_title, remix.youtube_video_title
  end

  # ========== TEXT OVERLAY TESTS ==========

  test "has_text? returns true when has_text_overlay and text_overlay_data present" do
    gif = Gif.create!(
      user: @alice,
      title: "Test",
      privacy: :public_access,
      has_text_overlay: true,
      text_overlay_data: { text: "Hello" },
      youtube_video_url: "https://www.youtube.com/watch?v=test",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5,
      duration: 5.0,
      fps: 30,
      resolution_width: 480,
      resolution_height: 270
    )

    assert gif.has_text?
  end

  test "has_text? returns false when has_text_overlay false" do
    gif = Gif.create!(
      user: @alice,
      title: "Test",
      privacy: :public_access,
      has_text_overlay: false,
      text_overlay_data: { text: "Hello" },
      youtube_video_url: "https://www.youtube.com/watch?v=test",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5,
      duration: 5.0,
      fps: 30,
      resolution_width: 480,
      resolution_height: 270
    )

    refute gif.has_text?
  end

  test "has_text? returns false when text_overlay_data empty" do
    gif = Gif.create!(
      user: @alice,
      title: "Test",
      privacy: :public_access,
      has_text_overlay: true,
      text_overlay_data: {},
      youtube_video_url: "https://www.youtube.com/watch?v=test",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5,
      duration: 5.0,
      fps: 30,
      resolution_width: 480,
      resolution_height: 270
    )

    refute gif.has_text?
  end

  # ========== PRIVACY TESTS ==========

  test "privacy enum works correctly" do
    assert @public_gif.privacy_public_access?
    refute @public_gif.privacy_unlisted?
    refute @public_gif.privacy_private_access?
  end

  test "unlisted gif has correct privacy" do
    assert @unlisted_gif.privacy_unlisted?
    refute @unlisted_gif.privacy_public_access?
    refute @unlisted_gif.privacy_private_access?
  end

  test "private gif has correct privacy" do
    assert @private_gif.privacy_private_access?
    refute @private_gif.privacy_public_access?
    refute @private_gif.privacy_unlisted?
  end

  # ========== VALIDATION TESTS ==========

  test "should require user" do
    gif = Gif.new(
      title: "Test",
      privacy: :public_access,
      youtube_video_url: "https://www.youtube.com/watch?v=test",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5
    )
    assert_not gif.valid?
    assert_includes gif.errors[:user_id], "can't be blank"
  end

  test "should require privacy" do
    gif = Gif.new(
      user: @alice,
      title: "Test",
      youtube_video_url: "https://www.youtube.com/watch?v=test",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5,
      privacy: nil
    )
    assert_not gif.valid?
    assert_includes gif.errors[:privacy], "can't be blank"
  end

  test "should reject title longer than 100 characters" do
    gif = Gif.new(
      user: @alice,
      title: "a" * 101,
      privacy: :public_access,
      youtube_video_url: "https://www.youtube.com/watch?v=test",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5
    )
    assert_not gif.valid?
    assert_includes gif.errors[:title], "is too long (maximum is 100 characters)"
  end

  test "should accept title at max length" do
    gif = Gif.new(
      user: @alice,
      title: "a" * 100,
      privacy: :public_access,
      youtube_video_url: "https://www.youtube.com/watch?v=test",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5
    )
    assert gif.valid?
  end

  test "should reject description longer than 2000 characters" do
    gif = Gif.new(
      user: @alice,
      title: "Test",
      description: "a" * 2001,
      privacy: :public_access,
      youtube_video_url: "https://www.youtube.com/watch?v=test",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5
    )
    assert_not gif.valid?
    assert_includes gif.errors[:description], "is too long (maximum is 2000 characters)"
  end

  test "should accept description at max length" do
    gif = Gif.new(
      user: @alice,
      title: "Test",
      description: "a" * 2000,
      privacy: :public_access,
      youtube_video_url: "https://www.youtube.com/watch?v=test",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5
    )
    assert gif.valid?
  end

  test "should reject negative youtube_timestamp_start" do
    gif = Gif.new(
      user: @alice,
      title: "Test",
      privacy: :public_access,
      youtube_video_url: "https://www.youtube.com/watch?v=test",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      youtube_timestamp_start: -1,
      youtube_timestamp_end: 5
    )
    assert_not gif.valid?
    assert_includes gif.errors[:youtube_timestamp_start], "must be greater than or equal to 0"
  end

  test "should accept zero youtube_timestamp_start" do
    gif = Gif.new(
      user: @alice,
      title: "Test",
      privacy: :public_access,
      youtube_video_url: "https://www.youtube.com/watch?v=test",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5
    )
    assert gif.valid?
  end

  test "should reject youtube_timestamp_end less than or equal to start" do
    gif = Gif.new(
      user: @alice,
      title: "Test",
      privacy: :public_access,
      youtube_video_url: "https://www.youtube.com/watch?v=test",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 10,
      youtube_timestamp_end: 10
    )
    assert_not gif.valid?
    assert gif.errors[:youtube_timestamp_end].any? { |msg| msg.include?("must be greater than") }
  end

  test "should reject youtube_timestamp_end before start" do
    gif = Gif.new(
      user: @alice,
      title: "Test",
      privacy: :public_access,
      youtube_video_url: "https://www.youtube.com/watch?v=test",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 10,
      youtube_timestamp_end: 5
    )
    assert_not gif.valid?
    assert gif.errors[:youtube_timestamp_end].any? { |msg| msg.include?("must be greater than") }
  end

  test "should reject zero or negative duration" do
    # Don't set timestamps to avoid auto-calculation callback
    gif = Gif.new(
      user: @alice,
      title: "Test",
      privacy: :public_access,
      youtube_video_url: "https://www.youtube.com/watch?v=test",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      fps: 30,
      resolution_width: 480,
      resolution_height: 270,
      duration: 0
    )
    assert_not gif.valid?
    assert_includes gif.errors[:duration], "must be greater than 0"

    gif.duration = -1
    assert_not gif.valid?
    assert_includes gif.errors[:duration], "must be greater than 0"
  end

  test "should reject zero or negative fps" do
    gif = Gif.new(
      user: @alice,
      title: "Test",
      privacy: :public_access,
      youtube_video_url: "https://www.youtube.com/watch?v=test",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5,
      duration: 5.0,
      resolution_width: 480,
      resolution_height: 270,
      fps: 0
    )
    assert_not gif.valid?
    assert_includes gif.errors[:fps], "must be greater than 0"

    gif.fps = -1
    assert_not gif.valid?
    assert_includes gif.errors[:fps], "must be greater than 0"
  end

  test "should reject fps greater than 60" do
    gif = Gif.new(
      user: @alice,
      title: "Test",
      privacy: :public_access,
      youtube_video_url: "https://www.youtube.com/watch?v=test",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5,
      duration: 5.0,
      resolution_width: 480,
      resolution_height: 270,
      fps: 61
    )
    assert_not gif.valid?
    assert_includes gif.errors[:fps], "must be less than or equal to 60"
  end

  test "should accept fps at max value" do
    gif = Gif.new(
      user: @alice,
      title: "Test",
      privacy: :public_access,
      youtube_video_url: "https://www.youtube.com/watch?v=test",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5,
      duration: 5.0,
      resolution_width: 480,
      resolution_height: 270,
      fps: 60
    )
    assert gif.valid?
  end

  # ========== CALLBACK TESTS ==========

  test "should calculate duration from timestamps" do
    gif = Gif.new(
      user: @alice,
      title: "Test",
      privacy: :public_access,
      youtube_video_url: "https://www.youtube.com/watch?v=test",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 10,
      youtube_timestamp_end: 25,
      fps: 30,
      resolution_width: 480,
      resolution_height: 270
    )
    gif.valid?  # Trigger callbacks
    assert_equal 15.0, gif.duration
  end

  test "should set is_remix flag when parent_gif assigned" do
    remix = Gif.create!(
      user: @bob,
      title: "Remix",
      parent_gif: @public_gif,
      privacy: :public_access,
      youtube_video_url: "https://www.youtube.com/watch?v=test",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5,
      duration: 5.0,
      fps: 30,
      resolution_width: 480,
      resolution_height: 270
    )
    assert remix.is_remix
  end

  # ========== SOFT DELETE TESTS ==========

  test "soft_delete! sets deleted_at" do
    gif = @public_gif.dup
    gif.save!
    assert_nil gif.deleted_at

    gif.soft_delete!
    gif.reload
    assert_not_nil gif.deleted_at
  end

  test "not_deleted scope excludes soft deleted gifs" do
    gif = @public_gif.dup
    gif.save!
    gif.soft_delete!

    assert_not_includes Gif.not_deleted, gif
  end

  test "deleted scope includes only soft deleted gifs" do
    gif = @public_gif.dup
    gif.save!
    gif.soft_delete!

    assert_includes Gif.deleted, gif
  end

  # ========== SCOPE TESTS ==========

  test "public_only scope returns only public gifs" do
    public_gifs = Gif.public_only
    assert_includes public_gifs, @public_gif
    assert_not_includes public_gifs, @private_gif
    assert_not_includes public_gifs, @unlisted_gif
  end

  test "recent scope orders by created_at desc" do
    recent = Gif.recent.limit(3)
    assert_equal recent, recent.sort_by(&:created_at).reverse
  end

  test "popular scope orders by like_count and view_count desc" do
    gif1 = Gif.create!(
      user: @alice,
      title: "Popular 1",
      privacy: :public_access,
      like_count: 100,
      view_count: 1000,
      youtube_video_url: "https://www.youtube.com/watch?v=test1",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5,
      duration: 5.0,
      fps: 30,
      resolution_width: 480,
      resolution_height: 270
    )

    gif2 = Gif.create!(
      user: @alice,
      title: "Popular 2",
      privacy: :public_access,
      like_count: 50,
      view_count: 500,
      youtube_video_url: "https://www.youtube.com/watch?v=test2",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5,
      duration: 5.0,
      fps: 30,
      resolution_width: 480,
      resolution_height: 270
    )

    popular = Gif.popular.where(id: [ gif1.id, gif2.id ])
    assert_equal gif1.id, popular.first.id
  end

  test "by_user scope filters by user_id" do
    alice_gifs = Gif.by_user(@alice.id)
    assert_includes alice_gifs, @public_gif
    assert_not_includes alice_gifs, @bob_gif
  end

  test "originals scope excludes remixes" do
    remix = Gif.create!(
      user: @bob,
      title: "Remix",
      parent_gif: @public_gif,
      is_remix: true,
      privacy: :public_access,
      youtube_video_url: "https://www.youtube.com/watch?v=test",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5,
      duration: 5.0,
      fps: 30,
      resolution_width: 480,
      resolution_height: 270
    )

    originals = Gif.originals
    assert_includes originals, @public_gif
    assert_not_includes originals, remix
  end

  test "remixes scope includes only remixes" do
    remix = Gif.create!(
      user: @bob,
      title: "Remix",
      parent_gif: @public_gif,
      is_remix: true,
      privacy: :public_access,
      youtube_video_url: "https://www.youtube.com/watch?v=test",
      youtube_video_title: "Test",
      youtube_channel_name: "Test",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5,
      duration: 5.0,
      fps: 30,
      resolution_width: 480,
      resolution_height: 270
    )

    remixes_scope = Gif.remixes
    assert_not_includes remixes_scope, @public_gif
    assert_includes remixes_scope, remix
  end

  # ========== HASHTAG METHODS TESTS ==========

  test "hashtag_names getter returns array of hashtag names" do
    hashtag1 = Hashtag.create!(name: "test1", slug: "test1", usage_count: 1)
    hashtag2 = Hashtag.create!(name: "test2", slug: "test2", usage_count: 1)

    @public_gif.hashtags << hashtag1
    @public_gif.hashtags << hashtag2

    names = @public_gif.hashtag_names
    assert_includes names, "test1"
    assert_includes names, "test2"
  end

  test "hashtag_names setter creates and associates hashtags" do
    @public_gif.hashtag_names = [ "newhashtag1", "newhashtag2" ]
    @public_gif.save!

    @public_gif.reload
    names = @public_gif.hashtag_names
    assert_includes names, "newhashtag1"
    assert_includes names, "newhashtag2"
  end
end
