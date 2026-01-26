import { test, expect } from './fixtures';
import { getMockVideoUrl } from './helpers/mock-videos';
import { YouTubePage, QuickCapturePage, TextOverlayPage, ProcessingPage, SuccessPage } from './page-objects';

/**
 * Success Screen Upload UI Tests
 *
 * Tests the upload functionality UI on the success screen.
 * Note: Actual upload requires backend - these tests verify UI state only.
 */
test.describe('Success Screen Upload UI', () => {
  /**
   * Helper to create a GIF and get to the success screen
   */
  async function createGifAndGetToSuccess(page: any, mockServerUrl: string) {
    const youtube = new YouTubePage(page);
    const quickCapture = new QuickCapturePage(page);
    const textOverlay = new TextOverlayPage(page);
    const processing = new ProcessingPage(page);
    const success = new SuccessPage(page);

    // Navigate and create GIF
    await youtube.navigateToVideo(getMockVideoUrl('veryShort', mockServerUrl));
    await youtube.openGifWizard();
    await quickCapture.waitForScreen();
    await quickCapture.clickNext();
    await textOverlay.waitForScreen();
    await textOverlay.clickSkip();
    await processing.waitForCompletion(60000);
    await success.waitForScreen();

    return success;
  }

  test('Success screen shows sign-in button when not authenticated', async ({ page, mockServerUrl }) => {
    test.setTimeout(90000);

    const success = await createGifAndGetToSuccess(page, mockServerUrl);

    // Verify GIF was created
    const gifUrl = await success.getGifUrl();
    expect(gifUrl).toBeTruthy();

    // Verify upload state - should show sign-in since no auth in mock tests
    const uploadState = await success.getUploadState();
    console.log(`[Upload UI Test] Upload state: ${uploadState}`);

    // In mock tests without auth, should show sign-in button
    expect(uploadState).toBe('not-authenticated');

    // Verify sign-in button is visible
    const signInVisible = await success.isSignInButtonVisible();
    expect(signInVisible).toBe(true);

    // Verify subtext shows appropriate message
    const subtext = await success.getUploadSubtext();
    console.log(`[Upload UI Test] Subtext: ${subtext}`);
    expect(subtext).toContain('Sign in');

    console.log('✅ [Upload UI Test] Sign-in button displayed correctly for unauthenticated user');
  });

  test('Success screen has Discord button for feedback', async ({ page, mockServerUrl }) => {
    test.setTimeout(90000);

    const success = await createGifAndGetToSuccess(page, mockServerUrl);

    // Check for Discord button
    const discordButton = page.locator('button:has-text("Join Discord")');
    const discordVisible = await discordButton.isVisible();
    expect(discordVisible).toBe(true);

    console.log('✅ [Upload UI Test] Discord button is visible on success screen');
  });

  test('Success screen shows download button', async ({ page, mockServerUrl }) => {
    test.setTimeout(90000);

    const success = await createGifAndGetToSuccess(page, mockServerUrl);

    // Verify download button is present
    const downloadButton = success.downloadButton;
    const downloadVisible = await downloadButton.isVisible();
    expect(downloadVisible).toBe(true);

    console.log('✅ [Upload UI Test] Download button is visible on success screen');
  });

  test('Success screen shows back button to create another GIF', async ({ page, mockServerUrl }) => {
    test.setTimeout(90000);

    const success = await createGifAndGetToSuccess(page, mockServerUrl);

    // Check for back button
    const backButton = page.locator('button:has-text("Back")');
    const backVisible = await backButton.isVisible();
    expect(backVisible).toBe(true);

    console.log('✅ [Upload UI Test] Back button is visible on success screen');
  });

  test('Success screen upload UI has correct layout', async ({ page, mockServerUrl }) => {
    test.setTimeout(90000);

    const success = await createGifAndGetToSuccess(page, mockServerUrl);

    // Verify the upload section wrapper exists
    const uploadWrapper = page.locator('.ytgif-connect-button-wrapper').first();
    const wrapperVisible = await uploadWrapper.isVisible();
    expect(wrapperVisible).toBe(true);

    // Verify the bottom actions section exists
    const bottomActions = page.locator('.ytgif-success-bottom-actions');
    const bottomActionsVisible = await bottomActions.isVisible();
    expect(bottomActionsVisible).toBe(true);

    console.log('✅ [Upload UI Test] Upload UI layout is correct');
  });
});
