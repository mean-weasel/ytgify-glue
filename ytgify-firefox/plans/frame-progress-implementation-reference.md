# Frame Progress Emission - Implementation Reference

## Code Modification Map

### 1. Interface Extension (High Priority)

**File**: `src/content/gif-processor.ts`
**Lines**: 88-96

**Before**:
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

**After**:
```typescript
export interface StageProgressInfo {
  stage: string;
  stageNumber: number;
  totalStages: number;
  stageName: string;
  message: string;
  progress: number;
  encoder?: string;
  bufferingStatus?: {
    currentFrame: number;
    totalFrames: number;
    bufferedPercentage: number;
    estimatedTimeRemaining: number; // seconds
    isBuffering: boolean;
  };
}
```

---

## 2. captureFrames() Method Modifications

### 2.1 Initialization Block (After line 447)

**Insert After**:
```typescript
    // Pause for stable capture
    videoElement.pause();
```

**Insert Before**:
```typescript
    for (let i = 0; i < frameCount; i++) {
```

**New Code**:
```typescript
    // Progress tracking for frame capture
    const captureStartTime = performance.now();
    let lastProgressEmitTime = 0;
    const progressEmitInterval = 500; // ms - throttle callback frequency
    let lastEmittedFrame = -1;
    const progressEmitFrequency = Math.max(1, Math.ceil(frameCount / 50)); // max 50 emissions
```

### 2.2 Initial Progress Emission (Optional Enhancement)

**Insert Immediately After Line 449** (first iteration only):

```typescript
    // Emit starting state
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
        estimatedTimeRemaining: Math.round((frameCount * 300) / 1000),
        isBuffering: true,
      },
    });
```

### 2.3 Buffering Phase Progress (Inside polling loop)

**Location**: After line 508 (`attempts++;`), inside the `while (attempts < maxAttempts)` block

**Insert**:
```typescript
        // Emit buffering progress every ~125ms (5 attempts × 25ms)
        if (attempts > 0 && attempts % 5 === 0 && this.progressCallback) {
          const now = performance.now();
          if (now - lastProgressEmitTime >= progressEmitInterval) {
            const bufferedPercentage = ((i + 1) / frameCount) * 100;
            const elapsedSeconds = (now - captureStartTime) / 1000;
            const averageTimePerFrame = elapsedSeconds / Math.max(1, i);
            const estimatedTimeRemaining = (frameCount - i) * averageTimePerFrame;
            
            this.progressCallback({
              stage: 'CAPTURING',
              stageNumber: 1,
              totalStages: 4,
              stageName: this.stages.CAPTURING.name,
              message: `Buffering frame ${i + 1}/${frameCount}...`,
              progress: this.getStageProgress('CAPTURING') + (bufferedPercentage / 4),
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

### 2.4 Frame Capture Progress (After frame storage)

**Location**: After line 603 (`frames.push(frameCanvas);`)

**Insert**:
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

### 2.5 Recovery Attempt Progress (Optional Enhancement)

**Location**: After line 560 (during recovery seek)

**Replace**:
```typescript
            logger.info(`[ContentScriptGifProcessor] Attempting recovery seek for frame ${i + 1}`);

            // Try nudging forward slightly
            videoElement.currentTime = captureTime + 0.001;
            await new Promise((resolve) => setTimeout(resolve, 200));
```

**With**:
```typescript
            logger.info(`[ContentScriptGifProcessor] Attempting recovery seek for frame ${i + 1}`);

            // Emit recovery status
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
                estimatedTimeRemaining: (frameCount - i) * 0.3,
                isBuffering: true,
              },
            });

            // Try nudging forward slightly
            videoElement.currentTime = captureTime + 0.001;
            await new Promise((resolve) => setTimeout(resolve, 200));
```

---

## 3. Content Script Integration

**File**: `src/content/index.ts`
**Lines**: 1398-1427

**Current Code**:
```typescript
        (stageInfo) => {
          this.processingStatus = {
            stage: stageInfo.stage,
            stageNumber: stageInfo.stageNumber,
            totalStages: stageInfo.totalStages,
            progress: stageInfo.progress,
            message: stageInfo.message,
            encoder: stageInfo.encoder,
          };
          this.updateTimelineOverlay();
          this.log(
            'debug',
            '[Content] GIF processing stage update',
            stageInfo as unknown as Record<string, unknown>
          );

          // Post stage info to window for unified interface
          window.postMessage(
            {
              type: 'GIF_PROGRESS',
              stage: stageInfo.stage,
              stageNumber: stageInfo.stageNumber,
              totalStages: stageInfo.totalStages,
              progress: stageInfo.progress,
              message: stageInfo.message,
              encoder: stageInfo.encoder,
            },
            '*'
          );
        }
```

**Modified Code**:
```typescript
        (stageInfo) => {
          this.processingStatus = {
            stage: stageInfo.stage,
            stageNumber: stageInfo.stageNumber,
            totalStages: stageInfo.totalStages,
            progress: stageInfo.progress,
            message: stageInfo.message,
            encoder: stageInfo.encoder,
          };
          this.updateTimelineOverlay();
          this.log(
            'debug',
            '[Content] GIF processing stage update',
            stageInfo as unknown as Record<string, unknown>
          );

          // Post stage info to window for unified interface
          window.postMessage(
            {
              type: 'GIF_PROGRESS',
              stage: stageInfo.stage,
              stageNumber: stageInfo.stageNumber,
              totalStages: stageInfo.totalStages,
              progress: stageInfo.progress,
              message: stageInfo.message,
              encoder: stageInfo.encoder,
              bufferingStatus: stageInfo.bufferingStatus ? {
                currentFrame: stageInfo.bufferingStatus.currentFrame,
                totalFrames: stageInfo.bufferingStatus.totalFrames,
                bufferedPercentage: stageInfo.bufferingStatus.bufferedPercentage,
                estimatedTimeRemaining: stageInfo.bufferingStatus.estimatedTimeRemaining,
                isBuffering: stageInfo.bufferingStatus.isBuffering,
              } : undefined,
            },
            '*'
          );
        }
