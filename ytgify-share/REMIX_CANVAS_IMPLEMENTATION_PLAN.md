# Remix Canvas Editor - Implementation Plan

**Date:** 2025-11-08
**Status:** Ready for execution
**Current State:** Backend 100% complete, Frontend 70% complete
**Critical Gap:** GIF.js integration for animated GIF handling (0%)

---

## Executive Summary

The remix feature backend is fully implemented and tested (30 tests, 100% passing). The frontend UI is complete with all controls and Canvas rendering. The **only missing piece** is GIF.js integration to handle animated GIFs properly.

**Current Problem:**
- `canvas.toBlob('image/gif')` only creates static images (first frame)
- No frame extraction or frame-by-frame rendering
- Cannot preserve animation in remixed GIFs

**Solution:**
Integrate gif.js + gifuct-js to:
1. Parse source GIF frames
2. Render text overlay on each frame
3. Encode back to animated GIF
4. Upload to backend

**Estimated Effort:** 4-6 hours

---

## Current Implementation Status

### ✅ Complete (80% overall)

**Backend (100%):**
- RemixesController with full validation
- RemixProcessingJob (metadata copying, counter cache)
- Gif model remix associations
- NotificationService integration
- Routes & permissions
- 30 comprehensive tests

**Frontend UI (95%):**
- Complete editor layout (2-column: canvas + controls)
- Text customization controls (font, size, color, outline, position)
- Live preview rendering (static images only)
- Draggable text positioning
- Progress bar UI

**Frontend Logic (60%):**
- Stimulus controller (419 lines)
- Canvas rendering for static images
- Text overlay drawing with outline
- Event handlers for all controls
- Upload form with CSRF

### ❌ Missing (20% overall)

**Critical - Animated GIF Handling (0%):**
- GIF.js import & initialization
- Frame extraction from source GIF
- Frame-by-frame text rendering
- Animated GIF encoding
- Worker script configuration

---

## Technical Architecture

### Libraries Required

1. **gif.js** (already pinned in importmap.rb)
   - Purpose: Encode animated GIFs from Canvas frames
   - CDN: https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js
   - Status: ✅ Pinned, ❌ Not imported

2. **gifuct-js** (needs to be added)
   - Purpose: Decode/parse GIF frames
   - CDN: https://cdn.jsdelivr.net/npm/gifuct-js@2.1.2/dist/gifuct-js.min.js
   - Status: ❌ Not added

3. **GIF.js Worker Script**
   - Purpose: Off-main-thread GIF encoding
   - Location: Need to serve from public/javascripts/ or CDN
   - Status: ❌ Not configured

### Data Flow

```
Source GIF URL
    ↓
[gifuct-js] Parse GIF binary → Extract frames + delays
    ↓
For each frame:
    [Canvas] Draw frame image
    [Canvas] Draw text overlay (with outline)
    [gif.js] Add frame to encoder
    ↓
[gif.js] Render animated GIF → Blob
    ↓
[Stimulus] Upload blob + metadata → Backend
    ↓
[RemixProcessingJob] Process & notify
```

---

## Implementation Plan

### Phase 1: Setup GIF Libraries (30 min)

#### Task 1.1: Add gifuct-js to importmap
**File:** `config/importmap.rb`

```ruby
# Add after gif.js pin
pin "gifuct-js", to: "https://cdn.jsdelivr.net/npm/gifuct-js@2.1.2/dist/gifuct-js.min.js"
```

**Test:**
```bash
bin/rails importmap:audit
```

#### Task 1.2: Download GIF.js worker script
**Commands:**
```bash
mkdir -p public/javascripts
curl -o public/javascripts/gif.worker.js https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js
```

**Verify:**
```bash
ls -lh public/javascripts/gif.worker.js
```

#### Task 1.3: Import libraries in Stimulus controller
**File:** `app/javascript/controllers/remix_editor_controller.js`

**Add at top (line 1):**
```javascript
import { Controller } from "@hotwired/stimulus"
import GIF from "gif.js"
import { parseGIF, decompressFrames } from "gifuct-js"
```

**Update GIF.js initialization in `generateRemix()`:**
```javascript
const gif = new GIF({
  workers: 2,
  quality: 10,
  workerScript: '/javascripts/gif.worker.js',
  width: this.widthValue,
  height: this.heightValue
})
```

---

### Phase 2: Implement Frame Extraction (1 hour)

#### Task 2.1: Add parseGifFrames method
**File:** `app/javascript/controllers/remix_editor_controller.js`

