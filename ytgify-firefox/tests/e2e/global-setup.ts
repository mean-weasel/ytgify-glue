import { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Global setup for E2E tests
 * Ensures extension is built before tests run
 *
 * NOTE: Real E2E tests require manual extension installation:
 * 1. Build extension: npm run build
 * 2. Open Firefox and navigate to about:debugging
 * 3. Click "This Firefox" → "Load Temporary Add-on"
 * 4. Select manifest.json from dist/ folder
 * 5. Run tests: npm run test:e2e:headed
 */
async function globalSetup(config: FullConfig) {
  console.log('🔧 Running global setup for E2E tests...');

  const distPath = path.join(__dirname, '..', '..', 'dist');

  // Check if dist folder exists
  if (!fs.existsSync(distPath)) {
    console.log('📦 Building extension (dist folder not found)...');
    execSync('npm run build', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..', '..')
    });
  } else {
    // Check if manifest exists
    const manifestPath = path.join(distPath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      console.log('📦 Building extension (manifest.json not found)...');
      execSync('npm run build', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..', '..')
      });
    } else {
      console.log('✅ Extension already built');
    }
  }

  console.log('⚠️  NOTE: Real E2E tests require manual extension installation via about:debugging');

  // Create test results directories
  const dirs = [
    'test-results',
    'test-results/html',
    'test-results/artifacts',
    'test-results/screenshots',
    'test-results/videos',
  ];

  for (const dir of dirs) {
    const fullPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }

  console.log('✅ Global setup complete');
}

export default globalSetup;