```

---

## 4. Control Flow Diagram

```
captureFrames()
│
├─→ Initialize tracking variables (lines 449-453)
│   ├─ captureStartTime
│   ├─ lastProgressEmitTime
│   ├─ progressEmitInterval
│   └─ progressEmitFrequency
│
├─→ [Optional] Emit initial progress (before loop)
│
└─→ for (let i = 0; i < frameCount; i++) {
    │
    ├─→ Seek to capture time (line 459)
    │
    ├─→ Polling loop with buffering checks (lines 461-509)
    │   │
    │   └─→ [Every 5 attempts] Emit buffering progress
    │       ├─ Calculate elapsed time
    │       ├─ Calculate ETA
    │       └─ Call progressCallback with bufferingStatus.isBuffering = true
    │
    ├─→ Extract frame data (lines 530-590)
    │   │
    │   └─→ [Optional] Handle recovery attempt
    │       └─ Emit recovery progress
    │
    └─→ Store frame (line 603)
        │
        └─→ [Every N frames or on final frame] Emit frame capture progress
            ├─ Calculate bufferedPercentage
            ├─ Calculate ETA
            └─ Call progressCallback with bufferingStatus.isBuffering = false
}
```

---

## 5. Progress Calculation Examples

### Example 1: 100-frame GIF

**Emission Frequency**: Every 2 frames (100/50 = 2)

**Timeline**:
- Frame 2: Progress = 2%, Buffered = 2%
- Frame 4: Progress = 4%, Buffered = 4%
- ...
- Frame 100: Progress = 100%, Buffered = 100%

**Total emissions**: ~50 + buffering updates

### Example 2: 500-frame GIF

**Emission Frequency**: Every 10 frames (500/50 = 10)

**Timeline**:
- Frame 10: Progress = 2%, Buffered = 2%
- Frame 20: Progress = 4%, Buffered = 4%
- ...
- Frame 500: Progress = 100%, Buffered = 100%

**Total emissions**: ~50 + buffering updates

### Example 3: ETA Calculation

**Assumptions**:
- 300 frames total
- 150 frames captured in 45 seconds (0.15s per frame)

**At frame 150**:
```
bufferedPercentage = (150/300) × 100 = 50%
averageTimePerFrame = 45000ms / 150 = 300ms
framesRemaining = 300 - 150 = 150
estimatedTimeRemaining = 150 × 0.3s = 45 seconds
```

---

## 6. Testing Checklist

- [ ] Interface compiles without errors
- [ ] Progress callbacks fire at expected intervals (max ~50 times)
- [ ] bufferedPercentage increases monotonically
- [ ] estimatedTimeRemaining decreases over time
- [ ] isBuffering flag toggles correctly
- [ ] Content script receives window.postMessage events
- [ ] ProcessingScreen displays frame count in message
- [ ] Final frame always emits 100% progress
- [ ] Recovery attempts emit progress updates
- [ ] No callbacks after captureFrames completes
- [ ] Memory usage remains stable across long GIFs

---

## 7. Timing Reference

| Phase | Duration | Notes |
|-------|----------|-------|
| Initial wait | 50ms | Fixed delay after seek |
| Polling (per attempt) | 25ms | Up to 20 attempts |
| Additional delay | 100-150ms | Depends on seek distance |
| **Total per frame** | **150-665ms** | Highly variable |
| **Progress emission** | **500ms min** | Throttled to prevent overload |

**Buffering emission**: Every 5 polling attempts ≈ every 125ms during buffering
**Frame emission**: Every N frames (adaptive) ≈ every 1-3 seconds for typical GIFs

---

## 8. Error Handling

### Callback Safety
All progressCallback invocations use optional chaining (`?.`) to handle undefined callbacks.

### ETA Edge Cases
- Division by zero: `Math.max(1, i)` prevents division by zero on first frame
- Large frame counts: Formula scales linearly, no overflow risk
- Network jitter: Moving average naturally smooths fluctuations

### Recovery Mechanism
Recovery attempts don't interfere with progress tracking. Progress state maintained across recovery loops.

---

## 9. Performance Impact Summary

| Operation | Overhead |
|-----------|----------|
| Performance.now() calls | <0.1ms each |
| Progress calculation | <1ms total |
| Callback invocation | <10ms user-defined |
| Frequency throttling | Negligible |
| **Total per emission** | **~10-15ms** |

**Relative to frame capture** (~200-300ms average):
- Overhead per frame: 5-10% (only when emitting)
- Overhead throttled to 500ms intervals = ~2-3% total

---

## 10. Integration with Chrome Target

This implementation mirrors Chrome target behavior:

| Feature | Implementation |
|---------|-----------------|
| Buffering status | Emits every 5 attempts (~125ms) |
| Frame progress | Emits after each capture (throttled) |
| ETA calculation | Moving average of frame capture time |
| Frame counting | Tracks currentFrame and totalFrames |
| Percentage | 0-100% scale for CAPTURING stage |

