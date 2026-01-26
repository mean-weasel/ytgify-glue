import { test, expect } from './fixtures';
import type { BrowserContext, Page } from '@playwright/test';
import {
  generateMockAuthData,
  getAuthState,
  isAuthenticated,
  clearAuthState,
  setAuthState,
  decodeJwtPayload,
} from './helpers/auth-helpers';

/**
 * E2E tests for Popup Auth UI
 *
 * Tests cover:
 * 1. Main popup UI elements
 * 2. Sign-in button and auth form navigation
 * 3. Authenticated state with My Account button
 * 4. Form input interactions
 * 5. Profile display
 *
 * Note: The popup has a two-step flow:
 * - Main view shows "Sign In" button (unauthenticated) or "My Account" button (authenticated)
 * - Clicking these buttons shows the auth form or profile respectively
 */

/**
 * Helper to wait for service workers
 */
async function waitForServiceWorker(context: BrowserContext, maxRetries = 10): Promise<void> {
  let retries = 0;
  while (context.serviceWorkers().length === 0 && retries < maxRetries) {
    await new Promise(resolve => setTimeout(resolve, 500));
    retries++;
  }
  if (context.serviceWorkers().length === 0) {
    throw new Error('No service workers found');
  }
}

/**
 * Helper to open extension popup
 */
async function openExtensionPopup(context: BrowserContext, maxRetries = 3): Promise<Page | null> {
  let serviceWorkers = context.serviceWorkers();
  let swRetries = 0;
  while (serviceWorkers.length === 0 && swRetries < 5) {
    await new Promise(resolve => setTimeout(resolve, 500));
    serviceWorkers = context.serviceWorkers();
    swRetries++;
  }

  if (serviceWorkers.length === 0) {
    console.error('[openExtensionPopup] No service workers found');
    return null;
  }

  const url = serviceWorkers[0].url();
  const match = url.match(/chrome-extension:\/\/([^/]+)/);
  if (!match) {
    console.error('[openExtensionPopup] Could not extract extension ID');
    return null;
  }

  const extensionId = match[1];

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const page = await context.newPage();

    try {
      await page.goto(`chrome-extension://${extensionId}/popup.html`, {
        waitUntil: 'networkidle',
        timeout: 15000,
      });

      await page.waitForTimeout(2000);

      // Wait for popup to be ready (main popup-modern class)
      await page.waitForSelector('.popup-modern', {
        timeout: 15000,
      });

      return page;
    } catch (error) {
      if (attempt < maxRetries) {
        console.warn(`[openExtensionPopup] Attempt ${attempt} failed, retrying...`);
        await page.close();
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        await page.close();
        throw error;
      }
    }
  }

  return null;
}

test.describe('Popup UI - Main View (Unauthenticated)', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('shows sign-in button when not authenticated', async ({ context, mockServerUrl }) => {
    // Navigate to YouTube page to ensure extension is loaded
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    // Open popup
    const popup = await openExtensionPopup(context);
    expect(popup).toBeTruthy();

    // Wait for sign-in button
    await popup!.waitForSelector('[data-testid="sign-in-button"]', { timeout: 5000 });

    // Verify sign-in button exists
    const signInBtn = await popup!.$('[data-testid="sign-in-button"]');
    expect(signInBtn).toBeTruthy();

    const buttonText = await signInBtn!.textContent();
    expect(buttonText).toContain('Sign In');

    await popup!.close();
    await page.close();
  });

  test('shows browse trending button', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    const popup = await openExtensionPopup(context);
    expect(popup).toBeTruthy();

    // Wait for trending button
    const trendingBtn = await popup!.$('[data-testid="browse-trending-button"]');
    expect(trendingBtn).toBeTruthy();

    const buttonText = await trendingBtn!.textContent();
    expect(buttonText).toContain('Trending');

    await popup!.close();
    await page.close();
  });

  test('clicking sign-in button shows auth form', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    const popup = await openExtensionPopup(context);
    expect(popup).toBeTruthy();

    // Click sign-in button
    await popup!.click('[data-testid="sign-in-button"]');

    // Wait for auth view to appear
    await popup!.waitForSelector('[data-testid="auth-view"]', { timeout: 5000 });

    // Verify auth form elements
    const emailInput = await popup!.$('[data-testid="email-input"]');
    expect(emailInput).toBeTruthy();

    const passwordInput = await popup!.$('[data-testid="password-input"]');
    expect(passwordInput).toBeTruthy();

    const loginBtn = await popup!.$('[data-testid="login-submit-btn"]');
    expect(loginBtn).toBeTruthy();

    await popup!.close();
    await page.close();
  });
});

