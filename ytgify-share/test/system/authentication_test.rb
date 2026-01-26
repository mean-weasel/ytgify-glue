require "application_system_test_case"

class AuthenticationTest < ApplicationSystemTestCase
  # Sign Up Tests

  test "user can sign up with valid data" do
    visit new_user_registration_path

    # Fill in sign up form
    @page.fill('input[name="user[username]"]', "newuser123")
    @page.fill('input[name="user[email]"]', "newuser@example.com")
    @page.fill('input[name="user[password]"]', "password123")
    @page.fill('input[name="user[password_confirmation]"]', "password123")

    # Click submit button directly (more reliable than JS evaluation)
    @page.click('input[type="submit"]')
    wait_for_page_load

    # Should redirect to home page
    assert_current_path root_path

    # Should show authenticated navbar elements (user avatar dropdown)
    assert_selector 'button[data-action="click->dropdown#toggle"]'

    # Verify user was created
    assert User.find_by(email: "newuser@example.com").present?

    take_screenshot("auth-signup-success")
  end

  test "sign up fails with existing email" do
    existing_user = users(:e2e_test_user)

    visit new_user_registration_path

    # Try to sign up with existing email
    @page.fill('input[name="user[username]"]', "differentuser")
    @page.fill('input[name="user[email]"]', existing_user.email)
    @page.fill('input[name="user[password]"]', "password123")
    @page.fill('input[name="user[password_confirmation]"]', "password123")

    @page.evaluate('document.querySelector("form").submit()')
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
    @page.fill('input[name="user[email]"]', "newemail@example.com")
    @page.fill('input[name="user[password]"]', "password123")
    @page.fill('input[name="user[password_confirmation]"]', "password123")

    @page.evaluate('document.querySelector("form").submit()')
    wait_for_page_load

    # Should show error message
    assert_page_has_text "Username has already been taken"

    take_screenshot("auth-signup-duplicate-username")
  end

  test "sign up fails with short password" do
    visit new_user_registration_path

    @page.fill('input[name="user[username]"]', "newuser456")
    @page.fill('input[name="user[email]"]', "short@example.com")
    @page.fill('input[name="user[password]"]', "short")  # Too short
    @page.fill('input[name="user[password_confirmation]"]', "short")

    @page.evaluate('document.querySelector("form").submit()')
    wait_for_page_load

    # Should show error message
    assert_page_has_text "Password is too short"

    take_screenshot("auth-signup-short-password")
  end

  test "sign up fails with missing required fields" do
    visit new_user_registration_path

    # Submit empty form
    @page.evaluate('document.querySelector("form").submit()')
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
    @page.fill('input[name="user[password]"]', "password123")

    # Click submit button directly (more reliable than JS evaluation)
    @page.click('input[type="submit"]')
    wait_for_page_load

    # Should redirect to home page
    assert_current_path root_path

    # Should show authenticated navbar elements (user avatar dropdown)
    assert_selector 'button[data-action="click->dropdown#toggle"]'

    take_screenshot("auth-signin-success")
  end

  test "sign in fails with invalid email" do
    visit new_user_session_path

    @page.fill('input[name="user[email]"]', "nonexistent@example.com")
    @page.fill('input[name="user[password]"]', "password123")

    @page.evaluate('document.querySelector("form").submit()')
    wait_for_page_load

    # Should show error message
    assert_page_has_text "Invalid Email or password"

    take_screenshot("auth-signin-invalid-email")
  end

  test "sign in fails with invalid password" do
    user = users(:e2e_test_user)

    visit new_user_session_path

    @page.fill('input[name="user[email]"]', user.email)
    @page.fill('input[name="user[password]"]', "wrongpassword")

    @page.evaluate('document.querySelector("form").submit()')
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
    @page.fill('input[name="user[password]"]', "password123")

    # Click submit button directly
    @page.click('input[type="submit"]')
    wait_for_page_load

    # User should now be authenticated (verify by checking for user avatar dropdown)
    assert_selector 'button[data-action="click->dropdown#toggle"]'

    # Now try to access the originally requested page - should work without redirect
    visit new_gif_path

    # Should be on the gif upload page (not redirected to sign in)
    assert @page.url.include?("/gifs/new")

    take_screenshot("auth-signin-redirect")
  end

  # Sign Out Tests

  test "user can sign out successfully" do
    # First sign in
    sign_in_as users(:e2e_test_user)

    # Click user menu dropdown to reveal sign out button
    @page.click('button[data-action="click->dropdown#toggle"]')

    # Wait for dropdown menu to be visible
    @page.wait_for_selector('[data-dropdown-target="menu"]:not(.hidden)', timeout: 5000)

    # Click sign out button (it's a button_to, so it's a form submit button)
    @page.click('button:has-text("Sign Out")')
    wait_for_page_load

    # Should show sign out success message
    assert_page_has_text "Signed out successfully"

    # Should no longer show authenticated navbar elements
    # Check that notification bell is gone (only shows for authenticated users)
    assert_no_selector '#notifications_bell'

    take_screenshot("auth-signout-success")
  end

  test "cannot access authenticated pages after sign out" do
    # Sign in first
    sign_in_as users(:e2e_test_user)

    # Open dropdown and sign out
    @page.click('button[data-action="click->dropdown#toggle"]')

    # Wait for dropdown menu to be visible
    @page.wait_for_selector('[data-dropdown-target="menu"]:not(.hidden)', timeout: 5000)

    @page.click('button:has-text("Sign Out")')
    wait_for_page_load

    # Try to access authenticated page
    visit new_gif_path

    # Should redirect to sign in page
    assert @page.url.include?("/users/sign_in")

    take_screenshot("auth-signout-no-access")
  end
end
