/**
 * Pipeline-specific error types and error codes
 */
import { ErrorSource, ErrorSeverity, ErrorImpact, ErrorRecoverability } from 'rcc-basemodule';
/**
 * Pipeline error codes - organized by category
 */
export declare enum PipelineErrorCode {
    INVALID_CONFIG = 1001,
    MISSING_CONFIG = 1002,
    CONFIG_VALIDATION_FAILED = 1003,
    PIPELINE_CONFIG_NOT_FOUND = 1004,
    LOAD_BALANCER_CONFIG_INVALID = 1005,
    ERROR_HANDLER_CONFIG_INVALID = 1006,
    PIPELINE_CREATION_FAILED = 2001,
    PIPELINE_INITIALIZATION_FAILED = 2002,
    PIPELINE_DESTRUCTION_FAILED = 2003,
    PIPELINE_NOT_FOUND = 2004,
    PIPELINE_ALREADY_EXISTS = 2005,
    PIPELINE_IN_INVALID_STATE = 2006,
    NO_AVAILABLE_PIPELINES = 3001,
    SCHEDULING_FAILED = 3002,
    LOAD_BALANCING_FAILED = 3003,
    ROUND_ROBIN_FAILED = 3004,
    PIPELINE_SELECTION_FAILED = 3005,
    EXECUTION_FAILED = 4001,
    EXECUTION_TIMEOUT = 4002,
    EXECUTION_CANCELLED = 4003,
    EXECUTION_ABORTED = 4004,
    PIPELINE_EXECUTION_ERROR = 4005,
    CONNECTION_FAILED = 5001,
    REQUEST_TIMEOUT = 5002,
    RESPONSE_TIMEOUT = 5003,
    NETWORK_UNREACHABLE = 5004,
    PROTOCOL_ERROR = 5005,
    AUTHENTICATION_FAILED = 6001,
    AUTHORIZATION_FAILED = 6002,
    TOKEN_EXPIRED = 6003,
    INVALID_CREDENTIALS = 6004,
    ACCESS_DENIED = 6005,
    RATE_LIMIT_EXCEEDED = 7001,
    TOO_MANY_REQUESTS = 7002,
    QUOTA_EXCEEDED = 7003,
    THROTTLED = 7004,
    INSUFFICIENT_MEMORY = 8001,
    INSUFFICIENT_DISK_SPACE = 8002,
    CPU_OVERLOAD = 8003,
    RESOURCE_EXHAUSTED = 8004,
    INVALID_DATA_FORMAT = 9001,
    DATA_VALIDATION_FAILED = 9002,
    DATA_TOO_LARGE = 9003,
    DATA_CORRUPTED = 9004,
    INTERNAL_ERROR = 10001,
    SYSTEM_OVERLOAD = 10002,
    SERVICE_UNAVAILABLE = 10003,
    MAINTENANCE_MODE = 10004,
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
export declare enum PipelineErrorCategory {
    CONFIGURATION = "configuration",
    LIFECYCLE = "lifecycle",
    SCHEDULING = "scheduling",
    EXECUTION = "execution",
    NETWORK = "network",
    AUTHENTICATION = "authentication",
    RATE_LIMITING = "rate_limiting",
    RESOURCE = "resource",
    DATA = "data",
    SYSTEM = "system"
}
/**
 * Pipeline-specific error states
 */
export declare enum PipelineState {
    CREATING = "creating",
    INITIALIZING = "initializing",
    READY = "ready",
    RUNNING = "running",
    PAUSED = "paused",
    ERROR = "error",
    MAINTENANCE = "maintenance",
    DESTROYING = "destroying",
    DESTROYED = "destroyed"
}
/**
 * Pipeline health status
 */
export declare enum PipelineHealth {
    HEALTHY = "healthy",
    DEGRADED = "degraded",
    UNHEALTHY = "unhealthy",
    UNKNOWN = "unknown"
}
/**
 * Pipeline execution status
 */
export declare enum PipelineExecutionStatus {
    PENDING = "pending",
    RUNNING = "running",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled",
    TIMEOUT = "timeout"
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
export declare class PipelineErrorImpl implements PipelineError {
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
    constructor(code: PipelineErrorCode, message: string, category: PipelineErrorCategory, severity?: ErrorSeverity | string, recoverability?: ErrorRecoverability | string, impact?: ErrorImpact | string, source?: ErrorSource | string, pipelineId?: string, instanceId?: string, timestamp?: number, details?: Record<string, any>, originalError?: Error, stack?: string);
}
/**
 * Error handling strategy configuration
 */
export interface ErrorHandlingStrategy {
    errorCode: PipelineErrorCode;
    action: 'retry' | 'failover' | 'blacklist_temporary' | 'blacklist_permanent' | 'maintenance' | 'ignore';
    retryCount?: number;
    retryDelay?: number;
    blacklistDuration?: number;
    shouldDestroyPipeline?: boolean;
    customHandler?: string;
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
export declare const ERROR_CODE_TO_HTTP_STATUS: Record<PipelineErrorCode, number>;
/**
 * Default error handling strategies
 */
export declare const DEFAULT_ERROR_HANDLING_STRATEGIES: ErrorHandlingStrategy[];
//# sourceMappingURL=ErrorTypes.d.ts.map