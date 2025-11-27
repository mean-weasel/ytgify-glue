/**
 * Jest configuration for Selenium Mock E2E tests
 */

module.exports = {
  displayName: 'selenium-mock-e2e',
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  rootDir: '../..',
  testMatch: ['<rootDir>/tests/selenium/tests-mock/**/*.test.ts'],
  globalSetup: '<rootDir>/tests/selenium/global-setup-mock.ts',
  globalTeardown: '<rootDir>/tests/selenium/global-teardown-mock.ts',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          target: 'es2022',
          module: 'es2022',
          moduleResolution: 'node',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          resolveJsonModule: true,
        },
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts'],
  testTimeout: 90000, // 90 seconds per test
  verbose: true,
  bail: false, // Continue running tests even if one fails
  maxWorkers: 4, // Run tests in parallel with 4 workers
  forceExit: true, // Force Jest to exit after tests complete (needed for Selenium cleanup)
};
