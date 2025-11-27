# Phase 2.3: Social Interactions - Follows E2E Tests - Implementation Plan

**Status:** 🟡 Ready to Implement
**Estimated Duration:** 50 minutes
**Prerequisites:** Phase 1.2 Complete (Authentication)

## Overview

Implement comprehensive end-to-end tests for the follow/unfollow functionality using Playwright. This covers user follow interactions, UI state changes, counter updates, and access control for the social features.

## Goals

- Verify users can follow and unfollow other users
- Test follow button state changes (Follow ↔ Following/Unfollow)
- Confirm follower/following count updates in real-time via Turbo Streams
- Validate self-follow prevention
- Ensure authentication requirements for following
- Test followers/following lists display correctly
- Verify Turbo Frame updates work correctly

## Test Scenarios

### 1. Following a User (3 tests)
- ✅ Follow user from profile page
- ✅ Follow button changes state (Follow → Following)
- ✅ Follower count increments

### 2. Unfollowing a User (3 tests)
- ✅ Unfollow user from profile page
- ✅ Follow button reverts state (Following → Follow)
- ✅ Follower count decrements

### 3. Follow State Changes (2 tests)
- ✅ Button shows "Following" when following
- ✅ Button shows "Unfollow" on hover when following

### 4. Access Control (2 tests)
- ✅ Cannot follow yourself (button not shown)
- ✅ Must be signed in to follow (redirects to sign in)

### 5. Followers/Following Lists (4 tests)
- ✅ View followers list
- ✅ View following list
- ✅ Empty state when no followers
- ✅ Empty state when no following

### 6. Counter Updates (2 tests)
- ✅ Following count updates for current user
- ✅ Follower count updates for target user

**Total Tests:** 16 new tests

## Implementation Steps

### Step 1: Create Follows Test File (5 min)

Create `test/system/follows_test.rb`:

