import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { createTestRequest } from '@/test/helpers/api'
import { alice } from '@/test/fixtures/users'

// Mock Supabase
const mockSupabaseAuth = {
  signInWithPassword: vi.fn(),
}

const mockSupabaseFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: mockSupabaseAuth,
    from: mockSupabaseFrom,
  })),
}))

describe('POST /api/v1/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('successful login', () => {
    it('should login with valid credentials', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: { id: alice.id, email: alice.email } },
        error: null,
      })

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: alice.id,
            username: alice.username,
            display_name: alice.display_name,
            avatar_url: alice.avatar_url,
            bio: alice.bio,
            gifs_count: alice.gifs_count,
            follower_count: alice.follower_count,
            following_count: alice.following_count,
          },
          error: null,
        }),
      })

      const request = createTestRequest('/api/v1/auth/login', {
        method: 'POST',
        body: {
          email: alice.email,
          password: 'password123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.token).toBeDefined()
      expect(data.access_token).toBeDefined()
      expect(data.refresh_token).toBeDefined()
      expect(data.user.email).toBe(alice.email)
      expect(data.user.username).toBe(alice.username)
    })

    it('should accept extension format with user wrapper', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: { id: alice.id, email: alice.email } },
        error: null,
      })

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: alice.id,
            username: alice.username,
            display_name: alice.display_name,
            avatar_url: alice.avatar_url,
            bio: alice.bio,
            gifs_count: alice.gifs_count,
            follower_count: alice.follower_count,
            following_count: alice.following_count,
          },
          error: null,
        }),
      })

      const request = createTestRequest('/api/v1/auth/login', {
        method: 'POST',
        body: {
          user: {
            email: alice.email,
            password: 'password123',
          },
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should return valid JWT tokens', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: { id: alice.id, email: alice.email } },
        error: null,
      })

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: alice.id,
            username: alice.username,
            display_name: alice.display_name,
            avatar_url: alice.avatar_url,
            bio: alice.bio,
            gifs_count: alice.gifs_count,
            follower_count: alice.follower_count,
            following_count: alice.following_count,
          },
          error: null,
        }),
      })

      const request = createTestRequest('/api/v1/auth/login', {
        method: 'POST',
        body: {
          email: alice.email,
          password: 'password123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      // JWT tokens have 3 parts separated by dots
      expect(data.token.split('.')).toHaveLength(3)
      expect(data.access_token.split('.')).toHaveLength(3)
      expect(data.refresh_token.split('.')).toHaveLength(3)
    })

    it('should return all required user fields', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: { id: alice.id, email: alice.email } },
        error: null,
      })

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: alice.id,
            username: alice.username,
            display_name: alice.display_name,
            avatar_url: alice.avatar_url,
            bio: alice.bio,
            gifs_count: alice.gifs_count,
            follower_count: alice.follower_count,
            following_count: alice.following_count,
          },
          error: null,
        }),
      })

      const request = createTestRequest('/api/v1/auth/login', {
        method: 'POST',
        body: {
          email: alice.email,
          password: 'password123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.user).toHaveProperty('id')
      expect(data.user).toHaveProperty('email')
      expect(data.user).toHaveProperty('username')
      expect(data.user).toHaveProperty('display_name')
      expect(data.user).toHaveProperty('avatar_url')
      expect(data.user).toHaveProperty('bio')
      expect(data.user).toHaveProperty('gifs_count')
      expect(data.user).toHaveProperty('follower_count')
      expect(data.user).toHaveProperty('following_count')
    })
  })

  describe('authentication failures', () => {
    it('should fail with wrong password', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      })

      const request = createTestRequest('/api/v1/auth/login', {
        method: 'POST',
        body: {
          email: alice.email,
          password: 'wrongpassword',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid email or password')
    })

    it('should fail with non-existent email', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      })

      const request = createTestRequest('/api/v1/auth/login', {
        method: 'POST',
        body: {
          email: 'nonexistent@example.com',
          password: 'password123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid email or password')
    })

    it('should return same error for wrong password and wrong email (no user enumeration)', async () => {
      // Wrong password
      mockSupabaseAuth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      })

      const wrongPasswordRequest = createTestRequest('/api/v1/auth/login', {
        method: 'POST',
        body: { email: alice.email, password: 'wrong' },
      })

      const wrongPasswordResponse = await POST(wrongPasswordRequest)
      const wrongPasswordData = await wrongPasswordResponse.json()

      // Wrong email
      mockSupabaseAuth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      })

      const wrongEmailRequest = createTestRequest('/api/v1/auth/login', {
        method: 'POST',
        body: { email: 'nonexistent@example.com', password: 'password123' },
      })

      const wrongEmailResponse = await POST(wrongEmailRequest)
      const wrongEmailData = await wrongEmailResponse.json()

      // Both should return the same generic error
      expect(wrongPasswordData.error).toBe(wrongEmailData.error)
    })
  })

  describe('validation errors', () => {
    it('should fail with invalid email format', async () => {
      const request = createTestRequest('/api/v1/auth/login', {
        method: 'POST',
        body: {
          email: 'not-an-email',
          password: 'password123',
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should fail with missing email', async () => {
      const request = createTestRequest('/api/v1/auth/login', {
        method: 'POST',
        body: {
          password: 'password123',
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should fail with missing password', async () => {
      const request = createTestRequest('/api/v1/auth/login', {
        method: 'POST',
        body: {
          email: alice.email,
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should fail with empty password', async () => {
      const request = createTestRequest('/api/v1/auth/login', {
        method: 'POST',
        body: {
          email: alice.email,
          password: '',
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })
  })

  describe('user profile not found', () => {
    it('should return 404 when user profile is missing', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: { id: alice.id, email: alice.email } },
        error: null,
      })

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Row not found' },
        }),
      })

      const request = createTestRequest('/api/v1/auth/login', {
        method: 'POST',
        body: {
          email: alice.email,
          password: 'password123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User profile not found')
    })
  })
})
