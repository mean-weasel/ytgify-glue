require "test_helper"

class RemixesControllerTest < ActionDispatch::IntegrationTest
  fixtures :users, :gifs

  setup do
    @alice = users(:one)
    @bob = users(:two)
    @public_gif = gifs(:alice_public_gif)

    # Create a private GIF for testing
    @private_gif = Gif.create!(
      user: @alice,
      title: "Alice's Private GIF",
      privacy: :private_access,
      youtube_video_url: "https://www.youtube.com/watch?v=test",
      youtube_video_title: "Test Video",
      youtube_channel_name: "Test Channel",
      youtube_timestamp_start: 0.0,
      youtube_timestamp_end: 5.0,
      duration: 5.0,
      fps: 30,
      resolution_width: 480,
      resolution_height: 270
    )
  end

  # ========== NEW ACTION TESTS ==========

  test "should require authentication to access remix editor" do
    get remix_gif_path(@public_gif)
    assert_redirected_to new_user_session_path
  end

  test "should show remix editor for public gif when authenticated" do
    sign_in @bob
    get remix_gif_path(@public_gif)
    assert_response :success
    assert_select "h1", text: "Remix GIF"
    assert_select "canvas[data-remix-editor-target='canvas']"
  end

  test "should not allow remix of private gif by non-owner" do
    sign_in @bob
    get remix_gif_path(@private_gif)
    assert_redirected_to gif_path(@private_gif)
    assert_equal "This GIF cannot be remixed", flash[:alert]
  end

  test "should allow owner to remix their own private gif" do
    sign_in @alice
    get remix_gif_path(@private_gif)
    assert_response :success
    assert_select "h1", text: "Remix GIF"
  end

  test "should redirect if gif not found" do
    sign_in @alice
    get remix_gif_path(id: "00000000-0000-0000-0000-000000000000")
    assert_redirected_to root_path
    assert_equal "GIF not found", flash[:alert]
  end

  test "should load source gif data in editor" do
    sign_in @bob
    get remix_gif_path(@public_gif)
    assert_response :success

    # Check data attributes are present
    assert_select "div[data-remix-editor-source-gif-id-value='#{@public_gif.id}']"
    assert_select "div[data-remix-editor-width-value='#{@public_gif.resolution_width}']"
    assert_select "div[data-remix-editor-height-value='#{@public_gif.resolution_height}']"
  end

  # ========== CREATE_REMIX ACTION TESTS ==========

  test "should require authentication to create remix" do
    assert_no_difference("Gif.count") do
      post create_remix_gif_path(@public_gif), params: {
        remix: remix_params
      }
    end
    assert_redirected_to new_user_session_path
  end

  test "should create remix with valid params" do
    sign_in @bob

    assert_difference("Gif.count", 1) do
      post create_remix_gif_path(@public_gif), params: {
        remix: remix_params
      }, as: :json
    end

    assert_response :created

    # Find the most recently created remix (reliable across parallel tests)
    remix = Gif.where(parent_gif: @public_gif, user: @bob, is_remix: true).order(created_at: :desc).first
    assert_not_nil remix, "Remix should be created"
    assert remix.is_remix
    assert_equal @public_gif.id, remix.parent_gif_id
    assert_equal @bob.id, remix.user_id
    assert remix.has_text_overlay
    assert_equal "Hello World", remix.text_overlay_data["text"]
    assert_equal "Impact", remix.text_overlay_data["font_family"]
  end

  test "should validate text overlay data" do
    sign_in @bob

    post create_remix_gif_path(@public_gif), params: {
      remix: remix_params.merge(
        text_overlay_data: {
          text: "Test",
          font_size: 200,  # Should be clamped to 120
          outline_width: 20  # Should be clamped to 10
        }
      )
    }, as: :json

    remix = Gif.where(parent_gif: @public_gif, user: @bob, is_remix: true).order(created_at: :desc).first
    assert_not_nil remix
    assert_equal 120, remix.text_overlay_data["font_size"]
    assert_equal 10, remix.text_overlay_data["outline_width"]
  end

  test "should set default values for missing text overlay data" do
    sign_in @bob

    post create_remix_gif_path(@public_gif), params: {
      remix: {
        title: "Test Remix",
        file: fixture_file_upload("test.gif", "image/gif"),
        text_overlay_data: {
          text: "Test"
          # Missing other fields
        }
      }
    }, as: :json

    remix = Gif.where(parent_gif: @public_gif, user: @bob, is_remix: true).order(created_at: :desc).first
    assert_not_nil remix
    assert_equal "Arial", remix.text_overlay_data["font_family"]
    assert_equal 48, remix.text_overlay_data["font_size"]
    assert_equal "bold", remix.text_overlay_data["font_weight"]
    assert_equal "#ffffff", remix.text_overlay_data["color"]
  end

  test "should enqueue RemixProcessingJob after creation" do
    sign_in @bob

    assert_enqueued_with(job: RemixProcessingJob) do
      post create_remix_gif_path(@public_gif), params: {
        remix: remix_params
      }, as: :json
    end
  end

  test "should not create notification when remixing own gif" do
    sign_in @alice

    assert_no_difference("Notification.count") do
      post create_remix_gif_path(@public_gif), params: {
        remix: remix_params
      }, as: :json
    end
  end

  test "should create notification for original creator" do
    sign_in @bob

    assert_difference("Notification.count", 1) do
      post create_remix_gif_path(@public_gif), params: {
        remix: remix_params
      }, as: :json
    end

    remix = Gif.where(parent_gif: @public_gif, user: @bob, is_remix: true).order(created_at: :desc).first
    assert_not_nil remix, "Remix should be created"
    notification = Notification.find_by(action: "remix", notifiable: remix)
    assert_not_nil notification, "Remix notification should be created"
    assert_equal "remix", notification.action
    assert_equal @alice, notification.recipient
    assert_equal @bob, notification.actor
    assert_equal remix, notification.notifiable
  end

  test "should not allow remix of private gif in create action" do
    sign_in @bob

    assert_no_difference("Gif.count") do
      post create_remix_gif_path(@private_gif), params: {
        remix: remix_params
      }
    end

    assert_redirected_to gif_path(@private_gif)
  end

  test "should create gif even without file but won't be processed" do
    sign_in @bob

    # GIF creation succeeds even without file, but processing job will skip it
    assert_difference("Gif.count", 1) do
      post create_remix_gif_path(@public_gif), params: {
        remix: {
          title: "Test",
          # Missing file
          text_overlay_data: {
            text: "Test"
          }
        }
      }, as: :json
    end

    assert_response :created

    remix = Gif.where(parent_gif: @public_gif, user: @bob, is_remix: true).order(created_at: :desc).first
    assert_not_nil remix
    refute remix.file.attached?, "File should not be attached"
  end

  test "should return json response with gif url on success" do
    sign_in @bob

    post create_remix_gif_path(@public_gif), params: {
      remix: remix_params
    }, as: :json

    assert_response :created

    json_response = JSON.parse(response.body)
    assert json_response["id"].present?
    assert json_response["url"].present?
    assert json_response["url"].include?("/gifs/")
  end

  test "should handle deleted source gif" do
    sign_in @bob
    @public_gif.soft_delete!

    get remix_gif_path(@public_gif)
    assert_redirected_to root_path
    assert_equal "GIF not found", flash[:alert]
  end

  test "should preserve position data from 0 to 1" do
    sign_in @bob

    post create_remix_gif_path(@public_gif), params: {
      remix: remix_params.merge(
        text_overlay_data: {
          text: "Test",
          position: { x: 0.25, y: 0.75 }
        }
      )
    }, as: :json

    remix = Gif.where(parent_gif: @public_gif, user: @bob, is_remix: true).order(created_at: :desc).first
    assert_not_nil remix
    assert_equal 0.25, remix.text_overlay_data["position"]["x"]
    assert_equal 0.75, remix.text_overlay_data["position"]["y"]
  end

  test "should clamp position values outside range" do
    sign_in @bob

    post create_remix_gif_path(@public_gif), params: {
      remix: remix_params.merge(
        text_overlay_data: {
          text: "Test",
          position: { x: 1.5, y: -0.5 }  # Outside 0-1 range
        }
      )
    }, as: :json

    remix = Gif.where(parent_gif: @public_gif, user: @bob, is_remix: true).order(created_at: :desc).first
    assert_not_nil remix
    assert_not_nil remix.text_overlay_data
    assert_not_nil remix.text_overlay_data["position"]
    assert_equal 1.0, remix.text_overlay_data["position"]["x"]
    assert_equal 0.0, remix.text_overlay_data["position"]["y"]
  end

  # ========== EDGE CASES ==========

  test "should handle empty text overlay data" do
    sign_in @bob

    post create_remix_gif_path(@public_gif), params: {
      remix: {
        title: "Test",
        file: fixture_file_upload("test.gif", "image/gif")
        # No text_overlay_data
      }
    }, as: :json

    remix = Gif.where(parent_gif: @public_gif, user: @bob, is_remix: true).order(created_at: :desc).first
    assert_not_nil remix
    assert_equal({}, remix.text_overlay_data)
    refute remix.has_text_overlay
  end

  test "should strip whitespace from text" do
    sign_in @bob

    post create_remix_gif_path(@public_gif), params: {
      remix: remix_params.merge(
        text_overlay_data: {
          text: "  Test Text  "
        }
      )
    }, as: :json

    remix = Gif.where(parent_gif: @public_gif, user: @bob, is_remix: true).order(created_at: :desc).first
    assert_not_nil remix
    assert_equal "Test Text", remix.text_overlay_data["text"]
  end

  private

  def sign_in(user)
    post user_session_path, params: {
      user: {
        email: user.email,
        password: "password123"
      }
    }
  end

  def remix_params
    {
      title: "My Remix",
      file: fixture_file_upload("test.gif", "image/gif"),
      text_overlay_data: {
        text: "Hello World",
        font_family: "Impact",
        font_size: 48,
        font_weight: "bold",
        color: "#ffffff",
        outline_color: "#000000",
        outline_width: 3,
        position: { x: 0.5, y: 0.9 }
      }
    }
  end
end
