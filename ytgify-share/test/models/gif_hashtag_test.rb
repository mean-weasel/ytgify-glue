require "test_helper"

class GifHashtagTest < ActiveSupport::TestCase
  def setup
    @user = User.create!(
      email: "user@example.com",
      username: "testuser",
      password: "password123"
    )
    @gif = Gif.create!(
      user: @user,
      title: "Test GIF",
      privacy: :public_access
    )
    @hashtag = Hashtag.create!(name: "funny", slug: "funny")
  end

  test "should add hashtag to gif" do
    assert_difference '@gif.hashtags.count', 1 do
      @gif.add_hashtag(@hashtag)
    end
  end

  test "should add hashtag by name" do
    assert_difference '@gif.hashtags.count', 1 do
      @gif.add_hashtag("awesome")
    end
  end

  test "should not add duplicate hashtag" do
    @gif.add_hashtag(@hashtag)

    assert_no_difference '@gif.hashtags.count' do
      result = @gif.add_hashtag(@hashtag)
      assert_not result
    end
  end

  test "should remove hashtag from gif" do
    @gif.add_hashtag(@hashtag)

    assert_difference '@gif.hashtags.count', -1 do
      @gif.remove_hashtag(@hashtag)
    end
  end

  test "should remove hashtag by name" do
    @gif.add_hashtag(@hashtag)

    assert_difference '@gif.hashtags.count', -1 do
      @gif.remove_hashtag("funny")
    end
  end

  test "update_hashtags_from_text should parse and add hashtags" do
    @gif.update_hashtags_from_text("This is #funny and #awesome")
    assert_equal 2, @gif.hashtags.count
    assert_includes @gif.hashtag_names, "funny"
    assert_includes @gif.hashtag_names, "awesome"
  end

  test "update_hashtags_from_text should replace existing hashtags" do
    @gif.add_hashtag("old")
    @gif.update_hashtags_from_text("This is #new")

    assert_equal 1, @gif.hashtags.count
    assert_includes @gif.hashtag_names, "new"
    assert_not_includes @gif.hashtag_names, "old"
  end

  test "hashtag_names should return array of hashtag names" do
    @gif.add_hashtag("funny")
    @gif.add_hashtag("awesome")

    names = @gif.hashtag_names
    assert_equal 2, names.count
    assert_includes names, "funny"
    assert_includes names, "awesome"
  end

  test "should increment hashtag usage_count when added to gif" do
    assert_equal 0, @hashtag.usage_count

    @gif.hashtags << @hashtag
    @hashtag.reload

    assert_equal 1, @hashtag.usage_count
  end

  test "should decrement hashtag usage_count when removed from gif" do
    @gif.hashtags << @hashtag
    @hashtag.reload
    assert_equal 1, @hashtag.usage_count

    @gif.hashtags.delete(@hashtag)
    @hashtag.reload

    assert_equal 0, @hashtag.usage_count
  end

  test "should validate uniqueness of gif_id and hashtag_id combination" do
    GifHashtag.create!(gif: @gif, hashtag: @hashtag)
    duplicate = GifHashtag.new(gif: @gif, hashtag: @hashtag)

    assert_not duplicate.valid?
  end

  test "should require gif_id" do
    gif_hashtag = GifHashtag.new(hashtag: @hashtag)
    assert_not gif_hashtag.valid?
    assert_includes gif_hashtag.errors[:gif_id], "can't be blank"
  end

  test "should require hashtag_id" do
    gif_hashtag = GifHashtag.new(gif: @gif)
    assert_not gif_hashtag.valid?
    assert_includes gif_hashtag.errors[:hashtag_id], "can't be blank"
  end
end
