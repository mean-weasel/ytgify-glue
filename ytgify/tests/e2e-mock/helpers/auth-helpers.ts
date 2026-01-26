/**
 * Auth Test Helpers
 *
 * Provides utilities for testing the authentication flow:
 * - JWT token generation
 * - Mock user data
 * - Auth state verification via chrome.storage
 */

import type { BrowserContext } from '@playwright/test';

// ============================================
// Types
// ============================================

export interface MockUserProfile {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  gifs_count: number;
  total_likes_received: number;
  follower_count: number;
  following_count: number;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  token: string;
  expiresAt: number;
  userId: string;
  userProfile: MockUserProfile | null;
}

// ============================================
// JWT Token Generation
// ============================================

/**
 * Generate a mock JWT token for testing
 *
 * Note: This creates a properly formatted JWT but with a test secret.
 * The extension doesn't verify the signature, it just decodes the payload.
 */
export function generateMockJwtToken(options: {
  userId?: string;
  expiresInSeconds?: number;
} = {}): string {
  const userId = options.userId || 'test-user-' + Math.random().toString(36).substring(2, 9);
  const expiresIn = options.expiresInSeconds || 900; // 15 minutes default

  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const payload = {
    sub: userId,
    jti: 'test-jti-' + Math.random().toString(36).substring(2, 15),
    exp: Math.floor(Date.now() / 1000) + expiresIn,
    iat: Math.floor(Date.now() / 1000)
  };

  // Base64URL encode (no padding, URL-safe)
  const base64UrlEncode = (obj: object): string => {
    const json = JSON.stringify(obj);
    const base64 = Buffer.from(json).toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const headerEncoded = base64UrlEncode(header);
  const payloadEncoded = base64UrlEncode(payload);

  // For testing, we use a fake signature (extension doesn't verify)
  const signature = base64UrlEncode({ sig: 'test-signature' });

  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

/**
 * Generate an expired JWT token for testing error handling
 */
export function generateExpiredJwtToken(userId?: string): string {
  return generateMockJwtToken({
    userId,
    expiresInSeconds: -3600 // Expired 1 hour ago
  });
}

// ============================================
// Mock User Data
// ============================================

/**
 * Generate mock user profile data
 */
export function generateMockUserProfile(overrides: Partial<MockUserProfile> = {}): MockUserProfile {
  const id = overrides.id || 'test-user-' + Math.random().toString(36).substring(2, 9);
  const now = new Date().toISOString();

  return {
    id,
    email: overrides.email || `${id}@test.example.com`,
    username: overrides.username || id.replace('test-user-', 'testuser'),
    display_name: overrides.display_name ?? 'Test User',
    bio: overrides.bio ?? 'This is a test user for E2E testing',
    avatar_url: overrides.avatar_url ?? null,
    is_verified: overrides.is_verified ?? false,
    gifs_count: overrides.gifs_count ?? 0,
    total_likes_received: overrides.total_likes_received ?? 0,
    follower_count: overrides.follower_count ?? 0,
    following_count: overrides.following_count ?? 0,
    created_at: overrides.created_at || now,
    updated_at: overrides.updated_at || now,
  };
}

/**
 * Generate complete auth data (token + user) for testing
 */
export function generateMockAuthData(userOverrides: Partial<MockUserProfile> = {}): {
  token: string;
  user: MockUserProfile;
  userId: string;
} {
  const user = generateMockUserProfile(userOverrides);
  const token = generateMockJwtToken({ userId: user.id });

  return {
    token,
    user,
    userId: user.id
  };
}

// ============================================
// Auth State Verification (via Service Worker)
// ============================================

/**
 * Get auth state from extension's chrome.storage
 */
export async function getAuthState(context: BrowserContext): Promise<AuthState | null> {
  const serviceWorkers = context.serviceWorkers();
  if (serviceWorkers.length === 0) {
    console.warn('[AuthHelpers] No service workers found');
    return null;
  }

  const backgroundPage = serviceWorkers[0];

  return await backgroundPage.evaluate(() => {
    return new Promise<AuthState | null>((resolve) => {
      chrome.storage.local.get('authState', (result) => {
        resolve(result.authState as AuthState || null);
      });
    });
  });
}

/**
 * Get user profile from extension's chrome.storage
 */
export async function getUserProfile(context: BrowserContext): Promise<MockUserProfile | null> {
  const serviceWorkers = context.serviceWorkers();
  if (serviceWorkers.length === 0) {
    return null;
  }

  const backgroundPage = serviceWorkers[0];

  return await backgroundPage.evaluate(() => {
    return new Promise<MockUserProfile | null>((resolve) => {
      chrome.storage.local.get('userProfile', (result) => {
        resolve(result.userProfile as MockUserProfile || null);
      });
    });
  });
}

/**
 * Verify auth state matches expected values
 */
export async function verifyAuthState(
  context: BrowserContext,
  expectedUserId: string
): Promise<{ valid: boolean; error?: string }> {
  const authState = await getAuthState(context);

  if (!authState) {
    return { valid: false, error: 'No auth state found in storage' };
  }

  if (!authState.token) {
    return { valid: false, error: 'Auth state has no token' };
  }

  if (authState.userId !== expectedUserId) {
    return { valid: false, error: `User ID mismatch: expected ${expectedUserId}, got ${authState.userId}` };
  }

  if (authState.expiresAt < Date.now()) {
    return { valid: false, error: 'Token is expired' };
  }

  return { valid: true };
}

/**
 * Check if extension is authenticated
 */
export async function isAuthenticated(context: BrowserContext): Promise<boolean> {
  const authState = await getAuthState(context);

  if (!authState || !authState.token) {
    return false;
  }

  // Check if token is expired
  if (authState.expiresAt < Date.now()) {
    return false;
  }

  return true;
}

/**
 * Clear all auth data from extension storage
 */
export async function clearAuthState(context: BrowserContext): Promise<void> {
  const serviceWorkers = context.serviceWorkers();
  if (serviceWorkers.length === 0) {
    console.warn('[AuthHelpers] No service workers found for clearing auth');
    return;
  }

  const backgroundPage = serviceWorkers[0];

  await backgroundPage.evaluate(() => {
    return new Promise<void>((resolve) => {
      chrome.storage.local.remove(['authState', 'userProfile'], () => {
        resolve();
      });
    });
  });

  // Wait for storage to settle
  await new Promise(resolve => setTimeout(resolve, 500));
}

/**
 * Set auth state directly in storage (for test setup)
 * Stores both authState and userProfile separately (matching real extension behavior)
 */
export async function setAuthState(
  context: BrowserContext,
  authState: AuthState
): Promise<void> {
  const serviceWorkers = context.serviceWorkers();
  if (serviceWorkers.length === 0) {
    throw new Error('No service workers found');
  }

  const backgroundPage = serviceWorkers[0];

  await backgroundPage.evaluate((state) => {
    return new Promise<void>((resolve) => {
      // Store both authState and userProfile separately (matching real extension behavior)
      const storageData: { authState: typeof state; userProfile?: typeof state.userProfile } = {
        authState: state
      };
      if (state.userProfile) {
        storageData.userProfile = state.userProfile;
      }
      chrome.storage.local.set(storageData, () => {
        resolve();
      });
    });
  }, authState);

  // Wait for storage to settle
  await new Promise(resolve => setTimeout(resolve, 500));
}

// ============================================
// URL Helpers
// ============================================

/**
 * Build the mock auth callback URL with parameters
 */
export function buildAuthCallbackUrl(
  mockServerUrl: string,
  extensionId: string,
  token: string,
  userData?: MockUserProfile
): string {
  const params = new URLSearchParams({
    extensionId,
    token
  });

  if (userData) {
    params.set('userData', encodeURIComponent(JSON.stringify(userData)));
  }

  return `${mockServerUrl}/mock-auth-callback?${params.toString()}`;
}

// ============================================
// Additional Token Generators
// ============================================

/**
 * Generate a JWT token that expires in a specific number of seconds
 * Useful for testing token refresh flows
 */
export function generateNearExpiryJwtToken(secondsUntilExpiry: number, userId?: string): string {
  return generateMockJwtToken({
    userId,
    expiresInSeconds: secondsUntilExpiry
  });
}

/**
 * Generate a mock Google ID token for testing OAuth flows
 * This mimics the structure of a real Google ID token
 */
export function generateMockGoogleIdToken(userData?: Partial<{
  email: string;
  name: string;
  picture: string;
  sub: string;
  email_verified: boolean;
}>): string {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: 'mock-key-id'
  };

  const now = Math.floor(Date.now() / 1000);
  const sub = userData?.sub || 'google-' + Math.random().toString(36).substring(2, 15);

  const payload = {
    iss: 'https://accounts.google.com',
    azp: 'mock-client-id.apps.googleusercontent.com',
    aud: 'mock-client-id.apps.googleusercontent.com',
    sub: sub,
    email: userData?.email || `${sub}@gmail.com`,
    email_verified: userData?.email_verified ?? true,
    name: userData?.name || 'Test Google User',
    picture: userData?.picture || 'https://lh3.googleusercontent.com/mock-avatar',
    given_name: userData?.name?.split(' ')[0] || 'Test',
    family_name: userData?.name?.split(' ')[1] || 'User',
    iat: now,
    exp: now + 3600 // 1 hour
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

// ============================================
// Token Utilities
// ============================================

/**
 * Get just the JWT token from storage (without full auth state)
 */
export async function getStoredToken(context: BrowserContext): Promise<string | null> {
  const authState = await getAuthState(context);
  return authState?.token || null;
}

/**
 * Decode a JWT token and check if it's expired
 */
export function verifyTokenNotExpired(token: string): { valid: boolean; expiresAt: number; error?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, expiresAt: 0, error: 'Invalid token format' };
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    if (!payload.exp) {
      return { valid: false, expiresAt: 0, error: 'Token missing expiration' };
    }

    const expiresAt = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();

    if (expiresAt < now) {
      return { valid: false, expiresAt, error: 'Token is expired' };
    }

    return { valid: true, expiresAt };
  } catch (error) {
    return { valid: false, expiresAt: 0, error: 'Failed to decode token' };
  }
}

/**
 * Decode JWT payload without verification
 */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(Buffer.from(parts[1], 'base64').toString());
  } catch {
    return null;
  }
}

