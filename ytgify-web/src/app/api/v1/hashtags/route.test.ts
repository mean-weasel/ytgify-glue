import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { testApiRoute } from '@/test/helpers/api'
import { testHashtags, trendingHashtags } from '@/test/fixtures/hashtags'

const mockSupabaseFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockSupabaseFrom,
  })),
}))

describe('Hashtags API - /api/v1/hashtags', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/v1/hashtags', () => {
    it('should return list of hashtags ordered by gifs_count', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: trendingHashtags,
          error: null,
        }),
      })

      const { status, data } = await testApiRoute(GET, '/api/v1/hashtags', {
        method: 'GET',
      })

      expect(status).toBe(200)
      expect(data.hashtags).toBeDefined()
      expect(data.page).toBe(1)
      expect(data.limit).toBe(20)
    })

    it('should support search with q parameter', async () => {
      let searchValue = ''
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockImplementation((field, value) => {
          if (field === 'name') {
            searchValue = value
          }
          return {
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({
              data: [testHashtags[0]],
              error: null,
            }),
          }
        }),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [testHashtags[0]],
          error: null,
        }),
      })

      const { status, data } = await testApiRoute(GET, '/api/v1/hashtags', {
        method: 'GET',
        searchParams: { q: 'funny' },
      })

      expect(status).toBe(200)
      expect(searchValue).toBe('%funny%')
    })

    it('should support search with query parameter', async () => {
      let searchValue = ''
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockImplementation((field, value) => {
          if (field === 'name') {
            searchValue = value
          }
          return {
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }
        }),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      })

      const { status } = await testApiRoute(GET, '/api/v1/hashtags', {
        method: 'GET',
        searchParams: { query: 'cats' },
      })

      expect(status).toBe(200)
      expect(searchValue).toBe('%cats%')
    })

    it('should support pagination', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      })

      const { status, data } = await testApiRoute(GET, '/api/v1/hashtags', {
        method: 'GET',
        searchParams: { page: '2', limit: '10' },
      })

      expect(status).toBe(200)
      expect(data.page).toBe(2)
      expect(data.limit).toBe(10)
    })

    it('should limit max page size to 50', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      })

      const { status, data } = await testApiRoute(GET, '/api/v1/hashtags', {
        method: 'GET',
        searchParams: { limit: '100' },
      })

      expect(status).toBe(200)
      expect(data.limit).toBe(50)
    })

    it('should indicate has_more when results match limit', async () => {
      const mockData = Array(20).fill(null).map((_, i) => ({
        id: `hashtag-${i}`,
        name: `hashtag${i}`,
        gifs_count: 100 - i,
      }))

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      })

      const { status, data } = await testApiRoute(GET, '/api/v1/hashtags', {
        method: 'GET',
      })

      expect(status).toBe(200)
      expect(data.has_more).toBe(true)
    })

    it('should indicate has_more false when results less than limit', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [testHashtags[0]],
          error: null,
        }),
      })

      const { status, data } = await testApiRoute(GET, '/api/v1/hashtags', {
        method: 'GET',
      })

      expect(status).toBe(200)
      expect(data.has_more).toBe(false)
    })

    it('should handle database error', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      })

      const { status, data } = await testApiRoute(GET, '/api/v1/hashtags', {
        method: 'GET',
      })

      expect(status).toBe(500)
      expect(data.error).toBe('Failed to fetch hashtags')
    })
  })
})
