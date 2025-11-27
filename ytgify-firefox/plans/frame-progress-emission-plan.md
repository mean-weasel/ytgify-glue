# Frame Progress Emission Plan for captureFrames Method

## Executive Summary

This plan details how to add granular frame-level progress emission to the `captureFrames` method in `src/content/gif-processor.ts`. Currently, the method has no progress feedback during the frame capture stage, only updating stage transitions. This plan integrates frame-by-frame progress tracking with the existing progress callback infrastructure.

---

## 1. Current State Analysis

### 1.1 Method Location and Scope
- **File**: `src/content/gif-processor.ts`
- **Method**: `captureFrames()` (lines 361-646)
- **Duration**: Longest stage (often 60-80% of total processing time)
- **Current Feedback**: None - only stage-level updates via `this.updateStage('CAPTURING')`

### 1.2 Frame Capture Loop Structure
```
Lines 449-637: Main loop
  - Line 449: `for (let i = 0; i < frameCount; i++)`
  - Lines 450-515: Seek and buffer verification (highly variable timing)
  - Lines 516-528: Seek accuracy logging
  - Lines 530-590: Frame extraction and duplicate detection
  - Lines 592-636: Frame storage and debug logging
```

### 1.3 Existing Progress Infrastructure

**Progress Callback Pattern** (lines 104, 282, 289):
- `progressCallback: ((stageInfo: StageProgressInfo) => void) | undefined`
- Invoked via `this.progressCallback?.(stageInfo)`
- Already integrated into content script (src/content/index.ts, lines 1398-1427)
- Posts to window via `window.postMessage()` for UI consumption

**StageProgressInfo Interface** (lines 88-96):
```typescript
export interface StageProgressInfo {
  stage: string;
  stageNumber: number;
  totalStages: number;
  stageName: string;
  message: string;
  progress: number;
  encoder?: string;
}
```

### 1.4 Existing Seek/Buffer Logic (lines 461-515)

**Current Polling Pattern**:
- Initial 50ms wait (line 463)
- Poll loop: up to 20 attempts × 25ms = 500ms max (lines 466-509)
- Attempts increment every 25ms (line 507)
- Additional 100-150ms delay post-seek (line 515)

**Total per frame**: ~150-665ms (varies by seek distance and buffering)

---

## 2. Design Specification

### 2.1 Progress Emission Strategy

**Overall approach**: Emit progress at two tiers:
1. **Coarse-grained**: After each successful frame capture
2. **Fine-grained**: During buffering waits (optional, for better UX during network delays)

### 2.2 Buffering Status Extension

Extend `StageProgressInfo` to optionally include buffering metadata:

```typescript
export interface StageProgressInfo {
  stage: string;
  stageNumber: number;
  totalStages: number;
  stageName: string;
  message: string;
  progress: number;
  encoder?: string;
  // New fields for frame-level progress
  bufferingStatus?: {
    currentFrame: number;
    totalFrames: number;
    bufferedPercentage: number;
    estimatedTimeRemaining: number; // seconds
    isBuffering: boolean;
  };
}
```

### 2.3 Calculation Formulas

#### 2.3.1 bufferedPercentage

Represents progress within the CAPTURING stage (0-100):

```
bufferedPercentage = (currentFrame / totalFrames) * 100
```

Where `currentFrame` is the index of the frame just captured (0-based, so add 1 for display).

#### 2.3.2 estimatedTimeRemaining

Calculate moving average of frame capture time:

```
Tracking:
- framesCompleted = i + 1
- totalFramesRemaining = frameCount - (i + 1)
- averageTimePerFrame = elapsedTime / framesCompleted (milliseconds)

estimatedTimeRemaining = (totalFramesRemaining * averageTimePerFrame) / 1000
```

**Implementation Details**:
- Track `captureStartTime` at beginning of loop (line 449)
- Update `lastFrameEndTime` after frame storage (line 603)
- Calculate every N frames to avoid excessive computation
- Emit in seconds (user-friendly)

#### 2.3.3 isBuffering Flag

