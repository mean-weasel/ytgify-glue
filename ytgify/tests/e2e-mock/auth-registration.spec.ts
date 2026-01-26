import { test, expect } from './fixtures';
import type { BrowserContext, Page } from '@playwright/test';
import {
  generateMockAuthData,
  getAuthState,
  isAuthenticated,
  clearAuthState,
  waitForAuthStateChange,
  decodeJwtPayload,
} from './helpers/auth-helpers';

/**
 * E2E tests for Extension Registration and Login Flows
 *
 * Tests cover:
 * 1. Email/password login with valid credentials
 * 2. Email/password login error handling
 * 3. Create Account button behavior
 * 4. Form validation
 * 5. Registration via mock API
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

/**
 * Helper to navigate to auth view from popup
 */
async function navigateToAuthView(popup: Page): Promise<void> {
  await popup.waitForTimeout(1500);

  // Click Sign In button if visible
  const signInBtn = await popup.$('[data-testid="sign-in-button"]');
  if (signInBtn) {
    await signInBtn.click();
    await popup.waitForTimeout(1000);
  }

  // Wait for auth view to be visible
  await popup.waitForSelector('[data-testid="auth-view"]', { timeout: 5000 });
}

test.describe('Auth Registration - Login Form', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('shows login form with email and password inputs', async ({ context, mockServerUrl }) => {
    // Navigate to YouTube-like page
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    // Open popup and navigate to auth view
    const popup = await openExtensionPopup(context);
    expect(popup).toBeTruthy();

    await navigateToAuthView(popup!);

    // Verify form elements
    const emailInput = await popup!.$('[data-testid="email-input"]');
    const passwordInput = await popup!.$('[data-testid="password-input"]');
    const loginBtn = await popup!.$('[data-testid="login-submit-btn"]');
    const forgotPasswordLink = await popup!.$('[data-testid="forgot-password-link"]');
    const createAccountBtn = await popup!.$('[data-testid="create-account-btn"]');

    expect(emailInput).toBeTruthy();
    expect(passwordInput).toBeTruthy();
    expect(loginBtn).toBeTruthy();
    expect(forgotPasswordLink).toBeTruthy();
    expect(createAccountBtn).toBeTruthy();

    await popup!.close();
    await page.close();
  });

  test('login succeeds with valid credentials via mock API', async ({ context, mockServerUrl }) => {
    // Navigate to YouTube-like page
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    // Open popup and navigate to auth view
    const popup = await openExtensionPopup(context);
    expect(popup).toBeTruthy();

    await navigateToAuthView(popup!);

    // Fill in login form with test credentials
    await popup!.fill('[data-testid="email-input"]', 'test@example.com');
    await popup!.fill('[data-testid="password-input"]', 'password123');

    // Get current auth state for comparison
    const previousToken = (await getAuthState(context))?.token || null;

    // Intercept API call to mock server
    await popup!.route('**/api/v1/auth/login', async (route) => {
      const request = route.request();
      const postData = JSON.parse(request.postData() || '{}');

      // Verify request format (API client sends { user: { email, password } })
      expect(postData.user?.email || postData.email).toBe('test@example.com');
      expect(postData.user?.password || postData.password).toBe('password123');

      // Return mock response
      const { token, user } = generateMockAuthData({
        email: 'test@example.com',
        username: 'testuser',
      });

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token, user }),
      });
    });

    // Submit form
    await popup!.click('[data-testid="login-submit-btn"]');

    // Wait for auth state to change
    const { changed, newState } = await waitForAuthStateChange(context, {
      previousToken,
      timeout: 10000,
      expectAuthenticated: true,
    });

    expect(changed).toBe(true);
    expect(newState).toBeTruthy();
    expect(newState!.token).toBeTruthy();
    expect(newState!.userProfile?.email).toBe('test@example.com');

    await popup!.close();
    await page.close();
  });

  test('login shows error with invalid credentials', async ({ context, mockServerUrl }) => {
    // Navigate to YouTube-like page
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    // Open popup and navigate to auth view
    const popup = await openExtensionPopup(context);
    expect(popup).toBeTruthy();

    await navigateToAuthView(popup!);

    // Fill in login form with invalid credentials
    await popup!.fill('[data-testid="email-input"]', 'wrong@example.com');
    await popup!.fill('[data-testid="password-input"]', 'wrongpassword');

    // Intercept API call and return error
    await popup!.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid email or password' }),
      });
    });

    // Submit form
    await popup!.click('[data-testid="login-submit-btn"]');

    // Wait for error message
    await popup!.waitForSelector('[data-testid="error-message"]', { timeout: 5000 });
    const errorMessage = await popup!.textContent('[data-testid="error-message"]');
    expect(errorMessage).toContain('Invalid');

    // Verify not authenticated
    const authenticated = await isAuthenticated(context);
    expect(authenticated).toBe(false);

    await popup!.close();
    await page.close();
  });

  test('login shows error when server returns 500', async ({ context, mockServerUrl }) => {
    // Navigate to YouTube-like page
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    // Open popup and navigate to auth view
    const popup = await openExtensionPopup(context);
    expect(popup).toBeTruthy();

    await navigateToAuthView(popup!);

    // Fill in login form
    await popup!.fill('[data-testid="email-input"]', 'test@example.com');
    await popup!.fill('[data-testid="password-input"]', 'password123');

    // Intercept API call and return server error
    await popup!.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    // Submit form
    await popup!.click('[data-testid="login-submit-btn"]');

    // Wait for error message
    await popup!.waitForSelector('[data-testid="error-message"]', { timeout: 5000 });

    // Verify not authenticated
    const authenticated = await isAuthenticated(context);
    expect(authenticated).toBe(false);

    await popup!.close();
    await page.close();
  });

  test('login button shows loading state while submitting', async ({ context, mockServerUrl }) => {
    // Navigate to YouTube-like page
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    // Open popup and navigate to auth view
    const popup = await openExtensionPopup(context);
    expect(popup).toBeTruthy();

    await navigateToAuthView(popup!);

    // Fill in login form
    await popup!.fill('[data-testid="email-input"]', 'test@example.com');
    await popup!.fill('[data-testid="password-input"]', 'password123');

    // Intercept API call and delay response
    await popup!.route('**/api/v1/auth/login', async (route) => {
      // Delay to observe loading state
      await new Promise(resolve => setTimeout(resolve, 2000));

      const { token, user } = generateMockAuthData({ email: 'test@example.com' });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token, user }),
      });
    });

    // Submit form
    await popup!.click('[data-testid="login-submit-btn"]');

    // Check for loading text
    await popup!.waitForTimeout(500);
    const buttonText = await popup!.textContent('[data-testid="login-submit-btn"]');
    expect(buttonText).toContain('Signing in');

    // Wait for login to complete
    await popup!.waitForTimeout(2500);

    await popup!.close();
    await page.close();
  });

  test('form inputs are disabled while submitting', async ({ context, mockServerUrl }) => {
    // Navigate to YouTube-like page
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    // Open popup and navigate to auth view
    const popup = await openExtensionPopup(context);
    expect(popup).toBeTruthy();

    await navigateToAuthView(popup!);

    // Fill in login form
    await popup!.fill('[data-testid="email-input"]', 'test@example.com');
    await popup!.fill('[data-testid="password-input"]', 'password123');

    // Intercept API call and delay response
    await popup!.route('**/api/v1/auth/login', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const { token, user } = generateMockAuthData({ email: 'test@example.com' });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token, user }),
      });
    });

    // Submit form
    await popup!.click('[data-testid="login-submit-btn"]');
    await popup!.waitForTimeout(500);

    // Check inputs are disabled
    const emailDisabled = await popup!.$eval('[data-testid="email-input"]', el => (el as HTMLInputElement).disabled);
    const passwordDisabled = await popup!.$eval('[data-testid="password-input"]', el => (el as HTMLInputElement).disabled);

    expect(emailDisabled).toBe(true);
    expect(passwordDisabled).toBe(true);

    await popup!.close();
    await page.close();
  });
});

