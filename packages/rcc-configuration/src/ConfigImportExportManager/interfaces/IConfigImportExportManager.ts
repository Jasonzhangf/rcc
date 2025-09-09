/**
 * Config Import/Export Manager Interfaces
 * 
 * Comprehensive interface definitions for configuration import/export system
 * including validation, transformation, and backup management.
 */

import type { 
  IConfigurationData, 
  IProvider, 
  IModel, 
  IBlacklistEntry, 
  IPoolEntry, 
  IRoute,
  IManagerOptions 
} from '../../shared/types';
import type { IVirtualModelCategory } from '../RoutesManager/interfaces/IRoutesManager';

// Export configuration
export interface IExportOptions {
  // What to export
  include_providers?: boolean;
  include_models?: boolean;
  include_routes?: boolean;
  include_blacklist?: boolean;
  include_pool?: boolean;
  include_virtual_categories?: boolean;
  include_global_config?: boolean;
  include_metrics?: boolean;
  
  // Export format options
  format: 'json' | 'yaml' | 'toml';
  pretty_print?: boolean;
  include_metadata?: boolean;
  include_timestamps?: boolean;
  include_version_info?: boolean;
  
  // Filtering options
  provider_filter?: string[]; // Only export specific providers
  category_filter?: string[]; // Only export specific categories
  date_range?: {
    from: string;
    to: string;
  };
  
  // Security options
  mask_api_keys?: boolean;
  exclude_sensitive_data?: boolean;
  include_health_data?: boolean;
  
  // Compression
  compress?: boolean;
  compression_format?: 'gzip' | 'brotli';
}

// Import configuration  
export interface IImportOptions {
  // Import behavior
  merge_strategy: 'overwrite' | 'merge' | 'skip_existing' | 'interactive';
  conflict_resolution: 'keep_existing' | 'use_imported' | 'merge_fields' | 'prompt';
  
  // What to import
  import_providers?: boolean;
  import_models?: boolean;
  import_routes?: boolean;
  import_blacklist?: boolean;
  import_pool?: boolean;
  import_virtual_categories?: boolean;
  import_global_config?: boolean;
  import_metrics?: boolean;
  
  // Validation options
  validate_before_import?: boolean;
  skip_validation_errors?: boolean;
  auto_fix_issues?: boolean;
  
  // Backup options
  create_backup?: boolean;
  backup_name?: string;
  
  // Transformation options
  apply_transformations?: boolean;
  transformation_rules?: ITransformationRule[];
  
  // Dry run
  dry_run?: boolean;
}

// Export result
export interface IExportResult {
  success: boolean;
  data?: string | Buffer; // Exported data
  format: string;
  file_path?: string;
  metadata: {
    export_type: 'full' | 'partial' | 'filtered';
    items_exported: {
      providers: number;
      models: number;
      routes: number;
      blacklist_entries: number;
      pool_entries: number;
      virtual_categories: number;
    };
    export_size_bytes: number;
    compressed: boolean;
    version: string;
    exported_at: string;
    exported_by: string;
  };
  warnings?: string[];
  errors?: string[];
}

// Import result
export interface IImportResult {
  success: boolean;
  summary: {
    total_items: number;
    imported_items: number;
    skipped_items: number;
    failed_items: number;
    conflicts_resolved: number;
  };
  details: {
    providers: IImportItemResult;
    models: IImportItemResult;
    routes: IImportItemResult;
    blacklist: IImportItemResult;
    pool: IImportItemResult;
    virtual_categories: IImportItemResult;
    global_config: IImportItemResult;
  };
  backup_created?: {
    backup_id: string;
    backup_path: string;
    created_at: string;
  };
  validation_results?: IConfigValidation;
  transformations_applied?: number;
  warnings: string[];
  errors: string[];
  rollback_available: boolean;
}

export interface IImportItemResult {
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  conflicts: IConflictInfo[];
  errors: string[];
}