**Add new method:**
```javascript
async parseGifFrames(gifUrl) {
  try {
    // Fetch GIF as ArrayBuffer
    const response = await fetch(gifUrl, { mode: 'cors' })
    const arrayBuffer = await response.arrayBuffer()

    // Parse GIF structure
    const gif = parseGIF(arrayBuffer)
    const frames = decompressFrames(gif, true)

    console.log(`Parsed ${frames.length} frames from GIF`)

    return {
      frames: frames,
      width: gif.lsd.width,
      height: gif.lsd.height
    }
  } catch (error) {
    console.error('Failed to parse GIF:', error)
    throw new Error('Could not parse source GIF')
  }
}
```

#### Task 2.2: Update connect() to parse frames
**File:** `app/javascript/controllers/remix_editor_controller.js`

**Replace `loadSourceGif()` call in `connect()`:**
```javascript
async connect() {
  this.initializeTextSettings()
  await this.parseAndLoadGif()
}

async parseAndLoadGif() {
  try {
    // Parse GIF frames
    this.gifData = await this.parseGifFrames(this.sourceGifUrlValue)

    // Create canvas from first frame for preview
    this.sourceImage = await this.createImageFromFrame(this.gifData.frames[0])
    this.renderPreview()

    console.log(`Loaded source GIF: ${this.gifData.frames.length} frames`)
  } catch (error) {
    console.error('Error loading GIF:', error)
    this.showError('Failed to load source GIF')
  }
}
```

#### Task 2.3: Add createImageFromFrame helper
**File:** `app/javascript/controllers/remix_editor_controller.js`

**Add helper method:**
```javascript
createImageFromFrame(frameData) {
  return new Promise((resolve, reject) => {
    // Create ImageData from frame
    const imageData = new ImageData(
      new Uint8ClampedArray(frameData.patch),
      frameData.dims.width,
      frameData.dims.height
    )

    // Create temporary canvas
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = frameData.dims.width
    tempCanvas.height = frameData.dims.height
    const tempCtx = tempCanvas.getContext('2d')
    tempCtx.putImageData(imageData, 0, 0)

    // Convert to Image
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = tempCanvas.toDataURL()
  })
}
```

---

### Phase 3: Implement Frame-by-Frame Rendering (1 hour)

#### Task 3.1: Add renderFrameWithText method
**File:** `app/javascript/controllers/remix_editor_controller.js`

**Add new method:**
```javascript
async renderFrameWithText(frameData) {
  // Create canvas for this frame
  const canvas = document.createElement('canvas')
  canvas.width = this.widthValue
  canvas.height = this.heightValue
  const ctx = canvas.getContext('2d')

  // Draw frame image
  const frameImage = await this.createImageFromFrame(frameData)
  ctx.drawImage(frameImage, 0, 0, this.widthValue, this.heightValue)

  // Draw text overlay (reuse existing method)
  if (this.textSettings.text.trim()) {
    this.drawTextOverlay(ctx)
  }

  return canvas
}
```

---

### Phase 4: Integrate GIF.js Encoding (1.5 hours)

#### Task 4.1: Rewrite generateRemix method
**File:** `app/javascript/controllers/remix_editor_controller.js`

**Replace entire `generateRemix()` method:**
```javascript
async generateRemix(event) {
  event.preventDefault()

  if (!this.textSettings.text.trim()) {
    this.showError('Please enter some text for your remix')
    return
  }

  this.disableControls()
  this.showProgress(0, 'Starting remix generation...')

  try {
    // Initialize GIF encoder
    const gif = new GIF({
      workers: 2,
      quality: 10,
      workerScript: '/javascripts/gif.worker.js',
      width: this.widthValue,
      height: this.heightValue,
      repeat: 0  // Loop forever
    })

    // Track progress
    gif.on('progress', (progress) => {
      const percent = Math.round(progress * 100)
      this.showProgress(progress, `Encoding GIF: ${percent}%`)
    })

    // Render each frame with text overlay
    console.log(`Rendering ${this.gifData.frames.length} frames...`)
    for (let i = 0; i < this.gifData.frames.length; i++) {
      const frameCanvas = await this.renderFrameWithText(this.gifData.frames[i])
      const delay = this.gifData.frames[i].delay || 100  // Default 100ms

      gif.addFrame(frameCanvas, { delay: delay, copy: true })

      // Update progress for frame rendering
      const frameProgress = (i + 1) / this.gifData.frames.length * 0.3
      this.showProgress(frameProgress, `Rendering frame ${i + 1}/${this.gifData.frames.length}`)
    }

    console.log('All frames added, encoding...')

    // Render to blob
    gif.on('finished', (blob) => {
      console.log(`Generated GIF blob: ${blob.size} bytes`)
      this.uploadRemix(blob)
    })

    gif.render()

  } catch (error) {
    console.error('Error generating remix:', error)
    this.showError(`Failed to generate remix: ${error.message}`)
    this.enableControls()
  }
}
```

