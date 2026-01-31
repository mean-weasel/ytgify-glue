import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, DELETE } from './route'
import { testDynamicApiRoute } from '@/test/helpers/api'
import { generateTestAccessToken } from '@/test/helpers/auth'
import { alice, bob } from '@/test/fixtures/users'
import { aliceGif1, nonExistentGifId, deletedGif } from '@/test/fixtures/gifs'

const mockSupabaseFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockSupabaseFrom,
  })),
}))

describe('Likes API - /api/v1/gifs/[id]/likes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/v1/gifs/[id]/likes (Toggle Like)', () => {
    it('should require authentication', async () => {
      const { status, data } = await testDynamicApiRoute(
        POST,
        `/api/v1/gifs/${aliceGif1.id}/likes`,
        { id: aliceGif1.id },
        { method: 'POST' }
      )

      expect(status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should return 401 for invalid token', async () => {
      const { status, data } = await testDynamicApiRoute(
        POST,
        `/api/v1/gifs/${aliceGif1.id}/likes`,
        { id: aliceGif1.id },
        { method: 'POST', headers: { Authorization: 'Bearer invalid-token' } }
      )

      expect(status).toBe(401)
      expect(data.error).toBe('Invalid token')
    })

    it('should return 404 for non-existent GIF', async () => {
      const token = await generateTestAccessToken(bob.id, bob.email)

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      })

      const { status, data } = await testDynamicApiRoute(
        POST,
        `/api/v1/gifs/${nonExistentGifId}/likes`,
        { id: nonExistentGifId },
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      )

      expect(status).toBe(404)
      expect(data.error).toBe('GIF not found')
    })

    it('should return 404 for deleted GIF', async () => {
      const token = await generateTestAccessToken(bob.id, bob.email)

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })

      const { status } = await testDynamicApiRoute(
        POST,
        `/api/v1/gifs/${deletedGif.id}/likes`,
        { id: deletedGif.id },
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      )

      expect(status).toBe(404)
    })

    it('should add like when not already liked', async () => {
      const token = await generateTestAccessToken(bob.id, bob.email)

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'gifs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: aliceGif1.id, user_id: alice.id, like_count: 5 },
              error: null,
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { like_count: 6 },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'likes') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
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
        `/api/v1/gifs/${aliceGif1.id}/likes`,
        { id: aliceGif1.id },
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      )

      expect(status).toBe(200)
      expect(data.is_liked).toBe(true)
      expect(data.gif_id).toBe(aliceGif1.id)
      expect(data.like_count).toBe(6)
    })

    it('should remove like when already liked (toggle)', async () => {
      const token = await generateTestAccessToken(bob.id, bob.email)

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'gifs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: aliceGif1.id, user_id: alice.id, like_count: 5 },
              error: null,
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { like_count: 4 },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'likes') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'existing-like-id' },
              error: null,
            }),
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
        POST,
        `/api/v1/gifs/${aliceGif1.id}/likes`,
        { id: aliceGif1.id },
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      )

      expect(status).toBe(200)
      expect(data.is_liked).toBe(false)
      expect(data.like_count).toBe(4)
    })

    it('should not allow like_count to go below 0', async () => {
      const token = await generateTestAccessToken(bob.id, bob.email)

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'gifs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: aliceGif1.id, user_id: alice.id, like_count: 0 },
              error: null,
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { like_count: 0 },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'likes') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'existing-like-id' },
              error: null,
            }),
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
        POST,
        `/api/v1/gifs/${aliceGif1.id}/likes`,
        { id: aliceGif1.id },
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      )

      expect(status).toBe(200)
      expect(data.like_count).toBe(0)
    })
  })

  describe('DELETE /api/v1/gifs/[id]/likes (Alias for toggle)', () => {
    it('should work as alias for POST (toggle)', async () => {
      const token = await generateTestAccessToken(bob.id, bob.email)

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'gifs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: aliceGif1.id, user_id: alice.id, like_count: 5 },
              error: null,
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { like_count: 6 },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'likes') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        }
      })

      const { status, data } = await testDynamicApiRoute(
        DELETE,
        `/api/v1/gifs/${aliceGif1.id}/likes`,
        { id: aliceGif1.id },
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
      )

      expect(status).toBe(200)
      expect(data.gif_id).toBe(aliceGif1.id)
    })
  })
})
