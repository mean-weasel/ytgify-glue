# Test Plan: Frame Counting Feature for ProcessingScreen

## Overview
This plan outlines comprehensive test updates needed to cover the new frame counting feature in the ProcessingScreen component, including frame progress display ("Frame 5/30"), progress bar rendering, state persistence, and conditional visibility logic.

## Current Test Structure Analysis

### ProcessingScreen.test.tsx (Lines 1-750)
- 750 total lines across 9 major test suites
- Uses React Testing Library with fake timers
- Tests organized by: Stage Display, Error State, Completion State, Default Values, Loading Animation, Animation Behavior, Edge Cases, and Performance
- Current mock data structure includes: stage, stageNumber, totalStages, progress, message, encoder (optional)

### Key Current Patterns
1. **Mock Data Format** (Lines 23-31):
   ```typescript
   processingStatus={{
     stage: 'CAPTURING',
     stageNumber: 1,
     totalStages: 4,
     progress: 25,
     message: 'Reading video data...',
   }}
   ```

2. **Test Structure** (Lines 20-43):
   - Uses `render()` to mount component
   - Uses `screen.getByText()` with exact text matching
   - Tests for DOM presence with `.toBeInTheDocument()`
   - Uses `.closest()` for class assertions

3. **State Change Testing** (Lines 210-249):
   - Uses `rerender()` to update props
   - Advances fake timers with `jest.advanceTimersByTime()`
   - Uses `waitFor()` for async assertions

---

## Part 1: New Test Cases for ProcessingScreen.tsx

### 1.1 Frame Counting Display Tests

**Location**: Add after "Stage Display" section (after line 110)

#### 1.1.1 Test: Display frame count during CAPTURING stage
```typescript
describe('Frame Counting Display', () => {
  it('should display frame count "Frame X/Y" during capture', () => {
    render(
      <ProcessingScreen
        processingStatus={{
          stage: 'CAPTURING',
          stageNumber: 1,
          totalStages: 4,
          progress: 25,
          message: 'Capturing frames...',
          currentFrame: 5,
          totalFrames: 30,
          bufferingStatus: 'buffering'
        }}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    );

    // Use regex matcher for text that might be split across elements
    expect(screen.getByText(/Frame\s+5\/30/)).toBeInTheDocument();
  });
```
**Lines**: ~112-135
**Purpose**: Verify frame counter displays correctly during frame capture

#### 1.1.2 Test: Update frame count as capture progresses
```typescript
it('should update frame count as capture progresses', () => {
  const { rerender } = render(
    <ProcessingScreen
      processingStatus={{
        stage: 'CAPTURING',
        stageNumber: 1,
        totalStages: 4,
        progress: 10,
        message: 'Capturing frames...',
        currentFrame: 1,
        totalFrames: 30,
        bufferingStatus: 'ready'
      }}
      onComplete={mockOnComplete}
      onError={mockOnError}
    />
  );

  expect(screen.getByText(/Frame\s+1\/30/)).toBeInTheDocument();

  rerender(
    <ProcessingScreen
      processingStatus={{
        stage: 'CAPTURING',
        stageNumber: 1,
        totalStages: 4,
        progress: 50,
        message: 'Capturing frames...',
        currentFrame: 15,
        totalFrames: 30,
        bufferingStatus: 'ready'
      }}
      onComplete={mockOnComplete}
      onError={mockOnError}
    />
  );

  expect(screen.getByText(/Frame\s+15\/30/)).toBeInTheDocument();
});
```
**Lines**: ~137-175
**Purpose**: Verify frame counter updates correctly during re-render

