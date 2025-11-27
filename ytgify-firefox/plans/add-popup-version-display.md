# Plan: Add Version Display to Popup

**Created:** 2025-01-10
**Status:** Not Started
**Estimated Effort:** 1.5 hours
**Related PR:** Chrome Extension PR #47

## Overview

Add version number display to popup footer matching Chrome extension implementation. Display format: "v{version}" (e.g., "v1.0.10").

### Current State
- Firefox popup lacks version display
- Chrome extension already has this feature (merged Nov 2, 2025)
- Popup footer has conditional review CTA but no version info

### Goal
- Display extension version at bottom of popup
- Match Chrome extension styling and behavior
- Maintain clean, unobtrusive design
- Ensure version always visible regardless of other footer elements

---

## Task 1: Add Version State and Retrieval Logic

**File:** `src/popup/popup-modern.tsx`

### Changes Required

1. **Add version state** (after line 12):
```typescript
const [showFooter, setShowFooter] = React.useState(false);
const [version, setVersion] = React.useState(''); // ADD THIS
```

2. **Add version retrieval effect** (after line 64):
```typescript
// Load extension version from manifest
React.useEffect(() => {
  try {
    const manifest = browser.runtime.getManifest();
    if (manifest?.version) {
      setVersion(manifest.version);
    }
  } catch (error) {
    console.error('[Popup] Failed to get version:', error);
    setVersion('');
  }
}, []);
```

### Acceptance Criteria
- ✅ Version state initialized to empty string
- ✅ Version loaded from manifest on component mount
- ✅ Error handling prevents crashes if manifest unavailable
- ✅ Version updates only once (empty dependency array)
- ✅ No console warnings or errors

### Edge Cases
- **Manifest unavailable:** Wrapped in try-catch, logs error, version stays empty
- **No version in manifest:** Conditional check prevents setting undefined
- **Extension reload:** Component remounts, version re-fetched (expected behavior)

---

## Task 2: Add Version Display to Popup Footer UI

**File:** `src/popup/popup-modern.tsx`

### Location
After the conditional review footer (after line 321), before closing `</div>` tag of `popup-modern`

### Current Structure
```tsx
      {/* Footer CTA */}
      {showFooter && (
        <div className="popup-footer">
          <span>Enjoying YTGify? </span>
          <a onClick={handleReview}>Leave us a review!</a>
          <button className="dismiss-btn" onClick={handleDismissFooter}>×</button>
        </div>
      )}

    </div>  // <-- closing tag of popup-modern
  );
```

### New Structure
```tsx
      {/* Footer CTA */}
      {showFooter && (
        <div className="popup-footer">
          <span>Enjoying YTGify? </span>
          <a onClick={handleReview}>Leave us a review!</a>
          <button className="dismiss-btn" onClick={handleDismissFooter}>×</button>
        </div>
      )}

      {/* Version Display - Always Visible */}
      {version && (
        <div className="popup-version">
          v{version}
        </div>
      )}

    </div>
  );
```

### Acceptance Criteria
- ✅ Version displays only if version state is not empty
- ✅ Uses "v" prefix (e.g., "v1.0.10")
- ✅ Always visible (not conditional on showFooter)
- ✅ Positioned at bottom of popup
- ✅ Does not interfere with review footer above it
- ✅ No layout shift when version appears

### UI Design Requirements
- Subtle, unobtrusive appearance
- Small font size (10-12px)
- Muted color (semi-transparent gray)
- Center-aligned
- Minimal padding
- Clear visual separation from content above

---

## Task 3: Add CSS Styling for Version Display

**File:** `src/popup/styles-modern.css`

### Location
End of file (after `.popup-footer` styles, around line 360)

### CSS to Add
```css
/* Version Display */
.popup-version {
  padding: 8px;
  text-align: center;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  background: transparent;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  margin-top: auto;
  user-select: none;
}

.popup-version:hover {
  color: rgba(255, 255, 255, 0.6);
}
```