Indicates if frame is currently in buffering wait:

```
isBuffering = true during polling phase (lines 466-509)
isBuffering = false after frame successfully captured (line 603)
```

---

## 3. Implementation Plan

### 3.1 Phase 1: Add Tracking Variables

**Location**: Top of `captureFrames()` method, after line 447

```typescript
// Performance tracking for progress emission
const captureStartTime = performance.now();
let lastProgressEmitTime = 0;
const progressEmitInterval = 500; // Emit progress every 500ms minimum
let lastEmittedFrame = -1;
const progressEmitFrequency = Math.max(1, Math.ceil(frameCount / 50)); // Emit max 50 times

// Average frame capture time tracking
let totalFrameCaptureTime = 0;
```

**Rationale**:
- `captureStartTime`: Reference for elapsed time calculation
- `lastProgressEmitTime`: Throttle emissions to prevent UI thrashing (500ms = ~60fps display refresh)
- `lastEmittedFrame`: Prevent duplicate progress events
- `progressEmitFrequency`: Adaptive - ensure max 50 progress updates for large frame counts
- `totalFrameCaptureTime`: Running total for average calculation

### 3.2 Phase 2: Emit Progress After Buffer Polling

**Location**: Inside polling loop, every 5 attempts (line 474)

```typescript
// Every 5 polling attempts (~125ms), emit buffering progress
if (attempts > 0 && attempts % 5 === 0) {
  const now = performance.now();
  if (now - lastProgressEmitTime >= progressEmitInterval) {
    const bufferedPercentage = ((i + 1) / frameCount) * 100;
    const elapsedSeconds = (now - captureStartTime) / 1000;
    const framesCompleted = i;
    const averageTimePerFrame = elapsedSeconds / Math.max(1, framesCompleted);
    const estimatedTimeRemaining = (frameCount - i) * averageTimePerFrame;
    
    this.progressCallback?.({
      stage: 'CAPTURING',
      stageNumber: 1,
      totalStages: 4,
      stageName: this.stages.CAPTURING.name,
      message: `Buffering frame ${i + 1}/${frameCount}...`,
      progress: this.getStageProgress('CAPTURING') + (bufferedPercentage / 4), // Scale to stage %
      bufferingStatus: {
        currentFrame: i,
        totalFrames: frameCount,
        bufferedPercentage: bufferedPercentage,
        estimatedTimeRemaining: Math.round(estimatedTimeRemaining),
        isBuffering: true,
      },
    });
    lastProgressEmitTime = now;
  }
}
```

**Location**: Line ~507, inside the `while (attempts < maxAttempts)` loop, after `attempts++`

**Rationale**:
- Emit every 5 attempts = ~125ms intervals (5 × 25ms)
- Respects throttle interval to avoid UI overload
- Shows buffering status while waiting
- Allows UI to show "buffering" visual feedback

### 3.3 Phase 3: Emit Progress After Frame Capture

**Location**: After frame storage, line 603 (after `frames.push(frameCanvas)`)

```typescript
// Emit frame capture progress
const now = performance.now();
const shouldEmitProgress = (i + 1) % progressEmitFrequency === 0 || i === frameCount - 1;

if (shouldEmitProgress && now - lastProgressEmitTime >= progressEmitInterval && i !== lastEmittedFrame) {
  const bufferedPercentage = ((i + 1) / frameCount) * 100;
  const elapsedSeconds = (now - captureStartTime) / 1000;
  const averageTimePerFrame = elapsedSeconds / (i + 1);
  const estimatedTimeRemaining = (frameCount - (i + 1)) * averageTimePerFrame;
  
  this.progressCallback?.({
    stage: 'CAPTURING',
    stageNumber: 1,
    totalStages: 4,
    stageName: this.stages.CAPTURING.name,
    message: `Captured frame ${i + 1}/${frameCount}`,
    progress: this.getStageProgress('CAPTURING') + (bufferedPercentage / 4),
    bufferingStatus: {
      currentFrame: i,
      totalFrames: frameCount,
      bufferedPercentage: bufferedPercentage,
      estimatedTimeRemaining: Math.round(estimatedTimeRemaining),
      isBuffering: false,
    },
  });
  lastProgressEmitTime = now;
  lastEmittedFrame = i;
}
```

