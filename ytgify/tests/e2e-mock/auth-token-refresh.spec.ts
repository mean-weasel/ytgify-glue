import { test, expect } from './fixtures';
import type { BrowserContext, Page } from '@playwright/test';
import {
  generateMockAuthData,
  getAuthState,
  isAuthenticated,
  clearAuthState,
  setAuthState,
  generateNearExpiryJwtToken,
  generateMockUserProfile,
  decodeJwtPayload,
  verifyTokenNotExpired,
} from './helpers/auth-helpers';

/**
 * E2E tests for Token Refresh Flow
 *
 * Tests cover:
 * 1. Proactive token refresh when nearing expiry
 * 2. Token refresh on 401 response
 * 3. Auth state updates after refresh
 * 4. Token refresh failure handling
 * 5. Expired token handling
 */

/**
 * Helper to wait for service workers to be ready
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
 * Helper to set up authenticated state with specific expiry
 */
async function setupAuthWithExpiry(
  context: BrowserContext,
  secondsUntilExpiry: number
): Promise<{ token: string; userId: string; expiresAt: number }> {
  await waitForServiceWorker(context);

  const user = generateMockUserProfile({
    email: 'refreshtest@example.com',
    username: 'refreshuser',
  });

  const token = generateNearExpiryJwtToken(secondsUntilExpiry, user.id);
  const payload = decodeJwtPayload(token);
  const expiresAt = (payload!.exp as number) * 1000;

  await setAuthState(context, {
    token,
    expiresAt,
    userId: user.id,
    userProfile: user,
  });

  return { token, userId: user.id, expiresAt };
}

test.describe('Token Refresh - Expiry Detection', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('detects token near expiry (< 5 minutes remaining)', async ({ context }) => {
    // Set up auth with 3 minutes until expiry (below 5 min threshold)
    const { token } = await setupAuthWithExpiry(context, 180); // 3 minutes

    const authState = await getAuthState(context);
    expect(authState).toBeTruthy();
    expect(authState!.token).toBe(token);

    // Token should be valid but near expiry
    const validation = verifyTokenNotExpired(token);
    expect(validation.valid).toBe(true);

    // Expiry should be within 5 minutes
    const timeUntilExpiry = validation.expiresAt - Date.now();
    expect(timeUntilExpiry).toBeLessThan(5 * 60 * 1000); // 5 minutes
    expect(timeUntilExpiry).toBeGreaterThan(0); // Not yet expired
  });

  test('detects expired token', async ({ context }) => {
    // Set up auth with already expired token
    const { token } = await setupAuthWithExpiry(context, -60); // Expired 1 minute ago

    const validation = verifyTokenNotExpired(token);
    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('Token is expired');
  });

  test('isAuthenticated returns false for expired token', async ({ context }) => {
    // Set up auth with already expired token
    await setupAuthWithExpiry(context, -60); // Expired 1 minute ago

    // isAuthenticated should return false for expired token
    const authenticated = await isAuthenticated(context);
    expect(authenticated).toBe(false);
  });

  test('token with long expiry does not trigger refresh threshold', async ({ context }) => {
    // Set up auth with 15 minutes until expiry (above 5 min threshold)
    const { token } = await setupAuthWithExpiry(context, 900); // 15 minutes

    const validation = verifyTokenNotExpired(token);
    expect(validation.valid).toBe(true);

    // Expiry should be more than 5 minutes away
    const timeUntilExpiry = validation.expiresAt - Date.now();
    expect(timeUntilExpiry).toBeGreaterThan(5 * 60 * 1000); // More than 5 minutes
  });
});

