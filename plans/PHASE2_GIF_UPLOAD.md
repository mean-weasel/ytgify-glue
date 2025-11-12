# Phase 2: GIF Cloud Upload (Chrome Extension)

**Duration:** Weeks 3-4
**Status:** Not Started
**Dependencies:** Phase 1 Complete
**Priority:** High
**Focus:** Chrome extension (`ytgify`) + backend (`ytgify-share`)

**Navigation:** [← Phase 1](./PHASE1_AUTHENTICATION.md) | [Main Strategy](./BROWSER_EXTENSION_INTEGRATION_STRATEGY.md) | [Next: Phase 3 →](./PHASE3_SOCIAL_FEATURES.md)

---

## Goal

Enable optional cloud upload for GIFs created in extensions. Maintain current Downloads folder behavior while adding optional backend sync when user is authenticated. Focus on progressive enhancement: anonymous users get current functionality, authenticated users unlock cloud features.

---

## Key Features

1. **GIF Metadata Extraction** - Extract fps, resolution, duration during encoding
2. **Optional Cloud Upload** - Send GIF file + metadata to backend API (when authenticated)
3. **Downloads Folder First** - Maintain current behavior: always save to Downloads
4. **Progressive Enhancement** - Cloud features available when user wants them
5. **Upload Progress UI** - Show progress, success/failure messages
6. **Error Handling** - Upload failures don't affect Downloads folder saves

---

## Implementation Tasks

### Task 1: Enhance GIF Processor with Metadata Extraction

**File:** `ytgify/src/content/gif-processor.ts`

Add metadata extraction during encoding:

```typescript
interface GifMetadata {
  fps: number
  duration: number
  width: number
  height: number
  frameCount: number
  fileSize: number
}

async generateGifWithMetadata(params: GifCreationParams): Promise<{ gifBlob: Blob, metadata: GifMetadata }> {
  const encoder = this.getEncoder(params.encoderType)
  
  // Extract frames
  const frames = await this.extractFrames(params)
  
  // Encode GIF
  const gifBlob = await encoder.encode(frames, {
    width: params.width,
    height: params.height,
    fps: params.fps || 15
  })
  
  // Calculate metadata
  const metadata: GifMetadata = {
    fps: params.fps || 15,
    duration: (params.endTime - params.startTime),
    width: params.width,
    height: params.height,
    frameCount: frames.length,
    fileSize: gifBlob.size
  }
  
  return { gifBlob, metadata }
}
```

---

### Task 2: Implement Cloud Upload with Metadata

**File:** `ytgify/src/content/gif-processor.ts`

```typescript
private async uploadToBackend(
  gifBlob: Blob, 
  params: GifCreationParams, 
  metadata: GifMetadata
): Promise<UploadedGif> {
  const formData = new FormData()
  
  // GIF file
  formData.append('gif[file]', gifBlob, 'ytgify.gif')
  
  // Basic info
  formData.append('gif[title]', params.title || 'Untitled GIF')
  formData.append('gif[youtube_video_url]', params.youtubeUrl)
  formData.append('gif[youtube_timestamp_start]', params.startTime.toString())
  formData.append('gif[youtube_timestamp_end]', params.endTime.toString())
  formData.append('gif[privacy]', params.privacy || 'public_access')
  
  // Metadata fields (NEW)
  formData.append('gif[fps]', metadata.fps.toString())
  formData.append('gif[duration]', metadata.duration.toString())
  formData.append('gif[resolution_width]', metadata.width.toString())
  formData.append('gif[resolution_height]', metadata.height.toString())
  formData.append('gif[file_size]', metadata.fileSize.toString())
  
  // Optional text overlay
  if (params.textOverlay) {
    formData.append('gif[has_text_overlay]', 'true')
    formData.append('gif[text_overlay_data]', JSON.stringify(params.textOverlay))
  }

  const response = await apiClient.authenticatedRequestWithRetry('/gifs', {
    method: 'POST',
    body: formData
    // Don't set Content-Type - browser sets it with boundary for multipart
  })

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`)
  }

  return response.json()
}
```

---

### Task 3: Implement Download + Optional Cloud Upload

```typescript
async createGif(params: GifCreationParams) {
  // Step 1: Create GIF with metadata
  const { gifBlob, metadata } = await this.generateGifWithMetadata(params)

  // Step 2: ALWAYS save to Downloads folder (current behavior)
  await this.downloadGif(gifBlob, params.filename || 'ytgify.gif')

  console.log('✅ GIF saved to Downloads folder')

  // Step 3: OPTIONALLY upload to cloud if authenticated
  const isAuthenticated = await apiClient.isAuthenticated()

  if (isAuthenticated) {
    try {
      const uploadedGif = await this.uploadToBackend(gifBlob, params, metadata)

      console.log('✅ GIF also uploaded to cloud for social features')

      // Show success with cloud features unlocked
      showSuccess('Saved to Downloads and uploaded to ytgify! Now shareable.')
    } catch (error) {
      console.error('⚠️ Cloud upload failed:', error)

      // User still has file in Downloads folder
      showWarning('Saved to Downloads. Cloud upload failed - retry from web app.')
    }
  } else {
    // Not authenticated - Downloads only (current behavior)
    console.log('📋 GIF saved to Downloads (sign in to enable cloud features)')
    showInfo('Saved to Downloads. Sign in to share on ytgify!')
  }
}