export interface IConflictInfo {
  item_id: string;
  item_type: string;
  conflict_type: 'id_exists' | 'name_exists' | 'data_mismatch' | 'dependency_missing';
  existing_data: any;
  imported_data: any;
  resolution: string;
}

// Configuration backup
export interface IConfigBackup {
  id: string;
  name: string;
  description?: string;
  type: 'manual' | 'automatic' | 'pre_import';
  data: IConfigurationData;
  metadata: {
    created_at: string;
    created_by: string;
    version: string;
    config_version: string;
    size_bytes: number;
    checksum: string;
    tags?: string[];
  };
  restoration_info?: {
    can_restore: boolean;
    compatibility_issues?: string[];
    required_transformations?: ITransformationRule[];
  };
}

// Configuration validation
export interface IConfigValidation {
  is_valid: boolean;
  version_compatible: boolean;
  schema_version: string;
  target_version: string;
  compatibility_issues: ICompatibilityIssue[];
  validation_errors: IValidationError[];
  validation_warnings: IValidationWarning[];
  required_transformations: ITransformationRule[];
  estimated_import_success_rate: number;
}

export interface ICompatibilityIssue {
  type: 'version_mismatch' | 'schema_change' | 'deprecated_field' | 'missing_field' | 'type_mismatch';
  severity: 'error' | 'warning' | 'info';
  field_path: string;
  description: string;
  suggested_action: string;
  auto_fixable: boolean;
}

export interface IValidationError {
  field: string;
  value: any;
  error_type: string;
  message: string;
  suggested_fix?: string;
}

export interface IValidationWarning {
  field: string;
  value: any;
  warning_type: string;
  message: string;
  impact: 'low' | 'medium' | 'high';
}

// Transformation rules
export interface ITransformationRule {
  id: string;
  name: string;
  description: string;
  source_version: string;
  target_version: string;
  field_path: string;
  transformation_type: 'rename' | 'convert_type' | 'merge_fields' | 'split_field' | 'default_value' | 'custom';
  parameters: Record<string, any>;
  condition?: string; // JavaScript expression
  priority: number;
}

// Compatibility check
export interface ICompatibilityCheck {
  source_version: string;
  target_version: string;
  is_compatible: boolean;
  compatibility_score: number; // 0-1
  breaking_changes: string[];
  deprecation_warnings: string[];
  migration_required: boolean;
  migration_steps: string[];
  estimated_migration_time_minutes: number;
}

// Main interface
export interface IConfigImportExportManager {
  // Lifecycle
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  
  // Export operations
  exportFullConfiguration(options?: IExportOptions): Promise<IExportResult>;
  exportProviders(providerIds?: string[], options?: IExportOptions): Promise<IExportResult>;
  exportRoutes(routeIds?: string[], options?: IExportOptions): Promise<IExportResult>;
  exportBlacklist(options?: IExportOptions): Promise<IExportResult>;
  exportPool(options?: IExportOptions): Promise<IExportResult>;
  exportVirtualCategories(categoryNames?: string[], options?: IExportOptions): Promise<IExportResult>;
  
  // Export to file
  exportToFile(filePath: string, options?: IExportOptions): Promise<IExportResult>;
  exportToBuffer(options?: IExportOptions): Promise<Buffer>;
  exportToString(options?: IExportOptions): Promise<string>;
  
  // Import operations
  importFullConfiguration(data: string | Buffer, options?: IImportOptions): Promise<IImportResult>;
  importFromFile(filePath: string, options?: IImportOptions): Promise<IImportResult>;
  importFromUrl(url: string, options?: IImportOptions): Promise<IImportResult>;
  
  // Partial imports
  importProviders(data: IProvider[], options?: IImportOptions): Promise<IImportResult>;
  importRoutes(data: IRoute[], options?: IImportOptions): Promise<IImportResult>;
  importBlacklist(data: IBlacklistEntry[], options?: IImportOptions): Promise<IImportResult>;
  importPool(data: IPoolEntry[], options?: IImportOptions): Promise<IImportResult>;
  importVirtualCategories(data: IVirtualModelCategory[], options?: IImportOptions): Promise<IImportResult>;
  