// ============================================
// Auth State Change Detection
// ============================================

/**
 * Wait for auth state to change from a previous state
 * Useful for testing async auth operations
 */
export async function waitForAuthStateChange(
  context: BrowserContext,
  options: {
    previousToken?: string | null;
    timeout?: number;
    expectAuthenticated?: boolean;
  } = {}
): Promise<{ changed: boolean; newState: AuthState | null }> {
  const { previousToken = null, timeout = 5000, expectAuthenticated } = options;
  const startTime = Date.now();
  const pollInterval = 100;

  while (Date.now() - startTime < timeout) {
    const currentState = await getAuthState(context);
    const currentToken = currentState?.token || null;

    // Check if state changed
    if (currentToken !== previousToken) {
      // If we have specific expectation, verify it
      if (expectAuthenticated !== undefined) {
        const isAuth = currentState !== null &&
                       currentState.token !== null &&
                       currentState.expiresAt > Date.now();
        if (isAuth === expectAuthenticated) {
          return { changed: true, newState: currentState };
        }
      } else {
        return { changed: true, newState: currentState };
      }
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  // Timeout - return current state
  const finalState = await getAuthState(context);
  return { changed: false, newState: finalState };
}

// ============================================
// OAuth Flow Simulation
// ============================================

/**
 * Simulate a successful Google OAuth callback
 * This mimics what happens when the backend returns auth data after Google OAuth
 */
export async function simulateGoogleOAuthSuccess(
  context: BrowserContext,
  userData?: Partial<MockUserProfile>
): Promise<{ token: string; user: MockUserProfile }> {
  const user = generateMockUserProfile({
    ...userData,
    // Google users typically have avatar from Google
    avatar_url: userData?.avatar_url || 'https://lh3.googleusercontent.com/mock-avatar',
  });

  const token = generateMockJwtToken({ userId: user.id });
  const payload = decodeJwtPayload(token);

  const serviceWorkers = context.serviceWorkers();
  if (serviceWorkers.length === 0) {
    throw new Error('No service workers found');
  }

  const backgroundPage = serviceWorkers[0];

  // Simulate what EXTENSION_AUTH_CALLBACK_RELAY handler does
  await backgroundPage.evaluate(
    ({ authToken, userProfile, tokenPayload }) => {
      return new Promise<void>((resolve, reject) => {
        const authState = {
          token: authToken,
          expiresAt: (tokenPayload as { exp: number }).exp * 1000,
          userId: (tokenPayload as { sub: string }).sub,
          userProfile: userProfile,
        };

        chrome.storage.local.set({ authState, userProfile }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            // Notify other parts of extension
            chrome.runtime.sendMessage({ type: 'AUTH_STATE_CHANGED', authenticated: true }).catch(() => {});
            resolve();
          }
        });
      });
    },
    { authToken: token, userProfile: user, tokenPayload: payload }
  );

  await new Promise(resolve => setTimeout(resolve, 500));

  return { token, user };
}

