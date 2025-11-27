# Test Coverage Analysis - Detailed Implementation Plan

**Estimated Time:** 2-3 hours
**Goal:** Achieve 90%+ test coverage with SimpleCov, identify and fill critical gaps

---

## Current State Analysis

**Existing Tests:** 425 passing tests across:
- ✅ 10 Model tests (User, Gif, Comment, Like, Follow, etc.)
- ✅ 12 Controller tests (Web + API)
- ✅ 2 Service tests (FeedService, NotificationService)
- ✅ 1 Job test (RemixProcessingJob)
- ⚠️ 1 Channel test (stub only - NotificationChannel needs implementation)
- ❌ 0 System tests (end-to-end flows)

**Test Infrastructure:**
- Minitest (Rails default)
- Fixtures for test data
- JWT token helpers for API testing
- Parallel test execution enabled

**Estimated Current Coverage:** ~75-80%

---

## Phase 1: Install and Configure SimpleCov (15 minutes)

### Step 1.1: Add SimpleCov Gem

**File:** `Gemfile`

Add to the `test` group (around line 72):

```ruby
group :test do
  gem 'simplecov', require: false
  gem 'simplecov-html', require: false
end
```

**Install:**
```bash
cd /Users/jeremywatt/Desktop/ytgify-share
bundle install
```

### Step 1.2: Configure SimpleCov

**File:** `test/test_helper.rb`

Add at the **very top** (before line 1):

```ruby
# SimpleCov must be loaded before application code
if ENV['COVERAGE']
  require 'simplecov'

  SimpleCov.start 'rails' do
    # Filters (exclude from coverage)
    add_filter '/test/'
    add_filter '/config/'
    add_filter '/vendor/'
    add_filter '/db/'

    # Groups for organized reporting
    add_group 'Models', 'app/models'
    add_group 'Controllers', 'app/controllers'
    add_group 'API Controllers', 'app/controllers/api'
    add_group 'Services', 'app/services'
    add_group 'Channels', 'app/channels'
    add_group 'Jobs', 'app/jobs'
    add_group 'Helpers', 'app/helpers'

    # Coverage targets
    minimum_coverage 90
    minimum_coverage_by_file 75

    # Track file changes
    track_files '{app,lib}/**/*.rb'
  end

  puts "SimpleCov enabled - generating coverage report..."
end

ENV["RAILS_ENV"] ||= "test"
# ... rest of existing file
```

### Step 1.3: Run Initial Coverage Report

```bash
# Run with coverage enabled
COVERAGE=true bin/rails test

# Open report
open coverage/index.html
```

**What to Look For:**
- Overall coverage percentage (expect ~75-80%)
- Files with < 75% coverage (red/yellow)
- Untested lines (highlighted in report)
- Branch coverage gaps

---

## Phase 2: Analyze Coverage Gaps (30 minutes)

### Step 2.1: Document Current Coverage

Create a coverage baseline document:

**File:** `test/COVERAGE_BASELINE.md`

