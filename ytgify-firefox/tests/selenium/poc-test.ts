/**
 * Selenium Proof of Concept Test
 * Verifies that Firefox extension loading works with Selenium WebDriver
 */

import { createFirefoxDriver, getExtensionId } from './firefox-driver';
import { waitForElementVisible, executeScript, clickElement, isElementVisible, sleep } from './test-utils';

async function runPOC() {
  console.log('\n🧪 Starting Selenium POC Test for Firefox Extension\n');
  console.log('═══════════════════════════════════════════════════\n');

  let driver;
  const headless = process.env.HEADLESS === 'true';

  try {
    // Step 1: Create Firefox driver with extension
    console.log('[1/6] Creating Firefox driver...');
    console.log(`      Mode: ${headless ? 'HEADLESS' : 'HEADED'}`);
    driver = await createFirefoxDriver(undefined, headless);
    console.log('✅    Driver created\n');

    // Step 2: Navigate to mock YouTube (you can replace with real YouTube)
    console.log('[2/6] Navigating to YouTube...');
    const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    await driver.get(testUrl);
    console.log(`✅    Loaded: ${testUrl}\n`);

    // Step 3: Wait for page to load
    console.log('[3/6] Waiting for page load...');
    await driver.wait(
      async () => {
        const readyState = await executeScript(driver, 'return document.readyState');
        return readyState === 'complete';
      },
      30000
    );
    await sleep(driver, 2000); // Extra wait for extension to inject
    console.log('✅    Page loaded\n');

    // Step 4: Check if extension injected GIF button
    console.log('[4/6] Checking for extension button...');
    const buttonExists = await isElementVisible(driver, '.ytgif-button');

    if (buttonExists) {
      console.log('✅    Extension button found! Extension loaded successfully!\n');
    } else {
      console.log('❌    Extension button NOT found\n');
      console.log('      Checking for service workers...');

      // Debug: Check what's in the page
      const bodyHTML = await executeScript<string>(driver, 'return document.body.innerHTML.substring(0, 500)');
      console.log('      Body preview:', bodyHTML.substring(0, 200));

      throw new Error('Extension button not found - extension may not have loaded');
    }

    // Step 5: Try to click the button (optional)
    console.log('[5/6] Attempting to open wizard...');
    try {
      await clickElement(driver, '.ytgif-button', 10000);
      await sleep(driver, 1000);

      // Check if wizard opened
      const wizardExists = await executeScript<boolean>(driver,
        'return document.querySelector(".ytgif-overlay-wizard, .ytgif-quick-capture-screen") !== null'
      );

      if (wizardExists) {
        console.log('✅    Wizard opened successfully!\n');
      } else {
        console.log('⚠️     Button clicked but wizard did not open\n');
      }
    } catch (error) {
      console.log('⚠️     Could not click button:', (error as Error).message, '\n');
    }

    // Step 6: Extension ID verification
    console.log('[6/6] Verifying extension metadata...');
    const extensionId = getExtensionId();
    console.log(`✅    Extension ID: ${extensionId}\n`);

    // Success!
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ POC TEST PASSED!');
    console.log('═══════════════════════════════════════════════════\n');
    console.log('Result: Selenium can load Firefox extensions automatically');
    console.log('        via driver.installAddon() API\n');
    console.log('Next steps:');
    console.log('  1. ✅ Selenium works for Firefox extension testing');
    console.log('  2. 🔄 Continue with full migration to Selenium');
    console.log('  3. 📝 Update all E2E tests to use Selenium\n');

    return true;
  } catch (error) {
    console.error('\n❌ POC TEST FAILED\n');
    console.error('Error:', (error as Error).message);
    console.error('\nStack trace:', (error as Error).stack);

    console.log('\n═══════════════════════════════════════════════════');
    console.log('Result: Selenium approach has issues');
    console.log('═══════════════════════════════════════════════════\n');
    console.log('Recommendation: Stick with current Playwright + manual setup\n');

    return false;
  } finally {
    // Cleanup
    if (driver) {
      if (!headless) {
        console.log('💡 Browser will close in 5 seconds...');
        await sleep(driver, 5000);
      }
      await driver.quit();
    }
  }
}

// Run the POC
runPOC()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
