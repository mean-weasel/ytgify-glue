import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { testApiRoute } from '@/test/helpers/api'
import { trendingHashtags } from '@/test/fixtures/hashtags'

const mockSupabaseFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockSupabaseFrom,
  })),
}))

describe('Trending Hashtags API - /api/v1/hashtags/trending', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/v1/hashtags/trending', () => {
    it('should return trending hashtags', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: trendingHashtags,
          error: null,
        }),
      })

      const { status, data } = await testApiRoute(
        GET,
        '/api/v1/hashtags/trending',
        { method: 'GET' }
      )

      expect(status).toBe(200)
      expect(data.hashtags).toBeDefined()
      expect(data.hashtags.length).toBeGreaterThan(0)
    })

    it('should default to 10 results', async () => {
      let limitValue = 0
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation((limit) => {
          limitValue = limit
          return Promise.resolve({ data: [], error: null })
        }),
      })

      await testApiRoute(GET, '/api/v1/hashtags/trending', {
        method: 'GET',
      })

      expect(limitValue).toBe(10)
    })

    it('should support custom limit', async () => {
      let limitValue = 0
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation((limit) => {
          limitValue = limit
          return Promise.resolve({ data: [], error: null })
        }),
      })

      await testApiRoute(GET, '/api/v1/hashtags/trending', {
        method: 'GET',
        searchParams: { limit: '25' },
      })

      expect(limitValue).toBe(25)
    })

    it('should limit max to 50', async () => {
      let limitValue = 0
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation((limit) => {
          limitValue = limit
          return Promise.resolve({ data: [], error: null })
        }),
      })

      await testApiRoute(GET, '/api/v1/hashtags/trending', {
        method: 'GET',
        searchParams: { limit: '100' },
      })

      expect(limitValue).toBe(50)
    })

    it('should only return hashtags with gifs_count > 0', async () => {
      let gtField = ''
      let gtValue = 0
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        gt: vi.fn().mockImplementation((field, value) => {
          gtField = field
          gtValue = value
          return {
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: trendingHashtags,
              error: null,
            }),
          }
        }),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: trendingHashtags,
          error: null,
        }),
      })

      const { status } = await testApiRoute(
        GET,
        '/api/v1/hashtags/trending',
        { method: 'GET' }
      )

      expect(status).toBe(200)
      expect(gtField).toBe('gifs_count')
      expect(gtValue).toBe(0)
    })

    it('should order by gifs_count descending', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: trendingHashtags,
          error: null,
        }),
      })

      const { status, data } = await testApiRoute(
        GET,
        '/api/v1/hashtags/trending',
        { method: 'GET' }
      )

      expect(status).toBe(200)
      // Verify ordering (first has more than second)
      if (data.hashtags.length >= 2) {
        expect(data.hashtags[0].gifs_count).toBeGreaterThanOrEqual(
          data.hashtags[1].gifs_count
        )
      }
    })

    it('should handle database error', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      })

      const { status, data } = await testApiRoute(
        GET,
        '/api/v1/hashtags/trending',
        { method: 'GET' }
      )

      expect(status).toBe(500)
      expect(data.error).toBe('Failed to fetch trending hashtags')
    })

    it('should handle empty results', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      })

      const { status, data } = await testApiRoute(
        GET,
        '/api/v1/hashtags/trending',
        { method: 'GET' }
      )

      expect(status).toBe(200)
      expect(data.hashtags).toEqual([])
    })
  })
})