#### Task 4.2: Update progress tracking
**File:** `app/javascript/controllers/remix_editor_controller.js`

**Progress now shows:**
1. Frame rendering: 0-30% (frame N / total frames)
2. GIF encoding: 30-100% (gif.js progress event)

---

### Phase 5: Testing & Validation (1 hour)

#### Task 5.1: Manual Testing Checklist

**Setup:**
- [ ] Restart Rails server: `bin/dev`
- [ ] Clear browser cache
- [ ] Test with 3-5 frame GIF first (fast iteration)

**Test Cases:**

1. **Basic Remix Flow:**
   - [ ] Navigate to any public GIF
   - [ ] Click "Remix" button
   - [ ] Verify canvas loads with animated preview
   - [ ] Add text: "Test"
   - [ ] Click "Generate Remix"
   - [ ] Verify progress bar shows frame rendering → encoding
   - [ ] Verify redirect to new remix GIF
   - [ ] Verify animation plays with text overlay

2. **Text Customization:**
   - [ ] Change font family → preview updates
   - [ ] Adjust font size → preview updates
   - [ ] Change text color → preview updates
   - [ ] Add outline → preview updates
   - [ ] Drag text to different position → preview updates
   - [ ] Use position presets (top/center/bottom)

3. **Edge Cases:**
   - [ ] Empty text → shows error
   - [ ] Very long text (>100 chars) → input limited
   - [ ] Large GIF (>50 frames) → progress tracking works
   - [ ] GIF with transparency → preserved
   - [ ] Different aspect ratios

4. **Error Handling:**
   - [ ] Invalid GIF URL → error message
   - [ ] Network failure during upload → error shown
   - [ ] Permission denied → redirected
   - [ ] Unauthenticated user → redirected to sign in

#### Task 5.2: Browser Console Checks

**Open DevTools and verify:**
- [ ] No JavaScript errors
- [ ] GIF parsing logs: "Parsed N frames from GIF"
- [ ] Frame rendering logs: "Rendering frame X/Y"
- [ ] Encoding progress logs
- [ ] Upload success: "Remix created successfully"

#### Task 5.3: Performance Testing

**Test with different GIF sizes:**
- [ ] Small (3-10 frames, <500KB): Should encode in <5 seconds
- [ ] Medium (10-30 frames, <2MB): Should encode in <15 seconds
- [ ] Large (30-50 frames, <5MB): Should encode in <30 seconds

**If too slow:**
- Increase worker count: `workers: 4`
- Reduce quality: `quality: 20` (lower is faster)
- Add frame skip option for preview

---

### Phase 6: Polish & Optimization (1 hour)

#### Task 6.1: Add encoding quality controls (Optional)

**File:** `app/views/remixes/new.html.erb`

**Add quality slider in controls section:**
```erb
<div class="mb-4">
  <label class="block text-sm font-medium text-gray-700 mb-2">
    Encoding Quality
    <span class="text-gray-500 text-xs">(Lower = Faster)</span>
  </label>
  <input
    type="range"
    min="1"
    max="30"
    value="10"
    data-remix-editor-target="quality"
    data-action="input->remix-editor#updateQuality"
    class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
  >
  <span class="text-sm text-gray-600" data-remix-editor-target="qualityValue">10</span>
</div>
```

**Add to Stimulus controller:**
```javascript
static targets = [...existing, "quality", "qualityValue"]

updateQuality(event) {
  this.qualityValueTarget.textContent = event.target.value
}

// Use in generateRemix():
quality: parseInt(this.qualityTarget.value)
```

#### Task 6.2: Add cancel encoding button

**File:** `app/views/remixes/new.html.erb`

**Replace generate button area:**
```erb
<div class="flex gap-4">
  <button
    data-remix-editor-target="generateButton"
    data-action="click->remix-editor#generateRemix"
    class="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50"
  >
    Generate Remix
  </button>

  <button
    data-remix-editor-target="cancelButton"
    data-action="click->remix-editor#cancelEncoding"
    class="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors hidden"
  >
    Cancel
  </button>
</div>
```

**Add to Stimulus controller:**
```javascript
static targets = [...existing, "generateButton", "cancelButton"]

generateRemix(event) {
  // ... existing code ...

  // Show cancel button
  this.generateButtonTarget.classList.add('hidden')
  this.cancelButtonTarget.classList.remove('hidden')

  this.currentGif = gif  // Store reference

  // ... rest of encoding ...
}

cancelEncoding(event) {
  event.preventDefault()

  if (this.currentGif) {
    this.currentGif.abort()
    this.currentGif = null
  }

  this.hideProgress()
  this.enableControls()
  this.generateButtonTarget.classList.remove('hidden')
  this.cancelButtonTarget.classList.add('hidden')

  this.showError('Encoding cancelled')
}
```

