import { browserMock } from '../__mocks__/browser-mocks';

// Setup global browser
(global as any).browser = browserMock;

describe('Firefox Background Event Page Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset browser API mocks for each test
    browserMock.runtime.onInstalled.addListener.mockClear();
    browserMock.runtime.onMessage.addListener.mockClear();
    browserMock.runtime.onStartup.addListener.mockClear();
    browserMock.commands.onCommand.addListener.mockClear();
  });

  it('should have Firefox browser API mocks available', () => {
    expect(browser).toBeDefined();
    expect(browser.runtime).toBeDefined();
    expect(browser.runtime.onInstalled).toBeDefined();
    expect(browser.runtime.onMessage).toBeDefined();
    expect(browser.runtime.sendMessage).toBeDefined();
    expect(browser.runtime.onStartup).toBeDefined();
    expect(browser.commands).toBeDefined();
  });

  it('should register event page listeners', () => {
    const installListener = jest.fn();
    const messageListener = jest.fn();
    const startupListener = jest.fn();
    const commandListener = jest.fn();

    browser.runtime.onInstalled.addListener(installListener);
    browser.runtime.onMessage.addListener(messageListener);
    browser.runtime.onStartup.addListener(startupListener);
    browser.commands.onCommand.addListener(commandListener);

    expect(browser.runtime.onInstalled.addListener).toHaveBeenCalledWith(installListener);
    expect(browser.runtime.onMessage.addListener).toHaveBeenCalledWith(messageListener);
    expect(browser.runtime.onStartup.addListener).toHaveBeenCalledWith(startupListener);
    expect(browser.commands.onCommand.addListener).toHaveBeenCalledWith(commandListener);
  });

  it('should send messages with Firefox Promise-based API', async () => {
    const message = { type: 'TEST_REQUEST', data: 'test' };
    const expectedResponse = { type: 'TEST_RESPONSE', success: true };

    browserMock.runtime.sendMessage.mockResolvedValue(expectedResponse);

    const response = await browser.runtime.sendMessage(message);

    expect(response).toEqual(expectedResponse);
    expect(browser.runtime.sendMessage).toHaveBeenCalledWith(message);
  });

  it('should handle Firefox installation events', async () => {
    const mockCallback = jest.fn();
    browser.runtime.onInstalled.addListener(mockCallback);

    // Simulate installation
    const details = { reason: 'install', previousVersion: undefined };
    const listeners = browserMock.runtime.onInstalled.addListener.mock.calls;
    const listener = listeners[listeners.length - 1][0];

    await listener(details);

    expect(mockCallback).toHaveBeenCalledWith(details);
  });

  it('should handle Firefox startup events', async () => {
    const mockCallback = jest.fn();
    browser.runtime.onStartup.addListener(mockCallback);

    // Simulate startup
    const listeners = browserMock.runtime.onStartup.addListener.mock.calls;
    const listener = listeners[listeners.length - 1][0];

    await listener();

    expect(mockCallback).toHaveBeenCalled();
  });

  it('should provide Firefox extension manifest data', () => {
    const manifest = browser.runtime.getManifest();

    expect(manifest).toBeDefined();
    expect(manifest.name).toBe('YTgify for Firefox');
    expect(manifest.version).toBe('1.0.0');
    expect(manifest.manifest_version).toBe(3);
  });

  it('should generate Firefox extension URLs', () => {
    const url = browser.runtime.getURL('popup.html');

    expect(url).toBe('moz-extension://mock-extension-id/popup.html');
  });

  it('should have Firefox storage API with Promises', async () => {
    const testData = { key: 'value' };

    browserMock.storage.sync.set.mockResolvedValue(undefined);
    browserMock.storage.sync.get.mockResolvedValue(testData);

    await browser.storage.sync.set(testData);
    const result = await browser.storage.sync.get('key');

    expect(result).toEqual(testData);
    expect(browser.storage.sync.set).toHaveBeenCalledWith(testData);
    expect(browser.storage.sync.get).toHaveBeenCalledWith('key');
  });

  it('should have Firefox tabs API with Promises', async () => {
    const mockTabs = [
      { id: 1, url: 'https://www.youtube.com/watch?v=test', active: true }
    ];

    browserMock.tabs.query.mockResolvedValue(mockTabs);

    const tabs = await browser.tabs.query({ active: true });

    expect(Array.isArray(tabs)).toBe(true);
    expect(tabs).toEqual(mockTabs);
    expect(browser.tabs.query).toHaveBeenCalledWith({ active: true });
  });

  it('should handle Firefox command API', async () => {
    const mockCallback = jest.fn();
    browser.commands.onCommand.addListener(mockCallback);

    // Simulate command
    const listeners = browserMock.commands.onCommand.addListener.mock.calls;
    const listener = listeners[listeners.length - 1][0];

    await listener('_execute_action');

    expect(mockCallback).toHaveBeenCalledWith('_execute_action');
  });

  it('should handle tab messaging with Firefox API', async () => {
    const tabId = 123;
    const message = { type: 'SHOW_WIZARD_DIRECT', data: { triggeredBy: 'command' } };
    const expectedResponse = { success: true };

    browserMock.tabs.sendMessage.mockResolvedValue(expectedResponse);

    const response = await browser.tabs.sendMessage(tabId, message);

    expect(response).toEqual(expectedResponse);
    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(tabId, message);
  });
});