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
      chrome.storage.local.set({ authState: state }, () => {
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
