import { beforeAll, afterAll, afterEach, vi } from 'vitest'

// Mock environment variables for tests
// Note: JWT_SECRET must match what's used in src/lib/jwt.ts
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only-32chars'
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id.apps.googleusercontent.com'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

// Global test lifecycle hooks
beforeAll(() => {
  // Setup that runs once before all tests
})

afterAll(() => {
  // Cleanup that runs once after all tests
})

afterEach(() => {
  // Reset mocks after each test
  vi.clearAllMocks()
})

// Extend expect matchers if needed
// import { expect } from 'vitest'
// import matchers from '@testing-library/jest-dom/matchers'
// expect.extend(matchers)
