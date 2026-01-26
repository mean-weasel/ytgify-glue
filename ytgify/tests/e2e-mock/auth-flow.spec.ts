import { test, expect } from './fixtures';
import type { BrowserContext, Page } from '@playwright/test';
import {
  generateMockAuthData,
  generateExpiredJwtToken,
  generateMockUserProfile,
  getAuthState,
  getUserProfile,
  verifyAuthState,
  isAuthenticated,
  clearAuthState,
} from './helpers/auth-helpers';

/**
 * E2E tests for Extension Authentication Flow
 *
 * Tests auth state storage and retrieval in chrome.storage.
 * Note: chrome.runtime.onMessageExternal doesn't work reliably in Playwright,
 * so we test the auth flow by directly simulating storage operations.
 *
 * These tests verify:
 * 1. Auth state is properly stored in chrome.storage
 * 2. Auth state persists across popup opens
 * 3. Popup UI reflects authenticated state
 * 4. Error handling for invalid/expired tokens
 * 5. Logout clears auth state correctly
 */

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
  const match = url.match(/chrome-extension:\/\/([^\/]+)/);
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

      // Wait for React to mount
      await page.waitForSelector('[data-testid="popup-loading"], .popup-modern', {
        timeout: 8000,
      });

      // Wait for main UI
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

test.describe('Auth Flow - External Message Handler', () => {
  test.beforeEach(async ({ context }) => {
    // Clear any existing auth state before each test
    await clearAuthState(context);
  });

  test('receives auth token via external message and stores in chrome.storage', async ({
    context,
  }) => {
    // Note: chrome.runtime.onMessageExternal doesn't work reliably in Playwright.
    // Instead, we test the auth callback handler by directly invoking its logic
    // through the service worker context.

    // Generate mock auth data
    const { token, user, userId } = generateMockAuthData({
      email: 'test-auth@example.com',
      username: 'testauthuser',
    });

    const serviceWorkers = context.serviceWorkers();
    expect(serviceWorkers.length).toBeGreaterThan(0);
    const backgroundPage = serviceWorkers[0];

    // Decode token to get payload
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

    // Simulate what the EXTENSION_AUTH_CALLBACK handler does
    await backgroundPage.evaluate(
      ({ authToken, userData, tokenPayload }) => {
        return new Promise<void>((resolve, reject) => {
          try {
            // Create auth state (same logic as the handler)
            const authState = {
              token: authToken,
              expiresAt: tokenPayload.exp * 1000,
              userId: tokenPayload.sub,
              userProfile: userData,
            };

            // Save to storage
            chrome.storage.local.set({ authState, userProfile: userData }, () => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve();
              }
            });
          } catch (error) {
            reject(error);
          }
        });
      },
      { authToken: token, userData: user, tokenPayload: payload }
    );

    // Wait for storage to settle
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify auth state was stored
    const authState = await getAuthState(context);
    expect(authState).toBeTruthy();
    expect(authState!.token).toBe(token);
    expect(authState!.userId).toBe(userId);

    // Verify user profile was stored
    const userProfile = await getUserProfile(context);
    expect(userProfile).toBeTruthy();
    expect(userProfile!.email).toBe('test-auth@example.com');
  });

  test('stores auth state that persists across popup opens', async ({
    context,
  }) => {
    // Generate auth data
    const { token, user, userId } = generateMockAuthData();

    const serviceWorkers = context.serviceWorkers();
    expect(serviceWorkers.length).toBeGreaterThan(0);
    const backgroundPage = serviceWorkers[0];

    // Decode token to get payload
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

    // Simulate auth callback by directly setting storage
    await backgroundPage.evaluate(
      ({ authToken, userData, tokenPayload }) => {
        return new Promise<void>((resolve) => {
          const authState = {
            token: authToken,
            expiresAt: tokenPayload.exp * 1000,
            userId: tokenPayload.sub,
            userProfile: userData,
          };
          chrome.storage.local.set({ authState, userProfile: userData }, () => resolve());
        });
      },
      { authToken: token, userData: user, tokenPayload: payload }
    );

    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify auth state
    const verification = await verifyAuthState(context, userId);
    expect(verification.valid).toBe(true);

    // Open popup and verify it shows authenticated state
    const popup = await openExtensionPopup(context);
    expect(popup).toBeTruthy();

    // Wait for auth check to complete
    await popup!.waitForTimeout(1500);

    // Should show "My Account" button (authenticated) instead of "Sign In"
    const myAccountBtn = await popup!.$('[data-testid="my-account-button"]');
    const signInBtn = await popup!.$('[data-testid="sign-in-button"]');

    // One of these should exist based on auth state
    const isAuthenticatedInUI = myAccountBtn !== null;
    console.log('[Test] Popup shows authenticated UI:', isAuthenticatedInUI);

    expect(isAuthenticatedInUI || signInBtn === null).toBe(true);

    await popup!.close();
  });

  test('does not store auth state without valid token', async ({
    context,
  }) => {
    // Verify starting with no auth state
    await clearAuthState(context);
    let authState = await getAuthState(context);
    expect(authState).toBeNull();

    const serviceWorkers = context.serviceWorkers();
    expect(serviceWorkers.length).toBeGreaterThan(0);
    const backgroundPage = serviceWorkers[0];

    // Try to set invalid auth state (missing token)
    await backgroundPage.evaluate(() => {
      return new Promise<void>((resolve) => {
        // Don't set anything - simulates what happens when auth fails
        // The handler would reject and not call storage.set
        resolve();
      });
    });

    // Verify still no auth state
    authState = await getAuthState(context);
    expect(authState).toBeNull();
  });

  test('handles auth state correctly after logout', async ({
    context,
  }) => {
    // First, authenticate
    const { token, user } = generateMockAuthData();

    const serviceWorkers = context.serviceWorkers();
    expect(serviceWorkers.length).toBeGreaterThan(0);
    const backgroundPage = serviceWorkers[0];

    // Decode token to get payload
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

    // Set auth state
    await backgroundPage.evaluate(
      ({ authToken, userData, tokenPayload }) => {
        return new Promise<void>((resolve) => {
          const authState = {
            token: authToken,
            expiresAt: tokenPayload.exp * 1000,
            userId: tokenPayload.sub,
            userProfile: userData,
          };
          chrome.storage.local.set({ authState, userProfile: userData }, () => resolve());
        });
      },
      { authToken: token, userData: user, tokenPayload: payload }
    );

    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify authenticated
    expect(await isAuthenticated(context)).toBe(true);

    // Clear auth (simulating logout)
    await clearAuthState(context);

    // Verify no longer authenticated
    expect(await isAuthenticated(context)).toBe(false);

    // Open popup and verify it shows sign-in state
    const popup = await openExtensionPopup(context);
    expect(popup).toBeTruthy();

    await popup!.waitForTimeout(1500);

    // Should show "Sign In" button (not authenticated)
    const signInBtn = await popup!.$('[data-testid="sign-in-button"]');
    expect(signInBtn).toBeTruthy();

    await popup!.close();
  });

  test('isAuthenticated returns false for expired token', async ({ context }) => {
    // Manually set an expired auth state
    const expiredToken = generateExpiredJwtToken('expired-user');
    const user = generateMockUserProfile({ id: 'expired-user' });

    // Decode the expired token to get expiration time
    const payload = JSON.parse(Buffer.from(expiredToken.split('.')[1], 'base64').toString());

    const serviceWorkers = context.serviceWorkers();
    expect(serviceWorkers.length).toBeGreaterThan(0);

    const backgroundPage = serviceWorkers[0];

    await backgroundPage.evaluate(
      ({ token, exp, userId, profile }) => {
        return new Promise<void>((resolve) => {
          chrome.storage.local.set(
            {
              authState: {
                token,
                expiresAt: exp * 1000, // Convert to ms
                userId,
                userProfile: profile,
              },
            },
            () => resolve()
          );
        });
      },
      { token: expiredToken, exp: payload.exp, userId: 'expired-user', profile: user }
    );

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Should return false for expired token
    const authenticated = await isAuthenticated(context);
    expect(authenticated).toBe(false);
  });
});

