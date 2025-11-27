import { getMockServer } from './helpers/mock-server';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global teardown for Selenium mock E2E tests
 * Stops the mock YouTube server and cleans up state files
 */
async function globalTeardown() {
  console.log('\n🧹 [Selenium] Running mock E2E global teardown...\n');

  try {
    // Stop mock YouTube server if it's running
    const mockServer = getMockServer();
    if (mockServer && mockServer.isRunning()) {
      console.log('🛑 Stopping mock YouTube server...');

      // Create a timeout promise to force shutdown after 3 seconds
      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          console.warn('⚠️  Mock server shutdown timeout - forcing exit');
          resolve();
        }, 3000);
      });

      // Race between server stop and timeout
      await Promise.race([
        mockServer.stop(),
        timeoutPromise
      ]);

      console.log('✅ Mock YouTube server stopped\n');
    }

    // Clean up state file
    const stateFile = path.join(process.cwd(), 'test-results', 'selenium-mock-state.json');
    if (fs.existsSync(stateFile)) {
      fs.unlinkSync(stateFile);
    }
  } catch (error) {
    console.error('⚠️  Error during teardown:', error);
    // Don't fail the build if teardown has issues
  }

  console.log('✅ [Selenium] Mock E2E global teardown complete\n');
}

export default globalTeardown;
