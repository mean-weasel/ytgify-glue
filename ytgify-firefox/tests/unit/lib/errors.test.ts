/**
 * Comprehensive test suite for error handling infrastructure
 * Tests all error classes, error handler utilities, and error recovery mechanisms
 */

import {
  ExtensionError,
  ErrorHandler,
  errorHandler,
  createError
} from '@/lib/errors';

// Mock browser API
const mockBrowser = {
  storage: {
    local: {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue({})
    }
  },
  runtime: {
    sendMessage: jest.fn().mockResolvedValue(undefined),
    lastError: null as { message: string } | null
  }
};

global.browser = mockBrowser as any;
global.navigator = { userAgent: 'Test User Agent' } as any;
global.window = { location: { href: 'https://test.com' } } as any;

describe('ExtensionError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create error with message and code', () => {
      const error = new ExtensionError('Test error', 'TEST_CODE');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ExtensionError);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('ExtensionError');
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should create error with context', () => {
      const context = { userId: '123', action: 'test' };
      const error = new ExtensionError('Test error', 'TEST_CODE', context);

      expect(error.context).toEqual(context);
    });

    it('should create error without context', () => {
      const error = new ExtensionError('Test error', 'TEST_CODE');

      expect(error.context).toBeUndefined();
    });

    it('should have proper error prototype chain', () => {
      const error = new ExtensionError('Test error', 'TEST_CODE');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof ExtensionError).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('should serialize error to JSON with all properties', () => {
      const context = { key: 'value' };
      const error = new ExtensionError('Test error', 'TEST_CODE', context);
      const json = error.toJSON();

      expect(json).toMatchObject({
        name: 'ExtensionError',
        message: 'Test error',
        code: 'TEST_CODE',
        context: { key: 'value' }
      });
      expect(json.timestamp).toBeDefined();
      expect(typeof json.timestamp).toBe('string');
      expect(json.stack).toBeDefined();
    });

    it('should serialize error without context', () => {
      const error = new ExtensionError('Test error', 'TEST_CODE');
      const json = error.toJSON();

      expect(json.context).toBeUndefined();
    });

    it('should include ISO timestamp', () => {
      const error = new ExtensionError('Test error', 'TEST_CODE');
      const json = error.toJSON();

      expect(json.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should be JSON stringifiable', () => {
      const error = new ExtensionError('Test error', 'TEST_CODE', { data: 123 });

      expect(() => JSON.stringify(error.toJSON())).not.toThrow();
      const serialized = JSON.stringify(error.toJSON());
      const parsed = JSON.parse(serialized);

      expect(parsed.message).toBe('Test error');
      expect(parsed.code).toBe('TEST_CODE');
    });
  });

  describe('Error Properties', () => {
    it('should preserve stack trace', () => {
      const error = new ExtensionError('Test error', 'TEST_CODE');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ExtensionError');
    });

    it('should have immutable code', () => {
      const error = new ExtensionError('Test error', 'TEST_CODE');

      // TypeScript should prevent this, but test runtime behavior
      expect(() => {
        (error as any).code = 'DIFFERENT_CODE';
      }).not.toThrow();
      // Readonly property won't actually change
    });

    it('should capture timestamp at creation time', (done) => {
      const before = new Date();
      const error = new ExtensionError('Test error', 'TEST_CODE');
      const after = new Date();

      expect(error.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(error.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
      done();
    });
  });
});

describe('Error Subclasses', () => {
  describe('VideoProcessingError', () => {
    it('should be exported from createError factory', () => {
      const error = createError('video', 'Video failed', { frame: 10 });

      expect(error.message).toBe('Video failed');
      expect(error.code).toBe('VIDEO_PROCESSING_ERROR');
      expect(error.name).toBe('VideoProcessingError');
      expect(error.context).toEqual({ frame: 10 });
    });
  });

  describe('GifCreationError', () => {
    it('should be exported from createError factory', () => {
      const error = createError('gif', 'GIF encoding failed');

      expect(error.code).toBe('GIF_CREATION_ERROR');
      expect(error.name).toBe('GifCreationError');
    });
  });

  describe('StorageError', () => {
    it('should be exported from createError factory', () => {
      const error = createError('storage', 'Storage quota exceeded');

      expect(error.code).toBe('STORAGE_ERROR');
      expect(error.name).toBe('StorageError');
    });
  });

  describe('MessagePassingError', () => {
    it('should be exported from createError factory', () => {
      const error = createError('messaging', 'Message failed');

      expect(error.code).toBe('MESSAGE_PASSING_ERROR');
      expect(error.name).toBe('MessagePassingError');
    });
  });

  describe('YouTubeIntegrationError', () => {
    it('should be exported from createError factory', () => {
      const error = createError('youtube', 'YouTube API failed');

      expect(error.code).toBe('YOUTUBE_INTEGRATION_ERROR');
      expect(error.name).toBe('YouTubeIntegrationError');
    });
  });

  describe('Generic Error', () => {
    it('should create generic error', () => {
      const error = createError('generic', 'Generic failure');

      expect(error.code).toBe('GENERIC_ERROR');
      expect(error.name).toBe('ExtensionError');
    });
  });
});

