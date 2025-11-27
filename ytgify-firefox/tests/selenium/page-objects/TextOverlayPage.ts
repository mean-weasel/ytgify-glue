import { WebDriver, By } from 'selenium-webdriver';
import {
  waitForElementVisible,
  executeScript,
  clickElement,
  fillInput,
  findElement,
  findElements,
  sleep,
  isElementVisible,
} from '../test-utils';

/**
 * Page Object Model for Text Overlay screen
 */
export class TextOverlayPage {
  constructor(private driver: WebDriver) {}

  async waitForScreen(timeout: number = 10000): Promise<void> {
    await waitForElementVisible(this.driver, '.ytgif-text-overlay-screen', timeout);
  }

  async addTextOverlay(
    text: string,
    position?: 'top' | 'middle' | 'bottom',
    style?: 'meme' | 'subtitle' | 'minimal'
  ): Promise<void> {
    try {
      // Enter text - try multiple selectors
      const inputSelectors = [
        'input[placeholder*="text"]',
        'textarea[placeholder*="text"]',
        '.ytgif-text-input',
      ];

      for (const selector of inputSelectors) {
        try {
          await fillInput(this.driver, selector, text);
          break;
        } catch {
          continue;
        }
      }

      // Select position if specified
      if (position) {
        await this.selectPosition(position);
      }

      // Select style if specified
      if (style) {
        await this.selectStyle(style);
      }

      // Click add button
      const xpath = '//button[contains(text(), "Add")]';
      const element = await this.driver.findElement(By.xpath(xpath));
      await element.click();
      await sleep(this.driver, 300);
    } catch (e) {
      console.warn('[Test] Failed to add text overlay:', (e as Error).message);
    }
  }

  async selectPosition(position: 'top' | 'middle' | 'bottom'): Promise<void> {
    try {
      const selectors = [
        `button[data-position="${position}"]`,
        `//button[contains(text(), "${position.charAt(0).toUpperCase() + position.slice(1)}")]`,
      ];

      for (const selector of selectors) {
        try {
          if (selector.startsWith('//')) {
            const element = await this.driver.findElement(By.xpath(selector));
            await element.click();
          } else {
            await clickElement(this.driver, selector);
          }
          await sleep(this.driver, 200);
          return;
        } catch {
          continue;
        }
      }
    } catch (e) {
      console.warn(`[Test] Failed to select position ${position}`);
    }
  }

  async selectStyle(style: 'meme' | 'subtitle' | 'minimal'): Promise<void> {
    try {
      const selectors = [
        `button[data-style="${style}"]`,
        `//button[contains(text(), "${style.charAt(0).toUpperCase() + style.slice(1)}")]`,
      ];

      for (const selector of selectors) {
        try {
          if (selector.startsWith('//')) {
            const element = await this.driver.findElement(By.xpath(selector));
            await element.click();
          } else {
            await clickElement(this.driver, selector);
          }
          await sleep(this.driver, 200);
          return;
        } catch {
          continue;
        }
      }
    } catch (e) {
      console.warn(`[Test] Failed to select style ${style}`);
    }
  }

  async getOverlayCount(): Promise<number> {
    try {
      const elements = await findElements(this.driver, '.ytgif-overlay-item, .text-overlay-item');
      return elements.length;
    } catch {
      return 0;
    }
  }

  async removeOverlay(index: number): Promise<void> {
    try {
      const items = await findElements(this.driver, '.ytgif-overlay-item, .text-overlay-item');
      if (items[index]) {
        const deleteButtons = await items[index].findElements(
          By.css('button[aria-label*="Delete"], button[aria-label*="Remove"], .delete-button')
        );
        if (deleteButtons.length > 0) {
          await deleteButtons[0].click();
          await sleep(this.driver, 300);
        }
      }
    } catch (e) {
      console.warn(`[Test] Failed to remove overlay at index ${index}`);
    }
  }

  async editOverlay(index: number, newText: string): Promise<void> {
    try {
      const items = await findElements(this.driver, '.ytgif-overlay-item, .text-overlay-item');
      if (items[index]) {
        const editButtons = await items[index].findElements(By.css('button[aria-label*="Edit"], .edit-button'));
        if (editButtons.length > 0) {
          await editButtons[0].click();
          await fillInput(this.driver, 'input[placeholder*="text"], textarea[placeholder*="text"]', newText);

          const xpath = '//button[contains(text(), "Add")]';
          const addButton = await this.driver.findElement(By.xpath(xpath));
          await addButton.click();
          await sleep(this.driver, 300);
        }
      }
    } catch (e) {
      console.warn(`[Test] Failed to edit overlay at index ${index}`);
    }
  }

  async clickSkip(): Promise<void> {
    const xpath = '//button[contains(text(), "Skip")]';
    const element = await this.driver.findElement(By.xpath(xpath));
    await element.click();
    await sleep(this.driver, 500);
  }

  async clickNext(): Promise<void> {
    // Try multiple selectors for next/create button
    const xpaths = [
      '//button[contains(@class, "ytgif-button-primary")]',
      '//button[contains(text(), "Create GIF")]',
      '//button[contains(text(), "Generate")]',
    ];

    for (const xpath of xpaths) {
      try {
        const element = await this.driver.findElement(By.xpath(xpath));
        await element.click();
        await sleep(this.driver, 500);
        return;
      } catch {
        continue;
      }
    }
    throw new Error('Next button not found');
  }

  async clickBack(): Promise<void> {
    const xpath = '//button[contains(@class, "ytgif-back-button") or contains(text(), "Back")]';
    const element = await this.driver.findElement(By.xpath(xpath));
    await element.click();
    await sleep(this.driver, 500);
  }

  async isNextButtonEnabled(): Promise<boolean> {
    try {
      const element = await findElement(this.driver, '.ytgif-button-primary');
      if (!element) return false;
      return element.isEnabled();
    } catch {
      return false;
    }
  }

  async getOverlayTexts(): Promise<string[]> {
    try {
      const items = await findElements(this.driver, '.ytgif-overlay-item, .text-overlay-item');
      const texts: string[] = [];

      for (const item of items) {
        const textElements = await item.findElements(By.css('.overlay-text, .text-content'));
        if (textElements.length > 0) {
          const text = await textElements[0].getText();
          if (text) texts.push(text.trim());
        }
      }

      return texts;
    } catch {
      return [];
    }
  }

  async isPreviewVisible(): Promise<boolean> {
    return isElementVisible(this.driver, '.ytgif-text-preview, .preview-container');
  }
}