```markdown
# Test Coverage Baseline Report

**Generated:** [Date]
**Overall Coverage:** X%

## Coverage by Component

| Component | Files | Coverage | Status |
|-----------|-------|----------|--------|
| Models | 11 | X% | ✅/⚠️/❌ |
| Controllers (Web) | 8 | X% | ✅/⚠️/❌ |
| Controllers (API) | 9 | X% | ✅/⚠️/❌ |
| Services | 2 | X% | ✅/⚠️/❌ |
| Channels | 2 | X% | ✅/⚠️/❌ |
| Jobs | 1 | X% | ✅/⚠️/❌ |
| Helpers | 2 | X% | ✅/⚠️/❌ |

## Files Below 75% Coverage

### Critical (< 50%)
1. **app/channels/notification_channel.rb** (0%)
   - Reason: No tests exist, only stub
   - Priority: HIGH
   - Lines: 1-20

2. **app/controllers/api/v1/feed_controller.rb** (X%)
   - Missing: Error handling, pagination edge cases
   - Priority: HIGH
   - Lines: X, Y, Z

### Moderate (50-75%)
1. **app/controllers/remixes_controller.rb** (X%)
   - Missing: Edge cases for invalid GIFs
   - Priority: MEDIUM

## Untested Critical Paths

### Authentication
- [ ] JWT token expiration handling
- [ ] Invalid token format
- [ ] Missing authorization header
- [ ] Token refresh with invalid refresh token

### API Endpoints
- [ ] Feed API - all endpoints untested
- [ ] Collections API - incomplete tests
- [ ] Follows API - missing tests

### Error Scenarios
- [ ] 404 Not Found responses
- [ ] 403 Forbidden (non-owner attempts)
- [ ] 422 Validation errors
- [ ] Rate limiting responses (429)

### Edge Cases
- [ ] Pagination boundary conditions (page 0, page 999999)
- [ ] Empty result sets
- [ ] Null/nil parameter handling
- [ ] SQL injection attempts (should be safe with ActiveRecord)
- [ ] XSS attempts in user input

## Action Items (Priority Order)

### Priority 1: Critical Gaps (Must Fix)
1. Add NotificationChannel tests (ActionCable)
2. Add FeedController API tests
3. Add JWT error handling tests
4. Add Collections API tests

### Priority 2: Error Coverage (Should Fix)
1. Add 404/403/422 response tests across controllers
2. Add pagination edge case tests
3. Add validation error tests

### Priority 3: Nice to Have (Optional)
1. Add performance benchmarks
2. Add security-specific tests
3. Add concurrent request tests
```

### Step 2.2: Identify Top 10 Gap Files

Run coverage and list files by lowest coverage:

```bash
COVERAGE=true bin/rails test 2>&1 | grep -A 100 "Coverage report"
```

**Expected Gap Files:**
1. `app/channels/notification_channel.rb` - 0% (stub only)
2. `app/channels/application_cable/connection.rb` - Low%
3. `app/controllers/api/v1/feed_controller.rb` - No tests
4. `app/controllers/api/v1/collections_controller.rb` - Partial tests
5. `app/controllers/api/v1/follows_controller.rb` - No tests
6. `app/helpers/application_helper.rb` - Low%
7. `app/jobs/remix_processing_job.rb` - Basic test only
8. `app/services/feed_service.rb` - Good, but missing edge cases
9. `app/services/notification_service.rb` - Good, but missing edge cases
10. Various controllers - missing error scenario tests

---

## Phase 3: Fill Critical Coverage Gaps (60-90 minutes)

### Step 3.1: NotificationChannel Tests (20 minutes)

**Priority:** CRITICAL - ActionCable is a key feature

**File:** `test/channels/notification_channel_test.rb`

Replace stub with comprehensive tests:

```ruby
require "test_helper"

class NotificationChannelTest < ActionCable::Channel::TestCase
  fixtures :users, :notifications

  setup do
    @user = users(:one)
  end

  test "subscribes to user's notification stream" do
    subscribe user_id: @user.id

    assert subscription.confirmed?
    assert_has_stream "notifications:#{@user.id}"
  end

  test "rejects subscription without user_id" do
    subscribe

    assert subscription.rejected?
  end

  test "rejects subscription with invalid user_id" do
    subscribe user_id: "invalid-uuid"

    assert subscription.rejected?
  end

  test "rejects subscription for non-existent user" do
    subscribe user_id: SecureRandom.uuid

    assert subscription.rejected?
  end

  test "broadcasts notification to subscribed user" do
    subscribe user_id: @user.id

    notification = notifications(:one)

    # Simulate broadcast
    perform_enqueued_jobs do
      ActionCable.server.broadcast(
        "notifications:#{@user.id}",
        {
          id: notification.id,
          action: notification.action,
          message: "Test notification",
          created_at: notification.created_at
        }
      )
    end

    # Verify broadcast was received
    assert_broadcast_on("notifications:#{@user.id}") do
      ActionCable.server.broadcast(
        "notifications:#{@user.id}",
        { test: "data" }
      )
    end
  end

  test "unsubscribes cleanly" do
    subscribe user_id: @user.id

    assert subscription.confirmed?

    unsubscribe

    refute subscription.confirmed?
  end
end
```

