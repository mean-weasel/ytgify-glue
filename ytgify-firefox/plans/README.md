# YTgify Plans Directory

## Frame Counting UI Implementation

Complete documentation for adding frame counting display to ProcessingScreen.tsx with real-time progress visualization.

### Documentation Files

1. **FRAME_COUNTING_QUICK_REFERENCE.md** (START HERE)
   - Quick lookup tables
   - Code snippets
   - Implementation checklist
   - Key values and metrics
   - ~400 lines

2. **frame_counting_implementation_summary.md**
   - High-level overview
   - Component structure diagram
   - Data flow visualization
   - Files to modify summary
   - Testing approach
   - ~200 lines

3. **frame_counting_ui_plan.md**
   - Comprehensive detailed plan (12 sections)
   - State management strategy
   - Conditional rendering logic
   - CSS styling details
   - Edge cases and safeguards
   - Testing checklist
   - Rollback plan
   - ~400 lines

4. **frame_counting_code_annotations.md**
   - Section-by-section code breakdown
   - Before/after comparisons
   - Logic explanations
   - Data flow pseudo-code
   - State mutation timeline
   - ~800 lines

### Quick Start

For implementation, follow this sequence:

1. Read `FRAME_COUNTING_QUICK_REFERENCE.md` - get oriented (5 min)
2. Check `frame_counting_implementation_summary.md` - understand scope (5 min)
3. Reference `frame_counting_code_annotations.md` while coding (as needed)
4. Use detailed plan if questions arise (as needed)

### Key Information

**Files to Modify:**
- `src/content/overlay-wizard/screens/ProcessingScreen.tsx`
- `src/content/wizard-styles.css`

**Total Changes:**
- ~70 lines added
- 2 files modified
- 0 dependencies on other files

**Implementation Time:**
- ~30-45 minutes for full implementation
- ~15 minutes for testing

**Component Changes:**
- 1 new state hook
- 1 new useEffect
- 2 new computed variables
- 1 JSX section replacement
- 4 new CSS classes

### Visual Output

During CAPTURING stage:
```
Frame 15/30 · ~30s
[======    ] 50%
```

Initial state:
```
Initializing...
```

### Browser Support

- Firefox: Fully supported
- Firefox Developer Edition: Fully supported
- Chrome: Should work (identical React/CSS)

### Testing Checklist

Core tests:
- [ ] Frame counter displays during capture
- [ ] Progress bar updates smoothly
- [ ] Counter hidden on other stages
- [ ] Error state handling
- [ ] Complete state handling
- [ ] No crashes with missing data

### Rollback

Fully reversible - no dependencies. Rollback steps documented in quick reference.

### Files Organization

```
plans/
├── README.md (this file)
├── FRAME_COUNTING_QUICK_REFERENCE.md ← START HERE
├── frame_counting_implementation_summary.md
├── frame_counting_ui_plan.md
└── frame_counting_code_annotations.md
```

---

*Plans created: 2025-11-11*
*Target branch: feature/popup-version-display*
*Implementation status: Ready for coding*
