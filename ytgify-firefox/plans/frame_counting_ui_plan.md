# Frame Counting UI Implementation Plan for ProcessingScreen.tsx

## Overview
Add frame counting display to ProcessingScreen showing "Frame X/Y · ~Zs" format with progress bar during CAPTURING stage. This feature mirrors Chrome implementation and provides real-time visual feedback during frame extraction.

---

## 1. State Management

### 1.1 Add State Hook for Buffering Status (After line 21)
**Location**: Line 22-23 (right after existing `_dots` state)

```typescript
const [lastBufferingStatus, setLastBufferingStatus] = useState<{
  currentFrame?: number;
  totalFrames?: number;
  currentStep?: number;
  totalSteps?: number;
} | undefined>();
```

**Rationale**: Caches the last buffering status from `processingStatus.details` to persist display even when status updates temporarily lack frame data.

---

## 2. Effects Hook for Persisting Buffering Status

### 2.1 Add useEffect After Dots Animation Effect (After line 29)
**Location**: Lines 30-38 (new effect, right after dots animation effect)

```typescript
// Track buffering status when in CAPTURING stage
useEffect(() => {
  if (
    processingStatus?.stage === 'CAPTURING' &&
    processingStatus?.details?.currentFrame !== undefined &&
    processingStatus?.details?.totalFrames !== undefined
  ) {
    setLastBufferingStatus(processingStatus.details);
  }
}, [processingStatus?.stage, processingStatus?.details?.currentFrame, processingStatus?.details?.totalFrames]);
```

**Rationale**: Updates cached buffering status only during CAPTURING stage and only when frame data is present. Prevents stale data from previous stages.

---

## 3. Conditional Rendering Logic

### 3.1 Add Computed Boolean After Variable Declarations (After line 48)
**Location**: Lines 49-50 (after `isError` and `isCompleted` variables)

```typescript
// Determine if progress display should show
const isCaptureStage = currentStage === 'CAPTURING';
const shouldShowProgress = isCaptureStage && lastBufferingStatus && !isError && !isCompleted;
```

**Rationale**: Encapsulates display logic in a single boolean. Shows progress only during CAPTURING stage, with valid buffering data, and not in error/completed states.

---

## 4. Frame Counting Display Component

### 4.1 Add Frame Counter JSX (Lines 138-152)
**Location**: Replace the message/loading section with enhanced version