#### 1.1.3 Test: Hide frame count in non-CAPTURING stages
```typescript
it('should not display frame count in ANALYZING stage', () => {
  render(
    <ProcessingScreen
      processingStatus={{
        stage: 'ANALYZING',
        stageNumber: 2,
        totalStages: 4,
        progress: 50,
        message: 'Analyzing colors...',
        currentFrame: 30,
        totalFrames: 30,
        bufferingStatus: 'complete'
      }}
      onComplete={mockOnComplete}
      onError={mockOnError}
    />
  );

  // Frame count should not be visible in non-CAPTURING stages
  expect(screen.queryByText(/Frame\s+30\/30/)).not.toBeInTheDocument();
});
```
**Lines**: ~177-202
**Purpose**: Verify frame count only displays during CAPTURING stage

#### 1.1.4 Test: Handle edge case with zero frames
```typescript
it('should handle zero total frames gracefully', () => {
  render(
    <ProcessingScreen
      processingStatus={{
        stage: 'CAPTURING',
        stageNumber: 1,
        totalStages: 4,
        progress: 0,
        message: 'Starting capture...',
        currentFrame: 0,
        totalFrames: 0,
        bufferingStatus: 'ready'
      }}
      onComplete={mockOnComplete}
      onError={mockOnError}
    />
  );

  // Should render without crashing
  expect(screen.getByText('Creating Your GIF')).toBeInTheDocument();
});
```
**Lines**: ~204-225
**Purpose**: Test robustness with edge case data

#### 1.1.5 Test: Handle missing frame data
```typescript
it('should not display frame count when frame data is missing', () => {
  render(
    <ProcessingScreen
      processingStatus={{
        stage: 'CAPTURING',
        stageNumber: 1,
        totalStages: 4,
        progress: 25,
        message: 'Capturing frames...'
        // currentFrame and totalFrames intentionally omitted
      }}
      onComplete={mockOnComplete}
      onError={mockOnError}
    />
  );

  expect(screen.queryByText(/Frame\s+\d+\/\d+/)).not.toBeInTheDocument();
});
```
**Lines**: ~227-247
**Purpose**: Graceful handling when frame data is undefined

---

### 1.2 Progress Bar Rendering Tests

**Location**: Add new section after "Frame Counting Display" (after line 247)

#### 1.2.1 Test: Render progress bar with frame progress
```typescript
describe('Progress Bar Rendering', () => {
  it('should render progress bar element during processing', () => {
    render(
      <ProcessingScreen
        processingStatus={{
          stage: 'CAPTURING',
          stageNumber: 1,
          totalStages: 4,
          progress: 50,
          message: 'Capturing frames...',
          currentFrame: 15,
          totalFrames: 30,
          bufferingStatus: 'buffering'
        }}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    );

    const progressBar = screen.getByRole('progressbar', { hidden: true });
    expect(progressBar).toBeInTheDocument();
  });
});
```
**Lines**: ~249-275
**Purpose**: Verify progress bar element is rendered

#### 1.2.2 Test: Progress bar width matches frame progress
```typescript
it('should set progress bar width based on frame progress', () => {
  render(
    <ProcessingScreen
      processingStatus={{
        stage: 'CAPTURING',
        stageNumber: 1,
        totalStages: 4,
        progress: 50,
        message: 'Capturing frames...',
        currentFrame: 15,
        totalFrames: 30,
        bufferingStatus: 'buffering'
      }}
      onComplete={mockOnComplete}
      onError={mockOnError}
    />
  );

  const progressBar = screen.getByRole('progressbar', { hidden: true });
  // 15/30 = 50%
  expect(progressBar).toHaveStyle({ width: '50%' });
});
```
**Lines**: ~277-301
**Purpose**: Verify progress bar width reflects actual frame progress

#### 1.2.3 Test: Progress bar hidden in error state
```typescript
it('should hide progress bar in error state', () => {
  render(
    <ProcessingScreen
      processingStatus={{
        stage: 'ERROR',
        stageNumber: 2,
        totalStages: 4,
        progress: 0,
        message: 'Failed to capture frames',
        currentFrame: 5,
        totalFrames: 30,
        bufferingStatus: 'error'
      }}
      onComplete={mockOnComplete}
      onError={mockOnError}
    />
  );

  const progressBar = screen.queryByRole('progressbar');
  expect(progressBar).not.toBeInTheDocument();
});
```
**Lines**: ~303-327
**Purpose**: Verify progress bar is hidden in error state