---

## File Changes Summary

### Files to Modify (4 files)

1. **config/importmap.rb** (1 line added)
   - Add gifuct-js pin

2. **app/javascript/controllers/remix_editor_controller.js** (major refactor)
   - Add imports (gif.js, gifuct-js)
   - Replace `loadSourceGif()` with `parseAndLoadGif()`
   - Add `parseGifFrames(url)` method
   - Add `createImageFromFrame(frameData)` method
   - Add `renderFrameWithText(frameData)` method
   - Rewrite `generateRemix()` method (~80 lines)
   - Add progress tracking integration
   - (Optional) Add quality controls, cancel button

3. **app/views/remixes/new.html.erb** (optional enhancements)
   - Add quality slider
   - Add cancel button

4. **public/javascripts/gif.worker.js** (new file)
   - Download from CDN

### New Files (1 file)

- `public/javascripts/gif.worker.js` (from CDN)

---

## Risk Assessment

### Low Risk ✅
- gif.js is battle-tested, widely used
- gifuct-js is stable decoder library
- Backend is fully tested and working
- No database changes required

### Medium Risk ⚠️
- **Browser compatibility:** Older browsers may not support required APIs
  - Mitigation: Add browser detection, show warning
- **Large GIF performance:** 100+ frame GIFs may be slow
  - Mitigation: Add frame count warning, limit to 50 frames, or add quality slider
- **Memory usage:** Multiple canvases in memory
  - Mitigation: Process frames in batches, cleanup temp canvases

### Known Limitations
- Worker script must be served from same origin (CORS restriction)
  - Solution: Host locally in public/javascripts/
- GIF encoding is CPU-intensive
  - Solution: Use web workers (already configured)
- File size may be larger than source
  - Solution: Add quality controls, compression settings

---

## Success Metrics

### Functional Requirements
- [ ] Can remix animated GIFs (3+ frames)
- [ ] Text overlay appears on all frames
- [ ] Animation timing preserved
- [ ] Upload succeeds to backend
- [ ] Notification sent to original creator
- [ ] Remix appears in user's profile

### Performance Requirements
- [ ] <10 seconds for 10-frame GIF
- [ ] <30 seconds for 30-frame GIF
- [ ] Progress bar updates smoothly
- [ ] UI remains responsive during encoding

### Quality Requirements
- [ ] Text is crisp and readable
- [ ] Outline renders correctly
- [ ] Colors match preview
- [ ] No frame tearing or glitches
- [ ] Transparency preserved (if source has it)

---

## Rollback Plan

If critical issues arise:

1. **Revert JavaScript changes:**
   ```bash
   git checkout HEAD -- app/javascript/controllers/remix_editor_controller.js
   ```

2. **Remove importmap pins:**
   - Remove gifuct-js line
   - Keep gif.js for future use

3. **Keep backend code** (it's working and tested)

4. **Add "Coming Soon" message** to remix editor:
   ```erb
   <div class="text-center py-16">
     <h2 class="text-2xl font-bold">Animated GIF Remix Coming Soon!</h2>
     <p class="text-gray-600">We're working on adding support for animated GIFs.</p>
   </div>
   ```

---

## Estimated Timeline

| Phase | Tasks | Time |
|-------|-------|------|
| **1. Setup Libraries** | Add pins, download worker | 30 min |
| **2. Frame Extraction** | Parse GIF, load frames | 1 hour |
| **3. Frame Rendering** | Render text on frames | 1 hour |
| **4. GIF Encoding** | Integrate gif.js | 1.5 hours |
| **5. Testing** | Manual + browser testing | 1 hour |
| **6. Polish** | Quality controls, cancel | 1 hour |
| **Total** | | **6 hours** |

**With buffer for debugging:** 8 hours

---

## Next Steps

**Ready to implement?**

1. Start with Phase 1 (library setup) - quick win
2. Test frame extraction in console (Phase 2)
3. Build frame rendering (Phase 3)
4. Wire up full encoding pipeline (Phase 4)
5. Test thoroughly (Phase 5)
6. Polish UX (Phase 6)

**Alternative approach - Spike first:**
- Build minimal proof-of-concept in 1-2 hours
- Test with single test GIF
- Verify entire pipeline works
- Then refactor into production code

Would you like to proceed with implementation?
