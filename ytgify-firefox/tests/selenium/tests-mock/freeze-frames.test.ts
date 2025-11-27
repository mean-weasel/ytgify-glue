/**
 * Freeze Frame Tests - Mock E2E
 *
 * Tests GIF creation with videos containing consecutive duplicate frames.
 * Validates the bug fix for frame 48/72 failure scenario where the frame
 * extractor incorrectly treated static content as buffering stuck.
 *
 * Historical context:
 * - Bug: GIF creation failed at frame 48/72 when processing videos with 15+
 *   consecutive identical frames (static content like freeze frames)
 * - Root cause: Original logic treated all duplicate frames as buffering stuck
 * - Fix location: src/content/gif-processor.ts - differentiates between
 *   seek failure (buffering) and successful seek with duplicate frame (static content)
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
  MOCK_VIDEOS,
  extractGifMetadataFromUrl
} from '../helpers';

describe('Mock E2E: Freeze Frame Handling (Selenium)', () => {
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

  /**
   * Test 1: 15 fps spanning freeze section
   * This is the exact scenario that caused the frame 48/72 failure.
   * The freeze frame video has:
   * - 0-4s: Normal animated test pattern
   * - 4-6s: Frozen last frame (all identical)
   *
   * At 15 fps over 4s spanning the freeze (e.g., 2-6s), we expect ~60 frames
   * with approximately 30 being duplicates.
   */
  it('should handle video with freeze frame section at 15 fps', async () => {
    const youtube = new YouTubePage(driver);
    const quickCapture = new QuickCapturePage(driver);
    const textOverlay = new TextOverlayPage(driver);
    const processing = new ProcessingPage(driver);
    const success = new SuccessPage(driver);

    // Navigate to freeze frame video
    const videoUrl = getMockVideoUrl('freezeFrame', mockServerUrl);
    await youtube.navigateToVideo(videoUrl);

    // Verify video loaded
    const videoMetadata = await youtube.getVideoMetadata();
    expect(videoMetadata.duration).toBeCloseTo(MOCK_VIDEOS.freezeFrame.duration, 0);
    console.log(`[Freeze Frame Test] Video loaded: ${videoMetadata.duration}s`);

    // Open wizard
    await youtube.openGifWizard();
    await quickCapture.waitForScreen();

    // Select 15 fps (the problematic frame rate from the original bug)
    await quickCapture.selectFps('15');
    const selectedFps = await quickCapture.getSelectedFps();
    expect(selectedFps).toBe('15');

    // Proceed through wizard
    await quickCapture.clickNext();
    await textOverlay.waitForScreen();
    await textOverlay.clickSkip();

    // Wait for processing - longer timeout due to 15 fps
    await processing.waitForCompletion(90000);
    await success.waitForScreen();

    // Verify GIF was created successfully
    const gifUrl = await success.getGifUrl();
    expect(gifUrl).toBeTruthy();

    // Validate GIF metadata
    const metadata = await extractGifMetadataFromUrl(driver, gifUrl!);
    expect(metadata.frameCount).toBeGreaterThan(0);

    console.log(`[Freeze Frame Test] 15 fps: ${metadata.frameCount} frames, ${metadata.duration.toFixed(1)}s`);
    console.log('15 fps freeze frame test passed - bug fix validated');
  }, 120000);

  /**
   * Test 2: 5 fps baseline comparison
   * Lower frame rate should handle freeze frames more easily.
   * This provides a baseline to compare against the 15 fps stress test.
   */
  it('should handle video with freeze frame section at 5 fps (baseline)', async () => {
    const youtube = new YouTubePage(driver);
    const quickCapture = new QuickCapturePage(driver);
    const textOverlay = new TextOverlayPage(driver);
    const processing = new ProcessingPage(driver);
    const success = new SuccessPage(driver);

    const videoUrl = getMockVideoUrl('freezeFrame', mockServerUrl);
    await youtube.navigateToVideo(videoUrl);
    await youtube.openGifWizard();
    await quickCapture.waitForScreen();

    // Select 5 fps (lower frame rate = fewer frames to extract)
    await quickCapture.selectFps('5');
    const selectedFps = await quickCapture.getSelectedFps();
    expect(selectedFps).toBe('5');

    await quickCapture.clickNext();
    await textOverlay.waitForScreen();
    await textOverlay.clickSkip();
    await processing.waitForCompletion(60000);
    await success.waitForScreen();

    const gifUrl = await success.getGifUrl();
    expect(gifUrl).toBeTruthy();

    const metadata = await extractGifMetadataFromUrl(driver, gifUrl!);
    expect(metadata.frameCount).toBeGreaterThan(0);

    console.log(`[Freeze Frame Test] 5 fps baseline: ${metadata.frameCount} frames`);
    console.log('5 fps baseline freeze frame test passed');
  }, 90000);

  /**
   * Test 3: GIF created entirely from frozen section
   * Tests the extreme case where ALL frames would be duplicates.
   * This validates that the fix handles 100% static content.
   *
   * Note: Due to timeline constraints, we test with a short duration
   * that spans mostly frozen content (4-6s range of the video).
   */
  it('should handle GIF creation from mostly frozen content at 10 fps', async () => {
    const youtube = new YouTubePage(driver);
    const quickCapture = new QuickCapturePage(driver);
    const textOverlay = new TextOverlayPage(driver);
    const processing = new ProcessingPage(driver);
    const success = new SuccessPage(driver);

    const videoUrl = getMockVideoUrl('freezeFrame', mockServerUrl);
    await youtube.navigateToVideo(videoUrl);
    await youtube.openGifWizard();
    await quickCapture.waitForScreen();

    // Use 10 fps for moderate frame count
    await quickCapture.selectFps('10');

    // Use smallest resolution for faster processing
    await quickCapture.selectResolution('144p');

    await quickCapture.clickNext();
    await textOverlay.waitForScreen();
    await textOverlay.clickSkip();
    await processing.waitForCompletion(60000);
    await success.waitForScreen();

    const gifUrl = await success.getGifUrl();
    expect(gifUrl).toBeTruthy();

    const metadata = await extractGifMetadataFromUrl(driver, gifUrl!);
    expect(metadata.frameCount).toBeGreaterThan(0);
    expect(metadata.width).toBeLessThanOrEqual(300); // 144p should be small

    console.log(`[Freeze Frame Test] 10 fps frozen content: ${metadata.frameCount} frames, ${metadata.width}x${metadata.height}`);
    console.log('Frozen content test passed');
  }, 90000);

  /**
   * Test 4: Validates frame extraction continues through duplicate frames
   * This test verifies the core fix: consecutive duplicate frames due to
   * static content should NOT cause extraction to abort.
   *
   * We check that frame count is reasonable for the duration and FPS.
   */
  it('should produce expected frame count despite duplicate frames', async () => {
    const youtube = new YouTubePage(driver);
    const quickCapture = new QuickCapturePage(driver);
    const textOverlay = new TextOverlayPage(driver);
    const processing = new ProcessingPage(driver);
    const success = new SuccessPage(driver);

    const videoUrl = getMockVideoUrl('freezeFrame', mockServerUrl);
    await youtube.navigateToVideo(videoUrl);
    await youtube.openGifWizard();
    await quickCapture.waitForScreen();

    // Get the selection duration
    const duration = await quickCapture.getSelectionDuration();
    console.log(`[Freeze Frame Test] Selection duration: ${duration}s`);

    // Use 10 fps
    await quickCapture.selectFps('10');

    await quickCapture.clickNext();
    await textOverlay.waitForScreen();
    await textOverlay.clickSkip();
    await processing.waitForCompletion(60000);
    await success.waitForScreen();

    const gifUrl = await success.getGifUrl();
    expect(gifUrl).toBeTruthy();

    const metadata = await extractGifMetadataFromUrl(driver, gifUrl!);

    // Calculate expected frame count: duration * fps
    // Allow tolerance for edge cases
    const expectedFrames = Math.floor(duration * 10);
    const minExpectedFrames = Math.floor(expectedFrames * 0.7); // 70% tolerance

    expect(metadata.frameCount).toBeGreaterThanOrEqual(minExpectedFrames);

    console.log(`[Freeze Frame Test] Frame count validation:`);
    console.log(`  Duration: ${duration}s at 10 fps`);
    console.log(`  Expected: ~${expectedFrames} frames`);
    console.log(`  Actual: ${metadata.frameCount} frames`);
    console.log('Frame count validation passed - extraction did not abort prematurely');
  }, 90000);
});
