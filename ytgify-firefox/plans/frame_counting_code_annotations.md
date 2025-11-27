# Frame Counting UI - Code Annotations & Pseudo-Code

## File 1: ProcessingScreen.tsx

### SECTION A: Imports (Lines 1-2)
```typescript
import React, { useEffect, useState } from 'react';
// No changes - hooks already imported
```

---

### SECTION B: Props Interface (Lines 3-14)

**BEFORE:**
```typescript
interface ProcessingScreenProps {
  processingStatus?: {
    stage: string;
    stageNumber: number;
    totalStages: number;
    progress: number;
    message: string;
    encoder?: string;
  };
  onComplete?: () => void;
  onError?: (error: string) => void;
}
```

**AFTER (ADD details field):**
```typescript
interface ProcessingScreenProps {
  processingStatus?: {
    stage: string;
    stageNumber: number;
    totalStages: number;
    progress: number;
    message: string;
    encoder?: string;
    details?: {              // ← NEW FIELD
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

**Rationale:** Allows component to receive detailed frame information from parent.

---

### SECTION C: Component Body (Lines 16-20)

**UNCHANGED:**
```typescript
const ProcessingScreen: React.FC<ProcessingScreenProps> = ({
  processingStatus,
  onComplete,
  onError: _onError,
}) => {
```

---

### SECTION D: Dots State (Lines 21-29)

**BEFORE:**
```typescript
const [_dots, _setDots] = useState('');

// Animate dots for loading effect
useEffect(() => {
  const interval = setInterval(() => {
    _setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
  }, 500);
  return () => clearInterval(interval);
}, []);
```

**AFTER (ADD buffering status state after this):**
```typescript
const [_dots, _setDots] = useState('');

// Animate dots for loading effect
useEffect(() => {
  const interval = setInterval(() => {
    _setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
  }, 500);
  return () => clearInterval(interval);
}, []);

// ─────── NEW: Track buffering status for frame counter ───────
const [lastBufferingStatus, setLastBufferingStatus] = useState<{
  currentFrame?: number;
  totalFrames?: number;
  currentStep?: number;
  totalSteps?: number;
} | undefined>();

// Track buffering status when in CAPTURING stage
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
// ─────── END NEW ───────
```

**Logic Breakdown:**
1. Only update when in CAPTURING stage
2. Only update when frame data is present
3. Dependencies explicitly list the fields being checked
4. Empty dependencies would cause infinite updates
5. Conditions prevent stale data leakage from other stages

---

### SECTION E: Completion Check (Lines 32-38)

**UNCHANGED:**
```typescript
// Check for completion
useEffect(() => {
  if (processingStatus?.progress === 100) {
    setTimeout(() => {
      onComplete?.();
    }, 1000);
  }
}, [processingStatus?.progress, onComplete]);
```

---

### SECTION F: Variable Extraction (Lines 40-44)

**BEFORE:**
```typescript
const currentStage = processingStatus?.stage || 'CAPTURING';
const stageNumber = processingStatus?.stageNumber || 1;
const totalStages = processingStatus?.totalStages || 4;
const message = processingStatus?.message || 'Initializing...';
const encoder = processingStatus?.encoder;

// Check for special states
const isError = currentStage === 'ERROR';
const isCompleted = currentStage === 'COMPLETED';
```

**AFTER (ADD computed variables after isCompleted):**
```typescript
const currentStage = processingStatus?.stage || 'CAPTURING';
const stageNumber = processingStatus?.stageNumber || 1;
const totalStages = processingStatus?.totalStages || 4;
const message = processingStatus?.message || 'Initializing...';
const encoder = processingStatus?.encoder;

// Check for special states
const isError = currentStage === 'ERROR';
const isCompleted = currentStage === 'COMPLETED';

// ─────── NEW: Conditional rendering logic ───────
const isCaptureStage = currentStage === 'CAPTURING';
const shouldShowProgress = isCaptureStage && lastBufferingStatus && !isError && !isCompleted;
// ─────── END NEW ───────
```

**Logic Breakdown:**
```
shouldShowProgress = true when:
  isCaptureStage=true
  AND lastBufferingStatus!=undefined
  AND isError=false
  AND isCompleted=false

This ensures:
- Frame counter only shows during CAPTURING
- Frame counter only shows when data is available
- Frame counter hidden on errors
- Frame counter hidden when complete
```

---

### SECTION G: Stages Definition (Lines 51-56)

**UNCHANGED:**
```typescript
// Define all stages
const stages = [
  { key: 'CAPTURING', name: 'Capturing Frames', icon: '📹' },
  { key: 'ANALYZING', name: 'Analyzing Colors', icon: '🎨' },
  { key: 'ENCODING', name: 'Encoding GIF', icon: '🔧' },
  { key: 'FINALIZING', name: 'Finalizing', icon: '✨' },
];
```

---

### SECTION H: JSX Return & Header (Lines 58-66)

**UNCHANGED:**
```typescript
return (
  <div className="ytgif-processing-screen">
    <div className="ytgif-wizard-header">
      <div style={{ width: '20px' }}></div>
      <h2 className="ytgif-wizard-title">
        {isError ? 'GIF Creation Failed' : isCompleted ? 'GIF Created!' : 'Creating Your GIF'}
      </h2>
      <div style={{ width: '20px' }}></div>
    </div>
```

---

### SECTION I: Stage Progress Display (Lines 68-135)

**UNCHANGED:** All 68 lines of stage progress rendering

---

### SECTION J: Current Message Section (Lines 137-152) - MAJOR CHANGE

**BEFORE:**
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

**AFTER:**
```typescript
{/* Current Message */}
<div className="ytgif-current-message">
  {/* Main status message - unchanged */}
  <div className="ytgif-message-text">{message}</div>
  
  {/* ═════════ NEW: Frame Counter Display ═════════ */}
  {shouldShowProgress && lastBufferingStatus && (
    <div className="ytgif-frame-counter">
      {/* Frame count text - displays "Frame 5/30 · ~45s" */}
      <div className="ytgif-frame-text">
        Frame {lastBufferingStatus.currentFrame}/{lastBufferingStatus.totalFrames}
        {lastBufferingStatus.totalFrames && (
          <>
            · ~{Math.round((lastBufferingStatus.totalFrames / (processingStatus?.details?.totalFrames || 1)) * 30)}s
          </>
        )}
      </div>
      
      {/* Progress bar - animated fill from 0-100% */}
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
  
  {/* NEW: Initializing placeholder - shown initially during capture */}
  {isCaptureStage && !lastBufferingStatus && !isError && !isCompleted && (
    <div className="ytgif-frame-counter">
      <div className="ytgif-frame-text">Initializing...</div>
    </div>
  )}
  {/* ═════════ END NEW ═════════ */}
  
  {/* Encoder display - unchanged */}
  {encoder && (
    <div className="ytgif-message-text" data-encoder>
      Encoder: {encoder}
    </div>
  )}
  
  {/* Loading dots animation - unchanged */}
  {!isError && !isCompleted && (
    <div className="ytgif-loading-dots">
      <span className="ytgif-dot">⚬</span>
      <span className="ytgif-dot">⚬</span>
      <span className="ytgif-dot">⚬</span>
    </div>
  )}
</div>
```

**Detailed JSX Logic:**

**Frame Counter (shouldShowProgress check):**
```
IF:
  shouldShowProgress=true (CAPTURING + has data + no error + not complete)
THEN:
  DISPLAY: "Frame X/Y · ~Zs"
  DISPLAY: Progress bar with animated fill
ELSE:
  HIDE this section
```

**Initializing Placeholder:**
```
IF:
  isCaptureStage=true
  AND lastBufferingStatus=undefined
  AND isError=false
  AND isCompleted=false
THEN:
  DISPLAY: "Initializing..."
ELSE:
  HIDE this section
```

**Duration Calculation:** 
```typescript
Math.round(
  (lastBufferingStatus.totalFrames / (processingStatus?.details?.totalFrames || 1)) * 30
)
// For typical 30 frames at 5fps: 30 * 30 / 30 = 30s
// For typical 45 frames at 5fps: 45 * 30 / 45 = 30s ≈ ~45s
```

**Progress Bar Percentage:**
```typescript
lastBufferingStatus.totalFrames 
  ? (lastBufferingStatus.currentFrame / lastBufferingStatus.totalFrames) * 100
  : 0
// Safe calculation with 0% fallback
// At frame 15/30: (15/30)*100 = 50%
```

---

### SECTION K: Closing Tags (Lines 153-160)

**UNCHANGED:**
```typescript
        </div>
      </div>
    </div>
  );
};

export default ProcessingScreen;
```

---

## File 2: wizard-styles.css

### CSS Addition Location

**INSERT AFTER LINE 1753** (after `.ytgif-loading-dots` animation block)

### NEW CSS CLASSES:

```css
/* ═════════════════════════════════════════════════════════
   Frame Counter Display
   ═════════════════════════════════════════════════════════ */

.ytgif-frame-counter {
  margin-top: 12px;        /* Space from message text above */
  margin-bottom: 8px;      /* Space before encoder info below */
  /* Padding inherited from parent .ytgif-current-message */
}

.ytgif-frame-text {
  color: rgba(255, 255, 255, 0.9);    /* Bright, slightly opaque */
  font-size: 13px;                     /* Compact but readable */
  font-weight: 500;                    /* Medium weight for emphasis */
  text-align: center;                  /* Center in container */
  margin-bottom: 8px;                  /* Space above progress bar */
  font-family: 'Monaco', 'Courier New', monospace;  /* Monospace for numbers */
  letter-spacing: 0.3px;               /* Slight letter spacing for clarity */
}

/* Progress Bar Container - the background track */
.ytgif-progress-bar-container {
  width: 100%;                         /* Fill available width */
  height: 6px;                         /* Visual but not intrusive */
  background: rgba(255, 255, 255, 0.1);  /* Subtle dark background */
  border-radius: 3px;                  /* Rounded corners */
  overflow: hidden;                    /* Hide content outside border */
  border: 1px solid rgba(255, 255, 255, 0.08);  /* Subtle border */
}

/* Progress Bar Fill - the animated bar */
.ytgif-progress-bar-fill {
  height: 100%;                        /* Match container height */
  background: linear-gradient(90deg, #cc3399, #ff0066);  /* Matches theme */
  border-radius: 3px;                  /* Match container corners */
  transition: width 0.15s ease;        /* Smooth animation on width change */
  box-shadow: 0 0 8px rgba(204, 52, 153, 0.5);  /* Glow effect */
}
```

### CSS Logic Breakdown:

**Spacing Model:**
```
.ytgif-message-text (above)
    ↓ margin-bottom: 8px
.ytgif-frame-counter (NEW)
    ├─ margin-top: 12px
    ├─ margin-bottom: 8px
    └─ .ytgif-frame-text
        ├─ margin-bottom: 8px
        └─ .ytgif-progress-bar-container
.ytgif-message-text[data-encoder] (below)
```

**Color Scheme:**
- Text: `rgba(255,255,255,0.9)` = 90% opaque white
- Container bg: `rgba(255,255,255,0.1)` = 10% opaque white (dark)
- Bar gradient: `#cc3399 → #ff0066` (existing theme colors)
- Glow: `rgba(204,52,153,0.5)` = 50% opaque pink

**Animation:**
- Transition: `width 0.15s ease` (smooth but responsive)
- 150ms chosen to feel responsive without being jarring
- Only width changes (efficient - no repaints needed)

**Typography:**
- Font: Monospace (Monaco/Courier) for numbers
- Size: 13px (smaller than message text but still readable)
- Weight: 500 (medium - between normal and bold)
- Letter-spacing: 0.3px (adds clarity to numbers)

---

## Data Flow Pseudo-Code

### When frame extraction begins:

```
1. gif-processor sends progress update:
   {
     stage: 'CAPTURING',
     details: { currentFrame: 0, totalFrames: 30 }
   }

2. OverlayWizard receives processingStatus prop with details

3. ProcessingScreen.tsx:
   a. useEffect runs (dependencies changed)
   b. Checks: stage === 'CAPTURING' ✓
   c. Checks: details.currentFrame defined ✓
   d. Checks: details.totalFrames defined ✓
   e. Calls setLastBufferingStatus(details)
   f. Component re-renders

4. Computed variables re-evaluate:
   a. shouldShowProgress = CAPTURING ∧ lastBufferingStatus ∧ !error ∧ !complete = TRUE
   b. isCaptureStage = CAPTURING = TRUE

5. Render:
   a. shouldShowProgress is TRUE
   b. Frame counter section renders
   c. Progress bar width = (0/30)*100 = 0%
   d. Text displays: "Frame 0/30 · ~30s"
```

### During extraction (frame 15 of 30):

```
1. gif-processor sends:
   {
     stage: 'CAPTURING',
     details: { currentFrame: 15, totalFrames: 30 }
   }

2. useEffect sees new details.currentFrame (15 vs 0)
   a. Dependencies changed
   b. setLastBufferingStatus called
   c. Component re-renders

3. Re-render:
   a. Progress bar width = (15/30)*100 = 50%
   b. Text updates to: "Frame 15/30 · ~30s"
   c. Animation smooth via CSS transition
```

### When moving to ANALYZING stage:

```
1. gif-processor sends:
   {
     stage: 'ANALYZING',
     details: { ... }  (may be undefined)
   }

2. useEffect runs:
   a. Checks: stage === 'CAPTURING' ✗ (is ANALYZING)
   b. Condition fails
   c. setLastBufferingStatus NOT called
   d. lastBufferingStatus remains as was

3. Computed variables:
   a. isCaptureStage = ANALYZING === CAPTURING = FALSE
   b. shouldShowProgress = FALSE ∧ ... = FALSE

4. Render:
   a. Frame counter hidden
   b. "Analyzing Colors..." message shows instead
   c. Stage indicator changes to ANALYZING
```

### On error:

```
1. processingStatus:
   {
     stage: 'ERROR',
     details: { ... }
   }

2. Computed variables:
   a. isError = ERROR === ERROR = TRUE
   b. shouldShowProgress = ... ∧ !TRUE = FALSE

3. Render:
   a. Frame counter hidden
   b. Error message displayed
   c. Stage indicator shows failed state
```

---

## State Mutation Timeline

```
INITIALIZATION:
  lastBufferingStatus = undefined
  _dots = ''

FRAME 0 (start capture):
  processingStatus.details = { currentFrame: 0, totalFrames: 30 }
  →setLastBufferingStatus({ currentFrame: 0, totalFrames: 30 })
  lastBufferingStatus = { currentFrame: 0, totalFrames: 30 }

FRAME 5:
  processingStatus.details = { currentFrame: 5, totalFrames: 30 }
  →setLastBufferingStatus({ currentFrame: 5, totalFrames: 30 })
  lastBufferingStatus = { currentFrame: 5, totalFrames: 30 }

... continues until ...

FRAME 30 (end capture):
  processingStatus.details = { currentFrame: 30, totalFrames: 30 }
  →setLastBufferingStatus({ currentFrame: 30, totalFrames: 30 })
  lastBufferingStatus = { currentFrame: 30, totalFrames: 30 }

TRANSITION TO ANALYZING:
  processingStatus.stage = 'ANALYZING'
  processingStatus.details = undefined
  →setLastBufferingStatus NOT called (stage check fails)
  lastBufferingStatus = { currentFrame: 30, totalFrames: 30 } (unchanged)
  
  RENDER: shouldShowProgress = FALSE (isCaptureStage = FALSE)
  RESULT: Frame counter hidden

... continues through ENCODING/FINALIZING ...

TRANSITION TO COMPLETED:
  processingStatus.stage = 'COMPLETED'
  isCompleted = TRUE
  →setLastBufferingStatus NOT called
  lastBufferingStatus = { ... } (unchanged but hidden)
  
  RENDER: shouldShowProgress = FALSE (isCompleted = TRUE)
  RESULT: Frame counter hidden (success screen shown instead)
```

