# Task 6: Complete Hashtags Web UI - Detailed Implementation Plan

## Executive Summary

### Current State Analysis

**What's Working Well (15/18 features complete - 83%):**
- ✅ Model: Full implementation with validations, callbacks, scopes (65 lines)
- ✅ Associations: GifHashtag join model with counter cache
- ✅ API: 4 endpoints (index, show, trending, search) - all functional
- ✅ Autocomplete: 315-line Stimulus controller with search/trending
- ✅ Parsing: Auto-extract hashtags from text (#word format)
- ✅ Counter cache: Usage count auto-updates on GIF association
- ✅ Show page: Beautiful UI displaying GIFs for a hashtag
- ✅ Form integration: Hashtag input on GIF create/edit forms
- ✅ Comprehensive tests: 186 lines covering all model functionality

**What's Missing (3/18 features - 17%):**
- ❌ Index/browse page for all hashtags (`/hashtags`)
- ❌ Trending hashtags page view (`/hashtags/trending`)
- ❌ Critical API bug: GIF index doesn't filter by hashtag_names

**Quality Assessment:**
- Code quality: Excellent (follows Rails 8 conventions)
- Test coverage: Strong (model 100%, API tested)
- UI consistency: Good (matches existing design patterns)
- Performance: Caching implemented for trending

### Time Estimate

**Total: 3.5 hours**
- API Bug Fix: 15 minutes (CRITICAL - blocks API users)
- Trending Page: 1 hour (API exists, need view + controller action)
- Index/Browse Page: 1.5 hours (new functionality)
- Testing: 45 minutes (controller tests + integration tests)
- Documentation: 15 minutes

---

## 1. CRITICAL Bug Fix (Priority 1)

### Issue: API GIF Controller Missing hashtag_names Parameter

**Location:** `app/controllers/api/v1/gifs_controller.rb` lines 96-108

**Problem:**
The `gif_params` method doesn't include `hashtag_names` array, which means:
- API users cannot create GIFs with hashtags
- API users cannot update hashtag associations
- Web form works (uses different controller) but API is broken

**Current Code:**
```ruby
def gif_params
  params.require(:gif).permit(
    :title, :description, :privacy,
    :youtube_video_url, :youtube_video_title, :youtube_channel_name,
    :youtube_timestamp_start, :youtube_timestamp_end,
    :has_text_overlay, :text_overlay_data, :parent_gif_id,
    :file
  )
end
```

**Fix Required:**
```ruby
def gif_params
  params.require(:gif).permit(
    :title, :description, :privacy,
    :youtube_video_url, :youtube_video_title, :youtube_channel_name,
    :youtube_timestamp_start, :youtube_timestamp_end,
    :has_text_overlay, :text_overlay_data, :parent_gif_id,
    :file,
    hashtag_names: []  # Add this line
  )
end
```

**Implementation Steps:**
1. Open `app/controllers/api/v1/gifs_controller.rb`
2. Add `hashtag_names: []` to both `gif_params` and `gif_update_params` methods
3. Test with curl/API client:
```bash
curl -X POST http://localhost:3000/api/v1/gifs \
  -H "Authorization: Bearer $TOKEN" \
  -F "gif[title]=Test GIF" \
  -F "gif[hashtag_names][]=funny" \
  -F "gif[hashtag_names][]=memes"
```

**Time Estimate:** 15 minutes

---

## 2. Routes Configuration

### Current Routes
```ruby
resources :hashtags, only: [:show], param: :name
```

### Updated Routes
```ruby
resources :hashtags, only: [:index, :show], param: :name do
  collection do
    get 'trending'
  end
end
```

**Implementation:**
1. Open `config/routes.rb`
2. Update hashtags route to include `:index`
3. Add `trending` collection route
4. This creates:
   - `GET /hashtags` → `hashtags#index`
   - `GET /hashtags/trending` → `hashtags#trending`
   - `GET /hashtags/:name` → `hashtags#show` (already exists)

**Time Estimate:** 5 minutes

---

## 3. Controller Implementation

### File: `app/controllers/hashtags_controller.rb`

**Current Implementation:**
```ruby
class HashtagsController < ApplicationController
  def show
    @hashtag = Hashtag.find_by!(name: params[:name])
    @pagy, @gifs = pagy(@hashtag.gifs
                                .public_only
                                .includes(:user, :hashtags)
                                .order(created_at: :desc),
                        page: params[:page], items: 20)
  end
end
```

**Enhanced Implementation:**
```ruby
class HashtagsController < ApplicationController
  # GET /hashtags
  def index
    # Support sorting: alphabetical (default), popular, recent
    sort = params[:sort] || 'alphabetical'
    
    @hashtags = case sort
                when 'popular'
                  Hashtag.popular.where('usage_count > 0')
                when 'recent'
                  Hashtag.recent.where('usage_count > 0')
                when 'trending'
                  Hashtag.trending.limit(50)
                else
                  Hashtag.alphabetical.where('usage_count > 0')
                end
    
    @pagy, @hashtags = pagy(@hashtags, page: params[:page], items: 30)
  end
  
  # GET /hashtags/trending
  def trending
    # Use cached trending data (15 min cache from API controller)
    @trending_hashtags = Rails.cache.fetch('hashtags:trending:50', expires_in: 15.minutes) do
      Hashtag.trending.limit(50).to_a
    end
    
    # Paginate the cached results
    @pagy, @hashtags = pagy_array(@trending_hashtags, page: params[:page], items: 30)
    
    # Load GIFs for preview (top 3 GIFs per hashtag for first page only)
    if params[:page].blank? || params[:page].to_i == 1
      @hashtag_previews = @hashtags.first(12).each_with_object({}) do |hashtag, hash|
        hash[hashtag.id] = hashtag.gifs
                                   .public_only
                                   .includes(:user)
                                   .order(created_at: :desc)
                                   .limit(3)
      end
    end
  end
  
  # GET /hashtags/:name (existing)
  def show
    @hashtag = Hashtag.find_by!(name: params[:name])
    
    @pagy, @gifs = pagy(@hashtag.gifs
                                .public_only
                                .includes(:user, :hashtags)
                                .order(created_at: :desc),
                        page: params[:page], items: 20)
  end
end
```

**Key Features:**
- **Index**: Browse all hashtags with sorting options
- **Trending**: Cached for performance (15-min cache)
- **Preview GIFs**: Show sample GIFs for trending hashtags
- **Pagination**: Consistent with other pages (pagy)
- **Performance**: Only loads previews on first page

**Time Estimate:** 45 minutes

---

## 4. View Templates

### 4.1 Index Page: `app/views/hashtags/index.html.erb`

**Purpose:** Browse all hashtags with filtering/sorting

```erb
<div class="container mx-auto px-4 py-8">
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Browse Hashtags</h1>
      <p class="text-gray-600">Discover and explore GIFs by hashtag</p>
    </div>
    
    <!-- Filters -->
    <div class="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
      <div class="flex items-center space-x-4">
        <%= link_to hashtags_path(sort: 'alphabetical'), 
            class: "px-4 py-2 rounded-lg font-medium #{params[:sort] == 'alphabetical' || params[:sort].blank? ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}" do %>
          A-Z
        <% end %>
        <%= link_to hashtags_path(sort: 'popular'), 
            class: "px-4 py-2 rounded-lg font-medium #{params[:sort] == 'popular' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}" do %>
          Most Used
        <% end %>
        <%= link_to hashtags_path(sort: 'recent'), 
            class: "px-4 py-2 rounded-lg font-medium #{params[:sort] == 'recent' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}" do %>
          Recently Added
        <% end %>
      </div>
      
      <%= link_to trending_hashtags_path, 
          class: "flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 font-medium transition-all" do %>
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <span>Trending</span>
      <% end %>
    </div>
    
    <% if @hashtags.any? %>
      <!-- Hashtag Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
        <% @hashtags.each do |hashtag| %>
          <%= link_to hashtag_path(hashtag.name), 
              class: "group block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 text-center" do %>
            <!-- Hashtag Icon -->
            <div class="mb-3">
              <svg class="mx-auto h-10 w-10 text-indigo-600 group-hover:text-indigo-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
            </div>
            
            <!-- Hashtag Name -->
            <h3 class="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors mb-1 truncate">
              #<%= hashtag.name %>
            </h3>
            
            <!-- Usage Count -->
            <p class="text-sm text-gray-500">
              <%= pluralize(hashtag.usage_count, 'GIF') %>
            </p>
          <% end %>
        <% end %>
      </div>
      
      <!-- Pagination -->
      <% if @pagy.next %>
        <div class="text-center">
          <%= link_to hashtags_path(sort: params[:sort], page: @pagy.next),
              class: "inline-block px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors" do %>
            Load More
          <% end %>
        </div>
      <% end %>
    <% else %>
      <!-- Empty State -->
      <div class="text-center py-20">
        <svg class="mx-auto h-24 w-24 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
        </svg>
        <h3 class="text-xl font-semibold text-gray-700 mb-2">No hashtags found</h3>
        <p class="text-gray-500 mb-6">Start adding hashtags to your GIFs!</p>
        <% if user_signed_in? %>
          <%= link_to new_gif_path, class: "inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors" do %>
            Upload GIF
          <% end %>
        <% end %>
      </div>
    <% end %>
  </div>
</div>
```

**Features:**
- Sorting: Alphabetical, Popular, Recent
- Grid layout: Responsive (2-5 columns)
- Trending button: Prominent call-to-action
- Usage count: Shows number of GIFs
- Empty state: Helpful message when no hashtags

**Time Estimate:** 45 minutes

---

### 4.2 Trending Page: `app/views/hashtags/trending.html.erb`

**Purpose:** Showcase trending hashtags with GIF previews

```erb
<div class="container mx-auto px-4 py-8">
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2 flex items-center">
            <svg class="w-8 h-8 mr-3 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Trending Hashtags
          </h1>
          <p class="text-gray-600">
            The most popular hashtags right now
          </p>
        </div>
        
        <%= link_to hashtags_path, 
            class: "px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors" do %>
          Browse All
        <% end %>
      </div>
    </div>
    
    <% if @hashtags.any? %>
      <!-- Trending Hashtags List -->
      <div class="space-y-6 mb-8">
        <% @hashtags.each_with_index do |hashtag, index| %>
          <div class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <!-- Hashtag Header -->
            <div class="p-6 border-b border-gray-100">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                  <!-- Rank Badge -->
                  <div class="flex-shrink-0">
                    <% if index < 3 %>
                      <div class="w-10 h-10 rounded-full bg-gradient-to-br <%= index == 0 ? 'from-yellow-400 to-yellow-600' : index == 1 ? 'from-gray-300 to-gray-500' : 'from-orange-400 to-orange-600' %> flex items-center justify-center text-white font-bold">
                        <%= index + 1 + (@pagy.page - 1) * @pagy.items %>
                      </div>
                    <% else %>
                      <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold">
                        <%= index + 1 + (@pagy.page - 1) * @pagy.items %>
                      </div>
                    <% end %>
                  </div>
                  
                  <!-- Hashtag Info -->
                  <div>
                    <%= link_to hashtag_path(hashtag.name), class: "block group" do %>
                      <h2 class="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                        #<%= hashtag.name %>
                      </h2>
                    <% end %>
                    <p class="text-sm text-gray-600 mt-1">
                      <%= pluralize(hashtag.usage_count, 'GIF') %>
                      <span class="mx-2">•</span>
                      <span class="text-gray-500">Created <%= time_ago_in_words(hashtag.created_at) %> ago</span>
                    </p>
                  </div>
                </div>
                
                <!-- View All Link -->
                <%= link_to hashtag_path(hashtag.name), 
                    class: "flex items-center space-x-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 font-medium transition-colors" do %>
                  <span>View All</span>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                <% end %>
              </div>
            </div>
            
            <!-- GIF Preview (only on first page) -->
            <% if @hashtag_previews && @hashtag_previews[hashtag.id].present? %>
              <div class="p-6 bg-gray-50">
                <div class="grid grid-cols-3 gap-4">
                  <% @hashtag_previews[hashtag.id].each do |gif| %>
                    <%= link_to gif_path(gif), class: "block aspect-video bg-gray-200 rounded-lg overflow-hidden group" do %>
                      <% if gif.file.attached? %>
                        <%= image_tag gif.file, alt: gif.title, class: "w-full h-full object-cover group-hover:scale-105 transition-transform" %>
                      <% elsif gif.thumbnail_url.present? %>
                        <%= image_tag gif.thumbnail_url, alt: gif.title, class: "w-full h-full object-cover group-hover:scale-105 transition-transform" %>
                      <% end %>
                    <% end %>
                  <% end %>
                </div>
              </div>
            <% end %>
          </div>
        <% end %>
      </div>
      
      <!-- Pagination -->
      <% if @pagy.next %>
        <div class="text-center">
          <%= link_to trending_hashtags_path(page: @pagy.next),
              class: "inline-block px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors" do %>
            Load More
          <% end %>
        </div>
      <% end %>
    <% else %>
      <!-- Empty State -->
      <div class="text-center py-20">
        <svg class="mx-auto h-24 w-24 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <h3 class="text-xl font-semibold text-gray-700 mb-2">No trending hashtags yet</h3>
        <p class="text-gray-500 mb-6">Start adding hashtags to your GIFs to see trends!</p>
        <% if user_signed_in? %>
          <%= link_to new_gif_path, class: "inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors" do %>
            Upload GIF
          <% end %>
        <% end %>
      </div>
    <% end %>
  </div>
</div>
```

**Features:**
- **Ranking system**: Top 3 get special badges (gold, silver, bronze)
- **GIF previews**: Shows 3 sample GIFs per hashtag (first page only)
- **Rich metadata**: Usage count, creation date
- **Performance**: Uses cached trending data
- **Responsive**: Grid adjusts for mobile

**Time Estimate:** 1 hour

---

## 5. Optional: Trending Hashtags Sidebar Widget

### File: `app/views/hashtags/_trending_sidebar.html.erb`

**Purpose:** Show trending hashtags on homepage/feed

```erb
<!-- Trending Hashtags Widget -->
<div class="bg-white rounded-lg shadow-lg p-6">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-bold text-gray-900 flex items-center">
      <svg class="w-5 h-5 mr-2 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
      Trending Hashtags
    </h3>
    <%= link_to trending_hashtags_path, class: "text-sm text-indigo-600 hover:text-indigo-700 font-medium" do %>
      View All
    <% end %>
  </div>
  
  <div class="space-y-3">
    <% trending_hashtags = Rails.cache.fetch('hashtags:trending:10', expires_in: 15.minutes) do
         Hashtag.trending.limit(10).to_a
       end %>
    
    <% trending_hashtags.each_with_index do |hashtag, index| %>
      <%= link_to hashtag_path(hashtag.name), 
          class: "flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group" do %>
        <div class="flex items-center space-x-3 flex-1 min-w-0">
          <span class="text-sm font-bold text-gray-400 w-6 text-center">
            <%= index + 1 %>
          </span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
              #<%= hashtag.name %>
            </p>
            <p class="text-xs text-gray-500">
              <%= number_to_human(hashtag.usage_count, precision: 1) %> GIFs
            </p>
          </div>
        </div>
        <svg class="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      <% end %>
    <% end %>
  </div>
</div>
```

**Integration:**
Add to `app/views/home/feed.html.erb` or `app/views/home/trending.html.erb`:

```erb
<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
  <!-- Main Feed (2/3 width) -->
  <div class="lg:col-span-2">
    <!-- Existing feed content -->
  </div>
  
  <!-- Sidebar (1/3 width) -->
  <div class="lg:col-span-1 space-y-6">
    <%= render 'hashtags/trending_sidebar' %>
    <!-- Other sidebar widgets -->
  </div>
</div>
```

**Time Estimate:** 30 minutes

---

## 6. Turbo Stream Enhancements (Optional)

### Infinite Scroll for Hashtag Pages

**Add to existing Stimulus controller** or create new one:

```javascript
// app/javascript/controllers/infinite_scroll_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["trigger"]
  
  connect() {
    this.observe()
  }
  
  observe() {
    if (this.hasTriggerTarget) {
      const observer = new IntersectionObserver(
        entries => this.handleIntersect(entries),
        { rootMargin: "100px" }
      )
      observer.observe(this.triggerTarget)
    }
  }
  
  handleIntersect(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Turbo Frame will automatically load next page
        console.log("Loading next page...")
      }
    })
  }
}
```

**Update view to use Turbo Frames:**

```erb
<%= turbo_frame_tag "hashtags" do %>
  <!-- Hashtag grid content -->
  
  <% if @pagy.next %>
    <%= turbo_frame_tag "page_#{@pagy.next}",
        src: trending_hashtags_path(page: @pagy.next),
        loading: :lazy do %>
      <div class="flex justify-center py-8">
        <span class="text-gray-600">Loading...</span>
      </div>
    <% end %>
  <% end %>
<% end %>
```

**Time Estimate:** 30 minutes

---

## 7. Testing Plan

### 7.1 Controller Tests

**File:** `test/controllers/hashtags_controller_test.rb`

```ruby
require "test_helper"

class HashtagsControllerTest < ActionDispatch::IntegrationTest
  def setup
    @user = users(:one)
    @hashtag = hashtags(:funny)
    @gif = gifs(:public_gif)
    @gif.hashtags << @hashtag
  end
  
  # Index action tests
  test "should get index" do
    get hashtags_path
    assert_response :success
    assert_select "h1", "Browse Hashtags"
  end
  
  test "index should sort alphabetically by default" do
    get hashtags_path
    assert_response :success
    # Verify hashtags are in alphabetical order
  end
  
  test "index should sort by popular" do
    get hashtags_path(sort: 'popular')
    assert_response :success
    # Verify hashtags are sorted by usage_count
  end
  
  test "index should sort by recent" do
    get hashtags_path(sort: 'recent')
    assert_response :success
    # Verify hashtags are sorted by created_at desc
  end
  
  test "index should paginate results" do
    get hashtags_path(page: 2)
    assert_response :success
  end
  
  # Trending action tests
  test "should get trending" do
    get trending_hashtags_path
    assert_response :success
    assert_select "h1", /Trending Hashtags/
  end
  
  test "trending should use cached data" do
    # First request should cache
    get trending_hashtags_path
    assert_response :success
    
    # Second request should use cache
    assert_queries(0) do
      get trending_hashtags_path
    end
  end
  
  test "trending should show GIF previews on first page" do
    get trending_hashtags_path
    assert_response :success
    assert assigns(:hashtag_previews).present?
  end
  
  test "trending should not load GIF previews on page 2" do
    get trending_hashtags_path(page: 2)
    assert_response :success
    assert assigns(:hashtag_previews).nil?
  end
  
  # Show action tests (existing)
  test "should get show" do
    get hashtag_path(@hashtag.name)
    assert_response :success
    assert_select "h1", "##{@hashtag.name}"
  end
  
  test "show should display hashtag GIFs" do
    get hashtag_path(@hashtag.name)
    assert_response :success
    assert_select ".grid" # GIF grid container
  end
  
  test "show should handle missing hashtag" do
    assert_raises(ActiveRecord::RecordNotFound) do
      get hashtag_path("nonexistent")
    end
  end
end
```

**Time Estimate:** 30 minutes

---

### 7.2 Integration Tests

**File:** `test/integration/hashtag_browsing_test.rb`

```ruby
require "test_helper"

class HashtagBrowsingTest < ActionDispatch::IntegrationTest
  def setup
    @user = users(:one)
    @hashtag1 = Hashtag.create!(name: "funny", slug: "funny", usage_count: 100)
    @hashtag2 = Hashtag.create!(name: "awesome", slug: "awesome", usage_count: 50)
    @hashtag3 = Hashtag.create!(name: "new", slug: "new", usage_count: 0)
  end
  
  test "user can browse all hashtags" do
    get hashtags_path
    assert_response :success
    
    # Should show hashtags with usage > 0
    assert_select "h3", text: /#funny/
    assert_select "h3", text: /#awesome/
    
    # Should not show unused hashtags
    assert_select "h3", text: /#new/, count: 0
  end
  
  test "user can sort hashtags by popularity" do
    get hashtags_path(sort: 'popular')
    assert_response :success
    
    # First hashtag should be most popular
    # (Add assertion to verify order)
  end
  
  test "user can view trending hashtags" do
    get trending_hashtags_path
    assert_response :success
    
    # Should show trending header
    assert_select "h1", /Trending/
    
    # Should show hashtags with ranking
    assert_select ".rounded-full", minimum: 1 # Rank badges
  end
  
  test "user can click hashtag to view GIFs" do
    gif = @user.gifs.create!(title: "Test", privacy: :public_access)
    gif.hashtags << @hashtag1
    
    get hashtags_path
    assert_response :success
    
    # Click on hashtag
    get hashtag_path(@hashtag1.name)
    assert_response :success
    
    # Should show hashtag page
    assert_select "h1", "##{@hashtag1.name}"
    
    # Should show GIF
    assert_select "h3", text: /Test/
  end
  
  test "trending page shows GIF previews" do
    3.times do |i|
      gif = @user.gifs.create!(title: "GIF #{i}", privacy: :public_access)
      gif.hashtags << @hashtag1
    end
    
    get trending_hashtags_path
    assert_response :success
    
    # Should show preview images
    assert_select "img[alt*='GIF']", minimum: 1
  end
end
```

**Time Estimate:** 15 minutes

---

### 7.3 Manual Testing Checklist

**Index Page (`/hashtags`):**
- [ ] Page loads without errors
- [ ] Hashtags display in grid layout
- [ ] Sorting works (A-Z, Popular, Recent)
- [ ] Only hashtags with usage > 0 are shown
- [ ] Usage count displays correctly
- [ ] Pagination works
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Empty state shows when no hashtags
- [ ] Trending button is visible and clickable

**Trending Page (`/hashtags/trending`):**
- [ ] Page loads without errors
- [ ] Hashtags sorted by usage_count descending
- [ ] Rank badges show for top 3
- [ ] GIF previews load on first page
- [ ] No GIF previews on page 2+
- [ ] Pagination works
- [ ] Click hashtag navigates to show page
- [ ] "View All" link works
- [ ] "Browse All" link works
- [ ] Responsive design

**Show Page (`/hashtags/:name`)** (existing, verify still works):
- [ ] Page loads without errors
- [ ] GIFs display in grid
- [ ] Pagination works
- [ ] No regressions from new code

**API Bug Fix:**
- [ ] Create GIF via API with hashtag_names works
- [ ] Update GIF via API with hashtag_names works
- [ ] Hashtags properly associated with GIF
- [ ] Counter cache updates correctly

---

## 8. Files to Create/Modify - Complete Checklist

### Files to Modify (4 files)

1. **config/routes.rb**
   - [ ] Add `:index` to hashtags resources
   - [ ] Add `trending` collection route

2. **app/controllers/hashtags_controller.rb**
   - [ ] Add `index` action with sorting
   - [ ] Add `trending` action with caching
   - [ ] Keep existing `show` action

3. **app/controllers/api/v1/gifs_controller.rb**
   - [ ] Add `hashtag_names: []` to `gif_params`
   - [ ] Add `hashtag_names: []` to `gif_update_params`

4. **app/views/hashtags/show.html.erb** (optional improvements)
   - [ ] Add breadcrumbs
   - [ ] Add link to trending/browse pages

### Files to Create (4 files)

5. **app/views/hashtags/index.html.erb**
   - [ ] Create complete view with grid layout
   - [ ] Add sorting filters
   - [ ] Add pagination
   - [ ] Add empty state

6. **app/views/hashtags/trending.html.erb**
   - [ ] Create complete view with list layout
   - [ ] Add rank badges
   - [ ] Add GIF previews
   - [ ] Add pagination

7. **app/views/hashtags/_trending_sidebar.html.erb** (optional)
   - [ ] Create sidebar widget
   - [ ] Add caching
   - [ ] Add links to full pages

8. **test/controllers/hashtags_controller_test.rb**
   - [ ] Create test file
   - [ ] Add tests for index action
   - [ ] Add tests for trending action
   - [ ] Verify existing show tests still pass

### Files to Update (Optional - 2 files)

9. **app/views/home/feed.html.erb** (optional)
   - [ ] Add sidebar with trending widget
   - [ ] Adjust layout for sidebar

10. **app/javascript/controllers/infinite_scroll_controller.js** (optional)
    - [ ] Add infinite scroll support
    - [ ] Test with Turbo Frames

---

## 9. Priority Order & Implementation Steps

### Phase 1: Critical Bug Fix (15 minutes)
**Priority: URGENT - Blocks API users**

1. Fix API GIF controller parameters
2. Test with curl/API client
3. Verify hashtag associations work

**Deliverable:** API users can create/update GIFs with hashtags

---

### Phase 2: Trending Page (1 hour)
**Priority: HIGH - Easy win, API already exists**

1. Add trending route
2. Add trending controller action
3. Create trending view template
4. Test manually
5. Write controller tests

**Deliverable:** `/hashtags/trending` page works

---

### Phase 3: Index/Browse Page (1.5 hours)
**Priority: MEDIUM - New functionality**

1. Add index route
2. Add index controller action with sorting
3. Create index view template
4. Add filter UI
5. Test all sorting options
6. Write controller tests

**Deliverable:** `/hashtags` page works with sorting

---

### Phase 4: Testing & Documentation (45 minutes)
**Priority: MEDIUM - Quality assurance**

1. Run all existing tests (ensure no regressions)
2. Write controller tests for new actions
3. Write integration tests
4. Manual testing checklist
5. Update README if needed

**Deliverable:** Full test coverage for hashtags feature

---

### Phase 5: Optional Enhancements (1 hour)
**Priority: LOW - Nice to have**

1. Create trending sidebar widget
2. Add infinite scroll with Turbo
3. Add breadcrumbs to show page
4. Performance optimizations

**Deliverable:** Enhanced UX features

---

## 10. Performance Considerations

### Caching Strategy

1. **Trending Hashtags** (already implemented in API):
```ruby
Rails.cache.fetch('hashtags:trending:50', expires_in: 15.minutes) do
  Hashtag.trending.limit(50).to_a
end
```

2. **Index Page Counts**:
- Use counter cache (already implemented)
- No need for additional caching

3. **GIF Previews**:
- Only load on first page of trending
- Limit to 3 GIFs per hashtag
- Use `includes(:user)` to avoid N+1

### Database Indexes

**Already exists** (verify in schema):
```ruby
add_index :hashtags, :name, unique: true
add_index :hashtags, :slug, unique: true
add_index :hashtags, :usage_count
```

**Consider adding** (optional):
```ruby
add_index :hashtags, [:usage_count, :name] # For trending + alphabetical fallback
```

---

## 11. Security Considerations

- All pages are public (no authentication required)
- Hashtag names sanitized on create (model validation)
- No user input on index/trending pages
- XSS protection via Rails automatic escaping
- SQL injection protection via ActiveRecord

**No additional security measures needed.**

---

## 12. Accessibility (a11y)

### Requirements:
- [ ] Semantic HTML (`<h1>`, `<nav>`, `<main>`)
- [ ] Alt text for all images
- [ ] Keyboard navigation support
- [ ] ARIA labels for icon buttons
- [ ] Color contrast meets WCAG AA standards
- [ ] Focus indicators visible

### Example:
```erb
<button aria-label="Sort hashtags alphabetically" class="...">
  A-Z
</button>
```

---

## 13. Success Criteria

### Functional Requirements
- ✅ API accepts hashtag_names parameter
- ✅ Trending page displays top hashtags with ranking
- ✅ Index page displays all hashtags with sorting
- ✅ GIF previews load on trending page
- ✅ Pagination works on all pages
- ✅ No regressions on existing show page

### Non-Functional Requirements
- ✅ Page load time < 500ms (with caching)
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Test coverage > 80%
- ✅ No N+1 queries
- ✅ Consistent UI with rest of app

### User Experience
- ✅ Clear navigation between pages
- ✅ Helpful empty states
- ✅ Loading states for async operations
- ✅ Error handling (404 for missing hashtags)

---

## 14. Rollout Plan

### Development
1. Create feature branch: `feature/hashtags-web-ui`
2. Implement in priority order (phases 1-4)
3. Run full test suite
4. Manual QA testing

### Code Review
1. Self-review using checklist
2. Request peer review
3. Address feedback

### Deployment
1. Merge to main
2. Deploy to staging
3. Smoke test on staging
4. Deploy to production
5. Monitor for errors

### Post-Deployment
1. Monitor error logs
2. Check analytics for usage
3. Gather user feedback
4. Plan Phase 5 (optional enhancements)

---

## 15. Future Enhancements (Out of Scope)

**Not included in this task, consider for future:**

1. **Search/Autocomplete on Browse Page**
   - Add search bar to quickly find hashtags
   - Use existing autocomplete Stimulus controller

2. **Hashtag Following**
   - Let users follow hashtags
   - Show followed hashtags in feed

3. **Hashtag Analytics**
   - Track trending over time
   - Show growth charts

4. **Hashtag Suggestions**
   - Suggest related hashtags
   - "People also used..." feature

5. **Hashtag Moderation**
   - Admin interface to hide/merge hashtags
   - Report inappropriate hashtags

6. **API v2 Improvements**
   - Add hashtag filter to GIF index endpoint
   - Add hashtag statistics endpoint

---

## 16. Dependencies & Prerequisites

### Required:
- ✅ Rails 8 installed
- ✅ Hashtag model exists
- ✅ API endpoints functional
- ✅ Pagy gem installed
- ✅ Tailwind CSS configured

### Optional:
- Stimulus infinite scroll controller
- Turbo Frames for lazy loading

---

## 17. Risk Assessment

### Low Risk:
- API bug fix (simple parameter addition)
- Trending page (API already exists)
- Index page (standard Rails CRUD)

### Medium Risk:
- Performance with large hashtag counts (mitigated by caching)
- GIF preview loading time (mitigated by limit + first page only)

### Mitigation:
- Use caching aggressively
- Add pagination everywhere
- Monitor performance in production
- Add database indexes if needed

---

## 18. Estimated Timeline

### Minimum Viable (Phases 1-2): 1.25 hours
- API bug fix: 15 min
- Trending page: 1 hour

### Complete Implementation (Phases 1-4): 3.25 hours
- API bug fix: 15 min
- Trending page: 1 hour
- Index page: 1.5 hours
- Testing: 45 min

### Full Package (Phases 1-5): 4.25 hours
- Above: 3.25 hours
- Optional enhancements: 1 hour

**Recommended:** Start with Phases 1-2 (1.25 hours), deploy, gather feedback, then complete Phases 3-4.

---

## 19. Code Quality Checklist

Before marking complete:

### Code Style
- [ ] Follows Rails conventions
- [ ] Consistent indentation (2 spaces)
- [ ] No commented-out code
- [ ] Meaningful variable names
- [ ] DRY (no repetition)

### Performance
- [ ] No N+1 queries (use `includes`)
- [ ] Caching implemented
- [ ] Database indexes present
- [ ] Pagination on all lists

### Testing
- [ ] Controller tests pass
- [ ] Integration tests pass
- [ ] Manual testing complete
- [ ] No regressions

### Documentation
- [ ] Code comments where needed
- [ ] README updated (if applicable)
- [ ] API documentation updated (if applicable)

---

## 20. Support & Troubleshooting

### Common Issues

**Issue:** Trending page shows no hashtags
- **Solution:** Check that hashtags have `usage_count > 0`
- **Debug:** Run `Hashtag.trending` in console

**Issue:** GIF previews not showing
- **Solution:** Verify GIFs have `file` attached or `thumbnail_url`
- **Debug:** Check `@hashtag_previews` in view

**Issue:** Pagination not working
- **Solution:** Verify pagy gem is configured
- **Debug:** Check `@pagy` object in view

**Issue:** Caching issues (stale data)
- **Solution:** Clear cache with `Rails.cache.clear`
- **Debug:** Check cache expiration time

---

## Summary

This plan provides a complete roadmap to finish the Hashtags web UI feature. The implementation is broken down into manageable phases with clear time estimates, priorities, and success criteria.

**Key Highlights:**
- 83% already complete (15/18 features)
- Only 3.5 hours to finish
- Critical API bug fix is top priority
- Trending page is a quick win
- Strong foundation with excellent test coverage

**Recommended Approach:**
1. Fix API bug immediately (15 min)
2. Deploy trending page as MVP (1 hour)
3. Add index/browse page (1.5 hours)
4. Complete testing (45 min)
5. Consider optional enhancements based on user feedback

This feature will significantly enhance the hashtag discovery experience and provide a complete, production-ready implementation.