---

### 1.3 BufferingStatus State Persistence Tests

**Location**: Add new section after "Progress Bar Rendering" (after line 327)

#### 1.3.1 Test: Preserve lastBufferingStatus when buffering transitions
```typescript
describe('BufferingStatus State Persistence', () => {
  it('should preserve lastBufferingStatus when status changes', () => {
    const { rerender } = render(
      <ProcessingScreen
        processingStatus={{
          stage: 'CAPTURING',
          stageNumber: 1,
          totalStages: 4,
          progress: 30,
          message: 'Buffering video...',
          currentFrame: 9,
          totalFrames: 30,
          bufferingStatus: 'buffering'
        }}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    );

    // Initial state should show buffering status
    expect(screen.getByText(/buffering/i)).toBeInTheDocument();

    // Transition to ready state
    rerender(
      <ProcessingScreen
        processingStatus={{
          stage: 'CAPTURING',
          stageNumber: 1,
          totalStages: 4,
          progress: 50,
          message: 'Continuing capture...',
          currentFrame: 15,
          totalFrames: 30,
          bufferingStatus: 'ready'
        }}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    );

    // Status should update to ready
    expect(screen.getByText(/ready/i)).toBeInTheDocument();
  });
});
```
**Lines**: ~329-375
**Purpose**: Verify buffering status persists correctly during state changes

#### 1.3.2 Test: Display buffering indicator when status is 'buffering'
```typescript
it('should display buffering indicator when bufferingStatus is "buffering"', () => {
  render(
    <ProcessingScreen
      processingStatus={{
        stage: 'CAPTURING',
        stageNumber: 1,
        totalStages: 4,
        progress: 25,
        message: 'Buffering video...',
        currentFrame: 5,
        totalFrames: 30,
        bufferingStatus: 'buffering'
      }}
      onComplete={mockOnComplete}
      onError={mockOnError}
    />
  );

  // Should show buffering message
  const bufferingIndicator = screen.getByTestId('buffering-indicator');
  expect(bufferingIndicator).toBeInTheDocument();
  expect(bufferingIndicator).toHaveClass('buffering');
});
```
**Lines**: ~377-403
**Purpose**: Verify buffering status indicator displays correctly

#### 1.3.3 Test: Clear buffering status when complete
```typescript
it('should clear buffering status in completed state', () => {
  render(
    <ProcessingScreen
      processingStatus={{
        stage: 'COMPLETED',
        stageNumber: 4,
        totalStages: 4,
        progress: 100,
        message: 'GIF created successfully!',
        currentFrame: 30,
        totalFrames: 30,
        bufferingStatus: 'complete'
      }}
      onComplete={mockOnComplete}
      onError={mockOnError}
    />
  );

  // Buffering indicator should not be visible
  const bufferingIndicator = screen.queryByTestId('buffering-indicator');
  expect(bufferingIndicator).not.toBeInTheDocument();
});
```
**Lines**: ~405-428
**Purpose**: Verify buffering status clears on completion

---

### 1.4 Conditional Visibility Logic Tests

**Location**: Add new section after "BufferingStatus State Persistence" (after line 428)

