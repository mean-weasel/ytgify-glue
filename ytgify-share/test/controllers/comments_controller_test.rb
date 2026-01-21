require "test_helper"

class CommentsControllerTest < ActionDispatch::IntegrationTest
  fixtures :users, :gifs, :comments

  setup do
    @alice = users(:one)
    @bob = users(:two)
    @alice_gif = gifs(:alice_public_gif)
    @bob_gif = gifs(:bob_public_gif)
    @alice_comment = comments(:alice_comment_on_bob_gif)
    @bob_comment = comments(:bob_comment_on_alice_gif)
    @bob_reply = comments(:bob_reply_to_alice_comment)
  end

  # ========== CREATE ACTION TESTS ==========

  test "should require authentication to create comment" do
    assert_no_difference "Comment.count" do
      post app_gif_comments_path(@alice_gif), params: { comment: { content: "Nice!" } }
    end
    assert_redirected_to new_user_session_path
  end

  test "should create top-level comment when authenticated" do
    sign_in @alice

    assert_difference "Comment.count", 1 do
      assert_difference -> { @alice_gif.reload.comment_count }, 1 do
        post app_gif_comments_path(@alice_gif), params: { comment: { content: "Great GIF!" } }, as: :turbo_stream
      end
    end

    assert_response :success
    comment = Comment.not_deleted.order(created_at: :desc).first
    assert_equal "Great GIF!", comment.content
    assert_equal @alice, comment.user
    assert_equal @alice_gif, comment.gif
    assert_nil comment.parent_comment_id
  end

  test "should create nested reply when parent_comment_id provided" do
    sign_in @bob
    parent_comment = @alice_comment

    assert_difference "Comment.count", 1 do
      assert_difference -> { parent_comment.reload.reply_count }, 1 do
        assert_difference -> { @bob_gif.reload.comment_count }, 1 do
          post app_gif_comments_path(@bob_gif),
               params: { comment: { content: "Thanks!", parent_comment_id: parent_comment.id } },
               as: :turbo_stream
        end
      end
    end

    assert_response :success
    reply = Comment.not_deleted.order(created_at: :desc).first
    assert_equal "Thanks!", reply.content
    assert_equal @bob, reply.user
    assert_equal @bob_gif, reply.gif
    assert_equal parent_comment.id, reply.parent_comment_id
  end

  test "should update parent reply count when creating reply" do
    sign_in @alice
    parent_comment = @alice_comment
    initial_reply_count = parent_comment.reply_count

    post app_gif_comments_path(@bob_gif),
         params: { comment: { content: "Reply", parent_comment_id: parent_comment.id } },
         as: :turbo_stream

    assert_equal initial_reply_count + 1, parent_comment.reload.reply_count
  end

  test "should update gif comment count when creating top-level comment" do
    sign_in @alice
    initial_count = @alice_gif.comment_count

    post app_gif_comments_path(@alice_gif),
         params: { comment: { content: "Nice!" } },
         as: :turbo_stream

    assert_equal initial_count + 1, @alice_gif.reload.comment_count
  end

  test "should not create comment with empty content" do
    sign_in @alice

    assert_no_difference "Comment.count" do
      post app_gif_comments_path(@alice_gif),
           params: { comment: { content: "" } },
           as: :turbo_stream
    end

    assert_response :unprocessable_entity
  end

  test "should render turbo stream response for successful top-level comment" do
    sign_in @alice

    post app_gif_comments_path(@alice_gif),
         params: { comment: { content: "Great!" } },
         as: :turbo_stream

    assert_response :success
    assert_match /turbo-stream/, @response.body
    assert_match /comments/, @response.body
    assert_match /comment_count/, @response.body
  end

  test "should render turbo stream response for successful reply" do
    sign_in @bob

    post app_gif_comments_path(@bob_gif),
         params: { comment: { content: "Reply!", parent_comment_id: @alice_comment.id } },
         as: :turbo_stream

    assert_response :success
    assert_match /turbo-stream/, @response.body
    assert_match /replies_#{@alice_comment.id}/, @response.body
    assert_match /reply_form_#{@alice_comment.id}/, @response.body
    assert_match /reply_count_#{@alice_comment.id}/, @response.body
  end

  test "should handle html format for comment creation" do
    sign_in @alice

    post app_gif_comments_path(@alice_gif),
         params: { comment: { content: "HTML format!" } }

    assert_redirected_to app_gif_path(@alice_gif)
    follow_redirect!
    assert_match /Comment posted successfully/, response.body
  end

  # ========== EDIT ACTION TESTS ==========

  test "should require authentication to edit comment" do
    get edit_app_comment_path(@alice_comment), as: :turbo_stream
    assert_redirected_to new_user_session_path
  end

  test "should allow owner to edit their comment" do
    sign_in @alice

    get edit_app_comment_path(@alice_comment), as: :turbo_stream

    assert_response :success
    assert_match /turbo-stream/, @response.body
    assert_match /#{dom_id(@alice_comment)}/, @response.body
  end

  test "should not allow non-owner to edit comment" do
    sign_in @bob

    get edit_app_comment_path(@alice_comment), as: :turbo_stream

    assert_response :forbidden
  end

  test "should redirect html format edit to gif page" do
    sign_in @alice

    get edit_app_comment_path(@alice_comment)

    assert_redirected_to app_gif_path(@bob_gif)
  end

  # ========== UPDATE ACTION TESTS ==========

  test "should require authentication to update comment" do
    patch app_comment_path(@alice_comment), params: { comment: { content: "Updated" } }
    assert_redirected_to new_user_session_path
    assert_not_equal "Updated", @alice_comment.reload.content
  end

  test "should allow owner to update their comment" do
    sign_in @alice
    new_content = "Updated content"

    patch app_comment_path(@alice_comment),
          params: { comment: { content: new_content } },
          as: :turbo_stream

    assert_response :success
    assert_equal new_content, @alice_comment.reload.content
  end

  test "should not allow non-owner to update comment" do
    sign_in @bob
    original_content = @alice_comment.content

    patch app_comment_path(@alice_comment),
          params: { comment: { content: "Hacked!" } },
          as: :turbo_stream

    assert_response :forbidden
    assert_equal original_content, @alice_comment.reload.content
  end

  test "should render turbo stream response for successful update" do
    sign_in @alice

    patch app_comment_path(@alice_comment),
          params: { comment: { content: "Updated!" } },
          as: :turbo_stream

    assert_response :success
    assert_match /turbo-stream/, @response.body
    assert_match /#{dom_id(@alice_comment)}/, @response.body
  end

  test "should render json response for successful update" do
    sign_in @alice
    new_content = "JSON Update"

    patch app_comment_path(@alice_comment),
          params: { comment: { content: new_content } },
          as: :json

    assert_response :success
    json_response = JSON.parse(@response.body)
    assert_equal "Comment updated successfully", json_response["message"]
    assert_equal new_content, json_response["comment"]["content"]
  end

  test "should not update comment with invalid content" do
    sign_in @alice
    original_content = @alice_comment.content

    patch app_comment_path(@alice_comment),
          params: { comment: { content: "" } },
          as: :turbo_stream

    assert_response :unprocessable_entity
    assert_equal original_content, @alice_comment.reload.content
  end

  test "should render edit form again on validation error" do
    sign_in @alice

    patch app_comment_path(@alice_comment),
          params: { comment: { content: "" } },
          as: :turbo_stream

    assert_response :unprocessable_entity
    assert_match /turbo-stream/, @response.body
  end

  test "should handle html format for successful update" do
    sign_in @alice

    patch app_comment_path(@alice_comment),
          params: { comment: { content: "Updated via HTML" } }

    assert_redirected_to app_gif_path(@bob_gif)
    follow_redirect!
    assert_match /Comment updated successfully/, response.body
  end

  # ========== DESTROY ACTION TESTS ==========

  test "should require authentication to destroy comment" do
    assert_no_difference "Comment.count" do
      delete app_comment_path(@alice_comment)
    end
    assert_redirected_to new_user_session_path
  end

  test "should allow comment owner to soft delete their comment" do
    sign_in @alice

    assert_no_difference "Comment.count" do
      delete app_comment_path(@alice_comment), as: :turbo_stream
    end

    assert_response :success
    assert_not_nil @alice_comment.reload.deleted_at
  end

  test "should allow gif owner to delete comments on their gif" do
    sign_in @bob  # Bob owns the gif

    assert_no_difference "Comment.count" do
      delete app_comment_path(@alice_comment), as: :turbo_stream  # Alice's comment on Bob's gif
    end

    assert_response :success
    assert_not_nil @alice_comment.reload.deleted_at
  end

  test "should not allow unauthorized user to delete comment" do
    sign_in @alice
    # Alice tries to delete Bob's reply (on Bob's GIF, not Alice's comment)
    bob_reply = @bob_reply

    delete app_comment_path(bob_reply), as: :turbo_stream

    assert_response :forbidden
    assert_nil bob_reply.reload.deleted_at
  end

  test "should update gif comment count when deleting comment" do
    sign_in @alice
    initial_count = @bob_gif.comment_count

    delete app_comment_path(@alice_comment), as: :turbo_stream

    assert_equal initial_count - 1, @bob_gif.reload.comment_count
  end

  test "should render turbo stream response for successful deletion" do
    sign_in @alice

    delete app_comment_path(@alice_comment), as: :turbo_stream

    assert_response :success
    assert_match /turbo-stream/, @response.body
    assert_match /comment_count/, @response.body
  end

  test "should handle html format for deletion" do
    sign_in @alice

    delete app_comment_path(@alice_comment)

    assert_redirected_to app_gif_path(@bob_gif)
    follow_redirect!
    assert_match /Comment deleted successfully/, response.body
  end

  test "should handle deleting a reply and update parent reply count" do
    sign_in @bob
    parent_comment = @alice_comment
    reply = @bob_reply
    initial_reply_count = parent_comment.reply_count

    delete app_comment_path(reply), as: :turbo_stream

    assert_response :success
    assert_not_nil reply.reload.deleted_at
    assert_equal initial_reply_count - 1, parent_comment.reload.reply_count
  end

  # ========== AUTHORIZATION TESTS ==========

  test "should enforce authorization for edit" do
    sign_in @bob

    get edit_app_comment_path(@alice_comment), as: :turbo_stream

    assert_response :forbidden
  end

  test "should enforce authorization for update" do
    sign_in @bob

    patch app_comment_path(@alice_comment),
          params: { comment: { content: "Unauthorized" } },
          as: :turbo_stream

    assert_response :forbidden
  end

  test "should allow both comment owner and gif owner to delete" do
    # Comment owner can delete
    sign_in @alice
    delete app_comment_path(@alice_comment), as: :turbo_stream
    assert_response :success

    # Gif owner can delete
    sign_in @bob
    comment = comments(:bob_comment_on_alice_gif)
    delete app_comment_path(comment), as: :turbo_stream
    assert_response :success
  end

  # ========== EDGE CASES ==========

  test "should handle nonexistent comment gracefully" do
    sign_in @alice

    get edit_app_comment_path(id: 99999), as: :turbo_stream

    assert_response :not_found
  end

  test "should handle creating deeply nested replies" do
    sign_in @alice

    # Create a reply to an existing reply
    assert_difference "Comment.count", 1 do
      post app_gif_comments_path(@bob_gif),
           params: { comment: { content: "Deep reply", parent_comment_id: @bob_reply.id } },
           as: :turbo_stream
    end

    assert_response :success
    deep_reply = Comment.not_deleted.order(created_at: :desc).first
    assert_equal @bob_reply.id, deep_reply.parent_comment_id
  end

  test "should preserve existing comments when creating new one" do
    sign_in @alice
    initial_comment_count = Comment.count

    post app_gif_comments_path(@alice_gif),
         params: { comment: { content: "New comment" } },
         as: :turbo_stream

    assert_equal initial_comment_count + 1, Comment.count
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

  def dom_id(record, prefix = nil)
    ActionView::RecordIdentifier.dom_id(record, prefix)
  end
end
