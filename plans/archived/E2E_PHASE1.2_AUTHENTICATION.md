# Phase 1.2: Authentication Flow Tests - Implementation Plan

**Status:** 🟡 Ready to Implement
**Estimated Duration:** 45 minutes
**Prerequisites:** Phase 1.1 Complete ✅

## Overview

Implement comprehensive end-to-end tests for user authentication flows using Playwright. This covers the critical user journeys: sign up, sign in, and sign out.

## Goals

- Verify sign up flow works correctly with valid/invalid data
- Test sign in flow with valid/invalid credentials
- Confirm sign out flow works and clears session
- Validate error messages and success states
- Ensure Devise integration works correctly in browser context

## Test Scenarios

### 1. Sign Up Flow (5 tests)
- ✅ Successful sign up with valid data
- ✅ Sign up fails with existing email
- ✅ Sign up fails with existing username
- ✅ Sign up fails with invalid password (too short)
- ✅ Sign up fails with missing required fields

### 2. Sign In Flow (4 tests)
- ✅ Successful sign in with valid credentials
- ✅ Sign in fails with invalid email
- ✅ Sign in fails with invalid password
- ✅ Sign in redirects to originally requested page

### 3. Sign Out Flow (2 tests)
- ✅ Successful sign out
- ✅ Cannot access authenticated pages after sign out

**Total Tests:** 11 new tests

## Implementation Steps

### Step 1: Create Authentication Test File (5 min)

Create `test/system/authentication_test.rb`:

```ruby
require "application_system_test_case"

class AuthenticationTest < ApplicationSystemTestCase
  # Sign Up Tests

  test "user can sign up with valid data" do
    visit new_user_registration_path

    # Fill in sign up form
    @page.fill('input[name="user[username]"]', 'newuser123')
    @page.fill('input[name="user[email]"]', 'newuser@example.com')
    @page.fill('input[name="user[display_name]"]', 'New User')
    @page.fill('input[name="user[password]"]', 'password123')
    @page.fill('input[name="user[password_confirmation]"]', 'password123')

    # Submit form
    @page.click('input[type="submit"][value="Sign up"]')
    wait_for_page_load

    # Should redirect to home page and show username
    assert_current_path root_path
    assert_page_has_text "newuser123"

    # Verify user was created
    assert User.find_by(email: 'newuser@example.com').present?

    take_screenshot("auth-signup-success")
  end

  test "sign up fails with existing email" do
    existing_user = users(:e2e_test_user)

    visit new_user_registration_path

    # Try to sign up with existing email
    @page.fill('input[name="user[username]"]', 'differentuser')
    @page.fill('input[name="user[email]"]', existing_user.email)
    @page.fill('input[name="user[display_name]"]', 'Different User')
    @page.fill('input[name="user[password]"]', 'password123')
    @page.fill('input[name="user[password_confirmation]"]', 'password123')

    @page.click('input[type="submit"][value="Sign up"]')
    wait_for_page_load

    # Should show error message
    assert_page_has_text "Email has already been taken"

    # Should still be on sign up page
    assert @page.url.include?("/users")

    take_screenshot("auth-signup-duplicate-email")
  end

  test "sign up fails with existing username" do
    existing_user = users(:e2e_test_user)

    visit new_user_registration_path

    # Try to sign up with existing username
    @page.fill('input[name="user[username]"]', existing_user.username)
    @page.fill('input[name="user[email]"]', 'newemail@example.com')
    @page.fill('input[name="user[display_name]"]', 'Different User')
    @page.fill('input[name="user[password]"]', 'password123')
    @page.fill('input[name="user[password_confirmation]"]', 'password123')

    @page.click('input[type="submit"][value="Sign up"]')
    wait_for_page_load

    # Should show error message
    assert_page_has_text "Username has already been taken"

    take_screenshot("auth-signup-duplicate-username")
  end

  test "sign up fails with short password" do
    visit new_user_registration_path

    @page.fill('input[name="user[username]"]', 'newuser456')
    @page.fill('input[name="user[email]"]', 'short@example.com')
    @page.fill('input[name="user[display_name]"]', 'Short Pass User')
    @page.fill('input[name="user[password]"]', 'short')  # Too short
    @page.fill('input[name="user[password_confirmation]"]', 'short')

    @page.click('input[type="submit"][value="Sign up"]')
    wait_for_page_load

    # Should show error message
    assert_page_has_text "Password is too short"

    take_screenshot("auth-signup-short-password")
  end

  test "sign up fails with missing required fields" do
    visit new_user_registration_path

    # Submit empty form
    @page.click('input[type="submit"][value="Sign up"]')
    wait_for_page_load

    # Should show validation errors
    assert_page_has_text "can't be blank"

    take_screenshot("auth-signup-missing-fields")
  end

  # Sign In Tests

  test "user can sign in with valid credentials" do
    user = users(:e2e_test_user)

    visit new_user_session_path

    # Fill in sign in form
    @page.fill('input[name="user[email]"]', user.email)
    @page.fill('input[name="user[password]"]', 'password123')

    # Submit form
    @page.click('input[type="submit"][value="Log in"]')
    wait_for_page_load

    # Should redirect to home page and show username
    assert_current_path root_path
    assert_page_has_text user.username

    take_screenshot("auth-signin-success")
  end

  test "sign in fails with invalid email" do
    visit new_user_session_path

    @page.fill('input[name="user[email]"]', 'nonexistent@example.com')
    @page.fill('input[name="user[password]"]', 'password123')

    @page.click('input[type="submit"][value="Log in"]')
    wait_for_page_load

    # Should show error message
    assert_page_has_text "Invalid Email or password"

    take_screenshot("auth-signin-invalid-email")
  end

  test "sign in fails with invalid password" do
    user = users(:e2e_test_user)

    visit new_user_session_path

    @page.fill('input[name="user[email]"]', user.email)
    @page.fill('input[name="user[password]"]', 'wrongpassword')

    @page.click('input[type="submit"][value="Log in"]')
    wait_for_page_load

    # Should show error message
    assert_page_has_text "Invalid Email or password"

    take_screenshot("auth-signin-invalid-password")
  end

  test "sign in redirects to originally requested page" do
    # Try to access a page that requires authentication
    visit new_gif_path

    # Should redirect to sign in page
    assert @page.url.include?("/users/sign_in")

    # Sign in
    user = users(:e2e_test_user)
    @page.fill('input[name="user[email]"]', user.email)
    @page.fill('input[name="user[password]"]', 'password123')
    @page.click('input[type="submit"][value="Log in"]')
    wait_for_page_load

    # Should redirect back to originally requested page
    assert @page.url.include?("/gifs/new")

    take_screenshot("auth-signin-redirect")
  end

  # Sign Out Tests

  test "user can sign out successfully" do
    # First sign in
    sign_in_as users(:e2e_test_user)

    # Find and click sign out link/button
    # Note: This depends on your UI implementation
    # Adjust selector based on your actual sign out UI
    @page.click('a:has-text("Sign out")')
    wait_for_page_load

    # Should redirect to home page
    assert_current_path root_path

    # Should not show username anymore
    assert_page_missing_text users(:e2e_test_user).username

    take_screenshot("auth-signout-success")
  end

  test "cannot access authenticated pages after sign out" do
    # Sign in first
    sign_in_as users(:e2e_test_user)

    # Sign out
    @page.click('a:has-text("Sign out")')
    wait_for_page_load

    # Try to access authenticated page
    visit new_gif_path

    # Should redirect to sign in page
    assert @page.url.include?("/users/sign_in")

    take_screenshot("auth-signout-no-access")
  end
end
```

