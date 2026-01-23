require "test_helper"

module Api
  module V1
    class AuthControllerTest < ActionDispatch::IntegrationTest
      fixtures :users

      setup do
        @alice = users(:one)
        @bob = users(:two)

        # Ensure users have jti
        @alice.update_column(:jti, SecureRandom.uuid) if @alice.jti.nil?
        @bob.update_column(:jti, SecureRandom.uuid) if @bob.jti.nil?
      end

      # ========== REGISTER ENDPOINT TESTS ==========

      test "register should create user with valid params" do
        assert_difference("User.count", 1) do
          post api_v1_auth_register_path, params: {
            user: {
              email: "newuser@example.com",
              username: "newuser",
              password: "password123",
              password_confirmation: "password123"
            }
          }, as: :json
        end

        assert_response :created
        json = JSON.parse(response.body)
        assert_equal "Registration successful", json["message"]
        assert_includes json, "user"
        assert_includes json, "token"
        assert_equal "newuser@example.com", json["user"]["email"]
        assert_equal "newuser", json["user"]["username"]
      end

      test "register should return JWT token" do
        post api_v1_auth_register_path, params: {
          user: {
            email: "tokentest@example.com",
            username: "tokentest",
            password: "password123",
            password_confirmation: "password123"
          }
        }, as: :json

        assert_response :created
        json = JSON.parse(response.body)
        token = json["token"]

        assert_not_nil token
        # Verify token is valid JWT
        decoded = JWT.decode(token, ENV.fetch("JWT_SECRET_KEY", "changeme-in-production")).first
        assert_equal User.find_by(email: "tokentest@example.com").id, decoded["sub"]
      end

      test "register should fail with duplicate email" do
        assert_no_difference("User.count") do
          post api_v1_auth_register_path, params: {
            user: {
              email: @alice.email,
              username: "uniqueusername",
              password: "password123",
              password_confirmation: "password123"
            }
          }, as: :json
        end

        assert_response :unprocessable_entity
        json = JSON.parse(response.body)
        assert_equal "Registration failed", json["error"]
        assert_includes json, "details"
      end

      test "register should fail with duplicate username" do
        assert_no_difference("User.count") do
          post api_v1_auth_register_path, params: {
            user: {
              email: "unique@example.com",
              username: @alice.username,
              password: "password123",
              password_confirmation: "password123"
            }
          }, as: :json
        end

        assert_response :unprocessable_entity
        json = JSON.parse(response.body)
        assert_equal "Registration failed", json["error"]
      end

      test "register should fail with missing email" do
        assert_no_difference("User.count") do
          post api_v1_auth_register_path, params: {
            user: {
              username: "noemailu ser",
              password: "password123",
              password_confirmation: "password123"
            }
          }, as: :json
        end

        assert_response :unprocessable_entity
      end

      test "register should fail with short password" do
        assert_no_difference("User.count") do
          post api_v1_auth_register_path, params: {
            user: {
              email: "short@example.com",
              username: "shortpass",
              password: "12345",
              password_confirmation: "12345"
            }
          }, as: :json
        end

        assert_response :unprocessable_entity
      end

      test "register should fail with password confirmation mismatch" do
        assert_no_difference("User.count") do
          post api_v1_auth_register_path, params: {
            user: {
              email: "mismatch@example.com",
              username: "mismatchuser",
              password: "password123",
              password_confirmation: "differentpassword"
            }
          }, as: :json
        end

        assert_response :unprocessable_entity
      end

      test "register user JSON includes all required fields" do
        post api_v1_auth_register_path, params: {
          user: {
            email: "complete@example.com",
            username: "completeuser",
            display_name: "Complete User",
            password: "password123",
            password_confirmation: "password123"
          }
        }, as: :json

        assert_response :created
        json = JSON.parse(response.body)
        user_data = json["user"]

        # Verify all user fields are present
        assert_includes user_data, "id"
        assert_includes user_data, "email"
        assert_includes user_data, "username"
        assert_includes user_data, "display_name"
        assert_includes user_data, "bio"
        assert_includes user_data, "avatar_url"
        assert_includes user_data, "is_verified"
        assert_includes user_data, "gifs_count"
        assert_includes user_data, "total_likes_received"
        assert_includes user_data, "follower_count"
        assert_includes user_data, "following_count"
        assert_includes user_data, "created_at"
        assert_includes user_data, "updated_at"
      end

      # ========== LOGIN ENDPOINT TESTS ==========

      test "login should succeed with valid credentials" do
        post api_v1_auth_login_path, params: {
          user: {
            email: @alice.email,
            password: "password123"
          }
        }, as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal "Login successful", json["message"]
        assert_includes json, "user"
        assert_includes json, "token"
        assert_equal @alice.email, json["user"]["email"]
      end

      test "login should return valid JWT token" do
        post api_v1_auth_login_path, params: {
          user: {
            email: @alice.email,
            password: "password123"
          }
        }, as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        token = json["token"]

        assert_not_nil token
        # Verify token is valid
        decoded = JWT.decode(token, ENV.fetch("JWT_SECRET_KEY", "changeme-in-production")).first
        assert_equal @alice.id, decoded["sub"]
        assert_not_nil decoded["exp"]
      end

      test "login should fail with wrong password" do
        post api_v1_auth_login_path, params: {
          user: {
            email: @alice.email,
            password: "wrongpassword"
          }
        }, as: :json

        assert_response :unauthorized
        json = JSON.parse(response.body)
        assert_equal "Invalid credentials", json["error"]
        assert_equal "Email or password is incorrect", json["message"]
      end

      test "login should fail with non-existent email" do
        post api_v1_auth_login_path, params: {
          user: {
            email: "nonexistent@example.com",
            password: "password123"
          }
        }, as: :json

        assert_response :unauthorized
        json = JSON.parse(response.body)
        assert_equal "Invalid credentials", json["error"]
      end

      test "login error message doesn't reveal if user exists" do
        # Both wrong password and wrong email should return same error
        post api_v1_auth_login_path, params: {
          user: { email: @alice.email, password: "wrong" }
        }, as: :json
        wrong_password_error = JSON.parse(response.body)["message"]

        post api_v1_auth_login_path, params: {
          user: { email: "nonexistent@example.com", password: "password123" }
        }, as: :json
        wrong_email_error = JSON.parse(response.body)["message"]

        assert_equal wrong_password_error, wrong_email_error
      end

      test "login should handle missing password parameter" do
        post api_v1_auth_login_path, params: {
          user: {
            email: @alice.email
          }
        }, as: :json

        # Should either return 400 (parameter missing) or 401 (unauthorized)
        assert_includes [ 400, 401 ], response.status
      end

      test "login should handle missing email parameter" do
        post api_v1_auth_login_path, params: {
          user: {
            password: "password123"
          }
        }, as: :json

        # Should either return 400 (parameter missing) or 401 (unauthorized)
        assert_includes [ 400, 401 ], response.status
      end

      # ========== LOGOUT ENDPOINT TESTS ==========

      test "logout should succeed when authenticated" do
        delete api_v1_auth_logout_path + ".json", headers: auth_headers(@alice)

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal "Logout successful", json["message"]
      end

      test "logout should require authentication" do
        delete api_v1_auth_logout_path + ".json"

        assert_response :unauthorized
      end

      test "logout should reject invalid token" do
        delete api_v1_auth_logout_path + ".json", headers: { "Authorization" => "Bearer invalid_token" }

        assert_response :unauthorized
      end

      # ========== REFRESH TOKEN ENDPOINT TESTS ==========

      test "refresh should return new token when authenticated" do
        old_token = generate_jwt_token(@alice)

        # Wait a moment to ensure different timestamps
        sleep 0.1

        post api_v1_auth_refresh_path,
             headers: { "Authorization" => "Bearer #{old_token}" },
             as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal "Token refreshed", json["message"]
        assert_includes json, "token"

        new_token = json["token"]
        assert_not_nil new_token

        # Verify new token is valid and has updated expiration
        old_decoded = JWT.decode(old_token, ENV.fetch("JWT_SECRET_KEY", "changeme-in-production")).first
        new_decoded = JWT.decode(new_token, ENV.fetch("JWT_SECRET_KEY", "changeme-in-production")).first

        assert_equal @alice.id, new_decoded["sub"]
        # New token should have later expiration time
        assert new_decoded["exp"] >= old_decoded["exp"]
      end

      test "refresh should require authentication" do
        post api_v1_auth_refresh_path, as: :json

        assert_response :unauthorized
      end

      test "refresh should reject expired token" do
        expired_token = generate_expired_jwt_token(@alice)

        post api_v1_auth_refresh_path,
             headers: { "Authorization" => "Bearer #{expired_token}" },
             as: :json

        assert_response :unauthorized
      end

      # ========== ME ENDPOINT TESTS ==========

      test "me should return current user data when authenticated" do
        get api_v1_auth_me_path,
            headers: auth_headers(@alice),
            as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_includes json, "user"
        assert_equal @alice.id, json["user"]["id"]
        assert_equal @alice.email, json["user"]["email"]
        assert_equal @alice.username, json["user"]["username"]
      end

      test "me should require authentication" do
        get api_v1_auth_me_path, as: :json

        assert_response :unauthorized
      end

      test "me should return complete user JSON" do
        get api_v1_auth_me_path,
            headers: auth_headers(@alice),
            as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        user_data = json["user"]

        # Verify all fields are present
        assert_includes user_data, "id"
        assert_includes user_data, "email"
        assert_includes user_data, "username"
        assert_includes user_data, "display_name"
        assert_includes user_data, "bio"
        assert_includes user_data, "avatar_url"
        assert_includes user_data, "is_verified"
        assert_includes user_data, "gifs_count"
        assert_includes user_data, "total_likes_received"
        assert_includes user_data, "follower_count"
        assert_includes user_data, "following_count"
      end

      # ========== EDGE CASES & SECURITY TESTS ==========

      test "register should reject request without user parameter" do
        post api_v1_auth_register_path, params: {
          email: "test@example.com"
        }, as: :json

        assert_response :bad_request
        json = JSON.parse(response.body)
        assert_equal "Parameter missing", json["error"]
      end

      test "login should reject request without user parameter" do
        post api_v1_auth_login_path, params: {
          email: @alice.email
        }, as: :json

        assert_response :bad_request
        json = JSON.parse(response.body)
        assert_equal "Parameter missing", json["error"]
      end

      test "JWT token should have expiration time" do
        post api_v1_auth_login_path, params: {
          user: {
            email: @alice.email,
            password: "password123"
          }
        }, as: :json

        json = JSON.parse(response.body)
        decoded = JWT.decode(json["token"], ENV.fetch("JWT_SECRET_KEY", "changeme-in-production")).first

        assert_not_nil decoded["exp"]
        assert decoded["exp"] > Time.now.to_i
        # Token should expire in ~15 minutes
        assert decoded["exp"] <= 16.minutes.from_now.to_i
      end

      test "user JSON should not expose sensitive data" do
        post api_v1_auth_login_path, params: {
          user: {
            email: @alice.email,
            password: "password123"
          }
        }, as: :json

        json = JSON.parse(response.body)
        user_data = json["user"]

        # Should NOT include password or encrypted_password
        assert_not_includes user_data, "password"
        assert_not_includes user_data, "encrypted_password"
        assert_not_includes user_data, "password_digest"
      end

      # ========== GOOGLE AUTH ENDPOINT TESTS ==========

      test "google auth should fail without id_token" do
        post api_v1_auth_google_path, as: :json

        assert_response :bad_request
        json = JSON.parse(response.body)
        assert_equal "Missing Google ID token", json["error"]
      end

      test "google auth should fail with blank id_token" do
        post api_v1_auth_google_path, params: { id_token: "" }, as: :json

        assert_response :bad_request
        json = JSON.parse(response.body)
        assert_equal "Missing Google ID token", json["error"]
      end

      test "google auth should fail with invalid token" do
        post api_v1_auth_google_path, params: { id_token: "invalid_token" }, as: :json

        assert_response :unauthorized
      end

      test "google auth should succeed with valid token and create new user" do
        # Create a mock Google ID token (JWT)
        mock_payload = {
          "iss" => "https://accounts.google.com",
          "aud" => ENV.fetch("GOOGLE_CLIENT_ID", "test-client-id"),
          "sub" => "google_test_uid_12345",
          "email" => "newtestuser@gmail.com",
          "email_verified" => true,
          "name" => "New Test User",
          "exp" => 1.hour.from_now.to_i
        }
        mock_token = JWT.encode(mock_payload, nil, "none")

        # Stub environment variable for test
        original_client_id = ENV["GOOGLE_CLIENT_ID"]
        ENV["GOOGLE_CLIENT_ID"] = mock_payload["aud"]

        assert_difference("User.count", 1) do
          post api_v1_auth_google_path, params: { id_token: mock_token }, as: :json
        end

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal "Google authentication successful", json["message"]
        assert_includes json, "token"
        assert_includes json, "user"
        assert_equal "newtestuser@gmail.com", json["user"]["email"]
      ensure
        ENV["GOOGLE_CLIENT_ID"] = original_client_id
      end

      test "google auth should succeed with valid token and find existing user" do
        existing_user = User.create!(
          provider: "google_oauth2",
          uid: "existing_google_uid",
          email: "existinggoogle@gmail.com",
          username: "existinggoogleuser",
          password: Devise.friendly_token[0, 20]
        )

        mock_payload = {
          "iss" => "https://accounts.google.com",
          "aud" => ENV.fetch("GOOGLE_CLIENT_ID", "test-client-id"),
          "sub" => "existing_google_uid",
          "email" => "existinggoogle@gmail.com",
          "email_verified" => true,
          "name" => "Existing Google User",
          "exp" => 1.hour.from_now.to_i
        }
        mock_token = JWT.encode(mock_payload, nil, "none")

        original_client_id = ENV["GOOGLE_CLIENT_ID"]
        ENV["GOOGLE_CLIENT_ID"] = mock_payload["aud"]

        assert_no_difference("User.count") do
          post api_v1_auth_google_path, params: { id_token: mock_token }, as: :json
        end

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal existing_user.id, json["user"]["id"]
      ensure
        ENV["GOOGLE_CLIENT_ID"] = original_client_id
      end

      test "google auth should link existing email account to Google" do
        existing_user = User.create!(
          email: "linkable@gmail.com",
          username: "linkableuser",
          password: "password123"
        )

        assert_nil existing_user.provider

        mock_payload = {
          "iss" => "https://accounts.google.com",
          "aud" => ENV.fetch("GOOGLE_CLIENT_ID", "test-client-id"),
          "sub" => "new_google_uid_for_linking",
          "email" => "linkable@gmail.com",
          "email_verified" => true,
          "name" => "Linkable User",
          "exp" => 1.hour.from_now.to_i
        }
        mock_token = JWT.encode(mock_payload, nil, "none")

        original_client_id = ENV["GOOGLE_CLIENT_ID"]
        ENV["GOOGLE_CLIENT_ID"] = mock_payload["aud"]

        assert_no_difference("User.count") do
          post api_v1_auth_google_path, params: { id_token: mock_token }, as: :json
        end

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal existing_user.id, json["user"]["id"]

        # Verify account was linked
        existing_user.reload
        assert_equal "google_oauth2", existing_user.provider
        assert_equal "new_google_uid_for_linking", existing_user.uid
      ensure
        ENV["GOOGLE_CLIENT_ID"] = original_client_id
      end

      test "google auth should fail with unverified email" do
        mock_payload = {
          "iss" => "https://accounts.google.com",
          "aud" => ENV.fetch("GOOGLE_CLIENT_ID", "test-client-id"),
          "sub" => "unverified_uid",
          "email" => "unverified@gmail.com",
          "email_verified" => false,  # Not verified
          "name" => "Unverified User",
          "exp" => 1.hour.from_now.to_i
        }
        mock_token = JWT.encode(mock_payload, nil, "none")

        original_client_id = ENV["GOOGLE_CLIENT_ID"]
        ENV["GOOGLE_CLIENT_ID"] = mock_payload["aud"]

        post api_v1_auth_google_path, params: { id_token: mock_token }, as: :json

        assert_response :unauthorized
      ensure
        ENV["GOOGLE_CLIENT_ID"] = original_client_id
      end

      test "google auth should fail with expired token" do
        mock_payload = {
          "iss" => "https://accounts.google.com",
          "aud" => ENV.fetch("GOOGLE_CLIENT_ID", "test-client-id"),
          "sub" => "expired_uid",
          "email" => "expired@gmail.com",
          "email_verified" => true,
          "name" => "Expired User",
          "exp" => 1.hour.ago.to_i  # Expired
        }
        mock_token = JWT.encode(mock_payload, nil, "none")

        original_client_id = ENV["GOOGLE_CLIENT_ID"]
        ENV["GOOGLE_CLIENT_ID"] = mock_payload["aud"]

        post api_v1_auth_google_path, params: { id_token: mock_token }, as: :json

        assert_response :unauthorized
      ensure
        ENV["GOOGLE_CLIENT_ID"] = original_client_id
      end

      test "google auth should fail with wrong audience" do
        mock_payload = {
          "iss" => "https://accounts.google.com",
          "aud" => "wrong-client-id",  # Wrong audience
          "sub" => "wrong_aud_uid",
          "email" => "wrongaud@gmail.com",
          "email_verified" => true,
          "name" => "Wrong Audience User",
          "exp" => 1.hour.from_now.to_i
        }
        mock_token = JWT.encode(mock_payload, nil, "none")

        original_client_id = ENV["GOOGLE_CLIENT_ID"]
        ENV["GOOGLE_CLIENT_ID"] = "correct-client-id"

        post api_v1_auth_google_path, params: { id_token: mock_token }, as: :json

        assert_response :unauthorized
      ensure
        ENV["GOOGLE_CLIENT_ID"] = original_client_id
      end

      test "google auth returns valid JWT token" do
        mock_payload = {
          "iss" => "https://accounts.google.com",
          "aud" => ENV.fetch("GOOGLE_CLIENT_ID", "test-client-id"),
          "sub" => "jwt_test_uid",
          "email" => "jwttest@gmail.com",
          "email_verified" => true,
          "name" => "JWT Test User",
          "exp" => 1.hour.from_now.to_i
        }
        mock_token = JWT.encode(mock_payload, nil, "none")

        original_client_id = ENV["GOOGLE_CLIENT_ID"]
        ENV["GOOGLE_CLIENT_ID"] = mock_payload["aud"]

        post api_v1_auth_google_path, params: { id_token: mock_token }, as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        token = json["token"]

        # Verify returned token is valid JWT
        decoded = JWT.decode(token, ENV.fetch("JWT_SECRET_KEY", "changeme-in-production")).first
        assert_not_nil decoded["sub"]
        assert_not_nil decoded["exp"]
      ensure
        ENV["GOOGLE_CLIENT_ID"] = original_client_id
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