```ruby
require "application_system_test_case"

class FollowsTest < ApplicationSystemTestCase
  # ========== FOLLOWING A USER ==========

  test "user can follow another user from profile" do
    # Sign in as test user
    sign_in_as users(:e2e_test_user)

    # Visit another user's profile
    target_user = users(:e2e_follower)
    visit user_path(target_user.username)

    # Should see Follow button
    assert_selector "button:has-text('Follow')"

    # Get initial counts
    initial_follower_count = target_user.follower_count
    initial_following_count = users(:e2e_test_user).following_count

    # Click Follow button
    @page.click('button:has-text("Follow")')

    # Wait for Turbo Stream update
    wait_for_turbo
    @page.wait_for_timeout(500) # Small delay for counter update

    # Should show "Following" button
    assert_selector "button:has-text('Following')"

    # Verify database was updated
    target_user.reload
    users(:e2e_test_user).reload

    assert_equal initial_follower_count + 1, target_user.follower_count
    assert_equal initial_following_count + 1, users(:e2e_test_user).following_count

    take_screenshot("follows-follow-success")
  end

  test "follow button changes state after following" do
    sign_in_as users(:e2e_test_user)

    target_user = users(:e2e_follower)
    visit user_path(target_user.username)

    # Initially shows "Follow"
    follow_button = @page.query_selector('button:has-text("Follow")')
    assert_not_nil follow_button

    # Click to follow
    @page.click('button:has-text("Follow")')
    wait_for_turbo
    @page.wait_for_timeout(500)

    # Now shows "Following"
    following_button = @page.query_selector('button:has-text("Following")')
    assert_not_nil following_button

    # Verify button class changed (should be gray now)
    button_classes = following_button.get_attribute('class')
    assert button_classes.include?('bg-gray-200'), "Expected gray background for Following button"

    take_screenshot("follows-button-state-change")
  end

  test "follower count increments immediately" do
    sign_in_as users(:e2e_test_user)

    target_user = users(:e2e_follower)
    visit user_path(target_user.username)

    # Get initial count from page
    follower_count_element = @page.query_selector("turbo-frame#follower_count_#{target_user.id}")
    initial_text = follower_count_element.text_content

    # Extract number from text (e.g., "5 followers")
    initial_count = initial_text.match(/(\d+)\s+follower/)[1].to_i

    # Follow user
    @page.click('button:has-text("Follow")')
    wait_for_turbo
    @page.wait_for_timeout(500)

    # Get updated count
    updated_text = follower_count_element.text_content
    updated_count = updated_text.match(/(\d+)\s+follower/)[1].to_i

    assert_equal initial_count + 1, updated_count

    take_screenshot("follows-count-increment")
  end

  # ========== UNFOLLOWING A USER ==========

  test "user can unfollow another user" do
    sign_in_as users(:e2e_test_user)
    test_user = users(:e2e_test_user)
    target_user = users(:e2e_follower)

    # First, follow the user
    Follow.create!(follower: test_user, following: target_user)
    target_user.reload
    test_user.reload

    # Visit profile
    visit user_path(target_user.username)

    # Should see "Following" button
    assert_selector "button:has-text('Following')"

    # Get counts
    initial_follower_count = target_user.follower_count
    initial_following_count = test_user.following_count

    # Click to unfollow
    @page.click('button:has-text("Following")')
    wait_for_turbo
    @page.wait_for_timeout(500)

    # Should show "Follow" button again
    assert_selector "button:has-text('Follow')"

    # Verify database was updated
    target_user.reload
    test_user.reload

    assert_equal initial_follower_count - 1, target_user.follower_count
    assert_equal initial_following_count - 1, test_user.following_count

    take_screenshot("follows-unfollow-success")
  end

  test "unfollow button appears on hover" do
    sign_in_as users(:e2e_test_user)
    test_user = users(:e2e_test_user)
    target_user = users(:e2e_follower)

    # Create follow relationship
    Follow.create!(follower: test_user, following: target_user)

    visit user_path(target_user.username)

    # Find the button
    button = @page.query_selector('button:has-text("Following")')
    assert_not_nil button

    # Hover over button
    button.hover

    # Wait a moment for hover state
    @page.wait_for_timeout(300)

    # Check if "Unfollow" text is visible (via CSS hover)
    # Note: The actual text change happens via CSS, so we verify the structure
    assert_page_has_text "Unfollow"

    take_screenshot("follows-unfollow-hover")
  end

  test "follower count decrements after unfollow" do
    sign_in_as users(:e2e_test_user)
    test_user = users(:e2e_test_user)
    target_user = users(:e2e_follower)

    # Create follow relationship
    Follow.create!(follower: test_user, following: target_user)
    target_user.reload

    visit user_path(target_user.username)

    # Get initial count from page
    follower_count_element = @page.query_selector("turbo-frame#follower_count_#{target_user.id}")
    initial_text = follower_count_element.text_content
    initial_count = initial_text.match(/(\d+)\s+follower/)[1].to_i

    # Unfollow user
    @page.click('button:has-text("Following")')
    wait_for_turbo
    @page.wait_for_timeout(500)

    # Get updated count
    updated_text = follower_count_element.text_content
    updated_count = updated_text.match(/(\d+)\s+follower/)[1].to_i

    assert_equal initial_count - 1, updated_count

    take_screenshot("follows-count-decrement")
  end

  # ========== FOLLOW STATE DISPLAY ==========

  test "following button shows correct state" do
    sign_in_as users(:e2e_test_user)
    test_user = users(:e2e_test_user)
    target_user = users(:e2e_follower)

    # Create follow relationship
    Follow.create!(follower: test_user, following: target_user)

    visit user_path(target_user.username)

    # Should show "Following" state
    button = @page.query_selector('button:has-text("Following")')
    assert_not_nil button

    # Verify styling indicates following state (gray background)
    classes = button.get_attribute('class')
    assert classes.include?('bg-gray-200'), "Expected gray background for following state"

    take_screenshot("follows-following-state")
  end

  test "follow button shows correct state for unfollowed user" do
    sign_in_as users(:e2e_test_user)
    target_user = users(:e2e_follower)

    visit user_path(target_user.username)

    # Should show "Follow" state
    button = @page.query_selector('button:has-text("Follow")')
    assert_not_nil button

    # Verify styling indicates not-following state (indigo background)
    classes = button.get_attribute('class')
    assert classes.include?('bg-indigo-600'), "Expected indigo background for follow button"

    take_screenshot("follows-not-following-state")
  end

  # ========== ACCESS CONTROL ==========

  test "cannot follow yourself" do
    sign_in_as users(:e2e_test_user)

    # Visit own profile
    visit user_path(users(:e2e_test_user).username)

    # Should NOT see Follow button
    follow_buttons = @page.query_selector_all('button:has-text("Follow")')
    following_buttons = @page.query_selector_all('button:has-text("Following")')

    assert_equal 0, follow_buttons.length, "Should not show Follow button on own profile"
    assert_equal 0, following_buttons.length, "Should not show Following button on own profile"

    take_screenshot("follows-no-self-follow")
  end

  test "must be signed in to follow" do
    target_user = users(:e2e_follower)

    # Visit profile without signing in
    visit user_path(target_user.username)

    # Should see a Follow link that redirects to sign in
    follow_link = @page.query_selector('a:has-text("Follow")')
    assert_not_nil follow_link, "Should show Follow link for unauthenticated users"

    # Click it
    follow_link.click
    wait_for_page_load

    # Should redirect to sign in page
    assert @page.url.include?('/users/sign_in'), "Should redirect to sign in page"

    take_screenshot("follows-auth-required")
  end

  # ========== FOLLOWERS/FOLLOWING LISTS ==========

  test "can view followers list" do
    test_user = users(:e2e_test_user)
    follower1 = users(:e2e_follower)
    follower2 = users(:one) # alice

    # Create followers
    Follow.create!(follower: follower1, following: test_user)
    Follow.create!(follower: follower2, following: test_user)
    test_user.reload

    sign_in_as test_user

    # Visit own profile
    visit user_path(test_user.username)

    # Click on followers count link
    @page.click("a:has-text('followers')")
    wait_for_page_load

    # Should show followers list
    assert @page.url.include?('/followers')
    assert_page_has_text follower1.username
    assert_page_has_text follower2.username

    take_screenshot("follows-followers-list")
  end

  test "can view following list" do
    test_user = users(:e2e_test_user)
    followed1 = users(:e2e_follower)
    followed2 = users(:one) # alice

    # Create following relationships
    Follow.create!(follower: test_user, following: followed1)
    Follow.create!(follower: test_user, following: followed2)
    test_user.reload

    sign_in_as test_user

    # Visit own profile
    visit user_path(test_user.username)

    # Click on following count link
    @page.click("a:has-text('following')")
    wait_for_page_load

    # Should show following list
    assert @page.url.include?('/following')
    assert_page_has_text followed1.username
    assert_page_has_text followed2.username

    take_screenshot("follows-following-list")
  end

  test "shows empty state when no followers" do
    test_user = users(:e2e_test_user)

    sign_in_as test_user

    # Visit followers page
    visit followers_user_path(test_user.username)

    # Should show empty state
    assert_page_has_text "No followers yet"

    take_screenshot("follows-no-followers-empty-state")
  end

  test "shows empty state when not following anyone" do
    test_user = users(:e2e_test_user)

    sign_in_as test_user

    # Visit following page
    visit following_user_path(test_user.username)

    # Should show empty state
    assert_page_has_text "Not following anyone yet"

    take_screenshot("follows-no-following-empty-state")
  end

  # ========== COUNTER UPDATES ==========

  test "following count updates for current user" do
    sign_in_as users(:e2e_test_user)
    test_user = users(:e2e_test_user)
    target_user = users(:e2e_follower)

    # Visit own profile first
    visit user_path(test_user.username)

    # Note initial following count
    initial_count = test_user.following_count

    # Now visit target user's profile
    visit user_path(target_user.username)

    # Follow the user
    @page.click('button:has-text("Follow")')
    wait_for_turbo
    @page.wait_for_timeout(500)

    # Go back to own profile
    visit user_path(test_user.username)

    # Check following count increased
    test_user.reload
    assert_equal initial_count + 1, test_user.following_count

    # Verify it's displayed on page
    assert_page_has_text "#{test_user.following_count} following"

    take_screenshot("follows-following-count-update")
  end

  test "follower count updates for target user" do
    sign_in_as users(:e2e_test_user)
    target_user = users(:e2e_follower)

    visit user_path(target_user.username)

    # Get initial count from database
    initial_count = target_user.follower_count

    # Follow the user
    @page.click('button:has-text("Follow")')
    wait_for_turbo
    @page.wait_for_timeout(500)

    # Check follower count on page
    follower_text = if initial_count + 1 == 1
      "1 follower"
    else
      "#{initial_count + 1} followers"
    end

    assert_page_has_text follower_text

    # Verify database
    target_user.reload
    assert_equal initial_count + 1, target_user.follower_count

    take_screenshot("follows-follower-count-update")
  end
end
```