test.describe('Popup UI - Auth Form', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('auth form has email and password inputs', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    const popup = await openExtensionPopup(context);
    expect(popup).toBeTruthy();

    // Navigate to auth form
    await popup!.click('[data-testid="sign-in-button"]');
    await popup!.waitForSelector('[data-testid="auth-view"]', { timeout: 5000 });

    // Check email input
    const emailInput = await popup!.$('[data-testid="email-input"]');
    expect(emailInput).toBeTruthy();

    // Check password input
    const passwordInput = await popup!.$('[data-testid="password-input"]');
    expect(passwordInput).toBeTruthy();

    await popup!.close();
    await page.close();
  });

  test('auth form has create account button', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    const popup = await openExtensionPopup(context);
    expect(popup).toBeTruthy();

    // Navigate to auth form
    await popup!.click('[data-testid="sign-in-button"]');
    await popup!.waitForSelector('[data-testid="auth-view"]', { timeout: 5000 });

    // Check for create account button
    const createAccountBtn = await popup!.$('[data-testid="create-account-btn"]');
    expect(createAccountBtn).toBeTruthy();

    const buttonText = await createAccountBtn!.textContent();
    expect(buttonText).toContain('Create Account');

    await popup!.close();
    await page.close();
  });

  test('auth form has forgot password link', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    const popup = await openExtensionPopup(context);
    expect(popup).toBeTruthy();

    // Navigate to auth form
    await popup!.click('[data-testid="sign-in-button"]');
    await popup!.waitForSelector('[data-testid="auth-view"]', { timeout: 5000 });

    // Check for forgot password link
    const forgotPasswordLink = await popup!.$('[data-testid="forgot-password-link"]');
    expect(forgotPasswordLink).toBeTruthy();

    await popup!.close();
    await page.close();
  });

  test('email and password inputs are editable', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    const popup = await openExtensionPopup(context);
    expect(popup).toBeTruthy();

    // Navigate to auth form
    await popup!.click('[data-testid="sign-in-button"]');
    await popup!.waitForSelector('[data-testid="auth-view"]', { timeout: 5000 });

    // Type in email input
    await popup!.fill('[data-testid="email-input"]', 'test@example.com');
    const emailValue = await popup!.inputValue('[data-testid="email-input"]');
    expect(emailValue).toBe('test@example.com');

    // Type in password input
    await popup!.fill('[data-testid="password-input"]', 'testpassword');
    const passwordValue = await popup!.inputValue('[data-testid="password-input"]');
    expect(passwordValue).toBe('testpassword');

    await popup!.close();
    await page.close();
  });

  test('login button is enabled', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    const popup = await openExtensionPopup(context);
    expect(popup).toBeTruthy();

    // Navigate to auth form
    await popup!.click('[data-testid="sign-in-button"]');
    await popup!.waitForSelector('[data-testid="auth-view"]', { timeout: 5000 });

    const loginBtn = await popup!.$('[data-testid="login-submit-btn"]');
    expect(loginBtn).toBeTruthy();

    const isDisabled = await loginBtn!.isDisabled();
    expect(isDisabled).toBe(false);

    await popup!.close();
    await page.close();
  });
});

