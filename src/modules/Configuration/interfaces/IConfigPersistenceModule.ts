import { BaseModule } from '../../../core/BaseModule';
import { ValidationResult } from '../../../interfaces/Validation';

/**
 * Interface for Configuration Persistence Module
 * Handles atomic configuration file writing, backup management, and rollback capabilities
 */
export interface IConfigPersistenceModule extends BaseModule {
  // Core persistence operations
  saveConfiguration(config: any, filePath?: string): Promise<PersistenceResult>;
  loadConfiguration(filePath?: string): Promise<ConfigurationData>;
  deleteConfiguration(filePath: string): Promise<PersistenceResult>;
  
  // Atomic operations
  saveConfigurationAtomic(config: any, filePath?: string): Promise<PersistenceResult>;
  verifyConfigurationIntegrity(filePath: string): Promise<IntegrityResult>;
  
  // Backup management
  createBackup(filePath?: string, backupName?: string): Promise<BackupResult>;
  listBackups(filePath?: string): Promise<BackupInfo[]>;
  restoreFromBackup(backupId: string, targetPath?: string): Promise<RestoreResult>;
  deleteBackup(backupId: string): Promise<PersistenceResult>;
  cleanupOldBackups(retentionCount?: number): Promise<CleanupResult>;
  
  // Rollback capabilities
  rollbackToVersion(versionId: string): Promise<RollbackResult>;
  getVersionHistory(filePath?: string): Promise<VersionInfo[]>;
  compareVersions(version1: string, version2: string): Promise<ComparisonResult>;
  
  // Import/Export functionality
  exportConfiguration(format: ExportFormat, filePath?: string): Promise<ExportResult>;
  importConfiguration(importPath: string, format: ExportFormat, targetPath?: string): Promise<ImportResult>;
  validateImportData(importData: any, format: ExportFormat): Promise<ValidationResult>;
  
  // File locking and concurrency
  acquireFileLock(filePath: string, timeout?: number): Promise<FileLockResult>;
  releaseFileLock(lockId: string): Promise<PersistenceResult>;
  checkFileLock(filePath: string): Promise<LockStatus>;
  
  // Configuration management
  setDefaultConfigurationPath(filePath: string): void;
  getDefaultConfigurationPath(): string;
  getConfigurationMetadata(filePath?: string): Promise<ConfigurationMetadata>;
  setConfigurationMetadata(metadata: ConfigurationMetadata, filePath?: string): Promise<PersistenceResult>;
  
  // Monitoring and diagnostics
  getStorageStatistics(): Promise<StorageStatistics>;
  validateStorageHealth(): Promise<HealthCheckResult>;
  getOperationHistory(limit?: number): Promise<OperationHistoryEntry[]>;
}

/**
 * Persistence operation result
 */
export interface PersistenceResult {
  success: boolean;
  filePath: string;
  operationType: PersistenceOperationType;
  timestamp: number;
  checksum?: string;
  fileSize?: number;
  metadata?: Record<string, any>;
  errors?: string[];
  warnings?: string[];
  performanceMetrics?: PerformanceMetrics;
}

/**
 * Configuration data with metadata
 */
export interface ConfigurationData {
  data: any;
  metadata: ConfigurationMetadata;
  checksum: string;
  filePath: string;
  loadTimestamp: number;
  isValid: boolean;
  validationResults?: ValidationResult;
}

/**
 * Configuration metadata
 */
export interface ConfigurationMetadata {
  version: string;
  createdAt: number;
  modifiedAt: number;
  createdBy?: string;
  modifiedBy?: string;
  description?: string;
  tags?: string[];
  schema?: string;
  environment?: string;
  checksum: string;
  fileSize: number;
  encoding: string;
  format: ConfigurationFormat;
  customFields?: Record<string, any>;
}

/**
 * File integrity verification result
 */
export interface IntegrityResult {
  isValid: boolean;
  expectedChecksum: string;
  actualChecksum: string;
  filePath: string;
  verificationTimestamp: number;
  issues?: IntegrityIssue[];
}

/**
 * Integrity issue details
 */
export interface IntegrityIssue {
  type: IntegrityIssueType;
  severity: IssueSeverity;
  description: string;
  affectedSection?: string;
  recommendation?: string;
}

/**
 * Backup operation result
 */
export interface BackupResult extends PersistenceResult {
  backupId: string;
  backupPath: string;
  originalFilePath: string;
  compressionRatio?: number;
  retentionPolicy?: BackupRetentionPolicy;
}

/**
 * Backup information
 */
export interface BackupInfo {
  id: string;
  originalFilePath: string;
  backupPath: string;
  createdAt: number;
  fileSize: number;
  compressedSize?: number;
  checksum: string;
  metadata?: ConfigurationMetadata;
  isAutomatic: boolean;
  retentionExpiry?: number;
  description?: string;
}

