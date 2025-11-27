# Phase 2: Hotwire Frontend Completion Plan

**Status:** ~60% Complete | **Estimated Remaining Time:** 12-16 hours  
**Last Updated:** 2025-11-06

---

## Executive Summary

This plan details the implementation of the remaining 40% of Phase 2, focusing on completing the web UI for ytgify's core features using Rails 8 + Hotwire (Turbo + Stimulus). The work is organized into 7 major features, prioritized by dependencies and user impact.

### What's Already Complete ✓
- Core infrastructure (routes, layouts, asset pipeline)
- Feed system with infinite scroll
- GIF detail pages with like/comment display
- Navbar and authentication scaffolding
- Stimulus controllers (dropdown, flash, infinite-scroll, like)
- Models and API controllers

### What Needs Implementation
1. CommentsController (web)
2. FollowsController (web)
3. UsersController + Profile views
4. GIF edit forms (extension installation page already complete)
5. Devise authentication views
6. CollectionsController + views
7. HashtagsController + views

---

## Implementation Priority & Order

### Priority 1: Core User Interactions (4-5 hours)
**Why First:** These are essential features users expect immediately after viewing content.

1. **CommentsController** - Users can see but not create comments
2. **GIF Edit Forms** - Users need to edit metadata for GIFs created via extension
3. **FollowsController** - Follow buttons exist but don't work

### Priority 2: User Identity & Discovery (4-5 hours)
**Why Second:** Enables users to build their presence and discover content.

4. **UsersController + Profile Views** - No way to view user profiles
5. **Devise Views** - Default Devise views are unstyled

### Priority 3: Enhanced Features (3-4 hours)
**Why Last:** Nice-to-have features that enhance but aren't critical to core loops.

6. **CollectionsController** - Basic organization feature
7. **HashtagsController** - Content discovery enhancement

---

## Feature 1: CommentsController (Web)

**Complexity:** Simple  
**Time Estimate:** 45 minutes  
**Dependencies:** None (models and views already exist)

### Current State
- ✓ Routes configured (`resources :comments, only: [:create]` nested under gifs)
- ✓ Comment model exists with validations
- ✓ Comment partial renders correctly
- ✓ Comment form exists in `gifs/show.html.erb`
- ✗ CommentsController doesn't exist for web routes

### Implementation Tasks

#### Task 1.1: Create CommentsController
**File:** `app/controllers/comments_controller.rb`

```ruby
class CommentsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_gif

  def create
    @comment = @gif.comments.build(comment_params)
    @comment.user = current_user

    respond_to do |format|
      if @comment.save
        format.turbo_stream do
          render turbo_stream: [
            # Prepend new comment to list
            turbo_stream.prepend(
              "comments",
              partial: "comments/comment",
              locals: { comment: @comment }
            ),
            # Update comment count
            turbo_stream.replace(
              "comment_count_#{@gif.id}",
              partial: "gifs/comment_count",
              locals: { gif: @gif.reload }
            ),
            # Clear the form
            turbo_stream.replace(
              "new_comment",
              partial: "comments/form",
              locals: { gif: @gif, comment: Comment.new }
            )
          ]
        end
        format.html { redirect_to @gif, notice: "Comment posted!" }
      else
        format.turbo_stream do
          render turbo_stream: turbo_stream.replace(
            "new_comment",
            partial: "comments/form",
            locals: { gif: @gif, comment: @comment }
          ), status: :unprocessable_entity
        end
        format.html { redirect_to @gif, alert: @comment.errors.full_messages.join(", ") }
      end
    end
  end

  private

  def set_gif
    @gif = Gif.find(params[:gif_id])
  end

  def comment_params
    params.require(:comment).permit(:body)
  end
end
```

#### Task 1.2: Extract Comment Form Partial
**File:** `app/views/comments/_form.html.erb`

```erb
<%= turbo_frame_tag "new_comment" do %>
  <%= form_with model: [gif, comment], 
                class: "mb-8",
                data: { turbo_frame: "_top" } do |f| %>
    <div class="flex space-x-3">
      <div class="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold flex-shrink-0">
        <%= current_user.username.first.upcase %>
      </div>
      <div class="flex-1">
        <%= f.text_area :body,
            placeholder: "Add a comment...",
            rows: 3,
            class: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none #{'border-red-500' if comment.errors.any?}" %>
        
        <% if comment.errors.any? %>
          <p class="mt-1 text-sm text-red-600">
            <%= comment.errors.full_messages.join(", ") %>
          </p>
        <% end %>

        <div class="mt-2 flex justify-end space-x-2">
          <%= f.submit "Comment",
              class: "px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium cursor-pointer" %>
        </div>
      </div>
    </div>
  <% end %>
<% end %>
```

#### Task 1.3: Update GIF Show View
**File:** `app/views/gifs/show.html.erb` (lines 84-104)

Replace the inline form with:
```erb
<% if user_signed_in? %>
  <%= render "comments/form", gif: @gif, comment: Comment.new %>
<% else %>
  <!-- Keep existing sign-in prompt -->
<% end %>
```

#### Task 1.4: Add Comment Count Partial
**File:** `app/views/gifs/_comment_count.html.erb`

```erb
<div id="comment_count_<%= gif.id %>" class="flex items-center space-x-2 text-gray-600">
  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
  <span class="text-lg font-semibold"><%= gif.comments_count %></span>
</div>
```

### Testing Checklist
- [ ] Create comment via form
- [ ] Comment appears immediately (Turbo Stream)
- [ ] Comment count updates
- [ ] Form clears after submission
- [ ] Validation errors display inline
- [ ] Works without JavaScript (graceful degradation)

---

## Feature 2: GIF Edit Forms (Extension Installation Page)

**Complexity:** Medium
**Time Estimate:** 2 hours
**Dependencies:** None

**IMPORTANT:** Users can only create GIFs via the browser extension (Chrome/Firefox). The web app does NOT allow file uploads. The `/gifs/new` page is an extension installation landing page, and edit forms are for updating GIF metadata only.

### Current State
- ✓ GifsController has new/create/edit/update actions
- ✓ Routes configured
- ✓ `new.html.erb` is now an extension installation page (completed)
- ✗ `edit.html.erb` is placeholder stub
- ✗ No shared form partial for editing metadata

### Implementation Tasks

