# System Tests (E2E)

## Overview

This directory contains end-to-end (e2e) system tests using Playwright for browser automation.

## Technology Stack

- **Rails 8** ActionDispatch::SystemTestCase
- **Playwright** (Ruby gem) - Modern browser automation
- **Chromium** - Headless browser
- **Capybara** - Test server management (Puma)

## Running Tests

```bash
# Run all system tests
bin/rails test test/system

# Run specific test file
bin/rails test test/system/smoke_test.rb

# Run specific test
bin/rails test test/system/smoke_test.rb -n test_can_visit_home_feed_page
```

## Test Infrastructure

### ApplicationSystemTestCase

Base class for all system tests providing:

**Navigation Helpers:**
- `visit(path)` - Navigate to a path
- `wait_for_page_load` - Wait for DOM content loaded

**Authentication Helpers:**
- `sign_in_as(user)` - Sign in as a user
- `sign_out` - Sign out current user

**Turbo Helpers:**
- `wait_for_turbo` - Wait for Turbo progress bar
- `wait_for_stimulus(controller_name)` - Wait for Stimulus controller

**Assertion Helpers:**
- `assert_page_has_text(text)` - Assert page contains text
- `assert_page_missing_text(text)` - Assert page doesn't contain text
- `assert_current_path(path)` - Assert current URL path
- `assert_selector(selector, **options)` - Assert element exists
- `assert_no_selector(selector, **options)` - Assert element doesn't exist

**Utility Helpers:**
- `take_screenshot(name)` - Take a screenshot (saved to tmp/screenshots/)
- `accept_confirm(&block)` - Accept JavaScript confirm dialog
- `dismiss_confirm(&block)` - Dismiss JavaScript confirm dialog

### Test Server

- **Server:** Puma (port 3001)
- **Boot:** Automatically via Capybara::Server
- **URL:** `http://localhost:3001`

## Fixtures

E2E test fixtures are defined in `test/fixtures/`:

- `e2e_test_user` - Main test user (email: e2e@example.com, password: password123)
- `e2e_follower` - Follower test user
- `e2e_public_gif` - Public GIF for testing browse/feed

## Screenshots

Screenshots are automatically saved to `tmp/screenshots/`:
- Intentional screenshots: Named by test (e.g., `smoke-test-home-feed-*.png`)
- Failure screenshots: Prefixed with `failure-` (only on test failures)

## Troubleshooting

### Server Not Booting

If tests fail with connection errors, ensure Capybara server is configured:
```ruby
# test/test_helper.rb
Capybara.run_server = true
Capybara.server = :puma, { Silent: true }
```

### Routes Not Working

Ensure server is manually booted in setup:
```ruby
@capybara_server = Capybara::Server.new(Capybara.app, port: Capybara.server_port)
@capybara_server.boot
```

### Playwright Errors

Reinstall Playwright browsers if needed:
```bash
npx playwright install chromium
```

## Current Test Coverage

### Phase 1.1: Infrastructure (✅ Complete)
- [x] Smoke tests (3 tests)
  - Home feed loads
  - Trending page loads
  - E2E GIF visible on feed

### Phase 1.2: Authentication Flow (Planned)
- [ ] Sign up flow
- [ ] Sign in flow
- [ ] Sign out flow

### Phase 1.3: Core GIF Upload Flow (Planned)
- [ ] GIF creation
- [ ] GIF visibility
- [ ] Privacy settings

## Implementation Notes

### Key Fix: Manual Server Boot

The critical fix for routing issues was manually booting the Capybara server:

```ruby
# test/application_system_test_case.rb
def setup
  super

  # Manually start Capybara server (rack_test driver doesn't boot HTTP server)
  @capybara_server = Capybara::Server.new(Capybara.app, port: Capybara.server_port)
  @capybara_server.boot

  @test_server_url = "http://#{Capybara.server_host}:#{@capybara_server.port}"

  # Then start Playwright...
end
```

This is necessary because `driven_by :rack_test` uses direct Rack requests (no HTTP server), but Playwright needs an actual HTTP server to connect to.