**Note:** If NotificationChannel doesn't exist, create it first:

**File:** `app/channels/notification_channel.rb`

```ruby
class NotificationChannel < ApplicationCable::Channel
  def subscribed
    user_id = params[:user_id]

    if user_id.present? && User.exists?(id: user_id)
      stream_from "notifications:#{user_id}"
    else
      reject
    end
  end

  def unsubscribed
    stop_all_streams
  end
end
```

### Step 3.2: FeedController API Tests (25 minutes)

**Priority:** HIGH - Feed is core functionality

**File:** `test/controllers/api/v1/feed_controller_test.rb` (NEW)

```ruby
require "test_helper"

module Api
  module V1
    class FeedControllerTest < ActionDispatch::IntegrationTest
      fixtures :users, :gifs, :follows

      setup do
        @user = users(:one)
        @other_user = users(:two)
        @auth_headers = {
          "Authorization" => "Bearer #{generate_jwt_token(@user)}"
        }
      end

      # Public Feed Tests
      test "should get public feed without auth" do
        get api_v1_feed_public_path, as: :json

        assert_response :success
        json = JSON.parse(response.body)
        assert json.key?("gifs")
        assert json["gifs"].is_a?(Array)
      end

      test "should paginate public feed" do
        get api_v1_feed_public_path, params: { page: 1, per_page: 5 }, as: :json

        assert_response :success
        json = JSON.parse(response.body)
        assert json["gifs"].length <= 5
        assert json.key?("pagination")
      end

      # Trending Feed Tests
      test "should get trending feed" do
        get api_v1_feed_trending_path, as: :json

        assert_response :success
        json = JSON.parse(response.body)
        assert json.key?("gifs")
      end

      # Recent Feed Tests
      test "should get recent feed" do
        get api_v1_feed_recent_path, as: :json

        assert_response :success
        json = JSON.parse(response.body)
        assert json.key?("gifs")
      end

      # Popular Feed Tests
      test "should get popular feed" do
        get api_v1_feed_popular_path, as: :json

        assert_response :success
        json = JSON.parse(response.body)
        assert json.key?("gifs")
      end

      # Personalized Feed Tests (Auth Required)
      test "should get personalized feed with auth" do
        get api_v1_feed_path, headers: @auth_headers, as: :json

        assert_response :success
        json = JSON.parse(response.body)
        assert json.key?("gifs")
      end

      test "should reject personalized feed without auth" do
        get api_v1_feed_path, as: :json

        assert_response :unauthorized
      end

      # Following Feed Tests (Auth Required)
      test "should get following feed with auth" do
        # Create a follow relationship
        Follow.create!(follower: @user, followee: @other_user)

        get api_v1_feed_following_path, headers: @auth_headers, as: :json

        assert_response :success
        json = JSON.parse(response.body)
        assert json.key?("gifs")
      end

      test "should return empty following feed when not following anyone" do
        Follow.where(follower: @user).destroy_all

        get api_v1_feed_following_path, headers: @auth_headers, as: :json

        assert_response :success
        json = JSON.parse(response.body)
        assert_equal 0, json["gifs"].length
      end

      test "should reject following feed without auth" do
        get api_v1_feed_following_path, as: :json

        assert_response :unauthorized
      end

      # Pagination Edge Cases
      test "should handle page 0 gracefully" do
        get api_v1_feed_public_path, params: { page: 0 }, as: :json

        assert_response :success
      end

      test "should handle very high page numbers" do
        get api_v1_feed_public_path, params: { page: 9999 }, as: :json

        assert_response :success
        json = JSON.parse(response.body)
        assert_equal 0, json["gifs"].length
      end

      test "should enforce per_page limits" do
        get api_v1_feed_public_path, params: { per_page: 1000 }, as: :json

        assert_response :success
        json = JSON.parse(response.body)
        assert json["gifs"].length <= 100 # Assuming max of 100
      end

      # Cache Tests (if caching implemented)
      test "should return cached results" do
        # First request (cache miss)
        get api_v1_feed_trending_path, as: :json
        assert_response :success

        # Second request (cache hit - should be faster)
        get api_v1_feed_trending_path, as: :json
        assert_response :success
      end
    end
  end
end
```

