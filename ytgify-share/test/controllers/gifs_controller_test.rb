require "test_helper"

class GifsControllerTest < ActionDispatch::IntegrationTest
  fixtures :users, :gifs

  setup do
    @alice = users(:one)
    @bob = users(:two)
    @alice_gif = gifs(:alice_public_gif)
    @bob_gif = gifs(:bob_public_gif)
  end

  # ========== INDEX ACTION TESTS ==========

  test "should show index page for authenticated user" do
    sign_in @alice
    get app_gifs_path
    assert_response :success
  end

  test "should show index page for unauthenticated user" do
    get app_gifs_path
    assert_response :success
  end

  # ========== SHOW ACTION TESTS ==========

  test "should show public gif to unauthenticated user" do
    get app_gif_path(@alice_gif)
    assert_response :success
  end

  test "should show public gif to authenticated user" do
    sign_in @bob
    get app_gif_path(@alice_gif)
    assert_response :success
  end

  test "should return 404 for non-existent gif" do
    get app_gif_path(id: "00000000-0000-0000-0000-000000000000")
    assert_response :not_found
  end

  test "should show deleted gif" do
    # Note: Controller doesn't filter deleted GIFs in show action
    @alice_gif.update!(deleted_at: Time.current)
    get app_gif_path(@alice_gif)
    assert_response :success
  end

  # ========== NEW ACTION TESTS ==========

  test "should require authentication for new gif page" do
    get new_app_gif_path
    assert_redirected_to new_user_session_path
  end

  test "should show new gif form for authenticated user" do
    sign_in @alice
    get new_app_gif_path
    assert_response :success
    assert_select "form"
  end

  # ========== CREATE ACTION TESTS ==========

  test "should require authentication to create gif" do
    assert_no_difference("Gif.count") do
      post app_gifs_path, params: {
        gif: { title: "New GIF" }
      }
    end
    assert_redirected_to new_user_session_path
  end

  test "should create gif with minimal params" do
    sign_in @alice

    assert_difference("Gif.count", 1) do
      post app_gifs_path, params: {
        gif: {
          title: "New Test GIF"
        }
      }
    end

    assert_response :redirect
    follow_redirect!
    assert_response :success
  end

  test "should create gif with full params" do
    sign_in @alice

    assert_difference("Gif.count", 1) do
      post app_gifs_path, params: {
        gif: {
          title: "Complete Test GIF",
          description: "Test description",
          privacy: "private_access"
        }
      }
    end

    assert_response :redirect
    assert_match /GIF uploaded successfully/, flash[:notice]
  end

  test "should reject gif creation with title exceeding max length" do
    sign_in @alice

    assert_no_difference("Gif.count") do
      post app_gifs_path, params: {
        gif: { title: "A" * 101 }
      }
    end

    assert_response :unprocessable_entity
  end

  # Note: Hashtag creation might require additional setup or validation
  # Skipping for now to focus on high-impact coverage tests

  # ========== DESTROY ACTION TESTS ==========

  test "should require authentication to destroy gif" do
    assert_no_difference("Gif.count") do
      delete app_gif_path(@alice_gif)
    end
    assert_redirected_to new_user_session_path
  end

  test "should allow owner to destroy their gif" do
    sign_in @alice

    assert_difference("Gif.count", -1) do
      delete app_gif_path(@alice_gif)
    end

    assert_redirected_to root_path
    assert_equal "GIF deleted successfully.", flash[:notice]
  end

  test "should not allow non-owner to delete gif" do
    sign_in @bob

    assert_no_difference("Gif.count") do
      delete app_gif_path(@alice_gif)
    end

    assert_redirected_to root_path
    assert_equal "You're not authorized to perform this action.", flash[:alert]
  end

  test "should return 404 when deleting non-existent gif" do
    sign_in @alice

    delete app_gif_path(id: "00000000-0000-0000-0000-000000000000")
    assert_response :not_found
  end

  # ========== EDIT ACTION TESTS ==========

  test "should require authentication to edit gif" do
    get edit_app_gif_path(@alice_gif)
    assert_redirected_to new_user_session_path
  end

  test "should allow owner to edit their gif" do
    sign_in @alice
    get edit_app_gif_path(@alice_gif)
    assert_response :success
    assert_select "h1", text: "Edit GIF"
  end

  test "should not allow non-owner to edit gif" do
    sign_in @bob
    get edit_app_gif_path(@alice_gif)
    assert_redirected_to root_path
    assert_equal "You're not authorized to perform this action.", flash[:alert]
  end

  # ========== UPDATE ACTION TESTS ==========

  test "should require authentication to update gif" do
    new_title = "Updated Title"

    patch app_gif_path(@alice_gif), params: {
      gif: { title: new_title }
    }

    assert_redirected_to new_user_session_path
    assert_not_equal new_title, @alice_gif.reload.title
  end

  test "should update gif with valid params via HTML" do
    sign_in @alice
    new_title = "Updated Title"
    new_description = "Updated description"

    patch app_gif_path(@alice_gif), params: {
      gif: {
        title: new_title,
        description: new_description
      }
    }

    assert_redirected_to app_gif_path(@alice_gif)
    assert_equal new_title, @alice_gif.reload.title
    assert_equal new_description, @alice_gif.reload.description
    assert_equal "GIF updated successfully!", flash[:notice]
  end

  test "should update hashtags" do
    sign_in @alice

    patch app_gif_path(@alice_gif), params: {
      gif: { hashtag_names: [ "new", "tags", "here" ] }
    }

    assert_redirected_to app_gif_path(@alice_gif)
    assert_equal [ "here", "new", "tags" ], @alice_gif.reload.hashtag_names.sort
  end

  test "should update privacy" do
    sign_in @alice
    assert @alice_gif.privacy_public_access?

    patch app_gif_path(@alice_gif), params: {
      gif: { privacy: "unlisted" }
    }

    assert_redirected_to app_gif_path(@alice_gif)
    assert @alice_gif.reload.privacy_unlisted?
  end

  test "should render turbo stream on successful update" do
    sign_in @alice
    new_title = "Turbo Updated Title"

    patch app_gif_path(@alice_gif), params: {
      gif: { title: new_title }
    }, as: :turbo_stream

    assert_response :success
    assert_match /turbo-stream/, response.body
    assert_match /#{@alice_gif.id}/, response.body
    assert_equal new_title, @alice_gif.reload.title
  end

  test "should handle validation errors with HTML format" do
    sign_in @alice

    patch app_gif_path(@alice_gif), params: {
      gif: { title: "A" * 101 } # Over 100 char limit
    }

    assert_response :unprocessable_entity
    # Form should be re-rendered with errors
    assert_select "form"
  end

  test "should handle validation errors with Turbo Stream format" do
    sign_in @alice

    patch app_gif_path(@alice_gif), params: {
      gif: { title: "A" * 101 } # Over 100 char limit
    }, as: :turbo_stream

    assert_response :unprocessable_entity
    assert_match /turbo-stream/, response.body
  end

  test "should not allow non-owner to update gif" do
    sign_in @bob
    original_title = @alice_gif.title

    patch app_gif_path(@alice_gif), params: {
      gif: { title: "Hacked!" }
    }

    assert_redirected_to root_path
    assert_equal "You're not authorized to perform this action.", flash[:alert]
    assert_equal original_title, @alice_gif.reload.title
  end

  test "should update multiple fields at once" do
    sign_in @alice
    new_title = "Multi-Update Title"
    new_description = "Multi-Update Description"
    new_privacy = "private_access"

    patch app_gif_path(@alice_gif), params: {
      gif: {
        title: new_title,
        description: new_description,
        privacy: new_privacy,
        hashtag_names: [ "multi", "update" ]
      }
    }

    assert_redirected_to app_gif_path(@alice_gif)
    @alice_gif.reload
    assert_equal new_title, @alice_gif.title
    assert_equal new_description, @alice_gif.description
    assert @alice_gif.privacy_private_access?
    assert_equal [ "multi", "update" ], @alice_gif.hashtag_names.sort
  end

  test "should preserve unchanged fields when updating" do
    sign_in @alice
    original_title = @alice_gif.title
    original_youtube_url = @alice_gif.youtube_video_url
    new_description = "Only description changed"

    patch app_gif_path(@alice_gif), params: {
      gif: { description: new_description }
    }

    assert_redirected_to app_gif_path(@alice_gif)
    @alice_gif.reload
    assert_equal original_title, @alice_gif.title
    assert_equal original_youtube_url, @alice_gif.youtube_video_url
    assert_equal new_description, @alice_gif.description
  end

  # ========== AUTHORIZATION TESTS ==========

  test "should enforce authorization for edit" do
    sign_in @bob

    get edit_app_gif_path(@alice_gif)

    assert_redirected_to root_path
    assert_equal "You're not authorized to perform this action.", flash[:alert]
  end

  test "should enforce authorization for update" do
    sign_in @bob

    patch app_gif_path(@alice_gif), params: {
      gif: { title: "Unauthorized" }
    }

    assert_redirected_to root_path
    assert_equal "You're not authorized to perform this action.", flash[:alert]
  end

  # ========== EDGE CASES ==========

  test "should handle empty hashtag array" do
    sign_in @alice

    patch app_gif_path(@alice_gif), params: {
      gif: { hashtag_names: [] }
    }

    assert_redirected_to app_gif_path(@alice_gif)
    assert_equal [], @alice_gif.reload.hashtag_names
  end

  test "should sanitize hashtag input" do
    sign_in @alice

    patch app_gif_path(@alice_gif), params: {
      gif: { hashtag_names: [ "  spaces  ", "UPPERCASE", "MiXeD" ] }
    }

    assert_redirected_to app_gif_path(@alice_gif)
    # Hashtags should be normalized (lowercase, trimmed)
    assert_includes @alice_gif.reload.hashtag_names, "spaces"
    assert_includes @alice_gif.reload.hashtag_names, "uppercase"
    assert_includes @alice_gif.reload.hashtag_names, "mixed"
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
end
