# Selenium WebDriver E2E Tests

Automated Firefox extension testing using Selenium WebDriver with mock YouTube server.

## Quick Start

```bash
# Run POC (validates extension loads)
npm run test:selenium:poc           # Headless
npm run test:selenium:poc:headed    # Headed (visual)

# Run Mock E2E tests
npm run test:selenium:mock          # Headless
npm run test:selenium:mock:headed   # Headed (visual)
```

## Why Selenium?

**Playwright Issue**: Cannot auto-load Firefox extensions ([#7297](https://github.com/microsoft/playwright/issues/7297))

**Selenium Solution**: `driver.installAddon()` API loads extensions automatically

### Benefits
- ✅ **Zero Manual Setup** - Extension loads automatically
- ✅ **CI/CD Ready** - Works in headless mode
- ✅ **True E2E** - Tests actual extension installation
- ✅ **Developer Friendly** - One command to run tests

## Project Structure

```
tests/selenium/
├── README.md                    # This file
├── firefox-driver.ts            # Driver factory (auto-loads extension)
├── test-utils.ts                # Test utilities (wait, click, etc.)
├── jest.config.mock.cjs         # Jest configuration for mock tests
│
├── page-objects/                # Page Object Models
│   ├── YouTubePage.ts
│   ├── QuickCapturePage.ts
│   ├── TextOverlayPage.ts
│   ├── ProcessingPage.ts
│   ├── SuccessPage.ts
│   └── index.ts
│
├── helpers/                     # Test helpers
│   ├── mock-server.ts           # Mock YouTube server
│   ├── mock-videos.ts           # Test video definitions
│   ├── gif-validator-mock.ts    # GIF validation utilities
│   └── index.ts
│
├── tests-mock/                  # Mock E2E tests (CI-safe)
│   ├── wizard-basic.test.ts     # Basic wizard tests
│   ├── wizard-settings-matrix.test.ts
│   ├── error-handling.test.ts
│   ├── gif-output-validation.test.ts
│   ├── freeze-frames.test.ts    # Freeze frame bug fix tests
│   ├── long-timestamps.test.ts  # Long video timestamp tests
│   └── ...
│
└── poc-test.ts                  # Standalone POC validation
```

## Test Commands

### POC Tests
```bash
# Validate Selenium + Extension Loading
npm run test:selenium:poc           # Headless (CI mode)
npm run test:selenium:poc:headed    # Headed (watch browser)
```

### Mock E2E Tests
```bash
# Run all tests
npm run test:selenium:mock          # Headless
npm run test:selenium:mock:headed   # Headed

# Run specific test
npm run test:selenium:mock:headed -- --testNamePattern="should load extension"
```

## Writing Tests

### Template

Use `tests/basic-wizard.test.ts` as template:

```typescript
import { WebDriver } from 'selenium-webdriver';
import { createFirefoxDriver } from '../firefox-driver';
import { YouTubePage } from '../page-objects';

describe('My Test Suite', () => {
  let driver: WebDriver;

  beforeEach(async () => {
    const headless = process.env.HEADLESS !== 'false';
    driver = await createFirefoxDriver(undefined, headless);
  }, 30000);

  afterEach(async () => {
    if (driver) await driver.quit();
  });

  it('should do something', async () => {
    const youtube = new YouTubePage(driver);
    await youtube.navigateToVideo('https://youtube.com/watch?v=...');

    // Your test logic here
  }, 120000);
});
```

### Page Objects

All page objects available via `page-objects/index.ts`:

```typescript
import {
  YouTubePage,
  QuickCapturePage,
  TextOverlayPage,
  ProcessingPage,
  SuccessPage
} from '../page-objects';
```

### Test Utilities

Common operations available via `test-utils.ts`:

```typescript
import {
  waitForElementVisible,
  clickElement,
  fillInput,
  executeScript,
  sleep,
  // ... and more
} from '../test-utils';
```

## API Reference

### Driver Factory

```typescript
import { createFirefoxDriver } from './firefox-driver';

// Default: uses dist/ folder, headless based on env
const driver = await createFirefoxDriver();

// Custom path and headed mode
const driver = await createFirefoxDriver('/path/to/extension', false);
```

### Test Utils

```typescript
// Wait for element
await waitForElementVisible(driver, '.selector', 10000);

// Click element
await clickElement(driver, '.button');

// Fill input
await fillInput(driver, 'input[type="text"]', 'value');

// Execute JavaScript
const result = await executeScript<T>(driver, () => {
  return document.title;
});

// Sleep
await sleep(driver, 1000);
```

### XPath for Text Content

Selenium doesn't support `:has-text()`, use XPath instead:

```typescript
// Find button with text "Next"
const xpath = '//button[contains(text(), "Next")]';
const element = await driver.findElement(By.xpath(xpath));
```

## Migration Guide

See `MIGRATION-STATUS.md` for:
- Current migration progress
- Remaining work
- Playwright → Selenium conversion patterns
- Next steps and options

## Test Results

### POC Validation: ✅ PASSED

Both headed and headless modes work perfectly:
- Extension loads automatically
- Extension button appears on YouTube
- Wizard opens successfully
- Extension ID verified

### E2E Test: ✅ PASSED

`basic-wizard.test.ts`:
- ✅ Extension loads and shows GIF button
- ⏸️ Opens wizard (not yet tested)
- ⏸️ Creates GIF (not yet tested)

## Troubleshooting

### Extension Not Loading

**Issue**: GIF button doesn't appear
**Fix**: Add explicit wait for extension injection:

```typescript
await youtube.waitForExtensionLoad(30000);
```

### TypeScript Import Errors

**Issue**: `import.meta` errors in Jest
**Fix**: Jest config uses `target: 'es2022'`, `module: 'es2022'`

### Tests Timeout

**Issue**: Tests timeout before completion
**Fix**: Increase timeout in test or global config:

```typescript
it('test', async () => {
  // ...
}, 180000); // 3 minutes
```

### Headless vs Headed

**Headless** (default for CI):
```bash
npm run test:selenium
# OR
HEADLESS=true npm run test:selenium
```

**Headed** (for debugging):
```bash
npm run test:selenium:headed
# OR
HEADLESS=false npm run test:selenium
```

## Dependencies

- `selenium-webdriver` - WebDriver API
- `geckodriver` - Firefox WebDriver
- `tsx` - TypeScript execution (POC only)
- `jest` + `ts-jest` - Test runner

All installed via `npm install`.

## Performance

- **POC test**: ~10 seconds
- **Extension loading**: ~2-3 seconds
- **YouTube page load**: ~3-5 seconds
- **Full wizard flow**: ~30-60 seconds (with GIF processing)

Comparable to Playwright performance.

## Next Steps

See `MIGRATION-STATUS.md` for detailed migration options:

1. **Option 1**: Complete full migration (all 14 test files)
2. **Option 2**: Hybrid approach (Selenium + Playwright)
3. **Option 3**: Minimal Selenium (smoke tests only)

**Current Status**: Phase 1 Complete (~40%), ready for Phase 2

## Links

- [POC Results](./POC-RESULTS.md) - Detailed POC validation
- [Migration Status](./MIGRATION-STATUS.md) - Progress tracker
- [Selenium Docs](https://www.selenium.dev/documentation/) - Official docs
- [Playwright Issue #7297](https://github.com/microsoft/playwright/issues/7297) - Why we migrated

---

## Historical: Real E2E Tests (Removed)

Real YouTube E2E tests were removed due to:
- YouTube IP blocking in CI environments
- Consistent local test failures
- Comprehensive mock coverage (90+ tests)

### Freeze Frame Bug Reference

**Bug**: GIF creation failed at frame 48/72 when processing videos with 15+
consecutive identical frames (static content like freeze frames).

**Root Cause**: Original logic treated all duplicate frames as buffering stuck,
aborting unnecessarily on valid static content.

**Fix Location**: `src/content/gif-processor.ts`

**Fix Logic**: Differentiates between seek failure (buffering stuck) and
successful seek with duplicate frame (valid static content).

**Original Test Video**: `https://www.youtube.com/watch?v=NBZv0_MImIY&t=529s`
- 8:49 timestamp with ~15 consecutive duplicate frames
- Duration: 4.8 seconds at 15 fps = 72 frames expected

This scenario is now covered by `tests-mock/freeze-frames.test.ts` using a
synthetic video with intentional freeze frames.

---

**Status**: Mock E2E Only
**Last Updated**: 2025-11
