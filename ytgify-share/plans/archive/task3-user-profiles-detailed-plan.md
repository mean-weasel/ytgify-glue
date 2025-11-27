# Task 3: User Profiles - Detailed Implementation Plan

**Status:** ~80% Complete, Needs Minor Additions
**Complexity:** Low (Most work already done)
**Time Estimate:** 1-2 hours
**Dependencies:** FollowsController (already complete)

---

## Executive Summary

The user profile system is **mostly complete** with excellent UI, tab navigation, and privacy controls. Only missing:
1. Routes for followers/following lists
2. Controller actions for these lists
3. View pages for followers/following
4. Reusable user card partial

Everything else (profile page, follow button, collections display, GIF grids) is **fully implemented and working**.

---

## Current State Analysis

### What Exists ✅

1. **UsersController** (`app/controllers/users_controller.rb`)
   - ✅ `show` action with tab switching (gifs, liked, collections)
   - ✅ Tab content loading methods with privacy filtering
   - ✅ Pagination with Pagy (12 items per page)
   - ✅ Username-based routing
   - ✅ Turbo Frame and Turbo Stream support
   - ❌ No `followers` or `following` actions

2. **Profile Views** (`app/views/users/`)
   - ✅ `show.html.erb` - Complete profile page with tabs
   - ✅ `show.turbo_stream.erb` - Tab content updates
   - ✅ `tabs/_gifs.html.erb` - User's GIFs grid
   - ✅ `tabs/_liked.html.erb` - Liked GIFs grid
   - ✅ `tabs/_collections.html.erb` - Collections display
   - ❌ No `followers.html.erb` or `following.html.erb`

3. **Follow System**
   - ✅ FollowsController with toggle action
   - ✅ Follow button partial with Turbo Streams
   - ✅ Follower count partial
   - ✅ Stimulus controller for loading states
   - ✅ Counter caches (follower_count, following_count)

4. **User Model** (`app/models/user.rb`)
   - ✅ All necessary fields (username, display_name, bio, avatar, etc.)
   - ✅ Associations (gifs, likes, followers, following, collections)
   - ✅ Helper methods (following?, liked?, avatar_url)
   - ✅ Counter caches and scopes

5. **GIF Display**
   - ✅ GIF card partial with like/comment/share actions
   - ✅ Grid layouts (responsive, 1-3 columns)
   - ✅ Privacy filtering (owner sees all, guests see public only)
   - ✅ Pagination support

6. **Collections Display**
   - ✅ Collection cards with 2x2 preview grid
   - ✅ Private badge for non-public collections
   - ✅ Privacy filtering

### What's Missing ❌

1. **Routes for follower/following lists**
   ```ruby
   # In config/routes.rb
   get :followers  # Shows list of followers
   get :following  # Shows list of users they follow
   ```

2. **Controller actions**
   ```ruby
   # In app/controllers/users_controller.rb
   def followers
     # Load and paginate followers
   end

   def following
     # Load and paginate following users
   end
   ```

3. **View files**
   - `app/views/users/followers.html.erb`
   - `app/views/users/following.html.erb`

4. **User card partial**
   - `app/views/users/_user_card.html.erb`
   - Reusable component for displaying users in lists

---

## Implementation Tasks

### Task 3.1: Add Routes for Followers/Following

**File:** `config/routes.rb`

**Find this section** (around line 25):

```ruby
resources :users, only: [:show], param: :username do
  member do
    post :follow, to: "follows#toggle"
  end
end
```

**Update to:**

```ruby
resources :users, only: [:show], param: :username do
  member do
    post :follow, to: "follows#toggle"
    get :followers   # ADD THIS
    get :following   # ADD THIS
  end
end
```

**Generated Routes:**
- `GET /users/:username/followers` → `users#followers`
- `GET /users/:username/following` → `users#following`

**Path Helpers:**
- `followers_user_path(@user.username)`
- `following_user_path(@user.username)`

**Time Estimate:** 2 minutes

---

### Task 3.2: Add Controller Actions for Followers/Following

