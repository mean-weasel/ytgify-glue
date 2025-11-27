/**
 * Extension migration system
 * Handles one-time operations when users update to new versions
 */

import { logger } from '../lib/logger';
import { deleteDatabase, databaseExists } from '../storage/cleanup';

const MIGRATION_KEY = 'ytgify_last_migration';

interface Migration {
  version: number;
  description: string;
  run: () => Promise<void>;
}

/**
 * All migrations in order
 * Each migration runs exactly once per extension installation
 */
const migrations: Migration[] = [
  {
    version: 1,
    description: 'Remove deprecated GIF storage (IndexedDB)',
    run: async () => {
      const dbName = 'YouTubeGifStore';

      logger.info('[Migration] Checking for deprecated GIF database...');

      const exists = await databaseExists(dbName);
      if (exists) {
        logger.info('[Migration] Found deprecated database, deleting...');
        await deleteDatabase(dbName);
        logger.info('[Migration] Deprecated database deleted successfully');
      } else {
        logger.info('[Migration] No deprecated database found, skipping');
      }
    },
  },
];

/**
 * Manages extension migrations
 */
export class MigrationManager {
  /**
   * Gets the version number of the last successfully run migration
   */
  private async getLastMigration(): Promise<number> {
    try {
      const result = await browser.storage.local.get(MIGRATION_KEY);
      return result[MIGRATION_KEY] || 0;
    } catch (error) {
      logger.error('[Migration] Error reading last migration version:', error);
      return 0;
    }
  }

  /**
   * Sets the version number of the last successfully run migration
   */
  private async setLastMigration(version: number): Promise<void> {
    try {
      await browser.storage.local.set({ [MIGRATION_KEY]: version });
      logger.info(`[Migration] Set last migration version to ${version}`);
    } catch (error) {
      logger.error('[Migration] Error saving migration version:', error);
    }
  }

  /**
   * Runs all pending migrations
   * Migrations are run in order, and only migrations with version > last run version are executed
   * If a migration fails, it will be retried on next extension startup
   */
  async runMigrations(): Promise<void> {
    const lastRun = await this.getLastMigration();
    logger.info(`[Migration] Last migration version: ${lastRun}`);

    const pendingMigrations = migrations.filter((m) => m.version > lastRun);

    if (pendingMigrations.length === 0) {
      logger.info('[Migration] No pending migrations');
      return;
    }

    logger.info(`[Migration] Running ${pendingMigrations.length} pending migration(s)`);

    for (const migration of pendingMigrations) {
      try {
        logger.info(`[Migration] Running migration ${migration.version}: ${migration.description}`);
        await migration.run();
        await this.setLastMigration(migration.version);
        logger.info(`[Migration] Migration ${migration.version} completed successfully`);
      } catch (error) {
        logger.error(`[Migration] Migration ${migration.version} failed:`, error);
        // Don't set migration version on failure - it will retry next startup
        // Don't throw - allow extension to continue working
        break;
      }
    }

    logger.info('[Migration] Migration process completed');
  }
}
