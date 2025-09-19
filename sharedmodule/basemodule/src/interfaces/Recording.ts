/**
 * Enhanced Recording System Interfaces
 *
 * This file contains all interface definitions for the enhanced BaseModule recording system,
 * including circular recording, error recording, field truncation, and configuration management.
 */

import { DebugLevel } from './Debug';

// ========================================
// Recording Configuration Interfaces
// ========================================

/**
 * Main recording configuration interface
 */
export interface BaseModuleRecordingConfig {
  // Global switch
  enabled?: boolean;

  // Base path configuration
  basePath?: string;
  port?: number;

  // Global configuration
  globalConfig?: GlobalRecordingConfig;

  // Module configuration
  module?: ModuleRecordingConfig;

  // Circular recording configuration
  cycle?: CycleRecordingConfig;

  // Error recording configuration
  error?: ErrorRecordingConfig;

  // File management configuration
  file?: FileManagementConfig;

  // Template configuration
  templates?: RecordingTemplates;

  // Field truncation configuration
  truncation?: FieldTruncationConfig;
}

/**
 * Circular recording configuration
 */
export interface CycleRecordingConfig {
  enabled?: boolean;
  mode?: 'disabled' | 'single' | 'cyclic';

  // File path templates
  basePath?: string;
  cycleDirTemplate?: string;
  mainFileTemplate?: string;
  summaryFileTemplate?: string;

  // Format configuration
  format?: 'json' | 'jsonl' | 'csv';
  includeIndex?: boolean;
  includeTimestamp?: boolean;

  // Behavior configuration
  autoCreateDirectory?: boolean;
  autoCloseOnComplete?: boolean;
  maxCyclesRetained?: number;
}

/**
 * Error recording configuration
 */
export interface ErrorRecordingConfig {
  enabled?: boolean;
  levels?: ErrorLevel[];
  categories?: ErrorCategory[];

  // File path templates
  basePath?: string;
  indexFileTemplate?: string;
  detailFileTemplate?: string;
  summaryFileTemplate?: string;
  dailyDirTemplate?: string;

  // Format configuration
  indexFormat?: 'jsonl' | 'csv';
  detailFormat?: 'json' | 'pretty';

  // Behavior configuration
  autoRecoveryTracking?: boolean;
  maxErrorsRetained?: number;
  enableStatistics?: boolean;
}

/**
 * File management configuration
 */
export interface FileManagementConfig {
  autoCleanup?: boolean;
  maxFileAge?: number;
  maxFileSize?: number;
  atomicWrites?: boolean;
  backupOnWrite?: boolean;
  compressionEnabled?: boolean;
}

/**
 * Module recording configuration
 */
export interface ModuleRecordingConfig {
  enabled?: boolean;
  basePath?: string;
  format?: string;
  includeMetadata?: boolean;
  autoCreateDirectory?: boolean;
}

/**
 * Template configuration
 */
export interface RecordingTemplates {
  pathVariables?: Record<string, string>;
  customPaths?: Record<string, string>;
}

/**
 * Field truncation configuration
 */
export interface FieldTruncationConfig {
  // Global truncation settings
  enabled?: boolean;
  defaultStrategy?: 'truncate' | 'replace' | 'hide';
  defaultMaxLength?: number;
  defaultReplacementText?: string;

  // Field-level configuration
  fields?: FieldTruncationRule[];

  // Path pattern configuration
  pathPatterns?: PathPatternRule[];

  // Global excluded fields
  excludedFields?: string[];

  // Advanced options
  preserveStructure?: boolean;
  truncateArrays?: boolean;
  arrayTruncateLimit?: number;
  recursiveTruncation?: boolean;
}

/**
 * Field truncation rule
 */
export interface FieldTruncationRule {
  // Field path (supports dot notation, e.g., "request.messages.content")
  fieldPath: string;

  // Truncation strategy
  strategy?: 'truncate' | 'replace' | 'hide';

  // Maximum length
  maxLength?: number;

  // Replacement text
  replacementText?: string;

  // Condition function
  condition?: (value: any, context: any) => boolean;

  // Priority (higher number = higher priority)
  priority?: number;
}

/**
 * Path pattern rule
 */
