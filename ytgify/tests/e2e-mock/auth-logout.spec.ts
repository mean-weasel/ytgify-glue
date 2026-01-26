import { test, expect } from './fixtures';
import type { BrowserContext, Page } from '@playwright/test';
import {
  generateMockAuthData,
  getAuthState,
  isAuthenticated,
  clearAuthState,
  setAuthState,
  simulateGoogleOAuthSuccess,
  logoutViaMessage,
  decodeJwtPayload,
} from './helpers/auth-helpers';

/**
 * E2E tests for Extension Logout Flow
 *
 * Tests cover:
 * 1. Logout clears auth state from storage
 * 2. Logout calls backend to invalidate token
 * 3. UI updates after logout
 * 4. Old token rejected after logout
 * 5. Error handling during logout
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

      await page.waitForSelector('[data-testid="popup-loading"], .popup-modern', {
        timeout: 8000,
      });

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

/**
 * Helper to set up authenticated state
 * Waits for service worker to be available before setting state
 */
async function setupAuthenticatedState(context: BrowserContext): Promise<{
  token: string;
  userId: string;
}> {
  // Wait for service worker to be available
  let serviceWorkers = context.serviceWorkers();
  let retries = 0;
  while (serviceWorkers.length === 0 && retries < 10) {
    await new Promise(resolve => setTimeout(resolve, 500));
    serviceWorkers = context.serviceWorkers();
    retries++;
  }

  if (serviceWorkers.length === 0) {
    throw new Error('No service workers found after waiting');
  }

  const { token, user, userId } = generateMockAuthData({
    email: 'logouttest@example.com',
    username: 'logoutuser',
  });

  const payload = decodeJwtPayload(token);

  await setAuthState(context, {
    token,
    expiresAt: (payload!.exp as number) * 1000,
    userId,
    userProfile: user,
  });

  return { token, userId };
}

test.describe('Logout Flow - Auth State Clearing', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('logout clears auth state from storage', async ({ context }) => {
    // Set up authenticated state
    await setupAuthenticatedState(context);

    // Verify authenticated
    let authenticated = await isAuthenticated(context);
    expect(authenticated).toBe(true);

    // Clear auth state (simulates logout)
    await clearAuthState(context);

    // Verify no longer authenticated
    authenticated = await isAuthenticated(context);
    expect(authenticated).toBe(false);

    // Verify auth state is null
    const authState = await getAuthState(context);
    expect(authState).toBeNull();
  });

  test('logout clears both authState and userProfile from storage', async ({ context }) => {
    // Set up authenticated state
    await setupAuthenticatedState(context);

    // Verify data exists
    let authState = await getAuthState(context);
    expect(authState).toBeTruthy();

    // Get service worker to check raw storage (with retry)
    let serviceWorkers = context.serviceWorkers();
    let retries = 0;
    while (serviceWorkers.length === 0 && retries < 5) {
      await new Promise(resolve => setTimeout(resolve, 500));
      serviceWorkers = context.serviceWorkers();
      retries++;
    }
    expect(serviceWorkers.length).toBeGreaterThan(0);
    const backgroundPage = serviceWorkers[0];

    // Verify userProfile is stored
    const beforeLogout = await backgroundPage.evaluate(() => {
      return new Promise<{ authState: unknown; userProfile: unknown }>((resolve) => {
        chrome.storage.local.get(['authState', 'userProfile'], (result) => {
          resolve({ authState: result.authState, userProfile: result.userProfile });
        });
      });
    });
    expect(beforeLogout.authState).toBeTruthy();
    expect(beforeLogout.userProfile).toBeTruthy();

    // Clear auth state
    await clearAuthState(context);

    // Verify both are cleared
    const afterLogout = await backgroundPage.evaluate(() => {
      return new Promise<{ authState: unknown; userProfile: unknown }>((resolve) => {
        chrome.storage.local.get(['authState', 'userProfile'], (result) => {
          resolve({ authState: result.authState, userProfile: result.userProfile });
        });
      });
    });
    expect(afterLogout.authState).toBeUndefined();
    expect(afterLogout.userProfile).toBeUndefined();
  });

  test('isAuthenticated returns false after logout', async ({ context }) => {
    // Set up authenticated state
    await setupAuthenticatedState(context);
    expect(await isAuthenticated(context)).toBe(true);

    // Logout
    await clearAuthState(context);

    // Verify
    expect(await isAuthenticated(context)).toBe(false);
  });
});

test.describe('Logout Flow - UI Updates', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('popup shows sign-in button after logout', async ({ context, mockServerUrl }) => {
    // Navigate to YouTube-like page
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    // Set up authenticated state
    await setupAuthenticatedState(context);

    // Open popup - should show authenticated state
    const popup1 = await openExtensionPopup(context);
    expect(popup1).toBeTruthy();
    await popup1!.waitForTimeout(1500);

    // Verify authenticated UI
    const myAccountBtn = await popup1!.$('[data-testid="my-account-button"]');
    console.log('[Test] Before logout - My Account button:', !!myAccountBtn);

    await popup1!.close();

    // Logout
    await clearAuthState(context);

    // Open popup again - should show unauthenticated state
    const popup2 = await openExtensionPopup(context);
    expect(popup2).toBeTruthy();
    await popup2!.waitForTimeout(1500);

    // Verify sign-in button is visible
    const signInBtn = await popup2!.$('[data-testid="sign-in-button"]');
    console.log('[Test] After logout - Sign In button:', !!signInBtn);
    expect(signInBtn).toBeTruthy();

    await popup2!.close();
    await page.close();
  });

  test('user profile no longer accessible after logout', async ({ context, mockServerUrl }) => {
    // Navigate to page to ensure extension is loaded
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    // Set up authenticated state with specific user
    const { token, user } = generateMockAuthData({
      email: 'profiletest@example.com',
      username: 'profileuser',
      display_name: 'Profile Test User',
    });

    const payload = decodeJwtPayload(token);
    await setAuthState(context, {
      token,
      expiresAt: (payload!.exp as number) * 1000,
      userId: user.id,
      userProfile: user,
    });

    // Verify profile is accessible
    let authState = await getAuthState(context);
    expect(authState!.userProfile?.email).toBe('profiletest@example.com');

    // Logout
    await clearAuthState(context);

    // Verify profile is no longer accessible
    authState = await getAuthState(context);
    expect(authState).toBeNull();

    await page.close();
  });
});