/**
 * Simulate Google OAuth flow cancellation (user closed popup)
 */
export async function simulateGoogleOAuthCancellation(
  context: BrowserContext
): Promise<void> {
  // OAuth cancellation means no state change - auth state should remain as it was
  // This is a no-op but useful for test clarity
  const serviceWorkers = context.serviceWorkers();
  if (serviceWorkers.length === 0) {
    throw new Error('No service workers found');
  }

  // Verify auth state didn't change (this is what we're testing)
  // The actual test should check state before and after
}

export type OAuthErrorType =
  | 'user_cancelled'
  | 'network_error'
  | 'invalid_token'
  | 'server_error'
  | 'account_exists';

/**
 * Simulate Google OAuth flow error
 */
export async function simulateGoogleOAuthError(
  context: BrowserContext,
  errorType: OAuthErrorType
): Promise<{ errorMessage: string }> {
  const errorMessages: Record<OAuthErrorType, string> = {
    user_cancelled: 'The user did not approve access.',
    network_error: 'Network error occurred during authentication',
    invalid_token: 'Invalid Google ID token',
    server_error: 'Server error during authentication',
    account_exists: 'An account with this email already exists',
  };

  // OAuth errors should not change auth state
  // The extension should handle the error gracefully

  return { errorMessage: errorMessages[errorType] };
}

