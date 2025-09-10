/**
 * Pipeline-specific error types and error codes
 */

import { ErrorSource, ErrorSeverity, ErrorImpact, ErrorRecoverability } from 'rcc-basemodule';

/**
 * Pipeline error codes - organized by category
 */
export enum PipelineErrorCode {
  // Configuration errors (1000-1999)
  INVALID_CONFIG = 1001,
  MISSING_CONFIG = 1002,
  CONFIG_VALIDATION_FAILED = 1003,
  PIPELINE_CONFIG_NOT_FOUND = 1004,
  LOAD_BALANCER_CONFIG_INVALID = 1005,
  ERROR_HANDLER_CONFIG_INVALID = 1006,
  
  // Pipeline lifecycle errors (2000-2999)
  PIPELINE_CREATION_FAILED = 2001,
  PIPELINE_INITIALIZATION_FAILED = 2002,
  PIPELINE_DESTRUCTION_FAILED = 2003,
  PIPELINE_NOT_FOUND = 2004,
  PIPELINE_ALREADY_EXISTS = 2005,
  PIPELINE_IN_INVALID_STATE = 2006,
  
  // Scheduling errors (3000-3999)
  NO_AVAILABLE_PIPELINES = 3001,
  SCHEDULING_FAILED = 3002,
  LOAD_BALANCING_FAILED = 3003,
  ROUND_ROBIN_FAILED = 3004,
  PIPELINE_SELECTION_FAILED = 3005,
  
  // Execution errors (4000-4999)
  EXECUTION_FAILED = 4001,
  EXECUTION_TIMEOUT = 4002,
  EXECUTION_CANCELLED = 4003,
  EXECUTION_ABORTED = 4004,
  PIPELINE_EXECUTION_ERROR = 4005,
  
  // Network/Communication errors (5000-5999)
  CONNECTION_FAILED = 5001,
  REQUEST_TIMEOUT = 5002,
  RESPONSE_TIMEOUT = 5003,
  NETWORK_UNREACHABLE = 5004,
  PROTOCOL_ERROR = 5005,
  
  // Authentication/Authorization errors (6000-6999)
  AUTHENTICATION_FAILED = 6001,
  AUTHORIZATION_FAILED = 6002,
  TOKEN_EXPIRED = 6003,
  INVALID_CREDENTIALS = 6004,
  ACCESS_DENIED = 6005,
  
  // Rate limiting errors (7000-7999)
  RATE_LIMIT_EXCEEDED = 7001,
  TOO_MANY_REQUESTS = 7002,
  QUOTA_EXCEEDED = 7003,
  THROTTLED = 7004,
  
  // Resource errors (8000-8999)
  INSUFFICIENT_MEMORY = 8001,
  INSUFFICIENT_DISK_SPACE = 8002,
  CPU_OVERLOAD = 8003,
  RESOURCE_EXHAUSTED = 8004,
  
  // Data errors (9000-9999)
  INVALID_DATA_FORMAT = 9001,
  DATA_VALIDATION_FAILED = 9002,
  DATA_TOO_LARGE = 9003,
  DATA_CORRUPTED = 9004,
  
  // System errors (10000-10999)
  INTERNAL_ERROR = 10001,
  SYSTEM_OVERLOAD = 10002,
  SERVICE_UNAVAILABLE = 10003,
  MAINTENANCE_MODE = 10004,
  
  // Qwen-specific authentication errors (11000-11999)
  QWEN_DEVICE_CODE_EXPIRED = 11001,
  QWEN_AUTHORIZATION_PENDING = 11002,
  QWEN_SLOW_DOWN = 11003,
  QWEN_ACCESS_DENIED = 11004,
  QWEN_INVALID_CLIENT = 11005,
  QWEN_INVALID_SCOPE = 11006,
  QWEN_AUTH_SERVER_ERROR = 11007,
  QWEN_TEMPORARILY_UNAVAILABLE = 11008,
  QWEN_INVALID_REQUEST = 11009,
  QWEN_UNSUPPORTED_RESPONSE_TYPE = 11010,
  QWEN_INVALID_GRANT = 11011,
  QWEN_UNAUTHORIZED_CLIENT = 11012,
  QWEN_INVALID_DEVICE_CODE = 11013,
  QWEN_AUTHORIZATION_FAILED = 11014,
  QWEN_TOKEN_REFRESH_FAILED = 11015,
  QWEN_TOKEN_STORAGE_FAILED = 11016,
  QWEN_CONFIGURATION_INVALID = 11017
}

