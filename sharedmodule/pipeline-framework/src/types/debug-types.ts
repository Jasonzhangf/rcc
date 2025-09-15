/**
 * Debug Logging Types
 * 调试日志类型定义
 */

/**
 * Debug Logging Configuration
 * 调试日志配置接口
 */
export interface DebugConfig {
  // Master switch
  enabled: boolean;

  // Base directory for all logs
  baseDirectory: string;

  // Subdirectory configuration
  paths: {
    requests: string;           // Normal request logs
    responses: string;          // Normal response logs
    errors: string;             // Error request logs
    pipeline: string;           // Complete pipeline logs
    system: string;             // System/normal logs
  };

  // Logging levels
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'silent';

  // Request tracking
  requestTracking: {
    enabled: boolean;
    generateRequestIds: boolean;
    includeTimestamps: boolean;
    trackMetadata: boolean;
  };

  // Content filtering
  contentFiltering: {
    enabled: boolean;
    sensitiveFields: string[];
    maxContentLength: number;
    sanitizeResponses: boolean;
  };

  // File management
  fileManagement: {
    maxFileSize: number;         // Max file size in MB
    maxFiles: number;           // Max files per directory
    compressOldLogs: boolean;
    retentionDays: number;
  };

  // Performance tracking
  performanceTracking: {
    enabled: boolean;
    trackTiming: boolean;
    trackMemoryUsage: boolean;
    trackSuccessRates: boolean;
  };
}

/**
 * Request Context for Tracking
 * 请求跟踪上下文
 */
export interface RequestContext {
  // Unique identifiers
  requestId: string;
  pipelineId: string;
  sessionId?: string;

  // Timestamps
  startTime: number;
  endTime?: number;

  // Request information
  provider: string;
  model?: string;
  operation: 'chat' | 'streamChat' | 'healthCheck';

  // Pipeline stages
  stages: PipelineStage[];

  // Metadata
  metadata?: Record<string, any>;
}

/**
 * Pipeline Stage Tracking
 * 流水线阶段跟踪
 */
export interface PipelineStage {
  stage: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
  data?: any;
}

/**
 * Request-Response Log Entry
 * 请求-响应日志条目
 */
export interface RequestResponseLog {
  // Context
  requestId: string;
  pipelineId: string;
  timestamp: number;
  provider: string;
  operation: string;

  // Request data
  request: {
    headers?: Record<string, string>;
    body: any;
    metadata?: Record<string, any>;
  };

  // Response data
  response: {
    status: number;
    headers?: Record<string, string>;
    body: any;
    metadata?: Record<string, any>;
  };

  // Performance
  duration: number;
  success: boolean;
  error?: string;

  // Pipeline information
  stages: PipelineStage[];
}

/**
 * Error Log Entry
 * 错误日志条目
 */
export interface ErrorLog {
  requestId: string;
  pipelineId: string;
  timestamp: number;
  provider: string;
  operation: string;

  // Error details
  error: {
    message: string;
    stack?: string;
    code?: string;
    type: string;
  };

  // Context
  request: {
    headers?: Record<string, string>;
    body: any;
    metadata?: Record<string, any>;
  };

  // Pipeline stage where error occurred
  failedStage?: string;
  stages: PipelineStage[];

  // Additional debug info
  debugInfo?: Record<string, any>;
}

/**
 * System Log Entry
 * 系统日志条目
 */
export interface SystemLog {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
  requestId?: string;
  provider?: string;
  operation?: string;
  metadata?: Record<string, any>;
}

/**
 * Performance Metrics
 * 性能指标
 */
export interface PerformanceMetrics {
  requestId: string;
  pipelineId: string;
  provider: string;
  operation: string;

  // Timing
  totalDuration: number;
  validationDuration?: number;
  mappingDuration?: number;
  executionDuration?: number;
  responseDuration?: number;

  // Memory usage (if available)
  memoryUsage?: {
    start: number;
    end: number;
    peak: number;
  };

  // Success/failure
  success: boolean;
  error?: string;

  // Stage performance
  stagePerformance: {
    [stage: string]: {
      duration: number;
      success: boolean;
      error?: string;
    };
  };
}

/**
 * Log Statistics
 * 日志统计
 */
