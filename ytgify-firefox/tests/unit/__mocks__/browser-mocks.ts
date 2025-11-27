/**
 * Firefox Browser Extension API mocks for testing
 *
 * This file provides Jest-compatible mocks for Firefox WebExtension APIs
 * used throughout the YTgify Firefox extension.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface MockBrowser {
  runtime: any;
  storage: any;
  tabs: any;
  action?: any;
  downloads?: any;
  commands?: any;
}

/**
 * Creates a comprehensive Firefox Browser API mock object
 */
export function createBrowserMock(): MockBrowser {
  // Mock data storage for testing
  const mockStorageData = new Map<string, any>();
  const storageListeners: Array<(changes: any, area: string) => void> = [];

  // Mock tab data
  const mockTabs = [
    {
      id: 1,
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      active: true,
      windowId: 1,
      title: 'Sample YouTube Video'
    }
  ];

  // Mock runtime message listeners
  const runtimeListeners: Array<(message: any, sender: any) => Promise<any>> = [];

  const browserMock: MockBrowser = {
    runtime: {
      onInstalled: {
        addListener: jest.fn((callback: any) => {
          setTimeout(() => callback({ reason: 'install' }), 0);
        }),
        removeListener: jest.fn()
      },
      onStartup: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      },
      onMessage: {
        addListener: jest.fn((listener: any) => {
          runtimeListeners.push(listener);
        }),
        removeListener: jest.fn((listener: any) => {
          const index = runtimeListeners.indexOf(listener);
          if (index > -1) {
            runtimeListeners.splice(index, 1);
          }
        })
      },
      onConnect: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      },
      // Firefox uses Promise-based API
      sendMessage: jest.fn((message: any) => {
        return Promise.resolve({ success: true });
      }),
      connect: jest.fn(() => ({
        postMessage: jest.fn(),
        onMessage: { addListener: jest.fn() },
        onDisconnect: { addListener: jest.fn() }
      })),
      getURL: jest.fn((path: string) => `moz-extension://mock-extension-id/${path}`),
      id: 'ytgify@firefox.extension',
      getManifest: jest.fn(() => ({
        name: 'YTgify for Firefox',
        version: '1.0.0',
        manifest_version: 3,
        browser_specific_settings: {
          gecko: {
            id: 'ytgify@firefox.extension',
            strict_min_version: '109.0'
          }
        }
      }))
    },

    storage: {
      sync: {
        // Firefox storage APIs return Promises
        get: jest.fn((keys?: any) => {
          const result: Record<string, any> = {};

          if (typeof keys === 'string') {
            result[keys] = mockStorageData.get(`sync:${keys}`);
          } else if (Array.isArray(keys)) {
            keys.forEach((key: string) => {
              result[key] = mockStorageData.get(`sync:${key}`);
            });
          } else if (keys === null || keys === undefined) {
            for (const [key, value] of mockStorageData.entries()) {
              if (key.startsWith('sync:')) {
                result[key.replace('sync:', '')] = value;
              }
            }
          }

          return Promise.resolve(result);
        }),

        set: jest.fn((items: Record<string, any>) => {
          const changes: Record<string, any> = {};

          for (const [key, value] of Object.entries(items)) {
            const oldValue = mockStorageData.get(`sync:${key}`);
            mockStorageData.set(`sync:${key}`, value);
            changes[key] = { oldValue, newValue: value };
          }

          // Trigger storage change listeners
          storageListeners.forEach(listener => listener(changes, 'sync'));

          return Promise.resolve();
        }),

        remove: jest.fn((keys: string | string[]) => {
          const keyArray = Array.isArray(keys) ? keys : [keys];
          keyArray.forEach(key => mockStorageData.delete(`sync:${key}`));
          return Promise.resolve();
        }),

        clear: jest.fn(() => {
          const keysToDelete: string[] = [];
          for (const key of mockStorageData.keys()) {
            if (key.startsWith('sync:')) {
              keysToDelete.push(key);
            }
          }
          keysToDelete.forEach(key => mockStorageData.delete(key));
          return Promise.resolve();
        })
      },

      local: {
        get: jest.fn((keys?: any) => {
          const result: Record<string, any> = {};

          if (typeof keys === 'string') {
            result[keys] = mockStorageData.get(`local:${keys}`);
          } else if (Array.isArray(keys)) {
            keys.forEach((key: string) => {
              result[key] = mockStorageData.get(`local:${key}`);
            });
          } else if (keys === null || keys === undefined) {
            for (const [key, value] of mockStorageData.entries()) {
              if (key.startsWith('local:')) {
                result[key.replace('local:', '')] = value;
              }
            }
          }

          return Promise.resolve(result);
        }),

        set: jest.fn((items: Record<string, any>) => {
          const changes: Record<string, any> = {};

          for (const [key, value] of Object.entries(items)) {
            const oldValue = mockStorageData.get(`local:${key}`);
            mockStorageData.set(`local:${key}`, value);
            changes[key] = { oldValue, newValue: value };
          }

          // Trigger storage change listeners
          storageListeners.forEach(listener => listener(changes, 'local'));

          return Promise.resolve();
        }),

        remove: jest.fn((keys: string | string[]) => {
          const keyArray = Array.isArray(keys) ? keys : [keys];
          keyArray.forEach(key => mockStorageData.delete(`local:${key}`));
          return Promise.resolve();
        }),

        clear: jest.fn(() => {
          const keysToDelete: string[] = [];
          for (const key of mockStorageData.keys()) {
            if (key.startsWith('local:')) {
              keysToDelete.push(key);
            }
          }
          keysToDelete.forEach(key => mockStorageData.delete(key));
          return Promise.resolve();
        })
      },

      onChanged: {
        addListener: jest.fn((listener: any) => {
          storageListeners.push(listener);
        }),
        removeListener: jest.fn((listener: any) => {
          const index = storageListeners.indexOf(listener);
          if (index > -1) {
            storageListeners.splice(index, 1);
          }
        })
      }
    },

    tabs: {
      query: jest.fn((queryInfo: any) => {
        // Filter mockTabs based on queryInfo
        let filteredTabs = [...mockTabs];

        if (queryInfo.active !== undefined) {
          filteredTabs = filteredTabs.filter(tab => tab.active === queryInfo.active);
        }

        if (queryInfo.url) {
          const pattern = new RegExp(queryInfo.url.replace(/\*/g, '.*'));
          filteredTabs = filteredTabs.filter(tab => pattern.test(tab.url));
        }

        return Promise.resolve(filteredTabs);
      }),

      get: jest.fn((tabId: number) => {
        const tab = mockTabs.find(t => t.id === tabId);
        return Promise.resolve(tab || null);
      }),

      getCurrent: jest.fn(() => {
        const activeTab = mockTabs.find(t => t.active);
        return Promise.resolve(activeTab || null);
      }),

      sendMessage: jest.fn((tabId: number, message: any) => {
        // Simulate sending message to content script
        return Promise.resolve({ success: true });
      }),

      create: jest.fn((createProperties: any) => {
        const newTab = {
          id: mockTabs.length + 1,
          url: createProperties.url || 'about:blank',
          active: createProperties.active || false,
          windowId: 1,
          title: 'New Tab'
        };
        mockTabs.push(newTab);
        return Promise.resolve(newTab);
      }),

      update: jest.fn((tabId: number, updateProperties: any) => {
        const tab = mockTabs.find(t => t.id === tabId);
        if (tab) {
          Object.assign(tab, updateProperties);
        }
        return Promise.resolve(tab || null);
      }),

      remove: jest.fn((tabIds: number | number[]) => {
        const idsToRemove = Array.isArray(tabIds) ? tabIds : [tabIds];
        idsToRemove.forEach(id => {
          const index = mockTabs.findIndex(t => t.id === id);
          if (index > -1) {
            mockTabs.splice(index, 1);
          }
        });
        return Promise.resolve();
      })
    },

    action: {
      setBadgeText: jest.fn(() => Promise.resolve()),
      setBadgeBackgroundColor: jest.fn(() => Promise.resolve()),
      setTitle: jest.fn(() => Promise.resolve()),
      setIcon: jest.fn(() => Promise.resolve()),
      onClicked: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      }
    },

    downloads: {
      download: jest.fn((options: any) => {
        // Simulate successful download
        return Promise.resolve(12345); // Mock download ID
      })
    },

    commands: {
      onCommand: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      }
    }
  };

  // Helper function to simulate sending a message to the extension
  (browserMock as any)._simulateMessage = (message: any, sender: any = {}) => {
    const responses: any[] = [];
    runtimeListeners.forEach(listener => {
      const response = listener(message, { tab: sender.tab, id: 'mock-sender-id' });
      if (response instanceof Promise) {
        responses.push(response);
      }
    });
    return Promise.all(responses);
  };

  // Helper function to reset all mock data
  (browserMock as any)._reset = () => {
    mockStorageData.clear();
    runtimeListeners.length = 0;
    storageListeners.length = 0;
    mockTabs.length = 1; // Keep one default tab
    mockTabs[0] = {
      id: 1,
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      active: true,
      windowId: 1,
      title: 'Sample YouTube Video'
    };
  };

  return browserMock;
}