### Step 3.3: Collections API Tests (20 minutes)

**Priority:** HIGH - Collections are a major feature

**File:** `test/controllers/api/v1/collections_controller_test.rb`

Add missing tests to existing file:

```ruby
# Add these tests to the existing file

test "should not show private collection to non-owner" do
  collection = collections(:private_collection)
  other_user = users(:two)

  get api_v1_collection_path(collection),
      headers: { "Authorization" => "Bearer #{generate_jwt_token(other_user)}" },
      as: :json

  assert_response :forbidden
end

test "should reorder gifs in collection" do
  collection = collections(:one)
  gif1 = gifs(:alice_public_gif)
  gif2 = gifs(:bob_public_gif)

  # Add GIFs to collection
  collection.gifs << [gif1, gif2]

  # Reorder
  patch reorder_api_v1_collection_path(collection),
        params: { gif_ids: [gif2.id, gif1.id] },
        headers: @auth_headers,
        as: :json

  assert_response :success

  # Verify order
  collection.reload
  assert_equal [gif2.id, gif1.id], collection.collection_gifs.order(:position).pluck(:gif_id)
end

test "should validate collection privacy values" do
  post api_v1_collections_path,
       params: { collection: { name: "Test", is_public: "invalid" } },
       headers: @auth_headers,
       as: :json

  assert_response :unprocessable_entity
end

test "should limit collection name length" do
  long_name = "a" * 256

  post api_v1_collections_path,
       params: { collection: { name: long_name } },
       headers: @auth_headers,
       as: :json

  assert_response :unprocessable_entity
  json = JSON.parse(response.body)
  assert json["errors"]["name"].present?
end
```

### Step 3.4: Follows API Tests (15 minutes)

**Priority:** MEDIUM - Social features

**File:** `test/controllers/api/v1/follows_controller_test.rb` (NEW)

```ruby
require "test_helper"

module Api
  module V1
    class FollowsControllerTest < ActionDispatch::IntegrationTest
      fixtures :users, :follows

      setup do
        @user = users(:one)
        @other_user = users(:two)
        @auth_headers = {
          "Authorization" => "Bearer #{generate_jwt_token(@user)}"
        }
      end

      test "should follow user" do
        assert_difference('Follow.count', 1) do
          post follow_api_v1_user_path(@other_user),
               headers: @auth_headers,
               as: :json
        end

        assert_response :success
        json = JSON.parse(response.body)
        assert json["following"]
        assert_equal 1, json["follower_count"]
      end

      test "should unfollow user" do
        Follow.create!(follower: @user, followee: @other_user)

        assert_difference('Follow.count', -1) do
          delete unfollow_api_v1_user_path(@other_user),
                 headers: @auth_headers,
                 as: :json
        end

        assert_response :success
        json = JSON.parse(response.body)
        refute json["following"]
      end

      test "should not follow yourself" do
        post follow_api_v1_user_path(@user),
             headers: @auth_headers,
             as: :json

        assert_response :unprocessable_entity
      end

      test "should list followers" do
        Follow.create!(follower: @other_user, followee: @user)

        get followers_api_v1_user_path(@user),
            headers: @auth_headers,
            as: :json

        assert_response :success
        json = JSON.parse(response.body)
        assert json["users"].is_a?(Array)
        assert json["users"].any? { |u| u["id"] == @other_user.id }
      end

      test "should list following" do
        Follow.create!(follower: @user, followee: @other_user)

        get following_api_v1_user_path(@user),
            headers: @auth_headers,
            as: :json

        assert_response :success
        json = JSON.parse(response.body)
        assert json["users"].is_a?(Array)
        assert json["users"].any? { |u| u["id"] == @other_user.id }
      end

      test "should require auth for follow" do
        post follow_api_v1_user_path(@other_user), as: :json

        assert_response :unauthorized
      end
    end
  end
end
```

