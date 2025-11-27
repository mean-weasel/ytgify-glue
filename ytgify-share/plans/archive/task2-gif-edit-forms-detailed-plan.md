# Task 2: GIF Edit Forms - Detailed Implementation Plan

**Status:** Ready to Implement
**Complexity:** Low-Medium (Most infrastructure already exists)
**Time Estimate:** 1-1.5 hours
**Dependencies:** None

---

## Executive Summary

The GIF editing functionality is **90% complete**. All hard parts are done:
- ✅ Form partial exists with all fields and Stimulus controllers
- ✅ Hashtag autocomplete system fully implemented
- ✅ GIF model has all validations and hashtag management
- ✅ Controller has authorization and strong parameters
- ✅ Edit view renders the form

**What's Missing:** Only Turbo Stream support in the controller for inline/seamless editing.

---

## Current State Analysis

### What Exists ✅

1. **Complete Form Partial** (`app/views/gifs/_form.html.erb`)
   - YouTube URL input with live preview
   - Timestamp selection (start/end) with validation
   - Auto-calculating duration
   - Title field with character counter (100 max)
   - Description textarea with character counter (2000 max)
   - **Hashtag input with full autocomplete** (Stimulus controller)
   - Privacy selection (visual radio buttons)
   - Form validation and error display
   - Stimulus controllers: `gif-form`, `hashtag-input`

2. **GifsController** (`app/controllers/gifs_controller.rb`)
   - ✅ `edit` action (basic - just renders view)
   - ✅ `update` action (HTML redirect only)
   - ✅ Authentication (`before_action :authenticate_user!`)
   - ✅ Authorization (`before_action :authorize_user!`)
   - ✅ Strong parameters with all fields permitted
   - ❌ No Turbo Stream format handling

3. **GIF Model** (`app/models/gif.rb`)
   - All editable fields: title, description, privacy, hashtag_names
   - Comprehensive validations
   - Automatic hashtag management via `hashtag_names=` setter
   - Privacy enum: `public_access`, `unlisted`, `private_access`

4. **Hashtag System**
   - Full autocomplete API endpoint (`/api/v1/hashtags/search`)
   - Stimulus controller with keyboard navigation
   - Visual tag chips with remove buttons
   - Hidden field generation for form submission
   - Max 10 hashtags validation

### What's Missing ❌

1. **Turbo Stream responses in GifsController**
   - No `respond_to` blocks in `update` action
   - No multi-format support (only HTML redirect)

2. **Inline editing support** (optional enhancement)
   - No Turbo Frame wrapper in show page
   - No inline edit form partial

---

## Implementation Tasks

### Task 2.1: Add Turbo Stream Support to GifsController

**File:** `app/controllers/gifs_controller.rb`

**Changes Required:**

1. Include `ActionView::RecordIdentifier` module for `dom_id` helper
2. Update `update` action with `respond_to` block
3. Add success/error Turbo Stream responses

**Implementation:**

```ruby
class GifsController < ApplicationController
  include ActionView::RecordIdentifier  # ADD THIS LINE

  before_action :authenticate_user!
  before_action :set_gif, only: [:show, :edit, :update, :destroy]
  before_action :authorize_user!, only: [:edit, :update, :destroy]

  # ... existing actions ...

  def update
    respond_to do |format|
      if @gif.update(gif_params)
        # Success - updated successfully
        format.turbo_stream do
          render turbo_stream: [
            # Replace GIF display with updated content
            turbo_stream.replace(
              dom_id(@gif),
              partial: "gifs/gif_display",
              locals: { gif: @gif.reload }
            ),
            # Optional: Show success flash message
            turbo_stream.prepend(
              "flash_messages",
              partial: "shared/flash",
              locals: { type: "notice", message: "GIF updated successfully!" }
            )
          ]
        end
        format.html { redirect_to @gif, notice: "GIF updated successfully!" }
      else
        # Error - validation failed
        format.turbo_stream do
          render turbo_stream: turbo_stream.replace(
            dom_id(@gif, :edit),
            partial: "gifs/form",
            locals: { gif: @gif }
          ), status: :unprocessable_entity
        end
        format.html { render :edit, status: :unprocessable_entity }
      end
    end
  end

  private

  def gif_params
    params.require(:gif).permit(
      :title,
      :description,
      :youtube_video_url,
      :youtube_timestamp_start,
      :youtube_timestamp_end,
      :duration,
      :privacy,
      :file,
      hashtag_names: []
    )
  end

  def set_gif
    @gif = Gif.find(params[:id])
  end

  def authorize_user!
    redirect_to root_path, alert: "Not authorized" unless current_user == @gif.user
  end
end
```

**Time Estimate:** 15 minutes

---

### Task 2.2: Create GIF Display Partial (for Turbo Stream replacement)