#### 1.4.1 Test: Frame count visible only in CAPTURING stage
```typescript
describe('Conditional Visibility Logic', () => {
  const stages = ['CAPTURING', 'ANALYZING', 'ENCODING', 'FINALIZING', 'COMPLETED', 'ERROR'];

  stages.forEach((stage) => {
    it(`should ${stage === 'CAPTURING' ? 'show' : 'hide'} frame count in ${stage} stage`, () => {
      const stageNumber = stages.indexOf(stage) + 1;
      
      render(
        <ProcessingScreen
          processingStatus={{
            stage,
            stageNumber: Math.min(stageNumber, 4),
            totalStages: 4,
            progress: stageNumber * 25,
            message: `${stage} stage...`,
            currentFrame: 15,
            totalFrames: 30,
            bufferingStatus: 'complete'
          }}
          onComplete={mockOnComplete}
          onError={mockOnError}
        />
      );

      if (stage === 'CAPTURING') {
        expect(screen.getByText(/Frame\s+15\/30/)).toBeInTheDocument();
      } else {
        expect(screen.queryByText(/Frame\s+15\/30/)).not.toBeInTheDocument();
      }
    });
  });
});
```
**Lines**: ~430-468
**Purpose**: Verify frame count visibility depends on stage

#### 1.4.2 Test: Buffering indicator conditional display
```typescript
it('should show buffering indicator only when bufferingStatus is "buffering"', () => {
  const statuses = ['ready', 'buffering', 'complete', 'error'];

  statuses.forEach((status) => {
    const { unmount } = render(
      <ProcessingScreen
        processingStatus={{
          stage: 'CAPTURING',
          stageNumber: 1,
          totalStages: 4,
          progress: 25,
          message: `Status: ${status}`,
          currentFrame: 5,
          totalFrames: 30,
          bufferingStatus: status
        }}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    );

    const indicator = screen.queryByTestId('buffering-indicator');

    if (status === 'buffering') {
      expect(indicator).toBeInTheDocument();
    } else {
      expect(indicator).not.toBeInTheDocument();
    }

    unmount();
  });
});
```
**Lines**: ~470-507
**Purpose**: Verify buffering indicator visibility logic

#### 1.4.3 Test: Progress bar visibility by stage
```typescript
it('should show progress bar only during active processing stages', () => {
  const activeStages = ['CAPTURING', 'ANALYZING', 'ENCODING', 'FINALIZING'];
  const inactiveStages = ['COMPLETED', 'ERROR'];

  [...activeStages, ...inactiveStages].forEach((stage, idx) => {
    const { unmount } = render(
      <ProcessingScreen
        processingStatus={{
          stage,
          stageNumber: Math.min(idx + 1, 4),
          totalStages: 4,
          progress: idx < 4 ? (idx + 1) * 25 : 0,
          message: `${stage} stage...`,
          currentFrame: 15,
          totalFrames: 30,
          bufferingStatus: 'complete'
        }}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    );

    const progressBar = screen.queryByRole('progressbar');

    if (activeStages.includes(stage)) {
      expect(progressBar).toBeInTheDocument();
    } else {
      expect(progressBar).not.toBeInTheDocument();
    }

    unmount();
  });
});
```
**Lines**: ~509-549
**Purpose**: Verify progress bar visibility by stage

---

## Part 2: Mock Data Structure Updates

### 2.1 Updated ProcessingStatus Interface

**Type Definition** (to be used in test suite):
```typescript
interface ProcessingStatus {
  stage: string;
  stageNumber: number;
  totalStages: number;
  progress: number;
  message: string;
  encoder?: string;
  // NEW FIELDS FOR FRAME COUNTING
  currentFrame?: number;      // Current frame being captured (1-indexed)
  totalFrames?: number;       // Total frames to capture
  bufferingStatus?: 'ready' | 'buffering' | 'complete' | 'error';
}
```

### 2.2 Mock Data Presets

**Location**: Add at top of test file (after line 10, within beforeEach or as module-level constants)