**Location**: Lines 603-640 (after frame storage, before or instead of existing debug logging)

**Rationale**:
- Emits after each "batch" of frames (adaptive frequency)
- Always emits for final frame (good UX closure)
- Respects throttle to prevent callback spam
- `isBuffering: false` distinguishes from buffering-phase emissions
- Running average gives smooth ETA

### 3.4 Phase 4: Handle Edge Cases

#### 4.1 First Frame Special Case

**Location**: Line 449, before loop begins

```typescript
// Emit initial progress
this.progressCallback?.({
  stage: 'CAPTURING',
  stageNumber: 1,
  totalStages: 4,
  stageName: this.stages.CAPTURING.name,
  message: `Starting frame capture (${frameCount} frames)...`,
  progress: this.getStageProgress('CAPTURING'),
  bufferingStatus: {
    currentFrame: 0,
    totalFrames: frameCount,
    bufferedPercentage: 0,
    estimatedTimeRemaining: Math.round((frameCount * 300) / 1000), // Rough estimate
    isBuffering: true,
  },
});
```

#### 4.2 Recovery Seek Case (lines 558-585)

Track recovery attempt time separately:

```typescript
// During recovery attempt (line 560-564)
const recoveryStartTime = performance.now();
videoElement.currentTime = captureTime + 0.001;
await new Promise((resolve) => setTimeout(resolve, 200));

// Emit recovery status update
this.progressCallback?.({
  stage: 'CAPTURING',
  stageNumber: 1,
  totalStages: 4,
  stageName: this.stages.CAPTURING.name,
  message: `Recovering frame ${i + 1}/${frameCount}...`,
  progress: this.getStageProgress('CAPTURING') + ((i / frameCount) * 25),
  bufferingStatus: {
    currentFrame: i,
    totalFrames: frameCount,
    bufferedPercentage: ((i) / frameCount) * 100,
    estimatedTimeRemaining: (frameCount - i) * 0.3, // Conservative estimate
    isBuffering: true,
  },
});
```

---

## 4. Integration Points

### 4.1 StageProgressInfo Extension
- **File**: `src/content/gif-processor.ts`, lines 88-96
- **Change**: Add optional `bufferingStatus` field
- **Impact**: Backward compatible (optional field)

### 4.2 Content Script Integration
- **File**: `src/content/index.ts`, lines 1398-1427
- **Current Code**: Already handles `stageInfo` updates
- **Required Change**: Extract `bufferingStatus` if present and pass through window.postMessage

```typescript
// Add this in the progress callback (line 1415-1426)
bufferingStatus: stageInfo.bufferingStatus ? {
  currentFrame: stageInfo.bufferingStatus.currentFrame,
  totalFrames: stageInfo.bufferingStatus.totalFrames,
  bufferedPercentage: stageInfo.bufferingStatus.bufferedPercentage,
  estimatedTimeRemaining: stageInfo.bufferingStatus.estimatedTimeRemaining,
  isBuffering: stageInfo.bufferingStatus.isBuffering,
} : undefined,
```

### 4.3 UI Update (Optional)
- **File**: `src/content/overlay-wizard/screens/ProcessingScreen.tsx`
- **Current Display**: Stage-level progress with animated messages
- **Potential Enhancement**: Show frame count and ETA in message
  - `Capturing frame 145/500 (~2:30 remaining)`

---

## 5. Performance Considerations

### 5.1 Callback Frequency Limits

**Current Design**:
- Minimum 500ms between any emissions
- Adaptive frequency: max 50 total emissions across all frames
- For 500 frames: emit every 10 frames
- For 100 frames: emit every 2 frames

**Impact**:
- 500 frames: 50 emissions = minimal overhead
- 1000 frames: 50 emissions = minimal overhead
- UI update rate: max 2 per second = smooth 60fps capable

