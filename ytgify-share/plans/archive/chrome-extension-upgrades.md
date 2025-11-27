# ytgify Chrome Extension Upgrades Plan

## Overview
Required enhancements to the ytgify Chrome extension to support cloud storage, social sharing, and remix capabilities via the ytgify web platform.

---

## 1. Authentication System

### Web-Based Authentication Flow
**All signup and login happens on ytgify.com - NOT in the extension popup.**

Chrome extension popups have severe limitations (close on blur, can't handle OAuth properly, limited size), so we keep the extension minimal and redirect users to the web app for auth.

### Authentication Flow:

**First-time user experience:**
1. User installs extension
2. User creates a GIF on YouTube
3. Clicks "Save to ytgify" button
4. Extension detects user is not logged in
5. Shows message: "Sign in to save your GIF to ytgify"
6. Button: "Sign in at ytgify.com" → Opens ytgify.com/login in new tab
7. User signs up or logs in on ytgify.com (full page, proper UX)
8. After successful auth, web app stores auth token in cookie/localStorage
9. Extension detects authentication (via shared cookie domain or postMessage)
10. User returns to YouTube, clicks "Save to ytgify" → now works!

**Alternative: Extension Options Page** (if shared cookies don't work)
- Use dedicated extension options page (`chrome://extensions` → ytgify → Options)
- Full-page auth flow within extension ecosystem
- Can use `chrome.identity` API for OAuth if needed
- Stores token in extension storage after successful auth

### Auth Detection in Extension
- Check for auth token on extension startup
- Poll/listen for auth changes (user logs in on web app)
- Shared cookie domain approach: `chrome.cookies` API to read auth cookie
- Or use `chrome.runtime.sendMessage` from web app to extension after login
- Store minimal auth state in extension storage (token, user ID, username)

### Logged-In State in Popup
Once authenticated, popup shows:
- Small user avatar + username
- "Logged in as @username"
- Link: "View profile on ytgify.com"
- Logout button (clears token from extension storage)

### Logged-Out State in Popup
When not authenticated, popup shows:
- ytgify logo/branding
- Message: "Save your YouTube GIFs to ytgify"
- "Sign in at ytgify.com" button
- Brief description of features

### Token Management
- Store auth token securely in `chrome.storage.local` (encrypted)
- Include expiration time
- Refresh token logic (silent refresh via API call)
- Clear token on explicit logout
- Handle token expiration gracefully (prompt re-login)

### Auth State Management
- Track authentication status across extension components (background, content script, popup)
- Enable/disable "Save to ytgify" button based on auth state
- Show appropriate messaging when user tries to save while logged out
- Persist auth across browser restarts
- Handle multiple Chrome profiles separately

---

## 2. Save to ytgify Feature

### UI Changes
- Add "Save to ytgify" button alongside existing "Download" button in GIF creation UI
- Button states: default, loading (during upload), success, error
- Show upload progress indicator
- Display success message with shareable link after upload

### Save Options Modal/Dropdown
When user clicks "Save to ytgify", show quick options before upload:

**Privacy Setting:**
- Public (default) - "Anyone can see this GIF"
- Unlisted - "Only people with the link can see it"
- Private - "Only you can see this GIF"
- Visual icons for each option
- Default can be set in user preferences (stored in extension or fetched from web app)

**Tags (optional):**
- Tag input field with auto-suggest
- Fetch popular/trending tags from API
- User can add multiple tags (comma-separated or tag chips)
- Show recently used tags for quick selection
- Max tags: 5-10 (configurable)

**UI Approach Options:**
- **Option A:** Inline form that appears when clicking "Save to ytgify"
- **Option B:** Small modal/dialog with save options
- **Option C:** Expand button to show options, then save

**Quick Save:**
- "Save with defaults" button for users who don't want to configure each time
- Uses user's default privacy setting and no tags

### Metadata Capture
When user clicks "Save to ytgify", collect and send:

#### Video Source Data
- YouTube video URL (full URL)
- Video title (scraped from YouTube page)
- Channel name (scraped from YouTube page)
- Timestamp segment (start time, end time in seconds)
- Video duration

#### GIF Technical Settings
- FPS (frames per second) selected by user
- Resolution/dimensions (width x height)
- Duration (in seconds)
- File size (in bytes)
- Quality settings used

#### Text Overlay Data (if applicable)
- Text content (the actual text string)
- Font family
- Font size
- Font weight (bold, normal, etc.)
- Text color (hex or rgba)
- Text outline/shadow settings
  - Outline color
  - Outline width
  - Shadow blur/offset
- Position data
  - X, Y coordinates OR
  - Preset position (top, center, bottom, etc.)
- Animation/timing
  - When text appears (if not throughout)
  - Fade in/out effects

#### Creation Metadata
- Creation timestamp
- Extension version number
- User preferences/settings used

#### User-Selected Options (from Save modal)
- Privacy level (public/unlisted/private)
- Tags (array of tag strings)
- Optional: Title override (defaults to YouTube video title)
- Optional: Description

### Dual GIF Generation

**Approach: Save base GIF + overlay data separately**

1. Generate base GIF (no text overlay)
2. If text overlay exists:
   - Store overlay configuration as JSON
   - Generate final composite GIF with text
3. Send both to backend:
   - Base GIF file
   - Final GIF file (if text exists)
   - Overlay configuration JSON
   - All metadata listed above

**Benefits:**
- Enables remix functionality on web app (users can add their own text to base GIF)
- Allows text re-editing in the future
- Supports multiple text variations
- Saves storage (vs. multiple full GIFs)

### Upload API Integration
- Create API client for web app backend
- POST endpoint: `/api/gifs/upload`
- Handle multipart form data (GIF files + JSON metadata)
- Include user-selected privacy and tags in request
- Implement retry logic for failed uploads
- Handle network errors gracefully
- Support upload cancellation

### User Preferences/Defaults
- Fetch user's default privacy setting from API on extension load
- Store in extension storage for offline access
- Allow user to change default in extension popup settings (sync to web app)
- Cache recently used tags locally
- Fetch popular tags from API for auto-suggest

---

## 3. Minimal Popup Experience

**Philosophy:** Keep the popup extremely simple. Extension is for creating GIFs, web app is for everything else.

### Popup When Logged In
- Small user avatar + username
- "Logged in as @username"
- Status message: "Create a GIF on YouTube to save it to ytgify"
- Quick settings:
  - Default privacy: [Public ▼] (dropdown to change default)
  - "Change on ytgify.com for more options"
- Quick links:
  - "View my profile" → opens ytgify.com/@username
  - "Browse community" → opens ytgify.com
  - "Logout"

### Popup When Logged Out
- ytgify logo/branding
- Headline: "Turn YouTube moments into shareable GIFs"
- Brief pitch (1-2 sentences)
- CTA button: "Sign in at ytgify.com" → opens ytgify.com/login
- Small text: "New to ytgify? Sign up on our website"

### Popup Constraints
- Keep it lightweight (fast to open)
- No complex forms or workflows
- No scrolling grids or dashboards
- Primarily informational + quick actions
- Redirect to web app for anything complex

---

## 4. Technical Infrastructure

### API Client Module
- Centralized HTTP client
- Base URL configuration (dev/prod environments)
- Auth token injection in headers
- Error handling and retry logic
- Request/response logging (debug mode)

### Storage Schema Updates
- Store auth token (encrypted)
- Store minimal user data (user ID, username, avatar URL)
- Track auth expiration time
- Store user preferences:
  - Default privacy setting (public/unlisted/private)
  - Recently used tags (last 10-20)
  - Default upload behavior (show options vs. quick save)


### Performance Optimizations
- Compress GIFs before upload (if not already optimal)
- Upload in background (don't block UI)
- Cancel pending uploads on page navigation

---

## 5. Error Handling & Edge Cases

### Network Issues
- Offline detection
- Queue uploads for retry when connection restored
- Show "Upload failed, retry?" prompt

### Authentication Errors
- Token expiration → prompt user to sign in again at ytgify.com
- Invalid/missing token → show logged-out state
- Auth API errors → graceful fallback, suggest visiting web app

### Upload Errors
- File size too large → show error with max size allowed
- Invalid file format → prevent upload, show error
- Server storage error → show retry or contact support

### Validation
- Ensure YouTube URL is valid
- Verify GIF meets size/duration requirements
- Sanitize text overlay content (prevent XSS if rendered on web)

---

## 6. Privacy & Security

### Data Handling
- Only send data when user explicitly clicks "Save to ytgify"
- Make privacy setting (public/unlisted/private) clear before upload
- Don't track user's YouTube viewing without consent

### Secure Communication
- HTTPS only for API calls
- Secure token storage (encrypted if possible)
- Clear tokens on logout
- Don't log sensitive data

---
## 7. Future Enhancements (Post-MVP)

- Bulk upload (select multiple GIFs to upload)
- Scheduled posts (create now, publish later)
- Desktop notifications (when GIF gets liked/commented)
- Keyboard shortcuts for quick save
- Integration with other video platforms (Twitch, Vimeo)

---

## Implementation Phases

### Phase 1: Core Upload (MVP)
- Web-based authentication flow (redirect to ytgify.com)
- Auth detection in extension
- "Save to ytgify" button
- Metadata capture
- Basic upload to backend
- Success/error states
- Minimal popup (logged-in/logged-out states)

### Phase 2: Polish & Optimization
- Performance improvements
- Error handling refinement
- UX enhancements
- Analytics integration

---

## Dependencies & Coordination

### Backend API Requirements
- User authentication endpoints (on web app):
  - POST /api/auth/signup
  - POST /api/auth/login
  - POST /api/auth/logout
- Extension-specific endpoints:
  - GET /api/auth/me (get current user info from token)
  - POST /api/auth/refresh (refresh token)
  - POST /api/gifs/upload (multipart form data, includes privacy + tags)
- User preferences:
  - GET /api/users/me/preferences (get default privacy, etc.)
  - PATCH /api/users/me/preferences (update defaults from extension)
- Tags:
  - GET /api/tags/popular (get trending/popular tags for auto-suggest)
  - GET /api/tags/recent (get user's recently used tags)

### Web App Requirements
- Auth token sharing mechanism:
  - Option 1: Shared cookie domain (extension can read via chrome.cookies API)
  - Option 2: postMessage communication after login
  - Option 3: Extension options page with chrome.identity OAuth
- Login/signup pages optimized for extension onboarding flow

### Design Assets Needed
- Minimal popup design:
  - Logged-in state (avatar, username, quick settings, links)
  - Logged-out state (branding, CTA to web app)
  - Default privacy dropdown
- "Save to ytgify" button design (in YouTube player context)
- Save options modal/form:
  - Privacy selector (public/unlisted/private with icons)
  - Tag input with auto-suggest
  - "Save" and "Cancel" buttons
- Upload progress indicator
- "Sign in required" message/modal
- Tag chips/badges design

### Testing Considerations
- Mock API for local testing
- Test auth flow end-to-end (web app → extension)
- Test token persistence and refresh
- Performance testing (large file uploads)
- Cross-browser compatibility (Chrome, Edge, etc.)