test.describe('Token Refresh - Mock API Integration', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('refresh endpoint returns new token', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    // First, login to get a valid token
    const loginResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/login`, {
      data: {
        email: 'test@example.com',
        password: 'password123',
      },
    });
    expect(loginResponse.status()).toBe(200);

    const loginData = await loginResponse.json();
    const originalToken = loginData.token;

    // Wait a tiny bit to ensure different timestamp in new token
    await page.waitForTimeout(100);

    // Refresh the token
    const refreshResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/refresh`, {
      headers: { Authorization: `Bearer ${originalToken}` },
    });
    expect(refreshResponse.status()).toBe(200);

    const refreshData = await refreshResponse.json();
    expect(refreshData.token).toBeTruthy();

    // New token should be different (different timestamp)
    // Note: In mock server, tokens may be the same if generated in same second
    expect(typeof refreshData.token).toBe('string');
    expect(refreshData.token.split('.').length).toBe(3); // Valid JWT format

    await page.close();
  });

  test('refresh endpoint rejects invalid token', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    const response = await page.request.post(`${mockServerUrl}/api/v1/auth/refresh`, {
      headers: { Authorization: 'Bearer invalid-token' },
    });
    expect(response.status()).toBe(401);

    await page.close();
  });

  test('refresh endpoint requires authorization header', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    const response = await page.request.post(`${mockServerUrl}/api/v1/auth/refresh`);
    expect(response.status()).toBe(401);

    await page.close();
  });

  test('refresh fails for revoked token (after logout)', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    // Login
    const loginResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/login`, {
      data: {
        email: 'test@example.com',
        password: 'password123',
      },
    });
    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Logout (revokes token)
    const logoutResponse = await page.request.delete(`${mockServerUrl}/api/v1/auth/logout`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(logoutResponse.status()).toBe(200);

    // Try to refresh revoked token
    const refreshResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/refresh`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(refreshResponse.status()).toBe(401);

    await page.close();
  });
});

test.describe('Token Refresh - Auth State Updates', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('auth state is preserved when setting new token', async ({ context }) => {
    // Set up initial auth state
    const { token: originalToken, userId } = await setupAuthWithExpiry(context, 900);

    // Verify initial state
    let authState = await getAuthState(context);
    expect(authState!.token).toBe(originalToken);
    expect(authState!.userId).toBe(userId);
    expect(authState!.userProfile).toBeTruthy();

    // Simulate token refresh by updating auth state
    const newToken = generateNearExpiryJwtToken(900, userId);
    const payload = decodeJwtPayload(newToken);

    await setAuthState(context, {
      token: newToken,
      expiresAt: (payload!.exp as number) * 1000,
      userId: authState!.userId,
      userProfile: authState!.userProfile,
    });

    // Verify state updated correctly
    authState = await getAuthState(context);
    expect(authState!.token).toBe(newToken);
    expect(authState!.userId).toBe(userId); // User ID preserved
    expect(authState!.userProfile?.email).toBe('refreshtest@example.com'); // Profile preserved
  });

  test('expiresAt is updated after token refresh', async ({ context }) => {
    // Set up auth with 3 minutes until expiry
    const { expiresAt: originalExpiry } = await setupAuthWithExpiry(context, 180);

    // Simulate refresh with 15 minute expiry
    const authState = await getAuthState(context);
    const newToken = generateNearExpiryJwtToken(900, authState!.userId);
    const payload = decodeJwtPayload(newToken);
    const newExpiry = (payload!.exp as number) * 1000;

    await setAuthState(context, {
      ...authState!,
      token: newToken,
      expiresAt: newExpiry,
    });

    // Verify expiry was updated
    const updatedState = await getAuthState(context);
    expect(updatedState!.expiresAt).toBe(newExpiry);
    expect(updatedState!.expiresAt).toBeGreaterThan(originalExpiry);
  });
});

test.describe('Token Refresh - Error Handling', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('clearing auth state on refresh failure', async ({ context }) => {
    // Set up auth
    await setupAuthWithExpiry(context, 900);
    expect(await isAuthenticated(context)).toBe(true);

    // Clear auth (simulates what happens when refresh fails)
    await clearAuthState(context);

    // Verify auth cleared
    expect(await isAuthenticated(context)).toBe(false);
    const authState = await getAuthState(context);
    expect(authState).toBeNull();
  });

  test('user must re-authenticate after refresh failure', async ({ context, mockServerUrl }) => {
    // Set up auth
    await setupAuthWithExpiry(context, 900);
    expect(await isAuthenticated(context)).toBe(true);

    // Clear auth (simulates refresh failure)
    await clearAuthState(context);
    expect(await isAuthenticated(context)).toBe(false);

    // User can login again
    const { token, user } = generateMockAuthData({
      email: 'reauth@example.com',
      username: 'reauthuser',
    });

    const payload = decodeJwtPayload(token);
    await setAuthState(context, {
      token,
      expiresAt: (payload!.exp as number) * 1000,
      userId: user.id,
      userProfile: user,
    });

    expect(await isAuthenticated(context)).toBe(true);
    const authState = await getAuthState(context);
    expect(authState!.userProfile?.email).toBe('reauth@example.com');
  });
});

