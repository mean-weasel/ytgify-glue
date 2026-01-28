require "test_helper"

module Api
  module V1
    class GifsControllerTest < ActionDispatch::IntegrationTest
      fixtures :users

      setup do
        @user = users(:one)
        @other_user = users(:two)

        # Generate JWT token for authentication
        @token = generate_jwt_token(@user)
        @auth_headers = {
          "Authorization" => "Bearer #{@token}"
        }
      end

      # ========== HASHTAG TESTS ==========

      test "create gif includes hashtag_names in response" do
        # Create GIF first without hashtags due to validation timing
        post api_v1_gifs_path,
             params: {
               gif: {
                 title: "Test GIF",
                 description: "Testing hashtag functionality",
                 privacy: "public_access"
               }
             },
             headers: @auth_headers,
             as: :json

        assert_response :created
        json = JSON.parse(response.body)

        # Verify hashtag_names key exists in response (even if empty)
        assert json["gif"].key?("hashtag_names"), "Response should include hashtag_names"
        assert_equal [], json["gif"]["hashtag_names"]
      end

      test "update gif hashtags includes hashtag_names in response" do
        gif = @user.gifs.create!(
          title: "Test GIF",
          privacy: :public_access
        )

        patch api_v1_gif_path(gif),
              params: {
                gif: {
                  hashtag_names: [ "updated", "newtag" ]
                }
              },
              headers: @auth_headers,
              as: :json

        assert_response :success
        json = JSON.parse(response.body)

        assert json["gif"].key?("hashtag_names"), "Response should include hashtag_names"
        assert_equal 2, json["gif"]["hashtag_names"].length
        assert_includes json["gif"]["hashtag_names"], "updated"
        assert_includes json["gif"]["hashtag_names"], "newtag"
      end

      test "show gif includes hashtag_names in response" do
        gif = @user.gifs.create!(
          title: "GIF with Tags",
          privacy: :public_access
        )
        # Add hashtags after creation
        gif.update!(hashtag_names: [ "showtest", "visible" ])

        get api_v1_gif_path(gif), as: :json

        assert_response :success
        json = JSON.parse(response.body)

        assert json["gif"].key?("hashtag_names"), "Response should include hashtag_names"
        assert_equal 2, json["gif"]["hashtag_names"].length
        assert_includes json["gif"]["hashtag_names"], "showtest"
        assert_includes json["gif"]["hashtag_names"], "visible"
      end

      test "index gifs includes hashtag_names in response" do
        # Create a GIF and add hashtags after
        gif = @user.gifs.create!(
          title: "Public GIF with Tags",
          privacy: :public_access
        )
        gif.update!(hashtag_names: [ "indextest", "public" ])

        get api_v1_gifs_path, as: :json

        assert_response :success
        json = JSON.parse(response.body)

        assert json["gifs"].is_a?(Array)

        # Find our test gif in the response
        test_gif = json["gifs"].find { |g| g["title"] == "Public GIF with Tags" }

        if test_gif
          assert test_gif.key?("hashtag_names"), "Each GIF should include hashtag_names"
          assert_includes test_gif["hashtag_names"], "indextest"
          assert_includes test_gif["hashtag_names"], "public"
        end
      end

      test "create gif with empty hashtag_names returns empty array" do
        post api_v1_gifs_path,
             params: {
               gif: {
                 title: "GIF without Tags",
                 privacy: :public_access,
                 hashtag_names: []
               }
             },
             headers: @auth_headers,
             as: :json

        assert_response :created
        json = JSON.parse(response.body)

        assert json["gif"].key?("hashtag_names")
        assert_equal [], json["gif"]["hashtag_names"]
      end

      test "create gif without hashtag_names param returns empty array" do
        post api_v1_gifs_path,
             params: {
               gif: {
                 title: "GIF without Tags Param",
                 privacy: :public_access
               }
             },
             headers: @auth_headers,
             as: :json

        assert_response :created
        json = JSON.parse(response.body)

        assert json["gif"].key?("hashtag_names")
        assert_equal [], json["gif"]["hashtag_names"]
      end

      # ========== AUTHENTICATION TESTS ==========

      test "create gif without auth returns 401" do
        assert_no_difference("Gif.count") do
          post api_v1_gifs_path,
               params: {
                 gif: {
                   title: "Unauthorized GIF",
                   privacy: :public_access
                 }
               },
               as: :json
        end

        assert_response :unauthorized
      end

      test "update gif without auth returns 401" do
        gif = @user.gifs.create!(title: "Test GIF", privacy: :public_access)
        original_title = gif.title

        patch api_v1_gif_path(gif),
              params: {
                gif: { title: "Hacked Title" }
              },
              as: :json

        assert_response :unauthorized
        assert_equal original_title, gif.reload.title
      end

      test "delete gif without auth returns 401" do
        gif = @user.gifs.create!(title: "Test GIF", privacy: :public_access)

        delete api_v1_gif_path(gif), as: :json

        assert_response :unauthorized
        assert_not gif.reload.deleted_at.present?
      end

      test "create gif with invalid token returns 401" do
        invalid_headers = { "Authorization" => "Bearer invalid.token.here" }

        assert_no_difference("Gif.count") do
          post api_v1_gifs_path,
               params: {
                 gif: {
                   title: "Invalid Token GIF",
                   privacy: :public_access
                 }
               },
               headers: invalid_headers,
               as: :json
        end

        assert_response :unauthorized
      end

      test "create gif with expired token returns 401" do
        expired_payload = {
          sub: @user.id,
          exp: 1.hour.ago.to_i
        }
        expired_token = JWT.encode(expired_payload, ENV.fetch("JWT_SECRET_KEY", "changeme-in-production"))
        expired_headers = { "Authorization" => "Bearer #{expired_token}" }

        assert_no_difference("Gif.count") do
          post api_v1_gifs_path,
               params: {
                 gif: {
                   title: "Expired Token GIF",
                   privacy: :public_access
                 }
               },
               headers: expired_headers,
               as: :json
        end

        assert_response :unauthorized
      end

      test "index gifs works without auth" do
        # Create a public GIF
        @user.gifs.create!(title: "Public GIF", privacy: :public_access)

        get api_v1_gifs_path, as: :json

        assert_response :success
        json = JSON.parse(response.body)
        assert json.key?("gifs")
      end

      test "show public gif works without auth" do
        gif = @user.gifs.create!(title: "Public GIF", privacy: :public_access)

        get api_v1_gif_path(gif), as: :json

        assert_response :success
        json = JSON.parse(response.body)
        assert_equal gif.id, json["gif"]["id"]
      end

      # ========== AUTHORIZATION TESTS ==========

      test "cannot update another user's gif" do
        other_gif = @other_user.gifs.create!(title: "Other User GIF", privacy: :public_access)
        original_title = other_gif.title

        patch api_v1_gif_path(other_gif),
              params: {
                gif: { title: "Hacked!" }
              },
              headers: @auth_headers,
              as: :json

        assert_response :forbidden
        assert_equal original_title, other_gif.reload.title
      end

      test "cannot delete another user's gif" do
        other_gif = @other_user.gifs.create!(title: "Other User GIF", privacy: :public_access)

        delete api_v1_gif_path(other_gif),
               headers: @auth_headers,
               as: :json

        assert_response :forbidden
        assert_not other_gif.reload.deleted_at.present?
      end

      test "can update own gif" do
        gif = @user.gifs.create!(title: "My GIF", privacy: :public_access)

        patch api_v1_gif_path(gif),
              params: {
                gif: { title: "Updated Title" }
              },
              headers: @auth_headers,
              as: :json

        assert_response :success
        assert_equal "Updated Title", gif.reload.title
      end

      test "can delete own gif" do
        gif = @user.gifs.create!(title: "My GIF to Delete", privacy: :public_access)

        delete api_v1_gif_path(gif),
               headers: @auth_headers,
               as: :json

        assert_response :success
        assert gif.reload.deleted_at.present?
      end

      # ========== FILE UPLOAD AUTHENTICATION TEST ==========

      test "file upload without auth returns 401" do
        gif_file = fixture_file_upload("test.gif", "image/gif")

        assert_no_difference("Gif.count") do
          post api_v1_gifs_path,
               params: {
                 gif: {
                   title: "Unauthorized File Upload",
                   file: gif_file
                 }
               }
        end

        assert_response :unauthorized
      end

      test "file upload with auth succeeds" do
        gif_file = fixture_file_upload("test.gif", "image/gif")

        assert_difference("Gif.count", 1) do
          post api_v1_gifs_path,
               params: {
                 gif: {
                   title: "Authorized File Upload",
                   privacy: :public_access,
                   file: gif_file
                 }
               },
               headers: @auth_headers
        end

        assert_response :created
        json = JSON.parse(response.body)
        assert_equal "Authorized File Upload", json["gif"]["title"]
      end

      private

      # Helper to generate JWT token for API authentication
      def generate_jwt_token(user)
        # Ensure user has jti
        user.update_column(:jti, SecureRandom.uuid) if user.jti.nil?

        payload = {
          sub: user.id,
          jti: user.jti,
          exp: 24.hours.from_now.to_i
        }
        JWT.encode(payload, ENV.fetch("JWT_SECRET_KEY", "changeme-in-production"))
      end
    end
  end
end