export interface LogStatistics {
  // Request statistics
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;

  // Performance statistics
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;

  // Error statistics
  errorCounts: {
    [errorType: string]: number;
  };

  // Provider statistics
  providerStats: {
    [provider: string]: {
      totalRequests: number;
      successfulRequests: number;
      failedRequests: number;
      averageResponseTime: number;
    };
  };

  // Time range
  timeRange: {
    start: number;
    end: number;
  };
}

/**
 * Debug Log Manager Options
 * 调试日志管理器选项
 */
export interface DebugLogManagerOptions {
  config: DebugConfig;
  autoCleanup?: boolean;
  cleanupInterval?: number; // in milliseconds
  enableConsoleOutput?: boolean;
}

/**
 * File Manager Options
 * 文件管理器选项
 */
export interface FileManagerOptions {
  config: DebugConfig;
  enableCompression?: boolean;
  compressionFormat?: 'gzip' | 'zip';
  enableBackup?: boolean;
  backupLocation?: string;
}

/**
 * Content Filter Options
 * 内容过滤选项
 */
export interface ContentFilterOptions {
  enabled: boolean;
  sensitiveFields: string[];
  maxContentLength: number;
  customFilters?: ((data: any) => any)[];
  preserveStructure: boolean;
}

/**
 * Request Tracker Options
 * 请求跟踪器选项
 */
export interface RequestTrackerOptions {
  enabled: boolean;
  generateRequestIds: boolean;
  idPrefix?: string;
  includeSessionTracking: boolean;
  includeUserTracking?: boolean;
  trackMetadata: boolean;
}

/**
 * Stage Names
 * 阶段名称枚举
 */
export enum PipelineStageNames {
  VALIDATION = 'validation',
  COMPATIBILITY_MAPPING = 'compatibility_mapping',
  PROVIDER_EXECUTION = 'provider_execution',
  RESPONSE_MAPPING = 'response_mapping',
  RESPONSE_STANDARDIZATION = 'response_standardization',
  ERROR_HANDLING = 'error_handling',
  CLEANUP = 'cleanup'
}

/**
 * Log Formats
 * 日志格式枚举
 */
export enum LogFormats {
  JSONL = 'jsonl',        // JSON Lines format
  JSON = 'json',          // Pretty JSON format
  CSV = 'csv',            // CSV format
  PRETTY = 'pretty'       // Human-readable format
}

/**
 * Log Levels
 * 日志级别枚举
 */
export enum LogLevels {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  SILENT = 'silent'
}

/**
 * Default Configuration
 * 默认配置
 */
export const DEFAULT_DEBUG_CONFIG: DebugConfig = {
  enabled: false,
  baseDirectory: './logs',
  paths: {
    requests: 'requests',
    responses: 'responses',
    errors: 'errors',
    pipeline: 'pipeline',
    system: 'system'
  },
  logLevel: 'info',
  requestTracking: {
    enabled: true,
    generateRequestIds: true,
    includeTimestamps: true,
    trackMetadata: true
  },
  contentFiltering: {
    enabled: true,
    sensitiveFields: ['api_key', 'password', 'token', 'secret', 'authorization'],
    maxContentLength: 10000,
    sanitizeResponses: true
  },
  fileManagement: {
    maxFileSize: 10, // 10MB
    maxFiles: 100,
    compressOldLogs: true,
    retentionDays: 30
  },
  performanceTracking: {
    enabled: true,
    trackTiming: true,
    trackMemoryUsage: false,
    trackSuccessRates: true
  }
};

/**
 * Configuration Validation Result
 * 配置验证结果
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalizedConfig?: DebugConfig;
}

/**
 * Log Entry Types
 * 日志条目类型联合
 */
export type LogEntry = RequestResponseLog | ErrorLog | SystemLog | PerformanceMetrics;

/**
 * Stage Status Types
 * 阶段状态类型
 */
export type StageStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Operation Types
 * 操作类型
 */
export type OperationType = 'chat' | 'streamChat' | 'healthCheck';

/**
 * Log Level Types
 * 日志级别类型
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

/**
 * Provider Types
 * 提供者类型
 */
export type ProviderType = 'qwen' | 'iflow' | 'openai' | 'custom';