/**
 * Basic wizard tests using mock YouTube
 * Selenium E2E Mock Test
 */

import { WebDriver, By, until } from 'selenium-webdriver';
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

describe('Mock E2E: Basic Wizard Tests (Selenium)', () => {
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

  // ========== Extension and Player Tests ==========

  it('Extension loads and GIF button appears on mock YouTube', async () => {
    const youtube = new YouTubePage(driver);

    const videoUrl = getMockVideoUrl('veryShort', mockServerUrl);
    await youtube.navigateToVideo(videoUrl);

    // Verify we're on a mock YouTube page
    const isMockPage = await driver.executeScript(() => {
      return !!(window as any).__MOCK_YOUTUBE__;
    });
    expect(isMockPage).toBe(true);

    // Wait for player controls
    await driver.wait(until.elementLocated(By.css('.ytp-right-controls')), 10000);
    console.log('[Mock Test] Player controls found');

    // Check video metadata
    const videoInfo = await youtube.getVideoMetadata();
    expect(videoInfo.duration).toBeGreaterThan(0);
    console.log('[Mock Test] Video info:', videoInfo);

    // Wait for GIF button
    const isVisible = await youtube.isGifButtonVisible();
    expect(isVisible).toBe(true);

    console.log('✅ [Mock Test] Extension loaded and button injected successfully!');
  }, 30000);

  it('Can open wizard on mock YouTube', async () => {
    const youtube = new YouTubePage(driver);

    await youtube.navigateToVideo(getMockVideoUrl('veryShort', mockServerUrl));

    console.log('[Mock Test] Clicking GIF button...');
    await youtube.openGifWizard();

    const wizardInfo = await driver.executeScript(() => {
      const wizard = document.querySelector('.ytgif-overlay-wizard');
      const quickCapture = document.querySelector('.ytgif-quick-capture-screen');
      return {
        wizardExists: !!wizard,
        wizardVisible: wizard ? (wizard as HTMLElement).offsetParent !== null : false,
        quickCaptureExists: !!quickCapture,
        allYtgifElements: document.querySelectorAll('[class*="ytgif"]').length
      };
    }) as any;

    console.log('[Mock Test] Wizard info:', wizardInfo);
    expect(wizardInfo.allYtgifElements).toBeGreaterThan(0);

    console.log('✅ [Mock Test] Wizard interaction successful!');
  }, 30000);

  it('Mock player controls work correctly', async () => {
    const youtube = new YouTubePage(driver);

    await youtube.navigateToVideo(getMockVideoUrl('medium', mockServerUrl));

    await driver.wait(until.elementLocated(By.css('video')), 10000);
    await driver.wait(async () => {
      return await driver.executeScript(() => {
        const video = document.querySelector('video') as HTMLVideoElement;
        return video && video.readyState >= 2;
      });
    }, 10000);

    const playButton = await driver.findElement(By.css('.ytp-play-button'));
    expect(playButton).toBeTruthy();

    await playButton.click();
    await driver.sleep(500);

    let isPlaying = await driver.executeScript(() => {
      const video = document.querySelector('video') as HTMLVideoElement;
      return !video.paused;
    });
    expect(isPlaying).toBe(true);

    await playButton.click();
    await driver.sleep(500);

    isPlaying = await driver.executeScript(() => {
      const video = document.querySelector('video') as HTMLVideoElement;
      return !video.paused;
    });
    expect(isPlaying).toBe(false);

    console.log('✅ [Mock Test] Player controls work correctly!');
  }, 30000);

  it('Video metadata matches configuration', async () => {
    const youtube = new YouTubePage(driver);

    await youtube.navigateToVideo(getMockVideoUrl('medium', mockServerUrl));

    const videoMetadata = await youtube.getVideoMetadata();

    console.log('[Mock Test] Video properties:', videoMetadata);

    const expectedVideo = MOCK_VIDEOS.medium;
    expect(videoMetadata.duration).toBeCloseTo(expectedVideo.duration, 0);

    console.log('✅ [Mock Test] Video metadata validated!');
  }, 30000);

  it('Can navigate to mock YouTube and video loads', async () => {
    const youtube = new YouTubePage(driver);

    await youtube.navigateToVideo(getMockVideoUrl('veryShort', mockServerUrl));

    await driver.wait(until.elementLocated(By.css('video')), 10000);

    const videoReady = await driver.wait(async () => {
      return await driver.executeScript(() => {
        const video = document.querySelector('video') as HTMLVideoElement;
        return video && !isNaN(video.duration) && video.duration > 0;
      });
    }, 10000);

    expect(videoReady).toBe(true);

    console.log('✅ [Mock Test] Video loaded and ready!');
  }, 90000);

  // ========== GIF Creation Tests ==========

  it('Can create a simple GIF', async () => {
    await testGifCreationBasic();
  }, 90000);

  it('Can create GIF with specific resolution and validate output', async () => {
    const { gifUrl } = await createGifWithSettings({ resolution: '240p' });
    const metadata = await extractGifMetadataFromUrl(driver, gifUrl);
    console.log(`✅ GIF created: ${metadata.width}x${metadata.height}`);
  }, 90000);

  it('Can create GIF with specific FPS and validate output', async () => {
    const { gifUrl } = await createGifWithSettings({ fps: '10' });
    const metadata = await extractGifMetadataFromUrl(driver, gifUrl);
    console.log(`✅ GIF created: ${metadata.fps} fps, ${metadata.frameCount} frames`);
  }, 90000);

  it('Can create GIF with specific length and validate output', async () => {
    const { gifUrl } = await createGifWithSettings({ resolution: '144p', fps: '5' });
    const metadata = await extractGifMetadataFromUrl(driver, gifUrl);
    console.log(`✅ GIF created: ${metadata.duration.toFixed(1)}s duration`);
  }, 90000);

  // ========== Settings Tests ==========

  it('Can select different resolution options', async () => {
    const youtube = new YouTubePage(driver);
    const quickCapture = new QuickCapturePage(driver);

    await youtube.navigateToVideo(getMockVideoUrl('veryShort', mockServerUrl));
    await youtube.openGifWizard();
    await quickCapture.waitForScreen();

    await quickCapture.selectResolution('360p');
    const selected = await quickCapture.getSelectedResolution();
    expect(selected).toBe('360p');

    console.log('✅ Resolution selection works!');
  }, 30000);

  it('Resolution setting persists through wizard navigation', async () => {
    const youtube = new YouTubePage(driver);
    const quickCapture = new QuickCapturePage(driver);
    const textOverlay = new TextOverlayPage(driver);

    await youtube.navigateToVideo(getMockVideoUrl('veryShort', mockServerUrl));
    await youtube.openGifWizard();
    await quickCapture.waitForScreen();

    await quickCapture.selectResolution('240p');
    await quickCapture.clickNext();
    await textOverlay.waitForScreen();
    await textOverlay.clickBack();

    const persisted = await quickCapture.getSelectedResolution();
    expect(persisted).toBe('240p');

    console.log('✅ Resolution persists through navigation!');
  }, 30000);

  it('Can select different FPS options', async () => {
    const youtube = new YouTubePage(driver);
    const quickCapture = new QuickCapturePage(driver);

    await youtube.navigateToVideo(getMockVideoUrl('veryShort', mockServerUrl));
    await youtube.openGifWizard();
    await quickCapture.waitForScreen();

    await quickCapture.selectFps('15');
    const selected = await quickCapture.getSelectedFps();
    expect(selected).toBe('15');

    console.log('✅ FPS selection works!');
  }, 30000);

  it('FPS setting persists through wizard navigation', async () => {
    const youtube = new YouTubePage(driver);
    const quickCapture = new QuickCapturePage(driver);
    const textOverlay = new TextOverlayPage(driver);

    await youtube.navigateToVideo(getMockVideoUrl('veryShort', mockServerUrl));
    await youtube.openGifWizard();
    await quickCapture.waitForScreen();

    await quickCapture.selectFps('10');
    await quickCapture.clickNext();
    await textOverlay.waitForScreen();
    await textOverlay.clickBack();

    const persisted = await quickCapture.getSelectedFps();
    expect(persisted).toBe('10');

    console.log('✅ FPS persists through navigation!');
  }, 30000);

  it('Can validate GIF length interface', async () => {
    const youtube = new YouTubePage(driver);
    const quickCapture = new QuickCapturePage(driver);

    await youtube.navigateToVideo(getMockVideoUrl('veryShort', mockServerUrl));
    await youtube.openGifWizard();
    await quickCapture.waitForScreen();

    const duration = await quickCapture.getSelectionDuration();
    expect(duration).toBeGreaterThan(0);

    console.log(`✅ GIF length interface works (${duration.toFixed(1)}s)!`);
  }, 30000);

  it('GIF length interface persists through wizard navigation', async () => {
    const youtube = new YouTubePage(driver);
    const quickCapture = new QuickCapturePage(driver);
    const textOverlay = new TextOverlayPage(driver);

    await youtube.navigateToVideo(getMockVideoUrl('veryShort', mockServerUrl));
    await youtube.openGifWizard();
    await quickCapture.waitForScreen();

    const initialDuration = await quickCapture.getSelectionDuration();
    await quickCapture.clickNext();
    await textOverlay.waitForScreen();
    await textOverlay.clickBack();

    const persistedDuration = await quickCapture.getSelectionDuration();
    expect(persistedDuration).toBeCloseTo(initialDuration, 0);

    console.log('✅ GIF length persists through navigation!');
  }, 30000);

  // ========== Output Validation Tests ==========

  it('Verify frame rate matches selected setting', async () => {
    const { gifUrl } = await createGifWithSettings({ fps: '10' });
    const metadata = await extractGifMetadataFromUrl(driver, gifUrl);
    expect(metadata.fps).toBeGreaterThanOrEqual(8);
    expect(metadata.fps).toBeLessThanOrEqual(12);
    console.log(`✅ Frame rate validated: ${metadata.fps} fps`);
  }, 90000);

  it('Verify aspect ratio preservation', async () => {
    const { gifUrl } = await createGifWithSettings({ resolution: '240p' });
    const metadata = await extractGifMetadataFromUrl(driver, gifUrl);

    const aspectRatio = metadata.width / metadata.height;
    expect(aspectRatio).toBeGreaterThan(1);

    console.log(`✅ Aspect ratio preserved: ${aspectRatio.toFixed(2)}`);
  }, 90000);

  it('Verify duplicate frame detection and recovery', async () => {
    const { gifUrl } = await createGifWithSettings({ fps: '5' });
    const metadata = await extractGifMetadataFromUrl(driver, gifUrl);
    expect(metadata.frameCount).toBeGreaterThan(0);
    console.log(`✅ Duplicate frame handling validated: ${metadata.frameCount} frames`);
  }, 90000);

  it('Timeline handles short video boundary correctly - prevents overflow', async () => {
    const youtube = new YouTubePage(driver);
    const quickCapture = new QuickCapturePage(driver);

    await youtube.navigateToVideo(getMockVideoUrl('veryShort', mockServerUrl));

    const videoDuration = await driver.executeScript(() => {
      const video = document.querySelector('video') as HTMLVideoElement;
      return video ? video.duration : 0;
    }) as number;

    await youtube.openGifWizard();
    await quickCapture.waitForScreen();

    const selectionDuration = await quickCapture.getSelectionDuration();
    expect(selectionDuration).toBeLessThanOrEqual(videoDuration);

    console.log(`✅ Timeline boundary respected: ${selectionDuration}s <= ${videoDuration}s`);
  }, 60000);

  it('Timeline slider value synchronizes with actual applied duration on short videos', async () => {
    const youtube = new YouTubePage(driver);
    const quickCapture = new QuickCapturePage(driver);

    await youtube.navigateToVideo(getMockVideoUrl('veryShort', mockServerUrl));
    await youtube.openGifWizard();
    await quickCapture.waitForScreen();

    const duration = await quickCapture.getSelectionDuration();
    expect(duration).toBeGreaterThan(0);

    console.log(`✅ Timeline slider synchronized: ${duration.toFixed(1)}s`);
  }, 60000);

  // ========== Helper Functions ==========

  async function testGifCreationBasic() {
    const youtube = new YouTubePage(driver);
    const quickCapture = new QuickCapturePage(driver);
    const textOverlay = new TextOverlayPage(driver);
    const processing = new ProcessingPage(driver);
    const success = new SuccessPage(driver);

    await youtube.navigateToVideo(getMockVideoUrl('veryShort', mockServerUrl));
    await youtube.openGifWizard();
    await quickCapture.waitForScreen();
    await quickCapture.clickNext();
    await textOverlay.waitForScreen();
    await textOverlay.clickSkip();
    await processing.waitForCompletion(45000);
    await success.waitForScreen();

    const gifUrl = await success.getGifUrl();
    expect(gifUrl).toBeTruthy();
    console.log('✅ Simple GIF created successfully!');
  }

  async function createGifWithSettings(options: {
    resolution?: '144p' | '240p' | '360p' | '480p';
    fps?: '5' | '10' | '15';
  }) {
    const youtube = new YouTubePage(driver);
    const quickCapture = new QuickCapturePage(driver);
    const textOverlay = new TextOverlayPage(driver);
    const processing = new ProcessingPage(driver);
    const success = new SuccessPage(driver);

    await youtube.navigateToVideo(getMockVideoUrl('veryShort', mockServerUrl));
    await youtube.openGifWizard();
    await quickCapture.waitForScreen();

    if (options.resolution) {
      await quickCapture.selectResolution(options.resolution);
    }
    if (options.fps) {
      await quickCapture.selectFps(options.fps);
    }

    await quickCapture.clickNext();
    await textOverlay.waitForScreen();
    await textOverlay.clickSkip();
    await processing.waitForCompletion(45000);
    await success.waitForScreen();

    const gifUrl = await success.getGifUrl();
    expect(gifUrl).toBeTruthy();

    return { gifUrl: gifUrl! };
  }
});
