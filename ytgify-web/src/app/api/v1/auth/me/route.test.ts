import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { createTestRequest } from '@/test/helpers/api'
import { generateTestAccessToken, generateExpiredToken, generateWrongKeyToken } from '@/test/helpers/auth'
import { alice } from '@/test/fixtures/users'

const mockSupabaseFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockSupabaseFrom,
  })),
}))

describe('GET /api/v1/auth/me', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('successful retrieval', () => {
    it('should return current user when authenticated', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

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

      const request = createTestRequest('/api/v1/auth/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user.id).toBe(alice.id)
      expect(data.user.email).toBe(alice.email)
      expect(data.user.username).toBe(alice.username)
    })

    it('should return complete user profile', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

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

      const request = createTestRequest('/api/v1/auth/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(data.user).toHaveProperty('id')
      expect(data.user).toHaveProperty('email')
      expect(data.user).toHaveProperty('username')
      expect(data.user).toHaveProperty('display_name')
      expect(data.user).toHaveProperty('avatar_url')
      expect(data.user).toHaveProperty('bio')
      expect(data.user).toHaveProperty('gifs_count')
      expect(data.user).toHaveProperty('follower_count')
      expect(data.user).toHaveProperty('following_count')
    })

    it('should not expose sensitive data', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

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
            // Sensitive fields that might be in DB but should not be returned
            password_hash: 'should_not_be_here',
            encrypted_password: 'should_not_be_here',
          },
          error: null,
        }),
      })

      const request = createTestRequest('/api/v1/auth/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(data.user).not.toHaveProperty('password')
      expect(data.user).not.toHaveProperty('password_hash')
      expect(data.user).not.toHaveProperty('encrypted_password')
    })
  })

  describe('authentication required', () => {
    it('should fail without authorization header', async () => {
      const request = createTestRequest('/api/v1/auth/me', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Missing authorization token')
    })

    it('should fail with invalid token', async () => {
      const request = createTestRequest('/api/v1/auth/me', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer invalid.token.here',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid or expired token')
    })

    it('should fail with expired token', async () => {
      const expiredToken = await generateExpiredToken(alice.id, alice.email)

      const request = createTestRequest('/api/v1/auth/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${expiredToken}`,
        },
      })

      const response = await GET(request)
      expect(response.status).toBe(401)
    })

    it('should fail with wrong signing key', async () => {
      const wrongKeyToken = await generateWrongKeyToken(alice.id, alice.email)

      const request = createTestRequest('/api/v1/auth/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${wrongKeyToken}`,
        },
      })

      const response = await GET(request)
      expect(response.status).toBe(401)
    })

    it('should fail without Bearer prefix', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

      const request = createTestRequest('/api/v1/auth/me', {
        method: 'GET',
        headers: {
          Authorization: token, // Missing "Bearer " prefix
        },
      })

      const response = await GET(request)
      expect(response.status).toBe(401)
    })

    it('should fail with empty Bearer token', async () => {
      const request = createTestRequest('/api/v1/auth/me', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer ',
        },
      })

      const response = await GET(request)
      expect(response.status).toBe(401)
    })
  })

  describe('user not found', () => {
    it('should return 404 when user profile is missing', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

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
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })
  })
})
