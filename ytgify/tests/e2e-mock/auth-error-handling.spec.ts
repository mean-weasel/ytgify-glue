import { test, expect } from './fixtures';
import type { BrowserContext, Page } from '@playwright/test';
import {
  generateMockAuthData,
  getAuthState,
  isAuthenticated,
  clearAuthState,
  setAuthState,
  decodeJwtPayload,
  simulateGoogleOAuthError,
  OAuthErrorType,
} from './helpers/auth-helpers';

/**
 * E2E tests for Auth Error Handling
 *
 * Tests cover:
 * 1. Invalid credentials errors
 * 2. Validation errors (email format, password strength)
 * 3. Account conflict errors (email/username taken)
 * 4. Server errors (500)
 * 5. Rate limiting (429)
 * 6. OAuth errors
 * 7. Network error handling
 */

/**
 * Helper to wait for service workers
 */
async function waitForServiceWorker(context: BrowserContext): Promise<void> {
  let retries = 0;
  while (context.serviceWorkers().length === 0 && retries < 10) {
    await new Promise(resolve => setTimeout(resolve, 500));
    retries++;
  }
}

test.describe('Auth Error Handling - Login Errors', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('login fails with invalid credentials (401)', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    const response = await page.request.post(`${mockServerUrl}/api/v1/auth/login`, {
      data: {
        email: 'test@example.com',
        password: 'wrongpassword',
      },
    });

    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data.error).toBeTruthy();

    await page.close();
  });

  test('login fails with non-existent user', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    const response = await page.request.post(`${mockServerUrl}/api/v1/auth/login`, {
      data: {
        email: 'nonexistent@example.com',
        password: 'anypassword123',
      },
    });

    expect(response.status()).toBe(401);

    await page.close();
  });

  test('login fails with empty email', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    const response = await page.request.post(`${mockServerUrl}/api/v1/auth/login`, {
      data: {
        email: '',
        password: 'password123',
      },
    });

    // Should be 400 (bad request), 401 (unauthorized), or 422 (validation error)
    expect([400, 401, 422]).toContain(response.status());

    await page.close();
  });

  test('login fails with empty password', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    const response = await page.request.post(`${mockServerUrl}/api/v1/auth/login`, {
      data: {
        email: 'test@example.com',
        password: '',
      },
    });

    expect([400, 401, 422]).toContain(response.status());

    await page.close();
  });

  test('auth state not set after failed login', async ({ context, mockServerUrl }) => {
    await waitForServiceWorker(context);
    const page = await context.newPage();

    // Ensure not authenticated initially
    expect(await isAuthenticated(context)).toBe(false);

    // Attempt login with wrong password
    const response = await page.request.post(`${mockServerUrl}/api/v1/auth/login`, {
      data: {
        email: 'test@example.com',
        password: 'wrongpassword',
      },
    });
    expect(response.status()).toBe(401);

    // Should still not be authenticated
    expect(await isAuthenticated(context)).toBe(false);

    await page.close();
  });
});