### Design Rationale
- **11px font:** Small, unobtrusive
- **40% opacity:** Very subtle, doesn't compete with main content
- **Border-top:** Visual separation from content above
- **Center-aligned:** Balanced appearance
- **Hover effect:** Slightly brighter on hover for interactivity feedback
- **Transparent background:** Blends with popup background
- **Minimal padding:** Compact footer
- **user-select: none:** Prevents accidental text selection

### Acceptance Criteria
- ✅ Version text is readable but unobtrusive
- ✅ Styling matches popup's overall dark theme
- ✅ No layout shift or overflow
- ✅ Consistent spacing with other footer elements
- ✅ Hover state provides subtle feedback
- ✅ Works at different zoom levels (90%-125%)

### Optional: Light Theme Support
```css
/* Light theme override (if applicable) */
.popup-modern[data-theme="light"] .popup-version {
  color: rgba(0, 0, 0, 0.4);
  border-top-color: rgba(0, 0, 0, 0.05);
}

.popup-modern[data-theme="light"] .popup-version:hover {
  color: rgba(0, 0, 0, 0.6);
}
```

---

## Task 4: Update Popup Unit Tests

**File:** `tests/unit/popup/popup-modern.test.tsx`

### Test Cases to Add

#### Test 1: Version Display Renders
```typescript
describe('Popup Version Display', () => {
  it('should display version number from manifest', async () => {
    // Mock browser.runtime.getManifest
    const mockManifest = { version: '1.0.10' };
    (browser.runtime.getManifest as jest.Mock).mockReturnValue(mockManifest);

    render(<PopupApp />);

    // Wait for useEffect to run
    await waitFor(() => {
      const versionElement = screen.getByText(/v1\.0\.10/);
      expect(versionElement).toBeInTheDocument();
    });
  });

  it('should not display version if manifest version is empty', () => {
    const mockManifest = { version: '' };
    (browser.runtime.getManifest as jest.Mock).mockReturnValue(mockManifest);

    render(<PopupApp />);

    const versionElement = screen.queryByText(/^v/);
    expect(versionElement).not.toBeInTheDocument();
  });

  it('should format version with "v" prefix', async () => {
    const mockManifest = { version: '2.5.3' };
    (browser.runtime.getManifest as jest.Mock).mockReturnValue(mockManifest);

    render(<PopupApp />);

    await waitFor(() => {
      expect(screen.getByText('v2.5.3')).toBeInTheDocument();
    });
  });

  it('should handle manifest retrieval errors gracefully', () => {
    (browser.runtime.getManifest as jest.Mock).mockImplementation(() => {
      throw new Error('Manifest not available');
    });

    // Should not throw
    expect(() => render(<PopupApp />)).not.toThrow();

    // Version should not be displayed
    const versionElement = screen.queryByText(/^v/);
    expect(versionElement).not.toBeInTheDocument();
  });
});
```

#### Test 2: CSS Styling Applied
```typescript
it('should apply correct CSS class to version element', async () => {
  const mockManifest = { version: '1.0.10' };
  (browser.runtime.getManifest as jest.Mock).mockReturnValue(mockManifest);

  render(<PopupApp />);

  await waitFor(() => {
    const versionElement = screen.getByText('v1.0.10');
    expect(versionElement).toHaveClass('popup-version');
  });
});
```

#### Test 3: Version Always Visible
```typescript
it('should display version regardless of review footer visibility', async () => {
  const mockManifest = { version: '1.0.10' };
  (browser.runtime.getManifest as jest.Mock).mockReturnValue(mockManifest);

  // Mock engagement tracker to hide review footer
  (engagementTracker.shouldShowPrompt as jest.Mock).mockResolvedValue(false);

  render(<PopupApp />);

  await waitFor(() => {
    // Version should still be visible
    expect(screen.getByText('v1.0.10')).toBeInTheDocument();
    // Review footer should not be visible
    expect(screen.queryByText(/Leave us a review/)).not.toBeInTheDocument();
  });
});
```

