import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Success screen (Mock E2E)
 * Adapted for mock tests - uses data URLs/blob URLs instead of file downloads
 */
export class SuccessPage {
  readonly page: Page;
  readonly container: Locator;
  readonly gifPreview: Locator;
  readonly downloadButton: Locator;
  readonly createAnotherButton: Locator;
  readonly feedbackButton: Locator;
  readonly closeButton: Locator;
  readonly sizeDisplay: Locator;
  readonly dimensionsDisplay: Locator;
  // Upload-related locators
  readonly signInButton: Locator;
  readonly uploadButton: Locator;
  readonly viewOnWebsiteButton: Locator;
  readonly retryUploadButton: Locator;
  readonly uploadSubtext: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator('.ytgif-success-screen, .ytgif-success, .success-screen');
    this.gifPreview = page.locator('.ytgif-gif-preview img, .ytgif-success-preview-image, .gif-preview img');
    this.downloadButton = page.locator('button:has-text("Download")');
    this.createAnotherButton = page.locator('button:has-text("Create Another"), button:has-text("New GIF")');
    this.feedbackButton = page.locator('button:has-text("Feedback"), button:has-text("Rate")');
    this.closeButton = page.locator('button:has-text("Close"), button:has-text("Done")');
    this.sizeDisplay = page.locator('.ytgif-size, .file-size');
    this.dimensionsDisplay = page.locator('.ytgif-dimensions, .gif-dimensions');
    // Upload-related locators
    this.signInButton = page.locator('button:has-text("Sign in to Share")');
    this.uploadButton = page.locator('button:has-text("Upload to My Account")');
    this.viewOnWebsiteButton = page.locator('button:has-text("View on YTgify")');
    this.retryUploadButton = page.locator('button:has-text("Retry Upload")');
    this.uploadSubtext = page.locator('.ytgif-connect-button-wrapper .ytgif-connect-subtext').first();
  }

  async waitForScreen(timeout: number = 15000) {
    await this.container.waitFor({ state: 'visible', timeout });
    await this.gifPreview.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Get the GIF URL (data URL or blob URL)
   * For mock tests, we work with URLs instead of file downloads
   */
  async getGifUrl(): Promise<string | null> {
    try {
      const src = await this.gifPreview.getAttribute('src');
      return src;
    } catch {
      return null;
    }
  }

  /**
   * Create another GIF
   */
  async createAnother() {
    await this.createAnotherButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Open feedback dialog
   */
  async openFeedback() {
    try {
      await this.feedbackButton.click();
      await this.page.waitForTimeout(500);
    } catch {
      console.warn('[Mock Test] Feedback button not available');
    }
  }

  /**
   * Close success screen
   */
  async close() {
    try {
      await this.closeButton.click();
      await this.page.waitForTimeout(500);
    } catch {
      console.warn('[Mock Test] Close button not available');
    }
  }

  /**
   * Get file size display text
   */
  async getFileSize(): Promise<string> {
    try {
      const text = await this.sizeDisplay.textContent();
      return text || '';
    } catch {
      return '';
    }
  }

  /**
   * Get dimensions display text
   */
  async getDimensions(): Promise<string> {
    try {
      const text = await this.dimensionsDisplay.textContent();
      return text || '';
    } catch {
      return '';
    }
  }

  /**
   * Parse dimensions from display text
   */
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

  /**
   * Check if GIF preview is displayed
   */
  async isGifDisplayed(): Promise<boolean> {
    try {
      return await this.gifPreview.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Get GIF source attribute
   */
  async getGifSrc(): Promise<string | null> {
    try {
      return await this.gifPreview.getAttribute('src');
    } catch {
      return null;
    }
  }

  /**
   * Validate that a GIF was created successfully
   * Returns true if GIF is displayed and has a valid data URL or blob URL
   */
  async validateGifCreated(): Promise<boolean> {
    // Check if GIF is displayed
    if (!await this.isGifDisplayed()) {
      console.warn('[Mock Test] GIF preview not displayed');
      return false;
    }

    // Check if src is a data URL or blob URL
    const src = await this.getGifSrc();
    if (!src) {
      console.warn('[Mock Test] GIF src is null');
      return false;
    }

    const isValid = src.startsWith('data:image/gif') || src.startsWith('blob:');
    if (!isValid) {
      console.warn(`[Mock Test] GIF src has invalid format: ${src.substring(0, 50)}...`);
    }

    return isValid;
  }

  /**
   * Get comprehensive GIF metadata
   */
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
      url: await this.getGifUrl()
    };
  }

  /**
   * Wait for GIF to be fully loaded and displayed
   */
  async waitForGifReady(timeout: number = 10000) {
    await this.waitForScreen();
    await this.page.waitForFunction(
      () => {
        const img = document.querySelector('.ytgif-gif-preview img, .ytgif-success-preview-image') as HTMLImageElement;
        return img && img.complete && img.naturalWidth > 0;
      },
      { timeout }
    );
  }

  // ========== Upload-related methods ==========

  /**
   * Check if the sign-in button is visible (user not authenticated)
   */
  async isSignInButtonVisible(): Promise<boolean> {
    try {
      return await this.signInButton.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Check if the upload button is visible (user authenticated)
   */
  async isUploadButtonVisible(): Promise<boolean> {
    try {
      return await this.uploadButton.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Check if the "View on YTgify" button is visible (upload successful)
   */
  async isViewOnWebsiteButtonVisible(): Promise<boolean> {
    try {
      return await this.viewOnWebsiteButton.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Check if the retry upload button is visible (upload failed)
   */
  async isRetryUploadButtonVisible(): Promise<boolean> {
    try {
      return await this.retryUploadButton.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Get the upload subtext message
   */
  async getUploadSubtext(): Promise<string> {
    try {
      const text = await this.uploadSubtext.textContent();
      return text || '';
    } catch {
      return '';
    }
  }

  /**
   * Click the sign-in button
   */
  async clickSignIn() {
    await this.signInButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Click the upload button
   */
  async clickUpload() {
    await this.uploadButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Click the view on website button
   */
  async clickViewOnWebsite() {
    await this.viewOnWebsiteButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if upload is in progress (uploading... text visible)
   */
  async isUploading(): Promise<boolean> {
    try {
      const uploadingButton = this.page.locator('button:has-text("Uploading...")');
      return await uploadingButton.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Get the current upload state
   */
  async getUploadState(): Promise<'not-authenticated' | 'ready' | 'uploading' | 'success' | 'error'> {
    if (await this.isSignInButtonVisible()) {
      return 'not-authenticated';
    }
    if (await this.isUploading()) {
      return 'uploading';
    }
    if (await this.isViewOnWebsiteButtonVisible()) {
      return 'success';
    }
    if (await this.isRetryUploadButtonVisible()) {
      return 'error';
    }
    if (await this.isUploadButtonVisible()) {
      return 'ready';
    }
    return 'not-authenticated';
  }
}