### 5.2 Timing Overhead

**Per-frame impact**:
- Performance.now() calls: 2 additional (negligible: <0.1ms)
- Calculation overhead: <1ms per progress calculation
- Callback invocation: user-defined, typically <10ms

**Total overhead**: <5% of average frame capture time

### 5.3 Memory Considerations

No additional memory allocated in loop. Only stack-based tracking variables (~200 bytes).

---

## 6. Specific Code Changes

### 6.1 Lines to Modify

| Line Range | Change | Priority |
|-----------|--------|----------|
| 88-96 | Add `bufferingStatus?` field to `StageProgressInfo` | HIGH |
| 449-450 | Add tracking variables before loop | HIGH |
| 449 (before) | Emit initial progress | MEDIUM |
| 461-509 | Add buffering-phase progress every 5 attempts | MEDIUM |
| 603 | Add frame-capture progress emission | HIGH |
| 560-564 | Add recovery attempt progress | MEDIUM |
| src/content/index.ts 1415-1426 | Pass bufferingStatus through window.postMessage | HIGH |

### 6.2 Code Snippet Locations

**Initialization** (add after line 447):
```typescript
const captureStartTime = performance.now();
let lastProgressEmitTime = 0;
const progressEmitInterval = 500;
let lastEmittedFrame = -1;
const progressEmitFrequency = Math.max(1, Math.ceil(frameCount / 50));
let totalFrameCaptureTime = 0;
```

**Buffering Phase** (add inside while loop, after line 507):
```typescript
if (attempts > 0 && attempts % 5 === 0 && this.progressCallback) {
  // [Buffering progress calculation - see Section 3.2]
}
```

**Frame Capture Phase** (add after line 603):
```typescript
const now = performance.now();
const shouldEmitProgress = (i + 1) % progressEmitFrequency === 0 || i === frameCount - 1;
if (shouldEmitProgress && now - lastProgressEmitTime >= progressEmitInterval && i !== lastEmittedFrame) {
  // [Frame capture progress calculation - see Section 3.3]
}
```

---

## 7. Testing Strategy

### 7.1 Unit Tests
- Mock `progressCallback` and verify it's called correct number of times
- Verify `bufferedPercentage` calculation accuracy
- Test `estimatedTimeRemaining` with various frame counts
- Edge case: 1 frame, 10 frames, 500 frames

### 7.2 Integration Tests
- Full GIF creation with progress tracking
- Verify progress callback maintains valid state
- Check that final progress = 100% (or near it)

### 7.3 Manual Testing
- Create GIF from 10-frame clip: should see 5-10 progress updates
- Create GIF from 200-frame clip: should see ~50 progress updates
- Verify UI displays frame count and ETA
- Test recovery mechanism shows progress

---

## 8. Implementation Order

1. **Step 1**: Update `StageProgressInfo` interface (HIGH priority)
2. **Step 2**: Add tracking variables at loop start (HIGH)
3. **Step 3**: Add frame-capture progress after line 603 (HIGH)
4. **Step 4**: Update content script integration (HIGH)
5. **Step 5**: Add buffering-phase progress (MEDIUM)
6. **Step 6**: Add recovery attempt progress (MEDIUM)
7. **Step 7**: Update ProcessingScreen UI if desired (OPTIONAL)
8. **Step 8**: Test and validate (ALL)

---

## 9. Risk Assessment

### Low Risk Items
- Adding optional fields to interfaces (backward compatible)
- Performance.now() overhead (negligible)
- Progress calculation (simple math)

### Medium Risk Items
- Callback frequency (mitigated by throttling)
- Recovery mechanism timing (isolated, well-tested existing code)

### No Breaking Changes
- All changes are additive
- Existing code unmodified
- Optional buffer status field

---

## 10. Success Criteria

- Frame progress emitted at least once per second
- Final progress = 100%
- ETA within ±30% of actual remaining time
- UI responsive to progress updates (<20ms lag)
- No memory leaks from callback closures
- Works for 10-frame to 1000-frame clips
- Recovery mechanism shows progress without breaking

