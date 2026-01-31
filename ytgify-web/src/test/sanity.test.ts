import { describe, it, expect } from 'vitest'
import { generateTestAccessToken, authHeaders } from './helpers/auth'
import { createTestRequest, testApiRoute } from './helpers/api'
import { alice, bob, testUsers } from './fixtures/users'
import { aliceGif1, testGifs } from './fixtures/gifs'
import { testHashtags, trendingHashtags } from './fixtures/hashtags'

describe('Test Setup', () => {
  it('should have test environment configured', () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co')
    expect(process.env.JWT_SECRET).toBeDefined()
  })

  it('should run basic assertions', () => {
    expect(1 + 1).toBe(2)
    expect('hello').toContain('ell')
    expect([1, 2, 3]).toHaveLength(3)
  })

  it('should handle async tests', async () => {
    const result = await Promise.resolve('async value')
    expect(result).toBe('async value')
  })
})

describe('Test Fixtures', () => {
  it('should have user fixtures', () => {
    expect(alice.id).toBeDefined()
    expect(alice.email).toBe('alice@example.com')
    expect(bob.username).toBe('bob')
    expect(testUsers).toHaveLength(3)
  })

  it('should have GIF fixtures', () => {
    expect(aliceGif1.user_id).toBe(alice.id)
    expect(testGifs.length).toBeGreaterThan(0)
  })

  it('should have hashtag fixtures', () => {
    expect(testHashtags.length).toBeGreaterThan(0)
    expect(trendingHashtags[0].gifs_count).toBeGreaterThan(trendingHashtags[1].gifs_count)
  })
})

describe('Auth Helpers', () => {
  it('should generate valid access token', async () => {
    const token = await generateTestAccessToken(alice.id, alice.email)
    expect(token).toBeDefined()
    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3) // JWT format
  })

  it('should create auth headers', async () => {
    const headers = await authHeaders(alice.id, alice.email)
    expect(headers).toHaveProperty('Authorization')
    expect((headers as Record<string, string>)['Authorization']).toMatch(/^Bearer /)
  })
})

describe('API Helpers', () => {
  it('should create test request with GET method', () => {
    const request = createTestRequest('/api/v1/gifs')
    expect(request.method).toBe('GET')
    expect(request.url).toContain('/api/v1/gifs')
  })

  it('should create test request with POST method and body', () => {
    const request = createTestRequest('/api/v1/gifs', {
      method: 'POST',
      body: { title: 'Test GIF' },
    })
    expect(request.method).toBe('POST')
  })

  it('should create test request with search params', () => {
    const request = createTestRequest('/api/v1/gifs', {
      searchParams: { page: '1', limit: '20' },
    })
    expect(request.url).toContain('page=1')
    expect(request.url).toContain('limit=20')
  })

  it('should work with testApiRoute helper', async () => {
    // Mock a simple handler
    const mockHandler = async () => {
      return Response.json({ message: 'ok' })
    }

    const { status, data } = await testApiRoute(mockHandler, '/test')
    expect(status).toBe(200)
    expect(data).toEqual({ message: 'ok' })
  })
})
