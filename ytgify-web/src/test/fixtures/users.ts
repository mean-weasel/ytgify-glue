import type { TestUser } from '../helpers/auth'

/**
 * Test user fixtures matching Rails test fixtures
 * These represent users that would exist in the test database
 */

export const alice: TestUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'alice@example.com',
  username: 'alice',
  display_name: 'Alice Test',
  avatar_url: null,
  bio: 'Test user Alice',
  is_verified: false,
  gifs_count: 5,
  follower_count: 10,
  following_count: 5,
  total_likes_received: 25,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const bob: TestUser = {
  id: '00000000-0000-0000-0000-000000000002',
  email: 'bob@example.com',
  username: 'bob',
  display_name: 'Bob Test',
  avatar_url: null,
  bio: 'Test user Bob',
  is_verified: true,
  gifs_count: 10,
  follower_count: 20,
  following_count: 15,
  total_likes_received: 50,
  created_at: '2024-01-02T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
}

export const charlie: TestUser = {
  id: '00000000-0000-0000-0000-000000000003',
  email: 'charlie@example.com',
  username: 'charlie',
  display_name: 'Charlie Test',
  avatar_url: 'https://example.com/avatar.jpg',
  bio: null,
  is_verified: false,
  gifs_count: 0,
  follower_count: 0,
  following_count: 0,
  total_likes_received: 0,
  created_at: '2024-01-03T00:00:00Z',
  updated_at: '2024-01-03T00:00:00Z',
}

// Non-existent user ID for testing 404s
export const nonExistentUserId = '00000000-0000-0000-0000-999999999999'
export const nonExistentUsername = 'nonexistentuser'

// Password used in tests (bcrypt hashed in real DB)
export const testPassword = 'password123'

// All test users
export const testUsers = [alice, bob, charlie]
