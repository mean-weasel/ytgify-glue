import { WebDriver, By, until, WebElement, Condition } from 'selenium-webdriver';

/**
 * Selenium test utilities for E2E tests
 * Provides high-level helpers that mirror Playwright's API
 */

/**
 * Wait for element to be located in DOM (may not be visible)
 */
export async function waitForElement(
  driver: WebDriver,
  selector: string,
  timeout = 10000
): Promise<WebElement> {
  return driver.wait(until.elementLocated(By.css(selector)), timeout);
}

/**
 * Wait for element to be visible
 */
export async function waitForElementVisible(
  driver: WebDriver,
  selector: string,
  timeout = 10000
): Promise<WebElement> {
  const element = await waitForElement(driver, selector, timeout);
  await driver.wait(until.elementIsVisible(element), timeout);
  return element;
}

/**
 * Find element by CSS selector
 */
export async function findElement(driver: WebDriver, selector: string): Promise<WebElement | null> {
  try {
    return await driver.findElement(By.css(selector));
  } catch (error) {
    return null;
  }
}

/**
 * Find all elements by CSS selector
 */
export async function findElements(driver: WebDriver, selector: string): Promise<WebElement[]> {
  return driver.findElements(By.css(selector));
}

/**
 * Click element with wait and retry on stale element
 */
export async function clickElement(driver: WebDriver, selector: string, timeout = 10000): Promise<void> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const element = await waitForElementVisible(driver, selector, timeout);
      await element.click();
      return; // Success
    } catch (error) {
      lastError = error as Error;

      // Retry only on StaleElementReferenceError
      if (error instanceof Error && error.name === 'StaleElementReferenceError' && i < maxRetries - 1) {
        await sleep(driver, 200); // Short delay before retry
        continue;
      }

      throw error; // Throw immediately for other errors or final retry
    }
  }

  throw lastError || new Error('Click failed after retries');
}

/**
 * Get text content of element
 */
export async function getText(driver: WebDriver, selector: string, timeout = 10000): Promise<string> {
  const element = await waitForElement(driver, selector, timeout);
  return element.getText();
}

/**
 * Get attribute value
 */
export async function getAttribute(
  driver: WebDriver,
  selector: string,
  attribute: string,
  timeout = 10000
): Promise<string | null> {
  const element = await waitForElement(driver, selector, timeout);
  return element.getAttribute(attribute);
}

/**
 * Check if element exists in DOM
 */
export async function elementExists(driver: WebDriver, selector: string): Promise<boolean> {
  const elements = await driver.findElements(By.css(selector));
  return elements.length > 0;
}

/**
 * Check if element is visible
 */
export async function isElementVisible(driver: WebDriver, selector: string): Promise<boolean> {
  try {
    const element = await driver.findElement(By.css(selector));
    return element.isDisplayed();
  } catch (error) {
    return false;
  }
}

/**
 * Fill input field
 */
export async function fillInput(
  driver: WebDriver,
  selector: string,
  value: string,
  timeout = 10000
): Promise<void> {
  const element = await waitForElementVisible(driver, selector, timeout);
  await element.clear();
  await element.sendKeys(value);
}

/**
 * Execute JavaScript in browser context
 */
export async function executeScript<T>(driver: WebDriver, script: string | Function, ...args: any[]): Promise<T> {
  return driver.executeScript(script, ...args) as Promise<T>;
}

/**
 * Execute async JavaScript in browser context
 */
export async function executeAsyncScript<T>(
  driver: WebDriver,
  script: string | Function,
  ...args: any[]
): Promise<T> {
  return driver.executeAsyncScript(script, ...args) as Promise<T>;
}

/**
 * Wait for condition with custom timeout
 */
export async function waitFor<T>(driver: WebDriver, condition: Condition<T>, timeout = 10000): Promise<T> {
  return driver.wait(condition, timeout);
}

/**
 * Sleep for specified milliseconds
 */
export async function sleep(driver: WebDriver, ms: number): Promise<void> {
  await driver.sleep(ms);
}

/**
 * Get element bounding box
 */
export async function getBoundingBox(driver: WebDriver, selector: string): Promise<{ x: number; y: number; width: number; height: number } | null> {
  const element = await findElement(driver, selector);
  if (!element) return null;

  const rect = await driver.executeScript(
    `
    const el = arguments[0];
    const rect = el.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height
    };
  `,
    element
  );

  return rect as { x: number; y: number; width: number; height: number };
}

/**
 * Mouse click at coordinates
 */
export async function clickAtCoordinates(driver: WebDriver, x: number, y: number): Promise<void> {
  await driver.executeScript(
    `
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: arguments[0],
      clientY: arguments[1]
    });
    document.elementFromPoint(arguments[0], arguments[1])?.dispatchEvent(event);
  `,
    x,
    y
  );
}

/**
 * Wait for function to return true
 */
export async function waitForFunction(
  driver: WebDriver,
  fn: Function,
  timeout = 10000
): Promise<void> {
  const condition = new Condition('custom function', async () => {
    const result = await driver.executeScript(fn);
    return result === true;
  });
  await driver.wait(condition, timeout);
}

/**
 * Get computed style property
 */
export async function getComputedStyle(
  driver: WebDriver,
  selector: string,
  property: string
): Promise<string> {
  const element = await findElement(driver, selector);
  if (!element) return '';

  return driver.executeScript(
    `return window.getComputedStyle(arguments[0])[arguments[1]];`,
    element,
    property
  ) as Promise<string>;
}

/**
 * Take screenshot
 */
export async function takeScreenshot(driver: WebDriver): Promise<string> {
  return driver.takeScreenshot();
}

/**
 * Navigate to URL with wait for load
 */
export async function navigateToUrl(driver: WebDriver, url: string): Promise<void> {
  await driver.get(url);
  await driver.wait(
    async () => {
      const readyState = await driver.executeScript('return document.readyState');
      return readyState === 'complete';
    },
    30000
  );
}