#### Task 2.1: Create GIF Metadata Edit Form Partial
**File:** `app/views/gifs/_form.html.erb`

**Note:** This form is for editing GIF metadata only. GIF creation happens via the browser extension.

```erb
<%= form_with model: gif,
              class: "space-y-6",
              data: { controller: "gif-form hashtag-input" } do |f| %>

  <!-- Error Messages -->
  <% if gif.errors.any? %>
    <div class="bg-red-50 border border-red-200 rounded-lg p-4">
      <h3 class="text-sm font-medium text-red-800 mb-2">
        <%= pluralize(gif.errors.count, "error") %> prevented this GIF from being saved:
      </h3>
      <ul class="list-disc list-inside text-sm text-red-700 space-y-1">
        <% gif.errors.full_messages.each do |message| %>
          <li><%= message %></li>
        <% end %>
      </ul>
    </div>
  <% end %>

  <!-- Current GIF Display -->
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-2">Current GIF</label>
    <div class="border border-gray-300 rounded-lg p-4 bg-gray-50">
      <% if gif.file.attached? %>
        <%= image_tag gif.file, class: "max-h-48 mx-auto" %>
      <% elsif gif.thumbnail_url.present? %>
        <%= image_tag gif.thumbnail_url, class: "max-h-48 mx-auto" %>
      <% end %>
    </div>
  </div>

  <!-- YouTube Source Info (read-only) -->
  <% if gif.youtube_video_url.present? %>
    <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h3 class="text-sm font-semibold text-gray-900 mb-2">YouTube Source</h3>
      <p class="text-sm text-gray-600 mb-1">
        <strong>Video:</strong> <%= link_to gif.youtube_video_url, gif.youtube_video_url, target: "_blank", class: "text-indigo-600 hover:text-indigo-700" %>
      </p>
      <% if gif.youtube_timestamp_start.present? && gif.youtube_timestamp_end.present? %>
        <p class="text-sm text-gray-600">
          <strong>Clip:</strong> <%= gif.youtube_timestamp_start.round(2) %>s - <%= gif.youtube_timestamp_end.round(2) %>s
          (<%= (gif.youtube_timestamp_end - gif.youtube_timestamp_start).round(2) %>s duration)
        </p>
      <% end %>
    </div>
  <% end %>

  <!-- Title -->
  <div>
    <%= f.label :title, class: "block text-sm font-medium text-gray-700 mb-2" %>
    <%= f.text_field :title,
        placeholder: "Give your GIF a catchy title",
        class: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
        required: true %>
  </div>

  <!-- Description -->
  <div>
    <%= f.label :description, class: "block text-sm font-medium text-gray-700 mb-2" %>
    <%= f.text_area :description,
        placeholder: "Add a description (optional)",
        rows: 4,
        class: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" %>
  </div>

  <!-- Hashtags -->
  <div>
    <%= f.label :hashtag_names, "Hashtags", class: "block text-sm font-medium text-gray-700 mb-2" %>
    <div data-controller="tags-input">
      <%= f.text_field :hashtag_names,
          value: gif.hashtags.map(&:name).join(", "),
          placeholder: "e.g., funny, cats, reaction",
          class: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
          data: { tags_input_target: "input" } %>
      <p class="mt-1 text-xs text-gray-500">Separate tags with commas</p>
    </div>
  </div>

  <!-- Privacy -->
  <div>
    <%= f.label :privacy, class: "block text-sm font-medium text-gray-700 mb-2" %>
    <div class="flex space-x-4">
      <label class="flex items-center">
        <%= f.radio_button :privacy, "public", class: "mr-2" %>
        <span class="text-sm text-gray-700">Public</span>
      </label>
      <label class="flex items-center">
        <%= f.radio_button :privacy, "unlisted", class: "mr-2" %>
        <span class="text-sm text-gray-700">Unlisted</span>
      </label>
      <label class="flex items-center">
        <%= f.radio_button :privacy, "private", class: "mr-2" %>
        <span class="text-sm text-gray-700">Private</span>
      </label>
    </div>
  </div>

  <!-- Actions -->
  <div class="flex items-center justify-between pt-4 border-t">
    <%= link_to "Cancel", gif.persisted? ? gif : root_path, 
        class: "px-6 py-2 text-gray-700 hover:text-gray-900 font-medium" %>
    <%= f.submit gif.persisted? ? "Update GIF" : "Upload GIF",
        class: "px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium cursor-pointer",
        data: { turbo_submits_with: "Uploading..." } %>
  </div>
<% end %>
```

#### Task 2.2: Simplified GIF Form Stimulus Controller (Optional)
**File:** `app/javascript/controllers/gif_form_controller.js`

**Note:** This controller is minimal since we're only editing metadata, not uploading files. The hashtag input controller handles tag input.

```javascript
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  // Minimal controller - hashtag-input controller handles most interactivity
  connect() {
    console.log("GIF form controller connected")
  }
}
```

#### Task 2.3: New GIF Page (Extension Installation)
**File:** `app/views/gifs/new.html.erb`

**Note:** This page was already completed in the previous session. It displays extension installation instructions instead of an upload form.

**Current implementation:**
- Extension installation cards for Chrome and Firefox
- Links to Chrome Web Store and Firefox Add-ons
- "How It Works" section
- "Why Use ytgify?" features section

**No changes needed** - page is already correctly implemented.

#### Task 2.4: Create Edit GIF View
**File:** `app/views/gifs/edit.html.erb`

```erb
<div class="container mx-auto px-4 py-8">
  <div class="max-w-3xl mx-auto">
    <div class="bg-white rounded-lg shadow-lg p-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Edit GIF</h1>
        <p class="text-gray-600">Update your GIF's information</p>
      </div>

      <!-- Form -->
      <%= render "form", gif: @gif %>
    </div>
  </div>
</div>
```

#### Task 2.5: Update GifsController
**File:** `app/controllers/gifs_controller.rb`

Update `gif_params` to handle hashtag_names as a string:

```ruby
def gif_params
  params.require(:gif).permit(
    :title,
    :description,
    :youtube_video_id,
    :start_time,
    :end_time,
    :duration,
    :privacy,
    :file,
    :hashtag_names  # Changed from array to string
  )
end
```

Add a before_save callback to parse hashtags in the Gif model.

