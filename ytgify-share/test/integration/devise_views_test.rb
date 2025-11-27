require "test_helper"

class DeviseViewsTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(
      email: "test@example.com",
      password: "password123",
      password_confirmation: "password123",
      username: "testuser"
    )
  end

  # ========== LOGIN PAGE TESTS ==========

  test "should display styled login page" do
    get new_user_session_path
    assert_response :success
    assert_select "h2", text: /Welcome back/
    assert_select "form[action=?]", user_session_path
    assert_select "input[type=email]"
    assert_select "input[type=password]"
    assert_select "input[type=submit]"
  end

  test "should display error messages on login failure" do
    post user_session_path, params: {
      user: {
        email: "wrong@example.com",
        password: "wrongpassword"
      }
    }
    # Devise returns unprocessable_entity on login failure
    assert_response :unprocessable_entity
    # Should show the login form again (it stays on same page)
    assert_select "h2", text: /Welcome back/
  end

  # ========== REGISTRATION PAGE TESTS ==========

  test "should display styled registration page" do
    get new_user_registration_path
    assert_response :success
    assert_select "h2", text: /Create your account/
    assert_select "form[action=?]", user_registration_path
    assert_select "input[type=email]"
    assert_select "input[type=password]", count: 2 # password and confirmation
    assert_select "input[type=text]" # username field
  end

  test "should display styled error messages on registration failure" do
    post user_registration_path, params: {
      user: {
        email: "bad-email",
        username: "",
        password: "short",
        password_confirmation: "different"
      }
    }
    assert_response :unprocessable_entity
    assert_select ".bg-red-50" # Error messages container
    assert_select "li", minimum: 1 # At least one error message
  end

  test "should successfully register new user with styled page" do
    assert_difference "User.count", 1 do
      post user_registration_path, params: {
        user: {
          email: "newuser@example.com",
          username: "newuser",
          password: "password123",
          password_confirmation: "password123"
        }
      }
    end
    # Should redirect after successful registration
    assert_redirected_to root_path
  end

  # ========== FORGOT PASSWORD PAGE TESTS ==========

  test "should display styled forgot password page" do
    get new_user_password_path
    assert_response :success
    assert_select "h2", text: /Reset your password/
    assert_select "form[action=?]", user_password_path
    assert_select "input[type=email]"
    assert_select "input[value=?]", "Send Reset Link"
  end

  test "should handle forgot password request" do
    post user_password_path, params: {
      user: {
        email: @user.email
      }
    }
    assert_redirected_to new_user_session_path
    follow_redirect!
    # Flash message should indicate email was sent
  end

  # ========== RESET PASSWORD PAGE TESTS ==========

  test "should display styled reset password page with valid token" do
    # Generate a real reset password token
    raw_token, encrypted_token = Devise.token_generator.generate(User, :reset_password_token)
    @user.update_columns(
      reset_password_token: encrypted_token,
      reset_password_sent_at: Time.current
    )

    get edit_user_password_path(reset_password_token: raw_token)
    assert_response :success
    assert_select "h2", text: /Change your password/
    assert_select "form[action=?]", user_password_path
    assert_select "input[type=password]", count: 2
    assert_select "input[value=?]", "Change my password"
  end

  test "should successfully reset password with valid token" do
    raw_token, encrypted_token = Devise.token_generator.generate(User, :reset_password_token)
    @user.update_columns(
      reset_password_token: encrypted_token,
      reset_password_sent_at: Time.current
    )

    put user_password_path, params: {
      user: {
        reset_password_token: raw_token,
        password: "newpassword123",
        password_confirmation: "newpassword123"
      }
    }
    assert_redirected_to root_path

    # Verify password was actually changed
    @user.reload
    assert @user.valid_password?("newpassword123")
  end

  test "should display error when passwords don't match on reset" do
    raw_token, encrypted_token = Devise.token_generator.generate(User, :reset_password_token)
    @user.update_columns(
      reset_password_token: encrypted_token,
      reset_password_sent_at: Time.current
    )

    put user_password_path, params: {
      user: {
        reset_password_token: raw_token,
        password: "newpassword123",
        password_confirmation: "different123"
      }
    }
    assert_response :unprocessable_entity
    assert_select ".bg-red-50" # Error messages container
  end

  # ========== EDIT PROFILE PAGE TESTS ==========

  test "should display styled edit profile page when signed in" do
    sign_in @user
    get edit_user_registration_path
    assert_response :success
    assert_select "h2", text: /Profile Information/
    assert_select "form[action=?]", user_registration_path
    assert_select "input[type=email]"
    assert_select "input[type=password]", minimum: 1
  end

  test "should not allow access to edit profile when not signed in" do
    get edit_user_registration_path
    assert_redirected_to new_user_session_path
  end

  test "should successfully update profile" do
    sign_in @user

    put user_registration_path, params: {
      user: {
        email: "updated@example.com",
        current_password: "password123"
      }
    }
    assert_redirected_to root_path
  end

  # ========== MAILER CONFIGURATION TESTS ==========

  test "should have correct mailer sender configuration" do
    # Check Devise mailer sender
    assert_equal "noreply@ytgify.com", Devise.mailer_sender
  end

  test "should have correct application mailer default from" do
    # Check ApplicationMailer default from
    assert_equal "ytgify <noreply@ytgify.com>", ApplicationMailer.default[:from]
  end

  # ========== RESPONSIVE DESIGN TESTS ==========

  test "login page should have mobile-friendly viewport" do
    get new_user_session_path
    assert_response :success
    # Check for responsive container classes
    assert_select ".max-w-md"
    assert_select ".px-4"
  end

  test "registration page should have mobile-friendly viewport" do
    get new_user_registration_path
    assert_response :success
    assert_select ".max-w-md"
    assert_select ".px-4"
  end

  test "reset password page should have mobile-friendly viewport" do
    raw_token, encrypted_token = Devise.token_generator.generate(User, :reset_password_token)
    @user.update_columns(
      reset_password_token: encrypted_token,
      reset_password_sent_at: Time.current
    )

    get edit_user_password_path(reset_password_token: raw_token)
    assert_response :success
    assert_select ".max-w-md"
    assert_select ".px-4"
  end

  # ========== ACCESSIBILITY TESTS ==========

  test "login form should have proper labels" do
    get new_user_session_path
    assert_response :success
    assert_select "label[for*=email]"
    assert_select "label[for*=password]"
  end

  test "registration form should have proper labels" do
    get new_user_registration_path
    assert_response :success
    assert_select "label[for*=email]"
    assert_select "label[for*=username]"
    assert_select "label[for*=password]", count: 2
  end

  test "reset password form should have proper labels" do
    raw_token, encrypted_token = Devise.token_generator.generate(User, :reset_password_token)
    @user.update_columns(
      reset_password_token: encrypted_token,
      reset_password_sent_at: Time.current
    )

    get edit_user_password_path(reset_password_token: raw_token)
    assert_response :success
    assert_select "label", minimum: 2
  end

  # ========== BRANDING TESTS ==========

  test "all auth pages should display ytgify branding" do
    pages = [
      new_user_session_path,
      new_user_registration_path,
      new_user_password_path
    ]

    pages.each do |path|
      get path
      assert_response :success
      assert_select "span", text: "ytgify"
    end
  end

  test "all auth pages should have Back to home link" do
    pages = [
      new_user_session_path,
      new_user_registration_path,
      new_user_password_path
    ]

    pages.each do |path|
      get path
      assert_response :success
      assert_select "a[href=?]", root_path, text: /Back to home/
    end
  end

  private

  def sign_in(user)
    post user_session_path, params: {
      user: {
        email: user.email,
        password: "password123"
      }
    }
  end
end
