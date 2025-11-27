# Frame Counting Feature Test Plan - Executive Summary

## Document Location
Full detailed plan: `/plans/frame-counting-test-plan.md` (Complete 800+ line specification)

## Quick Reference

### Test Files to Modify
1. **ProcessingScreen.test.tsx** (lines 1-750)
   - Location: `tests/unit/content/overlay-wizard/ProcessingScreen.test.tsx`
   - Add: 4 new test suites (~35 new tests)
   - Update: 3 existing test suites

2. **gif-processor.test.ts** (lines 1-834)
   - Location: `tests/unit/content/gif-processor.test.ts`
   - Add: 2 new integration tests
   - Verify: Progress callback structure

### Component Files to Update
1. **ProcessingScreen.tsx** (lines 1-159)
   - Location: `src/content/overlay-wizard/screens/ProcessingScreen.tsx`
   - Update interface: Add 3 new optional fields
   - Add JSX: Frame counter, buffering indicator, progress bar

2. **wizard-styles.css** (if exists)
   - Add: 4 new CSS classes
   - Add: 1 animation keyframe

---

## Test Suite Breakdown

### New Test Suites (4 total, ~35 tests)

| Suite Name | Location | Tests | Lines | Purpose |
|-----------|----------|-------|-------|---------|
| Frame Counting Display | After line 110 | 5 | 112-247 | Display "Frame X/Y" counter |
| Progress Bar Rendering | After line 247 | 3 | 249-327 | Progress bar width & visibility |
| BufferingStatus Persistence | After line 327 | 3 | 329-428 | Buffering status state mgmt |
| Conditional Visibility Logic | After line 428 | 3 | 430-549 | Visibility by stage & status |

### Updated Existing Tests (3 total)

| Test Suite | Update Type | Lines | Changes |
|-----------|------------|-------|---------|
| Stage Display | Data | 20-43 | Add base processing status |
| Error State Handling | Assertion | 113-139 | Verify frame count hidden |
| Completion State | Data | 186-207 | Add frame data to mock |

### Integration Tests (2 total)

| Test | File | Location | Purpose |
|------|------|----------|---------|
| Frame count progress | gif-processor.test.ts | After line 334 | Verify currentFrame/totalFrames |
| Buffering status | gif-processor.test.ts | After line 334 | Verify status transitions |

---

## Mock Data Structure

### New Interface Fields
```typescript
interface ProcessingScreenProps {
  processingStatus?: {
    // Existing fields (unchanged)
    stage: string;
    stageNumber: number;
    totalStages: number;
    progress: number;
    message: string;
    encoder?: string;
    
    // NEW FIELDS
    currentFrame?: number;           // Current frame index (1-based)
    totalFrames?: number;            // Total frames to capture
    bufferingStatus?: 'ready' | 'buffering' | 'complete' | 'error';
  };
  onComplete?: () => void;
  onError?: (error: string) => void;
}
```

### Mock Data Presets
5 preset objects for easy test setup:
- `mockCapturingStatus` - Frame 5/30, buffering status
- `mockAnalyzingStatus` - Frame 30/30, complete status
- `mockEncodingStatus` - Frame 30/30, complete status
- `mockCompletedStatus` - Frame 30/30, complete status
- `mockErrorStatus` - Frame 5/30, error status

---

## Component Changes Summary

### ProcessingScreen.tsx Updates

**Interface Update (Lines 3-14)**
- Add 3 optional fields to processingStatus interface
- Types: currentFrame (number), totalFrames (number), bufferingStatus (union)

**New JSX Elements (Lines 138-152)**
```
- Frame counter display (conditional on CAPTURING stage)
- Buffering indicator (conditional on bufferingStatus === 'buffering')
- Progress bar (conditional on frame data + CAPTURING stage)
  └─ Width calculated as: (currentFrame / totalFrames) * 100%
```

**Conditional Logic**
- Frame counter: Only visible in CAPTURING stage
- Buffering indicator: Only visible when bufferingStatus === 'buffering'
- Progress bar: Only visible during CAPTURING stage with valid frame data

---

## Test Assertions Pattern

### Frame Count Display
```typescript
// Use regex for flexible text matching (accounts for React wrapping)
expect(screen.getByText(/Frame\s+5\/30/)).toBeInTheDocument();
```

### Buffering Indicator
```typescript
const indicator = screen.getByTestId('buffering-indicator');
expect(indicator).toHaveClass('buffering');
```

### Progress Bar
```typescript
const progressBar = screen.getByRole('progressbar', { hidden: true });
expect(progressBar).toHaveStyle({ width: '50%' }); // 15/30 = 50%
```

---

## CSS Classes to Add

```css
.ytgif-frame-counter
├─ Font: 13px, color: #666, margin-top: 8px, font-weight: 600

.ytgif-buffering-indicator
├─ Font: 12px, color: #ff9500
├─ Background: rgba(255, 149, 0, 0.1)
├─ Padding: 4px 8px, border-radius: 4px
└─ Animation: pulse 1.5s ease-in-out infinite

.ytgif-progress-bar
├─ Width: 100%, height: 6px
├─ Background: #e0e0e0, border-radius: 3px

.ytgif-progress-fill
├─ Background: linear-gradient(90deg, #4CAF50, #81C784)
├─ Transition: width 0.3s ease
└─ Border-radius: 3px

@keyframes pulse
├─ 0%, 100%: opacity 0.8
└─ 50%: opacity 1.0
```

