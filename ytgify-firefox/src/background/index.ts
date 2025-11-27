// Firefox Background Event Page for YTgify
// Uses browser.* namespace directly (Firefox native support)
// Converted from Chrome Service Worker to Firefox Event Page

import { ExtensionMessage } from '@/types';
import { messageHandler } from './message-handler';
import { backgroundWorker } from './worker';
import { logger } from '@/lib/logger';
import { initializeMessageBus } from '@/shared/message-bus';
import { sharedLogger, sharedErrorHandler, extensionStateManager } from '@/shared';
import { engagementTracker } from '@/shared/engagement-tracker';
import { MigrationManager } from './migrations';

// Declare browser namespace for Firefox
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const browser: any;

// Firefox Event Page lifecycle events
browser.runtime.onInstalled.addListener(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (details: any) => {
    const endTimer = await sharedLogger.startPerformanceTimer('extension_installation');

    try {
      sharedLogger.info(
        '[Background] YTgify Firefox extension installed',
        {
          reason: details.reason,
          version: browser.runtime.getManifest().version,
        },
        'background'
      );

      sharedLogger.trackEvent('extension_installed', {
        reason: details.reason,
        version: browser.runtime.getManifest().version,
      });

      // Run migrations (for updates and new installs)
      if (details.reason === 'update' || details.reason === 'install') {
        try {
          const migrationManager = new MigrationManager();
          await migrationManager.runMigrations();
          sharedLogger.info('[Background] Migrations completed', {}, 'background');
        } catch (error) {
          sharedLogger.error('[Background] Migration failed (non-fatal):', error, 'background');
          // Continue with extension initialization even if migration fails
        }
      }

      // Initialize default storage
      await initializeStorage();

      if (details.reason === 'install') {
        // First install
        sharedLogger.info('[Background] First install completed', {}, 'background');
        sharedLogger.trackUserAction('first_install');

        // Initialize engagement tracking
        await engagementTracker.initializeEngagement();
        sharedLogger.info('[Background] Engagement tracking initialized', {}, 'background');
      }

      endTimer();
    } catch (error) {
      endTimer();
      sharedErrorHandler.handleError(error, { context: 'extension_installation' });
      throw error;
    }
  }
);

browser.runtime.onStartup.addListener(
  async () => {
    sharedLogger.info('[Background] YTgify Firefox extension started', {}, 'background');
    sharedLogger.trackEvent('extension_started');

    // Initialize extension state on startup
    await extensionStateManager.clearRuntimeState();
  }
);

// Firefox message handling with native Promise support
browser.runtime.onMessage.addListener(
  async (
    message: ExtensionMessage,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sender: any
  ): Promise<ExtensionMessage> => {
    const messageStartTime = performance.now();
    const messageId = message?.id || 'unknown';
    const messageType = message?.type || 'unknown';

    try {
      // Validate message structure
      if (!message || !message.type) {
        sharedLogger.warn(
          '[Background] Invalid message received',
          {
            message,
            sender: sender.tab?.url,
          },
          'background'
        );

        sharedLogger.trackEvent('invalid_message_received', {
          senderUrl: sender.tab?.url,
          senderId: sender.tab?.id,
        });

        return {
          type: 'ERROR_RESPONSE',
          success: false,
          error: 'Invalid message structure',
        } as ExtensionMessage;
      }

      sharedLogger.debug(
        '[Background] Received message',
        {
          type: messageType,
          from: sender.tab?.url || 'popup',
          messageId: messageId,
        },
        'background'
      );

      sharedLogger.trackEvent('message_received', {
        messageType,
        source: sender.tab?.url ? 'content' : 'popup',
      });

      // Use message handler with Firefox's Promise-based approach
      // Firefox doesn't need sendResponse callback - returns Promise directly
      const response = await messageHandler.handleMessage(message, sender, undefined);

      sharedLogger.trackPerformance('message_handling', messageStartTime, {
        messageType,
        success: true,
      });

      // Filter out Chrome-style 'true' return values (used to keep channel open)
      // In Firefox, we return Promise directly - no need for keep-alive boolean
      return (response === true || !response)
        ? { type: 'SUCCESS_RESPONSE', success: true } as ExtensionMessage
        : response;
    } catch (error) {
      sharedLogger.trackPerformance('message_handling', messageStartTime, {
        messageType,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });

      sharedLogger.error(
        '[Background] Message handling failed',
        {
          error: error instanceof Error ? error.message : String(error),
          messageType,
          messageId,
        },
        'background'
      );

      sharedErrorHandler.handleError(error, {
        messageType,
        messageId,
        senderId: sender.tab?.id,
        senderUrl: sender.tab?.url,
        context: 'message_handling',
      });

      return {
        type: 'ERROR_RESPONSE',
        success: false,
        error: error instanceof Error ? error.message : 'Message handling failed',
      } as ExtensionMessage;
    }
  }
);

// Handle keyboard command
browser.commands.onCommand.addListener(async (command: string) => {
  if (command === '_execute_action') {
    // Get the active tab
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];

    if (!tab || !tab.id || !tab.url) {
      return;
    }

    const isYouTubePage =
      tab.url.includes('youtube.com/watch') || tab.url.includes('youtube.com/shorts');

    if (!isYouTubePage) {
      await browser.tabs.update(tab.id, { url: 'https://www.youtube.com' });
      return;
    }

    // Send message to content script to show wizard
    try {
      await browser.tabs.sendMessage(tab.id, {
        type: 'SHOW_WIZARD_DIRECT',
        data: { triggeredBy: 'command' },
      });
    } catch (error) {
      console.error('[BACKGROUND] Failed to send message:', error);
    }
  }
});

