# Phase 1.1: Infrastructure Setup - COMPLETE ✅

**Status:** ✅ Complete
**Duration:** ~2 hours (including troubleshooting)
**Date:** November 8, 2025

## Summary

Successfully implemented the foundational infrastructure for end-to-end (e2e) system tests using Playwright + Rails. All smoke tests passing.

## Completed Tasks

### 1. Dependencies Installed
- ✅ Playwright Ruby gem (`playwright-ruby-client`)
- ✅ Capybara gem for test server management
- ✅ npm dependencies (package.json created)
- ✅ Playwright browsers installed (Chromium)

### 2. Test Infrastructure Created
- ✅ `test/application_system_test_case.rb` - Base class with 20+ helper methods
- ✅ `test/test_helper.rb` - Capybara server configuration
- ✅ `test/system/` directory created
- ✅ `test/system/README.md` - Documentation

### 3. Test Fixtures
- ✅ E2E test users created
- ✅ E2E test GIF created
- ✅ Fixed JWT denylist duplicate JTI issue

### 4. Smoke Tests
- ✅ Home feed page loads (test/system/smoke_test.rb:4)
- ✅ Trending page loads (test/system/smoke_test.rb:15)
- ✅ E2E GIF visible on home page (test/system/smoke_test.rb:26)

**Test Results:**
```
3 runs, 5 assertions, 0 failures, 0 errors, 0 skips
Finished in 1.989s
```

## Key Technical Solutions

### Problem 1: Route Recognition Issues
**Symptom:** Test server was routing to `HomeController#index` (non-existent) instead of `HomeController#feed`

**Root Cause:** Using `driven_by :rack_test` doesn't boot an actual HTTP server - it makes direct Rack requests. Playwright needs a real HTTP server to connect to.

**Solution:** Manually boot Capybara server:
```ruby
def setup
  super

  # Manually start Capybara server
  @capybara_server = Capybara::Server.new(Capybara.app, port: Capybara.server_port)
  @capybara_server.boot

  @test_server_url = "http://#{Capybara.server_host}:#{@capybara_server.port}"

  # Then start Playwright...
end
```

### Problem 2: Playwright API Parameter Format
**Symptom:** `ArgumentError: wrong number of arguments (given 1, expected 0)` in `wait_for_load_state`

**Solution:** Use keyword arguments instead of positional:
```ruby
# Before: @page.wait_for_load_state('domcontentloaded', timeout: 10000)
# After:  @page.wait_for_load_state(state: 'domcontentloaded', timeout: 10000)
```

### Problem 3: Fixtures Not Loading
**Symptom:** `NoMethodError: undefined method 'gifs'`

**Solution:** Add `fixtures :all` to ApplicationSystemTestCase

### Problem 4: False Failure Screenshots
**Symptom:** Screenshots taken even when tests pass

**Solution:** Fix `passed?` method to check `self.failures.empty?`

## ApplicationSystemTestCase API

### Navigation
- `visit(path)` - Navigate to a path
- `wait_for_page_load` - Wait for DOM content loaded

### Authentication
- `sign_in_as(user)` - Sign in as a user
- `sign_out` - Sign out current user

### Turbo/Stimulus
- `wait_for_turbo` - Wait for Turbo progress bar
- `wait_for_stimulus(controller)` - Wait for Stimulus controller

### Assertions
- `assert_page_has_text(text)`
- `assert_page_missing_text(text)`
- `assert_current_path(path)`
- `assert_selector(selector, **options)`
- `assert_no_selector(selector, **options)`

### Utilities
- `take_screenshot(name)` - Save to tmp/screenshots/
- `accept_confirm(&block)` - Accept JS confirm
- `dismiss_confirm(&block)` - Dismiss JS confirm

## Files Modified/Created

**Created:**
- `test/application_system_test_case.rb` (193 lines)
- `test/system/smoke_test.rb` (38 lines)
- `test/system/README.md` (documentation)
- `package.json` (npm dependencies)
- `plans/E2E_PHASE1.1_COMPLETE.md` (this file)

**Modified:**
- `Gemfile` - Added capybara, playwright-ruby-client
- `test/test_helper.rb` - Added Capybara configuration
- `test/fixtures/users.yml` - Added e2e test users
- `test/fixtures/gifs.yml` - Added e2e test GIF
- `test/fixtures/jwt_denylists.yml` - Fixed duplicate JTI issue

## Test Server Configuration

- **Server:** Puma
- **Port:** 3001
- **Host:** localhost
- **URL:** http://localhost:3001
- **Boot:** Manual via `Capybara::Server.new().boot()`

## Screenshots

Screenshots are saved to `tmp/screenshots/` with timestamps:
- `smoke-test-home-feed-*.png`
- `smoke-test-trending-*.png`
- `smoke-test-e2e-gif-*.png`
- `failure-*-*.png` (only on failures)

## Next Steps

### Phase 1.2: Authentication Flow Tests (45 min)
- [ ] Sign up flow
- [ ] Sign in flow
- [ ] Sign out flow
- [ ] Password validation
- [ ] Username validation

### Phase 1.3: Core GIF Upload Flow (45 min)
- [ ] GIF creation
- [ ] GIF visibility
- [ ] Privacy settings
- [ ] Public/private/unlisted behavior

## Commands

```bash
# Run all system tests
bin/rails test test/system

# Run smoke tests
bin/rails test test/system/smoke_test.rb

# Run specific test
bin/rails test test/system/smoke_test.rb -n test_can_visit_home_feed_page

# Reinstall Playwright browsers
npx playwright install chromium
```

## Notes

- Tests run in single process (not parallel) due to Playwright setup
- Screenshots automatically saved on failures
- Server boots automatically when tests start
- Fixtures loaded via `fixtures :all`
- Test environment uses SQLite database (wiped between runs)

## Lessons Learned

1. **rack_test driver doesn't boot HTTP server** - Use manual Capybara::Server boot
2. **Playwright uses keyword args** - Always use `state:`, `timeout:` etc.
3. **Capybara server needs explicit configuration** - Set in test_helper.rb
4. **Screenshot on failure requires careful passed? check** - Use `self.failures.empty?`
5. **Browser automation is slower** - ~2s per test vs <0.1s for unit tests

## Resources

- [Playwright Ruby Documentation](https://playwright-ruby-client.vercel.app/)
- [Capybara Documentation](https://github.com/teamcapybara/capybara)
- [Rails System Testing Guide](https://guides.rubyonrails.org/testing.html#system-testing)
- [plans/SYSTEM_TESTS_PLAN.md](./SYSTEM_TESTS_PLAN.md) - Overall plan
