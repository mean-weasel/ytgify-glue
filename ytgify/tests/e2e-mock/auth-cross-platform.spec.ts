import { test, expect } from './fixtures';
import type { BrowserContext, Page } from '@playwright/test';
import {
  generateMockAuthData,
  getAuthState,
  isAuthenticated,
  clearAuthState,
  setAuthState,
  generateMockUserProfile,
  generateMockJwtToken,
  decodeJwtPayload,
} from './helpers/auth-helpers';

/**
 * E2E tests for Cross-Platform Auth Scenarios
 *
 * Tests cover scenarios where users interact with both web app and extension:
 * 1. Web signup → Extension login (email/password)
 * 2. Web signup → Extension login (Google OAuth)
 * 3. Extension signup → Web login compatibility
 * 4. Account data consistency across platforms
 * 5. Token sharing and validation
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
    return null;
  }

  const url = serviceWorkers[0].url();
  const match = url.match(/chrome-extension:\/\/([^/]+)/);
  if (!match) {
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
      await page.waitForSelector('.popup-modern', { timeout: 15000 });

      return page;
    } catch (error) {
      if (attempt < maxRetries) {
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

test.describe('Cross-Platform Auth - Web Signup → Extension Login', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('user registered on web can login via extension API', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    // Simulate web registration (creates user in mock server)
    const registerResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/register`, {
      data: {
        user: {
          email: 'webuser@example.com',
          username: 'webuser',
          password: 'password123',
          password_confirmation: 'password123',
        },
      },
    });
    expect(registerResponse.status()).toBe(201);

    // Now login via extension API (same endpoint the extension uses)
    const loginResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/login`, {
      data: {
        user: {
          email: 'webuser@example.com',
          password: 'password123',
        },
      },
    });
    expect(loginResponse.status()).toBe(200);

    const loginData = await loginResponse.json();
    expect(loginData.token).toBeTruthy();
    expect(loginData.user.email).toBe('webuser@example.com');
    expect(loginData.user.username).toBe('webuser');

    await page.close();
  });

  test('extension can authenticate with web-created account token', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    // Register on "web"
    const registerResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/register`, {
      data: {
        user: {
          email: 'webtoken@example.com',
          username: 'webtokenuser',
          password: 'password123',
          password_confirmation: 'password123',
        },
      },
    });
    expect(registerResponse.status()).toBe(201);
    const registerData = await registerResponse.json();

    // Set this token in extension storage (simulating extension login)
    await waitForServiceWorker(context);
    const payload = decodeJwtPayload(registerData.token);

    await setAuthState(context, {
      token: registerData.token,
      expiresAt: (payload!.exp as number) * 1000,
      userId: registerData.user.id,
      userProfile: registerData.user,
    });

    // Verify extension is now authenticated
    expect(await isAuthenticated(context)).toBe(true);

    // Verify token works for API calls
    const meResponse = await page.request.get(`${mockServerUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${registerData.token}` },
    });
    expect(meResponse.status()).toBe(200);

    const meData = await meResponse.json();
    expect(meData.user.email).toBe('webtoken@example.com');

    await page.close();
  });

  test('user profile data is consistent between web and extension', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    // Register with specific profile data
    const registerResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/register`, {
      data: {
        user: {
          email: 'profiletest@example.com',
          username: 'profiletestuser',
          password: 'password123',
          password_confirmation: 'password123',
        },
      },
    });
    expect(registerResponse.status()).toBe(201);
    const registerData = await registerResponse.json();

    // Store in extension
    await waitForServiceWorker(context);
    const payload = decodeJwtPayload(registerData.token);

    await setAuthState(context, {
      token: registerData.token,
      expiresAt: (payload!.exp as number) * 1000,
      userId: registerData.user.id,
      userProfile: registerData.user,
    });

    // Get profile from extension storage
    const authState = await getAuthState(context);
    expect(authState!.userProfile!.email).toBe('profiletest@example.com');
    expect(authState!.userProfile!.username).toBe('profiletestuser');

    // Get profile from API (what web would see)
    const meResponse = await page.request.get(`${mockServerUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${registerData.token}` },
    });
    const meData = await meResponse.json();

    // Verify consistency
    expect(meData.user.email).toBe(authState!.userProfile!.email);
    expect(meData.user.username).toBe(authState!.userProfile!.username);
    expect(meData.user.id).toBe(authState!.userId);

    await page.close();
  });
});

test.describe('Cross-Platform Auth - Extension Signup → Web Login', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('user registered via extension can login on web API', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    // Register via extension API
    const registerResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/register`, {
      data: {
        user: {
          email: 'extuser@example.com',
          username: 'extuser',
          password: 'password123',
          password_confirmation: 'password123',
        },
      },
    });
    expect(registerResponse.status()).toBe(201);

    // Simulate web login (same credentials)
    const loginResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/login`, {
      data: {
        email: 'extuser@example.com',
        password: 'password123',
      },
    });
    expect(loginResponse.status()).toBe(200);

    const loginData = await loginResponse.json();
    expect(loginData.token).toBeTruthy();
    expect(loginData.user.username).toBe('extuser');

    await page.close();
  });

  test('extension-created token is valid for web API calls', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    // Register and get token (simulating extension registration)
    const registerResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/register`, {
      data: {
        user: {
          email: 'exttoken@example.com',
          username: 'exttokenuser',
          password: 'password123',
          password_confirmation: 'password123',
        },
      },
    });
    const registerData = await registerResponse.json();
    const extensionToken = registerData.token;

    // Use extension token for "web" API calls
    const meResponse = await page.request.get(`${mockServerUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${extensionToken}` },
    });
    expect(meResponse.status()).toBe(200);

    const meData = await meResponse.json();
    expect(meData.user.email).toBe('exttoken@example.com');

    await page.close();
  });
});

test.describe('Cross-Platform Auth - Token Validity', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('token from web login works in extension', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    // Web login (using test user that exists in mock server)
    const loginResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/login`, {
      data: {
        email: 'test@example.com',
        password: 'password123',
      },
    });
    expect(loginResponse.status()).toBe(200);
    const loginData = await loginResponse.json();

    // Store web token in extension
    await waitForServiceWorker(context);
    const payload = decodeJwtPayload(loginData.token);

    await setAuthState(context, {
      token: loginData.token,
      expiresAt: (payload!.exp as number) * 1000,
      userId: loginData.user.id,
      userProfile: loginData.user,
    });

    // Verify extension recognizes the auth
    expect(await isAuthenticated(context)).toBe(true);

    const authState = await getAuthState(context);
    expect(authState!.token).toBe(loginData.token);

    await page.close();
  });

  test('token refresh works across platforms', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    // Login
    const loginResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/login`, {
      data: {
        email: 'test@example.com',
        password: 'password123',
      },
    });
    const loginData = await loginResponse.json();
    const originalToken = loginData.token;

    // Refresh token (could be done from extension or web)
    const refreshResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/refresh`, {
      headers: { Authorization: `Bearer ${originalToken}` },
    });
    expect(refreshResponse.status()).toBe(200);

    const refreshData = await refreshResponse.json();
    const newToken = refreshData.token;

    // New token should work for both platforms
    const meResponse = await page.request.get(`${mockServerUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${newToken}` },
    });
    expect(meResponse.status()).toBe(200);

    await page.close();
  });

  test('logout on one platform invalidates token for both', async ({ context, mockServerUrl }) => {
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

    // Logout (simulating web logout)
    const logoutResponse = await page.request.delete(`${mockServerUrl}/api/v1/auth/logout`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(logoutResponse.status()).toBe(200);

    // Token should now be invalid for extension API calls too
    const meResponse = await page.request.get(`${mockServerUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(meResponse.status()).toBe(401);

    await page.close();
  });
});

test.describe('Cross-Platform Auth - Google OAuth', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('Google user created via web API can be used in extension', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    // Simulate Google OAuth (web creates user via Google)
    // The mock server's Google endpoint creates/finds user by email
    const googleResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/google`, {
      data: {
        id_token: createMockGoogleIdToken('googlewebuser@gmail.com', 'Google Web User'),
      },
    });
    expect(googleResponse.status()).toBe(200);
    const googleData = await googleResponse.json();

    // Store in extension (simulating extension receiving OAuth callback)
    await waitForServiceWorker(context);
    const payload = decodeJwtPayload(googleData.token);

    await setAuthState(context, {
      token: googleData.token,
      expiresAt: (payload!.exp as number) * 1000,
      userId: googleData.user.id,
      userProfile: googleData.user,
    });

    // Verify extension is authenticated
    expect(await isAuthenticated(context)).toBe(true);

    const authState = await getAuthState(context);
    expect(authState!.userProfile!.email).toBe('googlewebuser@gmail.com');

    await page.close();
  });

  test('same Google account yields same user across platforms', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    const googleEmail = 'samegoogle@gmail.com';
    const idToken = createMockGoogleIdToken(googleEmail, 'Same Google User');

    // First "login" via Google (simulating web)
    const firstResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/google`, {
      data: { id_token: idToken },
    });
    expect(firstResponse.status()).toBe(200);
    const firstData = await firstResponse.json();
    const firstUserId = firstData.user.id;

    // Second "login" via Google (simulating extension)
    const secondResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/google`, {
      data: { id_token: idToken },
    });
    expect(secondResponse.status()).toBe(200);
    const secondData = await secondResponse.json();
    const secondUserId = secondData.user.id;

    // Should be the same user
    expect(secondUserId).toBe(firstUserId);
    expect(secondData.user.email).toBe(googleEmail);

    await page.close();
  });
});

test.describe('Cross-Platform Auth - Account Data Sync', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('user stats are consistent between platforms', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();
    await page.goto(`${mockServerUrl}/watch?v=mock-short`);
    await page.waitForSelector('video', { timeout: 10000 });

    // Login
    const loginResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/login`, {
      data: {
        email: 'test@example.com',
        password: 'password123',
      },
    });
    const loginData = await loginResponse.json();

    // Store in extension
    await waitForServiceWorker(context);
    const payload = decodeJwtPayload(loginData.token);

    await setAuthState(context, {
      token: loginData.token,
      expiresAt: (payload!.exp as number) * 1000,
      userId: loginData.user.id,
      userProfile: loginData.user,
    });

    // Get stats from extension storage
    const authState = await getAuthState(context);
    const extensionGifsCount = authState!.userProfile!.gifs_count;
    const extensionFollowers = authState!.userProfile!.follower_count;

    // Get stats from API (what web would see)
    const meResponse = await page.request.get(`${mockServerUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${loginData.token}` },
    });
    const meData = await meResponse.json();

    // Stats should match
    expect(meData.user.gifs_count).toBe(extensionGifsCount);
    expect(meData.user.follower_count).toBe(extensionFollowers);

    await page.close();
  });

  test('userId is consistent across login methods', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    // Register a user
    const registerResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/register`, {
      data: {
        user: {
          email: 'consistent@example.com',
          username: 'consistentuser',
          password: 'password123',
          password_confirmation: 'password123',
        },
      },
    });
    const registerData = await registerResponse.json();
    const registeredUserId = registerData.user.id;

    // Login with same credentials
    const loginResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/login`, {
      data: {
        email: 'consistent@example.com',
        password: 'password123',
      },
    });
    const loginData = await loginResponse.json();
    const loggedInUserId = loginData.user.id;

    // User ID should be the same
    expect(loggedInUserId).toBe(registeredUserId);

    // Token's sub claim should match
    const registerPayload = decodeJwtPayload(registerData.token);
    const loginPayload = decodeJwtPayload(loginData.token);
    expect(loginPayload!.sub).toBe(registerPayload!.sub);

    await page.close();
  });
});

test.describe('Cross-Platform Auth - Error Scenarios', () => {
  test.beforeEach(async ({ context }) => {
    await clearAuthState(context);
  });

  test('invalid credentials fail on both platforms', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    // Register user
    await page.request.post(`${mockServerUrl}/api/v1/auth/register`, {
      data: {
        user: {
          email: 'errortest@example.com',
          username: 'erroruser',
          password: 'correctpassword',
          password_confirmation: 'correctpassword',
        },
      },
    });

    // Wrong password - web style
    const webLoginResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/login`, {
      data: {
        email: 'errortest@example.com',
        password: 'wrongpassword',
      },
    });
    expect(webLoginResponse.status()).toBe(401);

    // Wrong password - extension style
    const extLoginResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/login`, {
      data: {
        user: {
          email: 'errortest@example.com',
          password: 'wrongpassword',
        },
      },
    });
    expect(extLoginResponse.status()).toBe(401);

    await page.close();
  });

  test('duplicate registration fails regardless of platform', async ({ context, mockServerUrl }) => {
    const page = await context.newPage();

    // First registration
    const firstResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/register`, {
      data: {
        user: {
          email: 'duplicate@example.com',
          username: 'duplicateuser',
          password: 'password123',
          password_confirmation: 'password123',
        },
      },
    });
    expect(firstResponse.status()).toBe(201);

    // Second registration with same email
    const secondResponse = await page.request.post(`${mockServerUrl}/api/v1/auth/register`, {
      data: {
        user: {
          email: 'duplicate@example.com',
          username: 'differentuser',
          password: 'password123',
          password_confirmation: 'password123',
        },
      },
    });
    expect([400, 409, 422]).toContain(secondResponse.status());

    await page.close();
  });
});

/**
 * Helper to create a mock Google ID token for testing
 */
function createMockGoogleIdToken(email: string, name: string): string {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: 'mock-key-id',
  };

  const now = Math.floor(Date.now() / 1000);
  const sub = 'google-' + email.replace('@', '-').replace('.', '-');

  const payload = {
    iss: 'https://accounts.google.com',
    azp: 'mock-client-id.apps.googleusercontent.com',
    aud: 'mock-client-id.apps.googleusercontent.com',
    sub: sub,
    email: email,
    email_verified: true,
    name: name,
    picture: 'https://lh3.googleusercontent.com/mock-avatar',
    given_name: name.split(' ')[0],
    family_name: name.split(' ')[1] || '',
    iat: now,
    exp: now + 3600,
  };

  const base64UrlEncode = (obj: object): string => {
    const json = JSON.stringify(obj);
    const base64 = Buffer.from(json).toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const headerEncoded = base64UrlEncode(header);
  const payloadEncoded = base64UrlEncode(payload);
  const signature = base64UrlEncode({ sig: 'mock-google-signature' });

  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}
