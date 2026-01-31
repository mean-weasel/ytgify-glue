import { SignJWT } from 'jose'

// Must match JWT_SECRET in src/lib/jwt.ts
const TEST_JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only-32chars'
)

export interface TestUser {
  id: string
  email: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  is_verified: boolean
  gifs_count: number
  follower_count: number
  following_count: number
  total_likes_received: number
  created_at: string
  updated_at: string
}

/**
 * Generate a valid JWT access token for testing
 */
export async function generateTestAccessToken(
  userId: string,
  email: string,
  options?: { expiresIn?: string }
): Promise<string> {
  return new SignJWT({ email, type: 'access' as const })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(options?.expiresIn || '15m')
    .sign(TEST_JWT_SECRET)
}

/**
 * Generate a valid JWT refresh token for testing
 */
export async function generateTestRefreshToken(
  userId: string,
  email: string,
  options?: { expiresIn?: string }
): Promise<string> {
  return new SignJWT({ email, type: 'refresh' as const })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(options?.expiresIn || '7d')
    .sign(TEST_JWT_SECRET)
}

/**
 * Generate an expired JWT token for testing
 */
export async function generateExpiredToken(
  userId: string,
  email: string
): Promise<string> {
  // Create a token that expired 1 hour ago
  const expiredAt = Math.floor(Date.now() / 1000) - 3600

  return new SignJWT({ email, type: 'access' as const })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt(expiredAt - 900) // issued 15 min before expiry
    .setExpirationTime(expiredAt)
    .sign(TEST_JWT_SECRET)
}

/**
 * Generate a token with wrong signing key (for security tests)
 */
export async function generateWrongKeyToken(
  userId: string,
  email: string
): Promise<string> {
  const wrongSecret = new TextEncoder().encode('wrong-secret-key-not-the-real-one')

  return new SignJWT({ email, type: 'access' as const })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(wrongSecret)
}

/**
 * Create authorization headers with Bearer token
 */
export async function authHeaders(userId: string, email: string): Promise<HeadersInit> {
  const token = await generateTestAccessToken(userId, email)
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

/**
 * Create authorization headers from existing token
 */
export function authHeadersFromToken(token: string): HeadersInit {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

/**
 * JSON headers without auth
 */
export const jsonHeaders: HeadersInit = {
  'Content-Type': 'application/json',
}