### Step 2: Verify Sign Up/Sign In Pages Exist (5 min)

Before running tests, verify these views exist:

```bash
# Check for Devise views
ls app/views/devise/registrations/new.html.erb
ls app/views/devise/sessions/new.html.erb
```

If they don't exist, generate them:

```bash
bin/rails generate devise:views
```

### Step 3: Update sign_in_as Helper (if needed) (5 min)

The helper in ApplicationSystemTestCase might need adjustment based on actual form structure. Check `test/application_system_test_case.rb:68-83`:

```ruby
def sign_in_as(user)
  visit new_user_session_path

  # Fill in form
  @page.fill('input[name="user[email]"]', user.email)
  @page.fill('input[name="user[password]"]', 'password123')

  # Submit
  @page.click('input[type="submit"]')

  # Wait for redirect
  wait_for_page_load

  # Verify signed in
  assert_page_has_text user.username
end
```

Update if your form uses different selectors or submit buttons.

### Step 4: Run Authentication Tests (5 min)

```bash
# Run all authentication tests
bin/rails test test/system/authentication_test.rb

# Or run individual tests
bin/rails test test/system/authentication_test.rb -n test_user_can_sign_up_with_valid_data
```

**Expected Output:**
```
Running 11 tests in a single process
...........

Finished in 15-20s
11 runs, ~25 assertions, 0 failures, 0 errors, 0 skips
```

### Step 5: Review Screenshots (5 min)

Check `tmp/screenshots/` for screenshots from each test:
- `auth-signup-success-*.png`
- `auth-signup-duplicate-email-*.png`
- `auth-signup-duplicate-username-*.png`
- `auth-signup-short-password-*.png`
- `auth-signup-missing-fields-*.png`
- `auth-signin-success-*.png`
- `auth-signin-invalid-email-*.png`
- `auth-signin-invalid-password-*.png`
- `auth-signin-redirect-*.png`
- `auth-signout-success-*.png`
- `auth-signout-no-access-*.png`

Verify each screenshot shows the expected state.

### Step 6: Handle Potential Issues (15 min buffer)

#### Issue 1: Form Selectors Don't Match