  // Validation
  validateConfiguration(data: string | Buffer): Promise<IConfigValidation>;
  validateCompatibility(data: string | Buffer, targetVersion?: string): Promise<ICompatibilityCheck>;
  previewImport(data: string | Buffer, options?: IImportOptions): Promise<{
    validation: IConfigValidation;
    preview: IImportResult;
    recommendations: string[];
  }>;
  
  // Backup management
  createBackup(name: string, description?: string, tags?: string[]): Promise<IConfigBackup>;
  listBackups(filters?: {
    type?: IConfigBackup['type'];
    tags?: string[];
    date_range?: { from: string; to: string };
  }): Promise<IConfigBackup[]>;
  getBackup(backupId: string): Promise<IConfigBackup | null>;
  restoreBackup(backupId: string, options?: IImportOptions): Promise<IImportResult>;
  deleteBackup(backupId: string): Promise<boolean>;
  cleanupOldBackups(retentionDays: number): Promise<number>;
  
  // Transformation management
  getAvailableTransformations(): Promise<ITransformationRule[]>;
  addTransformationRule(rule: Omit<ITransformationRule, 'id'>): Promise<ITransformationRule>;
  updateTransformationRule(id: string, updates: Partial<ITransformationRule>): Promise<ITransformationRule>;
  deleteTransformationRule(id: string): Promise<boolean>;
  testTransformation(rule: ITransformationRule, testData: any): Promise<{
    success: boolean;
    original: any;
    transformed: any;
    error?: string;
  }>;
  
  // Migration support
  getMigrationPath(fromVersion: string, toVersion: string): Promise<{
    path: string[];
    transformations: ITransformationRule[];
    estimated_time_minutes: number;
    risks: string[];
  }>;
  runMigration(data: string | Buffer, fromVersion: string, toVersion: string): Promise<{
    success: boolean;
    migrated_data: string;
    transformations_applied: ITransformationRule[];
    warnings: string[];
    errors: string[];
  }>;
  
  // Rollback support
  canRollback(importId?: string): Promise<boolean>;
  rollbackImport(importId?: string): Promise<IImportResult>;
  listRollbackPoints(): Promise<Array<{
    id: string;
    description: string;
    created_at: string;
    size: string;
  }>>;
  
  // Configuration templates
  createTemplate(name: string, description: string, config: Partial<IConfigurationData>): Promise<{
    template_id: string;
    name: string;
    description: string;
    created_at: string;
  }>;
  listTemplates(): Promise<Array<{
    template_id: string;
    name: string;
    description: string;
    created_at: string;
    usage_count: number;
  }>>;
  applyTemplate(templateId: string, options?: IImportOptions): Promise<IImportResult>;
  deleteTemplate(templateId: string): Promise<boolean>;
  
  // Utilities
  getConfigurationSummary(): Promise<{
    total_providers: number;
    total_models: number;
    total_routes: number;
    total_blacklist_entries: number;
    total_pool_entries: number;
    total_virtual_categories: number;
    config_size_bytes: number;
    last_modified: string;
    version: string;
  }>;
  
  validateConfigIntegrity(): Promise<{
    is_valid: boolean;
    issues: Array<{
      type: string;
      severity: 'error' | 'warning';
      description: string;
      affected_items: string[];
    }>;
  }>;
}

export interface IConfigImportExportManagerOptions extends IManagerOptions {
  backupDirectory?: string;
  maxBackups?: number;
  enableAutoBackup?: boolean;
  autoBackupInterval?: number;
  enableCompression?: boolean;
  compressionLevel?: number;
  enableVersioning?: boolean;
  maxImportSize?: number;
  enableRollback?: boolean;
  rollbackRetentionDays?: number;
}