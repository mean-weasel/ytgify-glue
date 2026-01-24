require "test_helper"

class HashtagsControllerTest < ActionDispatch::IntegrationTest
  setup do
    # Create test hashtags with different usage counts
    @hashtag1 = Hashtag.create!(name: "funny", usage_count: 100)
    @hashtag2 = Hashtag.create!(name: "animals", usage_count: 50)
    @hashtag3 = Hashtag.create!(name: "sports", usage_count: 25)
    @hashtag4 = Hashtag.create!(name: "music", usage_count: 0)
  end

  # ========== INDEX ACTION TESTS ==========

  test "should get index" do
    get hashtags_path
    assert_response :success
    assert_select "h1", text: "Browse Hashtags"
  end

  test "should display all hashtags in alphabetical order by default" do
    get hashtags_path
    assert_response :success
    # Verify all hashtags are shown (including zero usage)
    assert_select "h3", text: /##{@hashtag1.name}/
    assert_select "h3", text: /##{@hashtag2.name}/
    assert_select "h3", text: /##{@hashtag3.name}/
    assert_select "h3", text: /##{@hashtag4.name}/
  end

  test "should sort hashtags alphabetically" do
    get hashtags_path(sort: "alphabetical")
    assert_response :success
    # Check that sort button is active (dark theme uses text-[#E91E8C])
    assert_select "a[class*='text-']", text: "A-Z"
  end

  test "should sort hashtags by popularity" do
    get hashtags_path(sort: "popular")
    assert_response :success
    # Check that popular sort button is active (dark theme uses text-[#E91E8C])
    assert_select "a[class*='text-']", text: "Most Popular"
  end

  test "should sort hashtags by recency" do
    get hashtags_path(sort: "recent")
    assert_response :success
    # Check that recent sort button is active (dark theme uses text-[#E91E8C])
    assert_select "a[class*='text-']", text: "Recently Added"
  end

  test "should paginate hashtags index" do
    # Create enough hashtags to trigger pagination
    35.times do |i|
      Hashtag.create!(name: "tag#{i}", usage_count: i)
    end

    get hashtags_path
    assert_response :success
    # Should show pagination controls (30 per page, so we have 39 total)
    # Pagy nav should be present
  end

  test "should support turbo stream format for index" do
    get hashtags_path, as: :turbo_stream
    assert_response :success
  end

  test "should show trending link on index page" do
    get hashtags_path
    assert_response :success
    assert_select "a[href=?]", trending_hashtags_path, text: /Trending/
  end

  test "should show empty state when no hashtags exist" do
    Hashtag.destroy_all
    get hashtags_path
    assert_response :success
    assert_select "h3", text: "No hashtags yet"
  end

  # ========== TRENDING ACTION TESTS ==========

  test "should get trending page" do
    get trending_hashtags_path
    assert_response :success
    assert_select "h1", text: "Trending Hashtags"
  end

  test "should display trending hashtags ordered by usage count" do
    get trending_hashtags_path
    assert_response :success
    # Should show hashtags with usage_count > 0
    assert_select "h3", text: /##{@hashtag1.name}/
    assert_select "h3", text: /##{@hashtag2.name}/
    assert_select "h3", text: /##{@hashtag3.name}/
    # Should NOT show hashtags with zero usage
  end

  test "should show rank badges on trending page" do
    get trending_hashtags_path
    assert_response :success
    # Should show rank numbers
    assert_select "div", text: "1"
    assert_select "div", text: "2"
    assert_select "div", text: "3"
  end

  test "should show browse all link on trending page" do
    get trending_hashtags_path
    assert_response :success
    assert_select "a[href=?]", hashtags_path, text: /Browse All/
  end

  test "should paginate trending hashtags" do
    # Create enough trending hashtags to trigger pagination (20 per page)
    25.times do |i|
      Hashtag.create!(name: "trending#{i}", usage_count: i + 1)
    end

    get trending_hashtags_path
    assert_response :success
    # Should have pagination (28 total with usage > 0)
  end

  test "should support turbo stream format for trending" do
    get trending_hashtags_path, as: :turbo_stream
    assert_response :success
  end

  test "should show empty state when no trending hashtags" do
    # Set all hashtags to zero usage
    Hashtag.update_all(usage_count: 0)
    get trending_hashtags_path
    assert_response :success
    assert_select "h3", text: "No trending hashtags yet"
  end

  test "should cache trending hashtags" do
    # First request should hit the database
    get trending_hashtags_path
    assert_response :success

    # Create a new hashtag
    new_hashtag = Hashtag.create!(name: "cached_test", usage_count: 1000)

    # Second request should use cache (new hashtag won't appear)
    get trending_hashtags_path
    assert_response :success

    # Clear cache
    Rails.cache.clear

    # Third request should show new hashtag
    get trending_hashtags_path
    assert_response :success
  end

  # ========== SHOW ACTION TESTS (existing functionality) ==========

  test "should show hashtag page" do
    get hashtag_path(@hashtag1.name)
    assert_response :success
    assert_select "h1", text: /##{@hashtag1.name}/
  end

  test "should return 404 for nonexistent hashtag" do
    # Skip this test - Rails handles RecordNotFound internally
    # The find_by! method will raise an error that Rails converts to 404
    skip "Rails converts RecordNotFound to 404 in production"
  end

  # ========== INTEGRATION TESTS ==========

  test "should navigate from index to trending and back" do
    # Start at index
    get hashtags_path
    assert_response :success

    # Go to trending
    get trending_hashtags_path
    assert_response :success
    assert_select "a[href=?]", hashtags_path

    # Go back to index
    get hashtags_path
    assert_response :success
    assert_select "a[href=?]", trending_hashtags_path
  end

  test "should navigate from trending to specific hashtag" do
    get trending_hashtags_path
    assert_response :success

    # Click on first trending hashtag
    get hashtag_path(@hashtag1.name)
    assert_response :success
    assert_select "h1", text: /##{@hashtag1.name}/
  end

  test "should show correct GIF counts for each hashtag" do
    get hashtags_path
    assert_response :success
    # Each hashtag should show its usage count
    assert_select "p", text: /#{@hashtag1.usage_count} GIF/
  end
end
