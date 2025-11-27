import { WebDriver } from 'selenium-webdriver';
import {
  waitForElementVisible,
  executeScript,
  clickElement,
  findElement,
  sleep,
  isElementVisible,
  waitForFunction,
} from '../test-utils';

/**
 * Page Object Model for Processing screen
 */
export class ProcessingPage {
  constructor(private driver: WebDriver) {}

  async waitForScreen(timeout: number = 10000): Promise<void> {
    await waitForElementVisible(this.driver, '.ytgif-processing-screen, .ytgif-processing, .processing-screen', timeout);
  }

  async waitForCompletion(timeout: number = 60000): Promise<void> {
    // Wait for processing to complete by checking for either:
    // 1. Processing screen disappears
    // 2. Success screen appears
    // 3. Error screen appears
    await waitForFunction(
      this.driver,
      () => {
        const processing = document.querySelector('.ytgif-processing-screen, .ytgif-processing, .processing-screen');
        const success = document.querySelector('.ytgif-success-screen, .ytgif-success, .success-screen');
        const error = document.querySelector('.ytgif-error-screen, .ytgif-error, .error-screen');

        // Processing complete if success/error appears OR processing disappears
        // IMPORTANT: Must return boolean true, not just truthy value
        return !!(success || error || (processing && !(processing as HTMLElement).offsetParent));
      },
      timeout
    );

    // Small delay to let UI settle
    await sleep(this.driver, 500);
  }

  async getProgress(): Promise<number> {
    try {
      const text = await executeScript<string>(
        this.driver,
        'return document.querySelector(".ytgif-progress-text, .progress-percentage")?.textContent || ""'
      );

      const match = text.match(/(\d+)%/);
      return match ? parseInt(match[1]) : 0;
    } catch {
      return 0;
    }
  }

  async getCurrentStage(): Promise<string> {
    try {
      return await executeScript<string>(
        this.driver,
        'return document.querySelector(".ytgif-stage, .stage-indicator")?.textContent || ""'
      );
    } catch {
      return '';
    }
  }

  async getStatusMessage(): Promise<string> {
    try {
      return await executeScript<string>(
        this.driver,
        'return document.querySelector(".ytgif-status-message, .processing-message")?.textContent || ""'
      );
    } catch {
      return '';
    }
  }

  async isProcessing(): Promise<boolean> {
    return isElementVisible(this.driver, '.ytgif-processing-screen, .ytgif-processing, .processing-screen');
  }

  async cancel(): Promise<void> {
    try {
      const visible = await isElementVisible(this.driver, 'button:has-text("Cancel")');
      if (visible) {
        await clickElement(this.driver, 'button:has-text("Cancel")');
        await sleep(this.driver, 500);
      }
    } catch (e) {
      console.warn('[Test] Cancel button not available');
    }
  }

  async waitForStage(stageName: string, timeout: number = 30000): Promise<void> {
    await waitForFunction(
      this.driver,
      (stage: string) => {
        const stageElement = document.querySelector('.ytgif-stage, .stage-indicator');
        return stageElement?.textContent?.includes(stage);
      },
      timeout
    );
  }

  async monitorProgress(callback: (progress: number, stage: string) => void): Promise<void> {
    let lastProgress = -1;
    let lastStage = '';

    while (await this.isProcessing()) {
      const progress = await this.getProgress();
      const stage = await this.getCurrentStage();

      if (progress !== lastProgress || stage !== lastStage) {
        callback(progress, stage);
        lastProgress = progress;
        lastStage = stage;
      }

      await sleep(this.driver, 500);
    }
  }
}
