import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { testDynamicApiRoute } from '@/test/helpers/api'
import { generateTestAccessToken } from '@/test/helpers/auth'
import { alice, bob } from '@/test/fixtures/users'
import { aliceGif1, aliceGif2 } from '@/test/fixtures/gifs'

const mockSupabaseFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockSupabaseFrom,
  })),
}))

describe('User Profile API - /api/v1/users/[username]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/v1/users/[username]', () => {
    it('should return user profile for unauthenticated request', async () => {
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: alice.id,
                username: alice.username,
                display_name: alice.display_name,
                bio: alice.bio,
                avatar_url: alice.avatar_url,
                website: null,
                twitter_handle: null,
                youtube_channel: null,
                is_verified: alice.is_verified,
                gifs_count: alice.gifs_count,
                follower_count: alice.follower_count,
                following_count: alice.following_count,
                created_at: alice.created_at,
              },
              error: null,
            }),
          }
        }
        if (table === 'gifs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: [aliceGif1, aliceGif2],
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
        `/api/v1/users/${alice.username}`,
        { username: alice.username },
        { method: 'GET' }
      )

      expect(status).toBe(200)
      expect(data.user).toBeDefined()
      expect(data.user.username).toBe(alice.username)
      expect(data.user.is_following).toBe(false)
      expect(data.user.is_self).toBe(false)
      expect(data.gifs).toBeDefined()
    })

    it('should return 404 for non-existent user', async () => {
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
        `/api/v1/users/nonexistent`,
        { username: 'nonexistent' },
        { method: 'GET' }
      )

      expect(status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should normalize username to lowercase', async () => {
      let queriedUsername = ''
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation((field, value) => {
              if (field === 'username') {
                queriedUsername = value
              }
              return {
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: alice.id,
                    username: alice.username,
                  },
                  error: null,
                }),
              }
            }),
          }
        }
        if (table === 'gifs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
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
        `/api/v1/users/ALICE`,
        { username: 'ALICE' },
        { method: 'GET' }
      )

      expect(queriedUsername).toBe('alice')
    })

    it('should include is_following status when authenticated', async () => {
      const token = await generateTestAccessToken(bob.id, bob.email)

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: alice.id,
                username: alice.username,
                display_name: alice.display_name,
              },
              error: null,
            }),
          }
        }
        if (table === 'follows') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'follow-id' },
              error: null,
            }),
          }
        }
        if (table === 'gifs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
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
        `/api/v1/users/${alice.username}`,
        { username: alice.username },
        { method: 'GET', headers: { Authorization: `Bearer ${token}` } }
      )

      expect(status).toBe(200)
      expect(data.user.is_following).toBe(true)
    })

    it('should indicate is_self when viewing own profile', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: alice.id,
                username: alice.username,
              },
              error: null,
            }),
          }
        }
        if (table === 'gifs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
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
        `/api/v1/users/${alice.username}`,
        { username: alice.username },
        { method: 'GET', headers: { Authorization: `Bearer ${token}` } }
      )

      expect(status).toBe(200)
      expect(data.user.is_self).toBe(true)
    })

    it('should not check is_following for own profile', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

      let followsQueried = false
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: alice.id,
                username: alice.username,
              },
              error: null,
            }),
          }
        }
        if (table === 'follows') {
          followsQueried = true
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        if (table === 'gifs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
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
        `/api/v1/users/${alice.username}`,
        { username: alice.username },
        { method: 'GET', headers: { Authorization: `Bearer ${token}` } }
      )

      expect(followsQueried).toBe(false)
    })

    it('should return user gifs (public only)', async () => {
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: alice.id,
                username: alice.username,
              },
              error: null,
            }),
          }
        }
        if (table === 'gifs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: [
                {
                  id: aliceGif1.id,
                  file_url: aliceGif1.file_url,
                  title: aliceGif1.title,
                  like_count: aliceGif1.like_count,
                  view_count: aliceGif1.view_count,
                },
                {
                  id: aliceGif2.id,
                  file_url: aliceGif2.file_url,
                  title: aliceGif2.title,
                  like_count: aliceGif2.like_count,
                  view_count: aliceGif2.view_count,
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
        `/api/v1/users/${alice.username}`,
        { username: alice.username },
        { method: 'GET' }
      )

      expect(status).toBe(200)
      expect(data.gifs).toHaveLength(2)
      expect(data.gifs[0].id).toBe(aliceGif1.id)
    })

    it('should limit gifs to 20', async () => {
      let limitValue = 0
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: alice.id, username: alice.username },
              error: null,
            }),
          }
        }
        if (table === 'gifs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockImplementation((limit) => {
              limitValue = limit
              return Promise.resolve({ data: [], error: null })
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
        `/api/v1/users/${alice.username}`,
        { username: alice.username },
        { method: 'GET' }
      )

      expect(limitValue).toBe(20)
    })

    it('should handle invalid token gracefully', async () => {
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: alice.id, username: alice.username },
              error: null,
            }),
          }
        }
        if (table === 'gifs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        }
      })

      // Invalid token should still work (auth is optional)
      const { status, data } = await testDynamicApiRoute(
        GET,
        `/api/v1/users/${alice.username}`,
        { username: alice.username },
        { method: 'GET', headers: { Authorization: 'Bearer invalid-token' } }
      )

      expect(status).toBe(200)
      expect(data.user.is_following).toBe(false)
      expect(data.user.is_self).toBe(false)
    })
  })
})
