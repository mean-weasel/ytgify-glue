require "test_helper"

class CollectionTest < ActiveSupport::TestCase
  def setup
    @user = User.create!(
      email: "user@example.com",
      username: "testuser",
      password: "password123"
    )
    @collection = Collection.create!(
      user: @user,
      name: "My Favorites",
      description: "Best GIFs ever"
    )
    @gif = Gif.create!(
      user: @user,
      title: "Test GIF",
      privacy: :public_access
    )
  end

  test "should create valid collection" do
    collection = Collection.new(user: @user, name: "Test Collection")
    assert collection.valid?
    assert collection.save
  end

  test "should require name" do
    collection = Collection.new(user: @user)
    assert_not collection.valid?
    assert_includes collection.errors[:name], "can't be blank"
  end

  test "should require user" do
    collection = Collection.new(name: "Test")
    assert_not collection.valid?
  end

  test "should not allow duplicate names for same user" do
    Collection.create!(user: @user, name: "Favorites")
    duplicate = Collection.new(user: @user, name: "Favorites")
    assert_not duplicate.valid?
  end

  test "should allow same name for different users" do
    other_user = User.create!(email: "other@example.com", username: "other", password: "password123")
    Collection.create!(user: @user, name: "Favorites")
    same_name = Collection.new(user: other_user, name: "Favorites")
    assert same_name.valid?
  end

  test "should not allow duplicate names case insensitive" do
    Collection.create!(user: @user, name: "Favorites")
    duplicate = Collection.new(user: @user, name: "favorites")
    assert_not duplicate.valid?
  end

  test "add_gif should add gif to collection" do
    assert_difference "@collection.gifs.count", 1 do
      @collection.add_gif(@gif)
    end
  end

  test "add_gif should not add duplicate" do
    @collection.add_gif(@gif)

    assert_no_difference "@collection.gifs.count" do
      result = @collection.add_gif(@gif)
      assert_not result
    end
  end

  test "remove_gif should remove gif" do
    @collection.add_gif(@gif)

    assert_difference "@collection.gifs.count", -1 do
      @collection.remove_gif(@gif)
    end
  end

  test "should update gifs_count counter cache" do
    assert_equal 0, @collection.gifs_count

    @collection.add_gif(@gif)
    @collection.reload
    assert_equal 1, @collection.gifs_count
  end

  test "visible_to? returns true for owner" do
    @collection.update(is_public: false)
    assert @collection.visible_to?(@user)
  end

  test "visible_to? returns true for public collections" do
    @collection.update(is_public: true)
    other_user = User.create!(email: "other@example.com", username: "other", password: "password123")
    assert @collection.visible_to?(other_user)
  end

  test "visible_to? returns false for private collections" do
    @collection.update(is_public: false)
    other_user = User.create!(email: "other@example.com", username: "other", password: "password123")
    assert_not @collection.visible_to?(other_user)
  end

  test "reorder_gifs should update positions" do
    gif2 = Gif.create!(user: @user, title: "GIF 2", privacy: :public_access)
    gif3 = Gif.create!(user: @user, title: "GIF 3", privacy: :public_access)

    @collection.add_gif(@gif)
    @collection.add_gif(gif2)
    @collection.add_gif(gif3)

    # Reorder: gif3, gif, gif2
    @collection.reorder_gifs([ gif3.id, @gif.id, gif2.id ])

    collection_gifs = @collection.collection_gifs.order(:position)
    assert_equal gif3.id, collection_gifs[0].gif_id
    assert_equal @gif.id, collection_gifs[1].gif_id
    assert_equal gif2.id, collection_gifs[2].gif_id
  end

  test "public_collections scope returns only public collections" do
    initial_public = Collection.public_collections.count

    public_collection = Collection.create!(user: @user, name: "Public", is_public: true)
    Collection.create!(user: @user, name: "Private", is_public: false)

    public_collections = Collection.public_collections
    assert_equal initial_public + 1, public_collections.count
    assert public_collections.include?(public_collection)
    assert public_collection.is_public
  end

  test "private_collections scope returns only private collections" do
    initial_private = Collection.private_collections.count

    Collection.create!(user: @user, name: "Public", is_public: true)
    private_collection = Collection.create!(user: @user, name: "Private", is_public: false)

    private_collections = Collection.private_collections
    assert_equal initial_private + 1, private_collections.count
    assert private_collections.include?(private_collection)
    assert_not private_collection.is_public
  end

  test "with_gifs scope returns collections with gifs" do
    empty_collection = Collection.create!(user: @user, name: "Empty")
    @collection.add_gif(@gif)

    with_gifs = Collection.with_gifs
    assert_includes with_gifs, @collection
    assert_not_includes with_gifs, empty_collection
  end

  test "recent scope orders by created_at desc" do
    collection1 = Collection.create!(user: @user, name: "First")
    sleep 0.01
    collection2 = Collection.create!(user: @user, name: "Second")

    recent = Collection.recent
    assert_equal collection2.id, recent.first.id
  end

  # ========== ADDITIONAL VALIDATION TESTS ==========

  test "should reject name longer than 100 characters" do
    collection = Collection.new(user: @user, name: "a" * 101)
    assert_not collection.valid?
    assert_includes collection.errors[:name], "is too long (maximum is 100 characters)"
  end

  test "should accept name at max length" do
    collection = Collection.new(user: @user, name: "a" * 100)
    assert collection.valid?
  end

  test "should accept name at minimum length" do
    collection = Collection.new(user: @user, name: "a")
    assert collection.valid?
  end

  test "should reject description longer than 500 characters" do
    collection = Collection.new(user: @user, name: "Test", description: "a" * 501)
    assert_not collection.valid?
    assert_includes collection.errors[:description], "is too long (maximum is 500 characters)"
  end

  test "should accept description at max length" do
    collection = Collection.new(user: @user, name: "Test", description: "a" * 500)
    assert collection.valid?
  end

  test "should accept blank description" do
    collection = Collection.new(user: @user, name: "Test", description: "")
    assert collection.valid?
  end

  test "should accept nil description" do
    collection = Collection.new(user: @user, name: "Test", description: nil)
    assert collection.valid?
  end

  # ========== ADD_GIF EDGE CASES ==========

  test "add_gif with custom position" do
    gif2 = Gif.create!(user: @user, title: "GIF 2", privacy: :public_access)

    @collection.add_gif(@gif, position: 5)
    @collection.add_gif(gif2, position: 10)

    collection_gif1 = @collection.collection_gifs.find_by(gif: @gif)
    collection_gif2 = @collection.collection_gifs.find_by(gif: gif2)

    assert_equal 5, collection_gif1.position
    assert_equal 10, collection_gif2.position
  end

  test "add_gif auto-increments position" do
    gif2 = Gif.create!(user: @user, title: "GIF 2", privacy: :public_access)
    gif3 = Gif.create!(user: @user, title: "GIF 3", privacy: :public_access)

    @collection.add_gif(@gif)
    @collection.add_gif(gif2)
    @collection.add_gif(gif3)

    positions = @collection.collection_gifs.order(:position).pluck(:position)
    assert_equal [ 1, 2, 3 ], positions
  end

  # ========== REMOVE_GIF EDGE CASES ==========

  test "remove_gif returns nil when gif not in collection" do
    other_gif = Gif.create!(user: @user, title: "Other", privacy: :public_access)

    result = @collection.remove_gif(other_gif)
    assert_nil result
  end

  test "remove_gif decrements gifs_count" do
    @collection.add_gif(@gif)
    @collection.reload

    initial_count = @collection.gifs_count

    @collection.remove_gif(@gif)
    @collection.reload

    assert_equal initial_count - 1, @collection.gifs_count
  end

  # ========== REORDER_GIFS EDGE CASES ==========

  test "reorder_gifs handles partial list" do
    gif2 = Gif.create!(user: @user, title: "GIF 2", privacy: :public_access)
    gif3 = Gif.create!(user: @user, title: "GIF 3", privacy: :public_access)

    @collection.add_gif(@gif)
    @collection.add_gif(gif2)
    @collection.add_gif(gif3)

    # Only reorder gif3 and gif2, leave gif1 position unchanged
    @collection.reorder_gifs([ gif3.id, gif2.id ])

    gif3_position = @collection.collection_gifs.find_by(gif: gif3).position
    gif2_position = @collection.collection_gifs.find_by(gif: gif2).position

    assert_equal 0, gif3_position
    assert_equal 1, gif2_position
  end

  test "reorder_gifs ignores non-existent gifs" do
    @collection.add_gif(@gif)

    # Try to reorder with non-existent ID
    assert_nothing_raised do
      @collection.reorder_gifs([ 99999, @gif.id ])
    end
  end

  # ========== SCOPE TESTS ==========

  test "by_user scope filters by user_id" do
    other_user = User.create!(email: "other@example.com", username: "other", password: "password123")

    collection1 = Collection.create!(user: @user, name: "User1 Collection")
    collection2 = Collection.create!(user: other_user, name: "User2 Collection")

    user_collections = Collection.by_user(@user.id)
    assert_includes user_collections, collection1
    assert_not_includes user_collections, collection2
  end

  # ========== ASSOCIATION TESTS ==========

  test "should destroy collection_gifs when collection destroyed" do
    @collection.add_gif(@gif)

    assert_difference("CollectionGif.count", -1) do
      @collection.destroy
    end
  end

  test "collection_gifs ordered by position" do
    gif2 = Gif.create!(user: @user, title: "GIF 2", privacy: :public_access)
    gif3 = Gif.create!(user: @user, title: "GIF 3", privacy: :public_access)

    @collection.add_gif(gif3, position: 30)
    @collection.add_gif(@gif, position: 10)
    @collection.add_gif(gif2, position: 20)

    ordered_gifs = @collection.collection_gifs.to_a
    assert_equal @gif.id, ordered_gifs[0].gif_id
    assert_equal gif2.id, ordered_gifs[1].gif_id
    assert_equal gif3.id, ordered_gifs[2].gif_id
  end

  test "has_many gifs through collection_gifs" do
    gif2 = Gif.create!(user: @user, title: "GIF 2", privacy: :public_access)

    @collection.add_gif(@gif)
    @collection.add_gif(gif2)

    assert_equal 2, @collection.gifs.count
    assert_includes @collection.gifs, @gif
    assert_includes @collection.gifs, gif2
  end

  # ========== VISIBLE_TO? EDGE CASES ==========

  test "visible_to? returns true for public collection with nil user" do
    @collection.update(is_public: true)
    assert @collection.visible_to?(nil)
  end

  test "visible_to? returns false for private collection with nil user" do
    @collection.update(is_public: false)
    assert_not @collection.visible_to?(nil)
  end
end