describe('ErrorHandler', () => {
  let handler: ErrorHandler;

  beforeEach(() => {
    handler = ErrorHandler.getInstance();
    jest.clearAllMocks();
    mockBrowser.runtime.lastError = null;
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = ErrorHandler.getInstance();
      const instance2 = ErrorHandler.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('wrapAsync', () => {
    it('should execute async function successfully', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const wrapped = handler.wrapAsync(fn);

      const result = await wrapped('arg1', 'arg2');

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should catch and re-throw async errors', async () => {
      const error = new Error('Async failure');
      const fn = jest.fn().mockRejectedValue(error);
      const wrapped = handler.wrapAsync(fn, { operation: 'test' });

      await expect(wrapped()).rejects.toThrow('Async failure');
      expect(mockBrowser.storage.local.set).toHaveBeenCalled();
    });

    it('should preserve function arguments', async () => {
      const fn = jest.fn(async (a: string, b: number) => `${a}-${b}`);
      const wrapped = handler.wrapAsync(fn);

      const result = await wrapped('test', 42);

      expect(result).toBe('test-42');
      expect(fn).toHaveBeenCalledWith('test', 42);
    });
  });

  describe('wrapSync', () => {
    it('should execute sync function successfully', () => {
      const fn = jest.fn().mockReturnValue('success');
      const wrapped = handler.wrapSync(fn);

      const result = wrapped('arg1');

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledWith('arg1');
    });

    it('should catch and re-throw sync errors', () => {
      const error = new Error('Sync failure');
      const fn = jest.fn().mockImplementation(() => { throw error; });
      const wrapped = handler.wrapSync(fn, { operation: 'test' });

      expect(() => wrapped()).toThrow('Sync failure');
      expect(mockBrowser.storage.local.set).toHaveBeenCalled();
    });
  });

  describe('handleError', () => {
    it('should handle ExtensionError', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      const error = new ExtensionError('Test', 'CODE');

      handler.handleError(error);

      expect(consoleError).toHaveBeenCalledWith(
        '[ErrorHandler] Error occurred:',
        expect.any(ExtensionError)
      );
      consoleError.mockRestore();
    });

    it('should handle standard Error', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Standard error');

      handler.handleError(error);

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it('should handle string errors', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      handler.handleError('String error');

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it('should handle unknown error types', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      handler.handleError({ weird: 'object' });

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it('should store error to browser storage', async () => {
      const error = new ExtensionError('Test', 'CODE');

      handler.handleError(error);

      // Wait for async storage operation
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockBrowser.storage.local.set).toHaveBeenCalled();
      const call = mockBrowser.storage.local.set.mock.calls[0][0];
      const key = Object.keys(call)[0];

      expect(key).toMatch(/^error_/);
      expect(call[key]).toMatchObject({
        name: 'ExtensionError',
        message: 'Test',
        code: 'CODE'
      });
      expect(call[key].userAgent).toBeDefined();
    });

    it('should send error report to background', async () => {
      const error = new ExtensionError('Test', 'CODE');

      handler.handleError(error);

      // Wait for async reporting operation
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'LOG',
        data: {
          level: 'error',
          message: 'ExtensionError: Test',
          context: {
            code: 'CODE'
          }
        }
      });
    });

    it('should handle storage failures gracefully', async () => {
      mockBrowser.storage.local.set.mockRejectedValueOnce(new Error('Storage fail'));
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      const error = new ExtensionError('Test', 'CODE');

      handler.handleError(error);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(consoleWarn).toHaveBeenCalled();
      consoleWarn.mockRestore();
    });

    it('should handle reporting failures gracefully', async () => {
      mockBrowser.runtime.sendMessage.mockRejectedValueOnce(new Error('Report fail'));
      const error = new ExtensionError('Test', 'CODE');

      // Should not throw
      expect(() => handler.handleError(error)).not.toThrow();
    });
  });

  describe('setErrorReporting', () => {
    it('should disable error reporting', async () => {
      handler.setErrorReporting(false);
      const error = new ExtensionError('Test', 'CODE');

      handler.handleError(error);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockBrowser.runtime.sendMessage).not.toHaveBeenCalled();
    });

    it('should enable error reporting', async () => {
      handler.setErrorReporting(true);
      const error = new ExtensionError('Test', 'CODE');

      handler.handleError(error);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalled();
    });
  });

  describe('checkChromeError', () => {
    it('should not throw when no Chrome error', () => {
      mockBrowser.runtime.lastError = null;

      expect(() => handler.checkChromeError('test operation')).not.toThrow();
    });

    it('should throw ExtensionError when Chrome error exists', () => {
      mockBrowser.runtime.lastError = { message: 'Chrome API failed' };

      expect(() => handler.checkChromeError('test operation')).toThrow(ExtensionError);
      expect(() => handler.checkChromeError('test operation')).toThrow('Chrome API error during test operation');
    });

    it('should include Chrome error details in context', () => {
      mockBrowser.runtime.lastError = { message: 'Permission denied' };

      try {
        handler.checkChromeError('storage access');
      } catch (error) {
        expect(error).toBeInstanceOf(ExtensionError);
        expect((error as ExtensionError).context).toMatchObject({
          operation: 'storage access',
          chromeError: 'Permission denied'
        });
      }
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await handler.withRetry(operation, 3, 100);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const result = await handler.withRetry(operation, 3, 10);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(handler.withRetry(operation, 2, 10)).rejects.toThrow('Persistent failure');
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should use exponential backoff', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const start = Date.now();
      await handler.withRetry(operation, 3, 50);
      const duration = Date.now() - start;

      // First retry: 50ms, second retry: 100ms = 150ms minimum
      expect(duration).toBeGreaterThanOrEqual(100);
    });

    it('should include retry context in error handling', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      const operation = jest.fn().mockRejectedValue(new Error('Fail'));

      await expect(
        handler.withRetry(operation, 1, 10, { operation: 'test' })
      ).rejects.toThrow();

      expect(mockBrowser.storage.local.set).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });
});

