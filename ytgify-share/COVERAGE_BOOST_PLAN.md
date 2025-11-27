# Detailed Plan to Reach 90% Test Coverage

**Current:** 56.77% (918/1617 lines)
**Target:** 90%
**Gap:** +33.23% (~537 lines)
**Tests:** 553 → Target: ~750-800

---

## Phase 1: Model Validations (Est. +8% coverage, 90 mins)

### 1.1 Comment Model Tests (30 mins, +3%)
**File:** `test/models/comment_test.rb`

**Tests to Add:**
```ruby
# Validations (10 tests)
- should require user
- should require content
- should require commentable
- should reject empty content
- should reject content longer than 2000 chars
- should accept content at max length
- should accept nil parent_id (top-level comment)
- should accept valid parent_id (reply)
- should reject invalid parent_id
- should validate parent belongs to same commentable

# Associations (5 tests)
- should belong to user
- should belong to commentable (polymorphic)
- should have many replies
- should belong to parent comment
- should destroy replies when parent destroyed

# Scopes (3 tests)
- top_level scope returns only comments without parent
- replies scope returns only comments with parent
- recent scope orders by created_at desc

# Callbacks (2 tests)
- should increment commentable comments_count on create
- should decrement commentable comments_count on destroy
```

**Expected Coverage:** Comment model: 0% → 85%

---

### 1.2 Collection Model Tests (25 mins, +2%)
**File:** `test/models/collection_test.rb`

**Tests to Add:**
```ruby
# Validations (8 tests)
- should require user
- should require name
- should require unique name per user
- should allow same name for different users
- should reject name longer than 100 chars
- should accept name at max length
- should reject description longer than 500 chars
- should accept description at max length

# Privacy enum (3 tests)
- should default to public_visibility
- should accept all privacy values (public, private, unlisted)
- should reject invalid privacy values

# Associations (4 tests)
- should have many collection_gifs
- should have many gifs through collection_gifs
- should destroy collection_gifs on destroy
- should update gifs_count on add/remove

# Instance methods (3 tests)
- gifs_count reflects actual count
- can add gif to collection
- prevents duplicate gifs in collection
```

**Expected Coverage:** Collection model: 0% → 80%

---

### 1.3 Notification Model Tests (20 mins, +2%)
**File:** `test/models/notification_test.rb`

**Tests to Add:**
```ruby
# Validations (5 tests)
- should require recipient
- should require actor
- should require notifiable
- should require action
- should reject invalid action values

# Polymorphic associations (3 tests)
- should belong to recipient (User)
- should belong to actor (User)
- should belong to notifiable (polymorphic)

# Scopes (4 tests)
- unread scope returns only unread notifications
- read scope returns only read notifications
- recent scope orders by created_at desc
- by_action scope filters by action type

# Instance methods (3 tests)
- mark_as_read! sets read_at
- mark_as_unread! clears read_at
- read? returns true when read_at present
```

**Expected Coverage:** Notification model: ~40% → 90%

---

### 1.4 Smaller Model Tests (15 mins, +1%)
**Files:** `test/models/{hashtag,like,follow}_test.rb`

**Hashtag (5 tests):**
- should require name and slug
- should auto-generate slug from name
- should increment usage_count
- should normalize name to lowercase
- should reject duplicate slug

**Like (4 tests):**
- should require user and gif
- should prevent duplicate likes (unique index)
- should increment gif like_count
- should decrement gif like_count on destroy

**Follow (4 tests):**
- should require follower and following
- should prevent self-follows
- should prevent duplicate follows
- should update follower/following counts

**Expected Coverage:** +1% across small models

---

## Phase 2: Service Error Handling (Est. +6% coverage, 60 mins)

### 2.1 NotificationService Error Tests (30 mins, +3%)
**File:** `test/services/notification_service_test.rb` (enhance existing)

**Tests to Add:**
```ruby
# Error handling (10 tests)
- handles nil recipient gracefully
- handles nil actor gracefully
- handles nil notifiable gracefully
- handles invalid action gracefully
- handles ActionCable broadcast failure
- handles database save failure
- handles transaction rollback
- does not create duplicate notifications
- handles missing user associations
- handles deleted users

# Edge cases (8 tests)
- does not notify for own actions (self-like, self-follow)
- does not notify for private GIF interactions
- does not notify deleted users
- handles notification limit (max 1000 per user)
- marks old notifications as read when limit exceeded
- handles concurrent notification creation
- handles orphaned notifiables (deleted GIF)
- respects user notification preferences

# Broadcast edge cases (4 tests)
- broadcasts to correct channel
- handles offline users
- handles rate limiting
- handles large notification payloads
```

**Expected Coverage:** NotificationService: 65% → 95%

---

### 2.2 FeedService Error Tests (15 mins, +1.5%)
**File:** `test/services/feed_service_test.rb` (enhance existing)

**Additional Tests:**
```ruby
# Error handling (6 tests)
- handles nil user gracefully
- handles deleted users
- handles empty following list
- handles all private/deleted GIFs
- handles invalid page numbers (0, negative)
- handles very large per_page values (SQL injection prevention)

# Cache edge cases (4 tests)
- handles Redis connection failure gracefully
- cache keys are unique per page/per_page
- cache respects TTL
- cache invalidation works across multiple keys
```

**Expected Coverage:** FeedService: 85% → 95%

---

