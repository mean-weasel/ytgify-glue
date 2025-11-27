import { WebDriver } from 'selenium-webdriver';
import {
  waitForElementVisible,
  executeScript,
  clickElement,
  isElementVisible,
  waitForFunction,
  sleep,
  navigateToUrl
} from '../test-utils';

/**
 * Page Object Model for YouTube page interactions
 * Works with both mock and real YouTube
 */
export class YouTubePage {
  constructor(private driver: WebDriver) {}

  /**
   * Navigate to a video URL
   */
  async navigateToVideo(videoUrl: string): Promise<void> {
    await navigateToUrl(this.driver, videoUrl);
    await this.waitForVideoReady();
  }

  /**
   * Wait for video and GIF button to be ready
   */
  async waitForVideoReady(timeout: number = 15000): Promise<void> {
    // Wait for video element
    await waitForElementVisible(this.driver, 'video', timeout);

    // Wait for video to have valid duration (loaded)
    await waitForFunction(
      this.driver,
      () => {
        const video = document.querySelector('video') as HTMLVideoElement;
        return video && !isNaN(video.duration) && video.duration > 0;
      },
      timeout
    );

    // Wait for ads to finish or be skippable
    await this.waitForAdsToFinish(30000);

    // Wait for GIF button to be injected
    await waitForElementVisible(this.driver, '.ytgif-button', timeout);

    // Small delay for stability
    await sleep(this.driver, 500);
  }

  /**
   * Wait for video content to load (uBlock Origin blocks ads)
   */
  async waitForAdsToFinish(timeout: number = 10000): Promise<void> {
    // With uBlock Origin, ads are blocked so we just need to verify video loaded
    console.log('[YouTubePage] Waiting for video content to load (ads blocked by uBlock)...');
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const duration = await executeScript<number>(this.driver, () => {
        const video = document.querySelector('video') as HTMLVideoElement;
        return video && !isNaN(video.duration) && isFinite(video.duration) ? video.duration : 0;
      });

      // Video loaded with valid duration (works for both mock and real videos)
      if (duration > 0) {
        console.log(`[YouTubePage] Video loaded (duration: ${duration.toFixed(3)}s)`);
        return;
      }

      await sleep(this.driver, 500);
    }

    console.warn('[YouTubePage] Video duration check timeout, proceeding anyway');
  }

  /**
   * Open the GIF wizard by clicking the GIF button
   */
  async openGifWizard(): Promise<void> {
    await clickElement(this.driver, '.ytgif-button');

    // Wait for wizard overlay to appear
    await waitForFunction(
      this.driver,
      () => document.querySelector('.ytgif-overlay-wizard, .ytgif-quick-capture-screen') !== null,
      5000
    );

    await sleep(this.driver, 500);
  }

  /**
   * Pause the video
   */
  async pauseVideo(): Promise<void> {
    const isPlaying = await this.isVideoPlaying();
    if (isPlaying) {
      await executeScript(this.driver, () => {
        const video = document.querySelector('video') as HTMLVideoElement;
        if (video) video.pause();
      });
      await sleep(this.driver, 300);
    }
  }

  /**
   * Play the video
   */
  async playVideo(): Promise<void> {
    const isPlaying = await this.isVideoPlaying();
    if (!isPlaying) {
      await executeScript(this.driver, () => {
        const video = document.querySelector('video') as HTMLVideoElement;
        if (video) video.play();
      });
      await sleep(this.driver, 300);
    }
  }

  /**
   * Seek to a specific time in the video
   */
  async seekToTime(seconds: number): Promise<void> {
    await executeScript(
      this.driver,
      (time: number) => {
        const video = document.querySelector('video') as HTMLVideoElement;
        if (video) {
          video.currentTime = time;
        }
      },
      seconds
    );
    await sleep(this.driver, 500);
  }

  /**
   * Check if video is currently playing
   */
  async isVideoPlaying(): Promise<boolean> {
    return executeScript<boolean>(this.driver, () => {
      const video = document.querySelector('video') as HTMLVideoElement;
      return video ? !video.paused && !video.ended : false;
    });
  }

  /**
   * Get video duration
   */
  async getVideoDuration(): Promise<number> {
    return executeScript<number>(this.driver, () => {
      const video = document.querySelector('video') as HTMLVideoElement;
      return video && !isNaN(video.duration) ? video.duration : 0;
    });
  }

  /**
   * Get current playback time
   */
  async getCurrentTime(): Promise<number> {
    return executeScript<number>(this.driver, () => {
      const video = document.querySelector('video') as HTMLVideoElement;
      return video ? video.currentTime : 0;
    });
  }

  /**
   * Wait for extension to fully load and inject GIF button
   */
  async waitForExtensionLoad(timeout: number = 30000): Promise<void> {
    await waitForFunction(
      this.driver,
      () => document.querySelector('.ytgif-button') !== null,
      timeout
    );
  }

  /**
   * Check if GIF button is visible
   */
  async isGifButtonVisible(): Promise<boolean> {
    return isElementVisible(this.driver, '.ytgif-button');
  }

  /**
   * Wait for video to be loaded and playable
   */
  async waitForVideoLoaded(timeout: number = 15000): Promise<void> {
    await waitForFunction(
      this.driver,
      () => {
        const video = document.querySelector('video') as HTMLVideoElement;
        return video && video.readyState >= 2; // HAVE_CURRENT_DATA or better
      },
      timeout
    );
  }

  /**
   * Get video metadata
   */
  async getVideoMetadata(): Promise<{
    duration: number;
    currentTime: number;
    paused: boolean;
    width: number;
    height: number;
  }> {
    return executeScript<{
      duration: number;
      currentTime: number;
      paused: boolean;
      width: number;
      height: number;
    }>(this.driver, () => {
      const video = document.querySelector('video') as HTMLVideoElement;
      if (!video) {
        return { duration: 0, currentTime: 0, paused: true, width: 0, height: 0 };
      }
      return {
        duration: video.duration || 0,
        currentTime: video.currentTime || 0,
        paused: video.paused,
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
      };
    });
  }
}