/**
 * Restore operation result
 */
export interface RestoreResult extends PersistenceResult {
  backupId: string;
  originalBackupPath: string;
  restoredToPath: string;
  dataIntegrityVerified: boolean;
  conflictResolution?: ConflictResolution;
}

/**
 * Cleanup operation result
 */
export interface CleanupResult {
  success: boolean;
  deletedBackupsCount: number;
  reclaimedSpaceBytes: number;
  retainedBackupsCount: number;
  errors?: string[];
  deletedBackups: string[];
  retainedBackups: string[];
}

/**
 * Rollback operation result
 */
export interface RollbackResult extends PersistenceResult {
  fromVersion: string;
  toVersion: string;
  backupCreated: boolean;
  backupId?: string;
  dataIntegrityVerified: boolean;
  conflictsDetected?: ConfigurationConflict[];
}

/**
 * Version information
 */
export interface VersionInfo {
  id: string;
  timestamp: number;
  checksum: string;
  filePath: string;
  fileSize: number;
  createdBy?: string;
  description?: string;
  tags?: string[];
  isSnapshot: boolean;
  parentVersion?: string;
  changes?: ChangeDescription[];
}

/**
 * Change description
 */
export interface ChangeDescription {
  type: ChangeType;
  path: string;
  oldValue?: any;
  newValue?: any;
  description?: string;
}

/**
 * Version comparison result
 */
export interface ComparisonResult {
  version1: VersionInfo;
  version2: VersionInfo;
  differences: ConfigurationDifference[];
  similarity: number;
  hasConflicts: boolean;
  conflicts?: ConfigurationConflict[];
}

/**
 * Configuration difference
 */
export interface ConfigurationDifference {
  type: DifferenceType;
  path: string;
  version1Value?: any;
  version2Value?: any;
  severity: DifferenceSeverity;
  description: string;
}

/**
 * Configuration conflict
 */
export interface ConfigurationConflict {
  path: string;
  type: ConflictType;
  localValue: any;
  remoteValue: any;
  baseValue?: any;
  resolution?: ConflictResolution;
  autoResolvable: boolean;
}

/**
 * Export operation result
 */
export interface ExportResult extends PersistenceResult {
  exportPath: string;
  format: ExportFormat;
  originalFilePath: string;
  includeMetadata: boolean;
  compressionUsed: boolean;
  validationIncluded: boolean;
}

/**
 * Import operation result
 */
export interface ImportResult extends PersistenceResult {
  importedFromPath: string;
  format: ExportFormat;
  targetFilePath: string;
  dataTransformed: boolean;
  validationPerformed: boolean;
  backupCreated: boolean;
  backupId?: string;
  conflictsResolved?: ConflictResolution[];
}

/**
 * File lock result
 */
export interface FileLockResult {
  success: boolean;
  lockId: string;
  filePath: string;
  lockedAt: number;
  expiresAt?: number;
  owner: string;
  timeout?: number;
  errors?: string[];
}

/**
 * Lock status information
 */
export interface LockStatus {
  isLocked: boolean;
  lockId?: string;
  filePath: string;
  lockedAt?: number;
  lockedBy?: string;
  expiresAt?: number;
  canBreakLock: boolean;
  lockType?: LockType;
}

/**
 * Storage statistics
 */
export interface StorageStatistics {
  totalConfigurationFiles: number;
  totalBackupFiles: number;
  totalStorageUsed: number;
  averageFileSize: number;
  largestFile: FileStatistic;
  smallestFile: FileStatistic;
  oldestFile: FileStatistic;
  newestFile: FileStatistic;
  compressionRatio: number;
  corruptedFiles: number;
  orphanedBackups: number;
  storageHealth: StorageHealthScore;
}

/**
 * File statistic
 */
export interface FileStatistic {
  filePath: string;
  size: number;
  timestamp: number;
  type: string;
}

/**
 * Storage health check result
 */
export interface HealthCheckResult {
  overallHealth: HealthStatus;
  checks: HealthCheck[];
  recommendations: string[];
  criticalIssues: HealthIssue[];
  warnings: HealthIssue[];
  timestamp: number;
  nextCheckRecommended: number;
}

/**
 * Individual health check
 */
export interface HealthCheck {
  name: string;
  status: HealthStatus;
  description: string;
  details?: Record<string, any>;
  metrics?: Record<string, number>;
  duration: number;
}

/**
 * Health issue
 */
export interface HealthIssue {
  type: HealthIssueType;
  severity: IssueSeverity;
  description: string;
  affectedFiles?: string[];
  recommendation: string;
  autoFixable: boolean;
}

