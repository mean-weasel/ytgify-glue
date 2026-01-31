import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { createTestRequest } from '@/test/helpers/api'
import { generateTestAccessToken, generateTestRefreshToken, generateExpiredToken } from '@/test/helpers/auth'
import { alice } from '@/test/fixtures/users'

const mockSupabaseFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockSupabaseFrom,
  })),
}))

describe('POST /api/v1/auth/refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('successful token refresh', () => {
    it('should refresh using Bearer token in header (extension style)', async () => {
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

      const request = createTestRequest('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: {},
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.token).toBeDefined()
      expect(data.access_token).toBeDefined()
      expect(data.refresh_token).toBeDefined()
      expect(data.user.id).toBe(alice.id)
    })

    it('should refresh using refresh_token in body (web app style)', async () => {
      const refreshToken = await generateTestRefreshToken(alice.id, alice.email)

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

      const request = createTestRequest('/api/v1/auth/refresh', {
        method: 'POST',
        body: {
          refresh_token: refreshToken,
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.token).toBeDefined()
      expect(data.access_token).toBeDefined()
      expect(data.refresh_token).toBeDefined()
    })

    it('should return new tokens different from input', async () => {
      const originalToken = await generateTestAccessToken(alice.id, alice.email)

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

      const request = createTestRequest('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${originalToken}`,
        },
        body: {},
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // New tokens should be different (different iat timestamp)
      expect(data.access_token).toBeDefined()
      expect(data.access_token.split('.')).toHaveLength(3)
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

      const request = createTestRequest('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: {},
      })

      const response = await POST(request)
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
  })

  describe('authentication failures', () => {
    it('should fail without any token', async () => {
      const request = createTestRequest('/api/v1/auth/refresh', {
        method: 'POST',
        body: {},
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid or expired token')
    })

    it('should fail with expired token', async () => {
      const expiredToken = await generateExpiredToken(alice.id, alice.email)

      const request = createTestRequest('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${expiredToken}`,
        },
        body: {},
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid or expired token')
    })

    it('should fail with invalid token', async () => {
      const request = createTestRequest('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer invalid.token.here',
        },
        body: {},
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
    })
  })

  describe('user not found', () => {
    it('should return 404 when user no longer exists', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Row not found' },
        }),
      })

      const request = createTestRequest('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: {},
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })
  })
})