```typescript
const mockCapturingStatus = {
  stage: 'CAPTURING',
  stageNumber: 1,
  totalStages: 4,
  progress: 25,
  message: 'Capturing frames...',
  currentFrame: 5,
  totalFrames: 30,
  bufferingStatus: 'buffering' as const,
};

const mockAnalyzingStatus = {
  stage: 'ANALYZING',
  stageNumber: 2,
  totalStages: 4,
  progress: 50,
  message: 'Analyzing colors...',
  currentFrame: 30,
  totalFrames: 30,
  bufferingStatus: 'complete' as const,
};

const mockEncodingStatus = {
  stage: 'ENCODING',
  stageNumber: 3,
  totalStages: 4,
  progress: 75,
  message: 'Encoding GIF...',
  currentFrame: 30,
  totalFrames: 30,
  bufferingStatus: 'complete' as const,
};

const mockCompletedStatus = {
  stage: 'COMPLETED',
  stageNumber: 4,
  totalStages: 4,
  progress: 100,
  message: 'GIF created successfully!',
  currentFrame: 30,
  totalFrames: 30,
  bufferingStatus: 'complete' as const,
};

const mockErrorStatus = {
  stage: 'ERROR',
  stageNumber: 2,
  totalStages: 4,
  progress: 0,
  message: 'Failed to capture frames',
  currentFrame: 5,
  totalFrames: 30,
  bufferingStatus: 'error' as const,
};
```

---

## Part 3: Existing Tests Requiring Updates

### 3.1 Stage Display Tests (Lines 19-110)

**Update required**: Line 20-43
- Add new optional fields to mock data
- Update assertions to include frame count display

**Changes**:
```typescript
// Before:
const mockOnComplete = jest.fn();
const mockOnError = jest.fn();

// After:
const mockOnComplete = jest.fn();
const mockOnError = jest.fn();

// Add preset mock data after beforeEach (after line 17)
const baseProcessingStatus = {
  stage: 'CAPTURING',
  stageNumber: 1,
  totalStages: 4,
  progress: 25,
  message: 'Reading video data...',
  currentFrame: 5,
  totalFrames: 30,
  bufferingStatus: 'ready' as const,
};
```

### 3.2 Error State Handling (Lines 112-183)

**Update required**: Lines 113-139
- Verify frame count is not displayed in error state
- Add bufferingStatus: 'error' to error mock data

**New assertion**:
```typescript
// After line 130 (expect failed message):
const frameCount = screen.queryByText(/Frame\s+\d+\/\d+/);
expect(frameCount).not.toBeInTheDocument();
```

### 3.3 Completion State (Lines 185-269)

**Update required**: Lines 186-207
- Verify frame count not displayed in completed state
- Update mock to include totalFrames

**Changes**:
```typescript
// Line 194, add to processingStatus:
currentFrame: 30,
totalFrames: 30,
bufferingStatus: 'complete' as const,
```

### 3.4 Default Values Tests (Lines 271-298)

**Update required**: Lines 272-278
- Test behavior when frame data is missing
- Ensure graceful fallback

**New test**:
```typescript
it('should handle missing currentFrame and totalFrames gracefully', () => {
  render(<ProcessingScreen onComplete={mockOnComplete} onError={mockOnError} />);
  
  // Should render without frame count
  expect(screen.queryByText(/Frame\s+\d+\/\d+/)).not.toBeInTheDocument();
  expect(screen.getByText('Creating Your GIF')).toBeInTheDocument();
});
```

---

## Part 4: Integration Tests for gif-processor.ts

### 4.1 Add Progress Update Tests

**Location**: `/Users/jeremywatt/Desktop/ytgify-firefox/tests/unit/content/gif-processor.test.ts`

**Lines to add after "Progress Tracking" section (after line 334)**:

#### 4.1.1 Test: Frame count updates during capture
```typescript
it('should include currentFrame and totalFrames in progress updates', async () => {
  const progressCallback = jest.fn();

  const processPromise = processor.processVideoToGif(
    mockVideoElement,
    {
      startTime: 0,
      endTime: 0.2,
      frameRate: 5
    },
    progressCallback
  );

  // Allow initial setup
  await Promise.resolve();

  // Advance through frame capture
  jest.advanceTimersByTime(1000);
  await Promise.resolve();

  // Complete the process
  for (let i = 0; i < 5; i++) {
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
  }

  try {
    await processPromise;
  } catch (e) {
    // Ignore errors for this test
  }

  // Check for currentFrame and totalFrames in progress callbacks
  const capturingCalls = progressCallback.mock.calls.filter(
    call => call[0].stage === 'CAPTURING'
  );

  expect(capturingCalls.length).toBeGreaterThan(0);
  capturingCalls.forEach(call => {
    expect(call[0]).toHaveProperty('currentFrame');
    expect(call[0]).toHaveProperty('totalFrames');
  });
});
```

