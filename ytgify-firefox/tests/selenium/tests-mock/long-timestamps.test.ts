/**
 * Long Timestamp Tests - Mock E2E
 *
 * Tests GIF creation with longer videos and various timestamp positions.
 * Validates seeking accuracy, timeline navigation, and duration detection
 * for videos longer than the typical 20-second test videos.
 *
 * Historical context:
 * - Real E2E tests used timestamps like 8:49 (529 seconds) in 12+ minute videos
 * - Mock tests were limited to 20-second videos
 * - This test file uses a 60-second mock video to test timestamp handling
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

describe('Mock E2E: Long Timestamp Handling (Selenium)', () => {
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
   * Test 1: Duration detection for 60-second video
   * Verifies that the video element correctly reports the full duration.
   */
  it('should correctly detect duration of 60-second video', async () => {
    const youtube = new YouTubePage(driver);

    const videoUrl = getMockVideoUrl('longTimestamp', mockServerUrl);
    await youtube.navigateToVideo(videoUrl);

    const videoMetadata = await youtube.getVideoMetadata();

    // Duration should be close to 60 seconds
    expect(videoMetadata.duration).toBeGreaterThanOrEqual(55);
    expect(videoMetadata.duration).toBeLessThanOrEqual(65);

    console.log(`[Long Timestamp Test] Video duration detected: ${videoMetadata.duration}s`);
    console.log(`Expected: ~${MOCK_VIDEOS.longTimestamp.duration}s`);
    console.log('Duration detection test passed');
  }, 60000);

  /**
   * Test 2: Seeking accuracy at various positions
   * Tests that video seeking works correctly at different timestamps.
   */
  it('should seek accurately to various timestamps in long video', async () => {
    const youtube = new YouTubePage(driver);

    const videoUrl = getMockVideoUrl('longTimestamp', mockServerUrl);
    await youtube.navigateToVideo(videoUrl);

    // Test seeking to multiple positions
    const testPositions = [10, 25, 40, 55];

    for (const targetTime of testPositions) {
      await youtube.seekToTime(targetTime);

      const currentTime = await driver.executeScript(() => {
        const video = document.querySelector('video') as HTMLVideoElement;
        return video ? video.currentTime : -1;
      }) as number;

      // Allow 2-second tolerance for seeking accuracy
      expect(currentTime).toBeGreaterThanOrEqual(targetTime - 2);
      expect(currentTime).toBeLessThanOrEqual(targetTime + 2);

      console.log(`[Long Timestamp Test] Seek to ${targetTime}s: actual=${currentTime.toFixed(1)}s`);
    }

    console.log('Seeking accuracy test passed');
  }, 90000);

  /**
   * Test 3: GIF creation from mid-video position (30-35s)
   * Tests GIF creation starting from a timestamp > 30 seconds.
   */
  it('should create GIF starting from mid-video timestamp', async () => {
    const youtube = new YouTubePage(driver);
    const quickCapture = new QuickCapturePage(driver);
    const textOverlay = new TextOverlayPage(driver);
    const processing = new ProcessingPage(driver);
    const success = new SuccessPage(driver);

    const videoUrl = getMockVideoUrl('longTimestamp', mockServerUrl);
    await youtube.navigateToVideo(videoUrl);

    // Seek to mid-video position before opening wizard
    await youtube.seekToTime(30);
    await driver.sleep(500);

    await youtube.openGifWizard();
    await quickCapture.waitForScreen();

    // Use low settings for faster processing
    await quickCapture.selectResolution('144p');
    await quickCapture.selectFps('5');

    await quickCapture.clickNext();
    await textOverlay.waitForScreen();
    await textOverlay.clickSkip();
    await processing.waitForCompletion(60000);
    await success.waitForScreen();

    const gifUrl = await success.getGifUrl();
    expect(gifUrl).toBeTruthy();

    const metadata = await extractGifMetadataFromUrl(driver, gifUrl!);
    expect(metadata.frameCount).toBeGreaterThan(0);

    console.log(`[Long Timestamp Test] Mid-video GIF: ${metadata.frameCount} frames, ${metadata.duration.toFixed(1)}s`);
    console.log('Mid-video timestamp GIF creation passed');
  }, 90000);

  /**
   * Test 4: GIF creation from near-end position (50-55s)
   * Tests GIF creation close to the end of the video.
   */
  it('should create GIF starting from near-end timestamp', async () => {
    const youtube = new YouTubePage(driver);
    const quickCapture = new QuickCapturePage(driver);
    const textOverlay = new TextOverlayPage(driver);
    const processing = new ProcessingPage(driver);
    const success = new SuccessPage(driver);

    const videoUrl = getMockVideoUrl('longTimestamp', mockServerUrl);
    await youtube.navigateToVideo(videoUrl);

    // Seek to near-end position
    await youtube.seekToTime(50);
    await driver.sleep(500);

    await youtube.openGifWizard();
    await quickCapture.waitForScreen();

    // Use low settings for faster processing
    await quickCapture.selectResolution('144p');
    await quickCapture.selectFps('5');

    await quickCapture.clickNext();
    await textOverlay.waitForScreen();
    await textOverlay.clickSkip();
    await processing.waitForCompletion(60000);
    await success.waitForScreen();

    const gifUrl = await success.getGifUrl();
    expect(gifUrl).toBeTruthy();

    const metadata = await extractGifMetadataFromUrl(driver, gifUrl!);
    expect(metadata.frameCount).toBeGreaterThan(0);

    console.log(`[Long Timestamp Test] Near-end GIF: ${metadata.frameCount} frames, ${metadata.duration.toFixed(1)}s`);
    console.log('Near-end timestamp GIF creation passed');
  }, 90000);

  /**
   * Test 5: Timeline slider functionality at different positions
   * Tests that the timeline UI works correctly for longer videos.
   */
  it('should handle timeline slider for long video', async () => {
    const youtube = new YouTubePage(driver);
    const quickCapture = new QuickCapturePage(driver);

    const videoUrl = getMockVideoUrl('longTimestamp', mockServerUrl);
    await youtube.navigateToVideo(videoUrl);

    // Verify video duration first
    const videoMetadata = await youtube.getVideoMetadata();
    expect(videoMetadata.duration).toBeGreaterThan(50);

    await youtube.openGifWizard();
    await quickCapture.waitForScreen();

    // Get selection duration
    const selectionDuration = await quickCapture.getSelectionDuration();

    // Selection should be within valid bounds (not exceeding 10s max GIF length)
    expect(selectionDuration).toBeGreaterThan(0);
    expect(selectionDuration).toBeLessThanOrEqual(10);

    // Selection should not exceed video duration
    expect(selectionDuration).toBeLessThanOrEqual(videoMetadata.duration);

    console.log(`[Long Timestamp Test] Timeline slider:`);
    console.log(`  Video duration: ${videoMetadata.duration}s`);
    console.log(`  Selection duration: ${selectionDuration}s`);
    console.log('Timeline slider test passed');
  }, 60000);
});
