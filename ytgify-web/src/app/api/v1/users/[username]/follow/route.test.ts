import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, DELETE } from './route'
import { testDynamicApiRoute } from '@/test/helpers/api'
import { generateTestAccessToken } from '@/test/helpers/auth'
import { alice, bob } from '@/test/fixtures/users'

const mockSupabaseFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockSupabaseFrom,
  })),
}))

describe('Follow API - /api/v1/users/[username]/follow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/v1/users/[username]/follow', () => {
    it('should require authentication', async () => {
      const { status, data } = await testDynamicApiRoute(
        POST,
        `/api/v1/users/${alice.username}/follow`,
        { username: alice.username },
        { method: 'POST' }
      )

      expect(status).toBe(401)
      expect(data.error).toBe('Missing authorization token')
    })

    it('should return 401 for invalid token', async () => {
      const { status, data } = await testDynamicApiRoute(
        POST,
        `/api/v1/users/${alice.username}/follow`,
        { username: alice.username },
        { method: 'POST', headers: { Authorization: 'Bearer invalid-token' } }
      )

      expect(status).toBe(401)
      expect(data.error).toBe('Invalid or expired token')
    })

    it('should return 404 for non-existent user', async () => {
      const token = await generateTestAccessToken(bob.id, bob.email)

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      })

      const { status, data } = await testDynamicApiRoute(
        POST,
        `/api/v1/users/nonexistent/follow`,
        { username: 'nonexistent' },
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      )

      expect(status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should not allow following yourself', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: alice.id },
          error: null,
        }),
      })

      const { status, data } = await testDynamicApiRoute(
        POST,
        `/api/v1/users/${alice.username}/follow`,
        { username: alice.username },
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      )

      expect(status).toBe(400)
      expect(data.error).toBe('Cannot follow yourself')
    })

    it('should not allow following already followed user', async () => {
      const token = await generateTestAccessToken(bob.id, bob.email)

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: alice.id },
              error: null,
            }),
          }
        }
        if (table === 'follows') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'existing-follow-id' },
              error: null,
            }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        }
      })

      const { status, data } = await testDynamicApiRoute(
        POST,
        `/api/v1/users/${alice.username}/follow`,
        { username: alice.username },
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      )

      expect(status).toBe(400)
      expect(data.error).toBe('Already following this user')
    })

    it('should follow user successfully', async () => {
      const token = await generateTestAccessToken(bob.id, bob.email)

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: alice.id },
              error: null,
            }),
          }
        }
        if (table === 'follows') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        if (table === 'notifications') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        }
      })

      const { status, data } = await testDynamicApiRoute(
        POST,
        `/api/v1/users/${alice.username}/follow`,
        { username: alice.username },
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      )

      expect(status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.following).toBe(true)
    })

    it('should create notification for followed user', async () => {
      const token = await generateTestAccessToken(bob.id, bob.email)

      let notificationData: Record<string, unknown> | null = null
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: alice.id },
              error: null,
            }),
          }
        }
        if (table === 'follows') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        if (table === 'notifications') {
          return {
            insert: vi.fn().mockImplementation((data) => {
              notificationData = data
              return Promise.resolve({ error: null })
            }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        }
      })

      await testDynamicApiRoute(
        POST,
        `/api/v1/users/${alice.username}/follow`,
        { username: alice.username },
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      )

      expect(notificationData).toBeDefined()
      expect(notificationData?.recipient_id).toBe(alice.id)
      expect(notificationData?.actor_id).toBe(bob.id)
      expect(notificationData?.action).toBe('follow')
    })
  })

  describe('DELETE /api/v1/users/[username]/follow', () => {
    it('should require authentication', async () => {
      const { status, data } = await testDynamicApiRoute(
        DELETE,
        `/api/v1/users/${alice.username}/follow`,
        { username: alice.username },
        { method: 'DELETE' }
      )

      expect(status).toBe(401)
      expect(data.error).toBe('Missing authorization token')
    })

    it('should return 404 for non-existent user', async () => {
      const token = await generateTestAccessToken(bob.id, bob.email)

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      })

      const { status, data } = await testDynamicApiRoute(
        DELETE,
        `/api/v1/users/nonexistent/follow`,
        { username: 'nonexistent' },
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
      )

      expect(status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should unfollow user successfully', async () => {
      const token = await generateTestAccessToken(bob.id, bob.email)

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: alice.id },
              error: null,
            }),
          }
        }
        if (table === 'follows') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        }
      })

      const { status, data } = await testDynamicApiRoute(
        DELETE,
        `/api/v1/users/${alice.username}/follow`,
        { username: alice.username },
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
      )

      expect(status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.following).toBe(false)
    })

    it('should handle unfollow when not following (idempotent)', async () => {
      const token = await generateTestAccessToken(bob.id, bob.email)

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: alice.id },
              error: null,
            }),
          }
        }
        if (table === 'follows') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        }
      })

      const { status, data } = await testDynamicApiRoute(
        DELETE,
        `/api/v1/users/${alice.username}/follow`,
        { username: alice.username },
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
      )

      // Should succeed even if not following (idempotent)
      expect(status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.following).toBe(false)
    })
  })
})
