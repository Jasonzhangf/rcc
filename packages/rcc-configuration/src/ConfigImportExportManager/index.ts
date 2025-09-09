/**
 * ConfigImportExportManager - Configuration Import/Export Module
 * 
 * Provides comprehensive configuration import and export functionality
 * with validation, transformation, and backup capabilities.
 * 
 * Features:
 * - Complete configuration backup and restore
 * - Selective import/export of specific modules
 * - Format validation and transformation
 * - Version compatibility handling
 * - Incremental imports with conflict resolution
 * - Automated backup management
 * 
 * @module ConfigImportExportManager
 */

export { ConfigImportExportManager } from './ConfigImportExportManager';
export type {
  IConfigImportExportManager,
  IExportOptions,
  IImportOptions,
  IExportResult,
  IImportResult,
  IConfigBackup,
  IConfigValidation,
  ITransformationRule,
  ICompatibilityCheck
} from './interfaces/IConfigImportExportManager';