### Step 2: Add Necessary Test Fixtures (5 min)

Ensure fixtures are set up correctly in `test/fixtures/follows.yml`:

```yaml
# Empty by default - tests will create follows as needed
# This prevents test pollution between parallel test runs
```

Verify users fixtures have correct counter cache defaults in `test/fixtures/users.yml`:

```yaml
e2e_test_user:
  # ... existing fields ...
  follower_count: 0
  following_count: 0

e2e_follower:
  # ... existing fields ...
  follower_count: 0
  following_count: 0
```

### Step 3: Verify User Routes and Paths (5 min)

Check that these routes exist (they should already be configured):

```bash
bin/rails routes | grep -E "follow|follower|following"
```

Expected routes:
- `POST /users/:username/follow` → `follows#toggle`
- `GET /users/:username/followers` → `users#followers`
- `GET /users/:username/following` → `users#following`

### Step 4: Run Follows Tests (10 min)

```bash
# Run all follows tests
bin/rails test test/system/follows_test.rb

# Or run individual tests
bin/rails test test/system/follows_test.rb -n test_user_can_follow_another_user_from_profile
```

**Expected Output:**
```
Running 16 tests in a single process
................

Finished in 25-30s
16 runs, ~40 assertions, 0 failures, 0 errors, 0 skips
```

