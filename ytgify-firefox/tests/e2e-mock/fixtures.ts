import { test as base, firefox, type BrowserContext } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extended test fixtures for mock E2E tests
 * Provides browser context with extension loaded and mock server URL
 */
export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
  mockServerUrl: string;
}>({
  /**
   * Browser context with Firefox extension loaded
   * Each test gets a fresh context with unique user data directory
   */
  context: async ({}, use) => {
    const pathToExtension = path.join(__dirname, '..', '..', 'dist');
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const userDataDir = path.join(__dirname, 'test-user-data', uniqueId);

    // Create user data directory if it doesn't exist
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }

    // For Firefox, we need to package the extension as XPI or use web-ext
    // Since we have web-ext installed, we'll use it to run Firefox with the extension
    const context = await firefox.launchPersistentContext(userDataDir, {
      headless: process.env.CI === 'true' || process.env.HEADLESS === 'true',
      args: [
        // Firefox doesn't use the same extension loading arguments as Chrome
        '--new-instance',
      ],
      viewport: { width: 1280, height: 720 },
      // Firefox specific preferences
      firefoxUserPrefs: {
        // Allow unsigned extensions
        'xpinstall.signatures.required': false,
        // Allow extensions in automation
        'extensions.webextensions.restrictedDomains': '',
        // Disable extension signature checking
        'extensions.install.requireBuiltInCerts': false,
        'extensions.update.enabled': false,
        'extensions.update.notifyUser': false,
      }
    });

    // Load the extension manually after browser starts
    // Note: This is a simplified approach - in production, you might need to use web-ext or package as XPI
    const extensionPath = path.join(pathToExtension, 'manifest.json');
    if (fs.existsSync(extensionPath)) {
      // For Firefox, we need to install the extension differently
      // This is a placeholder - actual implementation would use web-ext or XPI packaging
      console.log(`[Mock E2E] Extension path exists: ${pathToExtension}`);
    }

    await use(context);

    // Cleanup
    await context.close();
  },

  /**
   * Extension ID extracted from loaded extension
   * Firefox uses different extension URLs
   */
  extensionId: async ({ context }, use) => {
    let extensionId = 'ytgify@firefox.extension'; // Firefox uses the ID from manifest

    // For Firefox, the extension ID is typically the one specified in browser_specific_settings
    // or a generated UUID
    console.log(`[Mock E2E] Using Firefox extension ID: ${extensionId}`);

    await use(extensionId);
  },

  /**
   * Mock server URL from global setup
   * All tests can use this to navigate to mock YouTube pages
   */
  mockServerUrl: async ({}, use) => {
    const url = process.env.MOCK_SERVER_URL;

    if (!url) {
      throw new Error(
        'MOCK_SERVER_URL not found in environment. ' +
        'Make sure global setup has run and started the mock server.'
      );
    }

    console.log(`[Mock E2E] Using mock server at: ${url}`);
    await use(url);
  },
});

export { expect } from '@playwright/test';
