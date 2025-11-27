import { WebDriver, By } from 'selenium-webdriver';
import {
  waitForElementVisible,
  executeScript,
  clickElement,
  getAttribute,
  sleep,
  isElementVisible,
  waitForFunction,
} from '../test-utils';

/**
 * Page Object Model for Success screen
 * Works with both data URLs and blob URLs for GIFs
 */
export class SuccessPage {
  constructor(private driver: WebDriver) {}

  async waitForScreen(timeout: number = 15000): Promise<void> {
    await waitForElementVisible(this.driver, '.ytgif-success-screen, .ytgif-success, .success-screen', timeout);
    await waitForElementVisible(this.driver, '.ytgif-gif-preview img, .ytgif-success-preview-image, .gif-preview img', 10000);
  }

  /**
   * Get the GIF URL (data URL or blob URL)
   * For mock tests, we work with URLs instead of file downloads
   */
  async getGifUrl(): Promise<string | null> {
    try {
      return await getAttribute(
        this.driver,
        '.ytgif-gif-preview img, .ytgif-success-preview-image, .gif-preview img',
        'src'
      );
    } catch {
      return null;
    }
  }

  async createAnother(): Promise<void> {
    const xpath = '//button[contains(text(), "Create Another") or contains(text(), "New GIF")]';
    const element = await this.driver.findElement(By.xpath(xpath));
    await element.click();
    await sleep(this.driver, 500);
  }

  async openFeedback(): Promise<void> {
    try {
      const xpath = '//button[contains(text(), "Feedback") or contains(text(), "Rate")]';
      const element = await this.driver.findElement(By.xpath(xpath));
      await element.click();
      await sleep(this.driver, 500);
    } catch {
      console.warn('[Test] Feedback button not available');
    }
  }

  async close(): Promise<void> {
    try {
      const xpath = '//button[contains(text(), "Close") or contains(text(), "Done")]';
      const element = await this.driver.findElement(By.xpath(xpath));
      await element.click();
      await sleep(this.driver, 500);
    } catch {
      console.warn('[Test] Close button not available');
    }
  }

  async getFileSize(): Promise<string> {
    try {
      return await executeScript<string>(
        this.driver,
        'return document.querySelector(".ytgif-size, .file-size")?.textContent || ""'
      );
    } catch {
      return '';
    }
  }

  async getDimensions(): Promise<string> {
    try {
      return await executeScript<string>(
        this.driver,
        'return document.querySelector(".ytgif-dimensions, .gif-dimensions")?.textContent || ""'
      );
    } catch {
      return '';
    }
  }

  async getParsedDimensions(): Promise<{ width: number; height: number } | null> {
    const text = await this.getDimensions();
    // Parse text like "640x360" or "640 x 360"
    const match = text.match(/(\d+)\s*[xX×]\s*(\d+)/);
    if (match) {
      return {
        width: parseInt(match[1]),
        height: parseInt(match[2]),
      };
    }
    return null;
  }

  async isGifDisplayed(): Promise<boolean> {
    return isElementVisible(this.driver, '.ytgif-gif-preview img, .ytgif-success-preview-image, .gif-preview img');
  }

  async getGifSrc(): Promise<string | null> {
    return this.getGifUrl();
  }

  async validateGifCreated(): Promise<boolean> {
    // Check if GIF is displayed
    if (!(await this.isGifDisplayed())) {
      console.warn('[Test] GIF preview not displayed');
      return false;
    }

    // Check if src is a data URL or blob URL
    const src = await this.getGifSrc();
    if (!src) {
      console.warn('[Test] GIF src is null');
      return false;
    }

    const isValid = src.startsWith('data:image/gif') || src.startsWith('blob:');
    if (!isValid) {
      console.warn(`[Test] GIF src has invalid format: ${src.substring(0, 50)}...`);
    }

    return isValid;
  }

  async getGifMetadata(): Promise<{
    size: string;
    dimensions: string;
    isValid: boolean;
    url: string | null;
  }> {
    return {
      size: await this.getFileSize(),
      dimensions: await this.getDimensions(),
      isValid: await this.validateGifCreated(),
      url: await this.getGifUrl(),
    };
  }

  async waitForGifReady(timeout: number = 10000): Promise<void> {
    await this.waitForScreen();
    await waitForFunction(
      this.driver,
      () => {
        const img = document.querySelector('.ytgif-gif-preview img, .ytgif-success-preview-image') as HTMLImageElement;
        return img && img.complete && img.naturalWidth > 0;
      },
      timeout
    );
  }

  /**
   * Check if Stay Connected button is present
   */
  async hasStayConnectedButton(): Promise<boolean> {
    try {
      const xpath = '//button[contains(text(), "Stay Connected")]';
      const element = await this.driver.findElement(By.xpath(xpath));
      return await element.isDisplayed();
    } catch {
      return false;
    }
  }

  /**
   * Click Stay Connected button
   */
  async clickStayConnected(): Promise<void> {
    const xpath = '//button[contains(text(), "Stay Connected")]';
    const element = await this.driver.findElement(By.xpath(xpath));
    await element.click();
    await sleep(this.driver, 500);
  }

  // Aliases for backward compatibility
  async waitForSuccess(timeout?: number): Promise<void> {
    await this.waitForScreen(timeout);
  }
}
