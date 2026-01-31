import { NextRequest } from 'next/server'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface TestRequestOptions {
  method?: HttpMethod
  headers?: HeadersInit
  body?: unknown
  searchParams?: Record<string, string>
}

/**
 * Create a NextRequest for testing API routes
 */
export function createTestRequest(
  url: string,
  options: TestRequestOptions = {}
): NextRequest {
  const { method = 'GET', headers = {}, body, searchParams } = options

  // Build full URL with search params
  let fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`

  if (searchParams) {
    const params = new URLSearchParams(searchParams)
    fullUrl += `?${params.toString()}`
  }

  const requestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body && method !== 'GET' ? JSON.stringify(body) : undefined,
  }

  return new NextRequest(fullUrl, requestInit)
}

/**
 * Parse JSON response from API route
 */
export async function parseJsonResponse<T = unknown>(
  response: Response
): Promise<{ status: number; data: T }> {
  const data = await response.json()
  return {
    status: response.status,
    data,
  }
}

/**
 * Helper to test API route handlers
 *
 * Usage:
 * ```
 * const { status, data } = await testApiRoute(
 *   GET,
 *   '/api/v1/gifs',
 *   { headers: await authHeaders(alice.id, alice.email) }
 * )
 * expect(status).toBe(200)
 * ```
 */
export async function testApiRoute<T = unknown>(
  handler: (request: Request, context?: unknown) => Promise<Response>,
  url: string,
  options: TestRequestOptions = {},
  context?: unknown
): Promise<{ status: number; data: T }> {
  const request = createTestRequest(url, options)
  const response = await handler(request, context)
  return parseJsonResponse<T>(response)
}

/**
 * Helper to test dynamic API routes with params
 *
 * Usage:
 * ```
 * const { status, data } = await testDynamicApiRoute(
 *   GET,
 *   '/api/v1/gifs/123',
 *   { id: '123' },
 *   { headers: await authHeaders(alice.id, alice.email) }
 * )
 * ```
 */
export async function testDynamicApiRoute<T = unknown>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (request: Request, context: any) => Promise<Response>,
  url: string,
  params: Record<string, string>,
  options: TestRequestOptions = {}
): Promise<{ status: number; data: T }> {
  const request = createTestRequest(url, options)
  const context = { params: Promise.resolve(params) }
  const response = await handler(request, context)
  return parseJsonResponse<T>(response)
}

/**
 * Assert that response matches expected status and contains expected fields
 */
export function assertResponse(
  result: { status: number; data: unknown },
  expectedStatus: number,
  expectedFields?: string[]
): void {
  if (result.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus}, got ${result.status}. Data: ${JSON.stringify(result.data)}`
    )
  }

  if (expectedFields && typeof result.data === 'object' && result.data !== null) {
    for (const field of expectedFields) {
      if (!(field in result.data)) {
        throw new Error(
          `Expected response to contain field '${field}'. Data: ${JSON.stringify(result.data)}`
        )
      }
    }
  }
}

/**
 * Common response type assertions
 */
export interface ErrorResponse {
  error: string
  message?: string
  details?: unknown
}

export interface PaginatedResponse<T> {
  page: number
  limit: number
  has_more: boolean
  total?: number
  items?: T[]
}
