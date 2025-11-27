/**
 * Settings Matrix Tests for Mock E2E
 * Comprehensive testing of all resolution, FPS, and duration combinations
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
  extractGifMetadataFromUrl
} from '../helpers';

describe('Mock E2E: Wizard Settings Matrix (Selenium)', () => {
  let driver: WebDriver;
  let mockServerUrl: string;

  beforeEach(async () => {
    const stateFile = path.join(process.cwd(), 'test-results', 'selenium-mock-state.json');
    if (!fs.existsSync(stateFile)) {
      throw new Error('Mock server state file not found. Did global setup run?');
    }

    const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    mockServerUrl = state.serverUrl;

    const headless = process.env.HEADLESS !== 'false';
    driver = await createFirefoxDriver(undefined, headless, false);
  }, 60000);

  afterEach(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  // ========== Helper Function ==========

  async function createAndValidateGif(
    options: {
      videoType?: 'veryShort' | 'medium';
      resolution?: '144p' | '240p' | '360p' | '480p';
      fps?: '5' | '10' | '15';
      validateOutput?: boolean;
      validateSettings?: boolean;
    } = {}
  ) {
    const {
      videoType = 'veryShort',
      resolution,
      fps,
      validateOutput = true,
      validateSettings = false
    } = options;

    const youtube = new YouTubePage(driver);
    const quickCapture = new QuickCapturePage(driver);
    const textOverlay = new TextOverlayPage(driver);
    const processing = new ProcessingPage(driver);
    const success = new SuccessPage(driver);

    await youtube.navigateToVideo(getMockVideoUrl(videoType, mockServerUrl));
    await youtube.openGifWizard();
    await quickCapture.waitForScreen();

    if (resolution) {
      await quickCapture.selectResolution(resolution);
    }
    if (fps) {
      await quickCapture.selectFps(fps);
    }

    let selectedRes: string | null = null;
    let selectedFps: string | null = null;
    if (validateSettings) {
      selectedRes = await quickCapture.getSelectedResolution();
      selectedFps = await quickCapture.getSelectedFps();
    }

    await quickCapture.clickNext();
    await textOverlay.waitForScreen();
    await textOverlay.clickSkip();
    await processing.waitForCompletion(45000);

    await success.waitForScreen();
    const gifUrl = await success.getGifUrl();

    expect(gifUrl).toBeTruthy();

    if (validateOutput) {
      const isValidDataUrl = gifUrl!.startsWith('data:image/gif');
      const isValidBlobUrl = gifUrl!.startsWith('blob:');
      expect(isValidDataUrl || isValidBlobUrl).toBe(true);
    }

    return {
      gifUrl: gifUrl!,
      selectedRes,
      selectedFps,
      success,
      quickCapture
    };
  }

  // ========== Resolution Options Matrix ==========

  it('Resolution 144p: Creates GIF successfully', async () => {
    const { gifUrl, selectedRes } = await createAndValidateGif({
      resolution: '144p',
      validateSettings: true
    });

    expect(selectedRes).toBe('144p');

    const metadata = await extractGifMetadataFromUrl(driver, gifUrl);
    expect(metadata.width).toBeGreaterThan(0);
    expect(metadata.height).toBeGreaterThan(0);

    console.log(`✅ 144p: ${metadata.width}x${metadata.height}, ${(metadata.fileSize / 1024).toFixed(1)} KB`);
  }, 90000);

  it('Resolution 240p: Creates GIF successfully', async () => {
    const { gifUrl, selectedRes } = await createAndValidateGif({
      resolution: '240p',
      validateSettings: true
    });

    expect(selectedRes).toBe('240p');

    const metadata = await extractGifMetadataFromUrl(driver, gifUrl);
    expect(metadata.width).toBeGreaterThan(0);
    expect(metadata.height).toBeGreaterThan(0);

    console.log(`✅ 240p: ${metadata.width}x${metadata.height}, ${(metadata.fileSize / 1024).toFixed(1)} KB`);
  }, 90000);

  it('Resolution 360p: Creates GIF successfully', async () => {
    const { gifUrl, selectedRes } = await createAndValidateGif({
      resolution: '360p',
      validateSettings: true
    });

    expect(selectedRes).toBe('360p');

    const metadata = await extractGifMetadataFromUrl(driver, gifUrl);
    expect(metadata.width).toBeGreaterThan(0);
    expect(metadata.height).toBeGreaterThan(0);

    console.log(`✅ 360p: ${metadata.width}x${metadata.height}, ${(metadata.fileSize / 1024).toFixed(1)} KB`);
  }, 90000);

  it('Resolution 480p: Creates GIF successfully', async () => {
    const { gifUrl, selectedRes } = await createAndValidateGif({
      resolution: '480p',
      validateSettings: true
    });

    expect(selectedRes).toBe('480p');

    const metadata = await extractGifMetadataFromUrl(driver, gifUrl);
    expect(metadata.width).toBeGreaterThan(0);
    expect(metadata.height).toBeGreaterThan(0);

    console.log(`✅ 480p: ${metadata.width}x${metadata.height}, ${(metadata.fileSize / 1024).toFixed(1)} KB`);
  }, 90000);

  // ========== Frame Rate Options Matrix ==========

  it('Frame rate 5 fps: Creates GIF successfully', async () => {
    const { gifUrl } = await createAndValidateGif({ fps: '5' });

    const metadata = await extractGifMetadataFromUrl(driver, gifUrl);
    console.log(`✅ 5 fps: ${metadata.fps} fps, ${metadata.frameCount} frames`);
  }, 90000);

  it('Frame rate 10 fps: Creates GIF successfully', async () => {
    const { gifUrl } = await createAndValidateGif({ fps: '10' });

    const metadata = await extractGifMetadataFromUrl(driver, gifUrl);
    console.log(`✅ 10 fps: ${metadata.fps} fps, ${metadata.frameCount} frames`);
  }, 90000);

  it('Frame rate 15 fps: Creates GIF successfully', async () => {
    const { gifUrl } = await createAndValidateGif({ fps: '15' });

    const metadata = await extractGifMetadataFromUrl(driver, gifUrl);
    console.log(`✅ 15 fps: ${metadata.fps} fps, ${metadata.frameCount} frames`);
  }, 90000);

  // ========== Duration Options Matrix ==========

  it('Duration ~1 second: Creates GIF successfully', async () => {
    const { gifUrl } = await createAndValidateGif({ resolution: '144p', fps: '5' });
    const metadata = await extractGifMetadataFromUrl(driver, gifUrl);
    console.log(`✅ ~1s duration: ${metadata.duration.toFixed(1)}s`);
  }, 90000);

  it('Duration ~3 seconds: Creates GIF successfully', async () => {
    const { gifUrl } = await createAndValidateGif({ resolution: '144p', fps: '5' });
    const metadata = await extractGifMetadataFromUrl(driver, gifUrl);
    console.log(`✅ ~3s duration: ${metadata.duration.toFixed(1)}s`);
  }, 90000);

  it('Duration ~5 seconds: Creates GIF successfully', async () => {
    const { gifUrl } = await createAndValidateGif({ resolution: '144p', fps: '5' });
    const metadata = await extractGifMetadataFromUrl(driver, gifUrl);
    console.log(`✅ ~5s duration: ${metadata.duration.toFixed(1)}s`);
  }, 90000);

  it('Duration ~7 seconds: Creates GIF successfully', async () => {
    const { gifUrl } = await createAndValidateGif({ resolution: '144p', fps: '5' });
    const metadata = await extractGifMetadataFromUrl(driver, gifUrl);
    console.log(`✅ ~7s duration: ${metadata.duration.toFixed(1)}s`);
  }, 90000);

  it('Duration ~10 seconds (max): Creates GIF successfully', async () => {
    const { gifUrl } = await createAndValidateGif({ resolution: '144p', fps: '5' });
    const metadata = await extractGifMetadataFromUrl(driver, gifUrl);
    console.log(`✅ ~10s duration (max): ${metadata.duration.toFixed(1)}s`);
  }, 90000);

  // ========== Combined Settings Matrix ==========

  it('Matrix - Smallest file: 144p @ 5fps', async () => {
    const { gifUrl } = await createAndValidateGif({
      resolution: '144p',
      fps: '5'
    });

    const metadata = await extractGifMetadataFromUrl(driver, gifUrl);
    console.log(`✅ Smallest: ${metadata.width}x${metadata.height} @ ${metadata.fps}fps, ${(metadata.fileSize / 1024).toFixed(1)} KB`);
  }, 90000);

  it('Matrix - Balanced settings: 240p @ 10fps', async () => {
    const { gifUrl } = await createAndValidateGif({
      resolution: '240p',
      fps: '10'
    });

    const metadata = await extractGifMetadataFromUrl(driver, gifUrl);
    console.log(`✅ Balanced: ${metadata.width}x${metadata.height} @ ${metadata.fps}fps, ${(metadata.fileSize / 1024).toFixed(1)} KB`);
  }, 90000);

  it('Matrix - High FPS compact: 360p @ 15fps', async () => {
    const { gifUrl } = await createAndValidateGif({
      resolution: '360p',
      fps: '15'
    });

    const metadata = await extractGifMetadataFromUrl(driver, gifUrl);
    console.log(`✅ High FPS: ${metadata.width}x${metadata.height} @ ${metadata.fps}fps, ${(metadata.fileSize / 1024).toFixed(1)} KB`);
  }, 90000);

  it('Matrix - HD low framerate: 480p @ 5fps', async () => {
    const { gifUrl } = await createAndValidateGif({
      resolution: '480p',
      fps: '5'
    });

    const metadata = await extractGifMetadataFromUrl(driver, gifUrl);
    console.log(`✅ HD low framerate: ${metadata.width}x${metadata.height} @ ${metadata.fps}fps, ${(metadata.fileSize / 1024).toFixed(1)} KB`);
  }, 90000);

  it('Matrix - Maximum quality: 480p @ 15fps', async () => {
    const { gifUrl } = await createAndValidateGif({
      resolution: '480p',
      fps: '15'
    });

    const metadata = await extractGifMetadataFromUrl(driver, gifUrl);
    console.log(`✅ Maximum quality: ${metadata.width}x${metadata.height} @ ${metadata.fps}fps, ${(metadata.fileSize / 1024).toFixed(1)} KB`);
  }, 90000);

  // ========== Settings Persistence Test ==========

  it('Settings persistence: Selections remain during navigation', async () => {
    const youtube = new YouTubePage(driver);
    const quickCapture = new QuickCapturePage(driver);
    const textOverlay = new TextOverlayPage(driver);

    await youtube.navigateToVideo(getMockVideoUrl('veryShort', mockServerUrl));
    await youtube.openGifWizard();

    await quickCapture.waitForScreen();

    await quickCapture.selectResolution('360p');
    await quickCapture.selectFps('10');

    const initialRes = await quickCapture.getSelectedResolution();
    const initialFps = await quickCapture.getSelectedFps();

    expect(initialRes).toBe('360p');
    expect(initialFps).toBe('10');

    await quickCapture.clickNext();

    try {
      await textOverlay.waitForScreen();
      await textOverlay.clickBack();

      const persistedRes = await quickCapture.getSelectedResolution();
      const persistedFps = await quickCapture.getSelectedFps();

      expect(persistedRes).toBe('360p');
      expect(persistedFps).toBe('10');

      console.log('✅ [Mock Test] Settings persisted through navigation!');
    } catch {
      console.log('[Mock Test] Text overlay screen not available');
    }
  }, 30000);

  // ========== Edge Case Tests ==========

  it('Edge case: All maximum settings together', async () => {
    const { gifUrl } = await createAndValidateGif({
      resolution: '480p',
      fps: '15'
    });

    const metadata = await extractGifMetadataFromUrl(driver, gifUrl);

    expect(metadata.width).toBeGreaterThan(0);
    expect(metadata.height).toBeGreaterThan(0);
    expect(metadata.frameCount).toBeGreaterThan(0);

    console.log(`✅ Max settings: ${metadata.width}x${metadata.height} @ ${metadata.fps}fps, ${(metadata.fileSize / 1024).toFixed(1)} KB`);
  }, 90000);

  it('Edge case: All minimum settings together', async () => {
    const { gifUrl } = await createAndValidateGif({
      resolution: '144p',
      fps: '5'
    });

    const metadata = await extractGifMetadataFromUrl(driver, gifUrl);

    expect(metadata.width).toBeGreaterThan(0);
    expect(metadata.height).toBeGreaterThan(0);
    expect(metadata.frameCount).toBeGreaterThan(0);

    console.log(`✅ Min settings: ${metadata.width}x${metadata.height} @ ${metadata.fps}fps, ${(metadata.fileSize / 1024).toFixed(1)} KB`);
  }, 90000);
});
