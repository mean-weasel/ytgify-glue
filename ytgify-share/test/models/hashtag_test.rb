require "test_helper"

class HashtagTest < ActiveSupport::TestCase
  def setup
    @user = User.create!(
      email: "user@example.com",
      username: "testuser",
      password: "password123"
    )
    @hashtag = Hashtag.create!(name: "funny", slug: "funny")
    @gif = Gif.create!(
      user: @user,
      title: "Test GIF",
      privacy: :public_access
    )
  end

  test "should create valid hashtag" do
    hashtag = Hashtag.new(name: "test", slug: "test")
    assert hashtag.valid?
    assert hashtag.save
  end

  test "should require name" do
    hashtag = Hashtag.new(slug: "test")
    assert_not hashtag.valid?
    assert_includes hashtag.errors[:name], "can't be blank"
  end

  test "should auto-generate slug from name" do
    hashtag = Hashtag.new(name: "test")
    assert hashtag.valid?
    assert_equal "test", hashtag.slug
  end

  test "should not allow duplicate names" do
    Hashtag.create!(name: "testing", slug: "testing")
    duplicate = Hashtag.new(name: "testing", slug: "testing2")
    assert_not duplicate.valid?
  end

  test "should not allow duplicate slugs" do
    Hashtag.create!(name: "testing2", slug: "testing2")
    duplicate = Hashtag.new(name: "testing2", slug: "testing2-duplicate")
    duplicate.slug = "testing2" # Manually override after callbacks
    assert_not duplicate.valid?
  end

  test "should not allow duplicate names case insensitive" do
    Hashtag.create!(name: "testing4", slug: "testing4")
    duplicate = Hashtag.new(name: "TESTING4", slug: "TESTING4")
    assert_not duplicate.valid?
  end

  test "should generate slug from name" do
    hashtag = Hashtag.new(name: "hello world")
    hashtag.valid?
    assert_equal "hello-world", hashtag.slug
  end

  test "should normalize name" do
    hashtag = Hashtag.create!(name: "#FunnyStuff")
    assert_equal "funnystuff", hashtag.name
  end

  test "find_or_create_by_name should find existing hashtag" do
    existing = Hashtag.create!(name: "test", slug: "test")
    found = Hashtag.find_or_create_by_name("test")
    assert_equal existing.id, found.id
  end

  test "find_or_create_by_name should create new hashtag" do
    assert_difference "Hashtag.count", 1 do
      Hashtag.find_or_create_by_name("newhashtag")
    end
  end

  test "find_or_create_by_name should handle hashtag prefix" do
    hashtag = Hashtag.find_or_create_by_name("#test")
    assert_equal "test", hashtag.name
  end

  test "find_or_create_by_name should normalize case" do
    hashtag = Hashtag.find_or_create_by_name("UPPERCASE")
    assert_equal "uppercase", hashtag.name
  end

  test "parse_from_text should extract hashtags" do
    text = "This is #funny and #awesome"
    hashtags = Hashtag.parse_from_text(text)
    assert_equal 2, hashtags.length
    assert_equal "funny", hashtags.first.name
    assert_equal "awesome", hashtags.last.name
  end

  test "parse_from_text should handle duplicate hashtags" do
    text = "This is #funny and #funny again"
    hashtags = Hashtag.parse_from_text(text)
    assert_equal 1, hashtags.length
  end

  test "parse_from_text should handle empty text" do
    hashtags = Hashtag.parse_from_text("")
    assert_equal 0, hashtags.length
  end

  test "parse_from_text should handle underscores" do
    text = "Check out #my_awesome_tag"
    hashtags = Hashtag.parse_from_text(text)
    assert_equal 1, hashtags.length
    assert_equal "my_awesome_tag", hashtags.first.name
  end

  test "increment_usage! should increase usage_count" do
    initial_count = @hashtag.usage_count
    @hashtag.increment_usage!
    assert_equal initial_count + 1, @hashtag.usage_count
  end

  test "decrement_usage! should decrease usage_count" do
    @hashtag.update(usage_count: 5)
    @hashtag.decrement_usage!
    assert_equal 4, @hashtag.usage_count
  end

  test "decrement_usage! should not go below zero" do
    @hashtag.update(usage_count: 0)
    @hashtag.decrement_usage!
    assert_equal 0, @hashtag.usage_count
  end

  test "to_s should include hashtag symbol" do
    assert_equal "#funny", @hashtag.to_s
  end

  test "trending scope should return hashtags with usage" do
    unused = Hashtag.create!(name: "unused", slug: "unused", usage_count: 0)
    used = Hashtag.create!(name: "used", slug: "used", usage_count: 10)

    trending = Hashtag.trending
    assert_includes trending, used
    assert_not_includes trending, unused
  end

  test "trending scope should order by usage_count desc" do
    tag1 = Hashtag.create!(name: "tag1", slug: "tag1", usage_count: 5)
    tag2 = Hashtag.create!(name: "tag2", slug: "tag2", usage_count: 10)

    trending = Hashtag.trending
    assert_equal tag2.id, trending.first.id
  end

  test "popular scope should order by usage_count desc" do
    tag1 = Hashtag.create!(name: "tag1", slug: "tag1", usage_count: 5)
    tag2 = Hashtag.create!(name: "tag2", slug: "tag2", usage_count: 10)

    popular = Hashtag.popular
    assert_equal tag2.id, popular.first.id
  end

  test "alphabetical scope should order by name asc" do
    Hashtag.create!(name: "zebra", slug: "zebra")
    Hashtag.create!(name: "apple", slug: "apple")

    alphabetical = Hashtag.alphabetical
    assert_equal "apple", alphabetical.first.name
  end

  test "should update usage_count counter cache" do
    assert_equal 0, @hashtag.usage_count

    @gif.hashtags << @hashtag
    @hashtag.reload
    assert_equal 1, @hashtag.usage_count
  end

  test "should decrement usage_count when gif_hashtag destroyed" do
    @gif.hashtags << @hashtag
    @hashtag.reload
    assert_equal 1, @hashtag.usage_count

    @gif.hashtags.delete(@hashtag)
    @hashtag.reload
    assert_equal 0, @hashtag.usage_count
  end
end