### Testing Checklist
- [ ] Extension installation page displays correctly
- [ ] Chrome and Firefox badge images load
- [ ] Extension links work
- [ ] Edit GIF form loads with current metadata
- [ ] Form validation displays errors
- [ ] Edit GIF updates correctly (title, description, hashtags, privacy)
- [ ] Hashtags save properly
- [ ] Privacy settings work
- [ ] YouTube source info displays read-only

---

## Feature 3: FollowsController (Web)

**Complexity:** Simple  
**Time Estimate:** 1 hour  
**Dependencies:** None

### Current State
- ✓ Routes configured (`post :follow, to: "follows#toggle"`)
- ✓ Follow model exists
- ✓ User model has `following?` method
- ✓ Follow buttons exist in views
- ✗ FollowsController doesn't exist for web routes

### Implementation Tasks

#### Task 3.1: Create FollowsController
**File:** `app/controllers/follows_controller.rb`

```ruby
class FollowsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_user

  def toggle
    follow = current_user.following_relationships.find_by(following_id: @user.id)

    if follow
      follow.destroy
      following = false
      message = "Unfollowed #{@user.display_name}"
    else
      current_user.following_relationships.create!(following_id: @user.id)
      following = true
      message = "Following #{@user.display_name}"
    end

    respond_to do |format|
      format.turbo_stream do
        render turbo_stream: turbo_stream.replace(
          "follow_button_#{@user.id}",
          partial: "follows/follow_button",
          locals: { user: @user, current_user: current_user }
        )
      end
      format.html { redirect_back fallback_location: user_path(@user.username), notice: message }
    end
  end

  private

  def set_user
    @user = User.find_by!(username: params[:username])
  end
end
```

#### Task 3.2: Create Follow Button Partial
**File:** `app/views/follows/_follow_button.html.erb`

```erb
<%= turbo_frame_tag "follow_button_#{user.id}" do %>
  <% if current_user != user %>
    <%= button_to follow_user_path(user.username),
        method: :post,
        class: "px-4 py-2 #{current_user.following?(user) ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-indigo-600 text-white hover:bg-indigo-700'} rounded-lg font-medium transition-colors" do %>
      <%= current_user.following?(user) ? "Following" : "Follow" %>
    <% end %>
  <% end %>
<% end %>
```

#### Task 3.3: Update GIF Show View
**File:** `app/views/gifs/show.html.erb` (lines 167-173)

Replace the follow button with:
```erb
<%= render "follows/follow_button", user: @gif.user, current_user: current_user if user_signed_in? %>
```

### Testing Checklist
- [ ] Follow user from GIF page
- [ ] Follow user from profile page
- [ ] Unfollow works
- [ ] Button updates without page reload (Turbo Stream)
- [ ] Can't follow yourself

---

## Feature 4: UsersController + Profile Views

**Complexity:** Medium-Complex  
**Time Estimate:** 2.5 hours  
**Dependencies:** FollowsController (for follow button on profile)

### Current State
- ✓ Routes configured (`resources :users, only: [:show], param: :username`)
- ✓ User model exists with associations
- ✗ UsersController doesn't exist
- ✗ No profile views

### Implementation Tasks

#### Task 4.1: Create UsersController
**File:** `app/controllers/users_controller.rb`

```ruby
class UsersController < ApplicationController
  before_action :set_user
  before_action :set_tab

  def show
    case @tab
    when "gifs"
      @gifs = @user.gifs
                   .where(privacy: viewable_privacy)
                   .includes(:user, :hashtags)
                   .order(created_at: :desc)
                   .page(params[:page])
                   .per(12)
    when "liked"
      @gifs = @user.liked_gifs
                   .where(privacy: viewable_privacy)
                   .includes(:user, :hashtags)
                   .order("likes.created_at DESC")
                   .page(params[:page])
                   .per(12)
    when "collections"
      @collections = @user.collections
                          .where(is_public: collection_visibility)
                          .includes(:gifs)
                          .order(created_at: :desc)
                          .page(params[:page])
                          .per(12)
    end

    respond_to do |format|
      format.html
      format.turbo_stream
    end
  end

  private

  def set_user
    @user = User.find_by!(username: params[:username])
  end

  def set_tab
    @tab = params[:tab] || "gifs"
  end

  def viewable_privacy
    if user_signed_in? && current_user == @user
      ["public", "unlisted", "private"]
    else
      ["public"]
    end
  end

  def collection_visibility
    if user_signed_in? && current_user == @user
      [true, false]
    else
      true
    end
  end
end
```

#### Task 4.2: Create Profile Show View
**File:** `app/views/users/show.html.erb`

```erb
<div class="bg-gray-50 min-h-screen">
  <!-- Profile Header -->
  <div class="bg-white border-b border-gray-200">
    <div class="container mx-auto px-4 py-8">
      <div class="max-w-6xl mx-auto">
        <div class="flex items-start justify-between">
          <!-- User Info -->
          <div class="flex items-center space-x-6">
            <!-- Avatar -->
            <div class="w-24 h-24 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-3xl flex-shrink-0">
              <%= @user.username.first.upcase %>
            </div>

            <!-- Details -->
            <div>
              <h1 class="text-3xl font-bold text-gray-900 mb-1"><%= @user.display_name %></h1>
              <p class="text-gray-600 mb-3">@<%= @user.username %></p>

              <% if @user.bio.present? %>
                <p class="text-gray-700 mb-4 max-w-2xl"><%= @user.bio %></p>
              <% end %>

              <!-- Stats -->
              <div class="flex items-center space-x-6 text-sm">
                <div>
                  <span class="font-semibold text-gray-900"><%= @user.gifs.count %></span>
                  <span class="text-gray-600">GIFs</span>
                </div>
                <div>
                  <span class="font-semibold text-gray-900"><%= @user.followers.count %></span>
                  <span class="text-gray-600">Followers</span>
                </div>
                <div>
                  <span class="font-semibold text-gray-900"><%= @user.following.count %></span>
                  <span class="text-gray-600">Following</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center space-x-3">
            <% if user_signed_in? %>
              <% if current_user == @user %>
                <%= link_to edit_user_registration_path, 
                    class: "px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors" do %>
                  Edit Profile
                <% end %>
              <% else %>
                <%= render "follows/follow_button", user: @user, current_user: current_user %>
              <% end %>
            <% end %>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Tabs -->
  <div class="bg-white border-b border-gray-200">
    <div class="container mx-auto px-4">
      <div class="max-w-6xl mx-auto">
        <%= turbo_frame_tag "profile_content" do %>
          <nav class="flex space-x-8">
            <%= link_to user_path(@user.username, tab: "gifs"),
                data: { turbo_frame: "profile_content" },
                class: "py-4 px-2 border-b-2 font-medium text-sm #{@tab == 'gifs' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-600 hover:text-gray-900'}" do %>
              GIFs
            <% end %>
            <%= link_to user_path(@user.username, tab: "liked"),
                data: { turbo_frame: "profile_content" },
                class: "py-4 px-2 border-b-2 font-medium text-sm #{@tab == 'liked' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-600 hover:text-gray-900'}" do %>
              Liked
            <% end %>
            <%= link_to user_path(@user.username, tab: "collections"),
                data: { turbo_frame: "profile_content" },
                class: "py-4 px-2 border-b-2 font-medium text-sm #{@tab == 'collections' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-600 hover:text-gray-900'}" do %>
              Collections
            <% end %>
          </nav>
        <% end %>
      </div>
    </div>
  </div>

  <!-- Content -->
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-6xl mx-auto">
      <%= turbo_frame_tag "profile_content" do %>
        <%= render "users/tabs/#{@tab}", 
                   user: @user, 
                   gifs: @gifs,
                   collections: @collections %>
      <% end %>
    </div>
  </div>
</div>
```