**File:** `app/views/gifs/_gif_display.html.erb` (NEW FILE)

**Purpose:** Renders the updated GIF metadata after successful edit

**Implementation:**

```erb
<div id="<%= dom_id(gif) %>" class="space-y-4">
  <!-- Title -->
  <% if gif.title.present? %>
    <h1 class="text-3xl font-bold text-gray-900"><%= gif.title %></h1>
  <% end %>

  <!-- Description -->
  <% if gif.description.present? %>
    <p class="text-gray-700 whitespace-pre-line"><%= gif.description %></p>
  <% end %>

  <!-- Hashtags -->
  <% if gif.hashtags.any? %>
    <div class="flex flex-wrap gap-2">
      <% gif.hashtags.each do |hashtag| %>
        <%= link_to hashtag_path(hashtag.name),
            class: "inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm hover:bg-indigo-200 transition-colors" do %>
          #<%= hashtag.name %>
        <% end %>
      <% end %>
    </div>
  <% end %>

  <!-- Privacy Badge -->
  <div class="flex items-center space-x-2 text-sm text-gray-600">
    <% if gif.privacy_public_access? %>
      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM8 11a1 1 0 112 0v2a1 1 0 11-2 0v-2zm1-5a1 1 0 011 1v2a1 1 0 11-2 0V7a1 1 0 011-1z"/>
        </svg>
        Public
      </span>
    <% elsif gif.privacy_unlisted? %>
      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
        </svg>
        Unlisted
      </span>
    <% else %>
      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
        </svg>
        Private
      </span>
    <% end %>
  </div>

  <!-- Edit Button (if owner) -->
  <% if user_signed_in? && current_user == gif.user %>
    <div class="flex space-x-3">
      <%= link_to "Edit GIF",
          edit_gif_path(gif),
          class: "inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors" %>
    </div>
  <% end %>
</div>
```

**Time Estimate:** 15 minutes

---

### Task 2.3: Update GIF Show Page (Optional - for inline editing)

**File:** `app/views/gifs/show.html.erb`

**Changes:** Wrap GIF metadata section in Turbo Frame

**Find this section** (around lines 110-130):

```erb
<!-- Current code -->
<h1 class="text-3xl font-bold text-gray-900"><%= @gif.title %></h1>
<p class="text-gray-700"><%= @gif.description %></p>
<!-- hashtags, etc. -->
```

**Replace with:**

```erb
<%= turbo_frame_tag dom_id(@gif) do %>
  <%= render "gif_display", gif: @gif %>
<% end %>
```

**Time Estimate:** 5 minutes (optional)

---

### Task 2.4: Add Flash Message Partial (Optional)