test.describe('Auth Registration - Create Account Flow', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('Create Account button opens web signup page in new tab', async ({ context, mockServerUrl }) => {
    // Navigate to YouTube-like page
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    // Open popup and navigate to auth view
    const popup = await openExtensionPopup(context);
    expect(popup).toBeTruthy();

    await navigateToAuthView(popup!);

    // Listen for new page (tab) creation
    const newPagePromise = context.waitForEvent('page', { timeout: 10000 });

    // Click Create Account button
    await popup!.click('[data-testid="create-account-btn"]');

    // Wait for new tab
    const newPage = await newPagePromise;

    // Verify the URL contains signup path and extension source
    const url = newPage.url();
    expect(url).toContain('/users/sign_up');
    expect(url).toContain('source=extension');

    await newPage.close();
    await popup!.close();
    await page.close();
  });

  test('Forgot Password button opens reset page in new tab', async ({ context, mockServerUrl }) => {
    // Navigate to YouTube-like page
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    // Open popup and navigate to auth view
    const popup = await openExtensionPopup(context);
    expect(popup).toBeTruthy();

    await navigateToAuthView(popup!);

    // Listen for new page (tab) creation
    const newPagePromise = context.waitForEvent('page', { timeout: 10000 });

    // Click Forgot Password link
    await popup!.click('[data-testid="forgot-password-link"]');

    // Wait for new tab
    const newPage = await newPagePromise;

    // Verify the URL contains password reset path
    const url = newPage.url();
    expect(url).toContain('/users/password/new');

    await newPage.close();
    await popup!.close();
    await page.close();
  });
});