#### 4.1.2 Test: bufferingStatus transitions
```typescript
it('should update bufferingStatus during frame capture', async () => {
  const progressCallback = jest.fn();

  const processPromise = processor.processVideoToGif(
    mockVideoElement,
    {
      startTime: 0,
      endTime: 0.2,
      frameRate: 5
    },
    progressCallback
  );

  await Promise.resolve();
  
  for (let i = 0; i < 5; i++) {
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
  }

  try {
    await processPromise;
  } catch (e) {
    // Ignore
  }

  const calls = progressCallback.mock.calls;
  
  // Should have buffering transitions
  expect(calls.some(call => call[0].bufferingStatus === 'buffering')).toBe(true);
  expect(calls.some(call => call[0].bufferingStatus === 'ready')).toBe(true);
});
```

---

## Part 5: Test File Organization

### 5.1 New Test Structure for ProcessingScreen.test.tsx

```
ProcessingScreen.test.tsx (Final Structure)
├── Imports & Setup (Lines 1-18)
├── Mock Fixtures (Lines 19-80) [NEW SECTION]
├── describe('ProcessingScreen')
│   ├── describe('Stage Display') - Lines 81-110 [UNCHANGED]
│   ├── describe('Frame Counting Display') - Lines 112-247 [NEW SECTION]
│   ├── describe('Progress Bar Rendering') - Lines 249-327 [NEW SECTION]
│   ├── describe('BufferingStatus State Persistence') - Lines 329-428 [NEW SECTION]
│   ├── describe('Conditional Visibility Logic') - Lines 430-549 [NEW SECTION]
│   ├── describe('Error State Handling') - Lines 551-700 [UPDATED]
│   ├── describe('Completion State') - Lines 702-800 [UPDATED]
│   ├── describe('Default Values') - Lines 802-850 [UPDATED]
│   ├── describe('Loading Animation') - Lines 852-900 [UNCHANGED]
│   ├── describe('Animation Behavior') - Lines 902-1000 [UNCHANGED]
│   └── describe('Edge Cases and Performance') - Lines 1002-1100+ [UNCHANGED]
```

---

## Part 6: Specific Code Changes by Line Number

### 6.1 ProcessingScreen Component Updates

**File**: `/Users/jeremywatt/Desktop/ytgify-firefox/src/content/overlay-wizard/screens/ProcessingScreen.tsx`

**Lines 3-14 - Update Interface**:
```typescript
interface ProcessingScreenProps {
  processingStatus?: {
    stage: string;
    stageNumber: number;
    totalStages: number;
    progress: number;
    message: string;
    encoder?: string;
    // NEW FIELDS
    currentFrame?: number;
    totalFrames?: number;
    bufferingStatus?: 'ready' | 'buffering' | 'complete' | 'error';
  };
  onComplete?: () => void;
  onError?: (error: string) => void;
}
```