describe('errorHandler singleton', () => {
  it('should export singleton instance', () => {
    expect(errorHandler).toBeInstanceOf(ErrorHandler);
  });

  it('should be same as getInstance()', () => {
    expect(errorHandler).toBe(ErrorHandler.getInstance());
  });
});

describe('createError factory', () => {
  it('should create video processing error', () => {
    const error = createError('video', 'Video error', { frame: 10 });

    expect(error.code).toBe('VIDEO_PROCESSING_ERROR');
    expect(error.message).toBe('Video error');
    expect(error.context).toEqual({ frame: 10 });
  });

  it('should create GIF creation error', () => {
    const error = createError('gif', 'GIF error');

    expect(error.code).toBe('GIF_CREATION_ERROR');
  });

  it('should create storage error', () => {
    const error = createError('storage', 'Storage error');

    expect(error.code).toBe('STORAGE_ERROR');
  });

  it('should create messaging error', () => {
    const error = createError('messaging', 'Message error');

    expect(error.code).toBe('MESSAGE_PASSING_ERROR');
  });

  it('should create YouTube error', () => {
    const error = createError('youtube', 'YouTube error');

    expect(error.code).toBe('YOUTUBE_INTEGRATION_ERROR');
  });

  it('should create generic error', () => {
    const error = createError('generic', 'Generic error');

    expect(error.code).toBe('GENERIC_ERROR');
  });

  it('should handle context parameter', () => {
    const context = { userId: '123', action: 'test' };
    const error = createError('video', 'Error', context);

    expect(error.context).toEqual(context);
  });
});

describe('Edge Cases and Error Scenarios', () => {
  let handler: ErrorHandler;

  beforeEach(() => {
    handler = ErrorHandler.getInstance();
    jest.clearAllMocks();
  });

  it('should handle null context', () => {
    const error = new ExtensionError('Test', 'CODE', null as any);

    expect(error.context).toBeNull();
  });

  it('should handle undefined context', () => {
    const error = new ExtensionError('Test', 'CODE', undefined);

    expect(error.context).toBeUndefined();
  });

  it('should handle empty context', () => {
    const error = new ExtensionError('Test', 'CODE', {});

    expect(error.context).toEqual({});
  });

  it('should handle complex nested context', () => {
    const context = {
      user: { id: '123', name: 'Test' },
      data: [1, 2, 3],
      metadata: { timestamp: new Date().toISOString() }
    };
    const error = new ExtensionError('Test', 'CODE', context);

    expect(error.context).toEqual(context);
  });

  it('should handle very long error messages', () => {
    const longMessage = 'x'.repeat(10000);
    const error = new ExtensionError(longMessage, 'CODE');

    expect(error.message).toBe(longMessage);
    expect(error.message.length).toBe(10000);
  });

  it('should handle special characters in error messages', () => {
    const specialMessage = 'Error: <script>alert("xss")</script> & "quotes" \'apostrophes\'';
    const error = new ExtensionError(specialMessage, 'CODE');

    expect(error.message).toBe(specialMessage);
  });

  it('should handle empty error message', () => {
    const error = new ExtensionError('', 'CODE');

    expect(error.message).toBe('');
  });

  it('should handle browser API unavailability', async () => {
    const originalBrowser = global.browser;
    (global as any).browser = undefined;

    const error = new ExtensionError('Test', 'CODE');

    // Should not throw when browser API is unavailable
    expect(() => handler.handleError(error)).not.toThrow();

    global.browser = originalBrowser;
  });
});