---

## Execution Checklist

### Phase 1: Component Updates
- [ ] Update ProcessingScreen.tsx interface (Lines 3-14)
- [ ] Add frame counter JSX (Lines ~138-142)
- [ ] Add buffering indicator JSX (Lines ~144-148)
- [ ] Add progress bar JSX (Lines ~150-156)
- [ ] Add CSS classes to wizard-styles.css

### Phase 2: Test File Updates
- [ ] Add mock data presets to ProcessingScreen.test.tsx
- [ ] Add Frame Counting Display suite (5 tests)
- [ ] Add Progress Bar Rendering suite (3 tests)
- [ ] Add BufferingStatus Persistence suite (3 tests)
- [ ] Add Conditional Visibility suite (3 tests)
- [ ] Update Error State tests (1 new assertion)
- [ ] Update Completion State tests (mock data)
- [ ] Update Default Values tests (1 new test)
- [ ] Add integration tests to gif-processor.test.ts (2 tests)

### Phase 3: Validation
- [ ] Run: `npm run validate` (typecheck + lint + unit tests)
- [ ] Run: `npm test -- ProcessingScreen.test.tsx --coverage`
- [ ] Run: `npm test -- gif-processor.test.ts --coverage`
- [ ] Run: `npm run test:selenium:real` (real E2E locally)
- [ ] Verify: All tests pass, coverage >85%

### Phase 4: Submission
- [ ] Create feature branch from main
- [ ] Commit with: "Add frame counting tests and UI updates"
- [ ] Push and create PR
- [ ] Link to frame-counting-test-plan.md in PR description

---

## Key Testing Patterns Used

### 1. Regex Text Matching
```typescript
// Handles React splitting text across elements
expect(screen.getByText(/Frame\s+15\/30/)).toBeInTheDocument();
```

### 2. Conditional Visibility Testing
```typescript
stages.forEach((stage) => {
  it(`should ${stage === 'CAPTURING' ? 'show' : 'hide'} frame count in ${stage}`, () => {
    // Render and assert visibility based on condition
  });
});
```

### 3. State Transition Testing
```typescript
const { rerender } = render(<Component {...props1} />);
// First assertions
rerender(<Component {...props2} />);
// Assertions after state change
```

### 4. Mock Data Presets
```typescript
const mockCapturingStatus = { stage: 'CAPTURING', currentFrame: 5, ... };
// Reusable across multiple tests
```

---

## Expected Coverage Improvements

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| ProcessingScreen tests | ~45 | ~68 | +23 tests |
| gif-processor tests | ~35 | ~40 | +5 tests |
| ProcessingScreen coverage | ~87% | ~94% | +7% |
| gif-processor coverage | ~78% | ~85% | +7% |
| **Total new tests** | - | **33** | - |

---

## Edge Cases Covered

1. **Frame Count Display**
   - Zero frames handling
   - Missing frame data (undefined fields)
   - Large frame counts (1000+)

2. **Progress Bar**
   - Width at 0% and 100%
   - Hidden in error state
   - Hidden when frame data missing

3. **Buffering Status**
   - Transitions between states
   - Persistence across re-renders
   - Clearing on completion/error

4. **Stage Transitions**
   - Visibility across all 6 stages
   - Rapid stage transitions
   - Frame data at each stage

---

## Implementation Notes

### File Size Increases
- ProcessingScreen.test.tsx: ~750 lines → ~1100+ lines
- ProcessingScreen.tsx: ~159 lines → ~185+ lines
- wizard-styles.css: +50-60 lines

### No Breaking Changes
- All new fields are optional (`?`)
- Existing tests remain unchanged
- Backward compatible with old props

### Dependencies
- React Testing Library (existing)
- Jest (existing)
- No new packages required

---

## Related Files Reference

| File | Purpose | Status |
|------|---------|--------|
| src/content/gif-processor.ts | GIF processing engine | ✓ Exports frame data |
| src/content/overlay-wizard/screens/ProcessingScreen.tsx | UI component | Update interface |
| tests/unit/content/overlay-wizard/ProcessingScreen.test.tsx | Unit tests | Add ~35 tests |
| tests/unit/content/gif-processor.test.ts | Integration tests | Add ~2 tests |
| src/content/wizard-styles.css | Component styles | Add ~50 lines |

---

## Questions & Support

For implementation details, refer to:
- **Full Plan**: `/plans/frame-counting-test-plan.md`
- **Part 1**: Test cases with code examples
- **Part 2**: Mock data structure
- **Part 3**: Existing test updates
- **Part 4**: Integration tests
- **Part 6**: Specific code changes by line
- **Part 7**: CSS requirements

Total Documentation: 800+ lines of detailed specifications with examples.
