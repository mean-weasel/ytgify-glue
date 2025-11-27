/**
 * IndexedDB cleanup utilities
 * Used for removing deprecated storage on extension updates
 */

import { logger } from '../lib/logger';

/**
 * Deletes an IndexedDB database completely
 * Handles blocked state (database open in other tabs) with retry logic
 *
 * @param dbName - Name of the database to delete
 * @param maxRetries - Maximum number of retry attempts for blocked databases
 * @param retryDelay - Delay in milliseconds between retries
 * @returns Promise that resolves when database is deleted or max retries reached
 */
export async function deleteDatabase(
  dbName: string,
  maxRetries = 3,
  retryDelay = 1000
): Promise<void> {
  return new Promise((resolve, reject) => {
    let retryCount = 0;

    const attemptDelete = () => {
      const request = indexedDB.deleteDatabase(dbName);

      request.onsuccess = () => {
        logger.info(`[Cleanup] Successfully deleted database: ${dbName}`);
        resolve();
      };

      request.onerror = () => {
        logger.error(`[Cleanup] Error deleting database: ${dbName}`, { error: request.error });
        reject(request.error);
      };

      request.onblocked = () => {
        retryCount++;
        logger.warn(
          `[Cleanup] Database deletion blocked (attempt ${retryCount}/${maxRetries}): ${dbName}`
        );

        if (retryCount < maxRetries) {
          setTimeout(attemptDelete, retryDelay);
        } else {
          logger.error(
            `[Cleanup] Database deletion failed after ${maxRetries} attempts: ${dbName}`
          );
          // Resolve instead of reject to prevent blocking extension
          resolve();
        }
      };
    };

    attemptDelete();
  });
}

/**
 * Checks if an IndexedDB database exists
 *
 * @param dbName - Name of the database to check
 * @returns Promise that resolves to true if database exists, false otherwise
 */
export async function databaseExists(dbName: string): Promise<boolean> {
  if (typeof indexedDB === 'undefined') {
    return false;
  }

  try {
    const databases = await indexedDB.databases();
    return databases.some((db) => db.name === dbName);
  } catch (error) {
    // indexedDB.databases() not supported in some browsers
    // Attempt to open and check if it exists
    return new Promise((resolve) => {
      const request = indexedDB.open(dbName);

      request.onsuccess = () => {
        const db = request.result;
        const exists = db.objectStoreNames.length > 0;
        db.close();
        resolve(exists);
      };

      request.onerror = () => {
        resolve(false);
      };

      request.onupgradeneeded = () => {
        // Database doesn't exist (onupgradeneeded only fires for new databases)
        request.transaction?.abort();
        resolve(false);
      };
    });
  }
}