### Step 5: Review Screenshots (5 min)

Check `tmp/screenshots/` for screenshots from each test:
- `follows-follow-success-*.png`
- `follows-button-state-change-*.png`
- `follows-count-increment-*.png`
- `follows-unfollow-success-*.png`
- `follows-unfollow-hover-*.png`
- `follows-count-decrement-*.png`
- `follows-following-state-*.png`
- `follows-not-following-state-*.png`
- `follows-no-self-follow-*.png`
- `follows-auth-required-*.png`
- `follows-followers-list-*.png`
- `follows-following-list-*.png`
- `follows-no-followers-empty-state-*.png`
- `follows-no-following-empty-state-*.png`
- `follows-following-count-update-*.png`
- `follows-follower-count-update-*.png`

Verify each screenshot shows the expected state.

### Step 6: Handle Potential Issues (20 min buffer)

#### Issue 1: Turbo Frame Not Updating

**Symptom:** Follow button doesn't change state after clicking

**Solution:** Verify Turbo Frame IDs match between partial and controller:

```ruby
# Check app/views/follows/_button.html.erb
<%= turbo_frame_tag "follow_button_#{user.id}" do %>
  # ...
<% end %>

# Check app/controllers/follows_controller.rb
turbo_stream.replace(
  "follow_button_#{@user.id}",  # Must match!
  partial: "follows/button",
  locals: { user: @user }
)
```

Debug by checking browser console for Turbo errors:

```ruby
# In test, add:
@page.on('console', ->(msg) {
  puts "Browser console: #{msg.text}"
})
```

#### Issue 2: Counter Cache Not Updating

**Symptom:** Follower count doesn't change after follow/unfollow

**Solution:** Verify counter cache columns exist and are properly configured:

```bash
# Check migration
bin/rails db:migrate:status | grep -i follow

# Check model associations
cat app/models/follow.rb | grep counter_cache
```

The Follow model should have:
```ruby
belongs_to :follower, class_name: 'User', counter_cache: :following_count
belongs_to :following, class_name: 'User', counter_cache: :follower_count
```

#### Issue 3: Hover State Not Showing "Unfollow"

