import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/v1/auth/me/route'
import { createTestRequest } from './helpers/api'
import {
  generateTestAccessToken,
  generateExpiredToken,
  generateWrongKeyToken,
} from './helpers/auth'
import { alice } from './fixtures/users'
import { SignJWT } from 'jose'

const mockSupabaseFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockSupabaseFrom,
  })),
}))

const TEST_JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only-32chars'
)

describe('JWT Security Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock successful user lookup for tests that need it
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: alice.id,
          username: alice.username,
          display_name: alice.display_name,
          avatar_url: alice.avatar_url,
          bio: alice.bio,
          gifs_count: alice.gifs_count,
          follower_count: alice.follower_count,
          following_count: alice.following_count,
        },
        error: null,
      }),
    })
  })

  describe('Token Tampering', () => {
    it('should reject token with tampered signature', async () => {
      const validToken = await generateTestAccessToken(alice.id, alice.email)

      // Tamper with the signature (change last character)
      const tamperedToken = validToken.slice(0, -1) + (validToken.slice(-1) === 'a' ? 'b' : 'a')

      const request = createTestRequest('/api/v1/auth/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${tamperedToken}` },
      })

      const response = await GET(request)
      expect(response.status).toBe(401)
    })

    it('should reject token signed with wrong key', async () => {
      const wrongKeyToken = await generateWrongKeyToken(alice.id, alice.email)

      const request = createTestRequest('/api/v1/auth/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${wrongKeyToken}` },
      })

      const response = await GET(request)
      expect(response.status).toBe(401)
    })

    it('should reject token with modified payload', async () => {
      const validToken = await generateTestAccessToken(alice.id, alice.email)

      // Split token and try to modify the payload
      const parts = validToken.split('.')
      // Decode, modify, and re-encode payload (signature will be invalid)
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
      payload.sub = '00000000-0000-0000-0000-000000000099' // Different user ID
      parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64url')
      const modifiedToken = parts.join('.')

      const request = createTestRequest('/api/v1/auth/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${modifiedToken}` },
      })

      const response = await GET(request)
      expect(response.status).toBe(401)
    })
  })

  describe('Token Expiration', () => {
    it('should reject expired token', async () => {
      const expiredToken = await generateExpiredToken(alice.id, alice.email)

      const request = createTestRequest('/api/v1/auth/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${expiredToken}` },
      })

      const response = await GET(request)
      expect(response.status).toBe(401)
    })
  })

  describe('Missing Claims', () => {
    it('should reject token without sub claim', async () => {
      const tokenWithoutSub = await new SignJWT({ email: alice.email, type: 'access' as const })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('15m')
        // Note: no setSubject() call
        .sign(TEST_JWT_SECRET)

      const request = createTestRequest('/api/v1/auth/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${tokenWithoutSub}` },
      })

      const response = await GET(request)
      expect(response.status).toBe(401)
    })

    it('should reject token with wrong type (refresh instead of access)', async () => {
      const refreshToken = await new SignJWT({ email: alice.email, type: 'refresh' as const })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(alice.id)
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(TEST_JWT_SECRET)

      const request = createTestRequest('/api/v1/auth/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${refreshToken}` },
      })

      const response = await GET(request)
      expect(response.status).toBe(401)
    })
  })

  describe('Malformed Tokens', () => {
    it('should reject completely invalid token', async () => {
      const request = createTestRequest('/api/v1/auth/me', {
        method: 'GET',
        headers: { Authorization: 'Bearer not-a-jwt-at-all' },
      })

      const response = await GET(request)
      expect(response.status).toBe(401)
    })

    it('should reject token with invalid base64', async () => {
      const request = createTestRequest('/api/v1/auth/me', {
        method: 'GET',
        headers: { Authorization: 'Bearer invalid!!!.base64!!!.token!!!' },
      })

      const response = await GET(request)
      expect(response.status).toBe(401)
    })

    it('should reject token with only 2 parts', async () => {
      const request = createTestRequest('/api/v1/auth/me', {
        method: 'GET',
        headers: { Authorization: 'Bearer header.payload' },
      })

      const response = await GET(request)
      expect(response.status).toBe(401)
    })

    it('should reject empty token', async () => {
      const request = createTestRequest('/api/v1/auth/me', {
        method: 'GET',
        headers: { Authorization: 'Bearer ' },
      })

      const response = await GET(request)
      expect(response.status).toBe(401)
    })
  })

  describe('Authorization Header Edge Cases', () => {
    it('should reject missing Authorization header', async () => {
      const request = createTestRequest('/api/v1/auth/me', {
        method: 'GET',
      })

      const response = await GET(request)
      expect(response.status).toBe(401)
    })

    it('should reject Authorization without Bearer prefix', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

      const request = createTestRequest('/api/v1/auth/me', {
        method: 'GET',
        headers: { Authorization: token },
      })

      const response = await GET(request)
      expect(response.status).toBe(401)
    })

    it('should reject lowercase bearer prefix', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

      const request = createTestRequest('/api/v1/auth/me', {
        method: 'GET',
        headers: { Authorization: `bearer ${token}` },
      })

      const response = await GET(request)
      expect(response.status).toBe(401)
    })

    it('should reject Basic auth instead of Bearer', async () => {
      const request = createTestRequest('/api/v1/auth/me', {
        method: 'GET',
        headers: { Authorization: 'Basic dXNlcjpwYXNz' },
      })

      const response = await GET(request)
      expect(response.status).toBe(401)
    })
  })

  describe('Non-Existent User', () => {
    it('should handle token for non-existent user', async () => {
      const nonExistentUserId = '00000000-0000-0000-0000-999999999999'
      const token = await generateTestAccessToken(nonExistentUserId, 'nonexistent@example.com')

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Row not found' },
        }),
      })

      const request = createTestRequest('/api/v1/auth/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })

      const response = await GET(request)
      expect(response.status).toBe(404)
    })
  })

  describe('SQL Injection Prevention', () => {
    it('should safely handle SQL injection attempt in token payload', async () => {
      // Create token with SQL injection in sub claim
      const maliciousId = "'; DROP TABLE users; --"
      const token = await new SignJWT({ email: 'test@example.com', type: 'access' as const })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(maliciousId)
        .setIssuedAt()
        .setExpirationTime('15m')
        .sign(TEST_JWT_SECRET)

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      })

      const request = createTestRequest('/api/v1/auth/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })

      const response = await GET(request)
      // Should return 404 (user not found) not crash
      expect([401, 404]).toContain(response.status)
    })
  })
})
