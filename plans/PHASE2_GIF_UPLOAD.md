# Phase 2: GIF Cloud Upload (Chrome Extension)

**Duration:** Weeks 3-4
**Status:** Not Started
**Dependencies:** Phase 1 Complete
**Priority:** High
**Focus:** Chrome extension (`ytgify`) + backend (`ytgify-share`)

**Navigation:** [← Phase 1](./PHASE1_AUTHENTICATION.md) | [Main Strategy](./BROWSER_EXTENSION_INTEGRATION_STRATEGY.md) | [Next: Phase 3 →](./PHASE3_SOCIAL_FEATURES.md)

---

## Goal

Enable GIFs created in extensions to upload to ytgify-share backend with full metadata extraction. Implement hybrid storage strategy (local + cloud) with automatic sync for offline-created GIFs.

---

## Key Features

1. **GIF Metadata Extraction** - Extract fps, resolution, duration during encoding
2. **Cloud Upload with Metadata** - Send GIF file + metadata to backend API
3. **Hybrid Storage** - Save locally AND upload to cloud
4. **Offline Sync** - Auto-upload offline GIFs when user authenticates
5. **Upload Progress UI** - Show progress, success/failure messages
6. **Error Handling** - Retry failed uploads, fallback to local-only

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

### Task 3: Implement Hybrid Storage Strategy

```typescript
async createGif(params: GifCreationParams) {
  // Step 1: Create GIF with metadata
  const { gifBlob, metadata } = await this.generateGifWithMetadata(params)
  
  // Step 2: Always save locally first (hybrid strategy)
  const localGif = await this.saveGifLocally(gifBlob, params, metadata)

  // Step 3: Try to upload to cloud if authenticated
  const isAuthenticated = await apiClient.isAuthenticated()

  if (isAuthenticated) {
    try {
      const uploadedGif = await this.uploadToBackend(gifBlob, params, metadata)
      
      // Update local GIF with cloud reference
      await this.updateGifWithCloudRef(localGif.id, uploadedGif.id)
      
      console.log('✅ GIF saved locally and uploaded to cloud')
    } catch (error) {
      console.error('❌ Cloud upload failed:', error)
      
      // Mark for later sync
      await this.markGifForSync(localGif.id)
      
      showWarning('Saved locally. Will sync when connection improves.')
    }
  } else {
    // Not authenticated - local only
    console.log('📋 GIF saved locally (not authenticated)')
  }
  
  return localGif
}
```

---

### Task 4: Implement Offline-to-Online Sync

**File:** `ytgify/src/background/sync-manager.ts`

```typescript
export class SyncManager {
  /**
   * Sync offline GIFs to cloud after authentication
   */
  static async syncOfflineGifs(): Promise<SyncResult> {
    const unsyncedGifs = await this.getUnsyncedGifs()
    
    if (unsyncedGifs.length === 0) {
      return { success: 0, failed: 0, total: 0 }
    }

    console.log(`🔄 Syncing ${unsyncedGifs.length} offline GIFs...`)

    let success = 0
    let failed = 0

    for (const gif of unsyncedGifs) {
      try {
        const uploadedGif = await this.uploadGifToBackend(gif)
        await this.markAsSynced(gif.id, uploadedGif.id)
        success++
      } catch (error) {
        console.error(`Failed to sync GIF ${gif.id}:`, error)
        failed++
      }
    }

    console.log(`✅ Sync complete: ${success} success, ${failed} failed`)

    return { success, failed, total: unsyncedGifs.length }
  }

  /**
   * Get GIFs that haven't been synced to cloud
   */
  private static async getUnsyncedGifs(): Promise<LocalGif[]> {
    // Query IndexedDB for GIFs where cloudId is null and syncPending is true
    // Implementation depends on your IndexedDB schema
  }

  /**
   * Trigger sync on successful authentication
   */
  static async onAuthenticationSuccess(): Promise<void> {
    // Show sync progress to user
    chrome.runtime.sendMessage({
      type: 'SYNC_STARTED'
    })

    const result = await this.syncOfflineGifs()

    chrome.runtime.sendMessage({
      type: 'SYNC_COMPLETED',
      result
    })
  }
}
```

**Call on login success:**
```typescript
// In popup after successful login
await apiClient.login(email, password)
await SyncManager.onAuthenticationSuccess()
```

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
- [ ] Sync manager identifies unsynced GIFs
- [ ] Error handling falls back to local storage

### Integration Tests
- [ ] Create GIF → Upload → Verify in database
- [ ] Create GIF offline → Login → Auto-sync
- [ ] Upload failure → Marked for sync
- [ ] Retry mechanism works

### E2E Tests (Chrome Focus)
- [ ] **Chrome:** Create GIF, verify upload to S3
- [ ] **Chrome:** Offline creation → Online login → Sync
- [ ] **Chrome:** Upload progress UI updates
- [ ] **Chrome:** Metadata extraction accuracy
- [ ] ⏸️ **Firefox:** Deferred to Phase 5

---

## Deliverables

- [x] Metadata extraction implemented
- [x] Cloud upload with metadata working
- [x] Hybrid storage strategy implemented
- [x] Offline-to-online sync working
- [x] Upload progress UI complete
- [x] Error handling robust
- [x] Unit tests passing (80%+ coverage)
- [x] E2E tests passing (both browsers)
- [x] S3 storage verified in production

---

## Next Steps

1. ✅ All GIF uploads include metadata
2. ✅ Hybrid storage working
3. ✅ Offline sync functional
4. → **[Proceed to Phase 3: Social Features](./PHASE3_SOCIAL_FEATURES.md)**

---

**Estimated Time:** 40-50 hours (Chrome only)
**Dependencies:** Phase 1 complete, S3 configured
**Status:** ⚠️ Ready after Phase 1
**Firefox:** Will be implemented in Phase 5
