import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './route'
import { testApiRoute } from '@/test/helpers/api'
import { generateTestAccessToken } from '@/test/helpers/auth'
import { alice, bob } from '@/test/fixtures/users'
import { aliceGif1, aliceGif2, bobGif1 } from '@/test/fixtures/gifs'

const mockSupabaseFrom = vi.fn()
const mockSupabaseStorage = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockSupabaseFrom,
    storage: {
      from: mockSupabaseStorage,
    },
  })),
}))

describe('GIF API - /api/v1/gifs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/v1/gifs (Feed)', () => {
    it('should return trending GIFs by default', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [
            {
              ...aliceGif1,
              user: {
                id: alice.id,
                username: alice.username,
                display_name: alice.display_name,
                avatar_url: alice.avatar_url,
                is_verified: alice.is_verified,
              },
            },
            {
              ...aliceGif2,
              user: {
                id: alice.id,
                username: alice.username,
                display_name: alice.display_name,
                avatar_url: alice.avatar_url,
                is_verified: alice.is_verified,
              },
            },
          ],
          error: null,
        }),
      })

      const { status, data } = await testApiRoute(GET, '/api/v1/gifs', {
        method: 'GET',
      })

      expect(status).toBe(200)
      expect(data.gifs).toHaveLength(2)
      expect(data.page).toBe(1)
      expect(data.limit).toBe(20)
    })

    it('should support pagination', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [aliceGif1],
          error: null,
        }),
      })

      const { status, data } = await testApiRoute(GET, '/api/v1/gifs', {
        method: 'GET',
        searchParams: { page: '2', limit: '10' },
      })

      expect(status).toBe(200)
      expect(data.page).toBe(2)
      expect(data.limit).toBe(10)
    })

    it('should support latest feed type', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      })

      const { status, data } = await testApiRoute(GET, '/api/v1/gifs', {
        method: 'GET',
        searchParams: { type: 'latest' },
      })

      expect(status).toBe(200)
      expect(data.gifs).toEqual([])
    })

    it('should support following feed type when authenticated', async () => {
      const token = await generateTestAccessToken(bob.id, bob.email)

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'follows') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [{ following_id: alice.id }],
              error: null,
            }),
          }
        }
        if (table === 'gifs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({
              data: [aliceGif1],
              error: null,
            }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        }
      })

      const { status, data } = await testApiRoute(GET, '/api/v1/gifs', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        searchParams: { type: 'following' },
      })

      expect(status).toBe(200)
      expect(data.gifs).toBeDefined()
    })

    it('should return empty for following feed when not following anyone', async () => {
      const token = await generateTestAccessToken(bob.id, bob.email)

      // The gifs query chain is built first (lines 288-301 in route.ts),
      // then follows is queried to check who user follows
      // When no one is followed, it returns early with empty gifs
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'gifs') {
          // This chain is built but not executed when follows returns empty
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        if (table === 'follows') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        }
      })

      const { status, data } = await testApiRoute(GET, '/api/v1/gifs', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        searchParams: { type: 'following' },
      })

      expect(status).toBe(200)
      expect(data.gifs).toEqual([])
      expect(data.has_more).toBe(false)
    })

    it('should limit max page size to 50', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      })

      const { status, data } = await testApiRoute(GET, '/api/v1/gifs', {
        method: 'GET',
        searchParams: { limit: '100' },
      })

      expect(status).toBe(200)
      expect(data.limit).toBe(50)
    })
  })

  describe('POST /api/v1/gifs (Upload)', () => {
    it('should require authentication', async () => {
      const formData = new FormData()
      formData.append('file', new Blob(['GIF89a'], { type: 'image/gif' }), 'test.gif')

      const request = new Request('http://localhost/api/v1/gifs', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
    })

    it('should return 401 for invalid token', async () => {
      const formData = new FormData()
      formData.append('file', new Blob(['GIF89a'], { type: 'image/gif' }), 'test.gif')

      const request = new Request('http://localhost/api/v1/gifs', {
        method: 'POST',
        headers: { Authorization: 'Bearer invalid-token' },
        body: formData,
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
    })

    it('should require file in form data', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)
      const formData = new FormData()

      const request = new Request('http://localhost/api/v1/gifs', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('No file provided')
    })

    it('should reject non-GIF files', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)
      const formData = new FormData()
      formData.append('file', new Blob(['PNG'], { type: 'image/png' }), 'test.png')

      const request = new Request('http://localhost/api/v1/gifs', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('File must be a GIF')
    })

    it('should reject files over 50MB', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

      // Create a mock FormData with a large file
      // We need to mock the formData method since we can't easily create a File with custom size
      const mockFile = {
        type: 'image/gif',
        size: 51 * 1024 * 1024, // Over 50MB
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      }

      const mockFormData = {
        get: vi.fn().mockImplementation((key) => {
          if (key === 'file') return mockFile
          return null
        }),
        entries: vi.fn().mockReturnValue([['file', mockFile]][Symbol.iterator]()),
      }

      const request = {
        headers: {
          get: vi.fn().mockImplementation((name) => {
            if (name === 'Authorization') return `Bearer ${token}`
            return null
          }),
        },
        formData: vi.fn().mockResolvedValue(mockFormData),
      } as unknown as Request

      const response = await POST(request)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('File size exceeds 50MB limit')
    })

    it('should upload GIF successfully', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

      mockSupabaseStorage.mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.example.com/gifs/test.gif' },
        }),
      })

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'gifs') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'new-gif-id',
                    file_url: 'https://storage.example.com/gifs/test.gif',
                    thumbnail_url: null,
                    title: 'Test GIF',
                    like_count: 0,
                    comment_count: 0,
                    view_count: 0,
                    privacy: 'public',
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    username: alice.username,
                    display_name: alice.display_name,
                    avatar_url: alice.avatar_url,
                  },
                  error: null,
                }),
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

      const formData = new FormData()
      const gifContent = 'GIF89a' + '\x00'.repeat(100)
      formData.append('file', new Blob([gifContent], { type: 'image/gif' }), 'test.gif')
      formData.append('title', 'Test GIF')
      formData.append('privacy', 'public')

      const request = new Request('http://localhost/api/v1/gifs', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.gif).toBeDefined()
      expect(data.gif.id).toBe('new-gif-id')
    })

    it('should support Rails-style form keys (gif[field])', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

      mockSupabaseStorage.mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.example.com/gifs/test.gif' },
        }),
      })

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'gifs') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'new-gif-id',
                    file_url: 'https://storage.example.com/gifs/test.gif',
                    title: 'Rails Style Title',
                    privacy: 'public',
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { username: alice.username },
                  error: null,
                }),
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

      const formData = new FormData()
      formData.append('gif[file]', new Blob(['GIF89a'], { type: 'image/gif' }), 'test.gif')
      formData.append('gif[title]', 'Rails Style Title')
      formData.append('gif[privacy]', 'public')

      const request = new Request('http://localhost/api/v1/gifs', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
    })

    it('should transform public_access to public privacy', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

      mockSupabaseStorage.mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.example.com/gifs/test.gif' },
        }),
      })

      let insertedData: Record<string, unknown> | null = null
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'gifs') {
          return {
            insert: vi.fn().mockImplementation((data) => {
              insertedData = data
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'new-gif-id', ...data },
                    error: null,
                  }),
                }),
              }
            }),
          }
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { username: alice.username },
                  error: null,
                }),
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

      const formData = new FormData()
      formData.append('file', new Blob(['GIF89a'], { type: 'image/gif' }), 'test.gif')
      formData.append('privacy', 'public_access')

      const request = new Request('http://localhost/api/v1/gifs', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
      expect(insertedData?.privacy).toBe('public')
    })

    it('should handle hashtags from form data', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

      mockSupabaseStorage.mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.example.com/gifs/test.gif' },
        }),
      })

      const hashtagUpsertCalls: string[] = []
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'gifs') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'new-gif-id' },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'hashtags') {
          return {
            upsert: vi.fn().mockImplementation((data) => {
              hashtagUpsertCalls.push(data.name)
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: `hashtag-${data.name}` },
                    error: null,
                  }),
                }),
              }
            }),
          }
        }
        if (table === 'gif_hashtags') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { username: alice.username },
                  error: null,
                }),
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

      const formData = new FormData()
      formData.append('file', new Blob(['GIF89a'], { type: 'image/gif' }), 'test.gif')
      formData.append('hashtags', 'funny, cats, meme')

      const request = new Request('http://localhost/api/v1/gifs', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
      expect(hashtagUpsertCalls).toContain('funny')
      expect(hashtagUpsertCalls).toContain('cats')
      expect(hashtagUpsertCalls).toContain('meme')
    })
  })
})