**Current Section** (lines 138-152):
```typescript
{/* Current Message */}
<div className="ytgif-current-message">
  <div className="ytgif-message-text">{message}</div>
  {encoder && (
    <div className="ytgif-message-text" data-encoder>
      Encoder: {encoder}
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

**Replace With**:
```typescript
{/* Current Message */}
<div className="ytgif-current-message">
  <div className="ytgif-message-text">{message}</div>
  
  {/* Frame Counting Display - Only during CAPTURING */}
  {shouldShowProgress && lastBufferingStatus && (
    <div className="ytgif-frame-counter">
      <div className="ytgif-frame-text">
        Frame {lastBufferingStatus.currentFrame}/{lastBufferingStatus.totalFrames}
        {lastBufferingStatus.totalFrames && (
          <>
            · ~{Math.round((lastBufferingStatus.totalFrames / (processingStatus?.details?.totalFrames || 1)) * 30)}s</>
        )}
      </div>
      
      {/* Progress Bar */}
      <div className="ytgif-progress-bar-container">
        <div
          className="ytgif-progress-bar-fill"
          style={{
            width: `${lastBufferingStatus.totalFrames ? 
              (lastBufferingStatus.currentFrame / lastBufferingStatus.totalFrames) * 100 
              : 0}%`
          }}
        />
      </div>
    </div>
  )}
  
  {/* Initializing Placeholder - Only when no buffering data yet */}
  {isCaptureStage && !lastBufferingStatus && !isError && !isCompleted && (
    <div className="ytgif-frame-counter">
      <div className="ytgif-frame-text">Initializing...</div>
    </div>
  )}
  
  {encoder && (
    <div className="ytgif-message-text" data-encoder>
      Encoder: {encoder}
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

## 5. CSS Styling Updates

### 5.1 Add New CSS Classes to wizard-styles.css (After line 1753)
**Location**: Add after `.ytgif-loading-dots` animation (around line 1753)

```css
/* Frame Counter Display */
.ytgif-frame-counter {
  margin-top: 12px;
  margin-bottom: 8px;
}

.ytgif-frame-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  margin-bottom: 8px;
  font-family: 'Monaco', 'Courier New', monospace;
  letter-spacing: 0.3px;
}

/* Progress Bar Container */
.ytgif-progress-bar-container {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* Progress Bar Fill */
.ytgif-progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #cc3399, #ff0066);
  border-radius: 3px;
  transition: width 0.15s ease;
  box-shadow: 0 0 8px rgba(204, 52, 153, 0.5);
}
```

**Rationale**: 
- Monospace font for frame count readability
- Matches existing color scheme (#cc3399 · #ff0066 gradient)
- Subtle border/shadow for visual depth
- Smooth width transitions for progress bar animation

---

## 6. Props Type Update

### 6.1 Update ProcessingScreenProps Interface (Lines 3-14)
**Add Optional Details Field**:

```typescript
interface ProcessingScreenProps {
  processingStatus?: {
    stage: string;
    stageNumber: number;
    totalStages: number;
    progress: number;
    message: string;
    encoder?: string;
    details?: {  // ADD THIS
      currentFrame?: number;
      totalFrames?: number;
      currentStep?: number;
      totalSteps?: number;
    };
  };
  onComplete?: () => void;
  onError?: (error: string) => void;
}
```

**Note**: This mirrors the `details` field already defined in `JobProgressUpdate` message type (src/types/messages.ts:198-203).

---

## 7. Data Flow Integration Points

### 7.1 Message Handler to ProcessingScreen Pipeline
1. **gif-processor.ts** emits `StageProgressInfo` with `details` containing frame counts
2. **message-handler.ts** receives and forwards to overlay
3. **OverlayWizard.tsx** receives `processingStatus` prop (line 25-32)
4. **ProcessingScreen.tsx** consumes via `processingStatus?.details`

### 7.2 Duration Calculation Notes
```typescript
// Estimated duration calculation
const estimatedDurationSeconds = Math.round(
  (totalFrames / frameRate) * 1.5  // 1.5s multiplier accounts for frame processing overhead
);

// Simpler version in implementation:
Math.round((totalFrames / (processingStatus?.details?.totalFrames || 1)) * 30)
```

---

## 8. Detailed Line-by-Line Implementation Guide

### 8.1 Step-by-Step Changes

**STEP 1: Add State Hook (After line 21)**
- Insert at line 22-24
- Declare state for caching buffering status
- Type: `undefined | { currentFrame?, totalFrames?, currentStep?, totalSteps? }`

**STEP 2: Add useEffect (After line 29)**
- Insert at lines 30-38
- Effect hook to sync `processingStatus.details` to `lastBufferingStatus`
- Dependencies: `[processingStatus?.stage, processingStatus?.details?.currentFrame, processingStatus?.details?.totalFrames]`

**STEP 3: Add Computed Variables (After line 48)**
- Insert at lines 49-50
- `const isCaptureStage = currentStage === 'CAPTURING'`
- `const shouldShowProgress = isCaptureStage && lastBufferingStatus && !isError && !isCompleted`

**STEP 4: Update JSX (Lines 138-152 replacement)**
- Replace entire message section (lines 137-152)
- Keep encoder display
- Add conditional frame counter before encoder check
- Add "Initializing..." placeholder for capture stage without data
- Keep loading dots animation

**STEP 5: Update CSS (After line 1753)**
- Add 4 new CSS classes with proper nesting
- Ensure color values match theme (#cc3399, #ff0066)
- Use smooth transitions for progress bar

**STEP 6: Update Props Interface (Lines 3-14)**
- Add optional `details` field to `processingStatus`
- Match structure from `JobProgressUpdate.data.details`

---

## 9. Edge Cases & Safeguards

### 9.1 Division by Zero
```typescript
// Safe calculation - use || 1 fallback
const percentage = lastBufferingStatus.totalFrames 
  ? (lastBufferingStatus.currentFrame / lastBufferingStatus.totalFrames) * 100
  : 0;
```

### 9.2 Missing Frame Data
- Show "Initializing..." when in CAPTURING but no `lastBufferingStatus`
- Falls back to existing loading dots animation
- Progress bar width defaults to 0% if no data

### 9.3 Stage Transitions
- Frame counter only shows during CAPTURING stage
- Clears automatically when moving to ANALYZING/ENCODING/FINALIZING
- No data leakage between stages

### 9.4 Error/Complete States
- Frame counter hidden if `isError || isCompleted`
- Preserves existing error handling behavior
- Loading dots remain visible for non-CAPTURING stages

---

## 10. Testing Checklist

- [ ] Frame counter displays "Frame X/Y · ~Zs" during capture
- [ ] Progress bar width updates smoothly (0-100%)
- [ ] "Initializing..." shows initially, replaces with frame count
- [ ] Counter hidden during ANALYZING/ENCODING/FINALIZING stages
- [ ] Counter hidden on error state
- [ ] Counter hidden on completed state
- [ ] Loading dots visible throughout all stages
- [ ] Encoder info displays correctly
- [ ] No crashes with missing `processingStatus.details`
- [ ] CSS renders correctly on Firefox (test both light/dark themes)
- [ ] Progress bar gradient colors visible against dark background

---

## 11. Chrome vs Firefox Differences

### No differences - Implementation identical:
- State management patterns same
- CSS uses standard properties (no browser-specific hacks)
- React hooks work identically across both
- Message format (`JobProgressUpdate.details`) already designed for both

---

## 12. Rollback Plan

If frame counting introduces bugs:
1. Remove `lastBufferingStatus` state hook
2. Remove buffering status useEffect
3. Revert JSX to original message/loading-dots section
4. Remove frame counter CSS classes
5. Remove `details` from props interface

All changes are isolated to ProcessingScreen - no cascading dependencies.