**File:** `app/views/shared/_flash.html.erb` (if doesn't exist)

**Implementation:**

```erb
<div id="flash_messages" class="fixed top-4 right-4 z-50">
  <div class="bg-<%= type == 'notice' ? 'green' : 'red' %>-50 border-l-4 border-<%= type == 'notice' ? 'green' : 'red' %>-500 p-4 rounded shadow-lg animate-slide-in">
    <div class="flex items-center">
      <svg class="w-5 h-5 mr-2 text-<%= type == 'notice' ? 'green' : 'red' %>-500" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
      </svg>
      <p class="text-<%= type == 'notice' ? 'green' : 'red' %>-700 font-medium"><%= message %></p>
    </div>
  </div>
</div>
```

**Time Estimate:** 10 minutes (optional)

---

## Testing Plan

### Manual Testing Checklist

1. **Edit GIF via /gifs/:id/edit page**
   - [ ] Form loads with existing values
   - [ ] Title can be edited
   - [ ] Description can be edited
   - [ ] Hashtags display correctly (visual chips)
   - [ ] Can add new hashtags via autocomplete
   - [ ] Can remove existing hashtags
   - [ ] Privacy can be changed
   - [ ] Submit updates GIF successfully
   - [ ] Redirects to GIF show page with success message
   - [ ] All changes are persisted

2. **Form Validation**
   - [ ] Empty title is allowed (optional field)
   - [ ] Title over 100 chars shows error
   - [ ] Description over 2000 chars shows error
   - [ ] Invalid hashtag format shows validation
   - [ ] More than 10 hashtags prevented

3. **Hashtag Autocomplete**
   - [ ] Typing shows suggestions
   - [ ] Click suggestion adds hashtag
   - [ ] Trending hashtags shown on focus
   - [ ] Keyboard navigation works (arrows, enter, escape)
   - [ ] Comma/space adds hashtag
   - [ ] Backspace removes last hashtag

4. **Turbo Stream Updates** (if Task 2.3 implemented)
   - [ ] Inline edit updates content without page reload
   - [ ] Success message appears and auto-dismisses
   - [ ] Validation errors show in form
   - [ ] Cancel returns to display view

5. **Authorization**
   - [ ] Non-owner cannot access edit page
   - [ ] Non-owner cannot submit update
   - [ ] Guests redirected to sign in

6. **Privacy Changes**
   - [ ] Public → Unlisted works
   - [ ] Unlisted → Private works
   - [ ] Privacy changes reflected immediately
   - [ ] GIF visibility in feed matches privacy setting

### Automated Testing

**Add to `test/controllers/gifs_controller_test.rb`:**

```ruby
class GifsControllerTest < ActionDispatch::IntegrationTest
  fixtures :users, :gifs

  setup do
    @user = users(:one)
    @gif = gifs(:alice_public_gif)
  end

  # EDIT ACTION TESTS
  test "should require authentication to edit gif" do
    get edit_gif_path(@gif)
    assert_redirected_to new_user_session_path
  end

  test "should allow owner to edit their gif" do
    sign_in @user
    get edit_gif_path(@gif)
    assert_response :success
  end

  test "should not allow non-owner to edit gif" do
    other_user = users(:two)
    sign_in other_user
    get edit_gif_path(@gif)
    assert_redirected_to root_path
  end

  # UPDATE ACTION TESTS
  test "should update gif with valid params" do
    sign_in @user
    new_title = "Updated Title"

    patch gif_path(@gif), params: {
      gif: { title: new_title, description: "New description" }
    }

    assert_redirected_to @gif
    assert_equal new_title, @gif.reload.title
  end

  test "should update hashtags" do
    sign_in @user

    patch gif_path(@gif), params: {
      gif: { hashtag_names: ["new", "tags", "here"] }
    }

    assert_equal ["new", "tags", "here"], @gif.reload.hashtag_names.sort
  end

  test "should update privacy" do
    sign_in @user

    patch gif_path(@gif), params: {
      gif: { privacy: "unlisted" }
    }

    assert @gif.reload.privacy_unlisted?
  end

  test "should render turbo stream on successful update" do
    sign_in @user

    patch gif_path(@gif), params: {
      gif: { title: "New Title" }
    }, as: :turbo_stream

    assert_response :success
    assert_match /turbo-stream/, response.body
  end

  test "should handle validation errors" do
    sign_in @user

    patch gif_path(@gif), params: {
      gif: { title: "A" * 101 } # Over 100 char limit
    }

    assert_response :unprocessable_entity
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

### Phase 1: Core Functionality (30-40 minutes)
1. ✅ Task 2.1: Add Turbo Stream support to controller
2. ✅ Task 2.2: Create GIF display partial
3. ✅ Manual test edit form functionality

### Phase 2: Testing (30 minutes)
4. ✅ Write automated tests
5. ✅ Run test suite and fix any issues

### Phase 3: Optional Enhancements (20 minutes)
6. Task 2.3: Add inline editing to show page
7. Task 2.4: Add flash message partial
8. Polish UI/UX (loading states, animations)

---

## Files to Create/Modify

### Create:
- `app/views/gifs/_gif_display.html.erb` - GIF metadata display partial
- `app/views/shared/_flash.html.erb` - Flash message partial (optional)

### Modify:
- `app/controllers/gifs_controller.rb` - Add Turbo Stream support
- `app/views/gifs/show.html.erb` - Wrap in Turbo Frame (optional)
- `test/controllers/gifs_controller_test.rb` - Add comprehensive tests

### Already Exist (No Changes Needed):
- `app/views/gifs/_form.html.erb` - Complete form with all features
- `app/views/gifs/edit.html.erb` - Edit page wrapper
- `app/models/gif.rb` - Model with validations
- `app/javascript/controllers/gif_form_controller.js` - Form behavior
- `app/javascript/controllers/hashtag_input_controller.js` - Autocomplete

---

## Success Criteria

✅ Users can edit GIF title, description, hashtags, and privacy
✅ Form validation works correctly
✅ Hashtag autocomplete functions properly
✅ Turbo Stream updates work without page reload
✅ Authorization prevents non-owners from editing
✅ All tests pass
✅ Changes persist to database
✅ UI provides clear feedback on success/error

---

## Notes

- **YouTube fields cannot be edited** - This is intentional as the GIF file is generated from these timestamps
- **File upload is disabled** - GIFs are created via browser extension, not via web upload
- **Privacy changes are immediate** - No cascade effects, safe to change anytime
- **Hashtag system is fully functional** - No additional work needed
- **Form is already responsive** - Works on mobile, tablet, desktop

---

## Risk Assessment

**Low Risk** - This task is straightforward because:
- Form and model are already complete
- Just adding Turbo Stream responses (proven pattern from CommentsController)
- No new features, just improving existing functionality
- Comprehensive test coverage will catch issues

**Time Estimate:** 1-1.5 hours total
- Implementation: 30-40 min
- Testing: 30 min
- Polish: 20 min (optional)