/**
 * Operation history entry
 */
export interface OperationHistoryEntry {
  id: string;
  operationType: PersistenceOperationType;
  filePath: string;
  timestamp: number;
  success: boolean;
  duration: number;
  user?: string;
  details?: Record<string, any>;
  errors?: string[];
  performanceMetrics?: PerformanceMetrics;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  duration: number;
  memoryUsed: number;
  diskIO: DiskIOMetrics;
  cpuUsage: number;
  cacheHits?: number;
  cacheMisses?: number;
}

/**
 * Disk I/O metrics
 */
export interface DiskIOMetrics {
  bytesRead: number;
  bytesWritten: number;
  readOperations: number;
  writeOperations: number;
  fsyncOperations?: number;
}

/**
 * Backup retention policy
 */
export interface BackupRetentionPolicy {
  maxCount: number;
  maxAgeHours: number;
  compressionEnabled: boolean;
  retentionStrategy: RetentionStrategy;
  priorityRules?: RetentionRule[];
}

/**
 * Retention rule
 */
export interface RetentionRule {
  condition: string;
  priority: number;
  action: RetentionAction;
  description: string;
}

/**
 * Enumeration types
 */
export enum PersistenceOperationType {
  SAVE = 'save',
  LOAD = 'load',
  DELETE = 'delete',
  BACKUP = 'backup',
  RESTORE = 'restore',
  ROLLBACK = 'rollback',
  EXPORT = 'export',
  IMPORT = 'import',
  CLEANUP = 'cleanup',
  VERIFY = 'verify',
  LOCK = 'lock',
  UNLOCK = 'unlock'
}

export enum ConfigurationFormat {
  JSON = 'json',
  YAML = 'yaml',
  TOML = 'toml',
  INI = 'ini',
  XML = 'xml',
  PROPERTIES = 'properties'
}

export enum ExportFormat {
  JSON = 'json',
  YAML = 'yaml',
  TOML = 'toml',
  ZIP = 'zip',
  TAR_GZ = 'tar.gz',
  BACKUP = 'backup'
}

export enum IntegrityIssueType {
  CHECKSUM_MISMATCH = 'checksum-mismatch',
  FILE_CORRUPTION = 'file-corruption',
  METADATA_INCONSISTENCY = 'metadata-inconsistency',
  ENCODING_ERROR = 'encoding-error',
  STRUCTURE_VIOLATION = 'structure-violation'
}

export enum IssueSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

export enum ConflictType {
  MODIFICATION_CONFLICT = 'modification-conflict',
  DELETION_CONFLICT = 'deletion-conflict',
  TYPE_CONFLICT = 'type-conflict',
  SCHEMA_CONFLICT = 'schema-conflict',
  PERMISSION_CONFLICT = 'permission-conflict'
}

export enum ConflictResolution {
  KEEP_LOCAL = 'keep-local',
  KEEP_REMOTE = 'keep-remote',
  MERGE = 'merge',
  MANUAL = 'manual',
  SKIP = 'skip'
}

export enum ChangeType {
  ADDED = 'added',
  MODIFIED = 'modified',
  DELETED = 'deleted',
  MOVED = 'moved',
  RENAMED = 'renamed'
}

export enum DifferenceType {
  VALUE_CHANGE = 'value-change',
  TYPE_CHANGE = 'type-change',
  STRUCTURE_CHANGE = 'structure-change',
  ADDITION = 'addition',
  DELETION = 'deletion'
}

export enum DifferenceSeverity {
  BREAKING = 'breaking',
  SIGNIFICANT = 'significant',
  MINOR = 'minor',
  COSMETIC = 'cosmetic'
}

export enum LockType {
  EXCLUSIVE = 'exclusive',
  SHARED = 'shared',
  READ_ONLY = 'read-only'
}

export enum HealthStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical',
  UNKNOWN = 'unknown'
}

export enum HealthIssueType {
  DISK_SPACE = 'disk-space',
  FILE_CORRUPTION = 'file-corruption',
  PERMISSION_ISSUE = 'permission-issue',
  PERFORMANCE_DEGRADATION = 'performance-degradation',
  BACKUP_FAILURE = 'backup-failure',
  ORPHANED_DATA = 'orphaned-data'
}

export enum RetentionStrategy {
  FIFO = 'fifo',
  LIFO = 'lifo',
  PRIORITY_BASED = 'priority-based',
  SIZE_BASED = 'size-based',
  AGE_BASED = 'age-based'
}

export enum RetentionAction {
  KEEP = 'keep',
  DELETE = 'delete',
  COMPRESS = 'compress',
  ARCHIVE = 'archive'
}

export enum StorageHealthScore {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  CRITICAL = 'critical'
}