**File:** `app/controllers/users_controller.rb`

**Add these actions** (after the `show` action):

```ruby
def followers
  @pagy, @followers = pagy(@user.followers.recent, items: 20)

  respond_to do |format|
    format.html
    format.turbo_stream
  end
end

def following
  @pagy, @following = pagy(@user.following.recent, items: 20)

  respond_to do |format|
    format.html
    format.turbo_stream
  end
end
```

**Update the `before_action`** at the top:

```ruby
before_action :set_user, only: [:show, :followers, :following]
before_action :set_tab, only: [:show]
```

**Time Estimate:** 5 minutes

---

### Task 3.3: Create User Card Partial

**File:** `app/views/users/_user_card.html.erb` (NEW FILE)

**Purpose:** Reusable component for displaying users in follower/following lists

**Implementation:**

```erb
<div class="flex items-start space-x-4 p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
  <!-- Avatar -->
  <%= link_to user_path(user.username), class: "flex-shrink-0" do %>
    <% if user.avatar.attached? %>
      <%= image_tag user.avatar.variant(resize_to_limit: [80, 80]),
          class: "w-20 h-20 rounded-full object-cover" %>
    <% else %>
      <div class="w-20 h-20 bg-indigo-600 text-white rounded-full flex items-center justify-center text-2xl font-bold">
        <%= user.username.first.upcase %>
      </div>
    <% end %>
  <% end %>

  <!-- User Info -->
  <div class="flex-1 min-w-0">
    <!-- Name and Verification -->
    <div class="flex items-center space-x-2 mb-1">
      <%= link_to user_path(user.username), class: "hover:underline" do %>
        <h3 class="text-lg font-semibold text-gray-900 truncate">
          <%= user.display_name.presence || user.username %>
        </h3>
      <% end %>
      <% if user.is_verified? %>
        <svg class="w-5 h-5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
        </svg>
      <% end %>
    </div>

    <!-- Username -->
    <p class="text-sm text-gray-600 mb-2">@<%= user.username %></p>

    <!-- Bio (truncated) -->
    <% if user.bio.present? %>
      <p class="text-sm text-gray-700 line-clamp-2 mb-3"><%= user.bio %></p>
    <% end %>

    <!-- Stats -->
    <div class="flex items-center space-x-4 text-sm text-gray-600 mb-3">
      <span>
        <span class="font-semibold text-gray-900"><%= number_with_delimiter(user.gifs_count) %></span> GIFs
      </span>
      <span>
        <span class="font-semibold text-gray-900"><%= number_with_delimiter(user.follower_count) %></span> Followers
      </span>
    </div>
  </div>

  <!-- Follow Button -->
  <% if user_signed_in? && current_user != user %>
    <div class="flex-shrink-0">
      <%= render "follows/button", user: user %>
    </div>
  <% elsif !user_signed_in? %>
    <div class="flex-shrink-0">
      <%= link_to "Follow",
          new_user_session_path,
          class: "px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors" %>
    </div>
  <% end %>
</div>
```

**Time Estimate:** 20 minutes

---

### Task 3.4: Create Followers View

**File:** `app/views/users/followers.html.erb` (NEW FILE)

**Implementation:**

```erb
<div class="container mx-auto px-4 py-8">
  <div class="max-w-3xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <%= link_to user_path(@user.username), class: "inline-flex items-center text-gray-600 hover:text-gray-900 mb-4" do %>
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
        </svg>
        Back to Profile
      <% end %>

      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        <%= @user.display_name.presence || @user.username %>'s Followers
      </h1>
      <p class="text-gray-600">
        <%= pluralize(number_with_delimiter(@user.follower_count), 'follower') %>
      </p>
    </div>

    <!-- Followers List -->
    <% if @followers.any? %>
      <div class="space-y-4">
        <%= render partial: "users/user_card", collection: @followers, as: :user %>
      </div>

      <!-- Pagination -->
      <% if @pagy.pages > 1 %>
        <div class="mt-8 flex justify-center">
          <%== pagy_nav(@pagy) %>
        </div>
      <% end %>
    <% else %>
      <!-- Empty State -->
      <div class="bg-gray-50 rounded-lg p-12 text-center">
        <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
        </svg>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">No followers yet</h3>
        <p class="text-gray-600">
          <% if user_signed_in? && current_user == @user %>
            When people follow you, they'll appear here.
          <% else %>
            <%= @user.display_name.presence || @user.username %> doesn't have any followers yet.
          <% end %>
        </p>
      </div>
    <% end %>
  </div>
</div>
```

