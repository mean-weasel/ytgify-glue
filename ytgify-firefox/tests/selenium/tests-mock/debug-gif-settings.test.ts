/**
 * Debug test to check what settings are being passed to GIF creation
 * Selenium E2E Mock Test
 */

import { WebDriver } from 'selenium-webdriver';
import * as path from 'path';
import * as fs from 'fs';
import { createFirefoxDriver } from '../firefox-driver';
import {
  YouTubePage,
  QuickCapturePage,
  TextOverlayPage
} from '../page-objects';
import { getMockVideoUrl } from '../helpers';

describe('Debug: GIF Settings (Selenium Mock)', () => {
  let driver: WebDriver;
  let mockServerUrl: string;
  const testTimeout = 90000;

  beforeEach(async () => {
    // Read mock server URL from state file
    const stateFile = path.join(process.cwd(), 'test-results', 'selenium-mock-state.json');
    if (!fs.existsSync(stateFile)) {
      throw new Error('Mock server state file not found. Did global setup run?');
    }

    const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    mockServerUrl = state.serverUrl;

    // Create Firefox driver with extension loaded
    const headless = process.env.HEADLESS !== 'false';
    driver = await createFirefoxDriver(undefined, headless, false);
  }, 60000);

  afterEach(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  it(
    'Check settings passed to GIF processor',
    async () => {
      const youtube = new YouTubePage(driver);
      const quickCapture = new QuickCapturePage(driver);
      const textOverlay = new TextOverlayPage(driver);

      // Navigate and open wizard
      await youtube.navigateToVideo(getMockVideoUrl('veryShort', mockServerUrl));
      await youtube.openGifWizard();
      await quickCapture.waitForScreen();

      // Inject a console spy to capture gifProcessor calls
      await driver.executeScript(() => {
        // Spy on console.log
        const originalLog = console.log;
        (window as any).capturedLogs = [];
        console.log = function(...args: any[]) {
          const message = args.join(' ');
          if (message.includes('[gif-processor]') || message.includes('captureFrames') || message.includes('[ContentScriptGifProcessor]')) {
            (window as any).capturedLogs.push(message);
          }
          originalLog.apply(console, args);
        };
      });

      // Use defaults
      await quickCapture.clickNext();
      await textOverlay.waitForScreen();
      await textOverlay.clickSkip();

      // Wait for processing to start
      await driver.sleep(5000);

      // Get captured logs
      const capturedLogs = await driver.executeScript(() => {
        return (window as any).capturedLogs || [];
      });

      console.log('\n📊 Captured GIF Processor Logs:\n');
      (capturedLogs as string[]).forEach((log: string) => {
        console.log(log);
      });
    },
    testTimeout
  );
});
