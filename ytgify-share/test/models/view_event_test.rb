require "test_helper"

class ViewEventTest < ActiveSupport::TestCase
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
  end

  test "should create valid view event" do
    view_event = ViewEvent.new(
      gif: @gif,
      viewer: @user,
      viewer_type: "User"
    )
    assert view_event.valid?
    assert view_event.save
  end

  test "should require gif" do
    view_event = ViewEvent.new(viewer: @user, viewer_type: "User")
    assert_not view_event.valid?
    assert_includes view_event.errors[:gif_id], "can't be blank"
  end

  test "viewer_type defaults to User" do
    view_event = ViewEvent.create!(gif: @gif, viewer: @user)
    assert_equal "User", view_event.viewer_type
  end

  test "record_view should create view event" do
    assert_difference "ViewEvent.count", 1 do
      ViewEvent.record_view(
        gif: @gif,
        viewer: @user,
        ip_address: "127.0.0.1",
        user_agent: "Test Browser"
      )
    end
  end

  test "record_view should mark first view as unique" do
    view_event = ViewEvent.record_view(gif: @gif, viewer: @user)
    assert view_event.is_unique
  end

  test "record_view should mark subsequent views as not unique within 24 hours" do
    ViewEvent.record_view(gif: @gif, viewer: @user)

    # Second view within 24 hours
    view_event2 = ViewEvent.record_view(gif: @gif, viewer: @user)
    assert_not view_event2.is_unique
  end

  test "record_view should increment gif view_count for unique views" do
    initial_count = @gif.view_count

    ViewEvent.record_view(gif: @gif, viewer: @user)
    @gif.reload

    assert_equal initial_count + 1, @gif.view_count
  end

  test "record_view should not increment gif view_count for non-unique views" do
    ViewEvent.record_view(gif: @gif, viewer: @user)
    @gif.reload
    count_after_first = @gif.view_count

    # Second view
    ViewEvent.record_view(gif: @gif, viewer: @user)
    @gif.reload

    assert_equal count_after_first, @gif.view_count
  end

  test "record_view should handle anonymous viewers" do
    view_event = ViewEvent.record_view(
      gif: @gif,
      viewer: nil,
      ip_address: "127.0.0.1"
    )

    assert_equal "Anonymous", view_event.viewer_type
    assert_nil view_event.viewer_id
    assert_equal "127.0.0.1", view_event.ip_address
  end

  test "unique_viewers_count should return count of unique views" do
    ViewEvent.record_view(gif: @gif, viewer: @user)
    ViewEvent.record_view(gif: @gif, viewer: @user) # Non-unique

    other_user = User.create!(
      email: "other@example.com",
      username: "other",
      password: "password123"
    )
    ViewEvent.record_view(gif: @gif, viewer: other_user)

    assert_equal 2, ViewEvent.unique_viewers_count(@gif)
  end

  test "total_views_count should return total view count" do
    ViewEvent.record_view(gif: @gif, viewer: @user)
    ViewEvent.record_view(gif: @gif, viewer: @user)
    ViewEvent.record_view(gif: @gif, viewer: @user)

    assert_equal 3, ViewEvent.total_views_count(@gif)
  end

  test "for_gif scope should filter by gif" do
    ViewEvent.record_view(gif: @gif, viewer: @user)

    other_gif = Gif.create!(
      user: @user,
      title: "Other GIF",
      privacy: :public_access
    )
    ViewEvent.record_view(gif: other_gif, viewer: @user)

    gif_views = ViewEvent.for_gif(@gif.id)
    assert_equal 1, gif_views.count
  end

  test "for_viewer scope should filter by viewer" do
    ViewEvent.record_view(gif: @gif, viewer: @user)

    other_user = User.create!(
      email: "other@example.com",
      username: "other",
      password: "password123"
    )
    ViewEvent.record_view(gif: @gif, viewer: other_user)

    user_views = ViewEvent.for_viewer(@user)
    assert_equal 1, user_views.count
  end

  test "unique_views scope should only return unique views" do
    ViewEvent.record_view(gif: @gif, viewer: @user) # unique
    ViewEvent.record_view(gif: @gif, viewer: @user) # not unique

    unique_views = ViewEvent.unique_views
    assert unique_views.count >= 1
    assert unique_views.all?(&:is_unique)
  end

  test "today scope should only return today's views" do
    view_event = ViewEvent.record_view(gif: @gif, viewer: @user)
    today_views = ViewEvent.today

    assert_includes today_views, view_event
  end

  test "views_by_day should group views by date" do
    ViewEvent.record_view(gif: @gif, viewer: @user)

    other_user = User.create!(
      email: "other@example.com",
      username: "other",
      password: "password123"
    )
    ViewEvent.record_view(gif: @gif, viewer: other_user)

    views_by_day = ViewEvent.views_by_day(@gif, days: 7)

    # Should have at least one day with views
    assert views_by_day.values.sum >= 2
  end

  test "top_referrers should return most common referrers" do
    ViewEvent.record_view(gif: @gif, viewer: @user, referer: "https://example.com")
    ViewEvent.record_view(gif: @gif, viewer: @user, referer: "https://example.com")
    ViewEvent.record_view(gif: @gif, viewer: @user, referer: "https://other.com")

    referrers = ViewEvent.top_referrers(@gif, limit: 10)

    assert_equal 2, referrers["https://example.com"]
    assert_equal 1, referrers["https://other.com"]
  end
end