**Time Estimate:** 15 minutes

---

### Task 3.5: Create Following View

**File:** `app/views/users/following.html.erb` (NEW FILE)

**Implementation:**

```erb
<div class="container mx-auto px-4 py-8">
  <div class="max-w-3xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <%= link_to user_path(@user.username), class: "inline-flex items-center text-gray-600 hover:text-gray-900 mb-4" do %>
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
        </svg>
        Back to Profile
      <% end %>

      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        <% if user_signed_in? && current_user == @user %>
          People You Follow
        <% else %>
          <%= @user.display_name.presence || @user.username %> is Following
        <% end %>
      </h1>
      <p class="text-gray-600">
        <%= pluralize(number_with_delimiter(@user.following_count), 'user') %>
      </p>
    </div>

    <!-- Following List -->
    <% if @following.any? %>
      <div class="space-y-4">
        <%= render partial: "users/user_card", collection: @following, as: :user %>
      </div>

      <!-- Pagination -->
      <% if @pagy.pages > 1 %>
        <div class="mt-8 flex justify-center">
          <%== pagy_nav(@pagy) %>
        </div>
      <% end %>
    <% else %>
      <!-- Empty State -->
      <div class="bg-gray-50 rounded-lg p-12 text-center">
        <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
        </svg>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">
          <% if user_signed_in? && current_user == @user %>
            Not following anyone yet
          <% else %>
            Not following anyone
          <% end %>
        </h3>
        <p class="text-gray-600 mb-4">
          <% if user_signed_in? && current_user == @user %>
            Discover creators and follow them to see their content in your feed.
          <% else %>
            <%= @user.display_name.presence || @user.username %> isn't following anyone yet.
          <% end %>
        </p>
        <% if user_signed_in? && current_user == @user %>
          <%= link_to "Explore Creators",
              trending_path,
              class: "inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors" %>
        <% end %>
      </div>
    <% end %>
  </div>
</div>
```

**Time Estimate:** 15 minutes

---

### Task 3.6: Update Follower Count Partial (Fix Broken Links)

**File:** `app/views/follows/_follower_count.html.erb`

**Current Implementation** (lines 1-19):

The partial has a `show_links` flag that enables clickable follower/following counts, but the routes don't exist yet. Now that we're adding them, we need to verify the implementation is correct.

**Review the existing code:**
```erb
<%= turbo_frame_tag "follower_count_#{user.id}" do %>
  <div class="flex items-center space-x-6 text-sm">
    <% if local_assigns[:show_links] %>
      <%= link_to followers_user_path(user.username), class: "hover:text-indigo-600 transition-colors" do %>
        <span class="font-semibold text-gray-900"><%= number_with_delimiter(user.follower_count) %></span>
        <span class="text-gray-600"><%= "follower".pluralize(user.follower_count) %></span>
      <% end %>
      <%= link_to following_user_path(user.username), class: "hover:text-indigo-600 transition-colors" do %>
        <span class="font-semibold text-gray-900"><%= number_with_delimiter(user.following_count) %></span>
        <span class="text-gray-600">following</span>
      <% end %>
    <% else %>
      <span>
        <span class="font-semibold text-gray-900"><%= number_with_delimiter(user.follower_count) %></span>
        <span class="text-gray-600"><%= "follower".pluralize(user.follower_count) %></span>
      </span>
      <span>
        <span class="font-semibold text-gray-900"><%= number_with_delimiter(user.following_count) %></span>
        <span class="text-gray-600">following</span>
      </span>
    <% end %>
  </div>
<% end %>
```

