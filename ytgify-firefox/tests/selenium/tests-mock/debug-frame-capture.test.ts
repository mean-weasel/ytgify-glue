/**
 * Debug test to examine frame capture behavior
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
import { getMockVideoUrl } from '../helpers';

interface DebugFrame {
  frameNumber: number;
  videoTime: number;
  targetTime: number;
  width: number;
  height: number;
  dataUrl: string;
  isDuplicate: boolean;
}

describe('Debug: Frame Capture (Selenium Mock)', () => {
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
    'Check captured frames from mock video',
    async () => {
      const youtube = new YouTubePage(driver);
      const quickCapture = new QuickCapturePage(driver);
      const textOverlay = new TextOverlayPage(driver);
      const processing = new ProcessingPage(driver);
      const success = new SuccessPage(driver);

      // Navigate and create GIF (use defaults)
      await youtube.navigateToVideo(getMockVideoUrl('veryShort', mockServerUrl));
      await youtube.openGifWizard();
      await quickCapture.waitForScreen();
      await quickCapture.clickNext();

      await textOverlay.waitForScreen();
      await textOverlay.clickSkip();

      await processing.waitForCompletion(60000);

      await success.waitForScreen();

      // Check debug frames
      const debugFrames = await driver.executeScript(() => {
        const win = window as Window & {
          __DEBUG_CAPTURED_FRAMES?: Array<{
            frameNumber: number;
            videoTime: number;
            targetTime: number;
            width: number;
            height: number;
            dataUrl: string;
            isDuplicate: boolean;
          }>;
        };
        return win.__DEBUG_CAPTURED_FRAMES || [];
      }) as DebugFrame[];

      console.log('\n📊 Frame Capture Debug Info:\n');
      console.log(`Total frames attempted: ${debugFrames.length}`);
      console.log(`Duplicates found: ${debugFrames.filter(f => f.isDuplicate).length}`);
      console.log(`Unique frames: ${debugFrames.filter(f => !f.isDuplicate).length}`);

      if (debugFrames.length > 0) {
        console.log('\nFrame details:');
        debugFrames.forEach((frame) => {
          const status = frame.isDuplicate ? '❌ DUPLICATE' : '✅ UNIQUE';
          const timeAccuracy = (frame.videoTime - frame.targetTime).toFixed(3);
          console.log(
            `  Frame ${frame.frameNumber}: ${status} | ` +
            `Target: ${frame.targetTime.toFixed(3)}s, ` +
            `Actual: ${frame.videoTime.toFixed(3)}s, ` +
            `Diff: ${timeAccuracy}s`
          );
        });

        // Check if video is stuck
        const uniqueTimes = new Set(debugFrames.map(f => f.videoTime.toFixed(3)));
        if (uniqueTimes.size < debugFrames.length / 2) {
          console.log('\n⚠️  WARNING: Video appears to be stuck at same time positions!');
          console.log(`Unique time positions: ${uniqueTimes.size} out of ${debugFrames.length} frames`);
        }
      } else {
        console.log('\n❌ No debug frames captured!');
      }
    },
    testTimeout
  );
});