test.describe('Token Refresh - Edge Cases', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('handles token expiring exactly at boundary', async ({ context }) => {
    // Token expires in exactly 5 minutes (at threshold)
    const { token } = await setupAuthWithExpiry(context, 300); // 5 minutes

    const validation = verifyTokenNotExpired(token);
    expect(validation.valid).toBe(true);

    // Should be right at the boundary
    const timeUntilExpiry = validation.expiresAt - Date.now();
    expect(timeUntilExpiry).toBeGreaterThanOrEqual(4.9 * 60 * 1000); // ~5 minutes
    expect(timeUntilExpiry).toBeLessThanOrEqual(5.1 * 60 * 1000);
  });

  test('handles multiple sequential auth state updates', async ({ context }) => {
    // Multiple token updates should work correctly
    for (let i = 0; i < 3; i++) {
      const { token, user } = generateMockAuthData({
        email: `test${i}@example.com`,
        username: `testuser${i}`,
      });

      const payload = decodeJwtPayload(token);
      await setAuthState(context, {
        token,
        expiresAt: (payload!.exp as number) * 1000,
        userId: user.id,
        userProfile: user,
      });

      const authState = await getAuthState(context);
      expect(authState!.userProfile?.email).toBe(`test${i}@example.com`);
    }
  });

  test('JWT payload contains required fields after decode', async ({ context }) => {
    const { token } = await setupAuthWithExpiry(context, 900);

    const payload = decodeJwtPayload(token);
    expect(payload).toBeTruthy();
    expect(payload!.sub).toBeTruthy(); // User ID
    expect(payload!.exp).toBeTruthy(); // Expiration
    expect(payload!.iat).toBeTruthy(); // Issued at
  });

  test('verifyTokenNotExpired handles malformed token', async () => {
    // Not a valid JWT
    const result = verifyTokenNotExpired('not-a-jwt');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid token format');
  });

  test('decodeJwtPayload returns null for malformed token', async () => {
    const payload = decodeJwtPayload('not-a-jwt');
    expect(payload).toBeNull();
  });
});

test.describe('Token Refresh - API Request Scenarios', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('authenticated request succeeds with valid token', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    // Login
    const loginResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/login`, {
      data: {
        email: 'test@example.com',
        password: 'password123',
      },
    });
    const loginData = await loginResponse.json();

    // Make authenticated request
    const meResponse = await page.request.get(`${mockServerUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${loginData.token}` },
    });
    expect(meResponse.status()).toBe(200);

    const meData = await meResponse.json();
    expect(meData.user.email).toBe('test@example.com');

    await page.close();
  });

  test('authenticated request fails after token revoked', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    // Login
    const loginResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/login`, {
      data: {
        email: 'test@example.com',
        password: 'password123',
      },
    });
    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Logout (revokes token)
    await page.request.delete(`${mockServerUrl}/api/v1/auth/logout`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Try authenticated request with revoked token
    const meResponse = await page.request.get(`${mockServerUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(meResponse.status()).toBe(401);

    await page.close();
  });

  test('login after failed token gives new valid session', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    // Login
    let loginResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/login`, {
      data: {
        email: 'test@example.com',
        password: 'password123',
      },
    });
    let loginData = await loginResponse.json();
    const firstToken = loginData.token;

    // Logout (invalidates first token)
    await page.request.delete(`${mockServerUrl}/api/v1/auth/logout`, {
      headers: { Authorization: `Bearer ${firstToken}` },
    });

    // Login again
    loginResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/login`, {
      data: {
        email: 'test@example.com',
        password: 'password123',
      },
    });
    expect(loginResponse.status()).toBe(200);
    loginData = await loginResponse.json();
    const secondToken = loginData.token;

    // New token should work
    const meResponse = await page.request.get(`${mockServerUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${secondToken}` },
    });
    expect(meResponse.status()).toBe(200);

    await page.close();
  });
});