### Step 3.5: JWT Authentication Error Tests (10 minutes)

**Priority:** CRITICAL - Security

**File:** `test/controllers/api/v1/auth_controller_test.rb`

Add to existing file:

```ruby
# Add these error scenario tests

test "should reject expired token" do
  expired_payload = {
    sub: @user.id,
    jti: @user.jti,
    exp: 1.hour.ago.to_i  # Expired
  }
  expired_token = JWT.encode(expired_payload, ENV.fetch('JWT_SECRET_KEY', 'changeme'))

  get api_v1_auth_me_path,
      headers: { "Authorization" => "Bearer #{expired_token}" },
      as: :json

  assert_response :unauthorized
  json = JSON.parse(response.body)
  assert_includes json["error"].downcase, "expired"
end

test "should reject invalid token format" do
  get api_v1_auth_me_path,
      headers: { "Authorization" => "Bearer invalid.token.here" },
      as: :json

  assert_response :unauthorized
end

test "should reject missing authorization header" do
  get api_v1_auth_me_path, as: :json

  assert_response :unauthorized
end

test "should reject token with invalid signature" do
  payload = { sub: @user.id, jti: @user.jti, exp: 15.minutes.from_now.to_i }
  tampered_token = JWT.encode(payload, "wrong-secret-key")

  get api_v1_auth_me_path,
      headers: { "Authorization" => "Bearer #{tampered_token}" },
      as: :json

  assert_response :unauthorized
end

test "should reject denylisted token" do
  token = generate_jwt_token(@user)

  # Add token to denylist
  decoded = JWT.decode(token, ENV.fetch('JWT_SECRET_KEY', 'changeme')).first
  JWTDenylist.create!(jti: decoded['jti'], exp: Time.at(decoded['exp']))

  get api_v1_auth_me_path,
      headers: { "Authorization" => "Bearer #{token}" },
      as: :json

  assert_response :unauthorized
end

test "should refresh token with valid refresh token" do
  # Assuming refresh endpoint exists
  post api_v1_auth_refresh_path,
       params: { refresh_token: @user.jti },
       as: :json

  assert_response :success
  json = JSON.parse(response.body)
  assert json["token"].present?
end
```

---

## Phase 4: Edge Case and Error Coverage (20-30 minutes)

### Step 4.1: Add Generic Error Scenario Tests

Create a shared test module for common error scenarios:

**File:** `test/support/api_error_scenarios.rb` (NEW)

```ruby
module ApiErrorScenarios
  extend ActiveSupport::Concern

  included do
    # Test 404 Not Found
    def assert_returns_404_for_invalid_id(path_method, **params)
      invalid_id = SecureRandom.uuid

      get send(path_method, invalid_id, **params),
          headers: @auth_headers,
          as: :json

      assert_response :not_found
    end

    # Test 403 Forbidden (non-owner)
    def assert_returns_403_for_non_owner(path_method, resource, **params)
      other_user = users(:two)
      other_auth = { "Authorization" => "Bearer #{generate_jwt_token(other_user)}" }

      patch send(path_method, resource, **params),
            headers: other_auth,
            as: :json

      assert_response :forbidden
    end

    # Test 422 Validation Errors
    def assert_returns_422_for_invalid_params(path_method, **params)
      post send(path_method, **params),
           headers: @auth_headers,
           as: :json

      assert_response :unprocessable_entity
      json = JSON.parse(response.body)
      assert json.key?("errors")
    end

    # Test pagination edge cases
    def assert_handles_pagination_edges(path_method, **params)
      # Page 0
      get send(path_method, **params.merge(page: 0)), as: :json
      assert_response :success

      # Very high page
      get send(path_method, **params.merge(page: 9999)), as: :json
      assert_response :success

      # Negative page (should default to 1)
      get send(path_method, **params.merge(page: -1)), as: :json
      assert_response :success

      # Invalid per_page (should use default)
      get send(path_method, **params.merge(per_page: "invalid")), as: :json
      assert_response :success
    end
  end
end
```