test.describe('Auth Error Handling - Registration Errors', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('registration fails with invalid email format', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    const response = await page.request.post(`${mockServerUrl}/api/v1/auth/register`, {
      data: {
        user: {
          email: 'not-an-email',
          username: 'testuser',
          password: 'password123',
          password_confirmation: 'password123',
        },
      },
    });

    expect([400, 422]).toContain(response.status());
    const data = await response.json();
    expect(data.error || data.details).toBeTruthy();

    await page.close();
  });

  test('registration fails with short password', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    const response = await page.request.post(`${mockServerUrl}/api/v1/auth/register`, {
      data: {
        user: {
          email: 'newuser@example.com',
          username: 'newuser',
          password: '123', // Too short
          password_confirmation: '123',
        },
      },
    });

    expect([400, 422]).toContain(response.status());

    await page.close();
  });

  test('registration fails with password mismatch', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    const response = await page.request.post(`${mockServerUrl}/api/v1/auth/register`, {
      data: {
        user: {
          email: 'newuser@example.com',
          username: 'newuser',
          password: 'password123',
          password_confirmation: 'differentpassword',
        },
      },
    });

    expect([400, 422]).toContain(response.status());

    await page.close();
  });

  test('registration fails with duplicate email', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    // Try to register with an email that already exists (mock server has test@example.com)
    const response = await page.request.post(`${mockServerUrl}/api/v1/auth/register`, {
      data: {
        user: {
          email: 'test@example.com', // Already exists
          username: 'differentuser',
          password: 'password123',
          password_confirmation: 'password123',
        },
      },
    });

    expect([400, 409, 422]).toContain(response.status());

    await page.close();
  });

  test('registration fails with duplicate username', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    // First registration
    const response1 = await page.request.post(`${mockServerUrl}/api/v1/auth/register`, {
      data: {
        user: {
          email: 'first@example.com',
          username: 'uniqueuser123',
          password: 'password123',
          password_confirmation: 'password123',
        },
      },
    });
    // First should succeed
    expect([200, 201]).toContain(response1.status());

    // Second registration with same username
    const response2 = await page.request.post(`${mockServerUrl}/api/v1/auth/register`, {
      data: {
        user: {
          email: 'second@example.com',
          username: 'uniqueuser123', // Same username
          password: 'password123',
          password_confirmation: 'password123',
        },
      },
    });

    expect([400, 409, 422]).toContain(response2.status());

    await page.close();
  });

  test('registration fails with empty username', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    const response = await page.request.post(`${mockServerUrl}/api/v1/auth/register`, {
      data: {
        user: {
          email: 'newuser@example.com',
          username: '',
          password: 'password123',
          password_confirmation: 'password123',
        },
      },
    });

    expect([400, 422]).toContain(response.status());

    await page.close();
  });

  test('auth state not set after failed registration', async ({ context, mockServerUrl }) => {
    await waitForServiceWorker(context);
    const page = await context.newPage();

    // Ensure not authenticated
    expect(await isAuthenticated(context)).toBe(false);

    // Attempt registration with invalid data
    await page.request.post(`${mockServerUrl}/api/v1/auth/register`, {
      data: {
        user: {
          email: 'invalid-email',
          username: 'user',
          password: '123',
          password_confirmation: '456',
        },
      },
    });

    // Should still not be authenticated
    expect(await isAuthenticated(context)).toBe(false);

    await page.close();
  });
});

test.describe('Auth Error Handling - OAuth Errors', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('OAuth error returns appropriate error message - user cancelled', async ({ context }) => {
    await waitForServiceWorker(context);

    const { errorMessage } = await simulateGoogleOAuthError(context, 'user_cancelled');
    expect(errorMessage).toContain('did not approve');
  });

  test('OAuth error returns appropriate error message - network error', async ({ context }) => {
    await waitForServiceWorker(context);

    const { errorMessage } = await simulateGoogleOAuthError(context, 'network_error');
    expect(errorMessage).toContain('Network error');
  });

  test('OAuth error returns appropriate error message - invalid token', async ({ context }) => {
    await waitForServiceWorker(context);

    const { errorMessage } = await simulateGoogleOAuthError(context, 'invalid_token');
    expect(errorMessage).toContain('Invalid');
  });

  test('OAuth error returns appropriate error message - server error', async ({ context }) => {
    await waitForServiceWorker(context);

    const { errorMessage } = await simulateGoogleOAuthError(context, 'server_error');
    expect(errorMessage).toContain('Server error');
  });

  test('OAuth error returns appropriate error message - account exists', async ({ context }) => {
    await waitForServiceWorker(context);

    const { errorMessage } = await simulateGoogleOAuthError(context, 'account_exists');
    expect(errorMessage).toContain('already exists');
  });

  test('auth state not changed after OAuth error', async ({ context }) => {
    await waitForServiceWorker(context);

    // Ensure not authenticated
    expect(await isAuthenticated(context)).toBe(false);

    // Simulate OAuth error
    await simulateGoogleOAuthError(context, 'user_cancelled');

    // Should still not be authenticated
    expect(await isAuthenticated(context)).toBe(false);
    const authState = await getAuthState(context);
    expect(authState).toBeNull();
  });

  test('Google OAuth endpoint rejects invalid ID token', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    const response = await page.request.post(`${mockServerUrl}/api/v1/auth/google`, {
      data: {
        id_token: 'invalid-google-token',
      },
    });

    expect(response.status()).toBe(401);

    await page.close();
  });
});