**Symptom:** Test can't find "Unfollow" text on hover

**Solution:** The hover state uses CSS with `group-hover:` classes. Playwright hover may not trigger CSS pseudo-classes reliably.

Alternative approach:
```ruby
# Instead of checking for "Unfollow" text, verify the button structure
button = @page.query_selector('button:has-text("Following")')
button.hover

# Check for the hidden span that appears on hover
hidden_span = button.query_selector('span.hidden.group-hover\\:inline')
assert_not_nil hidden_span, "Should have hover state span"
assert_equal "Unfollow", hidden_span.text_content
```

Or simplify the test to just verify the button is clickable:
```ruby
test "can click following button to unfollow" do
  # ... setup ...
  button = @page.query_selector('button:has-text("Following")')
  button.click  # Should work regardless of hover state
  
  wait_for_turbo
  assert_selector "button:has-text('Follow')"
end
```

#### Issue 4: Timing Issues with Counter Updates

**Symptom:** `NoMethodError: undefined method 'match' for nil` when parsing count

**Solution:** Add more robust waiting and error handling:

```ruby
# Instead of immediate text parsing:
follower_count_element = @page.query_selector("turbo-frame#follower_count_#{target_user.id}")

# Wait for Turbo update to complete
wait_for_turbo
@page.wait_for_timeout(500)

# Then parse with error handling
initial_text = follower_count_element.text_content
count_match = initial_text.match(/(\d+)\s+follower/)

assert_not_nil count_match, "Could not find follower count in text: #{initial_text}"
initial_count = count_match[1].to_i
```

Or use a more robust helper:

```ruby
def get_follower_count_from_page(user_id)
  element = @page.query_selector("turbo-frame#follower_count_#{user_id}")
  text = element.text_content
  
  # Try to extract number
  if match = text.match(/(\d+)\s+follower/)
    match[1].to_i
  else
    flunk "Could not parse follower count from: #{text}"
  end
end
```

#### Issue 5: Follow Button Not Found

**Symptom:** `No node found matching selector 'button:has-text("Follow")'`

**Solution:** Check if the button is actually rendered. Take a debug screenshot:

```ruby
visit user_path(target_user.username)
take_screenshot("debug-profile-page")

# Try alternative selectors
button = @page.query_selector('[data-controller="follow"] button') ||
         @page.query_selector('form[action*="follow"] button')

assert_not_nil button, "Could not find follow button"
```

Verify the button partial renders correctly:
```bash
# Check if partial exists
ls app/views/follows/_button.html.erb
```

#### Issue 6: Users Following Themselves in Fixtures

**Symptom:** Unexpected follow counts in tests

**Solution:** Ensure follows.yml is empty and tests create their own data:

```yaml
# test/fixtures/follows.yml
# Empty - tests create follows as needed
```

Clean up any existing follows before test:
```ruby
setup do
  super
  # Clear any follows from fixtures
  Follow.destroy_all
  
  # Reset counter caches
  User.find_each do |user|
    User.reset_counters(user.id, :following_relationships)
    User.reset_counters(user.id, :follower_relationships)
  end
end
```

#### Issue 7: Followers/Following Pages Not Found

**Symptom:** 404 when visiting followers/following paths

**Solution:** Verify routes are configured in Users controller:

```bash
# Check routes exist
bin/rails routes | grep "followers_user\|following_user"
```

If missing, check `config/routes.rb`:
```ruby
resources :users, only: [:show], param: :username do
  member do
    get :followers
    get :following
  end
end
```

And verify Users controller has these actions:
```bash
grep -n "def followers\|def following" app/controllers/users_controller.rb
```

## Verification Checklist

After completing all steps:

- [ ] All 16 tests passing (0 failures, 0 errors)
- [ ] 16 screenshots generated (no failure-* screenshots)
- [ ] Follow button toggles between "Follow" and "Following"
- [ ] Follower counts update in real-time via Turbo Streams
- [ ] Following counts update correctly
- [ ] Cannot follow yourself (no button shown)
- [ ] Must be signed in to follow (redirects work)
- [ ] Followers list displays correctly
- [ ] Following list displays correctly
- [ ] Empty states show when no followers/following
- [ ] Turbo Frames update without page reload
- [ ] Counter caches stay in sync
- [ ] Hover states work (Following → Unfollow)
- [ ] Database records created/destroyed correctly

