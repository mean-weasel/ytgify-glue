import { vi } from 'vitest'

/**
 * Mock Supabase client for unit testing
 *
 * This provides a chainable mock that mimics Supabase's query builder pattern.
 * For integration tests, use the real Supabase client with a test database.
 */

export interface MockQueryResult<T = unknown> {
  data: T | null
  error: Error | null
  count?: number
}

export type MockQueryBuilder = {
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  neq: ReturnType<typeof vi.fn>
  gt: ReturnType<typeof vi.fn>
  gte: ReturnType<typeof vi.fn>
  lt: ReturnType<typeof vi.fn>
  lte: ReturnType<typeof vi.fn>
  in: ReturnType<typeof vi.fn>
  is: ReturnType<typeof vi.fn>
  ilike: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  limit: ReturnType<typeof vi.fn>
  range: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
}

/**
 * Create a chainable mock query builder
 */
export function createMockQueryBuilder(result: MockQueryResult = { data: null, error: null }): MockQueryBuilder {
  const builder: MockQueryBuilder = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    neq: vi.fn(() => builder),
    gt: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lt: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    in: vi.fn(() => builder),
    is: vi.fn(() => builder),
    ilike: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    range: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
  }

  // Make the builder itself return the result when awaited
  Object.defineProperty(builder, 'then', {
    value: (resolve: (value: MockQueryResult) => void) => resolve(result),
  })

  return builder
}

/**
 * Create a mock Supabase client
 */
export function createMockSupabaseClient(tableResults: Record<string, MockQueryResult> = {}) {
  return {
    from: vi.fn((table: string) => {
      const result = tableResults[table] || { data: null, error: null }
      return createMockQueryBuilder(result)
    }),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: { path: 'test/path.gif' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test.com/path.gif' } })),
        remove: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    },
  }
}

/**
 * Mock the @supabase/supabase-js module
 *
 * Usage in test file:
 * ```
 * vi.mock('@supabase/supabase-js', () => ({
 *   createClient: vi.fn(() => createMockSupabaseClient({
 *     users: { data: alice, error: null }
 *   }))
 * }))
 * ```
 */
export function mockSupabaseModule(tableResults: Record<string, MockQueryResult> = {}) {
  return {
    createClient: vi.fn(() => createMockSupabaseClient(tableResults)),
  }
}

/**
 * Helper to create a successful query result
 */
export function mockSuccess<T>(data: T, count?: number): MockQueryResult<T> {
  return { data, error: null, count }
}

/**
 * Helper to create a failed query result
 */
export function mockError(message: string, code?: string): MockQueryResult {
  const error = new Error(message) as Error & { code?: string }
  if (code) error.code = code
  return { data: null, error }
}

/**
 * Helper to create a not found result
 */
export function mockNotFound(): MockQueryResult {
  return mockError('Row not found', 'PGRST116')
}
