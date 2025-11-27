/**
 * Diagnostic test to check video playback in Firefox
 * Selenium E2E Mock Test
 */

import { WebDriver } from 'selenium-webdriver';
import * as path from 'path';
import * as fs from 'fs';
import { createFirefoxDriver } from '../firefox-driver';
import { YouTubePage } from '../page-objects';
import { getMockVideoUrl } from '../helpers';

describe('Diagnostic: Video Playback (Selenium Mock)', () => {
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

  it('Video loads and is playable', async () => {
    const youtube = new YouTubePage(driver);

    await youtube.navigateToVideo(getMockVideoUrl('veryShort', mockServerUrl));

    // Wait for video to be ready
    await youtube.waitForVideoLoaded(15000);

    // Get video state
    const videoInfo = await youtube.getVideoMetadata();

    console.log('📹 Video Info:', videoInfo);

    // Check video properties
    expect(videoInfo.duration).toBeGreaterThan(0);
    expect(videoInfo.width).toBeGreaterThan(0);
    expect(videoInfo.height).toBeGreaterThan(0);

    // Try to play video
    await youtube.playVideo();
    await driver.sleep(1000);

    const isPlaying = await youtube.isVideoPlaying();
    console.log('▶️  Video playing:', isPlaying);

    // Get current time to verify video is progressing
    const currentTime1 = await youtube.getCurrentTime();
    await driver.sleep(500);
    const currentTime2 = await youtube.getCurrentTime();

    console.log('⏱️  Playback progressing:', currentTime1, '→', currentTime2);

    // Video should progress
    expect(currentTime2).toBeGreaterThan(currentTime1);

    console.log('✅ Video is playable in Firefox!');
  }, 60000);
});
