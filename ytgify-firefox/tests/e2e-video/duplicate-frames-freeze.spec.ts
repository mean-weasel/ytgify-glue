/**
 * Duplicate Frames / Freeze Frame Test - Playwright E2E with Video Recording
 *
 * This test demonstrates the fix for handling consecutive duplicate frames
 * Bug: User reported failure at frame 48/72 with 15 fps
 * Video: https://www.youtube.com/watch?v=NBZv0_MImIY
 * Start: 8:49 (529 seconds)
 * Duration: 4.8 seconds
 * Frame Rate: 15 fps
 */

import { test, expect } from '../e2e/fixtures';
import { handleYouTubeCookieConsent, waitForGifButton } from '../e2e/helpers/extension-helpers';

test.describe('Duplicate Frames Video Recording', () => {
  test('Create GIF with freeze frames at 15 fps', async ({ page, context, extensionId }) => {
    test.setTimeout(180000); // 3 minutes
    expect(extensionId).toBeTruthy();

    console.log('[Test] Starting duplicate frames test with video recording...');

    // Navigate to YouTube video with timestamp
    const videoUrl = 'https://www.youtube.com/watch?v=NBZv0_MImIY&t=529s';
    console.log(`[Test] Navigating to: ${videoUrl}`);
    await page.goto(videoUrl);

    // Handle cookie consent
    await handleYouTubeCookieConsent(page);

    // Wait for video element
    await page.waitForSelector('video', { timeout: 30000 });
    console.log('[Test] Video element found');

    // Wait for video to load
    await page.waitForFunction(() => {
      const video = document.querySelector('video') as HTMLVideoElement;
      return video && !isNaN(video.duration) && video.duration > 0;
    }, { timeout: 30000 });

    // Seek to 8:49 and pause
    await page.evaluate(() => {
      const video = document.querySelector('video') as HTMLVideoElement;
      if (video) {
        video.currentTime = 529; // 8:49
        video.pause();
      }
    });
    await page.waitForTimeout(2000);
    console.log('[Test] Seeked to 8:49 and paused');

    // Wait for GIF button to appear
    console.log('[Test] Waiting for GIF button...');
    await waitForGifButton(page, 30000);
    console.log('[Test] GIF button found');

    // Click GIF button to open wizard
    await page.click('.ytgif-button');
    await page.waitForTimeout(1000);
    console.log('[Test] Wizard opened');

    // Wait for wizard UI
    await page.waitForSelector('.ytgif-quick-capture-screen', { timeout: 10000 });

    // Set time range: 529s - 533.8s (4.8 seconds)
    console.log('[Test] Setting time range (8:49 for 4.8s)...');

    // Click on timeline at 529s position
    const timeline = await page.locator('.ytgif-timeline-track');
    await timeline.click({ position: { x: 100, y: 10 } });
    await page.waitForTimeout(500);

    // Set duration to 4.8s using slider
    await page.evaluate(() => {
      const slider = document.querySelector('.ytgif-slider-input') as HTMLInputElement;
      if (slider) {
        slider.value = '4.8';
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(500);
    console.log('[Test] Time range set');

    // Select 15 fps
    console.log('[Test] Selecting 15 fps...');
    await page.click('button:has-text("15 fps")');
    await page.waitForTimeout(500);
    console.log('[Test] 15 fps selected');

    // Click Next
    await page.click('.ytgif-button-primary');
    await page.waitForTimeout(1000);

    // Skip text overlay
    console.log('[Test] Skipping text overlay...');
    await page.waitForSelector('.ytgif-text-overlay-screen', { timeout: 10000 });
    await page.click('button:has-text("Skip This Step")');
    console.log('[Test] Text overlay skipped');

    // Wait for processing screen
    console.log('[Test] Processing GIF with duplicate frames...');
    console.log('[Test] Expected: 72 frames (15 fps × 4.8s)');
    console.log('[Test] Challenge: ~15 consecutive duplicate frames');

    // Wait for success or error
    const result = await Promise.race([
      page.waitForSelector('.ytgif-success-screen', { timeout: 120000 }).then(() => 'success'),
      page.waitForSelector('.ytgif-wizard-title:has-text("Failed")', { timeout: 120000 }).then(() => 'error')
    ]);

    if (result === 'success') {
      console.log('[Test] ✅ GIF created successfully!');
      console.log('[Test] ✅ Fix verified: Duplicate frames handled correctly');

      // Verify GIF is present
      const gifUrl = await page.evaluate(() => {
        const img = document.querySelector('.ytgif-success-gif') as HTMLImageElement;
        return img?.src || null;
      });

      expect(gifUrl).toBeTruthy();
      expect(gifUrl).toMatch(/^(data:image\/gif|blob:)/);
      console.log('[Test] GIF URL validated');
    } else {
      throw new Error('GIF creation failed - duplicate frames not handled correctly');
    }

    // Keep wizard open for a moment for video recording
    await page.waitForTimeout(2000);
  });
});