export interface PathPatternRule {
  // Path pattern (supports wildcards, e.g., "request.messages.*.content")
  pattern: string;

  // Application condition
  condition?: 'always' | 'if_long' | 'if_nested';

  // Truncation configuration
  strategy?: 'truncate' | 'replace' | 'hide';
  maxLength?: number;
  replacementText?: string;
}

// ========================================
// Error Recording Interfaces
// ========================================

/**
 * Error levels
 */
export type ErrorLevel = 'trace' | 'debug' | 'info' | 'warning' | 'error' | 'fatal';

/**
 * Error categories
 */
export type ErrorCategory = 'network' | 'validation' | 'processing' | 'system' | 'security' | 'business';

/**
 * Error record data
 */
export interface ErrorRecordData {
  error: Error | string;
  level?: ErrorLevel;
  category?: ErrorCategory;
  operation?: string;
  context?: Record<string, any>;
  recoverable?: boolean;
  cycleId?: string;
}

/**
 * Error record
 */
export interface ErrorRecord {
  errorId: string;
  cycleId?: string;
  module: string;
  category: ErrorCategory;
  level: ErrorLevel;
  timestamp: number;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  operation?: string;
  recoverable: boolean;
  resolved: boolean;
  resolution?: string;
  filePath?: string;
}

/**
 * Error filters
 */
export interface ErrorFilters {
  level?: ErrorLevel[];
  category?: ErrorCategory[];
  module?: string;
  resolved?: boolean;
  timeRange?: { start: number; end: number };
  operation?: string;
}

/**
 * Error statistics
 */
export interface ErrorStatistics {
  totalErrors: number;
  errorsByLevel: Record<ErrorLevel, number>;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsByModule: Record<string, number>;
  resolvedCount: number;
  unresolvedCount: number;
  recoveryRate: number;
}

/**
 * Error trend point
 */
export interface ErrorTrendPoint {
  timestamp: number;
  errorCount: number;
  resolvedCount: number;
  errorRate: number;
}

// ========================================
// Circular Recording Interfaces
// ========================================

/**
 * Cycle record
 */
export interface CycleRecord {
  index: number;
  type: 'start' | 'middle' | 'end';
  module: string;
  operation?: string;
  phase?: string;
  data?: any;
  result?: any;
  error?: string;
  timestamp: number;
  cycleId: string;
  traceId?: string;
  requestId?: string;
}

/**
 * Cycle handle
 */
export interface CycleHandle {
  cycleId: string;
  operation: string;
  startTime: number;
  module: string;
  basePath: string;
  format: string;
  requestId?: string;
}

/**
 * Cycle information
 */
export interface CycleInfo {
  cycleId: string;
  operation: string;
  module: string;
  startTime: number;
  endTime?: number;
  status: 'active' | 'completed' | 'error';
  recordCount: number;
  basePath: string;
  format: string;
}

// ========================================
// Field Truncation Interfaces
// ========================================

/**
 * Truncation context
 */
export interface TruncationContext {
  operation?: string;
  module?: string;
  cycleId?: string;
  timestamp?: number;
  custom?: Record<string, any>;
}

/**
 * Truncation statistics
 */
export interface TruncationStatistics {
  totalProcessed: number;
  totalTruncated: number;
  totalReplaced: number;
  totalHidden: number;
  fieldStats: Map<string, {
    processed: number;
    truncated: number;
    replaced: number;
    hidden: number;
  }>;
  averageSavings: number;
}

// ========================================
// Request Context Interfaces
// ========================================

/**
 * Request context
 */
export interface RequestContext {
  // Core tracking information
  requestId: string;
  sessionId: string;
  traceId: string;

  // Chain information
  chainId: string;
  startModule: string;
  startTime: number;

  // Path information
  basePath: string;
  currentPath: string;
  pathHistory: Array<{
    moduleId: string;
    path: string;
    timestamp: number;
  }>;

  // Configuration snapshot
  configSnapshot: RecordingConfigSnapshot;

  // Shared data
  sharedData: Map<string, any>;

  // Status information
  status: 'active' | 'completed' | 'error';
  currentModule: string;
  moduleStack: string[];
}

/**
 * Recording configuration snapshot
 */
