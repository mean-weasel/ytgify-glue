# Frame Counting Feature - Test Planning Documentation Index

## Overview
Complete test plan documentation for implementing frame counting feature ("Frame 5/30") with progress bar and buffering status in ProcessingScreen component. Includes 4 new test suites (~35 tests) and updates to existing tests.

## Documents Included

### 1. FRAME-COUNTING-TEST-SUMMARY.md (312 lines, 9.1 KB)
**Quick reference guide for implementation**

Contains:
- Executive summary of all changes
- Test suite breakdown table
- Mock data structure overview
- Component changes summary
- Test assertion patterns
- CSS classes to add
- Phase-based execution checklist
- Expected coverage improvements
- Edge cases covered

Best for: Quick reference during implementation, team overview

### 2. frame-counting-test-plan.md (988 lines, 26 KB)
**Complete detailed specification with code examples**

Contains:
- Part 1: New test cases (5 test suites with full code examples)
  - 1.1: Frame Counting Display Tests (5 tests)
  - 1.2: Progress Bar Rendering Tests (3 tests)
  - 1.3: BufferingStatus State Persistence Tests (3 tests)
  - 1.4: Conditional Visibility Logic Tests (3 tests)
- Part 2: Mock data structure and presets
- Part 3: Existing test updates needed
- Part 4: Integration tests for gif-processor.ts
- Part 5: Test file organization diagram
- Part 6: Specific code changes by line number
- Part 7: CSS updates needed
- Part 8: Test execution strategy
- Part 9: Implementation checklist
- Part 10: Expected coverage results

Best for: Detailed implementation, code review, copy-paste examples

---

## Quick Navigation

### For Implementation Start Here:
1. Read: FRAME-COUNTING-TEST-SUMMARY.md (Phase 1-4 checklist)
2. Reference: frame-counting-test-plan.md (Parts 1-7 for code examples)

### For Code Review:
1. Part 6 of frame-counting-test-plan.md (specific line changes)
2. FRAME-COUNTING-TEST-SUMMARY.md (CSS classes section)

### For Test Development:
1. Part 1 of frame-counting-test-plan.md (all 4 test suites)
2. Part 2 of frame-counting-test-plan.md (mock data structure)
3. Part 3 of frame-counting-test-plan.md (existing test updates)

---

## Test Plan At A Glance

### Files to Modify
- `src/content/overlay-wizard/screens/ProcessingScreen.tsx` (interface + JSX)
- `tests/unit/content/overlay-wizard/ProcessingScreen.test.tsx` (+35 tests)
- `tests/unit/content/gif-processor.test.ts` (+2 tests)
- `src/content/wizard-styles.css` (+50 lines)

### New Test Suites (4)
1. Frame Counting Display (5 tests) - "Frame X/Y" counter
2. Progress Bar Rendering (3 tests) - Visual progress bar
3. BufferingStatus State Persistence (3 tests) - State management
4. Conditional Visibility Logic (3 tests) - Show/hide logic

### Updated Test Suites (3)
1. Stage Display - Add mock data
2. Error State Handling - Add assertions
3. Completion State - Add mock data

### Integration Tests (2)
1. Frame count progress tracking
2. Buffering status transitions

### Total Changes
- 33 new tests
- 3 new interface fields (all optional)
- 3-5 new JSX elements
- 4 new CSS classes
- 1 CSS animation keyframe

---

## Key Concepts

### Frame Counting Display
- Format: "Frame X/Y" where X is current frame (1-indexed), Y is total
- Visibility: Only shown in CAPTURING stage
- Purpose: User feedback on capture progress

### Progress Bar
- Width: (currentFrame / totalFrames) * 100%
- Only shown during CAPTURING stage with valid frame data
- Smooth transition animation

### Buffering Status
- Values: 'ready', 'buffering', 'complete', 'error'
- Indicator: Only shown when status === 'buffering'
- Purpose: Inform user of network/buffering delays