test.describe('Popup UI - Main View (Authenticated)', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('shows my account button when authenticated', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    // Set up authenticated state
    await waitForServiceWorker(context);
    const { token, user } = generateMockAuthData({
      email: 'popup@example.com',
      username: 'popupuser',
    });

    const payload = decodeJwtPayload(token);
    await setAuthState(context, {
      token,
      expiresAt: (payload!.exp as number) * 1000,
      userId: user.id,
      userProfile: user,
    });

    // Open popup
    const popup = await openExtensionPopup(context);
    expect(popup).toBeTruthy();

    // Wait for my account button
    await popup!.waitForSelector('[data-testid="my-account-button"]', { timeout: 5000 });

    const myAccountBtn = await popup!.$('[data-testid="my-account-button"]');
    expect(myAccountBtn).toBeTruthy();

    const buttonText = await myAccountBtn!.textContent();
    expect(buttonText).toContain('My Account');

    await popup!.close();
    await page.close();
  });

  test('clicking my account button shows profile', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    await waitForServiceWorker(context);
    const { token, user } = generateMockAuthData({
      email: 'profile@example.com',
      username: 'profileuser',
    });

    const payload = decodeJwtPayload(token);
    await setAuthState(context, {
      token,
      expiresAt: (payload!.exp as number) * 1000,
      userId: user.id,
      userProfile: user,
    });

    const popup = await openExtensionPopup(context);
    expect(popup).toBeTruthy();

    // Click my account button
    await popup!.click('[data-testid="my-account-button"]');

    // Wait for profile view
    await popup!.waitForSelector('[data-testid="user-profile"]', { timeout: 5000 });

    // Verify username
    const usernameElement = await popup!.$('[data-testid="username"]');
    expect(usernameElement).toBeTruthy();

    const usernameText = await usernameElement!.textContent();
    expect(usernameText).toBe('profileuser');

    await popup!.close();
    await page.close();
  });
});

test.describe('Popup UI - User Profile', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('shows email in profile', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    await waitForServiceWorker(context);
    const { token, user } = generateMockAuthData({
      email: 'myemail@example.com',
      username: 'emailuser',
    });

    const payload = decodeJwtPayload(token);
    await setAuthState(context, {
      token,
      expiresAt: (payload!.exp as number) * 1000,
      userId: user.id,
      userProfile: user,
    });

    const popup = await openExtensionPopup(context);
    expect(popup).toBeTruthy();

    // Navigate to profile
    await popup!.click('[data-testid="my-account-button"]');
    await popup!.waitForSelector('[data-testid="user-profile"]', { timeout: 5000 });

    // Verify email
    const emailElement = await popup!.$('[data-testid="email"]');
    expect(emailElement).toBeTruthy();

    const emailText = await emailElement!.textContent();
    expect(emailText).toBe('myemail@example.com');

    await popup!.close();
    await page.close();
  });

  test('shows GIFs count in profile', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    await waitForServiceWorker(context);
    const { token, user } = generateMockAuthData({
      email: 'gifcount@example.com',
      username: 'gifuser',
      gifs_count: 42,
    });

    const payload = decodeJwtPayload(token);
    await setAuthState(context, {
      token,
      expiresAt: (payload!.exp as number) * 1000,
      userId: user.id,
      userProfile: user,
    });

    const popup = await openExtensionPopup(context);
    expect(popup).toBeTruthy();

    // Navigate to profile
    await popup!.click('[data-testid="my-account-button"]');
    await popup!.waitForSelector('[data-testid="user-profile"]', { timeout: 5000 });

    // Verify GIFs count
    const gifsCountElement = await popup!.$('[data-testid="gifs-count"]');
    expect(gifsCountElement).toBeTruthy();

    const gifsCountText = await gifsCountElement!.textContent();
    expect(gifsCountText).toBe('42');

    await popup!.close();
    await page.close();
  });

  test('shows logout button in profile', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    await waitForServiceWorker(context);
    const { token, user } = generateMockAuthData({
      email: 'logout@example.com',
      username: 'logoutuser',
    });

    const payload = decodeJwtPayload(token);
    await setAuthState(context, {
      token,
      expiresAt: (payload!.exp as number) * 1000,
      userId: user.id,
      userProfile: user,
    });

    const popup = await openExtensionPopup(context);
    expect(popup).toBeTruthy();

    // Navigate to profile
    await popup!.click('[data-testid="my-account-button"]');
    await popup!.waitForSelector('[data-testid="user-profile"]', { timeout: 5000 });

    // Verify logout button
    const logoutBtn = await popup!.$('[data-testid="logout-btn"]');
    expect(logoutBtn).toBeTruthy();

    const logoutText = await logoutBtn!.textContent();
    expect(logoutText).toContain('Sign Out');

    await popup!.close();
    await page.close();
  });
});

