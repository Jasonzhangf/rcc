import { ILogger } from '../types';

export interface MigrationStep {
  version: string;
  description: string;
  migrate: (config: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

export class ConfigMigrator {
  private logger: ILogger;
  private migrations: MigrationStep[];

  constructor(logger: ILogger) {
    this.logger = logger;
    this.migrations = [];
  }

  addMigration(step: MigrationStep): void {
    this.migrations.push(step);
    this.migrations.sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true, sensitivity: 'base' }));
  }

  async migrate(config: Record<string, unknown>, fromVersion: string, toVersion: string): Promise<Record<string, unknown>> {
    this.logger.info(`Migrating config from ${fromVersion} to ${toVersion}`);

    let currentConfig = { ...config };
    let currentVersion = fromVersion;

    const applicableMigrations = this.migrations.filter(
      step => step.version > fromVersion && step.version <= toVersion
    );

    for (const migration of applicableMigrations) {
      this.logger.info(`Applying migration ${migration.version}: ${migration.description}`);

      try {
        currentConfig = await migration.migrate(currentConfig);
        currentVersion = migration.version;
        this.logger.info(`Migration ${migration.version} completed successfully`);
      } catch (error) {
        this.logger.error(`Migration ${migration.version} failed:`, error);
        throw error;
      }
    }

    return currentConfig;
  }

  async needsMigration(configVersion: string, targetVersion: string): Promise<boolean> {
    return this.migrations.some(
      step => step.version > configVersion && step.version <= targetVersion
    );
  }

  getAvailableMigrations(): MigrationStep[] {
    return [...this.migrations];
  }
}