import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './route'
import { testApiRoute } from '@/test/helpers/api'
import { generateTestAccessToken } from '@/test/helpers/auth'
import { alice, bob } from '@/test/fixtures/users'
import { aliceCollection1, bobCollection1 } from '@/test/fixtures/collections'

const mockSupabaseFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockSupabaseFrom,
  })),
}))

describe('Collections API - /api/v1/collections', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/v1/collections', () => {
    it('should require authentication', async () => {
      const { status, data } = await testApiRoute(GET, '/api/v1/collections', {
        method: 'GET',
      })

      expect(status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should return 401 for invalid token', async () => {
      const { status, data } = await testApiRoute(GET, '/api/v1/collections', {
        method: 'GET',
        headers: { Authorization: 'Bearer invalid-token' },
      })

      expect(status).toBe(401)
      expect(data.error).toBe('Invalid or expired token')
    })

    it('should return user collections', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'collections') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({
              data: [
                {
                  ...aliceCollection1,
                  gifs_count: [{ count: 5 }],
                },
              ],
              error: null,
            }),
          }
        }
        if (table === 'collection_gifs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                gif: { thumbnail_url: 'https://example.com/thumb.gif' },
              },
              error: null,
            }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        }
      })

      const { status, data } = await testApiRoute(GET, '/api/v1/collections', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })

      expect(status).toBe(200)
      expect(data.collections).toBeDefined()
      expect(data.page).toBe(1)
      expect(data.limit).toBe(20)
    })

    it('should support pagination', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'collections') {
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

      const { status, data } = await testApiRoute(GET, '/api/v1/collections', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        searchParams: { page: '2', limit: '10' },
      })

      expect(status).toBe(200)
      expect(data.page).toBe(2)
      expect(data.limit).toBe(10)
    })

    it('should limit max page size to 50', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'collections') {
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

      const { status, data } = await testApiRoute(GET, '/api/v1/collections', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        searchParams: { limit: '100' },
      })

      expect(status).toBe(200)
      expect(data.limit).toBe(50)
    })

    it('should include cover_url from first gif in collection', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'collections') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({
              data: [{ id: aliceCollection1.id, name: aliceCollection1.name }],
              error: null,
            }),
          }
        }
        if (table === 'collection_gifs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                gif: {
                  thumbnail_url: 'https://example.com/thumbnail.gif',
                  file_url: 'https://example.com/full.gif',
                },
              },
              error: null,
            }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        }
      })

      const { status, data } = await testApiRoute(GET, '/api/v1/collections', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })

      expect(status).toBe(200)
      expect(data.collections[0].cover_url).toBe('https://example.com/thumbnail.gif')
    })

    it('should use file_url as cover if no thumbnail', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'collections') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({
              data: [{ id: aliceCollection1.id, name: aliceCollection1.name }],
              error: null,
            }),
          }
        }
        if (table === 'collection_gifs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                gif: {
                  thumbnail_url: null,
                  file_url: 'https://example.com/full.gif',
                },
              },
              error: null,
            }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        }
      })

      const { status, data } = await testApiRoute(GET, '/api/v1/collections', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })

      expect(status).toBe(200)
      expect(data.collections[0].cover_url).toBe('https://example.com/full.gif')
    })

    it('should handle empty collections', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'collections') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({
              data: [{ id: aliceCollection1.id, name: aliceCollection1.name }],
              error: null,
            }),
          }
        }
        if (table === 'collection_gifs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        }
      })

      const { status, data } = await testApiRoute(GET, '/api/v1/collections', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })

      expect(status).toBe(200)
      expect(data.collections[0].cover_url).toBeNull()
    })
  })

  describe('POST /api/v1/collections', () => {
    it('should require authentication', async () => {
      const { status, data } = await testApiRoute(POST, '/api/v1/collections', {
        method: 'POST',
        body: { name: 'Test Collection' },
      })

      expect(status).toBe(401)
      expect(data.error).toBe('Missing authorization token')
    })

    it('should validate name is required', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

      const { status, data } = await testApiRoute(POST, '/api/v1/collections', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: {},
      })

      expect(status).toBe(400)
      expect(data.error).toBe('Invalid data')
    })

    it('should validate name min length', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

      const { status, data } = await testApiRoute(POST, '/api/v1/collections', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: { name: '' },
      })

      expect(status).toBe(400)
      expect(data.error).toBe('Invalid data')
    })

    it('should validate name max length (100 chars)', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

      const longName = 'a'.repeat(101)
      const { status, data } = await testApiRoute(POST, '/api/v1/collections', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: { name: longName },
      })

      expect(status).toBe(400)
      expect(data.error).toBe('Invalid data')
    })

    it('should validate description max length (500 chars)', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

      const longDesc = 'a'.repeat(501)
      const { status, data } = await testApiRoute(POST, '/api/v1/collections', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: { name: 'Test', description: longDesc },
      })

      expect(status).toBe(400)
      expect(data.error).toBe('Invalid data')
    })

    it('should validate privacy enum', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

      const { status, data } = await testApiRoute(POST, '/api/v1/collections', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: { name: 'Test', privacy: 'invalid' },
      })

      expect(status).toBe(400)
      expect(data.error).toBe('Invalid data')
    })

    it('should create collection successfully', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

      mockSupabaseFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'new-collection-id',
                user_id: alice.id,
                name: 'My Favorites',
                description: 'Best GIFs',
                privacy: 'public',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              error: null,
            }),
          }),
        }),
      })

      const { status, data } = await testApiRoute(POST, '/api/v1/collections', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          name: 'My Favorites',
          description: 'Best GIFs',
          privacy: 'public',
        },
      })

      expect(status).toBe(201)
      expect(data.collection).toBeDefined()
      expect(data.collection.id).toBe('new-collection-id')
      expect(data.collection.name).toBe('My Favorites')
    })

    it('should default privacy to public', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

      let insertedData: Record<string, unknown> | null = null
      mockSupabaseFrom.mockReturnValue({
        insert: vi.fn().mockImplementation((data) => {
          insertedData = data
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'new-id', ...data },
                error: null,
              }),
            }),
          }
        }),
      })

      const { status } = await testApiRoute(POST, '/api/v1/collections', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: { name: 'Test Collection' },
      })

      expect(status).toBe(201)
      expect(insertedData?.privacy).toBe('public')
    })

    it('should allow private collections', async () => {
      const token = await generateTestAccessToken(alice.id, alice.email)

      mockSupabaseFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'new-collection-id',
                name: 'Private Collection',
                privacy: 'private',
              },
              error: null,
            }),
          }),
        }),
      })

      const { status, data } = await testApiRoute(POST, '/api/v1/collections', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: { name: 'Private Collection', privacy: 'private' },
      })

      expect(status).toBe(201)
      expect(data.collection.privacy).toBe('private')
    })
  })
})