/**
 * Save GIF to Downloads folder (existing functionality)
 */
async downloadGif(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)

  await chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: false  // Auto-download to Downloads folder
  })

  // Clean up blob URL
  setTimeout(() => URL.revokeObjectURL(url), 100)
}
```

---

### Task 4: Optional Settings Toggle

**File:** `ytgify/src/popup/components/Settings.tsx`

Add user preference for auto-upload:

```typescript
interface SettingsState {
  buttonVisibility: boolean
  autoCloudUpload: boolean  // NEW: Default true
}

// In Settings component
<div className="setting-item">
  <label>
    <input
      type="checkbox"
      checked={settings.autoCloudUpload}
      onChange={(e) => handleSettingChange('autoCloudUpload', e.target.checked)}
    />
    <span>Auto-upload GIFs to cloud (when signed in)</span>
  </label>
  <p className="setting-description">
    Automatically upload created GIFs to your ytgify.com account.
    GIFs always download to your computer regardless of this setting.
  </p>
</div>
```

**Check setting before upload:**
```typescript
// In createGif method
const settings = await chrome.storage.sync.get(['autoCloudUpload'])
const shouldUpload = isAuthenticated && settings.autoCloudUpload !== false // Default true

if (shouldUpload) {
  await this.uploadToBackend(gifBlob, params, metadata)
}
```

**Note:** Since GIFs are saved to Downloads folder and not managed by the extension, there is no automatic "sync" of old GIFs. Users can manually re-upload GIFs from their Downloads folder via the web app if desired.

---

### Task 5: Upload Progress UI

**File:** `ytgify/src/popup/components/UploadProgress.tsx`

```typescript
export const UploadProgress: React.FC<{ gifId: string }> = ({ gifId }) => {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'uploading' | 'success' | 'error'>('uploading')

  // Monitor upload progress via messages from background
  useEffect(() => {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'UPLOAD_PROGRESS' && message.gifId === gifId) {
        setProgress(message.progress)
      }
      if (message.type === 'UPLOAD_COMPLETE' && message.gifId === gifId) {
        setStatus('success')
      }
      if (message.type === 'UPLOAD_ERROR' && message.gifId === gifId) {
        setStatus('error')
      }
    })
  }, [gifId])

  return (
    <div className="upload-progress">
      {status === 'uploading' && (
        <>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p>Uploading... {progress}%</p>
        </>
      )}
      
      {status === 'success' && (
        <p className="success">✅ Uploaded successfully!</p>
      )}
      
      {status === 'error' && (
        <p className="error">❌ Upload failed. Saved locally.</p>
      )}
    </div>
  )
}
```

---

## Testing Strategy

### Unit Tests
- [ ] Metadata extraction accurate
- [ ] Upload FormData contains all fields
- [ ] Downloads folder save always executes first
- [ ] Error handling: upload failure doesn't block download
- [ ] Anonymous users can create GIFs (no auth required)

### Integration Tests
- [ ] Create GIF → Download → Verify file exists
- [ ] Create GIF (authenticated) → Download + Upload → Verify in database
- [ ] Create GIF (anonymous) → Download only → No database entry
- [ ] Upload failure → File still in Downloads
- [ ] Retry mechanism works for failed uploads

### E2E Tests (Chrome Focus)
- [ ] **Chrome:** Create GIF (anonymous), verify in Downloads folder
- [ ] **Chrome:** Create GIF (authenticated), verify in Downloads AND S3
- [ ] **Chrome:** Upload failure → File still in Downloads
- [ ] **Chrome:** Upload progress UI updates
- [ ] **Chrome:** Metadata extraction accuracy
- [ ] ⏸️ **Firefox:** Deferred to Phase 5

---

## Deliverables

- [ ] Metadata extraction implemented
- [ ] Optional cloud upload working (authenticated users)
- [ ] Downloads folder behavior unchanged (anonymous users)
- [ ] Upload progress UI complete
- [ ] Error handling robust (upload failure doesn't affect download)
- [ ] Unit tests passing (80%+ coverage)
- [ ] E2E tests passing (Chrome)
- [ ] S3 storage verified in production
- [ ] Anonymous user flow verified (no auth required)

---

## Next Steps

1. ✅ Downloads folder functionality unchanged
2. ✅ Optional cloud upload working for authenticated users
3. ✅ Anonymous users can create GIFs without accounts
4. → **[Proceed to Phase 3: Social Features](./PHASE3_SOCIAL_FEATURES.md)**

---

**Estimated Time:** 40-50 hours (Chrome only)
**Dependencies:** Phase 1 complete, S3 configured
**Status:** ⚠️ Ready after Phase 1
**Firefox:** Will be implemented in Phase 5