#### Task 4.3: Create Tab Partials

**File:** `app/views/users/tabs/_gifs.html.erb`

```erb
<% if gifs.any? %>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <% gifs.each do |gif| %>
      <%= render "gifs/gif_card", gif: gif %>
    <% end %>
  </div>

  <!-- Pagination -->
  <% if gifs.respond_to?(:total_pages) && gifs.total_pages > 1 %>
    <div class="mt-8 flex justify-center">
      <%= paginate gifs %>
    </div>
  <% end %>
<% else %>
  <div class="text-center py-16">
    <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
    </svg>
    <p class="mt-4 text-gray-600">
      <% if user_signed_in? && current_user == user %>
        You haven't uploaded any GIFs yet
      <% else %>
        <%= user.display_name %> hasn't uploaded any GIFs yet
      <% end %>
    </p>
    <% if user_signed_in? && current_user == user %>
      <%= link_to "Upload your first GIF", new_gif_path, class: "mt-4 inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium" %>
    <% end %>
  </div>
<% end %>
```

**File:** `app/views/users/tabs/_liked.html.erb`

```erb
<% if gifs.any? %>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <% gifs.each do |gif| %>
      <%= render "gifs/gif_card", gif: gif %>
    <% end %>
  </div>

  <!-- Pagination -->
  <% if gifs.respond_to?(:total_pages) && gifs.total_pages > 1 %>
    <div class="mt-8 flex justify-center">
      <%= paginate gifs %>
    </div>
  <% end %>
<% else %>
  <div class="text-center py-16">
    <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
    <p class="mt-4 text-gray-600">
      <% if user_signed_in? && current_user == user %>
        You haven't liked any GIFs yet
      <% else %>
        <%= user.display_name %> hasn't liked any GIFs yet
      <% end %>
    </p>
  </div>
<% end %>
```

**File:** `app/views/users/tabs/_collections.html.erb`

```erb
<% if collections.any? %>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <% collections.each do |collection| %>
      <%= link_to collection_path(collection), class: "block bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow" do %>
        <!-- Collection Preview (first 4 GIFs) -->
        <div class="aspect-square bg-gray-100 grid grid-cols-2 gap-0.5 p-0.5">
          <% collection.gifs.limit(4).each_with_index do |gif, index| %>
            <div class="bg-gray-900 flex items-center justify-center">
              <% if gif.thumbnail_url.present? %>
                <%= image_tag gif.thumbnail_url, class: "w-full h-full object-cover" %>
              <% end %>
            </div>
          <% end %>
          
          <% (4 - collection.gifs.limit(4).count).times do %>
            <div class="bg-gray-200"></div>
          <% end %>
        </div>

        <!-- Collection Info -->
        <div class="p-4">
          <h3 class="font-semibold text-gray-900 mb-1"><%= collection.name %></h3>
          <p class="text-sm text-gray-600">
            <%= pluralize(collection.gifs_count, "GIF") %>
          </p>
        </div>
      <% end %>
    <% end %>
  </div>

  <!-- Pagination -->
  <% if collections.respond_to?(:total_pages) && collections.total_pages > 1 %>
    <div class="mt-8 flex justify-center">
      <%= paginate collections %>
    </div>
  <% end %>
<% else %>
  <div class="text-center py-16">
    <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
    <p class="mt-4 text-gray-600">
      <% if user_signed_in? && current_user == user %>
        You haven't created any collections yet
      <% else %>
        <%= user.display_name %> hasn't created any public collections
      <% end %>
    </p>
    <% if user_signed_in? && current_user == user %>
      <%= link_to "Create your first collection", new_collection_path, class: "mt-4 inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium" %>
    <% end %>
  </div>
<% end %>
```

### Testing Checklist
- [ ] Profile page displays user info
- [ ] GIFs tab shows user's GIFs
- [ ] Liked tab shows liked GIFs
- [ ] Collections tab shows collections
- [ ] Tabs switch without full page reload
- [ ] Privacy settings respected (own vs other profiles)
- [ ] Pagination works
- [ ] Empty states display correctly

---

## Feature 5: Devise Authentication Views

**Complexity:** Simple-Medium  
**Time Estimate:** 1.5 hours  
**Dependencies:** None

### Current State
- ✓ Devise installed and configured
- ✓ User model has Devise modules
- ✗ Using default Devise views (unstyled)

### Implementation Tasks

#### Task 5.1: Generate Devise Views

```bash
rails generate devise:views
```

#### Task 5.2: Style Sign In View
**File:** `app/views/devise/sessions/new.html.erb`