// Create the main mock instance
export const browserMock = createBrowserMock();

// Helper function to reset browser mocks between tests
export function resetBrowserMocks(mock: MockBrowser = browserMock) {
  (mock as any)._reset();
  jest.clearAllMocks();
}

/**
 * Helper function to simulate browser runtime message sending
 * Compatible with tests that expect this interface
 */
export function simulateRuntimeMessage(
  mock: MockBrowser,
  message: any,
  sender: any = { tab: { id: 1 } }
): Promise<any> {
  return new Promise((resolve, reject) => {
    // Get registered listeners from mock calls
    const addListenerMock = mock.runtime.onMessage.addListener as jest.MockedFunction<any>;
    const calls = addListenerMock.mock.calls;

    if (calls.length > 0) {
      const listener = calls[0][0]; // Get first registered listener
      try {
        // Firefox uses Promise-based message handling
        const result = listener(message, sender);

        if (result && result.then) {
          // If listener returns a Promise, wait for it
          result.then(resolve).catch(reject);
        } else {
          // If no Promise returned, resolve with the result or default response
          resolve(result || { success: true });
        }

        // Add timeout to prevent hanging if async response never comes
        setTimeout(() => {
          reject(new Error('Message handler timeout - no response received'));
        }, 1000);

      } catch (error: any) {
        resolve({ error: error.message });
      }
    } else {
      resolve({ success: true });
    }
  });
}

/**
 * Helper function to simulate browser storage changes
 */
export function simulateStorageChange(
  mock: MockBrowser,
  changes: Record<string, { oldValue?: any; newValue?: any }>,
  areaName: 'sync' | 'local' = 'sync'
): void {
  // Get the storage change listeners
  const addCalls = (mock.storage.onChanged.addListener as jest.MockedFunction<any>).mock.calls;
  const removeCalls = (mock.storage.onChanged.removeListener as jest.MockedFunction<any>).mock.calls;

  // Build list of active listeners (added but not removed)
  const activeListeners: any[] = [];

  addCalls.forEach((addCall: any[]) => {
    const listener = addCall[0];
    // Check if this listener was later removed
    const wasRemoved = removeCalls.some((removeCall: any[]) => removeCall[0] === listener);
    if (!wasRemoved) {
      activeListeners.push(listener);
    }
  });

  // Call only active listeners
  activeListeners.forEach((listener: any) => {
    try {
      listener(changes, areaName);
    } catch (error) {
      console.error('Error in storage change listener:', error);
    }
  });
}

// Compatibility alias for tests expecting resetChromeMocks
export const resetChromeMocks = resetBrowserMocks;

// Set up global browser mock
(global as any).browser = browserMock;

export default browserMock;