/**
 * Pipeline error categories for classification
 */
export enum PipelineErrorCategory {
  CONFIGURATION = 'configuration',
  LIFECYCLE = 'lifecycle',
  SCHEDULING = 'scheduling',
  EXECUTION = 'execution',
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  RATE_LIMITING = 'rate_limiting',
  RESOURCE = 'resource',
  DATA = 'data',
  SYSTEM = 'system'
}

/**
 * Pipeline-specific error states
 */
export enum PipelineState {
  CREATING = 'creating',
  INITIALIZING = 'initializing',
  READY = 'ready',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  MAINTENANCE = 'maintenance',
  DESTROYING = 'destroying',
  DESTROYED = 'destroyed'
}

/**
 * Pipeline health status
 */
export enum PipelineHealth {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

/**
 * Pipeline execution status
 */
export enum PipelineExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout'
}

/**
 * Pipeline error interface
 */
export interface PipelineError {
  code: PipelineErrorCode;
  message: string;
  category: PipelineErrorCategory;
  severity: ErrorSeverity | string;
  recoverability: ErrorRecoverability | string;
  impact: ErrorImpact | string;
  source: ErrorSource | string;
  pipelineId?: string;
  instanceId?: string;
  timestamp: number;
  details?: Record<string, any>;
  originalError?: Error;
  stack?: string;
}

/**
 * Pipeline error class implementation
 */
export class PipelineErrorImpl implements PipelineError {
  code: PipelineErrorCode;
  message: string;
  category: PipelineErrorCategory;
  severity: ErrorSeverity | string;
  recoverability: ErrorRecoverability | string;
  impact: ErrorImpact | string;
  source: ErrorSource | string;
  pipelineId?: string;
  instanceId?: string;
  timestamp: number;
  details?: Record<string, any>;
  originalError?: Error;
  stack?: string;

  constructor(
    code: PipelineErrorCode,
    message: string,
    category: PipelineErrorCategory,
    severity: ErrorSeverity | string = 'high',
    recoverability: ErrorRecoverability | string = 'recoverable',
    impact: ErrorImpact | string = 'single_module',
    source: ErrorSource | string = 'module',
    pipelineId?: string,
    instanceId?: string,
    timestamp: number = Date.now(),
    details?: Record<string, any>,
    originalError?: Error,
    stack?: string
  ) {
    this.code = code;
    this.message = message;
    this.category = category;
    this.severity = severity;
    this.recoverability = recoverability;
    this.impact = impact;
    this.source = source;
    this.pipelineId = pipelineId;
    this.instanceId = instanceId;
    this.timestamp = timestamp;
    this.details = details;
    this.originalError = originalError;
    this.stack = stack;
  }
}

/**
 * Error handling strategy configuration
 */
export interface ErrorHandlingStrategy {
  errorCode: PipelineErrorCode;
  action: 'retry' | 'failover' | 'blacklist_temporary' | 'blacklist_permanent' | 'maintenance' | 'ignore';
  retryCount?: number;
  retryDelay?: number;
  blacklistDuration?: number; // in milliseconds
  shouldDestroyPipeline?: boolean;
  customHandler?: string; // handler function name
}

/**
 * Pipeline instance health metrics
 */
export interface PipelineHealthMetrics {
  state: PipelineState;
  health: PipelineHealth;
  lastError?: PipelineError;
  errorCount: number;
  consecutiveErrors: number;
  lastSuccessTime?: number;
  lastErrorTime?: number;
  averageResponseTime: number;
  uptime: number;
  requestCount: number;
  successRate: number;
}

/**
 * Pipeline execution context
 */
export interface PipelineExecutionContext {
  executionId: string;
  pipelineId: string;
  instanceId: string;
  startTime: number;
  timeout?: number;
  payload: any;
  metadata?: Record<string, any>;
  retryCount: number;
  maxRetries: number;
}

/**
 * Pipeline execution result
 */