**Action:** No changes needed! The partial already references the correct routes. Just need to enable links in profile view.

**Update `app/views/users/show.html.erb`** (around line 30):

Find:
```erb
<%= render "follows/follower_count", user: @user %>
```

Replace with:
```erb
<%= render "follows/follower_count", user: @user, show_links: true %>
```

**Time Estimate:** 2 minutes

---

## Testing Plan

### Manual Testing Checklist

1. **Followers Page**
   - [ ] Navigate to `/users/:username/followers`
   - [ ] See list of followers (or empty state)
   - [ ] Each follower shows avatar, name, username, bio, stats
   - [ ] Follow buttons work (Turbo Stream updates)
   - [ ] Pagination works if > 20 followers
   - [ ] "Back to Profile" link works
   - [ ] Empty state displays correctly for users with no followers

2. **Following Page**
   - [ ] Navigate to `/users/:username/following`
   - [ ] See list of users they follow (or empty state)
   - [ ] Each user shows avatar, name, username, bio, stats
   - [ ] Follow buttons work (Turbo Stream updates)
   - [ ] Pagination works if > 20 following
   - [ ] "Back to Profile" link works
   - [ ] Empty state displays correctly
   - [ ] "Explore Creators" button shows for own profile

3. **Profile Page Integration**
   - [ ] Follower count is clickable → goes to followers page
   - [ ] Following count is clickable → goes to following page
   - [ ] Counts match between profile and list pages
   - [ ] Following/unfollowing updates counts immediately

4. **User Cards**
   - [ ] Avatar displays (uploaded or initial)
   - [ ] Verification badge shows for verified users
   - [ ] Bio truncates to 2 lines
   - [ ] Stats are accurate
   - [ ] Follow button has correct state
   - [ ] Clicking user goes to their profile

5. **Authorization/Privacy**
   - [ ] Guests can view public follower/following lists
   - [ ] Own profile shows all followers/following
   - [ ] Cannot follow self (follow button hidden)

### Automated Testing

**Add to `test/controllers/users_controller_test.rb`:**

```ruby
class UsersControllerTest < ActionDispatch::IntegrationTest
  fixtures :users, :follows

  setup do
    @alice = users(:one)
    @bob = users(:two)
  end

  # FOLLOWERS TESTS
  test "should get followers page" do
    get followers_user_path(@alice.username)
    assert_response :success
  end

  test "followers page shows list of followers" do
    # Bob follows Alice
    Follow.create!(follower: @bob, following: @alice)

    get followers_user_path(@alice.username)
    assert_select "h1", text: /#{@alice.display_name}.*Followers/i
    # Should render user card for Bob
  end

  test "followers page shows empty state when no followers" do
    get followers_user_path(@alice.username)
    assert_select "h3", text: /No followers yet/i
  end

  test "followers page paginates results" do
    # Create 25 followers (more than 20 items per page)
    25.times do |i|
      user = User.create!(
        email: "follower#{i}@example.com",
        username: "follower#{i}",
        password: "password123"
      )
      Follow.create!(follower: user, following: @alice)
    end

    get followers_user_path(@alice.username)
    # Should show pagination controls
    assert_select "nav.pagy"
  end

  # FOLLOWING TESTS
  test "should get following page" do
    get following_user_path(@alice.username)
    assert_response :success
  end

  test "following page shows list of users they follow" do
    # Alice follows Bob
    Follow.create!(follower: @alice, following: @bob)

    get following_user_path(@alice.username)
    assert_select "h1", text: /Following/i
    # Should render user card for Bob
  end

  test "following page shows empty state when not following anyone" do
    get following_user_path(@alice.username)
    assert_select "h3", text: /Not following anyone/i
  end

  test "following page shows explore CTA for own profile" do
    sign_in @alice

    get following_user_path(@alice.username)
    assert_select "a", text: /Explore Creators/i
  end

  # USER CARD TESTS
  test "user card shows follow button for other users" do
    sign_in @alice

    get followers_user_path(@bob.username)
    # Should have follow buttons (not testing specific implementation)
    assert_response :success
  end

  test "user card does not show follow button for self" do
    sign_in @alice

    # Alice viewing her own follower list
    Follow.create!(follower: @alice, following: @bob)
    get followers_user_path(@alice.username)
    # Own card should not have follow button
    assert_response :success
  end

  private

  def sign_in(user)
    post user_session_path, params: {
      user: { email: user.email, password: "password123" }
    }
  end
end
```

