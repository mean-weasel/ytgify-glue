import { WebDriver, By, until } from 'selenium-webdriver';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Helper functions for Firefox extension testing (Selenium version)
 */

/**
 * Get the extension ID from manifest
 * For Firefox, this is defined in manifest.json browser_specific_settings
 */
export function getExtensionId(): string {
  return 'ytgify@firefox.extension';
}

/**
 * Wait for extension to be fully loaded on YouTube page
 */
export async function waitForExtensionReady(driver: WebDriver, timeout: number = 30000): Promise<boolean> {
  try {
    // Wait for the GIF button to be injected
    await driver.wait(async () => {
      const result = await driver.executeScript<boolean>(`
        const button = document.querySelector('.ytgif-button, [aria-label*="GIF"]');
        return button !== null;
      `);
      return result;
    }, timeout);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if extension is properly injected
 */
export async function isExtensionInjected(driver: WebDriver): Promise<boolean> {
  return await driver.executeScript<boolean>(`
    // Check for any extension-specific elements
    const elements = [
      '.ytgif-button',
      '[aria-label*="GIF"]',
      '.ytgif-overlay-wizard',
    ];
    return elements.some(selector => document.querySelector(selector) !== null);
  `);
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(driver: WebDriver, name: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${name}-${timestamp}.png`;
  const filePath = path.join(process.cwd(), 'screenshots', fileName);

  // Ensure directory exists
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const screenshot = await driver.takeScreenshot();
  await fs.writeFile(filePath, screenshot, 'base64');

  return filePath;
}

/**
 * Wait for and dismiss YouTube's cookie consent if present
 */
export async function handleYouTubeCookieConsent(driver: WebDriver): Promise<void> {
  try {
    // Check for cookie consent dialog using XPath
    const xpaths = [
      '//button[contains(text(), "Accept all")]',
      '//button[contains(text(), "Reject all")]',
      '//button[contains(text(), "Accept")]'
    ];

    for (const xpath of xpaths) {
      try {
        const element = await driver.findElement(By.xpath(xpath));
        const isVisible = await element.isDisplayed();
        if (isVisible) {
          await element.click();
          await driver.sleep(1000);
          return;
        }
      } catch {
        // Try next xpath
        continue;
      }
    }
  } catch {
    // No consent dialog, continue
  }
}

/**
 * Validate that a GIF file was created correctly
 */
export async function validateGifFile(filePath: string): Promise<{
  valid: boolean;
  size: number;
  error?: string;
}> {
  try {
    const stats = await fs.stat(filePath);
    const buffer = await fs.readFile(filePath);

    // Check GIF magic number (GIF87a or GIF89a)
    const header = buffer.toString('ascii', 0, 6);
    const isGif = header === 'GIF87a' || header === 'GIF89a';

    if (!isGif) {
      return {
        valid: false,
        size: stats.size,
        error: 'File is not a valid GIF',
      };
    }

    // Check minimum size (at least 100 bytes for a tiny GIF)
    if (stats.size < 100) {
      return {
        valid: false,
        size: stats.size,
        error: 'GIF file is too small',
      };
    }

    return {
      valid: true,
      size: stats.size,
    };
  } catch (error) {
    return {
      valid: false,
      size: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Wait for element with smart polling and exponential backoff
 */
export async function waitForElementSmart(
  driver: WebDriver,
  selector: string,
  options: {
    timeout?: number;
    initialDelay?: number;
    maxRetries?: number;
  } = {}
): Promise<boolean> {
  const { timeout = 30000, initialDelay = 500, maxRetries = 8 } = options;
  const startTime = Date.now();
  let retries = 0;

  while (Date.now() - startTime < timeout && retries < maxRetries) {
    try {
      const element = await driver.findElement(By.css(selector));
      const isVisible = await element.isDisplayed();
      if (isVisible) return true;
    } catch {
      // Continue retrying
    }

    const delay = initialDelay * Math.pow(1.5, retries);
    await driver.sleep(Math.min(delay, 5000));
    retries++;
  }

  return false;
}

/**
 * Wait for condition with polling
 */
export async function waitForCondition(
  driver: WebDriver,
  condition: () => Promise<boolean>,
  options: {
    timeout?: number;
    pollInterval?: number;
  } = {}
): Promise<boolean> {
  const { timeout = 30000, pollInterval = 500 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const result = await condition();
      if (result) return true;
    } catch {
      // Continue polling
    }
    await driver.sleep(pollInterval);
  }

  return false;
}

/**
 * Wait for GIF button with retry logic
 */
export async function waitForGifButton(
  driver: WebDriver,
  timeout: number = 30000
): Promise<boolean> {
  const selectors = [
    '.ytgif-button',
    '[aria-label*="GIF"]',
    '.ytp-right-controls button.ytgif-button'
  ];

  // Try each selector with a portion of the total timeout
  const timePerSelector = Math.max(5000, timeout / selectors.length);

  for (const selector of selectors) {
    const found = await waitForElementSmart(driver, selector, {
      timeout: timePerSelector,
      initialDelay: 300,
      maxRetries: 8
    });
    if (found) return true;
  }

  return false;
}

/**
 * Clean up test artifacts older than specified days
 */
export async function cleanupOldArtifacts(daysOld: number = 7): Promise<void> {
  const dirs = ['screenshots', 'downloads', 'videos'];
  const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

  for (const dir of dirs) {
    const dirPath = path.join(process.cwd(), dir);
    try {
      const files = await fs.readdir(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        if (stats.mtimeMs < cutoffTime) {
          await fs.unlink(filePath);
        }
      }
    } catch {
      // Directory might not exist yet
    }
  }
}

/**
 * Wait for video to be playable
 */
export async function waitForVideoReady(driver: WebDriver): Promise<void> {
  await driver.wait(async () => {
    const result = await driver.executeScript<boolean>(`
      const video = document.querySelector('video');
      return video && video.readyState >= 3; // HAVE_FUTURE_DATA
    `);
    return result;
  }, 30000);
}

/**
 * Get video metadata
 */
export async function getVideoMetadata(driver: WebDriver): Promise<{
  duration: number;
  currentTime: number;
  paused: boolean;
  width: number;
  height: number;
}> {
  return await driver.executeScript<{
    duration: number;
    currentTime: number;
    paused: boolean;
    width: number;
    height: number;
  }>(`
    const video = document.querySelector('video');
    if (!video) {
      throw new Error('Video element not found');
    }
    return {
      duration: video.duration,
      currentTime: video.currentTime,
      paused: video.paused,
      width: video.videoWidth,
      height: video.videoHeight,
    };
  `);
}
