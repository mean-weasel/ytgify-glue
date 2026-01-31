import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { testDynamicApiRoute } from '@/test/helpers/api'
import { generateTestAccessToken } from '@/test/helpers/auth'
import { alice, bob } from '@/test/fixtures/users'
import { aliceGif1, aliceGif2 } from '@/test/fixtures/gifs'
import { testHashtags } from '@/test/fixtures/hashtags'

const mockSupabaseFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockSupabaseFrom,
  })),
}))

describe('Hashtag Detail API - /api/v1/hashtags/[name]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/v1/hashtags/[name]', () => {
    it('should return hashtag with its GIFs', async () => {
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'hashtags') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: testHashtags[0],
              error: null,
            }),
          }
        }
        if (table === 'gif_hashtags') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({
              data: [
                {
                  gif: {
                    ...aliceGif1,
                    user: {
                      id: alice.id,
                      username: alice.username,
                      display_name: alice.display_name,
                      avatar_url: alice.avatar_url,
                      is_verified: alice.is_verified,
                    },
                  },
                },
              ],
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
        GET,
        `/api/v1/hashtags/funny`,
        { name: 'funny' },
        { method: 'GET' }
      )

      expect(status).toBe(200)
      expect(data.hashtag).toBeDefined()
      expect(data.gifs).toBeDefined()
      expect(data.page).toBe(1)
      expect(data.limit).toBe(20)
    })

    it('should return 404 for non-existent hashtag', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      })

      const { status, data } = await testDynamicApiRoute(
        GET,
        `/api/v1/hashtags/nonexistent`,
        { name: 'nonexistent' },
        { method: 'GET' }
      )

      expect(status).toBe(404)
      expect(data.error).toBe('Hashtag not found')
    })

    it('should normalize hashtag name (lowercase, remove #)', async () => {
      let queriedName = ''
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'hashtags') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation((field, value) => {
              if (field === 'name') {
                queriedName = value
              }
              return {
                single: vi.fn().mockResolvedValue({
                  data: testHashtags[0],
                  error: null,
                }),
              }
            }),
          }
        }
        if (table === 'gif_hashtags') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        }
      })

      await testDynamicApiRoute(
        GET,
        `/api/v1/hashtags/%23FUNNY`,
        { name: '#FUNNY' },
        { method: 'GET' }
      )

      expect(queriedName).toBe('funny')
    })

    it('should support pagination', async () => {
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'hashtags') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: testHashtags[0],
              error: null,
            }),
          }
        }
        if (table === 'gif_hashtags') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({
              data: [],
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
        GET,
        `/api/v1/hashtags/funny`,
        { name: 'funny' },
        { method: 'GET', searchParams: { page: '2', limit: '10' } }
      )

      expect(status).toBe(200)
      expect(data.page).toBe(2)
      expect(data.limit).toBe(10)
    })

    it('should limit max page size to 50', async () => {
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'hashtags') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: testHashtags[0],
              error: null,
            }),
          }
        }
        if (table === 'gif_hashtags') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({
              data: [],
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
        GET,
        `/api/v1/hashtags/funny`,
        { name: 'funny' },
        { method: 'GET', searchParams: { limit: '100' } }
      )

      expect(status).toBe(200)
      expect(data.limit).toBe(50)
    })

    it('should filter out deleted GIFs', async () => {
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'hashtags') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: testHashtags[0],
              error: null,
            }),
          }
        }
        if (table === 'gif_hashtags') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({
              data: [
                { gif: { ...aliceGif1, deleted_at: null, privacy: 'public' } },
                { gif: { ...aliceGif2, deleted_at: '2024-01-01', privacy: 'public' } },
              ],
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
        GET,
        `/api/v1/hashtags/funny`,
        { name: 'funny' },
        { method: 'GET' }
      )

      expect(status).toBe(200)
      expect(data.gifs).toHaveLength(1)
    })

    it('should filter out private GIFs', async () => {
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'hashtags') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: testHashtags[0],
              error: null,
            }),
          }
        }
        if (table === 'gif_hashtags') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({
              data: [
                { gif: { ...aliceGif1, deleted_at: null, privacy: 'public' } },
                { gif: { ...aliceGif2, deleted_at: null, privacy: 'private' } },
              ],
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
        GET,
        `/api/v1/hashtags/funny`,
        { name: 'funny' },
        { method: 'GET' }
      )

      expect(status).toBe(200)
      expect(data.gifs).toHaveLength(1)
    })

    it('should include is_liked when authenticated', async () => {
      const token = await generateTestAccessToken(bob.id, bob.email)

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'hashtags') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: testHashtags[0],
              error: null,
            }),
          }
        }
        if (table === 'gif_hashtags') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({
              data: [
                { gif: { ...aliceGif1, deleted_at: null, privacy: 'public' } },
              ],
              error: null,
            }),
          }
        }
        if (table === 'likes') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [{ gif_id: aliceGif1.id }],
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
        GET,
        `/api/v1/hashtags/funny`,
        { name: 'funny' },
        { method: 'GET', headers: { Authorization: `Bearer ${token}` } }
      )

      expect(status).toBe(200)
      expect(data.gifs[0].is_liked).toBe(true)
    })

    it('should not include is_liked for unauthenticated requests', async () => {
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'hashtags') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: testHashtags[0],
              error: null,
            }),
          }
        }
        if (table === 'gif_hashtags') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({
              data: [
                { gif: { ...aliceGif1, deleted_at: null, privacy: 'public' } },
              ],
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
        GET,
        `/api/v1/hashtags/funny`,
        { name: 'funny' },
        { method: 'GET' }
      )

      expect(status).toBe(200)
      expect(data.gifs[0].is_liked).toBeUndefined()
    })

    it('should handle invalid token gracefully', async () => {
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'hashtags') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: testHashtags[0],
              error: null,
            }),
          }
        }
        if (table === 'gif_hashtags') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        }
      })

      const { status } = await testDynamicApiRoute(
        GET,
        `/api/v1/hashtags/funny`,
        { name: 'funny' },
        { method: 'GET', headers: { Authorization: 'Bearer invalid-token' } }
      )

      // Should still work, auth is optional
      expect(status).toBe(200)
    })
  })
})
