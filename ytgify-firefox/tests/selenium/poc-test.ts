/**
 * Selenium Proof of Concept Test
 * Verifies that Firefox extension loading works with Selenium WebDriver
 */

import { createFirefoxDriver, getExtensionId } from './firefox-driver';
import { executeScript, isElementVisible, sleep } from './test-utils';
import { Key } from 'selenium-webdriver';

async function runPOC() {
  console.log('\n🧪 Starting Selenium POC Test for Firefox Extension\n');
  console.log('═══════════════════════════════════════════════════\n');

  let driver;
  const headless = process.env.HEADLESS === 'true';

  try {
    // Step 1: Create Firefox driver with extension
    console.log('[1/5] Creating Firefox driver...');
    console.log(`      Mode: ${headless ? 'HEADLESS' : 'HEADED'}`);
    driver = await createFirefoxDriver(undefined, headless);
    console.log('✅    Driver created\n');

    // Step 2: Navigate to YouTube
    console.log('[2/5] Navigating to YouTube...');
    const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    await driver.get(testUrl);
    console.log(`✅    Loaded: ${testUrl}\n`);

    // Step 3: Wait for video to load
    console.log('[3/5] Waiting for video to load...');
    let videoReady = false;
    for (let attempt = 1; attempt <= 15; attempt++) {
      const hasVideo = await executeScript<boolean>(driver, `
        const video = document.querySelector('video');
        return video && video.readyState >= 2 && video.duration > 0;
      `);
      if (hasVideo) {
        videoReady = true;
        console.log(`✅    Video ready after attempt ${attempt}\n`);
        break;
      }
      console.log(`      Attempt ${attempt}/15 - waiting for video...`);
      await sleep(driver, 2000);
    }

    if (!videoReady) {
      throw new Error('Video did not load within timeout');
    }

    // Wait extra for extension to initialize
    await sleep(driver, 2000);

    // Step 4: Use keyboard shortcut to open wizard (Ctrl+Shift+G)
    console.log('[4/5] Opening wizard via keyboard shortcut (Ctrl+Shift+G)...');

    // Focus on video player area first
    await executeScript(driver, `
      const video = document.querySelector('video');
      if (video) video.focus();
    `);
    await sleep(driver, 500);

    // Send keyboard shortcut
    const body = await driver.findElement({ css: 'body' });
    await body.sendKeys(Key.chord(Key.CONTROL, Key.SHIFT, 'g'));
    await sleep(driver, 2000);

    // Check if wizard opened
    const wizardExists = await isElementVisible(driver, '.ytgif-overlay-wizard, .ytgif-quick-capture-screen');

    if (wizardExists) {
      console.log('✅    Wizard opened successfully!\n');
    } else {
      // Check for any ytgif elements as debug info
      const ytgifInfo = await executeScript<{ count: number; classes: string[] }>(driver, `
        const elements = document.querySelectorAll('[class*="ytgif"]');
        return {
          count: elements.length,
          classes: Array.from(elements).slice(0, 10).map(e => e.className)
        };
      `);
      console.log('      YTGif elements found:', ytgifInfo.count);
      if (ytgifInfo.classes.length > 0) {
        console.log('      Sample classes:', ytgifInfo.classes);
      }

      throw new Error('Wizard did not open via keyboard shortcut');
    }

    // Step 5: Verify wizard UI elements
    console.log('[5/5] Verifying wizard UI...');
    const uiElements = await executeScript<{ quickCapture: boolean; closeButton: boolean }>(driver, `
      return {
        quickCapture: !!document.querySelector('.ytgif-quick-capture-screen'),
        closeButton: !!document.querySelector('.ytgif-close-button, [class*="close"]')
      };
    `);
    console.log(`      Quick Capture Screen: ${uiElements.quickCapture ? '✅' : '❌'}`);
    console.log(`      Close Button: ${uiElements.closeButton ? '✅' : '❌'}\n`);

    // Success!
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ POC TEST PASSED!');
    console.log('═══════════════════════════════════════════════════\n');
    console.log('Result: Extension loaded and wizard opens via keyboard shortcut\n');
    console.log(`Extension ID: ${getExtensionId()}`);
    console.log('Note: Button is hidden by default. Enable via popup or use Ctrl+Shift+G.\n');

    return true;
  } catch (error) {
    console.error('\n❌ POC TEST FAILED\n');
    console.error('Error:', (error as Error).message);
    console.error('\nStack trace:', (error as Error).stack);

    console.log('\n═══════════════════════════════════════════════════');
    console.log('Result: Test failed');
    console.log('═══════════════════════════════════════════════════\n');

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