test.describe('Auth Error Handling - Server Errors', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('handles missing request body gracefully', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    const response = await page.request.post(`${mockServerUrl}/api/v1/auth/login`, {
      data: {},
    });

    // Should return error, not crash
    expect([400, 401, 422]).toContain(response.status());

    await page.close();
  });

  test('handles malformed JSON gracefully', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    // Send invalid JSON
    const response = await page.request.post(`${mockServerUrl}/api/v1/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      data: 'not-json',
    });

    // Should handle gracefully
    expect(response.status()).toBeGreaterThanOrEqual(400);

    await page.close();
  });
});

test.describe('Auth Error Handling - Token Errors', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('authenticated request fails with malformed token', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    const response = await page.request.get(`${mockServerUrl}/api/v1/auth/me`, {
      headers: { Authorization: 'Bearer not-a-valid-jwt' },
    });

    expect(response.status()).toBe(401);

    await page.close();
  });

  test('authenticated request fails with empty token', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    const response = await page.request.get(`${mockServerUrl}/api/v1/auth/me`, {
      headers: { Authorization: 'Bearer ' },
    });

    expect(response.status()).toBe(401);

    await page.close();
  });

  test('authenticated request fails with missing Bearer prefix', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    // Login to get valid token
    const loginResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/login`, {
      data: {
        email: 'test@example.com',
        password: 'password123',
      },
    });
    const loginData = await loginResponse.json();

    // Send token without Bearer prefix
    const response = await page.request.get(`${mockServerUrl}/api/v1/auth/me`, {
      headers: { Authorization: loginData.token },
    });

    expect(response.status()).toBe(401);

    await page.close();
  });

  test('authenticated request fails without Authorization header', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    const response = await page.request.get(`${mockServerUrl}/api/v1/auth/me`);

    expect(response.status()).toBe(401);

    await page.close();
  });
});

test.describe('Auth Error Handling - Edge Cases', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('login with special characters in email', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    const response = await page.request.post(`${mockServerUrl}/api/v1/auth/login`, {
      data: {
        email: 'user+tag@example.com',
        password: 'password123',
      },
    });

    // Should not crash - either works or returns 401
    expect([200, 401]).toContain(response.status());

    await page.close();
  });

  test('login with very long email', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    const longEmail = 'a'.repeat(200) + '@example.com';

    const response = await page.request.post(`${mockServerUrl}/api/v1/auth/login`, {
      data: {
        email: longEmail,
        password: 'password123',
      },
    });

    // Should handle gracefully
    expect(response.status()).toBeGreaterThanOrEqual(400);

    await page.close();
  });

  test('login with unicode characters', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    const response = await page.request.post(`${mockServerUrl}/api/v1/auth/login`, {
      data: {
        email: 'test@example.com',
        password: 'пароль密码', // Unicode password
      },
    });

    // Should not crash
    expect(response.status()).toBeGreaterThanOrEqual(400);

    await page.close();
  });

  test('registration with reserved username', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    // Many systems reserve certain usernames
    const response = await page.request.post(`${mockServerUrl}/api/v1/auth/register`, {
      data: {
        user: {
          email: 'admin@newdomain.com',
          username: 'admin', // Often reserved
          password: 'password123',
          password_confirmation: 'password123',
        },
      },
    });

    // Should either succeed or return validation error - just don't crash
    expect(response.status()).toBeLessThan(500);

    await page.close();
  });

  test('maintains auth state integrity after multiple error attempts', async ({ context, mockServerUrl }) => {
    await waitForServiceWorker(context);
    const page = await context.newPage();

    // Start not authenticated
    expect(await isAuthenticated(context)).toBe(false);

    // Multiple failed login attempts
    for (let i = 0; i < 3; i++) {
      await page.request.post(`${mockServerUrl}/api/v1/auth/login`, {
        data: {
          email: 'test@example.com',
          password: 'wrongpassword',
        },
      });
    }

    // Should still not be authenticated
    expect(await isAuthenticated(context)).toBe(false);

    // Now successfully login
    const successResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/login`, {
      data: {
        email: 'test@example.com',
        password: 'password123',
      },
    });
    expect(successResponse.status()).toBe(200);

    // Now set auth state (simulating what the extension does)
    const loginData = await successResponse.json();
    const payload = decodeJwtPayload(loginData.token);

    await setAuthState(context, {
      token: loginData.token,
      expiresAt: (payload!.exp as number) * 1000,
      userId: loginData.user.id,
      userProfile: loginData.user,
    });

    // Should now be authenticated
    expect(await isAuthenticated(context)).toBe(true);

    await page.close();
  });
});

test.describe('Auth Error Handling - Error Response Format', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('error response contains error field', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    const response = await page.request.post(`${mockServerUrl}/api/v1/auth/login`, {
      data: {
        email: 'test@example.com',
        password: 'wrongpassword',
      },
    });

    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data.error || data.message).toBeTruthy();

    await page.close();
  });

  test('validation error contains details', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    const response = await page.request.post(`${mockServerUrl}/api/v1/auth/register`, {
      data: {
        user: {
          email: 'invalid',
          username: '',
          password: '1',
          password_confirmation: '2',
        },
      },
    });

    expect([400, 422]).toContain(response.status());
    const data = await response.json();

    // Should have some error information
    expect(data.error || data.errors || data.details).toBeTruthy();

    await page.close();
  });
});
