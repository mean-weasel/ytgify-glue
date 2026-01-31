import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, OPTIONS } from './route'
import { NextRequest } from 'next/server'
import { alice } from '@/test/fixtures/users'

const mockSupabaseAuth = {
  signInWithIdToken: vi.fn(),
}

const mockSupabaseFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: mockSupabaseAuth,
    from: mockSupabaseFrom,
  })),
}))

function createGoogleAuthRequest(body: object) {
  return new NextRequest('http://localhost:3000/api/v1/auth/google', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/v1/auth/google', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('successful authentication', () => {
    it('should authenticate with valid id_token and existing user', async () => {
      mockSupabaseAuth.signInWithIdToken.mockResolvedValue({
        data: {
          user: {
            id: alice.id,
            email: alice.email,
            user_metadata: {
              full_name: 'Alice Test',
              picture: 'https://example.com/avatar.jpg',
            },
          },
        },
        error: null,
      })

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: alice.id,
            email: alice.email,
            username: alice.username,
            display_name: alice.display_name,
            avatar_url: alice.avatar_url,
            is_verified: alice.is_verified,
            created_at: alice.created_at,
          },
          error: null,
        }),
      })

      const request = createGoogleAuthRequest({
        id_token: 'valid.google.id_token',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user.id).toBe(alice.id)
      expect(data.user.email).toBe(alice.email)
      expect(data.access_token).toBeDefined()
      expect(data.refresh_token).toBeDefined()
    })

    it('should create new user profile when user does not exist', async () => {
      const newUserId = '99999999-9999-9999-9999-999999999999'

      mockSupabaseAuth.signInWithIdToken.mockResolvedValue({
        data: {
          user: {
            id: newUserId,
            email: 'newgoogleuser@gmail.com',
            user_metadata: {
              full_name: 'New Google User',
              picture: 'https://example.com/new-avatar.jpg',
              email: 'newgoogleuser@gmail.com',
            },
          },
        },
        error: null,
      })

      // First call: user not found
      const selectMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockReturnThis()
      const singleMock = vi.fn()
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116', message: 'Row not found' },
        })

      // Insert call for new user
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: newUserId,
            email: 'newgoogleuser@gmail.com',
            username: 'newgoogleuser',
            display_name: 'New Google User',
            avatar_url: 'https://example.com/new-avatar.jpg',
            is_verified: false,
            created_at: new Date().toISOString(),
          },
          error: null,
        }),
      })

      mockSupabaseFrom.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock,
        insert: insertMock,
      })

      const request = createGoogleAuthRequest({
        id_token: 'valid.google.id_token',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user).toBeDefined()
      expect(data.access_token).toBeDefined()
      expect(data.refresh_token).toBeDefined()
    })

    it('should accept access_token as alternative to id_token', async () => {
      mockSupabaseAuth.signInWithIdToken.mockResolvedValue({
        data: {
          user: {
            id: alice.id,
            email: alice.email,
            user_metadata: {},
          },
        },
        error: null,
      })

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: alice.id,
            email: alice.email,
            username: alice.username,
            display_name: alice.display_name,
            avatar_url: alice.avatar_url,
            is_verified: alice.is_verified,
            created_at: alice.created_at,
          },
          error: null,
        }),
      })

      const request = createGoogleAuthRequest({
        access_token: 'valid.google.access_token',
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should return JWT tokens', async () => {
      mockSupabaseAuth.signInWithIdToken.mockResolvedValue({
        data: {
          user: {
            id: alice.id,
            email: alice.email,
            user_metadata: {},
          },
        },
        error: null,
      })

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: alice.id,
            email: alice.email,
            username: alice.username,
            display_name: alice.display_name,
            avatar_url: alice.avatar_url,
            is_verified: alice.is_verified,
            created_at: alice.created_at,
          },
          error: null,
        }),
      })

      const request = createGoogleAuthRequest({
        id_token: 'valid.google.id_token',
      })

      const response = await POST(request)
      const data = await response.json()

      // JWT tokens have 3 parts
      expect(data.access_token.split('.')).toHaveLength(3)
      expect(data.refresh_token.split('.')).toHaveLength(3)
    })

    it('should include CORS headers in response', async () => {
      mockSupabaseAuth.signInWithIdToken.mockResolvedValue({
        data: {
          user: {
            id: alice.id,
            email: alice.email,
            user_metadata: {},
          },
        },
        error: null,
      })

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: alice.id,
            email: alice.email,
            username: alice.username,
            display_name: alice.display_name,
            avatar_url: alice.avatar_url,
            is_verified: alice.is_verified,
            created_at: alice.created_at,
          },
          error: null,
        }),
      })

      const request = createGoogleAuthRequest({
        id_token: 'valid.google.id_token',
      })

      const response = await POST(request)

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    })
  })

  describe('validation errors', () => {
    it('should fail without id_token or access_token', async () => {
      const request = createGoogleAuthRequest({})

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing id_token or access_token')
    })

    it('should fail with empty id_token', async () => {
      const request = createGoogleAuthRequest({
        id_token: '',
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })
  })

  describe('authentication failures', () => {
    it('should fail with invalid Google token', async () => {
      mockSupabaseAuth.signInWithIdToken.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      })

      const request = createGoogleAuthRequest({
        id_token: 'invalid.token',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid token')
    })

    it('should fail with expired Google token', async () => {
      mockSupabaseAuth.signInWithIdToken.mockResolvedValue({
        data: { user: null },
        error: { message: 'Token expired' },
      })

      const request = createGoogleAuthRequest({
        id_token: 'expired.token',
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
    })
  })

  describe('OPTIONS (CORS preflight)', () => {
    it('should handle OPTIONS request', async () => {
      const response = await OPTIONS()

      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST')
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Authorization')
    })
  })
})
