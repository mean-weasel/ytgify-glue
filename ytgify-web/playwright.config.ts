import { defineConfig } from '@playwright/test'

/**
 * Playwright configuration for integration tests
 *
 * These tests run against a real Next.js backend to verify the full
 * Extension → Backend API → Database flow.
 *
 * Requirements:
 * - Backend running at BACKEND_URL (default: http://localhost:3000)
 * - Supabase configured with test database
 * - Test user created in database
 */
export default defineConfig({
  testDir: './tests/integration',

  // Run sequentially since we're hitting a real backend
  fullyParallel: false,
  forbidOnly: !!process.env.CI,

  // Retries for flaky network tests
  retries: process.env.CI ? 2 : 1,

  // Single worker for backend tests to avoid race conditions
  workers: 1,

  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/html', open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],

  // Test execution settings
  use: {
    // Base URL for API requests
    baseURL: process.env.BACKEND_URL || 'http://localhost:3000',

    // Trace and screenshots
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',

    // Timeouts for API requests
    actionTimeout: 30000,
    navigationTimeout: 15000,

    // Extra HTTP headers
    extraHTTPHeaders: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  },

  // Global timeouts
  timeout: 60000, // 1 minute per test
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },

  // Output directory for test artifacts
  outputDir: 'test-results/artifacts',

  // Test match patterns
  testMatch: '**/*.spec.ts',

  // Ignore patterns
  testIgnore: ['**/node_modules/**', '**/dist/**', '**/test-results/**'],

  // Web server - start Next.js dev server before tests
  webServer: process.env.SKIP_SERVER
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
})
