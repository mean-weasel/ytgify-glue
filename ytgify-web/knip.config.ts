import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  // Entry points for the application
  entry: ['src/app/**/*.{ts,tsx}'],

  // Project files to analyze
  project: ['src/**/*.{ts,tsx}'],

  // Ignore patterns
  ignore: [
    // Test files
    '**/*.test.ts',
    '**/*.spec.ts',
    'src/test/**',
    'tests/**',

    // Generated files
    '.next/**',
    'coverage/**',

    // Config files
    '*.config.ts',
    '*.config.js',

    // Capacitor mobile app
    'ios/**',
    'android/**',
  ],

  // Ignore dependencies that are used but not detected
  ignoreDependencies: [
    // Test dependencies (used in test files which are excluded)
    '@testing-library/dom',
    '@testing-library/react',
    'msw',

    // Capacitor (used for mobile builds)
    '@capacitor/ios',

    // Tailwind (peer dependency of @tailwindcss/postcss)
    'tailwindcss',

    // PostCSS (used by postcss.config.mjs - knip doesn't detect mjs imports)
    'postcss',
  ],

  // Next.js plugin configuration
  next: {
    entry: [
      'src/app/**/page.tsx',
      'src/app/**/layout.tsx',
      'src/app/**/route.ts',
      'src/app/**/loading.tsx',
      'src/app/**/error.tsx',
      'src/app/**/not-found.tsx',
    ],
  },

  // Ignore specific exports that are used by frameworks
  ignoreExportsUsedInFile: true,

  // Rules configuration
  rules: {
    // Report unused files
    files: 'error',
    // Report unused dependencies
    dependencies: 'error',
    // Report unused dev dependencies
    devDependencies: 'warn',
    // Report unlisted dependencies
    unlisted: 'error',
    // Report unused exports (warn only - may be used externally)
    exports: 'warn',
    // Report unused types (warn only - may be used externally)
    types: 'warn',
    // Report duplicate exports
    duplicates: 'warn',
  },
}

export default config
