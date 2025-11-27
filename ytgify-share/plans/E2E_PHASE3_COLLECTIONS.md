# Phase 3: Collections Management Tests - Implementation Plan

**Status:** 🟡 Ready to Implement
**Estimated Duration:** 60-75 minutes
**Prerequisites:** Phase 1.1 & 1.2 Complete ✅

## Overview

Implement comprehensive end-to-end tests for collections management using Playwright. Collections are user-created playlists of GIFs that can be public or private. This phase covers creating, editing, deleting collections, and managing GIFs within collections.

## Goals

- Verify collection creation with valid/invalid data
- Test collection editing and deletion flows
- Confirm GIF add/remove functionality works correctly
- Validate privacy settings (public vs private)
- Ensure proper authorization (only owners can edit)
- Test viewing collections (own and others')
- Validate collection visibility based on privacy settings

## Test Scenarios

### 1. Collection Creation (4 tests)
- ✅ Create public collection successfully
- ✅ Create private collection successfully
- ✅ Creation fails with empty name
- ✅ Creation fails with duplicate name (same user)

### 2. Collection Editing (3 tests)
- ✅ Edit collection details (name, description)
- ✅ Toggle privacy setting (public ↔ private)
- ✅ Unauthorized user cannot edit collection

### 3. Collection Deletion (2 tests)
- ✅ Delete own collection successfully
- ✅ Confirm deletion with dialog

### 4. GIF Management (4 tests)
- ✅ Add GIF to collection
- ✅ Remove GIF from collection
- ✅ View collection with GIFs
- ✅ View empty collection state

### 5. Collection Viewing (4 tests)
- ✅ View own public collection
- ✅ View own private collection
- ✅ View another user's public collection
- ✅ Cannot view another user's private collection

### 6. Collections List (3 tests)
- ✅ View public collections index
- ✅ View own collections on profile
- ✅ Empty collections state

**Total Tests:** 20 new tests

## Implementation Steps

### Step 1: Create Collections Test File (10 min)

Create `test/system/collections_test.rb`:

```ruby
require "application_system_test_case"

class CollectionsTest < ApplicationSystemTestCase
  # ========== COLLECTION CREATION TESTS ==========

  test "user can create a public collection" do
    user = users(:e2e_test_user)
    sign_in_as(user)

    # Navigate to new collection page
    visit collections_path
    @page.click('a:has-text("Create Collection")')
    wait_for_page_load

    # Verify we're on the new collection page
    assert @page.url.include?("/collections/new")

    # Fill in collection form
    @page.fill('input[name="collection[name]"]', 'My Awesome Collection')
    @page.fill('textarea[name="collection[description]"]', 'A collection of my favorite GIFs')
    
    # Select public
    @page.check('input[name="collection[is_public]"][value="true"]')

    # Submit form
    @page.click('input[type="submit"][value="Create Collection"]')
    wait_for_page_load

    # Should redirect to collection show page
    assert_page_has_text "My Awesome Collection"
    assert_page_has_text "A collection of my favorite GIFs"
    assert_page_has_text "Collection created successfully!"

    # Verify collection was created
    collection = Collection.find_by(name: 'My Awesome Collection', user: user)
    assert_not_nil collection
    assert_equal true, collection.is_public

    take_screenshot("collections-create-public-success")
  end

  test "user can create a private collection" do
    user = users(:e2e_test_user)
    sign_in_as(user)

    visit new_collection_path

    # Fill in form
    @page.fill('input[name="collection[name]"]', 'Secret Stash')
    @page.fill('textarea[name="collection[description]"]', 'My private collection')
    
    # Select private
    @page.check('input[name="collection[is_public]"][value="false"]')

    @page.click('input[type="submit"][value="Create Collection"]')
    wait_for_page_load

    # Should show private badge
    assert_page_has_text "Secret Stash"
    assert_page_has_text "Private"

    # Verify collection was created
    collection = Collection.find_by(name: 'Secret Stash', user: user)
    assert_not_nil collection
    assert_equal false, collection.is_public

    take_screenshot("collections-create-private-success")
  end

  test "collection creation fails with empty name" do
    sign_in_as(users(:e2e_test_user))

    visit new_collection_path

    # Try to submit with empty name
    @page.fill('input[name="collection[name]"]', '')
    @page.fill('textarea[name="collection[description]"]', 'Description without name')
    @page.check('input[name="collection[is_public]"][value="true"]')

    @page.click('input[type="submit"][value="Create Collection"]')
    wait_for_page_load

    # Should show validation error
    assert_page_has_text "can't be blank"

    take_screenshot("collections-create-empty-name")
  end

  test "collection creation fails with duplicate name for same user" do
    user = users(:e2e_test_user)
    sign_in_as(user)

    # Create first collection
    Collection.create!(
      user: user,
      name: 'Duplicate Test',
      is_public: true
    )

    visit new_collection_path

    # Try to create collection with same name
    @page.fill('input[name="collection[name]"]', 'Duplicate Test')
    @page.fill('textarea[name="collection[description]"]', 'This should fail')
    @page.check('input[name="collection[is_public]"][value="true"]')

    @page.click('input[type="submit"][value="Create Collection"]')
    wait_for_page_load

    # Should show validation error
    assert_page_has_text "has already been taken"

    take_screenshot("collections-create-duplicate-name")
  end

  # ========== COLLECTION EDITING TESTS ==========

  test "user can edit their own collection" do
    user = users(:e2e_test_user)
    sign_in_as(user)

    # Create a collection to edit
    collection = Collection.create!(
      user: user,
      name: 'Original Name',
      description: 'Original description',
      is_public: true
    )

    # Visit collection page and click edit
    visit collection_path(collection)
    @page.click('a:has-text("Edit")')
    wait_for_page_load

    # Verify we're on edit page
    assert @page.url.include?("/collections/#{collection.id}/edit")

    # Update collection details
    @page.fill('input[name="collection[name]"]', 'Updated Name')
    @page.fill('textarea[name="collection[description]"]', 'Updated description')

    @page.click('input[type="submit"][value="Update Collection"]')
    wait_for_page_load

    # Should show updated details
    assert_page_has_text "Updated Name"
    assert_page_has_text "Updated description"
    assert_page_has_text "Collection updated successfully!"

    # Verify in database
    collection.reload
    assert_equal 'Updated Name', collection.name
    assert_equal 'Updated description', collection.description

    take_screenshot("collections-edit-success")
  end

  test "user can toggle collection privacy" do
    user = users(:e2e_test_user)
    sign_in_as(user)

    collection = Collection.create!(
      user: user,
      name: 'Privacy Test',
      is_public: true
    )

    # Edit collection
    visit edit_collection_path(collection)

    # Change to private
    @page.check('input[name="collection[is_public]"][value="false"]')
    @page.click('input[type="submit"][value="Update Collection"]')
    wait_for_page_load

    # Should show private badge
    assert_page_has_text "Private"

    # Verify in database
    collection.reload
    assert_equal false, collection.is_public

    take_screenshot("collections-toggle-privacy")
  end

  test "unauthorized user cannot edit another user's collection" do
    alice = users(:one)  # alice
    bob = users(:two)    # bob
    
    # Alice creates a collection
    collection = Collection.create!(
      user: alice,
      name: "Alice's Collection",
      is_public: true
    )

    # Bob signs in
    sign_in_as(bob)

    # Try to visit edit page
    visit edit_collection_path(collection)
    wait_for_page_load

    # Should be redirected and show error
    assert_page_has_text "not authorized"

    take_screenshot("collections-unauthorized-edit")
  end

  # ========== COLLECTION DELETION TESTS ==========

  test "user can delete their own collection" do
    user = users(:e2e_test_user)
    sign_in_as(user)

    collection = Collection.create!(
      user: user,
      name: 'To Be Deleted',
      is_public: true
    )

    # Visit collection page
    visit collection_path(collection)

    # Click delete button and accept confirmation
    @page.once('dialog', ->(dialog) { dialog.accept })
    @page.click('button:has-text("Delete")')
    wait_for_page_load

    # Should redirect and show success message
    assert_page_has_text "Collection deleted"

    # Verify collection was deleted
    assert_nil Collection.find_by(id: collection.id)

    take_screenshot("collections-delete-success")
  end

  test "collection deletion requires confirmation" do
    user = users(:e2e_test_user)
    sign_in_as(user)

    collection = Collection.create!(
      user: user,
      name: 'Delete with Confirm',
      is_public: true
    )

    visit collection_path(collection)

    # Dismiss confirmation dialog
    @page.once('dialog', ->(dialog) { 
      assert dialog.message.include?("Are you sure")
      dialog.dismiss 
    })
    @page.click('button:has-text("Delete")')
    wait_for_page_load

    # Collection should still exist
    assert_not_nil Collection.find_by(id: collection.id)

    take_screenshot("collections-delete-cancelled")
  end

  # ========== GIF MANAGEMENT TESTS ==========

  test "user can add GIF to collection" do
    user = users(:e2e_test_user)
    sign_in_as(user)

    collection = Collection.create!(
      user: user,
      name: 'GIF Collection',
      is_public: true
    )

    gif = gifs(:e2e_public_gif)

    # Visit GIF page
    visit gif_path(gif)
    wait_for_page_load

    # Click dropdown to add to collection
    # Note: This assumes there's a dropdown menu with "Add to Collection" option
    # Adjust selectors based on actual UI implementation
    @page.click('button[data-action*="dropdown#toggle"]')
    @page.click('a:has-text("Add to Collection")')
    wait_for_page_load

    # Select the collection
    @page.click("text=#{collection.name}")
    wait_for_page_load

    # Verify GIF was added
    assert collection.gifs.include?(gif)

    take_screenshot("collections-add-gif-success")
  end

  test "user can remove GIF from collection" do
    user = users(:e2e_test_user)
    sign_in_as(user)

    collection = Collection.create!(
      user: user,
      name: 'Remove Test',
      is_public: true
    )

    gif = gifs(:e2e_public_gif)
    collection.gifs << gif

    # Visit collection page
    visit collection_path(collection)
    wait_for_page_load

    # Should show the GIF
    assert_page_has_text gif.title

    # Click remove button (adjust selector based on actual implementation)
    # The show.html.erb shows remove button when show_remove_button is true
    @page.click("button:has-text('Remove')")
    wait_for_turbo

    # GIF should be removed (via Turbo Stream)
    sleep 0.5  # Brief wait for Turbo Stream to process
    
    # Verify GIF was removed from collection
    collection.reload
    assert_not collection.gifs.include?(gif)

    take_screenshot("collections-remove-gif-success")
  end

  test "view collection with GIFs" do
    collection = collections(:alice_public_collection)
    
    visit collection_path(collection)
    wait_for_page_load

    # Should show collection details
    assert_page_has_text collection.name
    assert_page_has_text collection.description

    # Should show GIF count
    assert_page_has_text "#{collection.gifs.count} GIF"

    # Should show the GIFs
    collection.gifs.each do |gif|
      assert_page_has_text gif.title
    end

    take_screenshot("collections-view-with-gifs")
  end

  test "view empty collection shows helpful message" do
    user = users(:e2e_test_user)
    sign_in_as(user)

    collection = Collection.create!(
      user: user,
      name: 'Empty Collection',
      is_public: true
    )

    visit collection_path(collection)
    wait_for_page_load

    # Should show empty state
    assert_page_has_text "No GIFs in this collection yet"
    assert_page_has_text "Start adding GIFs"

    take_screenshot("collections-empty-state")
  end

  # ========== COLLECTION VIEWING TESTS ==========

  test "user can view their own public collection" do
    user = users(:e2e_test_user)
    sign_in_as(user)

    collection = Collection.create!(
      user: user,
      name: 'My Public Collection',
      is_public: true
    )

    visit collection_path(collection)
    wait_for_page_load

    # Should see collection details
    assert_page_has_text "My Public Collection"
    
    # Should see edit/delete buttons (owner)
    assert_selector 'a:has-text("Edit")'
    assert_selector 'button:has-text("Delete")'

    take_screenshot("collections-view-own-public")
  end

  test "user can view their own private collection" do
    user = users(:e2e_test_user)
    sign_in_as(user)

    collection = Collection.create!(
      user: user,
      name: 'My Private Collection',
      is_public: false
    )

    visit collection_path(collection)
    wait_for_page_load

    # Should see collection with private badge
    assert_page_has_text "My Private Collection"
    assert_page_has_text "Private"
    
    # Should see edit/delete buttons
    assert_selector 'a:has-text("Edit")'

    take_screenshot("collections-view-own-private")
  end

  test "user can view another user's public collection" do
    alice_collection = collections(:alice_public_collection)
    bob = users(:two)

    sign_in_as(bob)

    visit collection_path(alice_collection)
    wait_for_page_load

    # Should see collection details
    assert_page_has_text alice_collection.name
    
    # Should NOT see edit/delete buttons (not owner)
    assert_no_selector 'a:has-text("Edit")', timeout: 1000

    take_screenshot("collections-view-others-public")
  end

  test "user cannot view another user's private collection" do
    alice_private = collections(:alice_private_collection)
    bob = users(:two)

    sign_in_as(bob)

    visit collection_path(alice_private)
    wait_for_page_load

    # Should be redirected or show error
    assert_page_has_text "don't have permission"

    take_screenshot("collections-view-others-private-denied")
  end

  # ========== COLLECTIONS LIST TESTS ==========

  test "view public collections index" do
    visit collections_path
    wait_for_page_load

    # Should show page title
    assert_page_has_text "Public Collections"

    # Should show public collections
    assert_page_has_text collections(:alice_public_collection).name
    assert_page_has_text collections(:bob_public_collection).name

    # Should NOT show private collections
    assert_page_missing_text collections(:alice_private_collection).name

    take_screenshot("collections-index-public")
  end

  test "user can view their collections on profile" do
    user = users(:e2e_test_user)
    sign_in_as(user)

    # Create a mix of public and private collections
    Collection.create!(user: user, name: 'Public Profile Collection', is_public: true)
    Collection.create!(user: user, name: 'Private Profile Collection', is_public: false)

    # Visit user profile collections tab
    visit user_path(user.username, tab: 'collections')
    wait_for_page_load

    # Should see both public and private collections (own profile)
    assert_page_has_text 'Public Profile Collection'
    assert_page_has_text 'Private Profile Collection'

    take_screenshot("collections-profile-own")
  end

  test "collections index shows empty state when no public collections exist" do
    # Delete all public collections
    Collection.where(is_public: true).destroy_all

    visit collections_path
    wait_for_page_load

    # Should show empty state
    assert_page_has_text "No public collections yet"
    assert_page_has_text "Be the first to create"

    take_screenshot("collections-index-empty")
  end
end
```

### Step 2: Add Collection Test Fixtures (5 min)

The fixtures already exist in `test/fixtures/collections.yml` with:
- `alice_public_collection` (public)
- `alice_private_collection` (private)
- `bob_public_collection` (public)
- `bob_private_collection` (private)

Verify they're properly set up:

```bash
cat test/fixtures/collections.yml
```

### Step 3: Add Helper Methods to ApplicationSystemTestCase (5 min)

Update `test/application_system_test_case.rb` to add collection-specific helpers:

```ruby
# Add to ApplicationSystemTestCase

# ========== COLLECTION HELPERS ==========

def create_collection_via_ui(name:, description: nil, is_public: true)
  visit new_collection_path
  
  @page.fill('input[name="collection[name]"]', name)
  @page.fill('textarea[name="collection[description]"]', description) if description
  @page.check("input[name='collection[is_public]'][value='#{is_public}']")
  
  @page.click('input[type="submit"][value="Create Collection"]')
  wait_for_page_load
end

def add_gif_to_collection(gif, collection)
  # This helper assumes a UI flow exists
  # Adjust based on actual implementation
  visit gif_path(gif)
  @page.click('button[data-action*="dropdown#toggle"]')
  @page.click('a:has-text("Add to Collection")')
  @page.click("text=#{collection.name}")
  wait_for_turbo
end
```

### Step 4: Run Collections Tests (10 min)

```bash
# Run all collections tests
bin/rails test test/system/collections_test.rb

# Or run individual tests
bin/rails test test/system/collections_test.rb -n test_user_can_create_a_public_collection
```

**Expected Output:**
```
Running 20 tests in a single process
....................

Finished in 25-35s
20 runs, ~50 assertions, 0 failures, 0 errors, 0 skips
```

### Step 5: Review Screenshots (5 min)

Check `tmp/screenshots/` for screenshots from each test:
- `collections-create-public-success-*.png`
- `collections-create-private-success-*.png`
- `collections-create-empty-name-*.png`
- `collections-create-duplicate-name-*.png`
- `collections-edit-success-*.png`
- `collections-toggle-privacy-*.png`
- `collections-unauthorized-edit-*.png`
- `collections-delete-success-*.png`
- `collections-delete-cancelled-*.png`
- `collections-add-gif-success-*.png`
- `collections-remove-gif-success-*.png`
- `collections-view-with-gifs-*.png`
- `collections-empty-state-*.png`
- `collections-view-own-public-*.png`
- `collections-view-own-private-*.png`
- `collections-view-others-public-*.png`
- `collections-view-others-private-denied-*.png`
- `collections-index-public-*.png`
- `collections-profile-own-*.png`
- `collections-index-empty-*.png`

### Step 6: Handle Potential Issues (25 min buffer)

#### Issue 1: Add to Collection UI Not Found

**Symptom:** `Error: No node found matching selector 'a:has-text("Add to Collection")'`

**Solution:** The GIF add-to-collection functionality might be implemented differently. Check the actual UI:

```ruby
# Option 1: Modal-based approach
visit gif_path(gif)
take_screenshot("debug-gif-page")
# Inspect screenshot to find the actual "Add to Collection" button
```

If it uses a modal, update the test:

```ruby
@page.click('button:has-text("Save to Collection")')  # Or actual button text
@page.wait_for_selector('.modal', state: 'visible')
@page.click("text=#{collection.name}")
```

#### Issue 2: Remove GIF Button Not Found

**Symptom:** `Error: No node found matching selector 'button:has-text("Remove")'`

**Solution:** The remove functionality might use a different UI element:

```ruby
# Check the actual implementation in _gif_card.html.erb
# It might use a link, button, or form

# Possible alternatives:
@page.click('a:has-text("Remove from collection")')
# Or via form:
@page.click('button[data-turbo-method="delete"]')
```

#### Issue 3: Privacy Toggle Radio Buttons

**Symptom:** Radio button selection not working

**Solution:** Use different selector approach:

```ruby
# Instead of:
@page.check('input[name="collection[is_public]"][value="true"]')

# Try:
@page.click('label:has-text("Public")')
# Or:
public_radio = @page.query_selector('input[type="radio"][value="true"]')
public_radio.click
```

#### Issue 4: Turbo Stream Updates Not Reflecting

**Symptom:** GIF removed but still appears in collection

**Solution:** Add proper wait for Turbo Stream processing:

```ruby
def wait_for_turbo_stream(element_id)
  # Wait for element to be removed/updated
  begin
    @page.wait_for_selector("##{element_id}", state: 'detached', timeout: 3000)
  rescue Playwright::TimeoutError
    # Element might be replaced instead of removed
  end
end

# Use in test:
@page.click('button:has-text("Remove")')
wait_for_turbo_stream("gif_#{gif.id}")
```

#### Issue 5: Collection Dropdown/Modal for Adding GIFs

**Symptom:** Cannot find collection selector after clicking "Add to Collection"

**Solution:** The UI might use a modal with collection checkboxes:

```ruby
# For modal-based approach
@page.click('button:has-text("Add to Collection")')
@page.wait_for_selector('.modal', state: 'visible')

# Find and click the collection
collection_checkbox = @page.query_selector("input[value='#{collection.id}']")
collection_checkbox.click

# Submit modal
@page.click('button:has-text("Save")')
wait_for_page_load
```

#### Issue 6: Profile Collections Tab

**Symptom:** `Error: No node found` when visiting profile collections tab

**Solution:** The tab might use a different URL structure:

```ruby
# Check actual routes
bin/rails routes | grep collections

# Might need to click tab instead of direct URL
visit user_path(user.username)
@page.click('a:has-text("Collections")')  # Click tab
wait_for_page_load
```

#### Issue 7: Confirmation Dialog Not Triggering

**Symptom:** `data: { turbo_confirm: "..." }` not working

**Solution:** Playwright dialog handling:

```ruby
# Set up dialog handler BEFORE clicking
dialog_handled = false
@page.once('dialog', ->(dialog) {
  assert dialog.type == 'confirm'
  assert dialog.message.include?("delete")
  dialog.accept
  dialog_handled = true
})

@page.click('button:has-text("Delete")')
wait_for_page_load

assert dialog_handled, "Confirmation dialog was not shown"
```

## Troubleshooting Guide

### Form Field Selectors

If form fields don't match, debug with:

```ruby
visit new_collection_path
take_screenshot("debug-collection-form")

# Get all form inputs
inputs = @page.query_selector_all('input, textarea')
inputs.each do |input|
  puts "#{input.get_attribute('name')}: #{input.get_attribute('type')}"
end
```

### Collection Not Found in List

If collections don't appear in the index:

```ruby
# Check what collections are public
public_collections = Collection.where(is_public: true)
puts "Public collections: #{public_collections.map(&:name)}"

# Check page content
body_text = @page.text_content('body')
puts "Page content includes: #{body_text[0..500]}"
```

### Turbo Frame/Stream Issues

If Turbo updates aren't working:

```ruby
# Disable Turbo for debugging
visit collection_path(collection, turbo: false)

# Or force full page reload
@page.reload
wait_for_page_load
```

## Verification Checklist

After completing all steps:

- [ ] All 20 tests passing (0 failures, 0 errors)
- [ ] 20 screenshots generated (no failure-* screenshots)
- [ ] Can create public and private collections
- [ ] Form validation working (empty name, duplicates)
- [ ] Can edit collection details and privacy
- [ ] Can delete collections with confirmation
- [ ] Can add GIFs to collections
- [ ] Can remove GIFs from collections
- [ ] Privacy settings enforced (can't view private collections)
- [ ] Authorization working (can't edit others' collections)
- [ ] Empty states showing correctly
- [ ] Public collections index working
- [ ] Profile collections tab accessible

## Expected Test Coverage

**Before:** 14 system tests (3 smoke + 11 auth)
**After:** 34 system tests (3 smoke + 11 auth + 20 collections)

**Total Assertions:** ~50-60 new assertions

## File Structure

```
test/
├── application_system_test_case.rb (updated with helpers)
├── system/
│   ├── smoke_test.rb (3 tests)
│   ├── authentication_test.rb (11 tests)
│   └── collections_test.rb (20 tests) ← NEW
└── fixtures/
    ├── users.yml
    ├── gifs.yml
    ├── collections.yml (existing)
    └── collection_gifs.yml (existing)
```

## Success Criteria

✅ All 20 collection tests pass
✅ Screenshots show correct UI states
✅ Collections can be created, edited, deleted
✅ GIFs can be added/removed from collections
✅ Privacy settings enforced correctly
✅ Authorization checks working
✅ Empty states handled gracefully
✅ Turbo Streams updating UI correctly
✅ Tests run in ~25-35 seconds
✅ No flaky tests

## Next Steps After Completion

Once Phase 3 is complete, proceed to:

**Phase 4: Social Interactions (Likes, Comments, Follows)**
- Like/unlike GIFs
- Comment on GIFs
- Follow/unfollow users
- View feed

## Time Breakdown

- Step 1: Create test file - 10 min
- Step 2: Verify fixtures - 5 min
- Step 3: Add helper methods - 5 min
- Step 4: Run tests - 10 min
- Step 5: Review screenshots - 5 min
- Step 6: Troubleshooting buffer - 25 min

**Total: 60-75 minutes**

## Commands Quick Reference

```bash
# Run all collections tests
bin/rails test test/system/collections_test.rb

# Run specific test
bin/rails test test/system/collections_test.rb -n test_user_can_create_a_public_collection

# Check routes
bin/rails routes | grep collection

# View screenshots
open tmp/screenshots/

# Clean old screenshots
rm tmp/screenshots/collections-*

# Check fixtures
cat test/fixtures/collections.yml

# Inspect collection model
bin/rails console
> Collection.first
> Collection.where(is_public: true)
```

## Notes

- All tests use existing fixtures (`alice`, `bob`, `e2e_test_user`)
- Collections use UUID primary keys
- Privacy enforced at controller level (`can_view_collection?`)
- Authorization checked via `authorize_collection!`
- GIF add/remove uses Turbo Streams for real-time updates
- Collection deletion requires confirmation dialog
- Empty collections show helpful prompts
- Public collections index shows only public collections
- User can see all their collections (public + private) on profile

## Implementation Notes

### Collection Model Validations

```ruby
validates :name, presence: true, length: { minimum: 1, maximum: 100 }
validates :description, length: { maximum: 500 }, allow_blank: true
validates :name, uniqueness: { scope: :user_id, case_sensitive: false }
```

### Privacy Rules

- Public collections: visible to everyone
- Private collections: only visible to owner
- Owner can always edit/delete their collections
- Non-owners cannot edit/delete collections

### Routes

```ruby
resources :collections do
  member do
    post :add_gif
    delete 'remove_gif/:gif_id', action: :remove_gif, as: :remove_gif
  end
end
```

### Turbo Streams

Add/remove GIF operations use Turbo Streams for instant UI updates:
- Add: Replaces collection button state
- Remove: Removes GIF from collection view

### Testing Tips

1. Always wait for Turbo Streams to complete before assertions
2. Use `wait_for_page_load` after form submissions
3. Set up dialog handlers BEFORE clicking delete buttons
4. Take screenshots when debugging UI selector issues
5. Use `assert_selector` with count for multiple elements
6. Use `assert_no_selector` with timeout for missing elements
