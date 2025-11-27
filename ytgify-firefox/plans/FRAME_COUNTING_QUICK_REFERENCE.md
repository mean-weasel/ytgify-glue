# Frame Counting UI - Quick Reference

## Files to Modify
1. `src/content/overlay-wizard/screens/ProcessingScreen.tsx`
2. `src/content/wizard-styles.css`

## Summary of Changes

### ProcessingScreen.tsx

| Change | Lines | Action |
|--------|-------|--------|
| Props Interface | 3-14 | Add `details?: { currentFrame?, totalFrames?, currentStep?, totalSteps? }` |
| State Hook | 22-24 | Add `const [lastBufferingStatus, setLastBufferingStatus] = useState<...>(undefined)` |
| useEffect Hook | 30-38 | Add effect to sync buffering status on stage/details change |
| Computed Variables | 49-50 | Add `isCaptureStage` and `shouldShowProgress` constants |
| JSX Section | 137-152 | Replace message section with enhanced version including frame counter |

### wizard-styles.css

| Change | Location | Action |
|--------|----------|--------|
| CSS Classes | After line 1753 | Add 4 new classes: `.ytgif-frame-counter`, `.ytgif-frame-text`, `.ytgif-progress-bar-container`, `.ytgif-progress-bar-fill` |

## Implementation Checklist

- [ ] Add state hook for `lastBufferingStatus`
- [ ] Add useEffect to sync buffering status from `processingStatus.details`
- [ ] Add `isCaptureStage` computed variable
- [ ] Add `shouldShowProgress` computed variable
- [ ] Update ProcessingScreenProps interface with `details` field
- [ ] Replace message JSX section (lines 137-152)
  - [ ] Keep message text
  - [ ] Add frame counter div (conditional on `shouldShowProgress`)
  - [ ] Add progress bar with inline width calculation
  - [ ] Add "Initializing..." placeholder (conditional on `isCaptureStage` without data)
  - [ ] Keep encoder display
  - [ ] Keep loading dots
- [ ] Add 4 new CSS classes to wizard-styles.css
- [ ] Test frame counter display during capture
- [ ] Test progress bar animation
- [ ] Test "Initializing..." placeholder
- [ ] Test visibility on stage transitions
- [ ] Test on Firefox

## Key Values

| Metric | Value |
|--------|-------|
| State hook location | After line 21 |
| useEffect location | After line 29 |
| Computed vars location | After line 48 |
| JSX replacement start | Line 137 |
| JSX replacement end | Line 152 |
| CSS insertion location | After line 1753 |
| Frame text font size | 13px |
| Progress bar height | 6px |
| Progress bar color | #cc3399 → #ff0066 gradient |
| Animation transition | 0.15s ease |

## Display Logic

```
Frame counter shows when:
  CAPTURING stage ✓
  + Has frame data ✓
  + Not error ✓
  + Not complete ✓

"Initializing..." shows when:
  CAPTURING stage ✓
  + No frame data yet ✓
  + Not error ✓
  + Not complete ✓
```

## Format Examples

| Frames | Display |
|--------|---------|
| 0/30   | Frame 0/30 · ~30s |
| 15/30  | Frame 15/30 · ~30s |
| 30/30  | Frame 30/30 · ~30s |
| Initial (no data) | Initializing... |

## Progress Bar Examples

| Progress | Width |
|----------|-------|
| Frame 0/30 | 0% |
| Frame 7/30 | 23% |
| Frame 15/30 | 50% |
| Frame 23/30 | 77% |
| Frame 30/30 | 100% |

## Safe Fallbacks

| Scenario | Fallback |
|----------|----------|
| No `totalFrames` | Progress bar width = 0% |
| No `currentFrame` | Counter hidden |
| Stage not CAPTURING | Counter hidden |
| Error state | Counter hidden |
| Complete state | Counter hidden |

## CSS Inheritance

```
Parent: .ytgif-current-message
  └─ Child: .ytgif-frame-counter
      ├─ Child: .ytgif-frame-text (inherits font-family)
      └─ Child: .ytgif-progress-bar-container
          └─ Child: .ytgif-progress-bar-fill
```

## Duration Calculation

```typescript
// Format: ~Zs where Z = estimated seconds
Math.round((totalFrames / (processingStatus?.details?.totalFrames || 1)) * 30)

// Examples:
// 30 frames → 30/30 * 30 = 30s
// 45 frames → 45/30 * 30 = 45s (approximation)
```

## Code Snippets

### State Hook
```typescript
const [lastBufferingStatus, setLastBufferingStatus] = useState<{
  currentFrame?: number;
  totalFrames?: number;
  currentStep?: number;
  totalSteps?: number;
} | undefined>();
```

### useEffect
```typescript
useEffect(() => {
  if (
    processingStatus?.stage === 'CAPTURING' &&
    processingStatus?.details?.currentFrame !== undefined &&
    processingStatus?.details?.totalFrames !== undefined
  ) {
    setLastBufferingStatus(processingStatus.details);
  }
}, [
  processingStatus?.stage,
  processingStatus?.details?.currentFrame,
  processingStatus?.details?.totalFrames,
]);
```

### Computed Variables
```typescript
const isCaptureStage = currentStage === 'CAPTURING';
const shouldShowProgress = isCaptureStage && lastBufferingStatus && !isError && !isCompleted;
```

### JSX Frame Counter
```typescript
{shouldShowProgress && lastBufferingStatus && (
  <div className="ytgif-frame-counter">
    <div className="ytgif-frame-text">
      Frame {lastBufferingStatus.currentFrame}/{lastBufferingStatus.totalFrames}
      {lastBufferingStatus.totalFrames && (
        <> · ~{Math.round((lastBufferingStatus.totalFrames / (processingStatus?.details?.totalFrames || 1)) * 30)}s</>
      )}
    </div>
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
```

### CSS Classes
```css
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

.ytgif-progress-bar-container {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.ytgif-progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #cc3399, #ff0066);
  border-radius: 3px;
  transition: width 0.15s ease;
  box-shadow: 0 0 8px rgba(204, 52, 153, 0.5);
}
```

## Rollback

If issues occur, revert in this order:
1. Remove 4 CSS classes from wizard-styles.css
2. Revert JSX section (lines 137-152) to original
3. Remove `isCaptureStage` and `shouldShowProgress` variables
4. Remove second useEffect (buffering status sync)
5. Remove `lastBufferingStatus` state hook
6. Remove `details` from ProcessingScreenProps

## Testing Commands

```bash
npm run build
npm run dev:firefox

# In Firefox Developer Edition:
1. Open YouTube video
2. Click extension icon → Create GIF
3. Confirm capture settings
4. Watch ProcessingScreen
5. Verify frame counter appears
6. Verify progress bar animates
7. Verify counter hidden on other stages
```

## Browser Support

Works on: Firefox, Firefox Developer Edition
Should work on: Chrome (identical React/CSS implementation)

## Performance Notes

- State updates only during CAPTURING stage
- useEffect dependencies are specific (no unnecessary re-renders)
- CSS uses only `width` transitions (GPU-accelerated)
- No memory leaks (effect cleanup implicit)
- No expensive computations in render

## Documentation Files

- `frame_counting_ui_plan.md` - Full detailed plan (12 sections)
- `frame_counting_implementation_summary.md` - High-level overview
- `frame_counting_code_annotations.md` - Detailed code explanations
- `FRAME_COUNTING_QUICK_REFERENCE.md` - This file