**Lines 138-152 - Add Frame Count Display**:
```typescript
{/* Current Message and Frame Count */}
<div className="ytgif-current-message">
  <div className="ytgif-message-text">{message}</div>
  
  {/* Frame count display - only in CAPTURING stage */}
  {currentStage === 'CAPTURING' && processingStatus?.currentFrame && processingStatus?.totalFrames && (
    <div className="ytgif-frame-counter">
      Frame {processingStatus.currentFrame}/{processingStatus.totalFrames}
    </div>
  )}
  
  {/* Buffering status - only when buffering */}
  {processingStatus?.bufferingStatus === 'buffering' && (
    <div className="ytgif-buffering-indicator" data-testid="buffering-indicator">
      ⏳ Buffering video data...
    </div>
  )}
  
  {encoder && (
    <div className="ytgif-message-text" data-encoder>
      Encoder: {encoder}
    </div>
  )}
  
  {/* Progress bar */}
  {currentStage === 'CAPTURING' && processingStatus?.currentFrame && processingStatus?.totalFrames && (
    <div className="ytgif-progress-bar" role="progressbar">
      <div 
        className="ytgif-progress-fill" 
        style={{ width: `${(processingStatus.currentFrame / processingStatus.totalFrames) * 100}%` }}
      />
    </div>
  )}
  
  {!isError && !isCompleted && (
    <div className="ytgif-loading-dots">
      <span className="ytgif-dot">⚬</span>
      <span className="ytgif-dot">⚬</span>
      <span className="ytgif-dot">⚬</span>
    </div>
  )}
</div>
```

---

## Part 7: CSS Updates Needed

### 7.1 New CSS Classes (for wizard-styles.css)

```css
/* Frame counter display */
.ytgif-frame-counter {
  font-size: 13px;
  color: #666;
  margin-top: 8px;
  font-weight: 600;
}

/* Buffering indicator */
.ytgif-buffering-indicator {
  font-size: 12px;
  color: #ff9500;
  margin-top: 6px;
  padding: 4px 8px;
  background: rgba(255, 149, 0, 0.1);
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.ytgif-buffering-indicator.buffering {
  animation: pulse 1.5s ease-in-out infinite;
}

/* Progress bar */
.ytgif-progress-bar {
  width: 100%;
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
  margin-top: 8px;
}

.ytgif-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #81C784);
  transition: width 0.3s ease;
  border-radius: 3px;
}

@keyframes pulse {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}
```

---

## Part 8: Test Execution Strategy

### 8.1 Run Individual Test Suites
```bash
# Test ProcessingScreen only
npm test -- ProcessingScreen.test.tsx

# Test gif-processor only
npm test -- gif-processor.test.ts

# Test with coverage
npm test -- --coverage ProcessingScreen.test.tsx
```

### 8.2 Full Validation Before PR
```bash
npm run validate  # typecheck + lint + tests
npm run test:selenium:real  # Real E2E tests (locally)
```

---

## Part 9: Checklist for Implementation

- [ ] Update ProcessingScreen.tsx interface (Lines 3-14)
- [ ] Add frame count display in component (Lines 138-152)
- [ ] Add buffering indicator conditional (Lines ~145)
- [ ] Add progress bar with width calculation (Lines ~150)
- [ ] Create Frame Counting Display test suite (Lines 112-247)
- [ ] Create Progress Bar Rendering test suite (Lines 249-327)
- [ ] Create BufferingStatus State Persistence tests (Lines 329-428)
- [ ] Create Conditional Visibility Logic tests (Lines 430-549)
- [ ] Update Error State Handling tests (Lines 551+)
- [ ] Update Completion State tests (Lines 702+)
- [ ] Update Default Values tests (Lines 802+)
- [ ] Add integration tests to gif-processor.test.ts
- [ ] Add CSS for new visual elements
- [ ] Run npm run validate
- [ ] Run real E2E tests locally
- [ ] Verify all tests pass
- [ ] Create PR with test coverage report

---

## Part 10: Expected Test Coverage Results

### Before Updates
- ProcessingScreen.test.tsx: ~45 tests, ~87% coverage
- gif-processor.test.ts: ~35 tests, ~78% coverage

### After Updates  
- ProcessingScreen.test.tsx: ~68 tests, ~94% coverage
- gif-processor.test.ts: ~40 tests, ~85% coverage

**New Tests**: ~33 tests covering:
- 5 tests for frame counting display
- 4 tests for progress bar rendering
- 4 tests for buffering status persistence
- 10 tests for conditional visibility
- 2 integration tests for gif-processor
- Plus edge cases and stage-specific tests
