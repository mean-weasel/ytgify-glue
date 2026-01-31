import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { createTestRequest } from '@/test/helpers/api'
import { alice } from '@/test/fixtures/users'

// Mock Supabase
const mockSupabaseAuth = {
  signUp: vi.fn(),
}

const mockSupabaseFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: mockSupabaseAuth,
    from: mockSupabaseFrom,
  })),
}))

describe('POST /api/v1/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('successful registration', () => {
    it('should create user with valid params', async () => {
      const newUserId = '11111111-1111-1111-1111-111111111111'

      // Mock: username not taken
      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      })

      // Mock: signUp success
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: { id: newUserId, email: 'newuser@example.com' } },
        error: null,
      })

      // Mock: get profile
      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: newUserId,
            username: 'newuser',
            display_name: null,
            avatar_url: null,
            bio: null,
            gifs_count: 0,
            follower_count: 0,
            following_count: 0,
          },
          error: null,
        }),
      })

      const request = createTestRequest('/api/v1/auth/register', {
        method: 'POST',
        body: {
          email: 'newuser@example.com',
          username: 'newuser',
          password: 'password123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.token).toBeDefined()
      expect(data.access_token).toBeDefined()
      expect(data.refresh_token).toBeDefined()
      expect(data.user.email).toBe('newuser@example.com')
      expect(data.user.username).toBe('newuser')
    })

    it('should accept extension format with user wrapper', async () => {
      const newUserId = '22222222-2222-2222-2222-222222222222'

      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      })

      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: { id: newUserId, email: 'extension@example.com' } },
        error: null,
      })

      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: newUserId,
            username: 'extensionuser',
            display_name: null,
            avatar_url: null,
            bio: null,
            gifs_count: 0,
            follower_count: 0,
            following_count: 0,
          },
          error: null,
        }),
      })

      const request = createTestRequest('/api/v1/auth/register', {
        method: 'POST',
        body: {
          user: {
            email: 'extension@example.com',
            username: 'extensionuser',
            password: 'password123',
            password_confirmation: 'password123',
          },
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
    })

    it('should return all required user fields', async () => {
      const newUserId = '33333333-3333-3333-3333-333333333333'

      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      })

      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: { id: newUserId, email: 'complete@example.com' } },
        error: null,
      })

      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: newUserId,
            username: 'completeuser',
            display_name: 'Complete User',
            avatar_url: 'https://example.com/avatar.jpg',
            bio: 'Test bio',
            gifs_count: 0,
            follower_count: 0,
            following_count: 0,
          },
          error: null,
        }),
      })

      const request = createTestRequest('/api/v1/auth/register', {
        method: 'POST',
        body: {
          email: 'complete@example.com',
          username: 'completeuser',
          password: 'password123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.user).toMatchObject({
        id: newUserId,
        email: 'complete@example.com',
        username: 'completeuser',
        display_name: 'Complete User',
        avatar_url: 'https://example.com/avatar.jpg',
        bio: 'Test bio',
        gifs_count: 0,
        follower_count: 0,
        following_count: 0,
      })
    })
  })

  describe('validation errors', () => {
    it('should fail with duplicate username', async () => {
      // Mock: username already taken
      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: alice.id }, error: null }),
      })

      const request = createTestRequest('/api/v1/auth/register', {
        method: 'POST',
        body: {
          email: 'new@example.com',
          username: alice.username,
          password: 'password123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('Username is already taken')
    })

    it('should fail with invalid email', async () => {
      const request = createTestRequest('/api/v1/auth/register', {
        method: 'POST',
        body: {
          email: 'not-an-email',
          username: 'validuser',
          password: 'password123',
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should fail with short password', async () => {
      const request = createTestRequest('/api/v1/auth/register', {
        method: 'POST',
        body: {
          email: 'test@example.com',
          username: 'validuser',
          password: '12345', // Too short (min 8)
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request')
    })

    it('should fail with missing email', async () => {
      const request = createTestRequest('/api/v1/auth/register', {
        method: 'POST',
        body: {
          username: 'validuser',
          password: 'password123',
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should fail with missing username', async () => {
      const request = createTestRequest('/api/v1/auth/register', {
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should fail with missing password', async () => {
      const request = createTestRequest('/api/v1/auth/register', {
        method: 'POST',
        body: {
          email: 'test@example.com',
          username: 'validuser',
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should fail with short username', async () => {
      const request = createTestRequest('/api/v1/auth/register', {
        method: 'POST',
        body: {
          email: 'test@example.com',
          username: 'ab', // Too short (min 3)
          password: 'password123',
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should fail with invalid username characters', async () => {
      const request = createTestRequest('/api/v1/auth/register', {
        method: 'POST',
        body: {
          email: 'test@example.com',
          username: 'user@name', // Invalid characters
          password: 'password123',
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })
  })

  describe('auth errors', () => {
    it('should handle Supabase auth errors', async () => {
      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      })

      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'User already registered' },
      })

      const request = createTestRequest('/api/v1/auth/register', {
        method: 'POST',
        body: {
          email: 'existing@example.com',
          username: 'newusername',
          password: 'password123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('User already registered')
    })
  })
})