### Mock Data Pattern
```typescript
// Preset object for reuse across tests
const mockCapturingStatus = {
  stage: 'CAPTURING',
  stageNumber: 1,
  totalStages: 4,
  progress: 25,
  message: 'Capturing frames...',
  currentFrame: 5,      // NEW
  totalFrames: 30,      // NEW
  bufferingStatus: 'buffering'  // NEW
};
```

---

## Implementation Phases

### Phase 1: Component Updates
Update ProcessingScreen.tsx interface and add new JSX elements

### Phase 2: Test File Updates
Add 4 new test suites (~35 tests total) and update 3 existing ones

### Phase 3: Validation
Run unit tests, integration tests, E2E tests, coverage checks

### Phase 4: Submission
Create PR with tests and updates

---

## Coverage Impact

| Metric | Before | After | Gain |
|--------|--------|-------|------|
| ProcessingScreen tests | 45 | 68 | +23 |
| gif-processor tests | 35 | 40 | +5 |
| ProcessingScreen coverage | 87% | 94% | +7% |
| gif-processor coverage | 78% | 85% | +7% |

---

## Testing Patterns

### 1. Regex Text Matching
Handles React text splitting across elements
```typescript
expect(screen.getByText(/Frame\s+5\/30/)).toBeInTheDocument();
```

### 2. Conditional Visibility
Test visibility based on stage/status
```typescript
stages.forEach((stage) => {
  it(`should show frame count in CAPTURING, hide in ${stage}`, () => { ... });
});
```

### 3. State Transitions
Test updates across re-renders
```typescript
const { rerender } = render(<Component prop1={val1} />);
// Assertions
rerender(<Component prop1={val2} />);
// More assertions
```

### 4. Data-Driven Tests
Use presets for easy test setup
```typescript
const { unmount } = render(<Component processingStatus={mockCapturingStatus} />);
// Test
unmount();
```

---

## Related Documentation

See also in `/plans/`:
- `frame-progress-emission-plan.md` - Backend frame progress tracking
- `frame_counting_ui_plan.md` - UI/UX design plan
- `frame_counting_implementation_summary.md` - High-level overview
- `add-popup-version-display.md` - Related feature plan

---

## Implementation Timeline

- Phase 1 (Component): 1-2 hours
- Phase 2 (Tests): 3-4 hours
- Phase 3 (Validation): 1-2 hours
- Phase 4 (Submission): 0.5 hours

Total: ~5-8 hours

---

## Critical Success Factors

1. All new interface fields are optional (backward compatible)
2. Frame count only visible in CAPTURING stage (not cluttering other stages)
3. Progress bar width calculation accurate (currentFrame / totalFrames)
4. Buffering indicator only shows when status === 'buffering'
5. All 33 new tests pass before PR submission
6. Coverage remains above 85% for both files
7. No breaking changes to existing tests

---

## Questions & Troubleshooting

### Frame counter not displaying?
- Check: currentFrame and totalFrames are provided
- Check: stage === 'CAPTURING'
- Check: JSX conditional logic

### Progress bar incorrect width?
- Verify: (currentFrame / totalFrames) * 100 calculation
- Check: CSS width property in inline styles
- Verify: totalFrames > 0 to avoid division by zero

### Buffering indicator stuck?
- Check: bufferingStatus prop updates correctly
- Check: CSS animation in .ytgif-buffering-indicator
- Verify: data-testid="buffering-indicator" in JSX

### Tests failing?
- Run: `npm test -- ProcessingScreen.test.tsx --verbose`
- Check: Mock data includes all 3 new optional fields
- Verify: Regex patterns in assertions (use \s+ for whitespace)

---

## Approval Checklist

Before submitting PR, verify:
- [ ] All 33 new tests pass
- [ ] Coverage above 85% on both files
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Components render without errors
- [ ] E2E tests pass locally
- [ ] Documentation updated in PR description
- [ ] Link to frame-counting-test-plan.md provided

---

## Document Version
- Created: 2025-11-11
- Version: 1.0
- Status: Ready for implementation

Total documentation: 1,300+ lines across 2 detailed documents
