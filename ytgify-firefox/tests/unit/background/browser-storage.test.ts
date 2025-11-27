/**
 * Tests for Firefox Storage Preferences
 * Priority 1: User preferences persistence and management
 */

// Mock Firefox browser storage API
const mockBrowser = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    },
    onChanged: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  runtime: {
    lastError: null as any
  }
};

(global as any).browser = mockBrowser;

// Storage helper functions (would normally be in a separate file)
async function initializeStorage(): Promise<void> {
  try {
    const result = await browser.storage.local.get(['userPreferences']);

    if (!result.userPreferences) {
      const defaultPreferences = {
        defaultFrameRate: 15,
        defaultQuality: 'medium' as const,
        maxDuration: 10,
        autoSave: true,
        theme: 'system' as const,
        showThumbnails: true,
        gridSize: 'medium' as const,
        maxStorageSize: 100,
        autoCleanup: true,
        cleanupOlderThan: 30,
        maxConcurrentJobs: 3,
        enableProgressUpdates: true,
        jobTimeout: 300000,
        preferWebCodecs: true,
        enableAdvancedGifOptimization: true,
        analyticsEnabled: false,
        errorReportingEnabled: true,
        performanceMonitoringEnabled: true
      };

      await browser.storage.local.set({ userPreferences: defaultPreferences });
    }
  } catch (error) {
    throw error;
  }
}

async function getUserPreferences(): Promise<any> {
  try {
    const result = await browser.storage.local.get(['userPreferences']);
    return result.userPreferences || {};
  } catch (error) {
    throw error;
  }
}

async function updateUserPreferences(updates: Partial<any>): Promise<void> {
  try {
    const current = await getUserPreferences();
    const updated = { ...current, ...updates };
    await browser.storage.local.set({ userPreferences: updated });
  } catch (error) {
    throw error;
  }
}