export interface PipelineExecutionResult {
  executionId: string;
  pipelineId: string;
  instanceId: string;
  status: PipelineExecutionStatus;
  startTime: number;
  endTime: number;
  duration: number;
  result?: any;
  error?: PipelineError;
  metadata?: Record<string, any>;
  retryCount: number;
}

/**
 * Error handler function signature
 */
export type ErrorHandlerFunction = (error: PipelineError, context: PipelineExecutionContext) => Promise<ErrorHandlingAction>;

/**
 * Error handling action result
 */
export interface ErrorHandlingAction {
  action: 'retry' | 'failover' | 'blacklist_temporary' | 'blacklist_permanent' | 'maintenance' | 'ignore';
  shouldRetry: boolean;
  nextPipelineId?: string;
  retryDelay?: number;
  message?: string;
  destroyPipeline?: boolean;
}

/**
 * Pipeline blacklist entry
 */
export interface PipelineBlacklistEntry {
  pipelineId: string;
  instanceId: string;
  reason: PipelineError;
  blacklistTime: number;
  expiryTime: number;
  isPermanent: boolean;
}

/**
 * Error mapping to HTTP status codes
 */
export const ERROR_CODE_TO_HTTP_STATUS: Record<PipelineErrorCode, number> = {
  // Configuration errors
  [PipelineErrorCode.INVALID_CONFIG]: 400,
  [PipelineErrorCode.MISSING_CONFIG]: 400,
  [PipelineErrorCode.CONFIG_VALIDATION_FAILED]: 400,
  [PipelineErrorCode.PIPELINE_CONFIG_NOT_FOUND]: 404,
  [PipelineErrorCode.LOAD_BALANCER_CONFIG_INVALID]: 500,
  [PipelineErrorCode.ERROR_HANDLER_CONFIG_INVALID]: 500,
  
  // Pipeline lifecycle errors
  [PipelineErrorCode.PIPELINE_CREATION_FAILED]: 500,
  [PipelineErrorCode.PIPELINE_INITIALIZATION_FAILED]: 500,
  [PipelineErrorCode.PIPELINE_DESTRUCTION_FAILED]: 500,
  [PipelineErrorCode.PIPELINE_NOT_FOUND]: 404,
  [PipelineErrorCode.PIPELINE_ALREADY_EXISTS]: 409,
  [PipelineErrorCode.PIPELINE_IN_INVALID_STATE]: 500,
  
  // Scheduling errors
  [PipelineErrorCode.NO_AVAILABLE_PIPELINES]: 503,
  [PipelineErrorCode.SCHEDULING_FAILED]: 500,
  [PipelineErrorCode.LOAD_BALANCING_FAILED]: 500,
  [PipelineErrorCode.ROUND_ROBIN_FAILED]: 500,
  [PipelineErrorCode.PIPELINE_SELECTION_FAILED]: 500,
  
  // Execution errors
  [PipelineErrorCode.EXECUTION_FAILED]: 500,
  [PipelineErrorCode.EXECUTION_TIMEOUT]: 504,
  [PipelineErrorCode.EXECUTION_CANCELLED]: 499,
  [PipelineErrorCode.EXECUTION_ABORTED]: 500,
  [PipelineErrorCode.PIPELINE_EXECUTION_ERROR]: 500,
  
  // Network/Communication errors
  [PipelineErrorCode.CONNECTION_FAILED]: 502,
  [PipelineErrorCode.REQUEST_TIMEOUT]: 504,
  [PipelineErrorCode.RESPONSE_TIMEOUT]: 504,
  [PipelineErrorCode.NETWORK_UNREACHABLE]: 503,
  [PipelineErrorCode.PROTOCOL_ERROR]: 502,
  
  // Authentication/Authorization errors
  [PipelineErrorCode.AUTHENTICATION_FAILED]: 401,
  [PipelineErrorCode.AUTHORIZATION_FAILED]: 403,
  [PipelineErrorCode.TOKEN_EXPIRED]: 401,
  [PipelineErrorCode.INVALID_CREDENTIALS]: 401,
  [PipelineErrorCode.ACCESS_DENIED]: 403,
  
  // Rate limiting errors
  [PipelineErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [PipelineErrorCode.TOO_MANY_REQUESTS]: 429,
  [PipelineErrorCode.QUOTA_EXCEEDED]: 429,
  [PipelineErrorCode.THROTTLED]: 429,
  
  // Resource errors
  [PipelineErrorCode.INSUFFICIENT_MEMORY]: 507,
  [PipelineErrorCode.INSUFFICIENT_DISK_SPACE]: 507,
  [PipelineErrorCode.CPU_OVERLOAD]: 503,
  [PipelineErrorCode.RESOURCE_EXHAUSTED]: 507,
  
  // Data errors
  [PipelineErrorCode.INVALID_DATA_FORMAT]: 400,
  [PipelineErrorCode.DATA_VALIDATION_FAILED]: 400,
  [PipelineErrorCode.DATA_TOO_LARGE]: 413,
  [PipelineErrorCode.DATA_CORRUPTED]: 422,
  
  // System errors
  [PipelineErrorCode.INTERNAL_ERROR]: 500,
  [PipelineErrorCode.SYSTEM_OVERLOAD]: 503,
  [PipelineErrorCode.SERVICE_UNAVAILABLE]: 503,
  [PipelineErrorCode.MAINTENANCE_MODE]: 503,
  
  // Qwen-specific authentication errors
  [PipelineErrorCode.QWEN_DEVICE_CODE_EXPIRED]: 400,
  [PipelineErrorCode.QWEN_AUTHORIZATION_PENDING]: 202,
  [PipelineErrorCode.QWEN_SLOW_DOWN]: 429,
  [PipelineErrorCode.QWEN_ACCESS_DENIED]: 403,
  [PipelineErrorCode.QWEN_INVALID_CLIENT]: 401,
  [PipelineErrorCode.QWEN_INVALID_SCOPE]: 400,
  [PipelineErrorCode.QWEN_AUTH_SERVER_ERROR]: 502,
  [PipelineErrorCode.QWEN_TEMPORARILY_UNAVAILABLE]: 503,
  [PipelineErrorCode.QWEN_INVALID_REQUEST]: 400,
  [PipelineErrorCode.QWEN_UNSUPPORTED_RESPONSE_TYPE]: 400,
  [PipelineErrorCode.QWEN_INVALID_GRANT]: 400,
  [PipelineErrorCode.QWEN_UNAUTHORIZED_CLIENT]: 401,
  [PipelineErrorCode.QWEN_INVALID_DEVICE_CODE]: 400,
  [PipelineErrorCode.QWEN_AUTHORIZATION_FAILED]: 401,
  [PipelineErrorCode.QWEN_TOKEN_REFRESH_FAILED]: 401,
  [PipelineErrorCode.QWEN_TOKEN_STORAGE_FAILED]: 500,
  [PipelineErrorCode.QWEN_CONFIGURATION_INVALID]: 400
};

/**
 * Default error handling strategies
 */
export const DEFAULT_ERROR_HANDLING_STRATEGIES: ErrorHandlingStrategy[] = [
  {
    errorCode: PipelineErrorCode.RATE_LIMIT_EXCEEDED,
    action: 'blacklist_temporary',
    retryCount: 0,
    blacklistDuration: 60000, // 1 minute
    shouldDestroyPipeline: false
  },
  {
    errorCode: PipelineErrorCode.TOO_MANY_REQUESTS,
    action: 'blacklist_temporary',
    retryCount: 0,
    blacklistDuration: 30000, // 30 seconds
    shouldDestroyPipeline: false
  },
  {
    errorCode: PipelineErrorCode.AUTHENTICATION_FAILED,
    action: 'maintenance',
    retryCount: 0,
    shouldDestroyPipeline: false
  },
  {
    errorCode: PipelineErrorCode.CONNECTION_FAILED,
    action: 'failover',
    retryCount: 3,
    retryDelay: 1000,
    shouldDestroyPipeline: true
  },
  {
    errorCode: PipelineErrorCode.EXECUTION_TIMEOUT,
    action: 'failover',
    retryCount: 2,
    retryDelay: 500,
    shouldDestroyPipeline: true
  },
  {
    errorCode: PipelineErrorCode.INTERNAL_ERROR,
    action: 'failover',
    retryCount: 1,
    shouldDestroyPipeline: true
  },
  {
    errorCode: PipelineErrorCode.NO_AVAILABLE_PIPELINES,
    action: 'ignore',
    retryCount: 0,
    shouldDestroyPipeline: false
  }
];