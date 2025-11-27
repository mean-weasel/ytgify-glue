# Phase 2.2: Social Interactions - Comments e2e Tests - Implementation Plan

**Status:** 🟡 Ready to Implement
**Estimated Duration:** 60 minutes
**Prerequisites:** Phase 1.2 Authentication Complete, Phase 2.1 Likes Complete

## Overview

Implement comprehensive end-to-end tests for the comments feature using Playwright. This covers the critical comment interaction flows: creating comments, real-time Turbo Stream updates, editing/deleting own comments, and authorization controls.

Comments are a core social feature in YTGify, allowing users to interact with GIF creators and other viewers. The system supports nested replies, soft deletes, real-time updates via Turbo Streams, and proper authorization controls.

## Goals

- Verify comment creation works correctly
- Test Turbo Stream real-time updates (comment appears immediately without page reload)
- Confirm edit/delete functionality for comment owners
- Validate authorization (cannot edit/delete others' comments)
- Test authentication requirements (must be signed in)
- Verify form validation (empty comments rejected)
- Ensure comment counts update correctly
- Test GIF owner can delete any comment on their GIF

## Test Scenarios

### 1. Comment Creation (3 tests)
- ✅ Signed-in user can create a comment on a GIF
- ✅ Comment appears immediately via Turbo Stream (no page reload)
- ✅ Comment count updates in real-time

### 2. Comment Validation (2 tests)
- ✅ Empty comment cannot be submitted
- ✅ Error message displays for invalid comment

### 3. Authentication Requirements (2 tests)
- ✅ Non-signed-in users see "Sign in to comment" message
- ✅ Non-signed-in users cannot submit comments

### 4. Comment Editing (3 tests)
- ✅ User can edit their own comment
- ✅ Edited comment updates immediately via Turbo Stream
- ✅ Cannot see edit button on others' comments

### 5. Comment Deletion (4 tests)
- ✅ User can delete their own comment
- ✅ Comment disappears immediately via Turbo Stream
- ✅ Comment count decrements after deletion
- ✅ Cannot see delete button on others' comments

### 6. GIF Owner Privileges (2 tests)
- ✅ GIF owner can delete any comment on their GIF
- ✅ Regular user cannot delete comments on others' GIFs

**Total Tests:** 16 new tests

## Implementation Steps

### Step 1: Create Comments Test File (10 min)

Create `test/system/comments_test.rb`:

```ruby
require "application_system_test_case"

class CommentsTest < ApplicationSystemTestCase
  setup do
    @user = users(:one)  # alice
    @other_user = users(:two)  # bob
    @gif = gifs(:alice_public_gif)
    @other_gif = gifs(:bob_public_gif)
  end

  # ========== COMMENT CREATION TESTS ==========

  test "signed in user can create a comment on a GIF" do
    sign_in_as @user

    visit gif_path(@gif)

    # Fill in comment form
    @page.fill('textarea[name="comment[content]"]', 'This is a great GIF!')

    # Submit the comment
    @page.click('input[type="submit"][value="Post Comment"]')

    # Wait for Turbo Stream to update
    sleep 0.5

    # Comment should appear on the page
    assert_page_has_text "This is a great GIF!"
    assert_page_has_text @user.display_name

    # Verify comment was saved to database
    comment = Comment.find_by(content: "This is a great GIF!")
    assert_not_nil comment
    assert_equal @user.id, comment.user_id
    assert_equal @gif.id, comment.gif_id

    take_screenshot("comment-creation-success")
  end

  test "comment appears immediately via Turbo Stream without page reload" do
    sign_in_as @user

    visit gif_path(@gif)

    # Get initial comment count from page
    initial_count = @page.text_content("#comment_count_header_#{@gif.id}")

    # Post a comment
    @page.fill('textarea[name="comment[content]"]', 'Real-time test comment')
    @page.click('input[type="submit"][value="Post Comment"]')

    # Wait for Turbo Stream
    sleep 0.5

    # Comment should appear without reload
    assert_page_has_text "Real-time test comment"

    # URL should not have changed (no page reload)
    assert @page.url.end_with?(gif_path(@gif))

    # Comment form should be cleared
    textarea_value = @page.evaluate('document.querySelector("textarea[name=\'comment[content]\']").value')
    assert_equal "", textarea_value

    take_screenshot("comment-turbo-stream-update")
  end

  test "comment count updates in real-time after posting" do
    sign_in_as @user

    visit gif_path(@gif)

    # Get initial count
    initial_count_text = @page.text_content("#comment_count_header_#{@gif.id}")
    initial_count = initial_count_text.match(/\((\d+)\)/)[1].to_i

    # Post a comment
    @page.fill('textarea[name="comment[content]"]', 'Testing count update')
    @page.click('input[type="submit"][value="Post Comment"]')

    # Wait for Turbo Stream
    sleep 0.5

    # Count should have incremented
    new_count_text = @page.text_content("#comment_count_header_#{@gif.id}")
    new_count = new_count_text.match(/\((\d+)\)/)[1].to_i

    assert_equal initial_count + 1, new_count

    take_screenshot("comment-count-update")
  end

  # ========== VALIDATION TESTS ==========

  test "cannot submit empty comment" do
    sign_in_as @user

    visit gif_path(@gif)

    # Try to submit without content
    @page.click('input[type="submit"][value="Post Comment"]')

    # Wait for response
    sleep 0.5

    # Should show error message
    assert_page_has_text "can't be blank"

    # Comment should not be created
    assert_equal 0, Comment.where(user: @user, gif: @gif, content: "").count

    take_screenshot("comment-empty-validation")
  end

  test "displays error message for invalid comment" do
    sign_in_as @user

    visit gif_path(@gif)

    # Submit empty comment
    @page.click('input[type="submit"][value="Post Comment"]')

    sleep 0.5

    # Error should be visible in the form
    error_div = @page.query_selector('.bg-red-50')
    assert_not_nil error_div, "Error message container should be visible"

    assert_page_has_text "Content can't be blank"

    take_screenshot("comment-validation-error")
  end

  # ========== AUTHENTICATION TESTS ==========

  test "non-signed-in users see sign in message" do
    visit gif_path(@gif)

    # Should see sign in prompt instead of comment form
    assert_page_has_text "Sign in to leave a comment"
    
    # Should have sign in link
    sign_in_link = @page.query_selector('a:has-text("Sign In")')
    assert_not_nil sign_in_link

    # Should not see comment form
    comment_textarea = @page.query_selector('textarea[name="comment[content]"]')
    assert_nil comment_textarea

    take_screenshot("comment-not-signed-in")
  end

  test "non-signed-in users cannot submit comments" do
    # Visit GIF page without signing in
    visit gif_path(@gif)

    # Verify no comment form exists
    comment_form = @page.query_selector('form[action*="/comments"]')
    assert_nil comment_form, "Comment form should not exist for non-signed-in users"

    take_screenshot("comment-no-form-anonymous")
  end

  # ========== EDIT TESTS ==========

  test "user can edit their own comment" do
    sign_in_as @user

    # Create a comment first
    visit gif_path(@gif)
    @page.fill('textarea[name="comment[content]"]', 'Original comment text')
    @page.click('input[type="submit"][value="Post Comment"]')
    sleep 0.5

    # Find and click Edit link
    edit_link = @page.query_selector('a:has-text("Edit")')
    assert_not_nil edit_link, "Edit link should be visible for own comment"
    
    edit_link.click
    sleep 0.5

    # Edit form should appear
    edit_textarea = @page.query_selector('textarea[name="comment[content]"]')
    assert_not_nil edit_textarea

    # Update the comment
    edit_textarea.fill('Updated comment text')
    @page.click('input[type="submit"][value="Save"]')
    sleep 0.5

    # Updated text should be visible
    assert_page_has_text "Updated comment text"
    assert_page_missing_text "Original comment text"

    take_screenshot("comment-edit-success")
  end

  test "edited comment updates immediately via Turbo Stream" do
    sign_in_as @user

    # Create a comment
    visit gif_path(@gif)
    @page.fill('textarea[name="comment[content]"]', 'Before edit')
    @page.click('input[type="submit"][value="Post Comment"]')
    sleep 0.5

    # Edit it
    @page.click('a:has-text("Edit")')
    sleep 0.3
    
    @page.fill('textarea[name="comment[content]"]', 'After edit')
    @page.click('input[type="submit"][value="Save"]')
    sleep 0.5

    # Should update without page reload
    assert_page_has_text "After edit"
    assert @page.url.end_with?(gif_path(@gif))

    take_screenshot("comment-edit-turbo-stream")
  end

  test "cannot see edit button on others comments" do
    # Create a comment as user
    comment = Comment.create!(
      user: @user,
      gif: @gif,
      content: "Alice's comment"
    )

    # Sign in as different user
    sign_in_as @other_user

    visit gif_path(@gif)

    # Should see the comment but not Edit link
    assert_page_has_text "Alice's comment"
    
    # Edit link should not be present
    edit_links = @page.query_selector_all('a:has-text("Edit")')
    # Filter to only edit links for this specific comment
    comment_div = @page.query_selector("#comment_#{comment.id}")
    if comment_div
      edit_in_comment = comment_div.query_selector('a:has-text("Edit")')
      assert_nil edit_in_comment, "Edit link should not appear for other user's comment"
    end

    take_screenshot("comment-no-edit-others")
  end

  # ========== DELETE TESTS ==========

  test "user can delete their own comment" do
    sign_in_as @user

    # Create a comment
    visit gif_path(@gif)
    @page.fill('textarea[name="comment[content]"]', 'Comment to delete')
    @page.click('input[type="submit"][value="Post Comment"]')
    sleep 0.5

    # Confirm comment is visible
    assert_page_has_text "Comment to delete"

    # Handle confirmation dialog and click delete
    @page.once('dialog', ->(dialog) { dialog.accept })
    @page.click('button:has-text("Delete")')
    sleep 0.5

    # Comment should disappear
    assert_page_missing_text "Comment to delete"

    # Verify soft delete in database
    comment = Comment.find_by(content: '[deleted]', user: @user)
    assert_not_nil comment
    assert_not_nil comment.deleted_at

    take_screenshot("comment-delete-success")
  end

  test "comment disappears immediately via Turbo Stream after deletion" do
    sign_in_as @user

    visit gif_path(@gif)
    
    # Create comment
    @page.fill('textarea[name="comment[content]"]', 'Will disappear')
    @page.click('input[type="submit"][value="Post Comment"]')
    sleep 0.5

    # Delete it
    @page.once('dialog', ->(dialog) { dialog.accept })
    @page.click('button:has-text("Delete")')
    sleep 0.5

    # Should disappear without page reload
    assert_page_missing_text "Will disappear"
    assert @page.url.end_with?(gif_path(@gif))

    take_screenshot("comment-delete-turbo-stream")
  end

  test "comment count decrements after deletion" do
    sign_in_as @user

    visit gif_path(@gif)

    # Get initial count
    initial_count_text = @page.text_content("#comment_count_header_#{@gif.id}")
    initial_count = initial_count_text.match(/\((\d+)\)/)[1].to_i

    # Create a comment
    @page.fill('textarea[name="comment[content]"]', 'Temporary comment')
    @page.click('input[type="submit"][value="Post Comment"]')
    sleep 0.5

    # Count should have increased
    count_after_create = @page.text_content("#comment_count_header_#{@gif.id}").match(/\((\d+)\)/)[1].to_i
    assert_equal initial_count + 1, count_after_create

    # Delete the comment
    @page.once('dialog', ->(dialog) { dialog.accept })
    @page.click('button:has-text("Delete")')
    sleep 0.5

    # Count should be back to initial
    final_count = @page.text_content("#comment_count_header_#{@gif.id}").match(/\((\d+)\)/)[1].to_i
    assert_equal initial_count, final_count

    take_screenshot("comment-count-after-delete")
  end

  test "cannot see delete button on others comments" do
    # Create a comment as alice
    comment = Comment.create!(
      user: @user,
      gif: @gif,
      content: "Alice's permanent comment"
    )

    # Sign in as bob
    sign_in_as @other_user

    visit gif_path(@gif)

    # Should see the comment
    assert_page_has_text "Alice's permanent comment"

    # But should not see Delete button for it
    # (Bob is not the comment owner, and not the GIF owner since it's Alice's GIF)
    comment_div = @page.query_selector("#comment_#{comment.id}")
    if comment_div
      delete_button = comment_div.query_selector('button:has-text("Delete")')
      assert_nil delete_button, "Delete button should not appear for other user's comment"
    end

    take_screenshot("comment-no-delete-others")
  end

  # ========== GIF OWNER PRIVILEGES TESTS ==========

  test "GIF owner can delete any comment on their GIF" do
    # Create a comment by other_user on user's GIF
    comment = Comment.create!(
      user: @other_user,
      gif: @gif,  # alice's GIF
      content: "Bob's comment on Alice's GIF"
    )

    # Sign in as GIF owner (alice)
    sign_in_as @user

    visit gif_path(@gif)

    # Should see the comment and Delete button
    assert_page_has_text "Bob's comment on Alice's GIF"
    
    delete_button = @page.query_selector('button:has-text("Delete")')
    assert_not_nil delete_button, "GIF owner should see delete button on others' comments"

    # Delete the comment
    @page.once('dialog', ->(dialog) { dialog.accept })
    delete_button.click
    sleep 0.5

    # Comment should be deleted
    assert_page_missing_text "Bob's comment on Alice's GIF"

    take_screenshot("comment-gif-owner-delete")
  end

  test "regular user cannot delete comments on others GIFs" do
    # Create a comment by alice on bob's GIF
    comment = Comment.create!(
      user: @user,  # alice
      gif: @other_gif,  # bob's GIF
      content: "Alice's comment on Bob's GIF"
    )

    # Also create another user's comment
    third_comment = Comment.create!(
      user: users(:three) || @other_user,
      gif: @other_gif,
      content: "Someone else's comment"
    )

    # Sign in as alice
    sign_in_as @user

    visit gif_path(@other_gif)

    # Should see own comment with delete button
    assert_page_has_text "Alice's comment on Bob's GIF"
    
    # But for the other comment, should not see delete
    comment_div = @page.query_selector("#comment_#{third_comment.id}")
    if comment_div
      delete_button = comment_div.query_selector('button:has-text("Delete")')
      assert_nil delete_button, "Should not see delete button on others' comments when not GIF owner"
    end

    take_screenshot("comment-no-delete-not-owner")
  end
end
```

### Step 2: Verify Comment Routes and Views (5 min)

Check that comment routes are properly configured:

```bash
# Verify comment routes exist
bin/rails routes | grep comments

# Should see:
# gif_comments POST   /gifs/:gif_id/comments(.:format)          comments#create
# edit_comment GET    /comments/:id/edit(.:format)              comments#edit
# comment      PATCH  /comments/:id(.:format)                   comments#update
#              DELETE /comments/:id(.:format)                   comments#destroy
```

Verify comment views exist:

```bash
ls app/views/comments/_form.html.erb
ls app/views/comments/_comment.html.erb
ls app/views/comments/_edit_form.html.erb
ls app/views/comments/_count.html.erb
```

### Step 3: Update Fixtures (if needed) (5 min)

Ensure test fixtures support the tests. Check `test/fixtures/users.yml`:

```yaml
one:  # alice
  username: alice
  email: alice@example.com
  display_name: Alice
  # ...

two:  # bob
  username: bob
  email: bob@example.com
  display_name: Bob
  # ...
```

Check `test/fixtures/gifs.yml`:

```yaml
alice_public_gif:
  user: one  # alice
  title: "Alice's Public GIF"
  privacy: public_access
  comment_count: 0  # Will increment during tests
  # ...

bob_public_gif:
  user: two  # bob
  title: "Bob's Public GIF"
  privacy: public_access
  comment_count: 0
  # ...
```

### Step 4: Run Comments Tests (10 min)

```bash
# Run all comment tests
bin/rails test test/system/comments_test.rb

# Or run individual test groups
bin/rails test test/system/comments_test.rb -n /creation/
bin/rails test test/system/comments_test.rb -n /validation/
bin/rails test test/system/comments_test.rb -n /edit/
bin/rails test test/system/comments_test.rb -n /delete/
```

**Expected Output:**
```
Running 16 tests in a single process
................

Finished in 25-35s
16 runs, ~45 assertions, 0 failures, 0 errors, 0 skips
```

### Step 5: Review Screenshots (5 min)

Check `tmp/screenshots/` for screenshots from each test:

```bash
ls tmp/screenshots/*comment*
```

Expected screenshots:
- `comment-creation-success-*.png`
- `comment-turbo-stream-update-*.png`
- `comment-count-update-*.png`
- `comment-empty-validation-*.png`
- `comment-validation-error-*.png`
- `comment-not-signed-in-*.png`
- `comment-no-form-anonymous-*.png`
- `comment-edit-success-*.png`
- `comment-edit-turbo-stream-*.png`
- `comment-no-edit-others-*.png`
- `comment-delete-success-*.png`
- `comment-delete-turbo-stream-*.png`
- `comment-count-after-delete-*.png`
- `comment-no-delete-others-*.png`
- `comment-gif-owner-delete-*.png`
- `comment-no-delete-not-owner-*.png`

Verify each screenshot shows the expected state.

### Step 6: Troubleshooting (20 min buffer)

#### Issue 1: Turbo Stream Updates Not Appearing

**Symptom:** Comment doesn't appear after submission, or appears after page reload only.

**Root Cause:** Turbo Streams require proper frame/stream setup and may need wait time.

**Solutions:**

1. **Increase wait time after submit:**
```ruby
@page.click('input[type="submit"][value="Post Comment"]')
sleep 1  # Increase from 0.5 to 1 second
```

2. **Wait for specific element:**
```ruby
@page.click('input[type="submit"][value="Post Comment"]')
@page.wait_for_selector('text="Your comment text"', timeout: 3000)
```

3. **Check Turbo Stream response:**
```ruby
# In controller test, verify Turbo Stream format
assert_response :success
assert_equal "text/vnd.turbo-stream.html", response.media_type
```

4. **Verify turbo_frame tags:**
```erb
<!-- In app/views/gifs/show.html.erb -->
<%= turbo_frame_tag "new_comment" do %>
  <%= render "comments/form", gif: @gif, comment: nil %>
<% end %>

<%= turbo_frame_tag "comments", class: "space-y-6" do %>
  <%= render partial: "comments/comment", collection: @comments %>
<% end %>
```

#### Issue 2: Comment Count Not Updating

**Symptom:** Comment count stays the same after create/delete.

**Solutions:**

1. **Check counter_cache configuration:**
```ruby
# app/models/comment.rb
belongs_to :gif, counter_cache: :comment_count, touch: true
```

2. **Verify GIF reload in controller:**
```ruby
# app/controllers/comments_controller.rb
turbo_stream.replace(
  "comment_count_#{@gif.id}",
  partial: "comments/count",
  locals: { gif: @gif.reload }  # Important: reload!
)
```

3. **Reset counter cache if out of sync:**
```ruby
# In Rails console or migration
Gif.find_each { |g| Gif.reset_counters(g.id, :comments) }
```

#### Issue 3: Edit/Delete Buttons Not Visible

**Symptom:** Can't find Edit or Delete buttons even for own comments.

**Solutions:**

1. **Check authorization logic:**
```erb
<!-- app/views/comments/_comment.html.erb -->
<% if user_signed_in? && current_user == comment.user %>
  <%= link_to "Edit", edit_comment_path(comment), ... %>
<% end %>

<% if user_signed_in? && (current_user == comment.user || current_user == comment.gif.user) %>
  <%= button_to comment_path(comment), method: :delete, ... %>
<% end %>
```

2. **Use more specific selectors:**
```ruby
# Instead of generic button search
comment_div = @page.query_selector("#comment_#{comment.id}")
delete_button = comment_div.query_selector('button:has-text("Delete")')
```

3. **Take debug screenshot:**
```ruby
visit gif_path(@gif)
take_screenshot("debug-comment-buttons")
# Inspect screenshot to see what's actually rendered
```

#### Issue 4: Confirm Dialog Not Working

**Symptom:** `Playwright::TimeoutError` when trying to delete comment.

**Solutions:**

1. **Set up dialog handler before clicking:**
```ruby
# Correct order:
@page.once('dialog', ->(dialog) { dialog.accept })
@page.click('button:has-text("Delete")')  # This triggers the dialog
```

2. **Check data-turbo-confirm attribute:**
```erb
<%= button_to comment_path(comment),
    method: :delete,
    form: { data: { turbo_confirm: "Are you sure?" } },
    ... %>
```

3. **Alternative: Use Playwright's expect API:**
```ruby
@page.expect_dialog do
  @page.click('button:has-text("Delete")')
end.accept
```

#### Issue 5: Fixtures Causing Test Pollution

**Symptom:** Tests fail due to existing fixture comments affecting counts.

**Solutions:**

1. **Use relative counts:**
```ruby
# Get count before action
initial_count = Comment.where(gif: @gif).not_deleted.count

# Perform action
# ...

# Assert relative change
assert_equal initial_count + 1, Comment.where(gif: @gif).not_deleted.count
```

2. **Clear relevant comments in setup:**
```ruby
setup do
  @user = users(:one)
  @gif = gifs(:alice_public_gif)
  
  # Clear existing comments for clean test
  Comment.where(gif: @gif).destroy_all
  @gif.update(comment_count: 0)
end
```

3. **Use unique test data:**
```ruby
# Create test-specific content that won't conflict
content = "Test comment #{SecureRandom.hex(4)}"
@page.fill('textarea[name="comment[content]"]', content)
```

#### Issue 6: Soft Delete Confusion

**Symptom:** Tests can't find deleted comments in database.

**Solution:**

Remember that comments are soft-deleted:

```ruby
# After deletion, comment still exists but is marked deleted
deleted_comment = Comment.find_by(content: '[deleted]')
assert_not_nil deleted_comment.deleted_at

# Use .not_deleted scope for active comments
active_comments = Comment.where(gif: @gif).not_deleted
```

#### Issue 7: Turbo Frame Navigation Issues

**Symptom:** Edit form doesn't appear, or causes full page reload.

**Solutions:**

1. **Verify turbo_frame_tag in edit link:**
```erb
<%= link_to "Edit",
    edit_comment_path(comment),
    data: { turbo_frame: dom_id(comment) },  # Important!
    class: "..." %>
```

2. **Ensure edit_form uses same frame:**
```erb
<!-- app/views/comments/_edit_form.html.erb -->
<%= turbo_frame_tag dom_id(comment) do %>
  <%= form_with model: comment, ... %>
<% end %>
```

3. **Check for frame breakout:**
```erb
<!-- In form, don't use turbo_frame: "_top" for edit -->
<%= form_with model: comment,
              data: { turbo_frame: dom_id(comment) },  # Stay in frame
              ... %>
```

## Verification Checklist

After completing all steps:

- [ ] All 16 tests passing (0 failures, 0 errors)
- [ ] 16 screenshots generated (no failure-* screenshots)
- [ ] Comment creation works and appears immediately
- [ ] Comment counts update in real-time
- [ ] Validation errors display correctly
- [ ] Non-signed-in users see sign-in prompt
- [ ] Edit functionality works with Turbo Streams
- [ ] Delete functionality works with Turbo Streams
- [ ] Authorization properly enforced (own comments only)
- [ ] GIF owners can delete any comment on their GIF
- [ ] Comment form clears after successful post
- [ ] Turbo Streams work without page reload
- [ ] Soft delete preserves data in database
- [ ] Counter caches update correctly

## Expected Test Coverage

**Before:** 3 system tests (smoke tests) + 11 auth tests = 14 tests
**After:** 14 + 16 comments tests = 30 system tests

**Total Assertions:** ~45 assertions for comments

## File Structure

```
test/
├── application_system_test_case.rb
├── system/
│   ├── smoke_test.rb (3 tests)
│   ├── authentication_test.rb (11 tests)
│   └── comments_test.rb (16 tests) ← NEW
└── fixtures/
    ├── users.yml
    ├── gifs.yml
    └── comments.yml
```

## Success Criteria

✅ All 16 comment tests pass
✅ Screenshots show correct UI states
✅ Turbo Streams update without page reload
✅ Comment creation/edit/delete work correctly
✅ Authorization enforced properly
✅ GIF owner privileges work
✅ Comment counts update in real-time
✅ Form validation displays errors
✅ Tests run in ~25-35 seconds
✅ No test pollution from fixtures

## Next Steps After Completion

Once Phase 2.2 is complete, proceed to:

**Phase 2.3: Social Interactions - Follows (45-60 min)**
- Follow/unfollow user
- Follow button updates in real-time
- Follower count updates
- Cannot follow yourself
- Follow/unfollow from different locations (profile, GIF page)

## Time Breakdown

- Step 1: Create test file - 10 min
- Step 2: Verify routes/views - 5 min
- Step 3: Update fixtures - 5 min
- Step 4: Run tests - 10 min
- Step 5: Review screenshots - 5 min
- Step 6: Troubleshooting buffer - 20 min

**Total: 55-60 minutes**

## Commands Quick Reference

```bash
# Run all comment tests
bin/rails test test/system/comments_test.rb

# Run specific test
bin/rails test test/system/comments_test.rb -n test_signed_in_user_can_create_a_comment_on_a_GIF

# Run test pattern
bin/rails test test/system/comments_test.rb -n /creation/
bin/rails test test/system/comments_test.rb -n /edit/
bin/rails test test/system/comments_test.rb -n /delete/

# Check comment routes
bin/rails routes | grep comments

# Reset comment counter cache
bin/rails runner "Gif.find_each { |g| Gif.reset_counters(g.id, :comments) }"

# View screenshots
open tmp/screenshots/

# Clean old screenshots
rm tmp/screenshots/*comment*

# Check comment model validations
bin/rails console
> Comment.validators
```

## Turbo Stream Testing Tips

### Understanding Turbo Streams

Turbo Streams allow server-sent updates to specific parts of the page without full reload. Key concepts:

1. **Stream Targets**: Use IDs to target specific DOM elements
2. **Stream Actions**: `append`, `prepend`, `replace`, `remove`, `update`
3. **Response Format**: `text/vnd.turbo-stream.html`

### Testing Turbo Stream Updates

```ruby
# 1. Perform action that triggers Turbo Stream
@page.click('input[type="submit"]')

# 2. Wait for Turbo to process
sleep 0.5  # Or use wait_for_selector

# 3. Assert the change occurred
assert_page_has_text "Expected text"

# 4. Verify URL didn't change (no page reload)
assert @page.url.end_with?(expected_path)
```

### Common Turbo Stream Patterns

```ruby
# Pattern 1: Prepend new item to list
turbo_stream.prepend("comments", partial: "comments/comment", locals: { comment: @comment })

# Pattern 2: Replace item in place
turbo_stream.replace(dom_id(@comment), partial: "comments/comment", locals: { comment: @comment })

# Pattern 3: Remove item from list
turbo_stream.remove(@comment)

# Pattern 4: Update counter
turbo_stream.replace("comment_count_#{@gif.id}", html: "<span>#{@gif.comment_count}</span>")

# Pattern 5: Multiple streams at once
render turbo_stream: [
  turbo_stream.prepend("comments", ...),
  turbo_stream.replace("comment_count", ...)
]
```

### Debugging Turbo Streams

```ruby
# In test, check if Turbo Stream was sent
# (This requires controller test, not system test)
assert_response :success
assert_equal "text/vnd.turbo-stream.html", response.media_type

# In browser console (manual testing):
document.addEventListener('turbo:before-stream-render', (event) => {
  console.log('Turbo Stream:', event.detail.newStream.outerHTML)
})

# Check Rails logs for Turbo Stream rendering
# tail -f log/test.log | grep "turbo_stream"
```

## Notes

- Tests use `password123` as standard test password (matches fixture configuration)
- All tests use fixtures from `users.yml` and `gifs.yml`
- Comment creation tests create new comments with unique content
- `sleep 0.5` allows Turbo Streams to process (may need adjustment)
- Soft delete means comments persist in DB with `deleted_at` set and content '[deleted]'
- Counter caches must be properly configured for accurate counts
- GIF owners have special delete privileges on all comments on their GIFs
- Form selectors use `textarea[name="comment[content]"]` pattern
- Button selectors use `:has-text()` pseudo-selector from Playwright
- Screenshots are essential for debugging selector and Turbo Stream issues
- Dialog handlers must be set up BEFORE clicking the button that triggers them