**Time Estimate:** 30 minutes

---

## Implementation Order

### Phase 1: Core Functionality (45-60 minutes)
1. ✅ Task 3.1: Add routes (2 min)
2. ✅ Task 3.2: Add controller actions (5 min)
3. ✅ Task 3.3: Create user card partial (20 min)
4. ✅ Task 3.4: Create followers view (15 min)
5. ✅ Task 3.5: Create following view (15 min)
6. ✅ Task 3.6: Enable links in profile (2 min)
7. ✅ Manual test all functionality (20 min)

### Phase 2: Testing (30 minutes)
8. ✅ Write automated tests
9. ✅ Run test suite and fix any issues

### Phase 3: Optional Enhancements (20-30 minutes)
10. Add search/filter to follower/following lists
11. Add "Suggested Users" section
12. Add mutual followers indicator
13. Polish UI/UX (loading states, animations)

---

## Files to Create/Modify

### Create:
- `app/views/users/_user_card.html.erb` - Reusable user card component
- `app/views/users/followers.html.erb` - Followers list page
- `app/views/users/following.html.erb` - Following list page

### Modify:
- `config/routes.rb` - Add followers/following routes
- `app/controllers/users_controller.rb` - Add followers/following actions
- `app/views/users/show.html.erb` - Enable clickable follower counts
- `test/controllers/users_controller_test.rb` - Add comprehensive tests

### Already Exist (No Changes Needed):
- `app/views/users/show.html.erb` - Profile page (complete)
- `app/views/users/show.turbo_stream.erb` - Tab updates (complete)
- `app/views/users/tabs/*.html.erb` - Tab content (complete)
- `app/views/follows/_button.html.erb` - Follow button (complete)
- `app/views/follows/_follower_count.html.erb` - Counts (complete)
- `app/views/gifs/_gif_card.html.erb` - GIF display (complete)
- `app/controllers/follows_controller.rb` - Follow logic (complete)
- `app/models/user.rb` - User model (complete)
- `app/models/follow.rb` - Follow model (complete)

---

## Success Criteria

✅ Users can view list of followers for any profile
✅ Users can view list of following for any profile
✅ Follower/following counts are clickable on profile
✅ User cards display all relevant information
✅ Follow buttons work from user cards
✅ Pagination works for large lists
✅ Empty states provide helpful messaging
✅ All tests pass
✅ Turbo Stream updates work without page reload
✅ UI is consistent with rest of application

---

## Notes

- **Privacy:** All follower/following lists are public (consistent with most social platforms)
- **Performance:** Using Pagy for pagination (20 items per page)
- **Responsive:** All layouts work on mobile, tablet, desktop
- **Accessibility:** Proper ARIA labels, semantic HTML
- **SEO:** Server-rendered HTML with proper meta tags
- **Counter Caches:** follower_count and following_count auto-update via Follow model callbacks

---

## Risk Assessment

**Low Risk** - This task is straightforward because:
- 80% of work is already done
- Just adding list views for existing data
- Follow system is fully functional
- User card is simple component
- Proven patterns from existing code

**Time Estimate:** 1-2 hours total
- Implementation: 45-60 min
- Testing: 30 min
- Polish: 20-30 min (optional)

---

## Future Enhancements (Out of Scope)

- Mutual followers indicator ("Followed by 3 people you follow")
- Suggested users to follow
- Follow notifications
- Follow requests for private accounts
- Block/mute functionality
- Follow export/import
- Follow activity feed
