# YTgify Firefox Extension

A Firefox extension that enables users to create GIFs directly from YouTube videos with an intuitive visual interface integrated into the YouTube player.

https://github.com/user-attachments/assets/6b9e72b6-032a-430d-9e4c-1d637f9aec20

## Features

- **Integrated GIF button** in YouTube's video player control bar
- **Visual segment selection** with draggable start/end markers on the timeline
- **Live preview** of the GIF loop
- **Text overlay tools** with customizable positioning and styling
- **Instant downloads** directly to your browser's downloads folder
- **Privacy-focused** - no data collection, everything processed locally

## Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Firefox Developer Edition (recommended) or Firefox browser

### Installation

1. Install Firefox Developer Edition (recommended):

```bash
# On macOS with Homebrew
brew install --cask firefox-developer-edition
```

2. Install dependencies:

```bash
npm install
```

3. Build the extension:

```bash
npm run build
```

For development with hot reload:

```bash
npm run dev
```

For development with automatic Firefox loading:

```bash
npm run dev:firefox
```

### Loading the Extension in Firefox

#### Method 1: Using web-ext (Recommended for Development)

```bash
npm run dev:firefox
```

This will:
- Open Firefox Developer Edition
- Load the extension from the `dist` folder
- Navigate to YouTube automatically
- Hot-reload on changes

#### Method 2: Manual Installation

1. Open Firefox
2. Navigate to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Navigate to the `dist/` directory
6. Select `manifest.json`

## Project Structure

```
├── src/
│   ├── background/     # Firefox event page
│   ├── content/        # Content script for YouTube integration
│   ├── popup/          # Extension popup UI
│   ├── components/     # Reusable React components
│   ├── lib/           # Core libraries and utilities
│   ├── types/         # TypeScript type definitions
│   └── utils/         # Utility functions
├── icons/             # Extension icons
├── tests/             # Test files (Selenium-based)
└── dist/              # Built extension (generated)
```

## Scripts

### Development
- `npm run dev` - Build in development mode with watch
- `npm run dev:firefox` - Build and open Firefox Developer Edition
- `npm run build` - Build for production
- `npm run lint:code` - Run ESLint
- `npm run lint` - Validate extension with web-ext
- `npm run typecheck` - Run TypeScript type checking

### Testing
- `npm test` - Run unit tests
- `npm run test:selenium:mock` - Run mock E2E tests with localhost videos
- `npm run test:selenium:mock:headed` - Run mock E2E tests with visible browser
- `npm run test:selenium:real` - Run real E2E tests against actual YouTube
- `npm run test:selenium:real:headed` - Run real E2E tests with visible browser
- `npm run validate` - Run full validation suite (typecheck, lint, unit tests)

### Packaging
- `npm run package` - Create .xpi file for distribution
- `npm run build:production` - Build and package for Firefox Add-ons submission (removes localhost permissions)
- `npm run sign` - Sign extension for Firefox Add-ons (requires API credentials)

## Firefox-Specific Features

### Advantages Over Chrome
- Native Promise support in all APIs
- Better privacy controls
- Superior developer tools for extensions
- More flexible content script injection
- Event pages instead of service workers (better for extension lifecycle)

### API Differences
- Uses `browser.*` API instead of `chrome.*`
- All APIs return Promises (no callbacks)
- Different background script architecture (event page vs service worker)

## Technology Stack

- **TypeScript** - Type-safe JavaScript
- **React** - UI framework
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Component library
- **Webpack** - Module bundler
- **Firefox WebExtensions Manifest V3** - Extension platform
- **Selenium WebDriver** - E2E testing (Firefox-compatible)

## Third-Party Dependencies

### Core Libraries

- **React 18.2.0** (MIT) - UI framework for extension interface
- **gif.js 0.2.0** (MIT) - GIF encoding fallback library
- **gifenc 1.0.3** (MIT) - Primary GIF encoder
- **gifski-wasm 2.2.0** (AGPL-3.0) - High-quality GIF encoder using WebAssembly
- **Tailwind CSS 3.4.0** (MIT) - Utility-first CSS framework

