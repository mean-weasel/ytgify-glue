# Frame Counting UI - Implementation Summary

## Changes Required

### 1. ProcessingScreen.tsx

#### State Addition (2 hooks)
```
Line 22-24:   State for lastBufferingStatus
Line 30-38:   useEffect to sync buffering status
```

#### Computed Variables (2 constants)
```
Line 49-50:   isCaptureStage + shouldShowProgress
```

#### JSX Replacement (lines 137-152)
```
REMOVE: Lines 138-152 (current message section)
ADD: 
  - Frame counter div with conditional rendering
  - Progress bar with inline width calculation
  - "Initializing..." placeholder for CAPTURING stage
  - Keep existing encoder info & loading dots
```

#### Props Interface Update (line 3-14)
```
ADD: details?: { currentFrame?, totalFrames?, ... }
```

---

### 2. wizard-styles.css

#### New CSS Classes (after line 1753)
```
.ytgif-frame-counter             (container)
.ytgif-frame-text                (text styling)
.ytgif-progress-bar-container    (progress bar background)
.ytgif-progress-bar-fill         (animated bar)
```

---

## Component Structure Overview

```
ProcessingScreen
├── useState: _dots (existing)
├── useState: lastBufferingStatus (NEW)
├── useEffect: dots animation (existing)
├── useEffect: sync buffering status (NEW)
├── computed: isCaptureStage (NEW)
├── computed: shouldShowProgress (NEW)
└── JSX:
    └── .ytgif-processing-screen
        ├── Header (unchanged)
        └── Content
            ├── Stage Progress (unchanged)
            └── Current Message
                ├── Message text (existing)
                ├── Frame Counter (NEW)
                │   ├── "Frame X/Y · ~Zs"
                │   └── Progress bar
                ├── Initializing placeholder (NEW)
                ├── Encoder info (existing)
                └── Loading dots (existing)
```

---

## Data Flow

```
gif-processor.ts
    ↓ emits StageProgressInfo
message-handler.ts
    ↓ forwards processingStatus prop
OverlayWizard.tsx (processingStatus)
    ↓ passes to ProcessingScreen
ProcessingScreen.tsx
    ├── Extract processingStatus.details
    ├── Update lastBufferingStatus state
    ├── Compute shouldShowProgress
    └── Render frame counter UI
```

---

## Critical Numbers & Values

| Item | Value | Purpose |
|------|-------|---------|
| State hook location | After line 21 | Right after _dots state |
| useEffect location | After line 29 | Right after dots animation effect |
| Computed vars location | After line 48 | After isError/isCompleted |
| JSX replacement | Lines 137-152 | Message/loading section |
| CSS location | After line 1753 | After loadingDots animation |
| Progress bar color | #cc3399 → #ff0066 | Existing theme gradient |
| Font size (frame text) | 13px | Readable but compact |
| Progress bar height | 6px | Visual but not intrusive |

---

## Visibility Logic

**Frame counter shows when:**
- Stage = CAPTURING
- lastBufferingStatus exists (has frame data)
- NOT in error state
- NOT in completed state

**"Initializing..." shows when:**
- Stage = CAPTURING
- NO lastBufferingStatus yet
- NOT in error state
- NOT in completed state

**Hidden when:**
- Other stages (ANALYZING/ENCODING/FINALIZING)
- Error or completed states
- No buffering data for non-CAPTURING stages

---

## Key Implementation Details

### Safe Division
```typescript
// Fallback to 0 if no denominator
(currentFrame / (totalFrames || 1)) * 100
```

### Duration Estimation
```typescript
// Shows ~45s for typical 30-frame GIF at 5fps
Math.round((totalFrames / (processingStatus?.details?.totalFrames || 1)) * 30)
```

### State Caching
- Stores last valid buffering status
- Only updates during CAPTURING stage with valid data
- Persists when status updates temporarily lack frame info
- Clears when leaving CAPTURING stage implicitly

---

## Files Modified

1. `/src/content/overlay-wizard/screens/ProcessingScreen.tsx`
   - State hooks (add 1)
   - Effects hooks (add 1)
   - Computed variables (add 2)
   - JSX elements (modify 1 section)
   - Props interface (modify 1)

2. `/src/content/wizard-styles.css`
   - CSS classes (add 4)

---

## Rollback Steps

1. Remove `lastBufferingStatus` useState hook
2. Remove buffering status useEffect
3. Revert JSX section (137-152) to original
4. Remove `details` from ProcessingScreenProps
5. Delete 4 new CSS classes from wizard-styles.css

**Total changes: ~70 lines added, fully reversible, zero dependencies on other files.**

---

## Testing Approach

### Unit Testing
- Mock processingStatus with/without details
- Verify state updates only during CAPTURING
- Verify visibility conditions
- Verify progress bar calculation

### Manual Testing
- Start GIF creation
- Watch frame counter appear (should show "Initializing..." initially)
- Verify counter shows "Frame X/Y · ~Zs"
- Verify progress bar animates 0→100%
- Verify hidden during other stages
- Verify hidden on error
- Verify hidden on completion

---

## CSS Specificity Notes

- Uses class-based selectors (no ID specificity issues)
- Nested properly under .ytgif-current-message
- Inherits font-family from parent
- Color values use rgba for transparency consistency
- Gradient uses same colors as existing progress dots