**File:** `test/test_helper.rb`

Add near the bottom:

```ruby
# Load support files
Dir[Rails.root.join('test', 'support', '**', '*.rb')].each { |f| require f }
```

### Step 4.2: Apply Error Scenarios to Controllers

Update existing controller tests to include shared error tests:

```ruby
# Example: test/controllers/api/v1/gifs_controller_test.rb

class GifsControllerTest < ActionDispatch::IntegrationTest
  include ApiErrorScenarios  # Add this

  # ... existing tests ...

  test "should return 404 for invalid gif id" do
    assert_returns_404_for_invalid_id(:api_v1_gif_path)
  end

  test "should return 403 when non-owner tries to update" do
    assert_returns_403_for_non_owner(:api_v1_gif_path, @gif)
  end

  test "should return 422 for invalid gif params" do
    assert_returns_422_for_invalid_params(:api_v1_gifs_path, gif: { title: "" })
  end

  test "should handle pagination edge cases" do
    assert_handles_pagination_edges(:api_v1_gifs_path)
  end
end
```

---

## Phase 5: Re-Run Coverage and Document (10-15 minutes)

### Step 5.1: Run Full Coverage Report

```bash
# Clean previous coverage
rm -rf coverage

# Run with coverage
COVERAGE=true bin/rails test

# Open report
open coverage/index.html
```

### Step 5.2: Create Final Coverage Report

**File:** `test/COVERAGE_REPORT.md`

```markdown
# Test Coverage Report - Final

**Generated:** [Date]
**Overall Coverage:** X.X%
**Target:** 90%
**Status:** ✅ PASS / ⚠️ CLOSE / ❌ FAIL

---

## Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Overall Coverage | X.X% | 90% | ✅/❌ |
| Line Coverage | X.X% | 90% | ✅/❌ |
| Branch Coverage | X.X% | 80% | ✅/❌ |
| Files < 75% | X | 0 | ✅/❌ |

---

## Coverage by Component

| Component | Files | Lines | Coverage | Change | Status |
|-----------|-------|-------|----------|--------|--------|
| Models | 11 | XXX | XX% | +X% | ✅ |
| Web Controllers | 8 | XXX | XX% | +X% | ✅ |
| API Controllers | 9 | XXX | XX% | +X% | ✅ |
| Services | 2 | XXX | XX% | +X% | ✅ |
| Channels | 2 | XXX | XX% | +X% | ✅ |
| Jobs | 1 | XXX | XX% | +X% | ✅ |
| Helpers | 2 | XXX | XX% | +X% | ✅ |

---

## Tests Added This Session

### New Test Files (X files)
1. `test/controllers/api/v1/feed_controller_test.rb` - 15 tests
2. `test/controllers/api/v1/follows_controller_test.rb` - 10 tests
3. `test/support/api_error_scenarios.rb` - Shared test utilities

### Enhanced Test Files (X files)
1. `test/channels/notification_channel_test.rb` - +6 tests
2. `test/controllers/api/v1/collections_controller_test.rb` - +4 tests
3. `test/controllers/api/v1/auth_controller_test.rb` - +5 tests
4. `test/controllers/api/v1/gifs_controller_test.rb` - +4 tests

**Total New Tests:** XX
**Total Tests Now:** 425 + XX = XXX

---

## Remaining Gaps (If Any)

### Files Still Below Target

#### Low Priority (< 90% but > 75%)
1. **app/helpers/application_helper.rb** (XX%)
   - Missing: Edge cases for helper methods
   - Impact: Low (helpers are simple)
   - Action: Optional enhancement

### Untested Edge Cases

1. **Concurrent Requests**
   - Multiple users liking same GIF simultaneously
   - Race conditions in counter caches
   - Impact: Low (ActiveRecord handles atomicity)

2. **Performance/Load**
   - Response times under load
   - Memory usage with large datasets
   - Impact: Low (not a test coverage concern)

3. **Browser/System Tests**
   - End-to-end user workflows
   - JavaScript interactions
   - Covered in separate System Tests plan

---

## Recommendations

### Achieved ✅
- [x] 90%+ overall coverage
- [x] All critical paths tested
- [x] API authentication fully tested
- [x] Error scenarios covered
- [x] Edge cases handled

### Optional Enhancements
- [ ] Add mutation testing (checks test quality)
- [ ] Add coverage for Rack middleware
- [ ] Add security-specific tests (SQL injection, XSS)
- [ ] Add performance benchmarks

---

## Maintenance

**Run coverage regularly:**
```bash
# Weekly coverage check
COVERAGE=true bin/rails test