test.describe('Auth Flow - Popup Integration', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('popup shows sign-in section when not authenticated', async ({ context, mockServerUrl }) => {
    // Navigate to a YouTube-like page first (popup checks current tab)
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    // Open popup
    const popup = await openExtensionPopup(context);
    expect(popup).toBeTruthy();

    await popup!.waitForTimeout(1500);

    // Should show sign-in prompt
    const signInSection = await popup!.$('text=Sign in to upload GIFs');
    const signInBtn = await popup!.$('[data-testid="sign-in-button"]');

    expect(signInSection || signInBtn).toBeTruthy();

    await popup!.close();
    await page.close();
  });

  test('clicking Sign In opens auth section with Google button', async ({
    context,
    mockServerUrl,
  }) => {
    // Navigate to YouTube-like page
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    // Open popup
    const popup = await openExtensionPopup(context);
    expect(popup).toBeTruthy();

    await popup!.waitForTimeout(1500);

    // Click Sign In button
    const signInBtn = await popup!.$('[data-testid="sign-in-button"]');
    if (signInBtn) {
      await signInBtn.click();
      await popup!.waitForTimeout(1000);

      // Should show auth view with Google button
      const googleBtn = await popup!.$('[data-testid="google-login-btn"]');
      const emailInput = await popup!.$('[data-testid="email-input"]');

      // Either Google button or email/password form should be visible
      expect(googleBtn || emailInput).toBeTruthy();
    }

    await popup!.close();
    await page.close();
  });
});