test.describe('Auth Registration - Mock API Registration', () => {
  /**
   * These tests verify registration works via the mock API
   * even though the current UI redirects to web for signup.
   * This ensures the API integration is correct for when/if
   * in-popup registration is added.
   */

  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('registration succeeds with valid data via mock API', async ({ context, mockServerUrl }) => {
    // This test calls the mock API directly to verify registration works

    const page = await context.newPage();

    // Make registration request to mock server
    const response = await page.request.post(`${mockServerUrl}/api/v1/auth/register`, {
      data: {
        user: {
          email: 'newuser@example.com',
          username: 'newuser',
          password: 'password123',
          password_confirmation: 'password123',
        },
      },
    });

    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data.token).toBeTruthy();
    expect(data.user).toBeTruthy();
    expect(data.user.email).toBe('newuser@example.com');
    expect(data.user.username).toBe('newuser');

    // Verify token structure
    const payload = decodeJwtPayload(data.token);
    expect(payload).toBeTruthy();
    expect(payload!.sub).toBe(data.user.id);
    expect(payload!.exp).toBeGreaterThan(Date.now() / 1000);

    await page.close();
  });

  test('registration fails with duplicate email', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    // Try to register with existing email
    const response = await page.request.post(`${mockServerUrl}/api/v1/auth/register`, {
      data: {
        user: {
          email: 'test@example.com', // This email already exists in mock server
          username: 'anotheruser',
          password: 'password123',
          password_confirmation: 'password123',
        },
      },
    });

    expect(response.status()).toBe(422);

    const data = await response.json();
    expect(data.error).toContain('Email');

    await page.close();
  });

  test('registration fails with short password', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    // Try to register with short password
    const response = await page.request.post(`${mockServerUrl}/api/v1/auth/register`, {
      data: {
        user: {
          email: 'shortpass@example.com',
          username: 'shortpass',
          password: '123', // Too short
          password_confirmation: '123',
        },
      },
    });

    expect(response.status()).toBe(422);

    const data = await response.json();
    expect(data.error).toContain('Password');

    await page.close();
  });

  test('registration fails with password mismatch', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    // Try to register with mismatched passwords
    const response = await page.request.post(`${mockServerUrl}/api/v1/auth/register`, {
      data: {
        user: {
          email: 'mismatch@example.com',
          username: 'mismatch',
          password: 'password123',
          password_confirmation: 'differentpassword',
        },
      },
    });

    expect(response.status()).toBe(422);

    const data = await response.json();
    expect(data.error).toContain('Password');

    await page.close();
  });

  test('registration fails with missing email', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    // Try to register without email
    const response = await page.request.post(`${mockServerUrl}/api/v1/auth/register`, {
      data: {
        user: {
          username: 'noemail',
          password: 'password123',
          password_confirmation: 'password123',
        },
      },
    });

    expect(response.status()).toBe(422);

    const data = await response.json();
    expect(data.error).toContain('Email');

    await page.close();
  });

  test('registration fails with missing username', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    // Try to register without username
    const response = await page.request.post(`${mockServerUrl}/api/v1/auth/register`, {
      data: {
        user: {
          email: 'nousername@example.com',
          password: 'password123',
          password_confirmation: 'password123',
        },
      },
    });

    expect(response.status()).toBe(422);

    const data = await response.json();
    expect(data.error).toContain('Username');

    await page.close();
  });

  test('login works after registration via mock API', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    // Register new user
    const regResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/register`, {
      data: {
        user: {
          email: 'loginafter@example.com',
          username: 'loginafter',
          password: 'password123',
          password_confirmation: 'password123',
        },
      },
    });

    expect(regResponse.status()).toBe(201);

    // Now login with the same credentials
    const loginResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/login`, {
      data: {
        email: 'loginafter@example.com',
        password: 'password123',
      },
    });

    expect(loginResponse.status()).toBe(200);

    const loginData = await loginResponse.json();
    expect(loginData.token).toBeTruthy();
    expect(loginData.user.email).toBe('loginafter@example.com');

    await page.close();
  });
});
