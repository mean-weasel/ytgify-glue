import { test as base, firefox, type BrowserContext } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  // Override context fixture to launch Firefox
  // NOTE: Extension must be manually installed via about:debugging before running tests
  context: async ({ }, use) => {
    // Ensure unique user data dir for each worker to prevent profile lock conflicts
    const uniqueId = Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    const userDataDir = path.join(__dirname, '..', 'test-user-data-' + uniqueId);

    // Check if --headed flag was passed
    const isHeaded = process.argv.includes('--headed');
    const isCI = process.env.CI === 'true';

    // Firefox launch options
    const launchOptions: any = {
      headless: false, // Default to headed for manual extension testing
      args: [
        '--new-instance',
      ],
      viewport: { width: 1280, height: 720 },
    };

    // Enable proper headless mode when requested
    if (process.env.HEADLESS === 'true' || (process.env.CI === 'true' && !isHeaded)) {
      launchOptions.headless = true;
    } else if (isHeaded) {
      launchOptions.headless = false; // Explicitly set headed mode
    }

    const context = await firefox.launchPersistentContext(userDataDir, launchOptions);

    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    // Firefox extension ID is defined in manifest.json browser_specific_settings
    let extensionId = 'ytgify@firefox.extension';

    // Wait for service worker to be ready with exponential backoff
    let retries = 0;
    const maxRetries = 5;
    while (retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(1.5, retries)));
      const serviceWorkers = context.serviceWorkers();
      if (serviceWorkers.length > 0) {
        const url = serviceWorkers[0].url();
        // Firefox uses moz-extension:// protocol
        const match = url.match(/moz-extension:\/\/([^\/]+)/);
        if (match) {
          console.log(`[E2E] Found Firefox extension at: ${url}`);
          break;
        }
      }
      retries++;
    }

    // Final check after all retries
    if (retries === maxRetries) {
      console.log(`[E2E] Using Firefox extension ID from manifest: ${extensionId}`);
    }

    await use(extensionId);
  },
});

export { expect } from '@playwright/test';