### WebAssembly Usage

This extension uses WebAssembly (gifski-wasm) for high-performance GIF encoding. The WASM module is loaded only during GIF creation and provides superior quality and compression compared to JavaScript-only encoders.

**Security Note:** All processing happens client-side in the browser. No data is transmitted to external servers.

## Troubleshooting

### Extension Not Loading
- Ensure Firefox Developer Edition is installed
- Check that `npm run build` completed successfully
- Verify manifest.json is valid with `npm run lint`

### GIF Creation Issues
- Check browser console for errors (Ctrl+Shift+J)
- Ensure YouTube video is fully loaded
- Try refreshing the YouTube page
- Check storage permissions in Firefox settings

### Development Issues
- Clear Firefox cache if changes aren't reflected
- Use `web-ext run --verbose` for detailed logs
- Check for TypeScript errors with `npm run typecheck`

## Building for Firefox Add-ons Submission

### Prerequisites

- Node.js 18+ (specified in `package.json` engines field)
- npm (version from `package-lock.json`)
- Approximately 800MB disk space (including node_modules)
- 8GB+ RAM recommended for running tests

### Production Build Instructions

The extension uses TypeScript transpilation, webpack bundling, and minification. Mozilla reviewers will rebuild from source to verify the package.

**Step-by-step build process:**

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run validation suite:**
   ```bash
   npm run validate
   ```
   This runs typecheck, linting, and unit tests.

3. **Run E2E tests locally:**
   ```bash
   npm run test:selenium:real
   ```
   **Note:** Real E2E tests require actual YouTube videos and cannot run in CI (YouTube blocks CI IPs). These tests must be run locally before submission.

4. **Build production package:**
   ```bash
   npm run build:production
   ```

   This script:
   - Runs webpack in production mode (transpiles TypeScript, bundles, minifies)
   - Removes localhost permissions from manifest.json (used only for mock E2E tests)
   - Packages extension into `web-ext-artifacts/ytgify_for_firefox-{version}.zip`
   - Restores original manifest.json in `dist/` for local development

5. **Verify output:**
   - Package file: `web-ext-artifacts/ytgify_for_firefox-1.0.8.zip`
   - Run `npm run lint` to ensure no validation errors

### Localhost Permissions Note

The source `manifest.json` includes localhost permissions (`*://localhost/*`, `*://127.0.0.1/*`) exclusively for mock E2E tests with local test videos. These permissions are automatically removed during `npm run build:production` and do not appear in the production package.

### Pre-Submission Checklist

Before submitting to Firefox Add-ons:

- ✅ `npm run validate` passes (typecheck + lint:code + unit tests)
- ✅ `npm run test:selenium:real` passes locally (real E2E tests with YouTube)
- ✅ `npm run build:production` completes successfully
- ✅ `npm run lint` shows no validation errors
- ✅ Review `web-ext-artifacts/*.zip` package contents
- ✅ Privacy policy reviewed (see `PRIVACY.md`)
- ✅ Third-party dependencies documented (see above)

### Submission to Firefox Add-ons

1. **Create Mozilla developer account** at https://addons.mozilla.org
2. **Prepare materials:**
   - Built package from `web-ext-artifacts/`
   - Source code (entire repository or archive)
   - Screenshots and promotional images
   - Privacy policy (see `PRIVACY.md`)
3. **Submit for review:**
   - Navigate to Developer Hub → Submit New Add-on
   - Upload package file
   - Provide source code and build instructions
   - Include reviewer notes explaining:
     - Build process (`npm install && npm run build:production`)
     - Localhost permissions (mock tests only, stripped in production)
     - WASM usage (gifski-wasm for GIF encoding)
     - Storage usage (browser.storage.local for preferences)
4. **Review timeline:** Initial review typically 1-14 days, updates 1-3 days

### Signing (Optional)

To sign the extension locally (requires Mozilla API credentials):

```bash
npm run sign
```

**Note:** Signing is optional. Firefox Add-ons will sign automatically upon approval.

## License

MIT
