# High-Impact Test Plan to Reach 90% Coverage

**Current Coverage:** 52.13% (870/1669 lines)
**Target Coverage:** 90%+
**Gap:** +37.87% needed
**Estimated Time:** 3-4 hours

---

## Overview

This plan focuses on high-impact areas that will maximize coverage increase per test added. We'll target:

1. **Error Scenarios** (Est. +15% coverage) - 60 minutes
2. **Service Method Edge Cases** (Est. +12% coverage) - 45 minutes
3. **Model Validations & Callbacks** (Est. +10% coverage) - 45 minutes
4. **API Error Responses** (Est. +8% coverage) - 30 minutes

Total estimated coverage after implementation: **~87-95%**

---

## Phase 1: Error Scenario Tests (60 minutes, +15% coverage)

### 1.1 Controller Error Scenarios (30 minutes)

**Target Files:**
- `app/controllers/gifs_controller.rb`
- `app/controllers/comments_controller.rb`
- `app/controllers/collections_controller.rb`
- `app/controllers/follows_controller.rb`
- `app/controllers/likes_controller.rb`

**Tests to Add:**

#### GifsController Error Tests (`test/controllers/gifs_controller_test.rb`)
```ruby
# Authorization errors
test "should not allow editing other user's GIF"
test "should not allow deleting other user's GIF"
test "should redirect unauthenticated user from new GIF page"
test "should handle invalid GIF ID gracefully"

# Validation errors
test "should show validation errors when creating GIF without required fields"
test "should show validation errors with invalid YouTube URL"
test "should show validation errors when end_time < start_time"

# Edge cases
test "should handle GIF not found (deleted GIF)"
test "should handle concurrent updates gracefully"
```

#### CommentsController Error Tests (`test/controllers/comments_controller_test.rb`)
```ruby
# Authorization
test "should not allow editing other user's comment"
test "should not allow deleting other user's comment"
test "should require authentication to comment"

# Validation
test "should reject empty comment content"
test "should reject comment longer than max length"
test "should handle invalid parent_id for replies"

# Edge cases
test "should handle commenting on deleted GIF"
test "should handle replying to deleted comment"
```

#### CollectionsController Error Tests (`test/controllers/collections_controller_test.rb`)
```ruby
# Authorization
test "should not show private collection to non-owner"
test "should not allow editing other user's collection"
test "should require authentication to create collection"

# Validation
test "should reject collection without name"
test "should handle adding duplicate GIF to collection"
test "should handle adding deleted GIF to collection"

# Edge cases
test "should handle removing non-existent GIF from collection"
```

**Expected Coverage Increase:** +8%

---

### 1.2 API Controller Error Tests (30 minutes)

**Target Files:**
- `app/controllers/api/v1/auth_controller.rb`
- `app/controllers/api/v1/gifs_controller.rb`
- `app/controllers/api/v1/feed_controller.rb`

**Tests to Add:**

#### API Auth Error Tests (`test/controllers/api/v1/auth_controller_test.rb`)
```ruby
# Authentication failures
test "should return 401 with invalid credentials"
test "should return 401 with expired JWT token"
test "should return 401 with malformed JWT token"
test "should return 401 with missing Authorization header"

# Registration errors
test "should return 422 with duplicate username"
test "should return 422 with duplicate email"
test "should return 422 with invalid email format"
test "should return 422 with weak password"

# Token refresh errors
test "should return 401 when refreshing with invalid token"
test "should return 401 when refreshing with revoked JTI"
```

#### API GIFs Error Tests (`test/controllers/api/v1/gifs_controller_test.rb`)
```ruby
# Authorization
test "should return 403 when accessing private GIF"
test "should return 403 when updating other user's GIF"
test "should return 403 when deleting other user's GIF"

# Validation
test "should return 422 with invalid GIF data"
test "should return 422 with missing required fields"

# Not found
test "should return 404 for non-existent GIF"
test "should return 404 for deleted GIF"
```

#### API Feed Error Tests (`test/controllers/api/v1/feed_controller_test.rb`)
```ruby
# Authentication
test "should require authentication for personalized feed"
test "should allow public feed without authentication"

# Pagination errors
test "should handle invalid page parameter"
test "should handle invalid per_page parameter"

# Edge cases
test "should return empty array when no GIFs match filters"
test "should handle feed with all deleted GIFs"
```

**Expected Coverage Increase:** +7%

---

## Phase 2: Service Method Edge Cases (45 minutes, +12% coverage)

### 2.1 FeedService Tests (25 minutes)

**Target File:** `app/services/feed_service.rb`

**Current Coverage Gap:** Many edge cases untested

**Tests to Add** (`test/services/feed_service_test.rb`):

