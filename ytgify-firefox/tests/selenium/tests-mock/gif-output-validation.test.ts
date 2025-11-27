/**
 * GIF Output Validation Tests for Mock E2E
 * Updated to use Page Objects and comprehensive GIF validation
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
import {
  getMockVideoUrl,
  validateMockGifComplete,
  extractGifMetadataFromUrl,
  MOCK_RESOLUTION_SPECS
} from '../helpers';

describe('Mock E2E: GIF Output Validation (Selenium)', () => {
  let driver: WebDriver;
  let mockServerUrl: string;

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

  // ========== Helper Function ==========

  /**
   * Common test workflow: create GIF and validate output
   */
  async function createAndValidateGif(
    options: {
      resolution?: '144p' | '240p' | '360p' | '480p';
      fps?: '5' | '10' | '15';
      expectedDuration?: number;
      skipText?: boolean;
    }
  ) {
    const youtube = new YouTubePage(driver);
    const quickCapture = new QuickCapturePage(driver);
    const textOverlay = new TextOverlayPage(driver);
    const processing = new ProcessingPage(driver);
    const success = new SuccessPage(driver);

    // Navigate
    await youtube.navigateToVideo(getMockVideoUrl('veryShort', mockServerUrl));

    // Open wizard
    await youtube.openGifWizard();
    await quickCapture.waitForScreen();

    // Apply settings
    if (options.resolution) {
      await quickCapture.selectResolution(options.resolution);
    }
    if (options.fps) {
      await quickCapture.selectFps(options.fps);
    }

    await quickCapture.clickNext();

    // Handle text overlay
    await textOverlay.waitForScreen();
    if (options.skipText !== false) {
      await textOverlay.clickSkip();
    }

    // Wait for processing
    await processing.waitForCompletion(45000);

    // Get GIF
    await success.waitForScreen();
    const gifUrl = await success.getGifUrl();

    expect(gifUrl).toBeTruthy();

    return {
      gifUrl: gifUrl!,
      success,
      quickCapture
    };
  }

  // ========== Resolution Validation Tests ==========

  it(
    'GIF at 144p has correct dimensions',
    async () => {
      const { gifUrl } = await createAndValidateGif({
        resolution: '144p'
      });

      // Save GIF to local file for examination
      const gifBuffer = await driver.executeScript(async (url: string) => {
        const response = await fetch(url);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        return Array.from(new Uint8Array(arrayBuffer));
      }, gifUrl);

      const outputPath = path.join(process.cwd(), 'test-output-144p.gif');
      fs.writeFileSync(outputPath, Buffer.from(gifBuffer as number[]));
      console.log(`\n📁 GIF saved to: ${outputPath}`);

      // Comprehensive validation
      const validation = await validateMockGifComplete(driver, gifUrl, {
        resolution: '144p',
        fps: 5,
        duration: 5
      });

      console.log('\n' + validation.summary);

      expect(validation.passed).toBe(true);
      expect(validation.results.resolution.valid).toBe(true);

      console.log(`✅ [Mock Test] 144p GIF validated: ${validation.metadata.width}x${validation.metadata.height}`);
    },
    90000
  );

  it(
    'GIF at 240p has correct dimensions',
    async () => {
      const { gifUrl } = await createAndValidateGif({
        resolution: '240p'
      });

      const validation = await validateMockGifComplete(driver, gifUrl, {
        resolution: '240p',
        fps: 5,
        duration: 5
      });

      console.log('\n' + validation.summary);

      expect(validation.passed).toBe(true);
      expect(validation.results.resolution.valid).toBe(true);

      console.log(`✅ [Mock Test] 240p GIF validated: ${validation.metadata.width}x${validation.metadata.height}`);
    },
    90000
  );

  it(
    'GIF at 360p has correct dimensions',
    async () => {
      const { gifUrl } = await createAndValidateGif({
        resolution: '360p'
      });

      const validation = await validateMockGifComplete(driver, gifUrl, {
        resolution: '360p',
        fps: 5,
        duration: 5
      });

      console.log('\n' + validation.summary);

      expect(validation.passed).toBe(true);
      expect(validation.results.resolution.valid).toBe(true);

      console.log(`✅ [Mock Test] 360p GIF validated: ${validation.metadata.width}x${validation.metadata.height}`);
    },
    90000
  );

  it(
    'GIF at 480p has correct dimensions',
    async () => {
      const { gifUrl } = await createAndValidateGif({
        resolution: '480p'
      });

      const validation = await validateMockGifComplete(driver, gifUrl, {
        resolution: '480p',
        fps: 5,
        duration: 5
      });

      console.log('\n' + validation.summary);

      expect(validation.passed).toBe(true);
      expect(validation.results.resolution.valid).toBe(true);

      console.log(`✅ [Mock Test] 480p upscaled from source resolution: ${validation.metadata.width}x${validation.metadata.height}`);
    },
    90000
  );

  // ========== Frame Rate Validation Tests ==========

  it(
    'GIF at 5 fps has correct frame rate',
    async () => {
      const { gifUrl } = await createAndValidateGif({
        fps: '5'
      });

      const metadata = await extractGifMetadataFromUrl(driver, gifUrl);

      expect(metadata.fps).toBeGreaterThanOrEqual(3);
      expect(metadata.fps).toBeLessThanOrEqual(7);

      console.log(`✅ [Mock Test] 5 fps GIF validated: ${metadata.fps} fps, ${metadata.frameCount} frames`);
    },
    90000
  );

  it(
    'GIF at 10 fps has correct frame rate',
    async () => {
      const { gifUrl } = await createAndValidateGif({
        fps: '10'
      });

      const metadata = await extractGifMetadataFromUrl(driver, gifUrl);

      expect(metadata.fps).toBeGreaterThanOrEqual(8);
      expect(metadata.fps).toBeLessThanOrEqual(12);

      console.log(`✅ [Mock Test] 10 fps GIF validated: ${metadata.fps} fps, ${metadata.frameCount} frames`);
    },
    90000
  );

  it(
    'GIF at 15 fps has correct frame rate',
    async () => {
      const { gifUrl } = await createAndValidateGif({
        fps: '15'
      });

      const metadata = await extractGifMetadataFromUrl(driver, gifUrl);

      expect(metadata.fps).toBeGreaterThanOrEqual(13);
      expect(metadata.fps).toBeLessThanOrEqual(17);

      console.log(`✅ [Mock Test] 15 fps GIF validated: ${metadata.fps} fps, ${metadata.frameCount} frames`);
    },
    90000
  );

  // ========== Duration Validation Tests ==========

  it(
    'GIF with 1s duration is correct length',
    async () => {
      const youtube = new YouTubePage(driver);
      const quickCapture = new QuickCapturePage(driver);
      const textOverlay = new TextOverlayPage(driver);
      const processing = new ProcessingPage(driver);
      const success = new SuccessPage(driver);

      await youtube.navigateToVideo(getMockVideoUrl('veryShort', mockServerUrl));
      await youtube.openGifWizard();

      await quickCapture.waitForScreen();
      await quickCapture.selectResolution('144p');
      await quickCapture.selectFps('5');

      await quickCapture.setTimeRange(0, 1);
      await driver.sleep(500);

      const selectedDuration = await quickCapture.getSelectionDuration();
      expect(selectedDuration).toBeCloseTo(1, 0);

      await quickCapture.clickNext();

      await textOverlay.waitForScreen();
      await textOverlay.clickSkip();

      await processing.waitForCompletion(45000);

      await success.waitForScreen();
      const gifUrl = await success.getGifUrl();

      expect(gifUrl).toBeTruthy();

      const metadata = await extractGifMetadataFromUrl(driver, gifUrl!);

      console.log(`[Mock Test] GIF duration: ${metadata.duration}s (expected: 1s)`);

      expect(metadata.duration).toBeCloseTo(1, 0);
      expect(metadata.frameCount).toBeGreaterThan(0);
      expect(metadata.frameCount).toBeCloseTo(5, 2);

      console.log(`✅ [Mock Test] 1s duration GIF validated (actual: ${metadata.duration.toFixed(1)}s, ${metadata.frameCount} frames)`);
    },
    90000
  );

  it(
    'GIF with 3s duration is correct length',
    async () => {
      const youtube = new YouTubePage(driver);
      const quickCapture = new QuickCapturePage(driver);
      const textOverlay = new TextOverlayPage(driver);
      const processing = new ProcessingPage(driver);
      const success = new SuccessPage(driver);

      await youtube.navigateToVideo(getMockVideoUrl('veryShort', mockServerUrl));
      await youtube.openGifWizard();

      await quickCapture.waitForScreen();
      await quickCapture.selectResolution('144p');
      await quickCapture.selectFps('5');

      await quickCapture.setTimeRange(0, 3);
      await driver.sleep(500);

      const selectedDuration = await quickCapture.getSelectionDuration();
      expect(selectedDuration).toBeCloseTo(3, 0);

      await quickCapture.clickNext();

      await textOverlay.waitForScreen();
      await textOverlay.clickSkip();

      await processing.waitForCompletion(45000);

      await success.waitForScreen();
      const gifUrl = await success.getGifUrl();

      expect(gifUrl).toBeTruthy();

      const metadata = await extractGifMetadataFromUrl(driver, gifUrl!);

      console.log(`[Mock Test] GIF duration: ${metadata.duration}s (expected: 3s)`);

      expect(metadata.duration).toBeCloseTo(3, 0);
      expect(metadata.frameCount).toBeGreaterThan(0);
      expect(metadata.frameCount).toBeCloseTo(15, 3);

      console.log(`✅ [Mock Test] 3s duration GIF validated (actual: ${metadata.duration.toFixed(1)}s, ${metadata.frameCount} frames)`);
    },
    90000
  );

  it(
    'GIF with 5s duration is correct length',
    async () => {
      const youtube = new YouTubePage(driver);
      const quickCapture = new QuickCapturePage(driver);
      const textOverlay = new TextOverlayPage(driver);
      const processing = new ProcessingPage(driver);
      const success = new SuccessPage(driver);

      await youtube.navigateToVideo(getMockVideoUrl('veryShort', mockServerUrl));
      await youtube.openGifWizard();

      await quickCapture.waitForScreen();
      await quickCapture.selectResolution('144p');
      await quickCapture.selectFps('5');

      await quickCapture.setTimeRange(0, 5);
      await driver.sleep(500);

      const selectedDuration = await quickCapture.getSelectionDuration();
      expect(selectedDuration).toBeCloseTo(5, 0);

      await quickCapture.clickNext();

      await textOverlay.waitForScreen();
      await textOverlay.clickSkip();

      await processing.waitForCompletion(45000);

      await success.waitForScreen();
      const gifUrl = await success.getGifUrl();

      expect(gifUrl).toBeTruthy();

      const metadata = await extractGifMetadataFromUrl(driver, gifUrl!);

      console.log(`[Mock Test] GIF duration: ${metadata.duration}s (expected: 5s)`);

      expect(metadata.duration).toBeCloseTo(5, 0);
      expect(metadata.frameCount).toBeGreaterThan(0);
      expect(metadata.frameCount).toBeCloseTo(25, 3);

      console.log(`✅ [Mock Test] 5s duration GIF validated (actual: ${metadata.duration.toFixed(1)}s, ${metadata.frameCount} frames)`);
    },
    90000
  );

  // ========== Text Overlay Test ==========

  it(
    'Text overlay screen appears and GIF creation works',
    async () => {
      const youtube = new YouTubePage(driver);
      const quickCapture = new QuickCapturePage(driver);
      const textOverlay = new TextOverlayPage(driver);
      const processing = new ProcessingPage(driver);
      const success = new SuccessPage(driver);

      await youtube.navigateToVideo(getMockVideoUrl('veryShort', mockServerUrl));
      await youtube.openGifWizard();

      await quickCapture.waitForScreen();
      await quickCapture.selectResolution('240p');
      await quickCapture.selectFps('5');
      await quickCapture.clickNext();

      await textOverlay.waitForScreen();
      await textOverlay.clickSkip();

      await processing.waitForCompletion(45000);

      await success.waitForScreen();
      const gifUrl = await success.getGifUrl();

      expect(gifUrl).toBeTruthy();

      const validation = await validateMockGifComplete(driver, gifUrl!, {
        resolution: '240p',
        fps: 5,
        duration: 5
      });

      console.log('\n' + validation.summary);

      expect(validation.passed).toBe(true);
      expect(validation.results.resolution.valid).toBe(true);
      expect(validation.results.frameRate.valid).toBe(true);

      console.log(`✅ [Mock Test] Text overlay workflow validated (Note: Visual text validation done in real E2E tests)`);
    },
    90000
  );

  // ========== Combined Validation Test ==========

  it(
    'Combined settings produce correct output',
    async () => {
      const { gifUrl } = await createAndValidateGif({
        resolution: '240p',
        fps: '10'
      });

      const validation = await validateMockGifComplete(driver, gifUrl, {
        resolution: '240p',
        fps: 10,
        duration: 5
      });

      console.log('\n' + validation.summary);

      expect(validation.passed).toBe(true);
      expect(validation.results.resolution.valid).toBe(true);
      expect(validation.results.frameRate.valid).toBe(true);

      console.log(`✅ [Mock Test] Combined validation passed (240p @ 10fps)`);
    },
    90000
  );

  // ========== File Size Correlation Test ==========

  it(
    'File size correlates with settings',
    async () => {
      const configs = [
        { resolution: '144p' as const, fps: '5' as const, label: 'smallest' },
        { resolution: '360p' as const, fps: '10' as const, label: 'largest' }
      ];

      const gifSizes: { label: string; fileSize: number; metadata: any }[] = [];

      for (const config of configs) {
        const { gifUrl } = await createAndValidateGif({
          resolution: config.resolution,
          fps: config.fps
        });

        const metadata = await extractGifMetadataFromUrl(driver, gifUrl);

        gifSizes.push({
          label: config.label,
          fileSize: metadata.fileSize,
          metadata
        });

        console.log(`${config.label}: ${(metadata.fileSize / 1024).toFixed(1)} KB (${metadata.width}x${metadata.height}, ${metadata.fps}fps)`);
      }

      const smallestGif = gifSizes.find(g => g.label === 'smallest')!;
      const largestGif = gifSizes.find(g => g.label === 'largest')!;

      expect(largestGif.fileSize).toBeGreaterThan(smallestGif.fileSize);

      const sizeRatio = largestGif.fileSize / smallestGif.fileSize;
      console.log(`✅ [Mock Test] File size correlation validated (ratio: ${sizeRatio.toFixed(2)}x)`);
    },
    120000
  );

  // ========== GIF Data URL Validation Test ==========

  it(
    'GIF data URL is valid',
    async () => {
      const { gifUrl } = await createAndValidateGif({
        resolution: '144p',
        fps: '5'
      });

      const isValidDataUrl = gifUrl.startsWith('data:image/gif');
      const isValidBlobUrl = gifUrl.startsWith('blob:');
      expect(isValidDataUrl || isValidBlobUrl).toBe(true);

      const metadata = await extractGifMetadataFromUrl(driver, gifUrl);

      expect(metadata.width).toBeGreaterThan(0);
      expect(metadata.height).toBeGreaterThan(0);
      expect(metadata.frameCount).toBeGreaterThan(0);
      expect(metadata.fileSize).toBeGreaterThan(0);

      console.log(`✅ [Mock Test] GIF data URL validated (${(metadata.fileSize / 1024).toFixed(1)} KB)`);
    },
    90000
  );
});
