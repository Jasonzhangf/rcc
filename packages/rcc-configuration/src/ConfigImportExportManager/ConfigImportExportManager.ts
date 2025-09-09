/**
 * ConfigImportExportManager - Configuration Import/Export Management System
 * 
 * This module provides comprehensive configuration import/export functionality
 * with support for multiple formats, validation, transformation, and backup.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';

import type {
  IConfigImportExportManager,
  IExportOptions,
  IImportOptions,
  IExportResult,
  IImportResult,
  IConfigBackup,
  IValidationResult,
  ITransformationResult,
  IConfigImportExportManagerOptions
} from './interfaces/IConfigImportExportManager';

import type {
  IConfigManager,
  IProvidersManager,
  IModelsManager,
  IBlacklistManager,
  IPoolManager,
  IRoutesManager,
  IManagerOptions
} from '../shared/types';

import { CONFIG_IMPORT_EXPORT_CONSTANTS } from './constants/ConfigImportExportManager.constants';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export class ConfigImportExportManager implements IConfigImportExportManager {
  private initialized = false;
  private backupsDirectory: string;

  constructor(
    private configManager: IConfigManager,
    private providersManager?: IProvidersManager,
    private modelsManager?: IModelsManager,
    private blacklistManager?: IBlacklistManager,
    private poolManager?: IPoolManager,
    private routesManager?: IRoutesManager,
    private options: IConfigImportExportManagerOptions = {}
  ) {
    this.backupsDirectory = this.options.backupsDirectory || 
      path.join(process.cwd(), '.rcc', 'backups');
  }

  /**
   * Initialize the ConfigImportExportManager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🔧 [ConfigImportExportManager] Initializing configuration import/export manager...');

    try {
      // Ensure backups directory exists
      await fs.mkdir(this.backupsDirectory, { recursive: true });
      
      // Clean up old backups if needed
      await this.cleanupOldBackups();

      this.initialized = true;
      console.log('✅ [ConfigImportExportManager] Initialized successfully');
    } catch (error) {
      console.error('❌ [ConfigImportExportManager] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    this.initialized = false;
    console.log('✅ [ConfigImportExportManager] Destroyed successfully');
  }

  /**
   * Export configuration to file
   */
  async exportConfiguration(options: IExportOptions = {}): Promise<IExportResult> {
    const {
      format = 'json',
      outputPath,
      includeProviders = true,
      includeModels = true,
      includeBlacklist = true,
      includePool = true,
      includeRoutes = true,
      compression = false,
      createBackup = true,
      metadata = {}
    } = options;

    try {
      console.log('📤 [ConfigImportExportManager] Starting configuration export...');

      // Collect configuration data
      const exportData: any = {
        metadata: {
          exportedAt: new Date().toISOString(),
          version: CONFIG_IMPORT_EXPORT_CONSTANTS.VERSION,
          format,
          ...metadata
        }
      };

      // Export base configuration
      const baseConfig = await this.configManager.getConfig();
      exportData.config = baseConfig;

      // Export providers if requested and available
      if (includeProviders && this.providersManager) {
        try {
          exportData.providers = await this.providersManager.getAll();
          console.log(`📋 [ConfigImportExportManager] Exported ${exportData.providers.length} providers`);
        } catch (error) {
          console.warn('⚠️ [ConfigImportExportManager] Failed to export providers:', error);
        }
      }

      // Export blacklist if requested and available
      if (includeBlacklist && this.blacklistManager) {
        try {
          exportData.blacklist = await this.blacklistManager.getAll();
          console.log(`📋 [ConfigImportExportManager] Exported ${exportData.blacklist.length} blacklist entries`);
        } catch (error) {
          console.warn('⚠️ [ConfigImportExportManager] Failed to export blacklist:', error);
        }
      }

      // Export pool if requested and available
      if (includePool && this.poolManager) {
        try {
          exportData.pool = await this.poolManager.getAll();
          console.log(`📋 [ConfigImportExportManager] Exported ${exportData.pool.length} pool entries`);
        } catch (error) {
          console.warn('⚠️ [ConfigImportExportManager] Failed to export pool:', error);
        }
      }

      // Export routes if requested and available
      if (includeRoutes && this.routesManager) {
        try {
          const routingTable = await this.routesManager.generateRoutingTable();
          exportData.routes = routingTable;
          console.log(`📋 [ConfigImportExportManager] Exported ${routingTable.routes.length} routes`);
        } catch (error) {
          console.warn('⚠️ [ConfigImportExportManager] Failed to export routes:', error);
        }
      }

      // Serialize data based on format
      let serializedData: Buffer;
      switch (format) {
        case 'json':
          serializedData = Buffer.from(JSON.stringify(exportData, null, 2), 'utf8');
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      // Apply compression if requested
      if (compression) {
        serializedData = await gzip(serializedData);
        console.log('🗜️ [ConfigImportExportManager] Applied compression');
      }

      // Determine output path
      const finalOutputPath = outputPath || this.generateDefaultExportPath(format, compression);

      // Create backup if requested
      let backupPath: string | undefined;
      if (createBackup && await this.fileExists(finalOutputPath)) {
        backupPath = await this.createBackup(finalOutputPath);
      }

      // Write export file
      await fs.writeFile(finalOutputPath, serializedData);

      const stats = await fs.stat(finalOutputPath);
      
      console.log(`✅ [ConfigImportExportManager] Configuration exported successfully to: ${finalOutputPath}`);
      console.log(`📊 [ConfigImportExportManager] Export size: ${this.formatBytes(stats.size)}`);

      return {
        success: true,
        outputPath: finalOutputPath,
        format,
        size: stats.size,
        compressed: compression,
        backupPath,
        exportedAt: new Date().toISOString(),
        itemCounts: {
          providers: exportData.providers?.length || 0,
          models: this.countTotalModels(exportData.providers || []),
          blacklist: exportData.blacklist?.length || 0,
          pool: exportData.pool?.length || 0,
          routes: exportData.routes?.routes?.length || 0
        }
      };

    } catch (error) {
      console.error('❌ [ConfigImportExportManager] Export failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Import configuration from file
   */
  async importConfiguration(filePath: string, options: IImportOptions = {}): Promise<IImportResult> {
    const {
      format = 'json',
      mergeStrategy = 'replace',
      validateBeforeImport = true,
      createBackupBeforeImport = true,
      transformData = true,
      dryRun = false
    } = options;

    try {
      console.log(`📥 [ConfigImportExportManager] Starting configuration import from: ${filePath}`);

      // Check if file exists
      if (!await this.fileExists(filePath)) {
        throw new Error(`Import file not found: ${filePath}`);
      }

      // Read and parse file
      let rawData = await fs.readFile(filePath);

      // Handle compression
      const isCompressed = filePath.endsWith('.gz') || filePath.includes('.gz.');
      if (isCompressed) {
        rawData = await gunzip(rawData);
        console.log('🗜️ [ConfigImportExportManager] Decompressed import data');
      }

      // Parse data based on format
      let importData: any;
      switch (format) {
        case 'json':
          importData = JSON.parse(rawData.toString('utf8'));
          break;
        default:
          throw new Error(`Unsupported import format: ${format}`);
      }

      // Validate import data
      if (validateBeforeImport) {
        const validation = await this.validateImportData(importData);
        if (!validation.isValid) {
          throw new Error(`Import validation failed: ${validation.errors.join(', ')}`);
        }
        if (validation.warnings.length > 0) {
          console.warn('⚠️ [ConfigImportExportManager] Import warnings:', validation.warnings);
        }
      }

      // Transform data if needed
      if (transformData) {
        const transformation = await this.transformImportData(importData);
        if (transformation.transformed) {
          importData = transformation.data;
          console.log('🔄 [ConfigImportExportManager] Applied data transformations');
        }
      }

      // Create backup before import if requested
      let backupPath: string | undefined;
      if (createBackupBeforeImport && !dryRun) {
        backupPath = await this.createFullBackup();
      }

      const result: IImportResult = {
        success: true,
        importedAt: new Date().toISOString(),
        backupPath,
        itemCounts: {
          providers: 0,
          models: 0,
          blacklist: 0,
          pool: 0,
          routes: 0
        },
        skipped: 0,
        errors: []
      };

      if (dryRun) {
        console.log('🧪 [ConfigImportExportManager] Dry run completed - no changes made');
        return result;
      }

      // Import base configuration
      if (importData.config) {
        await this.configManager.saveConfig(importData.config);
        console.log('📋 [ConfigImportExportManager] Imported base configuration');
      }

      // Import providers
      if (importData.providers && this.providersManager) {
        for (const provider of importData.providers) {
          try {
            if (mergeStrategy === 'replace' || !await this.providersManager.getById(provider.id)) {
              await this.providersManager.create(provider);
              result.itemCounts.providers++;
              if (provider.models) {
                result.itemCounts.models += provider.models.length;
              }
            } else {
              result.skipped++;
            }
          } catch (error) {
            result.errors.push(`Failed to import provider ${provider.id}: ${error}`);
          }
        }
      }

      // Import blacklist
      if (importData.blacklist && this.blacklistManager) {
        for (const entry of importData.blacklist) {
          try {
            if (mergeStrategy === 'replace' || !await this.blacklistManager.getById(entry.id)) {
              await this.blacklistManager.create(entry);
              result.itemCounts.blacklist++;
            } else {
              result.skipped++;
            }
          } catch (error) {
            result.errors.push(`Failed to import blacklist entry ${entry.id}: ${error}`);
          }
        }
      }

      // Import pool
      if (importData.pool && this.poolManager) {
        for (const entry of importData.pool) {
          try {
            if (mergeStrategy === 'replace' || !await this.poolManager.getById(entry.id)) {
              await this.poolManager.create(entry);
              result.itemCounts.pool++;
            } else {
              result.skipped++;
            }
          } catch (error) {
            result.errors.push(`Failed to import pool entry ${entry.id}: ${error}`);
          }
        }
      }

      // Import routes
      if (importData.routes && this.routesManager) {
        try {
          const routeImportResult = await this.routesManager.importRoutes(importData.routes);
          result.itemCounts.routes = routeImportResult.imported_routes;
          result.skipped += routeImportResult.skipped;
          result.errors.push(...routeImportResult.errors);
        } catch (error) {
          result.errors.push(`Failed to import routes: ${error}`);
        }
      }

      const totalImported = Object.values(result.itemCounts).reduce((sum, count) => sum + count, 0);
      console.log(`✅ [ConfigImportExportManager] Import completed: ${totalImported} items imported, ${result.skipped} skipped, ${result.errors.length} errors`);

      return result;

    } catch (error) {
      console.error('❌ [ConfigImportExportManager] Import failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        itemCounts: { providers: 0, models: 0, blacklist: 0, pool: 0, routes: 0 },
        skipped: 0,
        errors: []
      };
    }
  }

  /**
   * Create backup of current configuration
   */
  async createFullBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupsDirectory, `full-backup-${timestamp}.json.gz`);
    
    const exportResult = await this.exportConfiguration({
      outputPath: backupPath,
      compression: true,
      createBackup: false,
      metadata: {
        type: 'full-backup',
        automated: true
      }
    });

    if (!exportResult.success) {
      throw new Error(`Failed to create backup: ${exportResult.error}`);
    }

    console.log(`💾 [ConfigImportExportManager] Created full backup: ${backupPath}`);
    return backupPath;
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<IConfigBackup[]> {
    try {
      const files = await fs.readdir(this.backupsDirectory);
      const backups: IConfigBackup[] = [];

      for (const file of files) {
        if (file.endsWith('.json') || file.endsWith('.json.gz')) {
          const filePath = path.join(this.backupsDirectory, file);
          const stats = await fs.stat(filePath);
          
          backups.push({
            fileName: file,
            filePath,
            size: stats.size,
            createdAt: stats.ctime.toISOString(),
            compressed: file.endsWith('.gz')
          });
        }
      }

      return backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error('❌ [ConfigImportExportManager] Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Validate import data
   */
  async validateImportData(data: any): Promise<IValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check basic structure
      if (!data || typeof data !== 'object') {
        errors.push('Invalid data format: expected object');
        return { isValid: false, errors, warnings };
      }

      // Validate metadata
      if (!data.metadata) {
        warnings.push('Missing metadata section');
      } else {
        if (!data.metadata.version) {
          warnings.push('Missing version information');
        } else if (data.metadata.version !== CONFIG_IMPORT_EXPORT_CONSTANTS.VERSION) {
          warnings.push(`Version mismatch: expected ${CONFIG_IMPORT_EXPORT_CONSTANTS.VERSION}, got ${data.metadata.version}`);
        }
      }

      // Validate providers structure
      if (data.providers) {
        if (!Array.isArray(data.providers)) {
          errors.push('Providers section must be an array');
        } else {
          for (let i = 0; i < data.providers.length; i++) {
            const provider = data.providers[i];
            if (!provider.id) {
              errors.push(`Provider at index ${i} missing required 'id' field`);
            }
            if (!provider.name) {
              errors.push(`Provider at index ${i} missing required 'name' field`);
            }
          }
        }
      }

      // Validate routes structure
      if (data.routes) {
        if (!data.routes.routes || !Array.isArray(data.routes.routes)) {
          errors.push('Routes section must contain a routes array');
        }
      }

      // File size check
      const dataSize = JSON.stringify(data).length;
      if (dataSize > CONFIG_IMPORT_EXPORT_CONSTANTS.MAX_IMPORT_SIZE_MB * 1024 * 1024) {
        errors.push(`Import data too large: ${this.formatBytes(dataSize)} exceeds limit of ${CONFIG_IMPORT_EXPORT_CONSTANTS.MAX_IMPORT_SIZE_MB}MB`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${error}`],
        warnings
      };
    }
  }

  /**
   * Transform import data for compatibility
   */
  async transformImportData(data: any): Promise<ITransformationResult> {
    let transformed = false;
    const transformations: string[] = [];

    try {
      // Version-specific transformations
      if (data.metadata?.version && data.metadata.version !== CONFIG_IMPORT_EXPORT_CONSTANTS.VERSION) {
        // Add version-specific transformations here
        transformations.push(`Version upgrade: ${data.metadata.version} -> ${CONFIG_IMPORT_EXPORT_CONSTANTS.VERSION}`);
        data.metadata.version = CONFIG_IMPORT_EXPORT_CONSTANTS.VERSION;
        transformed = true;
      }

      // Ensure required fields exist
      if (!data.metadata) {
        data.metadata = {
          version: CONFIG_IMPORT_EXPORT_CONSTANTS.VERSION,
          transformedAt: new Date().toISOString()
        };
        transformations.push('Added missing metadata');
        transformed = true;
      }

      return {
        data,
        transformed,
        transformations
      };

    } catch (error) {
      throw new Error(`Data transformation failed: ${error}`);
    }
  }

  // Private helper methods
  private async createBackup(filePath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}.backup-${timestamp}`;
    await fs.copyFile(filePath, backupPath);
    return backupPath;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private generateDefaultExportPath(format: string, compressed: boolean): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = compressed ? `${format}.gz` : format;
    return path.join(this.backupsDirectory, `config-export-${timestamp}.${extension}`);
  }

  private countTotalModels(providers: any[]): number {
    return providers.reduce((total, provider) => {
      return total + (provider.models?.length || 0);
    }, 0);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await this.listBackups();
      if (backups.length > CONFIG_IMPORT_EXPORT_CONSTANTS.BACKUP_COUNT) {
        const backupsToDelete = backups.slice(CONFIG_IMPORT_EXPORT_CONSTANTS.BACKUP_COUNT);
        for (const backup of backupsToDelete) {
          await fs.unlink(backup.filePath);
          console.log(`🗑️ [ConfigImportExportManager] Deleted old backup: ${backup.fileName}`);
        }
      }
    } catch (error) {
      console.warn('⚠️ [ConfigImportExportManager] Failed to cleanup old backups:', error);
    }
  }
}