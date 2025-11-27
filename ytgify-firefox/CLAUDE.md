# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication Style

Absolute Mode
- Eliminate emojis, filler, hype, transitions, appendixes.
- Use blunt, directive phrasing; no mirroring, no softening.
- Suppress sentiment-boosting, engagement, or satisfaction metrics.
- No questions, offers, suggestions, or motivational content.
- Deliver info only; end immediately after.

## Project Overview

YTgify is a Firefox Manifest V3 extension that enables users to create GIFs directly from YouTube videos with an integrated visual wizard. The extension injects UI overlays into YouTube pages, processes video frames in the content script, and manages GIF encoding through a background event page.

## Essential Development Commands

### Build & Development
```bash
npm run build
npm run dev
npm run dev:firefox        # Build + open Firefox Developer Edition
npm run typecheck
npm run lint:code
npm run lint:fix
npm run lint              # Validate with web-ext
```

### Testing
```bash
npm run validate          # Full local validation (typecheck, lint, unit tests)
npm test                  # Unit tests
npm run test:selenium:mock      # Mock E2E headless (CI-safe)
npm run test:selenium:mock:headed
```

Mock E2E tests use localhost server with generated test videos. Use `:headed` suffix for visible browser debugging.

### Loading Extension
1. `npm run build`
2. Firefox: `about:debugging` → This Firefox → Load Temporary Add-on → `dist/manifest.json`

Or use `npm run dev:firefox` for automatic loading with hot-reload.

### Packaging
```bash
npm run package  # Creates .xpi file
npm run sign     # Sign for Firefox Add-ons (requires API credentials)
```

## Architecture Overview

### Core Structure
- **Background** (`src/background/`): Firefox event page, message routing, async job management, extension migrations
- **Content Script** (`src/content/`): YouTube integration, frame capture, React overlays, GIF processing
- **Popup** (`src/popup/`): Settings UI, button visibility controls
- **Shared** (`src/shared/`): Message bus, state management, error handling

### Key Components
- **Frame Extraction** (`src/content/frame-extractor.ts`): Canvas-based frame capture from video element
- **GIF Processor** (`src/content/gif-processor.ts`): Complete pipeline (extraction → overlay → encoding → download)
- **Encoders** (`src/lib/encoders/`): Factory for gifenc (primary) and gif.js (fallback)
- **YouTube Integration** (`src/content/youtube-detector.ts`, `youtube-api-integration.ts`): Page detection, video element access, SPA navigation
- **Overlay Wizard** (`src/content/overlay-wizard/`): React UI (QuickCapture → TextOverlay → Processing → Success)
- **Resolution Scaler** (`src/processing/resolution-scaler.ts`): Memory-aware scaling (144p-480p presets)
- **Migrations** (`src/background/migrations.ts`): Extension update migrations, handles cleanup of deprecated features

### Message Passing
Typed request/response pattern using `browser.*` API. Most processing happens in content script. Message types in `src/types/messages.ts` and `src/shared/messages.ts`. Use type guards for safe handling.

### Storage
- **browser.storage.local**: Primary storage for user preferences, settings, engagement tracking
- **IndexedDB**: Not used (removed in recent version - GIFs now download directly to browser downloads folder)
- Migration system removes deprecated IndexedDB data on extension update

## Key Development Patterns

### GIF Creation Flow
User opens wizard → collects parameters (time range, text, resolution, frame rate) → `gifProcessor.processVideoToGif()` orchestrates extraction/overlay/encoding → success screen with preview/download → GIF downloads to browser downloads folder.

### YouTube Shorts
Disabled due to technical limitations. Show user-friendly message when detected.

### Error Handling
Centralized in `src/lib/errors.ts`. All async operations wrapped in try-catch with actionable user messages.

## Important Implementation Details

- **Localhost Permissions**: Used only for mock E2E tests. Safe for Firefox (no store restrictions).
- **CSS Loading**: Dynamically injected on wizard open, removed on close.
- **Memory Management**: Reject processing if `(width * height * 4 * 2) / (1024 * 1024) > 1000 MB`. Ensure even dimensions.
- **WebCodecs**: Not used (Firefox compatibility issues). Canvas-based extraction more reliable.
- **Button Visibility**: Default hidden. Toggle in popup saves to `browser.storage.local`.

## Firefox-Specific Details

### Background Architecture
- Uses **event page** instead of Chrome service worker
- `background.scripts` in manifest instead of `background.service_worker`
- Persistent context (no service worker lifecycle management)

### API Usage
- All code uses `browser.*` API (not `chrome.*`)
- Promise-based (no callbacks)
- `browser.tabs.query()` returns Promise
- `browser.downloads.download()` returns Promise
- `browser.storage.local` operations return Promises

### Manifest Differences
- `browser_specific_settings.gecko` required
- Firefox extension ID: `ytgify@firefox.extension`
- Minimum version: 109.0
- Event page uses `background.scripts` + `type: "module"`

### Testing Infrastructure
- **Selenium WebDriver** for E2E tests (Firefox-compatible)
- **geckodriver** for Firefox automation
- Mock E2E: `tests/selenium/tests-mock/` (localhost test videos)
- Jest for unit tests

## File Organization

- `src/types/*.ts`: Shared interfaces
- `src/utils/*.ts`: Pure functions
- `src/processing/*.ts`: Image/video processing
- `src/monitoring/*.ts`: Performance tracking
- `src/shared/*.ts`: Cross-context utilities
- `tests/selenium/`: Selenium E2E tests
- `tests/unit/`: Jest unit tests

## Testing

### Mock E2E Videos
Generate with `npm run generate:test-videos`. Use `getMockVideoUrl('veryShort', mockServerUrl)` helper.

### E2E Guidelines
Mock E2E: Use `getMockVideoUrl()` helper with localhost server. Available videos: `veryShort` (20s), `medium` (10s), `long` (20s), `hd` (15s), `freezeFrame` (6s with 2s freeze), `longTimestamp` (60s).

## Common Development Tasks

- **New Resolution Preset**: Update `src/processing/resolution-scaler.ts`, `src/content/index.ts` (resolutionDefaults), and `QuickCaptureScreen.tsx`
- **New Message Type**: Define in `src/types/messages.ts`, add type guard, add handlers, update union types
- **New Encoder**: Implement `AbstractEncoder` in `src/lib/encoders/`, add to factory, update `EncoderType` union
- **Debug GIF Creation**: Check content script logs, enable debug in `src/lib/logger.ts`, verify `youTubeDetector.canCreateGif()`

## Firefox Add-ons Compliance

Run `npm run package` to create signed .xpi file. Test build before publishing. Verify `manifest.json` has correct `browser_specific_settings`.

## Known Limitations

Shorts not supported. Max ~30s GIF duration. Firefox/Firefox Developer Edition only. Desktop only. Live streams not recommended.