```ruby
class FeedServiceTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(username: "feeduser", email: "feed@test.com", password: "pass123", jti: SecureRandom.uuid)
  end

  # Personalized feed edge cases
  test "personalized feed returns empty when user follows no one"
  test "personalized feed falls back to trending when following users have no GIFs"
  test "personalized feed excludes deleted GIFs"
  test "personalized feed excludes private GIFs from followed users"

  # Trending feed edge cases
  test "trending returns empty when no GIFs have views"
  test "trending excludes deleted GIFs"
  test "trending caching works correctly"
  test "trending cache invalidates after expiry"

  # Following feed edge cases
  test "following feed returns empty when user follows no one"
  test "following feed includes only public GIFs"
  test "following feed orders by created_at desc"

  # Hashtag feed edge cases
  test "hashtag feed returns empty for non-existent hashtag"
  test "hashtag feed excludes deleted GIFs"
  test "hashtag feed excludes private GIFs"

  # Pagination edge cases
  test "handles page beyond available GIFs"
  test "handles negative page numbers"
  test "handles invalid per_page values"
  test "enforces maximum per_page limit"

  # Cache invalidation
  test "trending cache clears when new GIF created"
  test "hashtag cache clears when GIF tagged"
end
```

**Expected Coverage Increase:** +8%

---

### 2.2 NotificationService Tests (20 minutes)

**Target File:** `app/services/notification_service.rb`

**Tests to Add** (enhance `test/services/notification_service_test.rb`):

```ruby
class NotificationServiceTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(username: "notifuser", email: "notif@test.com", password: "pass123", jti: SecureRandom.uuid)
    @actor = User.create!(username: "actor", email: "actor@test.com", password: "pass123", jti: SecureRandom.uuid)
    @gif = Gif.create!(user: @user, title: "Test", youtube_url: "https://youtube.com/watch?v=test", start_time: 0, end_time: 5)
  end

  # Like notifications
  test "creates like notification"
  test "does not create like notification for own GIF"
  test "broadcasts like notification via ActionCable"
  test "handles failure to create like notification gracefully"

  # Comment notifications
  test "creates comment notification"
  test "does not create comment notification for own GIF"
  test "creates reply notification to comment author"
  test "does not create reply notification for self-reply"

  # Follow notifications
  test "creates follow notification"
  test "does not create follow notification for self-follow"
  test "broadcasts follow notification"

  # Collection notifications
  test "creates collection_add notification"
  test "does not create collection_add for own GIF"

  # Edge cases
  test "handles nil recipient gracefully"
  test "handles nil actor gracefully"
  test "handles ActionCable broadcast failure"
  test "does not create duplicate notifications"
  test "marks old notifications as read when limit exceeded"
end
```

**Expected Coverage Increase:** +4%

---

## Phase 3: Model Validations & Callbacks (45 minutes, +10% coverage)

### 3.1 Model Validation Tests (30 minutes)

**Target Models:**
- `User` (Devise validations)
- `Gif` (presence, format, custom validations)
- `Comment` (presence, length validations)
- `Collection` (presence, uniqueness)
- `Hashtag` (format, slug generation)

**Tests to Add:**

#### User Validation Tests (enhance `test/models/user_test.rb`)
```ruby
# Email validations
test "should require email"
test "should require valid email format"
test "should require unique email (case insensitive)"

# Username validations
test "should require username"
test "should require unique username (case insensitive)"
test "should reject username with special characters"
test "should reject username shorter than minimum"
test "should reject username longer than maximum"

# Password validations
test "should require password on create"
test "should require password minimum length"
test "should allow password update"

# Callbacks
test "should normalize username before save"
test "should generate JTI on create"
```

#### Gif Validation Tests (enhance `test/models/gif_test.rb`)
```ruby
# Required fields
test "should require user"
test "should require title"
test "should require youtube_url"
test "should require start_time"
test "should require end_time"

# Format validations
test "should validate youtube_url format"
test "should reject invalid youtube_url"

# Custom validations
test "should reject end_time before start_time"
test "should reject negative start_time"
test "should reject negative end_time"
test "should reject duration longer than max (e.g., 60 seconds)"

# Privacy validations
test "should default to public_access"
test "should accept valid privacy values"
test "should reject invalid privacy values"

# Callbacks
test "should soft delete instead of destroy"
test "should increment user gifs_count on create"
test "should decrement user gifs_count on destroy"
test "should clear caches after create"
test "should clear caches after update"
```

#### Comment Validation Tests (enhance `test/models/comment_test.rb`)
```ruby
# Required fields
test "should require user"
test "should require content"
test "should require commentable"

# Length validations
test "should reject empty content"
test "should reject content longer than max"

# Associations
test "should allow parent_id for replies"
test "should allow nil parent_id for top-level"
test "should reject invalid parent_id"

# Callbacks
test "should increment commentable comments_count"
test "should decrement commentable comments_count on destroy"
test "should soft delete instead of destroy"
```

#### Collection Validation Tests (enhance `test/models/collection_test.rb`)
```ruby
# Required fields
test "should require user"
test "should require name"

# Uniqueness
test "should require unique name per user"
test "should allow same name for different users"

# Privacy
test "should default to public_visibility"
test "should accept valid privacy values"

# Associations
test "should allow adding GIFs"
test "should prevent duplicate GIFs in collection"
test "should update gifs_count on add"
test "should update gifs_count on remove"
```