// Initialize storage with Firefox-optimized settings
async function initializeStorage(): Promise<void> {
  const endTimer = await sharedLogger.startPerformanceTimer('storage_initialization');

  try {
    const result = await browser.storage.local.get(['userPreferences']);

    if (!result.userPreferences) {
      // Set default preferences optimized for Firefox
      const defaultPreferences = {
        defaultFrameRate: 15,
        defaultQuality: 'medium' as const,
        maxDuration: 10,
        autoSave: true,
        theme: 'system' as const,
        showThumbnails: true,
        gridSize: 'medium' as const,
        maxStorageSize: 100, // 100MB
        autoCleanup: true,
        cleanupOlderThan: 30, // 30 days
        maxConcurrentJobs: 3,
        enableProgressUpdates: true,
        jobTimeout: 300000, // 5 minutes
        preferWebCodecs: false, // Firefox doesn't support WebCodecs well yet
        enableAdvancedGifOptimization: true,
        analyticsEnabled: false,
        errorReportingEnabled: true,
        performanceMonitoringEnabled: true,
      };

      await browser.storage.local.set({ userPreferences: defaultPreferences });

      sharedLogger.info('[Background] Initialized default preferences for Firefox', {}, 'background');
      sharedLogger.trackEvent('preferences_initialized', { isFirstTime: true });
    } else {
      sharedLogger.info('[Background] Using existing user preferences', {}, 'background');
      sharedLogger.trackEvent('preferences_loaded', { isFirstTime: false });

      // Migrate old preferences if needed
      await migratePreferences(result.userPreferences);
    }

    endTimer();
  } catch (error) {
    endTimer();
    sharedLogger.error(
      '[Background] Failed to initialize storage',
      {
        error: error instanceof Error ? error.message : String(error),
      },
      'background'
    );

    sharedErrorHandler.handleError(error, { context: 'storage_initialization' });
    throw error;
  }
}

// Migrate preferences to ensure compatibility with Firefox
async function migratePreferences(preferences: Record<string, unknown>): Promise<void> {
  try {
    let needsUpdate = false;
    const updatedPreferences = { ...preferences };

    // Ensure Firefox-specific settings
    if (updatedPreferences.preferWebCodecs !== false) {
      updatedPreferences.preferWebCodecs = false; // Firefox doesn't support WebCodecs well
      needsUpdate = true;
    }

    // Add new analytics preferences if missing
    if (!('analyticsEnabled' in updatedPreferences)) {
      updatedPreferences.analyticsEnabled = false;
      needsUpdate = true;
    }

    if (!('errorReportingEnabled' in updatedPreferences)) {
      updatedPreferences.errorReportingEnabled = true;
      needsUpdate = true;
    }

    if (!('performanceMonitoringEnabled' in updatedPreferences)) {
      updatedPreferences.performanceMonitoringEnabled = true;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await browser.storage.local.set({ userPreferences: updatedPreferences });
      sharedLogger.info(
        '[Background] Migrated user preferences for Firefox',
        {
          addedFields: Object.keys(updatedPreferences).filter((key) => !(key in preferences)),
        },
        'background'
      );

      sharedLogger.trackEvent('preferences_migrated');
    }
  } catch (error) {
    sharedLogger.warn(
      '[Background] Failed to migrate preferences',
      {
        error: error instanceof Error ? error.message : String(error),
      },
      'background'
    );
  }
}

// Firefox doesn't have onSuspend event - use different cleanup approach
// Firefox event pages persist longer than Chrome service workers
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startPeriodicCleanup(): void {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    try {
      // Clean up old jobs every 5 minutes
      const cleanedJobs = backgroundWorker.cleanupOldJobs();

      if (cleanedJobs > 0) {
        logger.debug('[Background] Cleaned up old jobs', { count: cleanedJobs });
      }

      // Log worker status periodically
      const workerStats = backgroundWorker.getQueueStatus();
      const handlerStats = messageHandler.getStatistics();

      if (workerStats.queueLength > 0 || handlerStats.activeJobs > 0) {
        logger.debug('[Background] Worker status', { workerStats, handlerStats });
      }
    } catch (error) {
      logger.error('[Background] Error in periodic cleanup', { error });
    }
  }, 300000); // Every 5 minutes
}

// Clean up on unload (Firefox-specific)
if (typeof self !== 'undefined' && 'addEventListener' in self) {
  self.addEventListener('unload', () => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }

    logger.info('[Background] Firefox event page unloading - performing cleanup');

    try {
      // Cleanup message handler resources
      messageHandler.cleanup();

      // Cleanup old worker jobs
      backgroundWorker.cleanupOldJobs();

      // Clear logger buffer if needed
      logger.clearLogBuffer();
    } catch (error) {
      logger.error('[Background] Error during cleanup', { error });
    }
  });
}

// Initialize periodic cleanup
startPeriodicCleanup();

// Initialize the message bus for Firefox
initializeMessageBus({
  enableLogging: true,
  requestTimeout: 30000,
  maxRetries: 3,
  validateMessages: true,
  enableProgressTracking: true,
});

// Log successful initialization
logger.info('[Background] Firefox event page initialized', {
  messageHandlerEnabled: true,
  backgroundWorkerEnabled: true,
  messageBusEnabled: true,
  platform: 'Firefox',
  manifestVersion: browser.runtime.getManifest().manifest_version,
});

export {};