**Symptom:** `Error: No node found matching selector 'input[name="user[email]"]'`

**Solution:** Take a screenshot of the form and inspect actual field names:

```ruby
visit new_user_registration_path
take_screenshot("debug-signup-form")
```

Then update selectors to match actual HTML structure.

#### Issue 2: Devise Flash Messages

**Symptom:** Flash message text doesn't match assertions

**Solution:** Check actual flash messages in Devise locales:

```bash
# Check config/locales/devise.en.yml
cat config/locales/devise.en.yml | grep -A 5 "failure:"
```

Update test assertions to match actual message text.

#### Issue 3: Sign Out Link Not Found

**Symptom:** `Error: No node found matching selector 'a:has-text("Sign out")'`

**Solution:** Inspect the actual sign out UI. It might be in a dropdown menu or have different text:

```ruby
# If sign out is in a dropdown, click the dropdown first
@page.click('button[aria-label="User menu"]')  # Example
wait_for_page_load
@page.click('a:has-text("Sign out")')
```

Or use the Devise helper directly:
```ruby
# In ApplicationSystemTestCase
def sign_out
  # Option 1: Navigate directly to sign out path
  visit destroy_user_session_path

  # Option 2: Use DELETE request via JavaScript
  @page.evaluate(<<~JS)
    fetch('/users/sign_out', {
      method: 'DELETE',
      headers: {
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
      }
    }).then(() => window.location.href = '/')
  JS
  wait_for_page_load
end
```

#### Issue 4: CSRF Token Issues

**Symptom:** `ActionController::InvalidAuthenticityToken`

**Solution:** Ensure Devise is configured to handle CSRF in test environment:

```ruby
# config/environments/test.rb
config.action_controller.allow_forgery_protection = false  # Should already be set
```

If still issues, verify meta tag exists:

```ruby
# Check for CSRF meta tag
visit new_user_session_path
csrf_token = @page.query_selector('meta[name="csrf-token"]')
assert_not_nil csrf_token, "CSRF token meta tag missing"
```

#### Issue 5: Redirect After Sign In

**Symptom:** Test expects root path but gets different redirect

**Solution:** Check Devise configuration for `after_sign_in_path_for`:

```ruby
# app/controllers/application_controller.rb
def after_sign_in_path_for(resource)
  root_path  # Or wherever you want to redirect
end
```

Update test assertions to match actual redirect behavior.

## Verification Checklist

After completing all steps:

- [ ] All 11 tests passing (0 failures, 0 errors)
- [ ] 11 screenshots generated (no failure-* screenshots)
- [ ] Sign up creates new user in database
- [ ] Sign in establishes session
- [ ] Sign out clears session
- [ ] Error messages display correctly
- [ ] Redirects work as expected
- [ ] Forms handle validation properly
- [ ] CSRF protection working
- [ ] Password confirmation matching works

## Expected Test Coverage

**Before:** 3 system tests (smoke tests)
**After:** 14 system tests (3 smoke + 11 auth)

**Total Assertions:** ~30-35 assertions

## File Structure

```
test/
├── application_system_test_case.rb
├── system/
│   ├── smoke_test.rb (3 tests)
│   └── authentication_test.rb (11 tests) ← NEW
└── fixtures/
    ├── users.yml (with e2e_test_user)
    └── gifs.yml
```

## Success Criteria

✅ All 11 authentication tests pass
✅ Screenshots show correct UI states
✅ Error messages match Devise defaults
✅ Sign in/sign out flows work correctly
✅ Form validation works as expected
✅ No CSRF or session issues
✅ Tests run in ~15-20 seconds

## Next Steps After Completion

Once Phase 1.2 is complete, proceed to:

**Phase 1.3: Core GIF Upload Flow (45 min)**
- GIF creation test
- Privacy settings test
- GIF visibility test
- Public/unlisted/private behavior

## Time Breakdown

- Step 1: Create test file - 5 min
- Step 2: Verify views exist - 5 min
- Step 3: Update helpers - 5 min
- Step 4: Run tests - 5 min
- Step 5: Review screenshots - 5 min
- Step 6: Troubleshooting buffer - 15 min

**Total: 40-45 minutes**

## Commands Quick Reference

```bash
# Run all auth tests
bin/rails test test/system/authentication_test.rb

# Run specific test
bin/rails test test/system/authentication_test.rb -n test_user_can_sign_up_with_valid_data

# Generate Devise views (if needed)
bin/rails generate devise:views

# Check for Devise routes
bin/rails routes | grep devise

# View screenshots
open tmp/screenshots/

# Clean old screenshots
rm tmp/screenshots/*
```

## Notes

- Tests use `password123` as standard test password (matches fixture configuration)
- All tests use `e2e_test_user` fixture for sign in tests
- Sign up tests create new users with unique emails/usernames
- Form selectors may need adjustment based on actual Devise views
- Some tests may need wait times for flash messages to appear
- Screenshots are essential for debugging form selector issues