## Expected Test Coverage

**Before:** 14 system tests (3 smoke + 11 auth)
**After:** 30 system tests (3 smoke + 11 auth + 16 follows)

**Total Assertions:** ~50-55 assertions

## File Structure

```
test/
├── application_system_test_case.rb
├── system/
│   ├── smoke_test.rb (3 tests)
│   ├── authentication_test.rb (11 tests)
│   └── follows_test.rb (16 tests) ← NEW
└── fixtures/
    ├── users.yml (with counter cache fields)
    └── follows.yml (empty)
```

## Success Criteria

✅ All 16 follow tests pass
✅ Screenshots show correct UI states and transitions
✅ Follow/unfollow toggles work without page reload
✅ Follower/following counts update in real-time
✅ Counter caches stay synchronized
✅ Self-follow prevention works
✅ Authentication requirements enforced
✅ Followers/following lists display correctly
✅ Empty states show appropriately
✅ Turbo Streams and Frames work correctly
✅ Tests run in ~25-30 seconds

## Next Steps After Completion

Once Phase 2.3 is complete, proceed to:

**Phase 2.4: Social Interactions - Likes E2E Tests (45 min)**
- Like GIF from feed
- Unlike GIF
- Like count updates
- Like button state changes
- View liked GIFs list
- Real-time like updates via Turbo Streams

## Time Breakdown

- Step 1: Create test file - 5 min
- Step 2: Add fixtures - 5 min
- Step 3: Verify routes - 5 min
- Step 4: Run tests - 10 min
- Step 5: Review screenshots - 5 min
- Step 6: Troubleshooting buffer - 20 min

**Total: 50 minutes**

## Commands Quick Reference

```bash
# Run all follows tests
bin/rails test test/system/follows_test.rb

# Run specific test
bin/rails test test/system/follows_test.rb -n test_user_can_follow_another_user_from_profile

# Check routes
bin/rails routes | grep -E "follow|follower|following"

# View screenshots
open tmp/screenshots/

# Clean old screenshots
rm tmp/screenshots/follows-*

# Reset counter caches (if needed)
bin/rails runner "User.find_each { |u| User.reset_counters(u.id, :follower_relationships, :following_relationships) }"

# Check for orphaned follows
bin/rails runner "puts Follow.count; puts User.sum(:follower_count); puts User.sum(:following_count)"
```

## Notes

- Tests use empty `follows.yml` fixture to prevent test pollution
- All tests create their own follow relationships as needed
- Counter cache columns must match actual association counts
- Turbo Streams update both button state and counts simultaneously
- Follow button uses `button_to` with POST method (not a link)
- Following button has hover state (Following → Unfollow)
- Self-follow is prevented at both model and controller level
- Unauthenticated users see sign-in link instead of functional button
- Wait times are needed for Turbo Stream updates to complete
- Screenshots capture before/after states for visual verification

## Technical Details

### Turbo Frame Structure

The follow button is wrapped in a Turbo Frame for seamless updates:

```erb
<%= turbo_frame_tag "follow_button_#{user.id}" do %>
  <%= button_to follow_user_path(user.username), ... %>
<% end %>
```

### Counter Cache Architecture

Follower/following counts use Rails counter caches:

```ruby
# Follow model
belongs_to :follower, class_name: 'User', counter_cache: :following_count
belongs_to :following, class_name: 'User', counter_cache: :follower_count
```

Counts update automatically on `Follow.create!` and `Follow.destroy!`.

### Turbo Stream Updates

The controller broadcasts two updates simultaneously:

1. Button state update (Follow ↔ Following)
2. Counter display update (follower/following counts)

Both use Turbo Streams for instant updates without page reload.

### Test Data Isolation

Tests create fresh follow relationships to avoid dependencies:

```ruby
# Don't rely on fixtures
Follow.create!(follower: test_user, following: target_user)

# Always reload to get fresh counter cache values
target_user.reload
test_user.reload
```