export interface RecordingConfigSnapshot {
  enabled: boolean;
  basePath: string;
  port?: number;
  cycleConfig: CycleRecordingConfig;
  errorConfig: ErrorRecordingConfig;
  truncationConfig: FieldTruncationConfig;
  timestamp: number;
}

/**
 * Request context options
 */
export interface RequestContextOptions {
  customConfig?: Partial<BaseModuleRecordingConfig>;
  inheritContext?: string;
  createNewContext?: boolean;
}

/**
 * Trace report
 */
export interface TraceReport {
  traceId: string;
  requestId: string;
  sessionId: string;
  chainId: string;
  duration: number;
  startModule: string;
  moduleStack: string[];
  pathHistory: Array<{
    moduleId: string;
    path: string;
    timestamp: number;
  }>;
  status: 'active' | 'completed' | 'error';
  summary: string;
  performance: {
    totalDuration: number;
    moduleTimings: Record<string, number>;
    pathChanges: number;
  };
  errors: Array<{
    moduleId: string;
    error: string;
    timestamp: number;
  }>;
}

// ========================================
// Global Configuration Interfaces
// ========================================

/**
 * Global recording configuration
 */
export interface GlobalRecordingConfig {
  sessionId: string;
  environment: 'development' | 'production' | 'test';
  version: string;

  // Global configuration
  baseConfig: BaseModuleRecordingConfig;

  // Module-specific configuration overrides
  moduleOverrides: Map<string, Partial<BaseModuleRecordingConfig>>;

  // Configuration version control
  configVersion: string;
  lastUpdated: number;

  // Consistency requirements
  consistency: {
    enforced: boolean;
    validationInterval: number;
    allowedDeviations: string[];
  };
}

/**
 * Configuration change callback
 */
export type ConfigChangeCallback = (config: BaseModuleRecordingConfig) => Promise<void> | void;

/**
 * Configuration update result
 */
export interface ConfigUpdateResult {
  success: boolean;
  configVersion?: string;
  errors?: string[];
  requiresForce?: boolean;
}

/**
 * Configuration synchronization result
 */
export interface ConfigSyncResult {
  success: boolean;
  moduleResults: Record<string, boolean>;
}

/**
 * Consistency validation result
 */
export interface ConsistencyValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  details: any;
}

// ========================================
// Validation Interfaces
// ========================================

/**
 * Validated recording configuration
 */
export interface ValidatedRecordingConfig extends BaseModuleRecordingConfig {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Global consistency result
 */
export interface GlobalConsistencyResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  details?: any;
}

/**
 * Chain configuration validation result
 */
export interface ChainConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  moduleIssues: Record<string, string[]>;
}

// ========================================
// Base Module Options Interface
// ========================================

/**
 * Base module options with recording configuration
 */
export interface BaseModuleOptions {
  recordingConfig?: BaseModuleRecordingConfig;
  globalConfig?: GlobalRecordingConfig;
}

// ========================================
// Enhanced BaseModule Interface
// ========================================

/**
 * Enhanced error recording options
 */
export interface ErrorRecordingOptions {
  level?: ErrorLevel;
  category?: ErrorCategory;
  operation?: string;
  context?: Record<string, any>;
  recoverable?: boolean;
  cycleId?: string;
}

/**
 * Module error statistics
 */
export interface ModuleErrorStatistics {
  totalErrors: number;
  errorsByLevel: Record<ErrorLevel, number>;
  errorsByCategory: Record<ErrorCategory, number>;
  resolvedCount: number;
  unresolvedCount: number;
  averageResolutionTime: number;
}

/**
 * Chain status
 */
export interface ChainStatus {
  traceId: string;
  requestId: string;
  currentModule: string;
  moduleStack: string[];
  pathHistory: Array<{
    moduleId: string;
    path: string;
    timestamp: number;
  }>;
  status: 'active' | 'completed' | 'error';
  duration: number;
}

/**
 * Truncation report
 */
export interface TruncationReport {
  totalProcessed: number;
  totalTruncated: number;
  totalReplaced: number;
  totalHidden: number;
  savingsPercentage: number;
  fieldDetails: Array<{
    field: string;
    processed: number;
    truncated: number;
    replaced: number;
    hidden: number;
  }>;
}