```erb
<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8">
    <!-- Logo -->
    <div class="text-center">
      <%= link_to root_path, class: "inline-flex items-center space-x-2 text-2xl font-bold text-indigo-600" do %>
        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
        <span>ytgify</span>
      <% end %>
    </div>

    <!-- Header -->
    <div>
      <h2 class="text-center text-3xl font-extrabold text-gray-900">
        Sign in to your account
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600">
        Or
        <%= link_to "create a new account", new_user_registration_path, class: "font-medium text-indigo-600 hover:text-indigo-500" %>
      </p>
    </div>

    <!-- Form -->
    <%= form_for(resource, as: resource_name, url: session_path(resource_name), html: { class: "mt-8 space-y-6" }) do |f| %>
      <div class="rounded-md shadow-sm space-y-4">
        <!-- Email -->
        <div>
          <%= f.label :email, class: "block text-sm font-medium text-gray-700 mb-1" %>
          <%= f.email_field :email, 
              autofocus: true, 
              autocomplete: "email",
              placeholder: "your@email.com",
              class: "appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" %>
        </div>

        <!-- Password -->
        <div>
          <%= f.label :password, class: "block text-sm font-medium text-gray-700 mb-1" %>
          <%= f.password_field :password, 
              autocomplete: "current-password",
              placeholder: "••••••••",
              class: "appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" %>
        </div>
      </div>

      <!-- Remember Me & Forgot Password -->
      <div class="flex items-center justify-between">
        <% if devise_mapping.rememberable? %>
          <div class="flex items-center">
            <%= f.check_box :remember_me, class: "h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" %>
            <%= f.label :remember_me, class: "ml-2 block text-sm text-gray-900" %>
          </div>
        <% end %>

        <%= link_to "Forgot password?", new_password_path(resource_name), class: "text-sm font-medium text-indigo-600 hover:text-indigo-500" %>
      </div>

      <!-- Submit Button -->
      <div>
        <%= f.submit "Sign in", class: "group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer" %>
      </div>
    <% end %>
  </div>
</div>
```

#### Task 5.3: Style Sign Up View
**File:** `app/views/devise/registrations/new.html.erb`

```erb
<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8">
    <!-- Logo -->
    <div class="text-center">
      <%= link_to root_path, class: "inline-flex items-center space-x-2 text-2xl font-bold text-indigo-600" do %>
        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
        <span>ytgify</span>
      <% end %>
    </div>

    <!-- Header -->
    <div>
      <h2 class="text-center text-3xl font-extrabold text-gray-900">
        Create your account
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600">
        Already have an account?
        <%= link_to "Sign in", new_user_session_path, class: "font-medium text-indigo-600 hover:text-indigo-500" %>
      </p>
    </div>

    <!-- Form -->
    <%= form_for(resource, as: resource_name, url: registration_path(resource_name), html: { class: "mt-8 space-y-6" }) do |f| %>
      <%= render "devise/shared/error_messages", resource: resource %>

      <div class="rounded-md shadow-sm space-y-4">
        <!-- Username -->
        <div>
          <%= f.label :username, class: "block text-sm font-medium text-gray-700 mb-1" %>
          <%= f.text_field :username,
              autofocus: true,
              placeholder: "johndoe",
              class: "appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" %>
          <p class="mt-1 text-xs text-gray-500">Letters, numbers, and underscores only</p>
        </div>

        <!-- Email -->
        <div>
          <%= f.label :email, class: "block text-sm font-medium text-gray-700 mb-1" %>
          <%= f.email_field :email,
              autocomplete: "email",
              placeholder: "your@email.com",
              class: "appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" %>
        </div>

        <!-- Password -->
        <div>
          <%= f.label :password, class: "block text-sm font-medium text-gray-700 mb-1" %>
          <%= f.password_field :password,
              autocomplete: "new-password",
              placeholder: "••••••••",
              class: "appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" %>
          <% if @minimum_password_length %>
            <p class="mt-1 text-xs text-gray-500">
              <%= @minimum_password_length %> characters minimum
            </p>
          <% end %>
        </div>

        <!-- Password Confirmation -->
        <div>
          <%= f.label :password_confirmation, class: "block text-sm font-medium text-gray-700 mb-1" %>
          <%= f.password_field :password_confirmation,
              autocomplete: "new-password",
              placeholder: "••••••••",
              class: "appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" %>
        </div>
      </div>

      <!-- Submit Button -->
      <div>
        <%= f.submit "Create account", class: "group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer" %>
      </div>
    <% end %>
  </div>
</div>
```

#### Task 5.4: Style Forgot Password View
**File:** `app/views/devise/passwords/new.html.erb`

```erb
<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8">
    <!-- Logo -->
    <div class="text-center">
      <%= link_to root_path, class: "inline-flex items-center space-x-2 text-2xl font-bold text-indigo-600" do %>
        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
        <span>ytgify</span>
      <% end %>
    </div>

    <!-- Header -->
    <div>
      <h2 class="text-center text-3xl font-extrabold text-gray-900">
        Reset your password
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600">
        Remember your password?
        <%= link_to "Sign in", new_user_session_path, class: "font-medium text-indigo-600 hover:text-indigo-500" %>
      </p>
    </div>

    <!-- Form -->
    <%= form_for(resource, as: resource_name, url: password_path(resource_name), html: { method: :post, class: "mt-8 space-y-6" }) do |f| %>
      <%= render "devise/shared/error_messages", resource: resource %>

      <div>
        <%= f.label :email, class: "block text-sm font-medium text-gray-700 mb-1" %>
        <%= f.email_field :email,
            autofocus: true,
            autocomplete: "email",
            placeholder: "your@email.com",
            class: "appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" %>
      </div>

      <div>
        <%= f.submit "Send reset instructions", class: "group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer" %>
      </div>
    <% end %>
  </div>
</div>
```

#### Task 5.5: Style Edit Registration View
**File:** `app/views/devise/registrations/edit.html.erb`