**Expected Coverage Increase:** +7%

---

### 3.2 Model Callback Tests (15 minutes)

**Tests to Add:**

```ruby
# Cache invalidation callbacks
test "GIF create clears feed caches"
test "GIF update clears feed caches"
test "Like create clears trending cache"
test "Hashtag update clears hashtag caches"

# Counter cache callbacks
test "Like increments gif likes_count"
test "Unlike decrements gif likes_count"
test "Follow increments user followers_count"
test "Unfollow decrements user followers_count"

# Notification callbacks
test "Like creates notification asynchronously"
test "Comment creates notification asynchronously"
test "Follow creates notification asynchronously"

# Soft delete callbacks
test "Gif soft delete sets deleted_at"
test "Comment soft delete sets deleted_at"
test "Soft deleted records excluded from default scope"
```

**Expected Coverage Increase:** +3%

---

## Phase 4: API Error Response Tests (30 minutes, +8% coverage)

### 4.1 HTTP Status Code Tests

**Tests to Add Across API Controllers:**

```ruby
# 401 Unauthorized
test "returns 401 with missing auth token"
test "returns 401 with invalid auth token"
test "returns 401 with expired auth token"

# 403 Forbidden
test "returns 403 when accessing other user's private resource"
test "returns 403 when updating other user's resource"
test "returns 403 when deleting other user's resource"

# 404 Not Found
test "returns 404 for non-existent resource"
test "returns 404 for deleted resource"
test "returns 404 for invalid UUID format"

# 422 Unprocessable Entity
test "returns 422 with validation errors"
test "returns 422 with missing required fields"
test "returns 422 with invalid data format"

# 500 Internal Server Error (rare, but worth testing)
test "handles database connection errors gracefully"
test "handles Redis connection errors gracefully"
```

**Expected Coverage Increase:** +5%

---

### 4.2 Error Response Format Tests

```ruby
# Consistent error format
test "error responses include 'error' key"
test "validation errors include 'errors' array"
test "error responses include appropriate status code"
test "error responses include helpful error messages"

# Multiple validation errors
test "returns all validation errors at once"
test "formats nested validation errors correctly"
```

**Expected Coverage Increase:** +3%

---

## Implementation Order

### Priority 1: Quick Wins (90 minutes)
1. **FeedService edge cases** (25 min) → +8% coverage
2. **Model validation tests** (30 min) → +7% coverage
3. **Controller error scenarios** (30 min) → +8% coverage
4. **API error responses** (5 min) → +5% coverage

**Checkpoint: Should reach ~80% coverage**

### Priority 2: Comprehensive Coverage (90 minutes)
5. **NotificationService tests** (20 min) → +4% coverage
6. **API controller errors** (30 min) → +7% coverage
7. **Model callback tests** (15 min) → +3% coverage
8. **Additional edge cases** (25 min) → +3% coverage

**Final Coverage: 87-95%**

---

## Testing Strategy

### For Each Test File:
1. **Read existing tests** - Understand coverage patterns
2. **Identify gaps** - What's not tested?
3. **Add error cases first** - Biggest coverage impact
4. **Add edge cases** - Boundary conditions
5. **Run tests** - Verify all pass
6. **Check coverage** - Measure improvement

### Code Quality Standards:
- ✅ All tests must pass
- ✅ Use descriptive test names
- ✅ Test one thing per test
- ✅ Use setup/teardown for DRY tests
- ✅ Use fixtures or factories consistently
- ✅ Mock external dependencies (S3, Redis when needed)

---

## Success Criteria

- [ ] Coverage reaches 90%+
- [ ] All 428+ tests passing
- [ ] No new test failures
- [ ] Coverage report shows green for all major files
- [ ] Error scenarios tested for all critical paths
- [ ] Edge cases covered for all services
- [ ] All validations tested (success + failure paths)
- [ ] All API endpoints return proper error codes

---

## Estimated Timeline

| Phase | Duration | Coverage Gain | Running Total |
|-------|----------|---------------|---------------|
| Start | - | - | 52% |
| FeedService Tests | 25 min | +8% | 60% |
| Model Validations | 30 min | +7% | 67% |
| Controller Errors | 30 min | +8% | 75% |
| API Error Responses | 5 min | +5% | 80% |
| **Checkpoint** | **90 min** | **+28%** | **80%** |
| NotificationService | 20 min | +4% | 84% |
| API Controller Errors | 30 min | +7% | 91% |
| Model Callbacks | 15 min | +3% | 94% |
| **Final** | **155 min** | **+42%** | **94%** |

---

## Next Steps After 90% Coverage

1. ✅ Run full test suite with coverage
2. ✅ Review coverage report for remaining gaps
3. ✅ Add any missing critical path tests
4. ✅ Update CI/CD to enforce 90% minimum
5. ✅ Document testing patterns for future development
6. ✅ Commit and push all test improvements

---

**Ready to implement!** 🚀

Starting with Priority 1 tests (90 minutes) to reach 80% coverage quickly.