### 2.3 Helper Methods (15 mins, +1.5%)
**Files:** `test/helpers/application_helper_test.rb`, etc.

**Tests to Add:**
```ruby
# ApplicationHelper
- time_ago_in_words formats correctly
- truncate_text handles long text
- handles nil values gracefully

# GifsHelper (if exists)
- duration_format handles various formats
- privacy_badge returns correct icon
- handles edge cases
```

**Expected Coverage:** Helpers: 0% → 70%

---

## Phase 3: Controller Error Paths (Est. +10% coverage, 90 mins)

### 3.1 Add Missing Controller Error Tests (60 mins, +7%)

**Files to enhance:**
- `test/controllers/likes_controller_test.rb`
- `test/controllers/follows_controller_test.rb`
- `test/controllers/collections_controller_test.rb`
- `test/controllers/comments_controller_test.rb`
- `test/controllers/users_controller_test.rb`

**Pattern for each controller (15 tests per controller):**
```ruby
# Authorization errors (5 tests)
- requires authentication for create/update/destroy
- prevents unauthorized access to private resources
- handles missing resources (404)
- prevents CSRF attacks
- rate limiting (if applicable)

# Validation errors (5 tests)
- handles invalid params
- handles missing required fields
- handles malformed data
- handles SQL injection attempts
- handles XSS attempts

# Edge cases (5 tests)
- handles concurrent requests
- handles deleted resources
- handles duplicate actions (double-like)
- handles very long input
- handles special characters
```

**Expected Coverage:** Controllers: 70% → 85%

---

### 3.2 API Error Response Tests (30 mins, +3%)

**Files:**
- `test/controllers/api/v1/feed_controller_test.rb`
- `test/controllers/api/v1/likes_controller_test.rb`
- Enhance existing API controller tests

**Tests per API controller (10 tests):**
```ruby
# HTTP status codes
- returns 401 for missing/invalid auth
- returns 403 for forbidden resources
- returns 404 for missing resources
- returns 422 for validation errors
- returns 429 for rate limiting
- returns 500 for server errors (mocked)

# Error response format
- error responses include 'error' key
- validation errors include 'details' array
- consistent error message format
- includes request_id for debugging
```

**Expected Coverage:** API controllers: 75% → 90%

---

## Phase 4: Job Error Handling (Est. +5% coverage, 45 mins)

### 4.1 RemixProcessingJob Error Tests (25 mins, +3%)
**File:** `test/jobs/remix_processing_job_test.rb` (enhance existing)

**Tests to Add:**
```ruby
# Error scenarios (10 tests)
- handles missing remix GIF
- handles missing source GIF
- handles file not attached
- handles corrupted file
- handles processing timeout
- handles ffmpeg failure
- handles S3 upload failure
- retries on transient failures
- gives up after max retries
- logs errors appropriately

# Edge cases (5 tests)
- handles very large files
- handles very long videos
- handles unsupported formats
- handles concurrent processing
- handles orphaned jobs
```

**Expected Coverage:** RemixProcessingJob: 80% → 95%

---

### 4.2 Other Jobs (20 mins, +2%)

**If other jobs exist, add similar error tests:**
- Handles missing records
- Handles external service failures
- Retries correctly
- Logs appropriately
- Cleans up on failure

---

## Phase 5: Integration & Edge Cases (Est. +4% coverage, 60 mins)

### 5.1 Request/Response Formats (20 mins, +1.5%)
```ruby
# JSON/Turbo Stream responses
- handles Accept header correctly
- returns proper content-type
- handles malformed JSON
- handles large payloads
- handles Unicode characters
```

### 5.2 Authentication Edge Cases (20 mins, +1.5%)
```ruby
# Devise + JWT
- handles expired sessions
- handles revoked tokens
- handles token replay attacks
- handles concurrent sessions
- handles remember_me functionality
```

### 5.3 Database Edge Cases (20 mins, +1%)
```ruby
# ActiveRecord
- handles connection failures gracefully
- handles deadlocks
- handles constraint violations
- handles transaction rollbacks
```

---

## Implementation Priority

### Sprint 1 (90 mins) - Quick Wins
1. **Comment model tests** (30 min) → +3%
2. **Collection model tests** (25 min) → +2%
3. **Notification model tests** (20 min) → +2%
4. **Small model tests** (15 min) → +1%

**Checkpoint: ~65% coverage**

---

### Sprint 2 (90 mins) - Service & Controller Errors
1. **NotificationService errors** (30 min) → +3%
2. **Controller error paths** (60 min) → +7%

**Checkpoint: ~75% coverage**

---

### Sprint 3 (90 mins) - API & Jobs
1. **API error responses** (30 min) → +3%
2. **Job error handling** (45 min) → +5%
3. **Helper methods** (15 min) → +1.5%

**Checkpoint: ~84.5% coverage**

---

### Sprint 4 (60 mins) - Final Push
1. **Integration tests** (30 min) → +2.5%
2. **Remaining gaps** (30 min) → +3%

**Final: ~90% coverage**

---

## Success Metrics

- [ ] Coverage reaches 90%+
- [ ] All 750-800 tests passing
- [ ] No test failures
- [ ] Coverage report shows green for all major files
- [ ] Error scenarios tested for all critical paths
- [ ] Edge cases covered for all services
- [ ] All validations tested (success + failure)
- [ ] All API endpoints return proper error codes

---

## Estimated Total Time: 5.5 hours

**Ready to implement Sprint 1!** 🚀