```erb
<div class="container mx-auto px-4 py-8">
  <div class="max-w-2xl mx-auto">
    <div class="bg-white rounded-lg shadow-lg p-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Account Settings</h1>
        <p class="text-gray-600">Update your profile and account preferences</p>
      </div>

      <%= form_for(resource, as: resource_name, url: registration_path(resource_name), html: { method: :put, class: "space-y-6" }) do |f| %>
        <%= render "devise/shared/error_messages", resource: resource %>

        <!-- Username -->
        <div>
          <%= f.label :username, class: "block text-sm font-medium text-gray-700 mb-2" %>
          <%= f.text_field :username,
              class: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" %>
        </div>

        <!-- Display Name -->
        <div>
          <%= f.label :display_name, class: "block text-sm font-medium text-gray-700 mb-2" %>
          <%= f.text_field :display_name,
              class: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" %>
        </div>

        <!-- Bio -->
        <div>
          <%= f.label :bio, class: "block text-sm font-medium text-gray-700 mb-2" %>
          <%= f.text_area :bio,
              rows: 4,
              class: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" %>
        </div>

        <!-- Email -->
        <div>
          <%= f.label :email, class: "block text-sm font-medium text-gray-700 mb-2" %>
          <%= f.email_field :email,
              class: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" %>
        </div>

        <hr class="my-6">

        <!-- Password Section -->
        <div>
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
          <p class="text-sm text-gray-600 mb-4">Leave blank if you don't want to change it</p>

          <div class="space-y-4">
            <div>
              <%= f.label :password, "New password", class: "block text-sm font-medium text-gray-700 mb-2" %>
              <%= f.password_field :password,
                  autocomplete: "new-password",
                  class: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" %>
            </div>

            <div>
              <%= f.label :password_confirmation, "Confirm new password", class: "block text-sm font-medium text-gray-700 mb-2" %>
              <%= f.password_field :password_confirmation,
                  autocomplete: "new-password",
                  class: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" %>
            </div>

            <div>
              <%= f.label :current_password, class: "block text-sm font-medium text-gray-700 mb-2" %>
              <%= f.password_field :current_password,
                  autocomplete: "current-password",
                  class: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" %>
              <p class="mt-1 text-xs text-gray-500">We need your current password to confirm changes</p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-between pt-6 border-t">
          <%= link_to "Cancel", :back, class: "px-6 py-2 text-gray-700 hover:text-gray-900 font-medium" %>
          <%= f.submit "Update Account", class: "px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium cursor-pointer" %>
        </div>
      <% end %>

      <!-- Delete Account -->
      <div class="mt-8 pt-8 border-t border-gray-200">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Delete Account</h3>
        <p class="text-sm text-gray-600 mb-4">
          This action cannot be undone. All your GIFs and data will be permanently deleted.
        </p>
        <%= button_to "Delete My Account",
            registration_path(resource_name),
            data: { turbo_confirm: "Are you absolutely sure? This cannot be undone!" },
            method: :delete,
            class: "px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium" %>
      </div>
    </div>
  </div>
</div>
```

#### Task 5.6: Update Devise Controllers

Add to `app/controllers/application_controller.rb`:

```ruby
before_action :configure_permitted_parameters, if: :devise_controller?

protected

def configure_permitted_parameters
  devise_parameter_sanitizer.permit(:sign_up, keys: [:username])
  devise_parameter_sanitizer.permit(:account_update, keys: [:username, :display_name, :bio])
end
```

### Testing Checklist
- [ ] Sign up form works
- [ ] Sign in form works
- [ ] Forgot password works
- [ ] Edit profile works
- [ ] Validation errors display
- [ ] All forms styled consistently

---

## Feature 6: CollectionsController + Views

**Complexity:** Medium  
**Time Estimate:** 2 hours  
**Dependencies:** None (nice to have: UsersController for profile collections tab)

### Current State
- ✓ Routes configured
- ✓ Collection model with methods
- ✗ CollectionsController doesn't exist
- ✗ No collection views

### Implementation Tasks

#### Task 6.1: Create CollectionsController
**File:** `app/controllers/collections_controller.rb`

```ruby
class CollectionsController < ApplicationController
  before_action :authenticate_user!, except: [:index, :show]
  before_action :set_collection, only: [:show, :edit, :update, :destroy]
  before_action :authorize_user!, only: [:edit, :update, :destroy]

  def index
    if user_signed_in?
      @collections = current_user.collections
                                  .includes(:gifs)
                                  .order(created_at: :desc)
                                  .page(params[:page])
                                  .per(12)
    else
      redirect_to new_user_session_path, alert: "Please sign in to view your collections"
    end
  end

  def show
    unless @collection.visible_to?(current_user)
      redirect_to root_path, alert: "This collection is private"
    end

    @gifs = @collection.gifs
                       .includes(:user, :hashtags)
                       .page(params[:page])
                       .per(20)
  end

  def new
    @collection = current_user.collections.build
  end

  def create
    @collection = current_user.collections.build(collection_params)

    if @collection.save
      redirect_to @collection, notice: "Collection created successfully!"
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @collection.update(collection_params)
      redirect_to @collection, notice: "Collection updated successfully!"
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @collection.destroy
    redirect_to collections_path, notice: "Collection deleted successfully"
  end

  private

  def set_collection
    @collection = Collection.find(params[:id])
  end

  def authorize_user!
    unless @collection.user == current_user
      redirect_to root_path, alert: "You're not authorized to perform this action"
    end
  end

  def collection_params
    params.require(:collection).permit(:name, :description, :is_public)
  end
end
```

#### Task 6.2: Create Collection Views

**File:** `app/views/collections/index.html.erb`

```erb
<div class="container mx-auto px-4 py-8">
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 mb-2">My Collections</h1>
        <p class="text-gray-600">Organize your favorite GIFs</p>
      </div>
      <%= link_to new_collection_path, class: "inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium" do %>
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        New Collection
      <% end %>
    </div>

    <!-- Collections Grid -->
    <% if @collections.any? %>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <% @collections.each do |collection| %>
          <%= render "collections/collection_card", collection: collection %>
        <% end %>
      </div>

      <!-- Pagination -->
      <% if @collections.total_pages > 1 %>
        <div class="mt-8 flex justify-center">
          <%= paginate @collections %>
        </div>
      <% end %>
    <% else %>
      <!-- Empty State -->
      <div class="text-center py-16">
        <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
        <p class="mt-4 text-gray-600">You haven't created any collections yet</p>
        <%= link_to "Create your first collection", new_collection_path, class: "mt-4 inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium" %>
      </div>
    <% end %>
  </div>
</div>
```

**File:** `app/views/collections/_collection_card.html.erb`

