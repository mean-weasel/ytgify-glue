/**
 * Debug test to examine GIF structure
 * Selenium E2E Mock Test
 */

import { WebDriver } from 'selenium-webdriver';
import * as path from 'path';
import * as fs from 'fs';
import { createFirefoxDriver } from '../firefox-driver';
import {
  YouTubePage,
  QuickCapturePage,
  TextOverlayPage,
  ProcessingPage,
  SuccessPage
} from '../page-objects';
import { getMockVideoUrl, urlToBuffer } from '../helpers';
import { examineGifBuffer } from '../../debug-gif-structure';

describe('Debug: GIF Parser (Selenium Mock)', () => {
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
    'Examine generated GIF structure',
    async () => {
      const youtube = new YouTubePage(driver);
      const quickCapture = new QuickCapturePage(driver);
      const textOverlay = new TextOverlayPage(driver);
      const processing = new ProcessingPage(driver);
      const success = new SuccessPage(driver);

      // Navigate and create GIF (use defaults to avoid selector issues)
      await youtube.navigateToVideo(getMockVideoUrl('veryShort', mockServerUrl));
      await youtube.openGifWizard();
      await quickCapture.waitForScreen();

      // Use default settings
      await quickCapture.clickNext();

      await textOverlay.waitForScreen();
      await textOverlay.clickSkip();

      await processing.waitForCompletion(60000);

      await success.waitForScreen();
      const gifUrl = await success.getGifUrl();

      console.log('GIF URL obtained:', gifUrl?.substring(0, 50) + '...');

      // Convert to buffer and examine
      const buffer = await urlToBuffer(driver, gifUrl!);
      console.log('\n📊 Examining GIF buffer structure...\n');
      await examineGifBuffer(buffer);
    },
    testTimeout
  );
});