# CI/CD integration
# Add to .github/workflows/test.yml:
# - name: Run tests with coverage
#   run: COVERAGE=true bin/rails test
# - name: Upload coverage
#   uses: codecov/codecov-action@v3
```

**Coverage thresholds:**
- Fail if overall coverage drops below 85%
- Warn if any file drops below 70%
- Require 90%+ for new files

---

## Conclusion

Test coverage analysis complete! The application now has comprehensive test coverage across all critical components including:

- ✅ Complete API authentication testing (JWT, sessions)
- ✅ All API endpoints covered
- ✅ Error scenarios and edge cases
- ✅ ActionCable/real-time features
- ✅ Service layer and background jobs

**Ready for:** Production deployment, CI/CD integration, and ongoing development with confidence.
```

---

## Phase 6: CI/CD Integration (Optional - 10 minutes)

### Step 6.1: Add Coverage to GitHub Actions

**File:** `.github/workflows/test.yml` (if it exists, or create)

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: 3.4.5
          bundler-cache: true

      - name: Setup Database
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ytgify_test
          RAILS_ENV: test
        run: |
          bin/rails db:create db:migrate

      - name: Run tests with coverage
        env:
          COVERAGE: true
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ytgify_test
          REDIS_URL: redis://localhost:6379/0
          RAILS_ENV: test
        run: bin/rails test

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/.resultset.json
          fail_ci_if_error: true
          verbose: true

      - name: Check coverage threshold
        run: |
          COVERAGE=$(grep -oP "(?<=covered_percent\": )[0-9.]+" coverage/.resultset.json | head -1)
          echo "Coverage: $COVERAGE%"
          if (( $(echo "$COVERAGE < 90" | bc -l) )); then
            echo "Coverage is below 90%"
            exit 1
          fi
```

---

## Quick Reference Commands

```bash
# Install SimpleCov
bundle add simplecov simplecov-html --group test

# Run with coverage
COVERAGE=true bin/rails test

# Run specific test with coverage
COVERAGE=true bin/rails test test/controllers/api/v1/feed_controller_test.rb

# View coverage report
open coverage/index.html

# Sequential mode (safer on macOS)
COVERAGE=true PARALLEL_WORKERS=0 bin/rails test

# Coverage with verbose output
COVERAGE=true bin/rails test --verbose
```

---

## Success Criteria

✅ **Coverage Goals:**
- Overall coverage ≥ 90%
- All files ≥ 75%
- Critical paths (auth, API) ≥ 95%

✅ **Tests Added:**
- NotificationChannel fully tested
- All API controllers have error scenario tests
- JWT authentication edge cases covered
- Pagination edge cases handled

✅ **Documentation:**
- Baseline report created
- Final report with metrics
- Gaps identified and prioritized
- Maintenance plan documented

✅ **CI/CD:**
- Coverage runs automatically
- Thresholds enforced
- Reports uploaded to Codecov

---

**Estimated Total Time:** 2-3 hours

**Breakdown:**
- Phase 1 (Setup): 15 min
- Phase 2 (Analysis): 30 min
- Phase 3 (Critical Gaps): 90 min
- Phase 4 (Edge Cases): 30 min
- Phase 5 (Report): 15 min
- Phase 6 (CI/CD): 10 min (optional)
