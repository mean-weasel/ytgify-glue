import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { MockYouTubeServer } from './helpers/mock-server';
import { getRequiredVideoFiles } from './helpers/mock-videos';

let mockServer: MockYouTubeServer | null = null;

/**
 * Global setup for Selenium mock E2E tests
 * 1. Build extension if needed
 * 2. Start mock YouTube server
 * 3. Verify test video files exist
 */
async function globalSetup() {
  console.log('\n🔧 [Selenium] Running mock E2E global setup...\n');

  // Step 1: Ensure extension is built
  const distPath = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(distPath)) {
    console.log('📦 Building extension (dist folder not found)...');
    try {
      execSync('npm run build', {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log('✅ Extension built successfully\n');
    } catch (error) {
      console.error('❌ Failed to build extension:', error);
      throw error;
    }
  } else {
    const manifestPath = path.join(distPath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      console.log('📦 Building extension (manifest.json not found)...');
      try {
        execSync('npm run build', {
          stdio: 'inherit',
          cwd: process.cwd()
        });
        console.log('✅ Extension built successfully\n');
      } catch (error) {
        console.error('❌ Failed to build extension:', error);
        throw error;
      }
    } else {
      console.log('✅ Extension already built\n');
    }
  }

  // Step 2: Verify test video files (generate if missing)
  console.log('🎬 Checking for test video files...');
  const videosPath = path.join(process.cwd(), 'tests', 'e2e-mock', 'fixtures', 'videos');
  const requiredFiles = getRequiredVideoFiles();
  const missingFiles: string[] = [];

  for (const filename of requiredFiles) {
    const videoPath = path.join(videosPath, filename);
    if (!fs.existsSync(videoPath)) {
      missingFiles.push(filename);
    }
  }

  if (missingFiles.length > 0) {
    console.log('📹 Generating missing test videos...');
    missingFiles.forEach(file => console.log(`   - ${file}`));
    try {
      execSync('npm run generate:test-videos', {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log('✅ Test videos generated successfully\n');
    } catch (error) {
      console.error('❌ Failed to generate test videos:', error);
      console.error('\n💡 Make sure FFmpeg is installed:');
      console.error('   macOS:         brew install ffmpeg');
      console.error('   Ubuntu/Debian: sudo apt-get install ffmpeg\n');
      throw error;
    }
  } else {
    console.log('✅ All test video files present\n');
  }

  // Step 3: Create test results directories
  const dirs = [
    path.join(process.cwd(), 'test-results'),
    path.join(process.cwd(), 'test-results', 'selenium-mock'),
    path.join(process.cwd(), 'test-results', 'artifacts-selenium-mock'),
    path.join(process.cwd(), 'test-results', 'screenshots-selenium-mock'),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Step 4: Start mock YouTube server
  console.log('🚀 Starting mock YouTube server...');
  try {
    mockServer = new MockYouTubeServer();
    const serverUrl = await mockServer.start();

    // Store server URL in environment for tests to access
    process.env.MOCK_SERVER_URL = serverUrl;

    // Write to file for Jest workers to access (Jest workers don't share env)
    const stateFile = path.join(process.cwd(), 'test-results', 'selenium-mock-state.json');
    fs.writeFileSync(stateFile, JSON.stringify({
      serverUrl,
      distPath
    }));

    console.log(`✅ Mock YouTube server started at: ${serverUrl}\n`);
  } catch (error) {
    console.error('❌ Failed to start mock server:', error);
    throw error;
  }

  console.log('✅ [Selenium] Mock E2E global setup complete!\n');
  console.log('═══════════════════════════════════════');
  console.log('  Mock Server:', process.env.MOCK_SERVER_URL);
  console.log('  Extension:  ', distPath);
  console.log('  Framework:   Selenium WebDriver');
  console.log('═══════════════════════════════════════\n');
}

export default globalSetup;

// Store server instance for cleanup
export { mockServer };
