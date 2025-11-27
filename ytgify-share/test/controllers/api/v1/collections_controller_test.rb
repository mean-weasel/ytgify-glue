require "test_helper"

module Api
  module V1
    class CollectionsControllerTest < ActionDispatch::IntegrationTest
      fixtures :users, :gifs, :collections

      setup do
        @alice = users(:one)
        @bob = users(:two)
        @gif = gifs(:alice_public_gif)

        # Ensure users have jti
        @alice.update_column(:jti, SecureRandom.uuid) if @alice.jti.nil?
        @bob.update_column(:jti, SecureRandom.uuid) if @bob.jti.nil?

        # Create test collections
        @alice_public_collection = @alice.collections.create!(
          name: "Alice's Public Collection",
          description: "Public collection",
          is_public: true
        )

        @alice_private_collection = @alice.collections.create!(
          name: "Alice's Private Collection",
          description: "Private collection",
          is_public: false
        )

        @bob_public_collection = @bob.collections.create!(
          name: "Bob's Public Collection",
          is_public: true
        )
      end

      # ========== INDEX TESTS (CURRENT USER) ==========

      test "index should return current user's collections when authenticated" do
        get api_v1_collections_path,
            headers: auth_headers(@alice),
            as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_includes json, "collections"
        assert_includes json, "pagination"
        assert_kind_of Array, json["collections"]
      end

      test "index includes both public and private collections for owner" do
        get api_v1_collections_path,
            headers: auth_headers(@alice),
            as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        collection_ids = json["collections"].map { |c| c["id"] }

        assert_includes collection_ids, @alice_public_collection.id
        assert_includes collection_ids, @alice_private_collection.id
      end

      # ========== INDEX TESTS (USER COLLECTIONS) ==========

      test "index for specific user should not require authentication" do
        get api_v1_user_collections_path(user_id: @bob.id), as: :json
        assert_response :ok
      end

      test "index for specific user returns only public collections" do
        get api_v1_user_collections_path(user_id: @alice.id),
            headers: auth_headers(@bob),
            as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        collection_ids = json["collections"].map { |c| c["id"] }

        # Bob should see Alice's public collection
        assert_includes collection_ids, @alice_public_collection.id
        # Bob should NOT see Alice's private collection
        assert_not_includes collection_ids, @alice_private_collection.id
      end

      test "index for own user ID returns all collections" do
        get api_v1_user_collections_path(user_id: @alice.id),
            headers: auth_headers(@alice),
            as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        collection_ids = json["collections"].map { |c| c["id"] }

        # Alice should see both her collections
        assert_includes collection_ids, @alice_public_collection.id
        assert_includes collection_ids, @alice_private_collection.id
      end

      test "index collection JSON includes required fields" do
        get api_v1_collections_path,
            headers: auth_headers(@alice),
            as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        collection = json["collections"].first

        assert_includes collection, "id"
        assert_includes collection, "name"
        assert_includes collection, "description"
        assert_includes collection, "is_public"
        assert_includes collection, "gifs_count"
        assert_includes collection, "created_at"
        assert_includes collection, "updated_at"
        assert_includes collection, "user"
      end

      test "index supports pagination" do
        # Create multiple collections
        5.times do |i|
          @alice.collections.create!(name: "Collection #{i}")
        end

        get api_v1_collections_path(page: 1, per_page: 2),
            headers: auth_headers(@alice),
            as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal 2, json["collections"].length
        assert_equal 1, json["pagination"]["page"]
        assert_equal 2, json["pagination"]["per_page"]
      end

      # ========== SHOW TESTS ==========

      test "show should not require authentication for public collection" do
        get api_v1_collection_path(@alice_public_collection), as: :json
        assert_response :ok
      end

      test "show should return collection with GIFs" do
        @alice_public_collection.add_gif(@gif)

        get api_v1_collection_path(@alice_public_collection),
            headers: auth_headers(@bob),
            as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_includes json, "collection"
        assert_includes json, "gifs"
        assert_includes json, "pagination"
      end

      test "show should prevent access to private collection by non-owner" do
        get api_v1_collection_path(@alice_private_collection),
            headers: auth_headers(@bob),
            as: :json

        assert_response :forbidden
        json = JSON.parse(response.body)
        assert_equal "Collection is private", json["error"]
      end

      test "show should allow owner to view private collection" do
        get api_v1_collection_path(@alice_private_collection),
            headers: auth_headers(@alice),
            as: :json

        assert_response :ok
      end

      test "show returns 404 for non-existent collection" do
        get api_v1_collection_path(id: "00000000-0000-0000-0000-000000000000"),
            headers: auth_headers(@alice),
            as: :json

        assert_response :not_found
      end

      test "show includes GIFs with pagination" do
        # Add multiple GIFs
        5.times do |i|
          gif = @alice.gifs.create!(title: "GIF #{i}", privacy: :public_access)
          @alice_public_collection.add_gif(gif)
        end

        get api_v1_collection_path(@alice_public_collection, per_page: 2),
            headers: auth_headers(@alice),
            as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal 2, json["gifs"].length
        assert_equal 2, json["pagination"]["per_page"]
      end

      # ========== CREATE TESTS ==========

      test "create should require authentication" do
        post api_v1_collections_path,
             params: { collection: { name: "Test Collection" } },
             as: :json

        assert_response :unauthorized
      end

      test "create should create collection with valid params" do
        assert_difference("@alice.collections.count", 1) do
          post api_v1_collections_path,
               params: {
                 collection: {
                   name: "New Collection",
                   description: "Test description",
                   is_public: true
                 }
               },
               headers: auth_headers(@alice),
               as: :json
        end

        assert_response :created
        json = JSON.parse(response.body)
        assert_equal "New Collection", json["name"]
        assert_equal "Test description", json["description"]
        assert json["is_public"]
      end

      test "create should fail with missing name" do
        assert_no_difference("Collection.count") do
          post api_v1_collections_path,
               params: { collection: { name: "" } },
               headers: auth_headers(@alice),
               as: :json
        end

        assert_response :unprocessable_entity
        json = JSON.parse(response.body)
        assert_includes json, "errors"
      end

      test "create should set current_user as collection owner" do
        post api_v1_collections_path,
             params: { collection: { name: "Bob's New Collection" } },
             headers: auth_headers(@bob),
             as: :json

        assert_response :created
        json = JSON.parse(response.body)
        collection = Collection.find(json["id"])
        assert_equal @bob, collection.user
      end

      # ========== UPDATE TESTS ==========

      test "update should require authentication" do
        patch api_v1_collection_path(@alice_public_collection),
              params: { collection: { name: "Updated" } },
              as: :json

        assert_response :unauthorized
      end

      test "update should allow owner to update collection" do
        patch api_v1_collection_path(@alice_public_collection),
              params: { collection: { name: "Updated Name" } },
              headers: auth_headers(@alice),
              as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal "Updated Name", json["name"]
      end

      test "update should prevent non-owner from updating" do
        patch api_v1_collection_path(@alice_public_collection),
              params: { collection: { name: "Bob's update" } },
              headers: auth_headers(@bob),
              as: :json

        assert_response :forbidden
      end

      test "update should fail with invalid params" do
        patch api_v1_collection_path(@alice_public_collection),
              params: { collection: { name: "" } },
              headers: auth_headers(@alice),
              as: :json

        assert_response :unprocessable_entity
        json = JSON.parse(response.body)
        assert_includes json, "errors"
      end

      test "update should change privacy setting" do
        patch api_v1_collection_path(@alice_public_collection),
              params: { collection: { is_public: false } },
              headers: auth_headers(@alice),
              as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_not json["is_public"]
      end

      # ========== DESTROY TESTS ==========

      test "destroy should require authentication" do
        delete api_v1_collection_path(@alice_public_collection) + ".json"
        assert_response :unauthorized
      end

      test "destroy should allow owner to delete collection" do
        assert_difference("Collection.count", -1) do
          delete api_v1_collection_path(@alice_public_collection) + ".json",
                 headers: auth_headers(@alice)
        end

        assert_response :no_content
      end

      test "destroy should prevent non-owner from deleting" do
        assert_no_difference("Collection.count") do
          delete api_v1_collection_path(@alice_public_collection) + ".json",
                 headers: auth_headers(@bob)
        end

        assert_response :forbidden
      end

      test "destroy returns 404 for non-existent collection" do
        delete api_v1_collection_path(id: "00000000-0000-0000-0000-000000000000") + ".json",
               headers: auth_headers(@alice)

        assert_response :not_found
      end

      # ========== ADD_GIF TESTS ==========

      test "add_gif should require authentication" do
        post add_gif_api_v1_collection_path(@alice_public_collection),
             params: { gif_id: @gif.id },
             as: :json

        assert_response :unauthorized
      end

      test "add_gif should allow owner to add GIF" do
        post add_gif_api_v1_collection_path(@alice_public_collection),
             params: { gif_id: @gif.id },
             headers: auth_headers(@alice),
             as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal "GIF added to collection", json["message"]
        assert_includes json, "gifs_count"
      end

      test "add_gif should prevent non-owner from adding" do
        post add_gif_api_v1_collection_path(@alice_public_collection),
             params: { gif_id: @gif.id },
             headers: auth_headers(@bob),
             as: :json

        assert_response :forbidden
      end

      test "add_gif should increment gifs_count" do
        initial_count = @alice_public_collection.gifs_count || 0

        post add_gif_api_v1_collection_path(@alice_public_collection),
             params: { gif_id: @gif.id },
             headers: auth_headers(@alice),
             as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal initial_count + 1, json["gifs_count"]
      end

      test "add_gif should fail when GIF already in collection" do
        @alice_public_collection.add_gif(@gif)

        post add_gif_api_v1_collection_path(@alice_public_collection),
             params: { gif_id: @gif.id },
             headers: auth_headers(@alice),
             as: :json

        assert_response :unprocessable_entity
        json = JSON.parse(response.body)
        assert_equal "GIF already in collection", json["error"]
      end

      test "add_gif returns 404 for non-existent GIF" do
        post add_gif_api_v1_collection_path(@alice_public_collection),
             params: { gif_id: "00000000-0000-0000-0000-000000000000" },
             headers: auth_headers(@alice),
             as: :json

        assert_response :not_found
      end

      # ========== REMOVE_GIF TESTS ==========

      test "remove_gif should require authentication" do
        @alice_public_collection.add_gif(@gif)

        delete api_v1_collection_path(@alice_public_collection) + "/remove_gif/#{@gif.id}.json"

        assert_response :unauthorized
      end

      test "remove_gif should allow owner to remove GIF" do
        @alice_public_collection.add_gif(@gif)

        delete api_v1_collection_path(@alice_public_collection) + "/remove_gif/#{@gif.id}.json",
               headers: auth_headers(@alice)

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal "GIF removed from collection", json["message"]
        assert_includes json, "gifs_count"
      end

      test "remove_gif should prevent non-owner from removing" do
        @alice_public_collection.add_gif(@gif)

        delete api_v1_collection_path(@alice_public_collection) + "/remove_gif/#{@gif.id}.json",
               headers: auth_headers(@bob)

        assert_response :forbidden
      end

      test "remove_gif should decrement gifs_count" do
        @alice_public_collection.add_gif(@gif)
        initial_count = @alice_public_collection.reload.gifs_count

        delete api_v1_collection_path(@alice_public_collection) + "/remove_gif/#{@gif.id}.json",
               headers: auth_headers(@alice)

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal initial_count - 1, json["gifs_count"]
      end

      test "remove_gif should fail when GIF not in collection" do
        delete api_v1_collection_path(@alice_public_collection) + "/remove_gif/#{@gif.id}.json",
               headers: auth_headers(@alice)

        assert_response :not_found
        json = JSON.parse(response.body)
        assert_equal "GIF not in collection", json["error"]
      end

      # ========== REORDER TESTS ==========

      test "reorder should require authentication" do
        patch reorder_api_v1_collection_path(@alice_public_collection),
              params: { gif_ids: [] },
              as: :json

        assert_response :unauthorized
      end

      test "reorder should allow owner to reorder GIFs" do
        # Add multiple GIFs
        gif1 = @alice.gifs.create!(title: "GIF 1", privacy: :public_access)
        gif2 = @alice.gifs.create!(title: "GIF 2", privacy: :public_access)
        @alice_public_collection.add_gif(gif1)
        @alice_public_collection.add_gif(gif2)

        patch reorder_api_v1_collection_path(@alice_public_collection),
              params: { gif_ids: [ gif2.id, gif1.id ] },
              headers: auth_headers(@alice),
              as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal "Collection reordered", json["message"]
      end

      test "reorder should prevent non-owner from reordering" do
        patch reorder_api_v1_collection_path(@alice_public_collection),
              params: { gif_ids: [] },
              headers: auth_headers(@bob),
              as: :json

        assert_response :forbidden
      end

      # ========== AUTHENTICATION ERROR TESTS ==========

      test "create should reject invalid JWT token" do
        post api_v1_collections_path,
             params: { collection: { name: "Test" } },
             headers: { "Authorization" => "Bearer invalid_token" },
             as: :json

        assert_response :unauthorized
      end

      test "create should reject expired JWT token" do
        expired_token = generate_expired_jwt_token(@alice)

        post api_v1_collections_path,
             params: { collection: { name: "Test" } },
             headers: { "Authorization" => "Bearer #{expired_token}" },
             as: :json

        assert_response :unauthorized
      end

      # ========== EDGE CASES ==========

      test "show excludes soft-deleted GIFs" do
        @alice_public_collection.add_gif(@gif)
        @gif.soft_delete!

        get api_v1_collection_path(@alice_public_collection),
            headers: auth_headers(@alice),
            as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal [], json["gifs"]
      end

      test "pagination enforces max per_page of 100" do
        get api_v1_collections_path(per_page: 200),
            headers: auth_headers(@alice),
            as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal 100, json["pagination"]["per_page"]
      end

      test "pagination enforces min page of 1" do
        get api_v1_collections_path(page: 0),
            headers: auth_headers(@alice),
            as: :json

        assert_response :ok
        json = JSON.parse(response.body)
        assert_equal 1, json["pagination"]["page"]
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