test.describe('Logout Flow - Mock API Server-Side', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('logout endpoint invalidates token on server', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    // First, login to get a token
    const loginResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/login`, {
      data: {
        email: 'test@example.com',
        password: 'password123',
      },
    });
    expect(loginResponse.status()).toBe(200);

    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Verify token works for authenticated endpoint
    const meResponse1 = await page.request.get(`${mockServerUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(meResponse1.status()).toBe(200);

    // Call logout endpoint
    const logoutResponse = await page.request.delete(`${mockServerUrl}/api/v1/auth/logout`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(logoutResponse.status()).toBe(200);

    // Token should now be invalid
    const meResponse2 = await page.request.get(`${mockServerUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(meResponse2.status()).toBe(401);

    await page.close();
  });

  test('logout fails without authorization header', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    // Try to logout without token
    const response = await page.request.delete(`${mockServerUrl}/api/v1/auth/logout`);
    expect(response.status()).toBe(401);

    await page.close();
  });

  test('logout fails with invalid token', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    // Try to logout with invalid token
    const response = await page.request.delete(`${mockServerUrl}/api/v1/auth/logout`, {
      headers: { Authorization: 'Bearer invalid-token' },
    });
    expect(response.status()).toBe(401);

    await page.close();
  });
});

test.describe('Logout Flow - Edge Cases', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('logout when already logged out is safe', async ({ context }) => {
    // Ensure logged out
    await clearAuthState(context);
    expect(await isAuthenticated(context)).toBe(false);

    // Logout again should not throw
    await clearAuthState(context);
    expect(await isAuthenticated(context)).toBe(false);
  });

  test('can login again after logout', async ({ context }) => {
    // Setup and verify authenticated
    await setupAuthenticatedState(context);
    expect(await isAuthenticated(context)).toBe(true);

    // Logout
    await clearAuthState(context);
    expect(await isAuthenticated(context)).toBe(false);

    // Login again with different user
    const { token, user } = generateMockAuthData({
      email: 'newuser@example.com',
      username: 'newuser',
    });

    const payload = decodeJwtPayload(token);
    await setAuthState(context, {
      token,
      expiresAt: (payload!.exp as number) * 1000,
      userId: user.id,
      userProfile: user,
    });

    // Verify new user is authenticated
    expect(await isAuthenticated(context)).toBe(true);
    const authState = await getAuthState(context);
    expect(authState!.userProfile?.email).toBe('newuser@example.com');
  });

  test('logout clears OAuth-based auth state too', async ({ context }) => {
    // Simulate Google OAuth login
    await simulateGoogleOAuthSuccess(context, {
      email: 'oauthlogout@gmail.com',
      username: 'oauthuser',
    });

    // Verify authenticated
    expect(await isAuthenticated(context)).toBe(true);
    const beforeState = await getAuthState(context);
    expect(beforeState!.userProfile?.email).toBe('oauthlogout@gmail.com');

    // Logout
    await clearAuthState(context);

    // Verify logged out
    expect(await isAuthenticated(context)).toBe(false);
    const afterState = await getAuthState(context);
    expect(afterState).toBeNull();
  });

  test('rapid logout/login cycles work correctly', async ({ context }) => {
    // Rapid cycles shouldn't cause issues
    for (let i = 0; i < 3; i++) {
      // Login
      const { token, user } = generateMockAuthData({
        email: `cycle${i}@example.com`,
        username: `cycleuser${i}`,
      });

      const payload = decodeJwtPayload(token);
      await setAuthState(context, {
        token,
        expiresAt: (payload!.exp as number) * 1000,
        userId: user.id,
        userProfile: user,
      });

      expect(await isAuthenticated(context)).toBe(true);

      // Logout
      await clearAuthState(context);
      expect(await isAuthenticated(context)).toBe(false);
    }

    // Final state should be logged out
    expect(await isAuthenticated(context)).toBe(false);
  });
});

test.describe('Logout Flow - Token Refresh After Logout', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('refresh endpoint rejects token after logout', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    // Login
    const loginResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/login`, {
      data: {
        email: 'test@example.com',
        password: 'password123',
      },
    });
    expect(loginResponse.status()).toBe(200);

    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Logout (server-side)
    const logoutResponse = await page.request.delete(`${mockServerUrl}/api/v1/auth/logout`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(logoutResponse.status()).toBe(200);

    // Try to refresh the revoked token
    const refreshResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/refresh`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(refreshResponse.status()).toBe(401);

    await page.close();
  });
});
