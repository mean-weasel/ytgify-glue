import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Playwright config for video recording tests
 * Always records video for documentation purposes
 */
export default defineConfig({
  testDir: './e2e-video',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: '../test-results/html-video', open: 'never' }]],

  use: {
    baseURL: 'https://www.youtube.com',
    trace: 'on',
    screenshot: 'on',
    video: 'on', // Always record video
    actionTimeout: 30000,
    navigationTimeout: 45000,
    headless: false, // Show browser for video recording
  },

  projects: [
    {
      name: 'firefox-extension-video',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          slowMo: 500, // Slow down for better video visibility
          firefoxUserPrefs: {
            'xpinstall.signatures.required': false,
            'extensions.webextensions.uuids': `{"ytgify@firefox.extension":"mock-uuid"}`,
          },
          args: ['--no-remote', '--foreground'],
        },
        contextOptions: {
          ignoreHTTPSErrors: true,
        },
      },
    },
  ],

  timeout: 180000, // 3 minutes for video recording
  expect: {
    timeout: 30000,
  },

  outputDir: 'test-results/video-artifacts',
  globalSetup: path.resolve(__dirname, './e2e/global-setup.ts'),
  globalTeardown: path.resolve(__dirname, './e2e/global-teardown.ts'),
});
