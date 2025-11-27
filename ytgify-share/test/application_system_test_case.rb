require "test_helper"
require "capybara/rails"
require "playwright"

class ApplicationSystemTestCase < ActionDispatch::SystemTestCase
  # Load all fixtures for system tests
  fixtures :all

  # Use rack_test driver (Capybara will boot server based on config in test_helper.rb)
  # We use Playwright directly for browser automation instead of Rails default Selenium
  driven_by :rack_test

  # Playwright setup
  def setup
    super

    # Manually start Capybara server
    @capybara_server = Capybara::Server.new(Capybara.app, port: Capybara.server_port)
    @capybara_server.boot

    # Get the test server URL
    @test_server_url = "http://#{Capybara.server_host}:#{@capybara_server.port}"

    # Start Playwright
    @playwright = Playwright.create(playwright_cli_executable_path: 'npx playwright')
    @browser = @playwright.playwright.chromium.launch(
      headless: true,  # Set to false for debugging
      args: ['--disable-dev-shm-usage', '--no-sandbox']
    )

    # Create browser context with viewport
    @context = @browser.new_context(
      viewport: { width: 1400, height: 1400 },
      locale: 'en-US'
    )

    # Create page
    @page = @context.new_page
  end

  def teardown
    # Take screenshot on failure
    if !passed? && @page
      take_screenshot("failure-#{name}")
    end

    # Cleanup
    @page&.close
    @context&.close
    @browser&.close
    @playwright&.stop
    super
  end

  # Helper to access current page
  attr_reader :page

  # ========== NAVIGATION HELPERS ==========

  def visit(path)
    # Use Capybara's test server URL
    @page.goto("#{@test_server_url}#{path}")
    wait_for_page_load
  end

  def wait_for_page_load
    # Wait for page to be fully loaded including JavaScript
    @page.wait_for_load_state(state: 'domcontentloaded', timeout: 10000)
    @page.wait_for_load_state(state: 'networkidle', timeout: 10000)

    # Wait for Turbo to be ready
    begin
      @page.wait_for_function('() => window.Turbo !== undefined', timeout: 5000)
    rescue Playwright::TimeoutError
      # Turbo may not be loaded on all pages
    end
  end

  # ========== AUTHENTICATION HELPERS ==========

  def sign_in_as(user)
    visit new_user_session_path

    # Fill in form
    @page.fill('input[name="user[email]"]', user.email)
    @page.fill('input[name="user[password]"]', 'password123')

    # Submit form using requestSubmit which triggers all form events
    @page.expect_navigation do
      @page.evaluate('document.querySelector("form").requestSubmit()')
    end

    # Verify signed in
    assert_page_has_text user.username
  end

  def sign_out
    # Click account menu
    @page.click('button:has-text("Account")')

    # Click sign out link
    @page.click('a:has-text("Sign out")')

    wait_for_page_load
  end

  # ========== TURBO HELPERS ==========

  def wait_for_turbo
    # Wait for Turbo progress bar to disappear
    begin
      @page.wait_for_selector('.turbo-progress-bar', state: 'hidden', timeout: 5000)
    rescue Playwright::TimeoutError
      # Progress bar may not appear for fast requests
    end
  end

  def wait_for_stimulus(controller_name)
    @page.wait_for_selector("[data-controller='#{controller_name}']", timeout: 5000)
  end

  # ========== ASSERTION HELPERS ==========

  def assert_page_has_text(text)
    body_text = @page.text_content('body')
    assert body_text.include?(text),
           "Expected page to contain '#{text}', but page contains:\n#{body_text[0..500]}"
  end

  def assert_page_missing_text(text)
    body_text = @page.text_content('body')
    assert !body_text.include?(text),
           "Expected page NOT to contain '#{text}', but it was found"
  end

  def assert_current_path(expected_path)
    current_url = @page.url
    expected_url = "#{@test_server_url}#{expected_path}"

    assert_equal expected_url, current_url,
                 "Expected path to be '#{expected_path}', but was '#{current_url}'"
  end

  def assert_selector(selector, **options)
    timeout = options[:timeout] || 5000
    count = options[:count]

    if count
      elements = @page.query_selector_all(selector)
      assert_equal count, elements.length,
                   "Expected #{count} elements matching '#{selector}', found #{elements.length}"
    else
      element = @page.wait_for_selector(selector, timeout: timeout)
      assert_not_nil element, "Expected to find element matching '#{selector}'"
    end
  end

  def assert_no_selector(selector, **options)
    timeout = options[:timeout] || 1000

    begin
      @page.wait_for_selector(selector, state: 'hidden', timeout: timeout)
      # Element not found or hidden - good!
    rescue Playwright::TimeoutError
      # Element still visible - assertion failed
      flunk "Expected NOT to find element matching '#{selector}', but it was found"
    end
  end

  # ========== UTILITY HELPERS ==========

  def take_screenshot(name = "screenshot")
    FileUtils.mkdir_p('tmp/screenshots')
    timestamp = Time.now.strftime("%Y%m%d-%H%M%S")
    filename = "#{name}-#{timestamp}.png"
    @page.screenshot(path: "tmp/screenshots/#{filename}")
    puts "📸 Screenshot saved: tmp/screenshots/#{filename}"
  end

  def accept_confirm(&block)
    # Handle JavaScript confirm dialogs
    @page.once('dialog', ->(dialog) {
      dialog.accept
    })
    yield
  end

  def dismiss_confirm(&block)
    # Handle JavaScript confirm dialogs
    @page.once('dialog', ->(dialog) {
      dialog.dismiss
    })
    yield
  end

  # Check if test passed (for teardown)
  def passed?
    # In Minitest, check if the result has any failures or errors
    # failures and errors methods return arrays of failure objects
    passed = self.failures.empty?
    passed
  rescue => e
    # If we can't check (method not available), assume false to capture screenshot
    Rails.logger.debug "Could not check test status: #{e.message}"
    false
  end
end
