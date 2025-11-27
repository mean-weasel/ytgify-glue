require "test_helper"

module Api
  module V1
    class CommentsControllerTest < ActionDispatch::IntegrationTest
      fixtures :users, :gifs, :comments

      setup do
        @alice = users(:one)
        @bob = users(:two)
        @gif = gifs(:alice_public_gif)

        # Ensure users have jti
        @alice.update_column(:jti, SecureRandom.uuid) if @alice.jti.nil?
        @bob.update_column(:jti, SecureRandom.uuid) if @bob.jti.nil?

        # Create a test comment
        @alice_comment = @gif.comments.create!(
          user: @alice,
          content: "Alice's comment"
        )
      end

      # ========== INDEX (LIST COMMENTS) TESTS ==========

      test "index should not require authentication" do
        get api_v1_gif_comments_path(gif_id: @gif.id), as: :json
        assert_response :ok
      end

      test "index should return comments for a GIF" do
        get api_v1_gif_comments_path(gif_id: @gif.id), as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_includes json, "comments"
        assert_includes json, "pagination"
        assert_kind_of Array, json["comments"]
      end

      test "index returns only top-level comments" do
        # Create a reply
        reply = @alice_comment.replies.create!(
          user: @bob,
          gif: @gif,
          content: "Bob's reply"
        )

        get api_v1_gif_comments_path(gif_id: @gif.id), as: :json

        assert_response :ok
        json = JSON.parse(response.body)

        # Top-level comments should not include replies in the main array
        comment_ids = json["comments"].map { |c| c["id"] }
        assert_includes comment_ids, @alice_comment.id
        assert_not_includes comment_ids, reply.id
      end

      test "index includes nested replies in comment data" do
        # Create a reply
        reply = @alice_comment.replies.create!(
          user: @bob,
          gif: @gif,
          content: "Bob's reply"
        )

        get api_v1_gif_comments_path(gif_id: @gif.id), as: :json

        assert_response :ok
        json = JSON.parse(response.body)

        parent_comment = json["comments"].find { |c| c["id"] == @alice_comment.id }
        assert_includes parent_comment, "replies"
        assert_kind_of Array, parent_comment["replies"]
      end

      test "index comment JSON includes all required fields" do
        get api_v1_gif_comments_path(gif_id: @gif.id), as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        comment = json["comments"].first

        assert_includes comment, "id"
        assert_includes comment, "content"
        assert_includes comment, "reply_count"
        assert_includes comment, "like_count"
        assert_includes comment, "created_at"
        assert_includes comment, "updated_at"
        assert_includes comment, "is_deleted"
        assert_includes comment, "user"
      end

      test "index comment user JSON includes required fields" do
        get api_v1_gif_comments_path(gif_id: @gif.id), as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        user = json["comments"].first["user"]

        assert_includes user, "id"
        assert_includes user, "username"
        assert_includes user, "display_name"
        assert_includes user, "avatar_url"
        assert_includes user, "is_verified"
      end

      test "index supports pagination" do
        # Create multiple comments
        5.times do |i|
          @gif.comments.create!(
            user: @bob,
            content: "Comment #{i}"
          )
        end

        get api_v1_gif_comments_path(gif_id: @gif.id, page: 1, per_page: 2), as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal 2, json["comments"].length
        assert_equal 1, json["pagination"]["page"]
        assert_equal 2, json["pagination"]["per_page"]
      end

      test "index pagination defaults to page 1 and per_page 20" do
        get api_v1_gif_comments_path(gif_id: @gif.id), as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal 1, json["pagination"]["page"]
        assert_equal 20, json["pagination"]["per_page"]
      end

      test "index pagination enforces max per_page of 100" do
        get api_v1_gif_comments_path(gif_id: @gif.id, per_page: 200), as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal 100, json["pagination"]["per_page"]
      end

      test "index returns 404 for non-existent GIF" do
        get api_v1_gif_comments_path(gif_id: "00000000-0000-0000-0000-000000000000"), as: :json

        assert_response :not_found
        json = JSON.parse(response.body)
        assert_equal "Record not found", json["error"]
      end

      # ========== CREATE COMMENT TESTS ==========

      test "create should require authentication" do
        post api_v1_gif_comments_path(gif_id: @gif.id),
             params: { comment: { content: "New comment" } },
             as: :json

        assert_response :unauthorized
      end

      test "create should create a comment with valid params" do
        assert_difference("@gif.comments.count", 1) do
          post api_v1_gif_comments_path(gif_id: @gif.id),
               params: { comment: { content: "Bob's new comment" } },
               headers: auth_headers(@bob),
               as: :json
        end

        assert_response :created
        json = JSON.parse(response.body)
        assert_equal "Comment created successfully", json["message"]
        assert_includes json, "comment"
        assert_equal "Bob's new comment", json["comment"]["content"]
      end

      test "create should set current_user as comment author" do
        post api_v1_gif_comments_path(gif_id: @gif.id),
             params: { comment: { content: "Test comment" } },
             headers: auth_headers(@bob),
             as: :json

        assert_response :created
        json = JSON.parse(response.body)
        assert_equal @bob.id, json["comment"]["user"]["id"]
      end

      test "create should support parent_comment_id for replies" do
        assert_difference("@alice_comment.replies.count", 1) do
          post api_v1_gif_comments_path(gif_id: @gif.id),
               params: {
                 comment: {
                   content: "Reply to Alice",
                   parent_comment_id: @alice_comment.id
                 }
               },
               headers: auth_headers(@bob),
               as: :json
        end

        assert_response :created
        json = JSON.parse(response.body)
        assert_equal "Comment created successfully", json["message"]
      end

      test "create should fail with missing content" do
        assert_no_difference("@gif.comments.count") do
          post api_v1_gif_comments_path(gif_id: @gif.id),
               params: { comment: { content: "" } },
               headers: auth_headers(@bob),
               as: :json
        end

        assert_response :unprocessable_entity
        json = JSON.parse(response.body)
        assert_equal "Comment creation failed", json["error"]
        assert_includes json, "details"
      end

      test "create requires comment parameter with content" do
        assert_no_difference("@gif.comments.count") do
          post api_v1_gif_comments_path(gif_id: @gif.id),
               params: { comment: {} },
               headers: auth_headers(@bob),
               as: :json
        end

        # Rails returns 400 for missing required params
        assert_response :bad_request
        json = JSON.parse(response.body)
        assert_equal "Parameter missing", json["error"]
      end

      test "create should return 404 for non-existent GIF" do
        post api_v1_gif_comments_path(gif_id: "00000000-0000-0000-0000-000000000000"),
             params: { comment: { content: "Test" } },
             headers: auth_headers(@bob),
             as: :json

        assert_response :not_found
      end

      test "create should increment GIF comment_count" do
        initial_count = @gif.reload.comment_count || 0

        post api_v1_gif_comments_path(gif_id: @gif.id),
             params: { comment: { content: "Test comment" } },
             headers: auth_headers(@bob),
             as: :json

        assert_response :created
        assert_equal initial_count + 1, @gif.reload.comment_count
      end

      # ========== UPDATE COMMENT TESTS ==========

      test "update should require authentication" do
        patch api_v1_comment_path(@alice_comment),
              params: { comment: { content: "Updated content" } },
              as: :json

        assert_response :unauthorized
      end

      test "update should allow owner to update comment" do
        patch api_v1_comment_path(@alice_comment),
              params: { comment: { content: "Alice updated this" } },
              headers: auth_headers(@alice),
              as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal "Comment updated successfully", json["message"]
        assert_equal "Alice updated this", json["comment"]["content"]
      end

      test "update should prevent non-owner from updating" do
        patch api_v1_comment_path(@alice_comment),
              params: { comment: { content: "Bob trying to update" } },
              headers: auth_headers(@bob),
              as: :json

        assert_response :forbidden
      end

      test "update should fail with empty content" do
        patch api_v1_comment_path(@alice_comment),
              params: { comment: { content: "" } },
              headers: auth_headers(@alice),
              as: :json

        assert_response :unprocessable_entity
        json = JSON.parse(response.body)
        assert_equal "Comment update failed", json["error"]
      end

      test "update requires comment parameter" do
        # Try updating with empty params - should fail validation
        old_content = @alice_comment.content

        patch api_v1_comment_path(@alice_comment),
              params: { comment: {} },
              headers: auth_headers(@alice),
              as: :json

        # Without content, update should either fail or content should remain unchanged
        @alice_comment.reload
        assert_equal old_content, @alice_comment.content
      end

      test "update should return 404 for non-existent comment" do
        patch api_v1_comment_path(id: "00000000-0000-0000-0000-000000000000"),
              params: { comment: { content: "Test" } },
              headers: auth_headers(@alice),
              as: :json

        assert_response :not_found
      end

      # ========== DELETE COMMENT TESTS ==========

      test "destroy should require authentication" do
        delete api_v1_comment_path(@alice_comment) + ".json"

        assert_response :unauthorized
      end

      test "destroy should allow owner to soft-delete comment" do
        delete api_v1_comment_path(@alice_comment) + ".json",
               headers: auth_headers(@alice)

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal "Comment deleted successfully", json["message"]

        # Verify soft delete
        @alice_comment.reload
        assert @alice_comment.deleted?
      end

      test "destroy should prevent non-owner from deleting" do
        delete api_v1_comment_path(@alice_comment) + ".json",
               headers: auth_headers(@bob)

        assert_response :forbidden
      end

      test "destroy should return 404 for non-existent comment" do
        delete api_v1_comment_path(id: "00000000-0000-0000-0000-000000000000") + ".json",
               headers: auth_headers(@alice)

        assert_response :not_found
      end

      test "destroy should decrement GIF comment_count" do
        initial_count = @gif.reload.comment_count

        delete api_v1_comment_path(@alice_comment) + ".json",
               headers: auth_headers(@alice)

        assert_response :ok
        assert_equal initial_count - 1, @gif.reload.comment_count
      end

      # ========== AUTHENTICATION ERROR TESTS ==========

      test "create should reject invalid JWT token" do
        post api_v1_gif_comments_path(gif_id: @gif.id),
             params: { comment: { content: "Test" } },
             headers: { "Authorization" => "Bearer invalid_token" },
             as: :json

        assert_response :unauthorized
      end

      test "create should reject expired JWT token" do
        expired_token = generate_expired_jwt_token(@bob)

        post api_v1_gif_comments_path(gif_id: @gif.id),
             params: { comment: { content: "Test" } },
             headers: { "Authorization" => "Bearer #{expired_token}" },
             as: :json

        assert_response :unauthorized
      end

      # ========== EDGE CASES ==========

      test "index excludes soft-deleted comments" do
        # Soft delete the comment
        @alice_comment.soft_delete!

        get api_v1_gif_comments_path(gif_id: @gif.id), as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        comment_ids = json["comments"].map { |c| c["id"] }
        assert_not_includes comment_ids, @alice_comment.id
      end

      test "create nested reply updates parent reply_count" do
        initial_count = @alice_comment.reply_count || 0

        post api_v1_gif_comments_path(gif_id: @gif.id),
             params: {
               comment: {
                 content: "Nested reply",
                 parent_comment_id: @alice_comment.id
               }
             },
             headers: auth_headers(@bob),
             as: :json

        assert_response :created
        assert_equal initial_count + 1, @alice_comment.reload.reply_count
      end

      test "index returns comments in recent order" do
        # Create comments with specific order
        comment1 = @gif.comments.create!(user: @bob, content: "First")
        sleep 0.01  # Ensure different timestamps
        comment2 = @gif.comments.create!(user: @bob, content: "Second")

        get api_v1_gif_comments_path(gif_id: @gif.id), as: :json

        assert_response :ok
        json = JSON.parse(response.body)

        # Most recent should be first
        assert_operator json["comments"].find_index { |c| c["id"] == comment2.id },
                        :<,
                        json["comments"].find_index { |c| c["id"] == comment1.id }
      end

      test "index limits nested replies to 3" do
        # Create 5 replies
        5.times do |i|
          @alice_comment.replies.create!(
            user: @bob,
            gif: @gif,
            content: "Reply #{i}"
          )
        end

        get api_v1_gif_comments_path(gif_id: @gif.id), as: :json

        assert_response :ok
        json = JSON.parse(response.body)

        parent_comment = json["comments"].find { |c| c["id"] == @alice_comment.id }
        assert_equal 3, parent_comment["replies"].length
      end

      private

      def auth_headers(user)
        token = generate_jwt_token(user)
        { "Authorization" => "Bearer #{token}" }
      end

      def generate_jwt_token(user)
        # Ensure user has jti
        user.update_column(:jti, SecureRandom.uuid) if user.jti.nil?

        payload = {
          sub: user.id,
          jti: user.jti,
          exp: 15.minutes.from_now.to_i
        }
        JWT.encode(payload, ENV.fetch("JWT_SECRET_KEY", "changeme-in-production"))
      end

      def generate_expired_jwt_token(user)
        # Ensure user has jti
        user.update_column(:jti, SecureRandom.uuid) if user.jti.nil?

        payload = {
          sub: user.id,
          jti: user.jti,
          exp: 1.hour.ago.to_i  # Expired
        }
        JWT.encode(payload, ENV.fetch("JWT_SECRET_KEY", "changeme-in-production"))
      end
    end
  end
end