// ============================================
// Message Simulation Helpers
// ============================================

/**
 * Send a message to the background script and get response
 */
export async function sendMessageToBackground(
  context: BrowserContext,
  message: { type: string; [key: string]: unknown }
): Promise<unknown> {
  const serviceWorkers = context.serviceWorkers();
  if (serviceWorkers.length === 0) {
    throw new Error('No service workers found');
  }

  const backgroundPage = serviceWorkers[0];

  return await backgroundPage.evaluate((msg) => {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(msg, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }, message);
}

/**
 * Simulate CHECK_AUTH message to background
 */
export async function checkAuthViaMessage(
  context: BrowserContext
): Promise<{ authenticated: boolean; userProfile: MockUserProfile | null }> {
  const response = await sendMessageToBackground(context, { type: 'CHECK_AUTH' });
  return response as { authenticated: boolean; userProfile: MockUserProfile | null };
}

/**
 * Simulate LOGOUT message to background
 */
export async function logoutViaMessage(
  context: BrowserContext
): Promise<{ success: boolean }> {
  const response = await sendMessageToBackground(context, { type: 'LOGOUT' });
  return response as { success: boolean };
}

// ============================================
// Test Data Generators
// ============================================

/**
 * Generate complete auth scenario data for testing
 */
export function generateAuthScenario(scenario: 'new_user' | 'existing_user' | 'google_user'): {
  user: MockUserProfile;
  token: string;
  googleIdToken?: string;
} {
  switch (scenario) {
    case 'new_user':
      const newUser = generateMockUserProfile({
        gifs_count: 0,
        follower_count: 0,
        following_count: 0,
      });
      return {
        user: newUser,
        token: generateMockJwtToken({ userId: newUser.id }),
      };

    case 'existing_user':
      const existingUser = generateMockUserProfile({
        gifs_count: 15,
        follower_count: 100,
        following_count: 50,
        is_verified: true,
      });
      return {
        user: existingUser,
        token: generateMockJwtToken({ userId: existingUser.id }),
      };

    case 'google_user':
      const googleUser = generateMockUserProfile({
        avatar_url: 'https://lh3.googleusercontent.com/mock-avatar',
      });
      return {
        user: googleUser,
        token: generateMockJwtToken({ userId: googleUser.id }),
        googleIdToken: generateMockGoogleIdToken({
          email: googleUser.email,
          name: googleUser.display_name || googleUser.username,
          sub: 'google-' + googleUser.id,
        }),
      };
  }
}
