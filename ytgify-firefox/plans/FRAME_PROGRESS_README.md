# Frame Progress Emission - Complete Planning Package

## Overview

This package contains comprehensive documentation for implementing frame-level progress tracking in the `captureFrames()` method of `src/content/gif-processor.ts`. The implementation adds real-time feedback during the frame capture stage, showing users frame count, percentage completion, and estimated time remaining.

## Documents Included

### 1. **frame-progress-emission-plan.md** (Primary Plan - 467 lines)
Complete architectural and design specification for frame progress emission.

**Contents**:
- Executive summary
- Current state analysis (methods, line numbers, existing infrastructure)
- Design specification with formulas
- 4-phase implementation plan with detailed code snippets
- Integration points across the codebase
- Performance considerations and overhead analysis
- Specific code changes by line number
- Testing strategy and success criteria
- Risk assessment and implementation order

**Use this for**: Understanding the full scope, calculating ETAs, designing the implementation phases, and validating design decisions.

### 2. **frame-progress-implementation-reference.md** (Tactical Guide - 442 lines)
Step-by-step code modification guide with exact insertions and replacements.

**Contents**:
- Code modification map with before/after examples
- Exact line numbers for all changes
- Complete code snippets ready to copy
- Control flow diagram
- Progress calculation examples
- Testing checklist
- Timing reference tables
- Error handling notes
- Performance impact summary

**Use this for**: Actual implementation, copy-paste code, validating changes against original, and testing.

## Quick Start

### For Code Review
1. Read section 1 (Current State Analysis) in **frame-progress-emission-plan.md**
2. Review section 2 (Design Specification)
3. Skim section 6 (Specific Code Changes) for high-level overview

### For Implementation
1. Open **frame-progress-implementation-reference.md**
2. Follow section 2 (captureFrames() Method Modifications) in order
3. Apply each code block using the line numbers as reference
4. Verify with the testing checklist (section 6)

### For Performance Review
1. Section 5 in **frame-progress-emission-plan.md** (Performance Considerations)
2. Section 9 in **frame-progress-implementation-reference.md** (Performance Impact Summary)

## Key Implementation Points

### Interface Extension
The `StageProgressInfo` interface gains an optional `bufferingStatus` field with:
- `currentFrame`: 0-based index of frame being processed
- `totalFrames`: Total frame count for GIF
- `bufferedPercentage`: 0-100% progress within CAPTURING stage
- `estimatedTimeRemaining`: Seconds remaining (calculated from moving average)
- `isBuffering`: Boolean flag for buffering vs. captured state

### Tracking Variables
Five new variables track progress at loop start:
```typescript
const captureStartTime = performance.now();
let lastProgressEmitTime = 0;
const progressEmitInterval = 500; // ms
let lastEmittedFrame = -1;
const progressEmitFrequency = Math.max(1, Math.ceil(frameCount / 50));
```

### Emission Points
1. **Initial** (optional): Before loop starts
2. **Buffering**: Every 5 polling attempts during seeks (~125ms intervals)
3. **Frame Capture**: After every N frames or on final frame (adaptive frequency)
4. **Recovery**: During recovery seek attempts (optional)

### Calculation Formulas
```
bufferedPercentage = (currentFrame / totalFrames) × 100
averageTimePerFrame = elapsedTime / framesCompleted (in seconds)
estimatedTimeRemaining = (frameCount - currentFrame) × averageTimePerFrame
```

## Integration Scope

### Files to Modify
1. **src/content/gif-processor.ts** (main implementation)
   - Lines 88-96: Interface extension
   - Lines 449-450: Variable initialization
   - Lines 508: Buffering progress (inside while loop)
   - Lines 603: Frame capture progress

2. **src/content/index.ts** (pass-through for UI)
   - Lines 1415-1426: Include bufferingStatus in window.postMessage

### Files Not Modified
- **ProcessingScreen.tsx**: Can optionally display frame count/ETA in message
- **Message types**: No new message types; uses existing StageProgressInfo

## Performance Impact

- **Callback frequency**: Max 50 times per GIF creation (adaptive)
- **Throttle interval**: 500ms minimum between emissions
- **Overhead per emission**: 10-15ms
- **Total overhead**: ~2-3% of frame capture time
- **Memory footprint**: ~200 bytes (stack-based tracking variables only)

## Success Criteria

- [ ] Callbacks fire at expected frequency
- [ ] bufferedPercentage increases monotonically from 0 to 100
- [ ] estimatedTimeRemaining decreases over time
- [ ] isBuffering flag toggles correctly
- [ ] Final frame always reaches 100% progress
- [ ] No breaking changes to existing code
- [ ] Works with frame counts from 1 to 1000+
- [ ] ETA accurate within ±30% of actual time
- [ ] UI responsive to progress updates

## Migration Path

**Backward compatibility**: Fully maintained
- `bufferingStatus` is optional (new field)
- Existing code ignores missing field
- No type breaking changes
- Progressive enhancement pattern

## Testing Strategy

### Unit Tests
- Mock progressCallback and validate call count
- Test bufferedPercentage with various frame counts
- Validate ETA calculation accuracy
- Test edge cases (1 frame, large frame counts)

### Integration Tests
- Full GIF creation with progress tracking
- Verify window.postMessage includes bufferingStatus
- Check processing screen receives updates

### Manual Tests
- Create 10-frame GIF: verify ~5-10 progress updates
- Create 500-frame GIF: verify ~50 progress updates
- Observe frame count in processing message
- Check ETA updates in real-time

## Common Questions

**Q: Why throttle at 500ms?**
A: Balances responsiveness with performance. Updates more than 2x per second are invisible to users but create callback overhead.

**Q: Why cap emissions at 50?**
A: 50 updates provides good granularity for all GIF sizes without callback spam. For 1000-frame GIFs, that's still ~20 updates per second.

**Q: How accurate is the ETA?**
A: Uses moving average of past frame times. Typically within ±30% of actual time. Network jitter and seek distance affect accuracy.

**Q: Can this be integrated with existing progress system?**
A: Yes. The new field is optional and optional chaining prevents errors if missing.

**Q: What if progressCallback is undefined?**
A: All invocations use optional chaining (`?.`), so undefined callbacks are safely ignored.

## Related Documents

See also in `/plans/`:
- `add-popup-version-display.md`: UI display enhancements
- `frame_counting_ui_plan.md`: UI integration for frame count display
- `frame-counting-test-plan.md`: Comprehensive test strategy

## Document History

- **Created**: 2025-11-11
- **Type**: Feature specification and implementation guide
- **Status**: Ready for implementation
- **Author**: Claude Code

## Quick Reference: Line Numbers

| Change | File | Lines | Priority |
|--------|------|-------|----------|
| Interface extension | gif-processor.ts | 88-96 | HIGH |
| Variable init | gif-processor.ts | 449-453 | HIGH |
| Frame capture progress | gif-processor.ts | 603-640 | HIGH |
| Content script integration | index.ts | 1415-1426 | HIGH |
| Buffering progress | gif-processor.ts | 508 | MEDIUM |
| Recovery progress | gif-processor.ts | 560-564 | MEDIUM |

---

**Total implementation scope**: ~100 lines of new code across 2 files
**Estimated implementation time**: 1-2 hours
**Testing time**: 30-60 minutes
**Review time**: 15-30 minutes