```erb
<div class="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
  <%= link_to collection_path(collection), class: "block" do %>
    <!-- Preview Grid -->
    <div class="aspect-square bg-gray-100 grid grid-cols-2 gap-0.5 p-0.5">
      <% collection.gifs.limit(4).each do |gif| %>
        <div class="bg-gray-900 flex items-center justify-center overflow-hidden">
          <% if gif.thumbnail_url.present? %>
            <%= image_tag gif.thumbnail_url, class: "w-full h-full object-cover" %>
          <% end %>
        </div>
      <% end %>
      
      <% (4 - collection.gifs.limit(4).count).times do %>
        <div class="bg-gray-200 flex items-center justify-center">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4" />
          </svg>
        </div>
      <% end %>
    </div>
  <% end %>

  <!-- Info -->
  <div class="p-4">
    <div class="flex items-start justify-between mb-2">
      <%= link_to collection_path(collection) do %>
        <h3 class="font-semibold text-gray-900 hover:text-indigo-600"><%= collection.name %></h3>
      <% end %>
      
      <% if !collection.is_public %>
        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      <% end %>
    </div>

    <% if collection.description.present? %>
      <p class="text-sm text-gray-600 mb-2 line-clamp-2"><%= collection.description %></p>
    <% end %>

    <p class="text-sm text-gray-500">
      <%= pluralize(collection.gifs_count, "GIF") %>
    </p>
  </div>
</div>
```

**File:** `app/views/collections/show.html.erb`

```erb
<div class="container mx-auto px-4 py-8">
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <h1 class="text-3xl font-bold text-gray-900 mb-2"><%= @collection.name %></h1>
          
          <% if @collection.description.present? %>
            <p class="text-gray-700 mb-4"><%= @collection.description %></p>
          <% end %>

          <div class="flex items-center space-x-4 text-sm text-gray-600">
            <div class="flex items-center space-x-2">
              <%= link_to user_path(@collection.user.username), class: "hover:text-indigo-600" do %>
                <span>by <%= @collection.user.display_name %></span>
              <% end %>
            </div>
            <span>•</span>
            <span><%= pluralize(@collection.gifs_count, "GIF") %></span>
            <span>•</span>
            <span><%= @collection.is_public ? "Public" : "Private" %></span>
          </div>
        </div>

        <% if user_signed_in? && current_user == @collection.user %>
          <div class="flex space-x-2">
            <%= link_to edit_collection_path(@collection), class: "px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium" do %>
              Edit
            <% end %>
            <%= button_to collection_path(@collection),
                method: :delete,
                data: { turbo_confirm: "Are you sure?" },
                class: "px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg font-medium" do %>
              Delete
            <% end %>
          </div>
        <% end %>
      </div>
    </div>

    <!-- GIFs Grid -->
    <% if @gifs.any? %>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <% @gifs.each do |gif| %>
          <%= render "gifs/gif_card", gif: gif %>
        <% end %>
      </div>

      <!-- Pagination -->
      <% if @gifs.total_pages > 1 %>
        <div class="mt-8 flex justify-center">
          <%= paginate @gifs %>
        </div>
      <% end %>
    <% else %>
      <div class="bg-white rounded-lg shadow-lg p-12 text-center">
        <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4" />
        </svg>
        <p class="mt-4 text-gray-600">This collection is empty</p>
        <% if user_signed_in? && current_user == @collection.user %>
          <p class="mt-2 text-sm text-gray-500">GIFs you add to this collection will appear here</p>
        <% end %>
      </div>
    <% end %>
  </div>
</div>
```

**File:** `app/views/collections/_form.html.erb`

```erb
<%= form_with model: collection, class: "space-y-6" do |f| %>
  <% if collection.errors.any? %>
    <div class="bg-red-50 border border-red-200 rounded-lg p-4">
      <h3 class="text-sm font-medium text-red-800 mb-2">
        <%= pluralize(collection.errors.count, "error") %> prevented this collection from being saved:
      </h3>
      <ul class="list-disc list-inside text-sm text-red-700">
        <% collection.errors.full_messages.each do |message| %>
          <li><%= message %></li>
        <% end %>
      </ul>
    </div>
  <% end %>

  <div>
    <%= f.label :name, class: "block text-sm font-medium text-gray-700 mb-2" %>
    <%= f.text_field :name,
        placeholder: "My Favorite GIFs",
        class: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500",
        required: true %>
  </div>

  <div>
    <%= f.label :description, class: "block text-sm font-medium text-gray-700 mb-2" %>
    <%= f.text_area :description,
        placeholder: "What's this collection about?",
        rows: 4,
        class: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" %>
  </div>

  <div>
    <label class="flex items-center">
      <%= f.check_box :is_public, class: "mr-2 h-4 w-4 text-indigo-600 rounded" %>
      <span class="text-sm text-gray-700">Make this collection public</span>
    </label>
  </div>

  <div class="flex items-center justify-between pt-4 border-t">
    <%= link_to "Cancel", collection.persisted? ? collection : collections_path,
        class: "px-6 py-2 text-gray-700 hover:text-gray-900 font-medium" %>
    <%= f.submit collection.persisted? ? "Update Collection" : "Create Collection",
        class: "px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium cursor-pointer" %>
  </div>
<% end %>
```

**File:** `app/views/collections/new.html.erb`

```erb
<div class="container mx-auto px-4 py-8">
  <div class="max-w-2xl mx-auto">
    <div class="bg-white rounded-lg shadow-lg p-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-6">Create Collection</h1>
      <%= render "form", collection: @collection %>
    </div>
  </div>
</div>
```

**File:** `app/views/collections/edit.html.erb`

```erb
<div class="container mx-auto px-4 py-8">
  <div class="max-w-2xl mx-auto">
    <div class="bg-white rounded-lg shadow-lg p-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-6">Edit Collection</h1>
      <%= render "form", collection: @collection %>
    </div>
  </div>
</div>
```

### Testing Checklist
- [ ] View all collections
- [ ] Create new collection
- [ ] Edit collection
- [ ] Delete collection
- [ ] View collection details
- [ ] Privacy settings work
- [ ] Empty states display

---

## Feature 7: HashtagsController + Views

**Complexity:** Simple  
**Time Estimate:** 1 hour  
**Dependencies:** None

### Current State
- ✓ Routes configured (`resources :hashtags, only: [:show], param: :name`)
- ✓ Hashtag model exists
- ✗ HashtagsController doesn't exist
- ✗ No hashtag views

### Implementation Tasks

#### Task 7.1: Create HashtagsController
**File:** `app/controllers/hashtags_controller.rb`

```ruby
class HashtagsController < ApplicationController
  def show
    @hashtag = Hashtag.find_by!(name: params[:name].downcase)
    @gifs = @hashtag.gifs
                    .where(privacy: "public")
                    .includes(:user, :hashtags)
                    .order(created_at: :desc)
                    .page(params[:page])
                    .per(20)
  end
end
```