### Test Setup Required
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PopupApp from '@/popup/popup-modern';

// Mock browser API
jest.mock('@/shared/engagement-tracker');

const browser = {
  runtime: {
    getManifest: jest.fn(),
  },
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
    create: jest.fn(),
  },
};

global.browser = browser as any;
```

### Acceptance Criteria
- ✅ All new tests pass
- ✅ Tests cover happy path, error handling, and edge cases
- ✅ Mock setup correct for browser.runtime.getManifest
- ✅ Tests run in isolation without side effects
- ✅ Coverage maintained or improved (100% for new code)
- ✅ No test warnings or console errors

---

## Task 5: Manual Testing in Firefox

### Test Scenarios

#### 5.1: Basic Display
1. Build extension: `npm run build`
2. Load in Firefox: `about:debugging` → Load Temporary Add-on → `dist/manifest.json`
3. Open popup by clicking extension icon
4. **Expected:** Version "v1.0.10" displays at bottom of popup
5. **Verify:** Text is small, muted, and unobtrusive

#### 5.2: Version Accuracy
1. Check `manifest.json` version field
2. Compare to version displayed in popup
3. **Expected:** Versions match exactly

#### 5.3: Layout Integration
1. Open popup on various pages:
   - YouTube video page
   - YouTube Shorts page
   - Non-YouTube page
2. Check version display in each state
3. **Expected:** Version always visible, no layout shift, no overlap with other elements

#### 5.4: Interaction with Review Footer
1. Create enough GIFs to trigger review footer (if applicable)
2. Open popup
3. **Expected:** Both review footer AND version display visible
4. **Expected:** Clear visual separation between them
5. Dismiss review footer
6. **Expected:** Version still visible at bottom

#### 5.5: Hover State
1. Hover over version text
2. **Expected:** Text slightly brighter (subtle hover effect)

#### 5.6: Different Screen Sizes
1. Test popup at different zoom levels (90%, 100%, 110%, 125%)
2. **Expected:** Version remains visible and properly positioned
3. **Expected:** No text overflow or truncation

#### 5.7: Dark Theme Consistency
1. Compare version styling with rest of popup
2. **Expected:** Color scheme consistent with popup's dark theme
3. **Expected:** Opacity/contrast appropriate for footer element

### Manual Testing Checklist
- [ ] Basic display works on YouTube video page
- [ ] Version matches manifest.json
- [ ] Version visible on YouTube Shorts page
- [ ] Version visible on non-YouTube page
- [ ] Version visible when review footer shown
- [ ] Version visible when review footer dismissed
- [ ] Hover effect works smoothly
- [ ] No layout shift when popup opens
- [ ] Text readable at 90% zoom
- [ ] Text readable at 125% zoom
- [ ] No console errors in browser console
- [ ] No TypeScript errors in build output

### Screenshot Checklist
- [ ] Popup on YouTube video page (with version visible)
- [ ] Popup with review footer + version (both visible)
- [ ] Popup on non-YouTube page (version visible)
- [ ] Close-up of version styling (for documentation)

---

## Implementation Order

### Phase 1: Code Changes (Sequential)
1. **Task 1:** Add version state/logic → `popup-modern.tsx:12-70`
2. **Task 2:** Add version UI element → `popup-modern.tsx:321-327`
3. **Task 3:** Add CSS styling → `styles-modern.css:360+`

### Phase 2: Testing (Parallel after Phase 1)
4. **Task 4:** Unit tests → `tests/unit/popup/`
5. **Task 5:** Manual testing → Firefox Developer Edition

### Phase 3: Verification
6. Run `npm run typecheck` (verify no TS errors)
7. Run `npm run build` (verify build succeeds)
8. Run `npm test` (verify all tests pass)
9. Visual review in Firefox

---

## Edge Cases Handled

### 1. Manifest Unavailable
**Scenario:** `browser.runtime.getManifest()` throws error or returns null

**Handling:** Try-catch block catches error, logs to console, version stays empty string, div doesn't render

### 2. Version Format Variations
**Scenario:** Version might be "1.0.10", "1.0.10-beta", "1.0.10.1"

**Handling:** Display as-is with "v" prefix (no validation needed)

### 3. Long Version Strings
**Scenario:** Version like "1.0.10-alpha.build.12345"

**Handling:** CSS can optionally include `text-overflow: ellipsis`:
```css
.popup-version {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
```

### 4. Multiple Popups Open
**Scenario:** User opens popup in multiple tabs

**Handling:** No special handling needed - each popup instance independently reads manifest

### 5. Version Changes During Session
**Scenario:** Extension updates while popup is open

**Handling:** Not needed - popup closes on extension reload

### 6. Empty Version String
**Scenario:** `manifest.version` is empty string or undefined

**Handling:** Conditional rendering `{version && (...)}` prevents displaying empty div

---

## Rollback Plan

### If Issues Arise

1. **Revert Commits:**
   ```bash
   git revert HEAD  # or specific commit hash
   ```

2. **Files to Revert:**
   - `src/popup/popup-modern.tsx` (lines 12, 65-72, 324-328)
   - `src/popup/styles-modern.css` (last ~15 lines)
   - `tests/unit/popup/popup-modern.test.tsx` (test cases)

3. **Quick Fix (if minor issue):**
   - Hide version with CSS: `.popup-version { display: none; }`
   - Comment out version state/effect in TypeScript

4. **No User Impact:**
   - Feature is purely additive
   - Removal doesn't break existing functionality
   - No data migration concerns

---

## Success Metrics

- ✅ Version displays correctly in popup footer
- ✅ Version matches `manifest.json` exactly
- ✅ No console errors or warnings
- ✅ All unit tests pass (100% coverage for new code)
- ✅ No visual regressions in popup layout
- ✅ Build succeeds with no TypeScript errors
- ✅ Manual testing passes all scenarios
- ✅ Code review approved (if applicable)
- ✅ Feature parity with Chrome extension achieved

---

## Estimated Effort

| Task | Time Estimate |
|------|---------------|
| Task 1: State/Logic | 10 minutes |
| Task 2: UI Element | 10 minutes |
| Task 3: CSS Styling | 15 minutes |
| Task 4: Unit Tests | 30 minutes |
| Task 5: Manual Testing | 20 minutes |
| **Total** | **~1.5 hours** |

*Note: Times include implementation, testing, and verification*

---

## Dependencies

### Required Files
- `src/popup/popup-modern.tsx` (exists)
- `src/popup/styles-modern.css` (exists)
- `manifest.json` (exists)

### Browser APIs
- `browser.runtime.getManifest()` (Firefox native)

### Testing Dependencies
- `@testing-library/react`
- `@testing-library/jest-dom`
- `jest`

### No External Dependencies Required
- Uses only built-in React hooks (useState, useEffect)
- No new npm packages needed
- No new build configuration required

---

## References

- **Chrome Extension PR #47:** https://github.com/neonwatty/ytgify/pull/47
- **Firefox Manifest API:** https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/getManifest
- **Current Popup Implementation:** `src/popup/popup-modern.tsx`
- **Current Popup Styles:** `src/popup/styles-modern.css`
- **React useEffect Hook:** https://react.dev/reference/react/useEffect

---

## Notes

- This feature is purely cosmetic and non-critical
- Low risk of breaking existing functionality
- Easy to roll back if issues arise
- Provides user transparency about extension version
- Useful for debugging and support purposes
- Matches Chrome extension for consistency

---

## Post-Implementation Tasks

1. Update CHANGELOG.md with feature addition
2. Take screenshots for documentation
3. Consider adding to Firefox Add-ons update notes
4. Monitor for user feedback after release
5. Consider adding version to other UI surfaces (if beneficial)

---

**Status:** Ready for implementation
**Last Updated:** 2025-01-10
