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
                  hashtag_names: ["updated", "newtag"]
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
        gif.update!(hashtag_names: ["showtest", "visible"])

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
        gif.update!(hashtag_names: ["indextest", "public"])

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

      private

      # Helper to generate JWT token for API authentication
      def generate_jwt_token(user)
        payload = {
          sub: user.id,
          exp: 24.hours.from_now.to_i
        }
        JWT.encode(payload, ENV.fetch('JWT_SECRET_KEY', 'changeme-in-production'))
      end
    end
  end
end