test.describe('Popup UI - State Transitions', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('shows sign-in button after logout', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    // Start authenticated
    await waitForServiceWorker(context);
    const { token, user } = generateMockAuthData();

    const payload = decodeJwtPayload(token);
    await setAuthState(context, {
      token,
      expiresAt: (payload!.exp as number) * 1000,
      userId: user.id,
      userProfile: user,
    });

    // Open popup - should show my account button
    const popup1 = await openExtensionPopup(context);
    expect(popup1).toBeTruthy();
    await popup1!.waitForSelector('[data-testid="my-account-button"]', { timeout: 5000 });
    await popup1!.close();

    // Logout
    await clearAuthState(context);

    // Open popup again - should show sign-in button
    const popup2 = await openExtensionPopup(context);
    expect(popup2).toBeTruthy();
    await popup2!.waitForSelector('[data-testid="sign-in-button"]', { timeout: 5000 });

    const signInBtn = await popup2!.$('[data-testid="sign-in-button"]');
    expect(signInBtn).toBeTruthy();

    await popup2!.close();
    await page.close();
  });

  test('shows my account button after login', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    // Start not authenticated
    expect(await isAuthenticated(context)).toBe(false);

    // Open popup - should show sign-in button
    const popup1 = await openExtensionPopup(context);
    expect(popup1).toBeTruthy();
    await popup1!.waitForSelector('[data-testid="sign-in-button"]', { timeout: 5000 });
    await popup1!.close();

    // Set authenticated
    await waitForServiceWorker(context);
    const { token, user } = generateMockAuthData();

    const payload = decodeJwtPayload(token);
    await setAuthState(context, {
      token,
      expiresAt: (payload!.exp as number) * 1000,
      userId: user.id,
      userProfile: user,
    });

    // Open popup again - should show my account button
    const popup2 = await openExtensionPopup(context);
    expect(popup2).toBeTruthy();
    await popup2!.waitForSelector('[data-testid="my-account-button"]', { timeout: 5000 });

    const myAccountBtn = await popup2!.$('[data-testid="my-account-button"]');
    expect(myAccountBtn).toBeTruthy();

    await popup2!.close();
    await page.close();
  });
});

test.describe('Popup UI - Form Validation', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('email input has correct type', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    const popup = await openExtensionPopup(context);
    expect(popup).toBeTruthy();

    // Navigate to auth form
    await popup!.click('[data-testid="sign-in-button"]');
    await popup!.waitForSelector('[data-testid="auth-view"]', { timeout: 5000 });

    const emailInput = await popup!.$('[data-testid="email-input"]');
    const inputType = await emailInput!.getAttribute('type');
    expect(inputType).toBe('email');

    await popup!.close();
    await page.close();
  });

  test('password input has correct type', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    const popup = await openExtensionPopup(context);
    expect(popup).toBeTruthy();

    // Navigate to auth form
    await popup!.click('[data-testid="sign-in-button"]');
    await popup!.waitForSelector('[data-testid="auth-view"]', { timeout: 5000 });

    const passwordInput = await popup!.$('[data-testid="password-input"]');
    const inputType = await passwordInput!.getAttribute('type');
    expect(inputType).toBe('password');

    await popup!.close();
    await page.close();
  });

  test('inputs have required attribute', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    const popup = await openExtensionPopup(context);
    expect(popup).toBeTruthy();

    // Navigate to auth form
    await popup!.click('[data-testid="sign-in-button"]');
    await popup!.waitForSelector('[data-testid="auth-view"]', { timeout: 5000 });

    const emailInput = await popup!.$('[data-testid="email-input"]');
    const emailRequired = await emailInput!.getAttribute('required');
    expect(emailRequired).not.toBeNull();

    const passwordInput = await popup!.$('[data-testid="password-input"]');
    const passwordRequired = await passwordInput!.getAttribute('required');
    expect(passwordRequired).not.toBeNull();

    await popup!.close();
    await page.close();
  });
});

test.describe('Popup UI - Accessibility', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('form has proper labels', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    const popup = await openExtensionPopup(context);
    expect(popup).toBeTruthy();

    // Navigate to auth form
    await popup!.click('[data-testid="sign-in-button"]');
    await popup!.waitForSelector('[data-testid="auth-view"]', { timeout: 5000 });

    // Check for email label
    const emailLabel = await popup!.$('label[for="email"]');
    expect(emailLabel).toBeTruthy();

    // Check for password label
    const passwordLabel = await popup!.$('label[for="password"]');
    expect(passwordLabel).toBeTruthy();

    await popup!.close();
    await page.close();
  });
});
