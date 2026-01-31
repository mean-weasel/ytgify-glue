import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, PATCH, DELETE } from './route'
import { testDynamicApiRoute } from '@/test/helpers/api'
import { generateTestAccessToken } from '@/test/helpers/auth'
import { alice, bob } from '@/test/fixtures/users'
import { aliceGif1, alicePrivateGif, nonExistentGifId } from '@/test/fixtures/gifs'

const mockSupabaseFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockSupabaseFrom,
  })),
}))

describe('GIF API - /api/v1/gifs/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/v1/gifs/[id]', () => {
    it('should return GIF details for public GIF', async () => {
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'gifs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                ...aliceGif1,
                user: {
                  id: alice.id,
                  username: alice.username,
                  display_name: alice.display_name,
                  avatar_url: alice.avatar_url,
                  is_verified: alice.is_verified,
                  follower_count: alice.follower_count,
                  following_count: alice.following_count,
                  gifs_count: alice.gifs_count,
                },
                hashtags: [],
              },
              error: null,
            }),
            update: vi.fn().mockReturnThis(),
            then: vi.fn((cb) => cb({})),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      })

      const { status, data } = await testDynamicApiRoute(
        GET,
        `/api/v1/gifs/${aliceGif1.id}`,
        { id: aliceGif1.id },
        { method: 'GET' }
      )

      expect(status).toBe(200)
      expect(data.gif.id).toBe(aliceGif1.id)
      expect(data.gif.title).toBe(aliceGif1.title)
      expect(data.gif.user.username).toBe(alice.username)
    })

    it('should include is_liked status when authenticated', async () => {
      const token = await generateTestAccessToken(bob.id, bob.email)

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'gifs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                ...aliceGif1,
                user: {
                  id: alice.id,
                  username: alice.username,
                  display_name: alice.display_name,
                  avatar_url: alice.avatar_url,
                  is_verified: alice.is_verified,
                  follower_count: alice.follower_count,
                  following_count: alice.following_count,
                  gifs_count: alice.gifs_count,
                },
                hashtags: [],
              },
              error: null,
            }),
            update: vi.fn().mockReturnThis(),
            then: vi.fn((cb) => cb({})),
          }
        }
        if (table === 'likes') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'like-id' }, error: null }),
          }
        }
        if (table === 'follows') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      })

      const { status, data } = await testDynamicApiRoute(
        GET,
        `/api/v1/gifs/${aliceGif1.id}`,
        { id: aliceGif1.id },
        { method: 'GET', headers: { Authorization: `Bearer ${token}` } }
      )

      expect(status).toBe(200)
      expect(data.gif.is_liked).toBe(true)
    })

    it('should return 404 for non-existent GIF', async () => {
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
        GET,
        `/api/v1/gifs/${nonExistentGifId}`,
        { id: nonExistentGifId },
        { method: 'GET' }
      )

      expect(status).toBe(404)
      expect(data.error).toBe('GIF not found')
    })

    it('should return 404 for private GIF when not owner', async () => {
      const token = await generateTestAccessToken(bob.id, bob.email)

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'gifs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                ...alicePrivateGif,
                user: {
                  id: alice.id,
                  username: alice.username,
                  display_name: alice.display_name,
                  avatar_url: alice.avatar_url,
                  is_verified: alice.is_verified,
                  follower_count: alice.follower_count,
                  following_count: alice.following_count,
                  gifs_count: alice.gifs_count,
                },
                hashtags: [],
              },
              error: null,
            }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      })

      const { status } = await testDynamicApiRoute(
        GET,
        `/api/v1/gifs/${alicePrivateGif.id}`,
        { id: alicePrivateGif.id },
        { method: 'GET', headers: { Authorization: `Bearer ${token}` } }
      )

      expect(status).toBe(404)
    })
  })

  describe('PATCH /api/v1/gifs/[id]', () => {
    it('should update GIF when owner', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'gifs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: aliceGif1.id, user_id: alice.id },
              error: null,
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { ...aliceGif1, title: 'Updated Title' },
                error: null,
              }),
            }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      })

      const { status, data } = await testDynamicApiRoute(
        PATCH,
        `/api/v1/gifs/${aliceGif1.id}`,
        { id: aliceGif1.id },
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
          body: { title: 'Updated Title' },
        }
      )

      expect(status).toBe(200)
      expect(data.gif.title).toBe('Updated Title')
    })

    it('should return 401 without auth', async () => {
      const { status, data } = await testDynamicApiRoute(
        PATCH,
        `/api/v1/gifs/${aliceGif1.id}`,
        { id: aliceGif1.id },
        {
          method: 'PATCH',
          body: { title: 'Updated Title' },
        }
      )

      expect(status).toBe(401)
      expect(data.error).toBe('Missing authorization token')
    })

    it('should return 403 when not owner', async () => {
      const token = await generateTestAccessToken(bob.id, bob.email)

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: aliceGif1.id, user_id: alice.id }, // Alice owns it
          error: null,
        }),
      })

      const { status, data } = await testDynamicApiRoute(
        PATCH,
        `/api/v1/gifs/${aliceGif1.id}`,
        { id: aliceGif1.id },
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
          body: { title: 'Updated Title' },
        }
      )

      expect(status).toBe(403)
      expect(data.error).toBe('Not authorized to update this GIF')
    })

    it('should return 404 for non-existent GIF', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      })

      const { status } = await testDynamicApiRoute(
        PATCH,
        `/api/v1/gifs/${nonExistentGifId}`,
        { id: nonExistentGifId },
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
          body: { title: 'Updated Title' },
        }
      )

      expect(status).toBe(404)
    })
  })

  describe('DELETE /api/v1/gifs/[id]', () => {
    it('should soft delete GIF when owner', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'gifs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: aliceGif1.id, user_id: alice.id },
              error: null,
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      })

      const { status, data } = await testDynamicApiRoute(
        DELETE,
        `/api/v1/gifs/${aliceGif1.id}`,
        { id: aliceGif1.id },
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      expect(status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return 401 without auth', async () => {
      const { status, data } = await testDynamicApiRoute(
        DELETE,
        `/api/v1/gifs/${aliceGif1.id}`,
        { id: aliceGif1.id },
        { method: 'DELETE' }
      )

      expect(status).toBe(401)
      expect(data.error).toBe('Missing authorization token')
    })

    it('should return 403 when not owner', async () => {
      const token = await generateTestAccessToken(bob.id, bob.email)

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: aliceGif1.id, user_id: alice.id },
          error: null,
        }),
      })

      const { status, data } = await testDynamicApiRoute(
        DELETE,
        `/api/v1/gifs/${aliceGif1.id}`,
        { id: aliceGif1.id },
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      expect(status).toBe(403)
      expect(data.error).toBe('Not authorized to delete this GIF')
    })

    it('should return 404 for non-existent GIF', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      })

      const { status } = await testDynamicApiRoute(
        DELETE,
        `/api/v1/gifs/${nonExistentGifId}`,
        { id: nonExistentGifId },
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      expect(status).toBe(404)
    })
  })
})