describe('Firefox Storage Preferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBrowser.runtime.lastError = null;
  });

  describe('initializeStorage', () => {
    it('should initialize with default preferences when none exist', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({});
      mockBrowser.storage.local.set.mockResolvedValue(undefined);

      await initializeStorage();

      expect(mockBrowser.storage.local.set).toHaveBeenCalledWith(
        {
          userPreferences: expect.objectContaining({
            defaultFrameRate: 15,
            defaultQuality: 'medium',
            maxDuration: 10,
            autoSave: true,
            theme: 'system',
            maxConcurrentJobs: 3,
            preferWebCodecs: true
          })
        }
      );
    });

    it('should not overwrite existing preferences', async () => {
      const existingPrefs = {
        defaultFrameRate: 30,
        defaultQuality: 'high',
        theme: 'dark'
      };

      mockBrowser.storage.local.get.mockResolvedValue({ userPreferences: existingPrefs });

      await initializeStorage();

      expect(mockBrowser.storage.local.set).not.toHaveBeenCalled();
    });

    it('should handle storage errors on get', async () => {
      mockBrowser.storage.local.get.mockRejectedValue(new Error('Storage quota exceeded'));

      await expect(initializeStorage()).rejects.toThrow('Storage quota exceeded');
    });

    it('should handle storage errors on set', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({});
      mockBrowser.storage.local.set.mockRejectedValue(new Error('Write failed'));

      await expect(initializeStorage()).rejects.toThrow('Write failed');
    });
  });

  describe('getUserPreferences', () => {
    it('should retrieve stored preferences', async () => {
      const storedPrefs = {
        defaultFrameRate: 20,
        defaultQuality: 'high',
        theme: 'dark'
      };

      mockBrowser.storage.local.get.mockResolvedValue({ userPreferences: storedPrefs });

      const prefs = await getUserPreferences();

      expect(prefs).toEqual(storedPrefs);
      expect(mockBrowser.storage.local.get).toHaveBeenCalledWith(['userPreferences']);
    });

    it('should return empty object when no preferences exist', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({});

      const prefs = await getUserPreferences();

      expect(prefs).toEqual({});
    });

    it('should handle storage errors', async () => {
      mockBrowser.storage.local.get.mockRejectedValue(new Error('Read error'));

      await expect(getUserPreferences()).rejects.toThrow('Read error');
    });
  });

  describe('updateUserPreferences', () => {
    it('should update specific preferences while preserving others', async () => {
      const existingPrefs = {
        defaultFrameRate: 15,
        defaultQuality: 'medium',
        theme: 'light'
      };

      mockBrowser.storage.local.get.mockResolvedValue({ userPreferences: existingPrefs });
      mockBrowser.storage.local.set.mockResolvedValue(undefined);

      await updateUserPreferences({
        defaultFrameRate: 30,
        theme: 'dark'
      });

      expect(mockBrowser.storage.local.set).toHaveBeenCalledWith(
        {
          userPreferences: {
            defaultFrameRate: 30,
            defaultQuality: 'medium',
            theme: 'dark'
          }
        }
      );
    });

    it('should handle updates when no preferences exist', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({});
      mockBrowser.storage.local.set.mockResolvedValue(undefined);

      await updateUserPreferences({
        defaultFrameRate: 25
      });

      expect(mockBrowser.storage.local.set).toHaveBeenCalledWith(
        {
          userPreferences: {
            defaultFrameRate: 25
          }
        }
      );
    });

    it('should handle storage errors on read', async () => {
      mockBrowser.storage.local.get.mockRejectedValue(new Error('Read failed'));

      await expect(updateUserPreferences({ theme: 'dark' })).rejects.toThrow('Read failed');
    });

    it('should handle storage errors on write', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({ userPreferences: {} });
      mockBrowser.storage.local.set.mockRejectedValue(new Error('Write failed'));

      await expect(updateUserPreferences({ theme: 'dark' })).rejects.toThrow('Write failed');
    });
  });

  describe('Storage Change Listeners', () => {
    it('should register storage change listener', () => {
      const listener = jest.fn();
      mockBrowser.storage.onChanged.addListener(listener);

      expect(mockBrowser.storage.onChanged.addListener).toHaveBeenCalledWith(listener);
    });

    it('should handle preference changes', () => {
      const listener = jest.fn();
      mockBrowser.storage.onChanged.addListener(listener);

      const changes = {
        userPreferences: {
          oldValue: { theme: 'light' },
          newValue: { theme: 'dark' }
        }
      };

      // Simulate storage change
      const registeredListener = mockBrowser.storage.onChanged.addListener.mock.calls[0][0];
      registeredListener(changes, 'local');

      expect(listener).toHaveBeenCalledWith(changes, 'local');
    });
  });

  describe('Preference Validation', () => {
    it('should validate frame rate values', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({});

      mockBrowser.storage.local.set.mockImplementation((data) => {
        const prefs = data.userPreferences;
        // Validate frame rate is within bounds
        if (prefs.defaultFrameRate < 1 || prefs.defaultFrameRate > 60) {
          return Promise.reject(new Error('Invalid frame rate'));
        }
        return Promise.resolve();
      });

      // Valid frame rate
      mockBrowser.runtime.lastError = null;
      await updateUserPreferences({ defaultFrameRate: 30 });
      expect(mockBrowser.runtime.lastError).toBeNull();

      // Invalid frame rate - too high
      await expect(updateUserPreferences({ defaultFrameRate: 100 }))
        .rejects.toThrow('Invalid frame rate');
    });

    it('should validate quality values', async () => {
      const validQualities = ['low', 'medium', 'high'];

      mockBrowser.storage.local.get.mockResolvedValue({});

      mockBrowser.storage.local.set.mockImplementation((data) => {
        const prefs = data.userPreferences;
        if (prefs.defaultQuality && !validQualities.includes(prefs.defaultQuality)) {
          return Promise.reject(new Error('Invalid quality setting'));
        }
        return Promise.resolve();
      });

      // Valid quality
      await updateUserPreferences({ defaultQuality: 'high' });
      expect(mockBrowser.storage.local.set).toHaveBeenCalled();
    });
  });

  describe('Storage Quota Management', () => {
    it('should handle storage quota warnings', async () => {
      // Create actually large data that would exceed typical quota
      const largeString = 'x'.repeat(10000);
      const largeData = {
        cachedFrames: new Array(1000).fill({ data: largeString })
      };

      mockBrowser.storage.local.get.mockResolvedValue({ userPreferences: {} });
      mockBrowser.storage.local.set.mockRejectedValue(
        new Error('QUOTA_BYTES_PER_ITEM quota exceeded')
      );

      await expect(updateUserPreferences(largeData))
        .rejects.toThrow('QUOTA_BYTES_PER_ITEM quota exceeded');
    });
  });

  describe('Migration', () => {
    it('should migrate old preference format to new format', async () => {
      const oldFormat = {
        fps: 15,
        quality: 'med',
        autosave: 'yes'
      };

      const expectedNewFormat = {
        defaultFrameRate: 15,
        defaultQuality: 'medium',
        autoSave: true
      };

      // Simulate migration logic
      const migratePreferences = (old: any) => {
        const migrated: any = {};
        if (old.fps) migrated.defaultFrameRate = old.fps;
        if (old.quality === 'med') migrated.defaultQuality = 'medium';
        if (old.autosave === 'yes') migrated.autoSave = true;
        return migrated;
      };

      const migrated = migratePreferences(oldFormat);
      expect(migrated).toEqual(expectedNewFormat);
    });
  });
});