#### Task 7.2: Create Hashtag Show View
**File:** `app/views/hashtags/show.html.erb`

```erb
<div class="container mx-auto px-4 py-8">
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">#<%= @hashtag.name %></h1>
      <p class="text-gray-600">
        <%= pluralize(@hashtag.gifs_count, "GIF") %>
      </p>
    </div>

    <!-- GIFs Grid -->
    <% if @gifs.any? %>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <% @gifs.each do |gif| %>
          <%= render "gifs/gif_card", gif: gif %>
        <% end %>
      </div>

      <!-- Pagination -->
      <% if @gifs.total_pages > 1 %>
        <div class="mt-8 flex justify-center">
          <%= paginate @gifs %>
        </div>
      <% end %>
    <% else %>
      <div class="bg-white rounded-lg shadow-lg p-12 text-center">
        <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4" />
        </svg>
        <p class="mt-4 text-gray-600">No GIFs found with this hashtag</p>
      </div>
    <% end %>
  </div>
</div>
```

### Testing Checklist
- [ ] View GIFs by hashtag
- [ ] Pagination works
- [ ] Click hashtag from GIF page
- [ ] Empty state displays

---

## Additional Considerations

### 1. Pagination Setup

Add Kaminari gem if not already present:

```ruby
# Gemfile
gem 'kaminari'
```

```bash
bundle install
rails generate kaminari:config
```

### 2. Missing Partials

Create any referenced partials that don't exist:

**File:** `app/views/likes/_like_button.html.erb`

```erb
<div class="flex items-center space-x-2">
  <% if user_signed_in? %>
    <%= button_to like_gif_path(gif),
        method: :post,
        data: { turbo_frame: "like_#{gif.id}" },
        class: "flex items-center space-x-2 #{current_user.liked?(gif) ? 'text-red-500' : 'text-gray-600 hover:text-red-500'} transition-colors" do %>
      <svg class="w-6 h-6 #{current_user.liked?(gif) ? 'fill-current' : ''}" 
           fill="<%= current_user.liked?(gif) ? 'currentColor' : 'none' %>"
           stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
      <span class="font-semibold"><%= gif.like_count %></span>
    <% end %>
  <% else %>
    <%= link_to new_user_session_path, class: "flex items-center space-x-2 text-gray-600 hover:text-red-500" do %>
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
      <span class="font-semibold"><%= gif.like_count %></span>
    <% end %>
  <% end %>
</div>
```

### 3. Hotwire Patterns Used

**Turbo Frames:** For partial page updates without full reload
- Profile tabs (GIFs/Liked/Collections switch)
- Comment form submission
- Like button updates
- Follow button updates

**Turbo Streams:** For multiple simultaneous updates
- Adding comment (prepend to list + update count + clear form)
- Like toggle (update button state + count)

**Stimulus Controllers:**
- `dropdown_controller.js` - User menu dropdown
- `flash_controller.js` - Auto-dismiss flash messages
- `infinite_scroll_controller.js` - Load more GIFs
- `like_controller.js` - Optimistic like updates
- `gif_form_controller.js` (NEW) - File preview

### 4. Gotchas & Special Considerations

1. **Hashtag Parsing:** Need to parse comma-separated hashtag string in GIF edit form
2. **Extension Integration:** GIF creation happens via browser extension only - web app is for viewing and editing metadata
3. **Privacy:** Ensure viewable_privacy logic works in all controllers
4. **N+1 Queries:** Use `.includes()` everywhere to avoid performance issues
5. **Turbo Frame Targets:** Ensure DOM IDs are unique across the page
6. **Form Validation:** Turbo Stream responses need `:unprocessable_entity` status

---

## Implementation Timeline

### Week 1: Core Features (Priority 1)
**Day 1 (2 hours)**
- Morning: CommentsController + tests
- Afternoon: GIF forms partial + new view

**Day 2 (2 hours)**
- Morning: GIF edit view + Stimulus controller
- Afternoon: FollowsController + follow button partial

### Week 2: User Experience (Priority 2)
**Day 3 (3 hours)**
- Morning: UsersController with tabs logic
- Afternoon: Profile show view + tab switching

**Day 4 (2 hours)**
- Morning: Profile tab partials (GIFs, Liked, Collections)
- Afternoon: Devise views (sign in, sign up)

**Day 5 (1 hour)**
- Morning: Devise views (forgot password, edit profile)

### Week 3: Enhanced Features (Priority 3)
**Day 6 (2 hours)**
- Morning: CollectionsController
- Afternoon: Collection views (index, show)

**Day 7 (1 hour)**
- Morning: Collection forms (new, edit)
- Afternoon: HashtagsController + view

### Week 4: Polish & Testing
**Day 8-9 (3 hours)**
- Integration testing
- Bug fixes
- UI polish
- Edge case handling

---

## Success Criteria

Phase 2 is complete when:

- [ ] All 7 features implemented and tested
- [ ] Users can comment, upload, edit, follow, and browse
- [ ] All Turbo Frames/Streams work without full page reloads
- [ ] Authentication flows are polished and styled
- [ ] Collections and hashtags are functional
- [ ] No N+1 query issues
- [ ] All empty states display correctly
- [ ] Privacy settings respected throughout
- [ ] Mobile responsive (Tailwind handles this)

---

## Next Steps After Phase 2

1. **Testing & Bug Fixes** - Comprehensive manual and automated testing
2. **Performance Optimization** - Database indexes, caching, CDN
3. **Phase 3: Enhanced Features** - Search, notifications, analytics
4. **Phase 4: Mobile App** - React Native with existing API

---

## Questions & Decisions Needed

1. **Pagination:** Use Kaminari or Pagy? (Recommend Kaminari - more mature)
2. **GIF Storage:** Extension uploads directly to S3 or via Active Storage API? (Recommend Active Storage via API)
3. **Image Processing:** Process on extension upload or lazy load? (Recommend on upload with background job)
4. **Hashtag Input:** Comma-separated or tag picker? (Using comma-separated with autocomplete)
5. **Collection Add GIF:** From profile or via modal? (Defer to Phase 3)

---

**Document Version:** 1.0  
**Author:** Claude (Sonnet 4.5)  
**Ready for Implementation:** Yes
