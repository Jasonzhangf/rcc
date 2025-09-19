import { DebugEventBus } from 'rcc-debugcenter';
export { DebugEvent, DebugEventBus } from 'rcc-debugcenter';

/**
 * Interface for connection information
 */
interface ConnectionInfo {
    /**
     * Unique identifier for the connection
     */
    id: string;
    /**
     * Source module ID
     */
    sourceModuleId: string;
    /**
     * Target module ID
     */
    targetModuleId: string;
    /**
     * Connection type
     */
    type: 'input' | 'output';
    /**
     * Connection status
     */
    status?: 'pending' | 'connected' | 'disconnected' | 'error';
    /**
     * Data type for this connection (single type)
     */
    dataType?: string;
    /**
     * Data types supported by this connection (multiple types)
     */
    dataTypes?: string[];
    /**
     * Connection metadata
     */
    metadata?: Record<string, any>;
}
/**
 * Interface for data transfer between modules
 */
interface DataTransfer {
    /**
     * Unique identifier for the data transfer
     */
    id: string;
    /**
     * Source connection ID
     */
    sourceConnectionId: string;
    /**
     * Target connection ID
     */
    targetConnectionId: string;
    /**
     * Data payload
     */
    data: any;
    /**
     * Timestamp of the transfer
     */
    timestamp: number;
    /**
     * Transfer metadata
     */
    metadata?: Record<string, any>;
}

/**
 * Interface for debug module
 */
interface IDebugModule {
    /**
     * Log a message
     * @param message - Message to log
     * @param level - Log level (optional)
     * @param moduleInfo - Module information (optional)
     */
    log(message: string, level?: number, moduleInfo?: any): void;
    /**
     * Record data flow between modules
     * @param sourceModuleId - Source module ID
     * @param targetModuleId - Target module ID
     * @param data - Data being transferred
     */
    recordDataFlow(sourceModuleId: string, targetModuleId: string, data: any): void;
    /**
     * Add module connection
     * @param moduleId - Module ID
     * @param connectionType - Connection type
     */
    addModuleConnection(moduleId: string, connectionType: 'input' | 'output'): void;
    /**
     * Remove module connection
     * @param moduleId - Module ID
     */
    removeModuleConnection(moduleId: string): void;
}

/**
 * Interface for messages between modules
 */
interface Message {
    /**
     * Unique identifier for the message
     */
    id: string;
    /**
     * Message type
     */
    type: string;
    /**
     * Source module ID
     */
    source: string;
    /**
     * Target module ID (optional for broadcasts)
     */
    target?: string;
    /**
     * Message payload
     */
    payload: any;
    /**
     * Timestamp of the message
     */
    timestamp: number;
    /**
     * Correlation ID for request/response pairs
     */
    correlationId?: string;
    /**
     * Message metadata
     */
    metadata?: Record<string, any>;
    /**
     * Time to live in milliseconds
     */
    ttl?: number;
    /**
     * Message priority (0-9)
     */
    priority?: number;
}
/**
 * Interface for message responses
 */
interface MessageResponse {
    /**
     * Message ID that this response is for
     */
    messageId: string;
    /**
     * Correlation ID for request/response tracking
     */
    correlationId: string;
    /**
     * Whether the operation was successful
     */
    success: boolean;
    /**
     * Response data
     */
    data?: any;
    /**
     * Error message if operation failed
     */
    error?: string;
    /**
     * Timestamp of the response
     */
    timestamp: number;
}
/**
 * Interface for message handlers
 */
interface MessageHandler {
    /**
     * Handle incoming messages
     * @param message - The incoming message
     * @returns Promise that resolves to a response or void
     */
    handleMessage(message: Message): Promise<MessageResponse | void>;
}
/**
 * Statistics for the MessageCenter
 */
interface MessageCenterStats {
    /**
     * Total messages processed
     */
    totalMessages: number;
    /**
     * Number of active requests waiting for responses
     */
    activeRequests: number;
    /**
     * Number of registered modules
     */
    registeredModules: number;
    /**
     * Messages delivered successfully
     */
    messagesDelivered: number;
    /**
     * Messages that failed to deliver
     */
    messagesFailed: number;
    /**
     * Average response time in milliseconds
     */
    averageResponseTime: number;
    /**
     * System uptime in milliseconds
     */
    uptime: number;
}

interface ModuleInfo {
    /**
     * Unique identifier for the module
     */
    id: string;
    /**
     * Module type
     */
    type: string;
    /**
     * Module name
     */
    name: string;
    /**
     * Module version
     */
    version: string;
    /**
     * Module description
     */
    description: string;
    /**
     * Additional module metadata
     */
    metadata?: Record<string, any>;
}

/**
 * Interface for validation rules
 */
interface ValidationRule {
    /**
     * Field name to validate
     */
    field: string;
    /**
     * Type of validation to perform
     */
    type: 'required' | 'string' | 'number' | 'boolean' | 'object' | 'array' | 'custom';
    /**
     * Error message to display if validation fails
     */
    message: string;
    /**
     * Custom validator function (only for 'custom' type)
     */
    validator?: (value: any) => boolean;
}
/**
 * Interface for validation result
 */
interface ValidationResult {
    /**
     * Whether the validation passed
     */
    isValid: boolean;
    /**
     * Array of error messages
     */
    errors: string[];
    /**
     * The data that was validated
     */
    data: any;
}

type AppError = Error;
interface ModuleSource {
    moduleId: string;
    moduleName: string;
    version: string;
    fileName?: string;
    lineNumber?: number;
    stackTrace?: string;
}
interface ErrorClassification {
    source: ErrorSource;
    type: ErrorType;
    severity: ErrorSeverity;
    impact: ErrorImpact;
    recoverability: ErrorRecoverability;
}
interface ErrorHandlingConfig {
    queueSize?: number;
    flushInterval?: number;
    enableBatchProcessing?: boolean;
    maxBatchSize?: number;
    enableCompression?: boolean;
    enableMetrics?: boolean;
    enableLogging?: boolean;
    logLevel?: string;
    retryPolicy?: RetryPolicy;
    circuitBreaker?: CircuitBreakerConfig;
}
interface RetryPolicy {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
    maxRetryDelay: number;
}
interface CircuitBreakerConfig {
    failureThreshold: number;
    recoveryTime: number;
    requestVolumeThreshold: number;
}
interface HandlingResult {
    status: HandlingStatus;
    message: string;
    details: string;
    code: string;
    metrics?: HandlingMetrics;
}
interface HandlingMetrics {
    retryCount: number;
    processingStartTime: number;
    processingEndTime: number;
    memoryUsage: number;
    cpuUsage?: number;
    networkCalls?: number;
}
interface ResponseData {
    moduleName: string;
    moduleId: string;
    response: any;
    config: ErrorHandlingConfig;
    metadata: Record<string, any>;
}
interface RelatedInfo {
    errorId?: string;
    moduleIds?: string[];
    componentIds?: string[];
    dependencies?: string[];
    customFields?: Record<string, any>;
}
interface ErrorContext {
    errorId: string;
    error: AppError;
    timestamp: Date;
    source: ModuleSource;
    classification: ErrorClassification;
    data: Record<string, any>;
    config: ErrorHandlingConfig;
    callback?: (response: ErrorResponse) => void;
}
interface ErrorResponse {
    responseId: string;
    errorId: string;
    result: HandlingResult;
    timestamp: Date;
    processingTime: number;
    data: ResponseData;
    actions: Action[];
    annotations: ModuleAnnotation[];
}
interface ModuleResponse {
    responseId: string;
    moduleId: string;
    moduleName: string;
    timestamp: Date;
    status: ResponseStatus;
    data: ModuleResponseData;
    actions: ResponseAction[];
    annotations: ResponseAnnotation[];
    metadata: ResponseMetadata;
}
interface ModuleResponseData {
    message: string;
    details?: string;
    result?: any;
    error?: any;
    config?: Record<string, any>;
    context?: Record<string, any>;
}
interface ResponseAction {
    actionId: string;
    type: ResponseActionType;
    description: string;
    parameters: Record<string, any>;
    priority: ActionPriority;
    status: ResponseStatus;
    executionTime: number;
    timestamp: Date;
}
interface ResponseAnnotation {
    annotationId: string;
    type: AnnotationType;
    content: string;
    timestamp: Date;
    moduleRef: string;
    context?: Record<string, any>;
}
interface ResponseMetadata {
    processingTime: number;
    retryCount: number;
    attempts: number;
    memoryUsed: number;
    cpuUsed?: number;
    version: string;
    environment: string;
}
interface Action {
    actionId: string;
    type: ActionType;
    target: string;
    payload: Record<string, any>;
    priority: ActionPriority;
    status: ActionStatus;
    timestamp: Date;
}
interface ModuleRegistration {
    moduleId: string;
    moduleName: string;
    moduleType: string;
    version: string;
    config: ErrorHandlingConfig;
    capabilities: string[];
    dependencies?: string[];
    metadata?: Record<string, any>;
    errorPolicies?: any[];
    customRules?: any[];
    responseHandler?: ResponseHandler;
}
interface ResponseHandler {
    handleId: string;
    name: string;
    priority: number;
    isEnabled: boolean;
    conditions: RouteCondition[];
    execute: (context: ErrorContext) => Promise<ErrorResponse>;
    config?: Record<string, any>;
}
interface RouteCondition {
    moduleIds?: string[];
    errorTypes?: ErrorType[];
    severities?: ErrorSeverity[];
    priorities?: ActionPriority[];
    custom?: Record<string, any>;
}
interface ModuleAnnotation {
    annotationId: string;
    moduleInfo: any;
    type: AnnotationType;
    content: string;
    createdAt: Date;
    createdBy: string;
    related: RelatedInfo;
}
declare enum ErrorSource {
    MODULE = "module",
    SYSTEM = "system",
    EXTERNAL = "external",
    NETWORK = "network",
    UNKNOWN = "unknown"
}
declare enum ErrorType {
    BUSINESS = "business",
    TECHNICAL = "technical",
    CONFIGURATION = "configuration",
    RESOURCE = "resource",
    DEPENDENCY = "dependency"
}
declare enum ErrorSeverity {
    CRITICAL = "critical",
    HIGH = "high",
    MEDIUM = "medium",
    LOW = "low"
}
declare enum ErrorImpact {
    SINGLE_MODULE = "single_module",
    MULTIPLE_MODULE = "multiple_module",
    SYSTEM_WIDE = "system_wide"
}
declare enum ErrorRecoverability {
    RECOVERABLE = "recoverable",
    NON_RECOVERABLE = "non_recoverable",
    AUTO_RECOVERABLE = "auto_recoverable"
}
declare enum ResponseStatus {
    PENDING = "pending",
    IN_PROGRESS = "in_progress",
    SUCCESS = "success",
    FAILURE = "failure",
    RETRY = "retry",
    FALLENBACK = "fallback",
    CANCELLED = "cancelled"
}
declare enum ResponseActionType {
    RETRY = "retry",
    FALLBACK = "fallback",
    LOG = "log",
    NOTIFY = "notify",
    ISOLATE = "isolate",
    RESTART = "restart",
    CUSTOM = "custom"
}
declare enum PolicyType {
    RETRY = "retry",
    FALLBACK = "fallback",
    ISOLATION = "isolation",
    NOTIFICATION = "notification",
    CUSTOM = "custom"
}
declare enum RuleType {
    ROUTING = "routing",
    FILTERING = "filtering",
    TRANSFORMATION = "transformation",
    CUSTOM = "custom"
}
declare enum ConditionOperator {
    EQUALS = "equals",
    NOT_EQUALS = "not_equals",
    CONTAINS = "contains",
    NOT_CONTAINS = "not_contains",
    GREATER_THAN = "greater_than",
    LESS_THAN = "less_than",
    IN = "in",
    NOT_IN = "not_in",
    REGEX = "regex",
    CUSTOM = "custom"
}
declare enum LogicalOperator {
    AND = "and",
    OR = "or"
}
declare enum ActionType {
    RETRY = "retry",
    FALLBACK = "fallback",
    LOG = "log",
    NOTIFY = "notify",
    ISOLATE = "isolate",
    RESTART = "restart",
    CUSTOM = "custom"
}
declare enum AnnotationType {
    ERROR = "error",
    WARNING = "warning",
    INFO = "info",
    DEBUG = "debug",
    CUSTOM = "custom"
}
declare enum HandlingStatus {
    SUCCESS = "success",
    FAILURE = "failure",
    PARTIAL = "partial",
    RETRY = "retry",
    FALLENBACK = "fallback"
}
declare enum ActionStatus {
    PENDING = "pending",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
declare enum ActionPriority {
    CRITICAL = "critical",
    HIGH = "high",
    MEDIUM = "medium",
    LOW = "low"
}

/**
 * Enhanced Recording System Interfaces
 *
 * This file contains all interface definitions for the enhanced BaseModule recording system,
 * including circular recording, error recording, field truncation, and configuration management.
 */
/**
 * Main recording configuration interface
 */
interface BaseModuleRecordingConfig {
    enabled?: boolean;
    basePath?: string;
    port?: number;
    globalConfig?: GlobalRecordingConfig;
    module?: ModuleRecordingConfig;
    cycle?: CycleRecordingConfig;
    error?: ErrorRecordingConfig;
    file?: FileManagementConfig;
    templates?: RecordingTemplates;
    truncation?: FieldTruncationConfig;
}
/**
 * Circular recording configuration
 */
interface CycleRecordingConfig {
    enabled?: boolean;
    mode?: 'disabled' | 'single' | 'cyclic';
    basePath?: string;
    cycleDirTemplate?: string;
    mainFileTemplate?: string;
    summaryFileTemplate?: string;
    format?: 'json' | 'jsonl' | 'csv';
    includeIndex?: boolean;
    includeTimestamp?: boolean;
    autoCreateDirectory?: boolean;
    autoCloseOnComplete?: boolean;
    maxCyclesRetained?: number;
}
/**
 * Error recording configuration
 */
interface ErrorRecordingConfig {
    enabled?: boolean;
    levels?: ErrorLevel[];
    categories?: ErrorCategory[];
    basePath?: string;
    indexFileTemplate?: string;
    detailFileTemplate?: string;
    summaryFileTemplate?: string;
    dailyDirTemplate?: string;
    indexFormat?: 'jsonl' | 'csv';
    detailFormat?: 'json' | 'pretty';
    autoRecoveryTracking?: boolean;
    maxErrorsRetained?: number;
    enableStatistics?: boolean;
}
/**
 * File management configuration
 */
interface FileManagementConfig {
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
interface ModuleRecordingConfig {
    enabled?: boolean;
    basePath?: string;
    format?: string;
    includeMetadata?: boolean;
    autoCreateDirectory?: boolean;
}
/**
 * Template configuration
 */
interface RecordingTemplates {
    pathVariables?: Record<string, string>;
    customPaths?: Record<string, string>;
}
/**
 * Field truncation configuration
 */
interface FieldTruncationConfig {
    enabled?: boolean;
    defaultStrategy?: 'truncate' | 'replace' | 'hide';
    defaultMaxLength?: number;
    defaultReplacementText?: string;
    fields?: FieldTruncationRule[];
    pathPatterns?: PathPatternRule[];
    excludedFields?: string[];
    preserveStructure?: boolean;
    truncateArrays?: boolean;
    arrayTruncateLimit?: number;
    recursiveTruncation?: boolean;
}
/**
 * Field truncation rule
 */
interface FieldTruncationRule {
    fieldPath: string;
    strategy?: 'truncate' | 'replace' | 'hide';
    maxLength?: number;
    replacementText?: string;
    condition?: (value: any, context: any) => boolean;
    priority?: number;
}
/**
 * Path pattern rule
 */
interface PathPatternRule {
    pattern: string;
    condition?: 'always' | 'if_long' | 'if_nested';
    strategy?: 'truncate' | 'replace' | 'hide';
    maxLength?: number;
    replacementText?: string;
}
/**
 * Error levels
 */
type ErrorLevel = 'trace' | 'debug' | 'info' | 'warning' | 'error' | 'fatal';
/**
 * Error categories
 */
type ErrorCategory = 'network' | 'validation' | 'processing' | 'system' | 'security' | 'business';
/**
 * Error record data
 */
interface ErrorRecordData {
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
interface ErrorRecord {
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
interface ErrorFilters {
    level?: ErrorLevel[];
    category?: ErrorCategory[];
    module?: string;
    resolved?: boolean;
    timeRange?: {
        start: number;
        end: number;
    };
    operation?: string;
}
/**
 * Error statistics
 */
interface ErrorStatistics {
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
interface ErrorTrendPoint {
    timestamp: number;
    errorCount: number;
    resolvedCount: number;
    errorRate: number;
}
/**
 * Cycle record
 */
interface CycleRecord {
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
interface CycleHandle {
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
interface CycleInfo {
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
/**
 * Truncation context
 */
interface TruncationContext {
    operation?: string;
    module?: string;
    cycleId?: string;
    timestamp?: number;
    custom?: Record<string, any>;
}
/**
 * Truncation statistics
 */
interface TruncationStatistics {
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
/**
 * Request context
 */
interface RequestContext {
    requestId: string;
    sessionId: string;
    traceId: string;
    chainId: string;
    startModule: string;
    startTime: number;
    basePath: string;
    currentPath: string;
    pathHistory: Array<{
        moduleId: string;
        path: string;
        timestamp: number;
    }>;
    configSnapshot: RecordingConfigSnapshot;
    sharedData: Map<string, any>;
    status: 'active' | 'completed' | 'error';
    currentModule: string;
    moduleStack: string[];
}
/**
 * Recording configuration snapshot
 */
interface RecordingConfigSnapshot {
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
interface RequestContextOptions {
    customConfig?: Partial<BaseModuleRecordingConfig>;
    inheritContext?: string;
    createNewContext?: boolean;
}
/**
 * Trace report
 */
interface TraceReport {
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
/**
 * Global recording configuration
 */
interface GlobalRecordingConfig {
    sessionId: string;
    environment: 'development' | 'production' | 'test';
    version: string;
    baseConfig: BaseModuleRecordingConfig;
    moduleOverrides: Map<string, Partial<BaseModuleRecordingConfig>>;
    configVersion: string;
    lastUpdated: number;
    consistency: {
        enforced: boolean;
        validationInterval: number;
        allowedDeviations: string[];
    };
}
/**
 * Configuration change callback
 */
type ConfigChangeCallback = (config: BaseModuleRecordingConfig) => Promise<void> | void;
/**
 * Configuration update result
 */
interface ConfigUpdateResult {
    success: boolean;
    configVersion?: string;
    errors?: string[];
    requiresForce?: boolean;
}
/**
 * Configuration synchronization result
 */
interface ConfigSyncResult {
    success: boolean;
    moduleResults: Record<string, boolean>;
}
/**
 * Consistency validation result
 */
interface ConsistencyValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    details: any;
}
/**
 * Validated recording configuration
 */
interface ValidatedRecordingConfig extends BaseModuleRecordingConfig {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}
/**
 * Global consistency result
 */
interface GlobalConsistencyResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    details?: any;
}
/**
 * Chain configuration validation result
 */
interface ChainConfigValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    moduleIssues: Record<string, string[]>;
}
/**
 * Base module options with recording configuration
 */
interface BaseModuleOptions {
    recordingConfig?: BaseModuleRecordingConfig;
    globalConfig?: GlobalRecordingConfig;
}
/**
 * Enhanced error recording options
 */
interface ErrorRecordingOptions {
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
interface ModuleErrorStatistics {
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
interface ChainStatus {
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
interface TruncationReport {
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

/**
 * Core recording manager that coordinates all recording components
 */
declare class RecordingManager {
    private config;
    private globalConfig;
    private activeRequests;
    private activeCycles;
    private errorRecords;
    private configChangeCallbacks;
    private truncationStats;
    constructor(config?: BaseModuleRecordingConfig);
    /**
     * Update recording configuration
     */
    updateConfig(newConfig: Partial<BaseModuleRecordingConfig>, force?: boolean): Promise<ConfigUpdateResult>;
    /**
     * Synchronize configuration across modules
     */
    syncConfiguration(moduleConfigs: Record<string, BaseModuleRecordingConfig>): Promise<ConfigSyncResult>;
    /**
     * Get current configuration
     */
    getConfig(): BaseModuleRecordingConfig;
    /**
     * Get global configuration
     */
    getGlobalConfig(): GlobalRecordingConfig | null;
    /**
     * Create new request context
     */
    createRequestContext(options?: {
        customConfig?: Partial<BaseModuleRecordingConfig>;
        inheritContext?: string;
        createNewContext?: boolean;
    }): RequestContext;
    /**
     * Get request context
     */
    getRequestContext(requestId: string): RequestContext | undefined;
    /**
     * Update request context
     */
    updateRequestContext(requestId: string, updates: Partial<RequestContext>): boolean;
    /**
     * Complete request context
     */
    completeRequestContext(requestId: string, status?: 'completed' | 'error'): boolean;
    /**
     * Start cycle recording
     */
    startCycleRecording(requestId: string, operation: string, module: string): CycleHandle | null;
    /**
     * Record cycle event
     */
    recordCycleEvent(handle: CycleHandle, event: {
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
    }): boolean;
    /**
     * End cycle recording
     */
    endCycleRecording(handle: CycleHandle, result?: any, error?: string): boolean;
    /**
     * Record error
     */
    recordError(errorData: {
        error: Error | string;
        level?: 'trace' | 'debug' | 'info' | 'warning' | 'error' | 'fatal';
        category?: 'network' | 'validation' | 'processing' | 'system' | 'security' | 'business';
        operation?: string;
        context?: Record<string, any>;
        recoverable?: boolean;
        cycleId?: string;
    }): string;
    /**
     * Get error records
     */
    getErrorRecords(filters?: {
        level?: ('trace' | 'debug' | 'info' | 'warning' | 'error' | 'fatal')[];
        category?: ('network' | 'validation' | 'processing' | 'system' | 'security' | 'business')[];
        module?: string;
        resolved?: boolean;
        timeRange?: {
            start: number;
            end: number;
        };
        operation?: string;
    }): ErrorRecord[];
    /**
     * Resolve error
     */
    resolveError(errorId: string, resolution: string): boolean;
    /**
     * Truncate fields in data object
     */
    truncateFields(data: any, context: string): any;
    /**
     * Get truncation statistics
     */
    getTruncationStats(): TruncationReport;
    private validateConfig;
    private initializeGlobalConfig;
    private createConfigSnapshot;
    private resolveBasePath;
    private resolveCyclePath;
    private resolveCycleFilePath;
    private resolveErrorPath;
    private resolvePathTemplate;
    private validateConfiguration;
    private validateConfigurationConsistency;
    private notifyConfigChange;
    private findRequestContext;
    private generateTraceReport;
    private saveTraceReport;
    private writeCycleRecord;
    private generateCycleSummary;
    private writeErrorRecord;
    private truncateFieldsRecursive;
    private updateTruncationStats;
    private extractModuleName;
    private logError;
}

/**
 * Circular recording component that manages request-response cycle recording
 */
declare class CycleRecorder {
    private config;
    private activeCycles;
    private cycleRecords;
    private truncationConfig;
    constructor(config: CycleRecordingConfig, truncationConfig?: FieldTruncationConfig);
    /**
     * Start a new recording cycle
     */
    startCycle(operation: string, module: string, options?: {
        requestId?: string;
        basePath?: string;
        customConfig?: Partial<CycleRecordingConfig>;
    }): Promise<CycleHandle>;
    /**
     * Record a cycle event
     */
    recordCycleEvent(handle: CycleHandle, event: Omit<CycleRecord, 'data' | 'result'> & {
        data?: any;
        result?: any;
    }): Promise<boolean>;
    /**
     * End a recording cycle
     */
    endCycle(handle: CycleHandle, result?: any, error?: string): Promise<boolean>;
    /**
     * Get cycle information
     */
    getCycleInfo(cycleId: string): CycleInfo | undefined;
    /**
     * Get all active cycles
     */
    getActiveCycles(): CycleInfo[];
    /**
     * Get cycle records
     */
    getCycleRecords(cycleId: string): CycleRecord[];
    /**
     * Close and clean up a cycle
     */
    closeCycle(cycleId: string): Promise<boolean>;
    /**
     * Close all active cycles
     */
    closeAllCycles(): Promise<void>;
    /**
     * Get cycle statistics
     */
    getCycleStatistics(cycleId: string): {
        totalRecords: number;
        duration: number;
        averageRecordInterval: number;
        recordTypes: Record<string, number>;
        errorCount: number;
    } | null;
    /**
     * Get all cycle statistics
     */
    getAllCycleStatistics(): Record<string, {
        totalRecords: number;
        duration: number;
        averageRecordInterval: number;
        recordTypes: Record<string, number>;
        errorCount: number;
    }>;
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<CycleRecordingConfig>): void;
    /**
     * Update truncation configuration
     */
    updateTruncationConfig(truncationConfig: FieldTruncationConfig | null): void;
    /**
     * Get current configuration
     */
    getConfig(): CycleRecordingConfig;
    private validateConfig;
    private resolveCycleBasePath;
    private resolvePathTemplate;
    private ensureDirectoryExists;
    private writeCycleRecord;
    private resolveRecordFilePath;
    private formatRecordContent;
    private generateCycleSummary;
    private applyCleanupPolicies;
    private truncateFields;
}

/**
 * Error recording component that manages error tracking and recovery
 */
declare class ErrorRecorder {
    private config;
    private errorRecords;
    private errorIndex;
    private recoveryTracking;
    constructor(config: ErrorRecordingConfig);
    /**
     * Record an error
     */
    recordError(errorData: ErrorRecordData): Promise<string>;
    /**
     * Get error record by ID
     */
    getError(errorId: string): ErrorRecord | undefined;
    /**
     * Get errors with filters
     */
    getErrors(filters?: ErrorFilters): ErrorRecord[];
    /**
     * Get errors by category
     */
    getErrorsByCategory(category: string): ErrorRecord[];
    /**
     * Get errors by level
     */
    getErrorsByLevel(level: string): ErrorRecord[];
    /**
     * Get errors by module
     */
    getErrorsByModule(module: string): ErrorRecord[];
    /**
     * Mark error as resolved
     */
    resolveError(errorId: string, resolution: string): Promise<boolean>;
    /**
     * Mark error as unresolved
     */
    unresolveError(errorId: string): Promise<boolean>;
    /**
     * Get unresolved errors
     */
    getUnresolvedErrors(): ErrorRecord[];
    /**
     * Get resolved errors
     */
    getResolvedErrors(): ErrorRecord[];
    /**
     * Track recovery attempt
     */
    trackRecoveryAttempt(errorId: string, success: boolean): void;
    /**
     * Get recovery tracking info
     */
    getRecoveryTracking(errorId: string): {
        attempts: number;
        lastAttempt: number;
    } | undefined;
    /**
     * Get all errors needing recovery
     */
    getErrorsNeedingRecovery(): ErrorRecord[];
    /**
     * Get error statistics
     */
    getErrorStatistics(timeRange?: {
        start: number;
        end: number;
    }): ErrorStatistics;
    /**
     * Get error trend data
     */
    getErrorTrend(timeRange: {
        start: number;
        end: number;
    }, intervalMs?: number): ErrorTrendPoint[];
    /**
     * Get error summary
     */
    getErrorSummary(): {
        totalErrors: number;
        unresolvedErrors: number;
        criticalErrors: number;
        recentErrors: ErrorRecord[];
        topErrorCategories: Array<{
            category: string;
            count: number;
        }>;
    };
    /**
     * Write error record to file
     */
    private writeErrorRecord;
    /**
     * Write error index to file
     */
    private writeErrorIndex;
    /**
     * Load error records from files
     */
    loadErrorRecords(): Promise<void>;
    /**
     * Cleanup old error records
     */
    private applyCleanupPolicies;
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<ErrorRecordingConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): ErrorRecordingConfig;
    private validateConfig;
    private shouldRecordError;
    private matchesFilters;
    private resolveErrorFilePath;
    private resolveIndexPath;
    private resolvePathTemplate;
    private updateErrorIndex;
    private trackRecovery;
    private groupBy;
}

/**
 * Field truncation component that handles data size optimization
 */
declare class FieldTruncator {
    private config;
    private statistics;
    constructor(config: FieldTruncationConfig);
    /**
     * Truncate fields in data object
     */
    truncateFields(data: any, context?: TruncationContext | string): any;
    /**
     * Truncate a specific field by path
     */
    truncateFieldByPath(data: any, fieldPath: string, context?: TruncationContext): any;
    /**
     * Get truncation statistics
     */
    getStatistics(): TruncationStatistics;
    /**
     * Get truncation report
     */
    getReport(): TruncationReport;
    /**
     * Reset statistics
     */
    resetStatistics(): void;
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<FieldTruncationConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): FieldTruncationConfig;
    /**
     * Add field truncation rule
     */
    addFieldRule(rule: FieldTruncationRule): void;
    /**
     * Remove field truncation rule
     */
    removeFieldRule(fieldPath: string): boolean;
    /**
     * Add path pattern rule
     */
    addPathPatternRule(rule: PathPatternRule): void;
    /**
     * Remove path pattern rule
     */
    removePathPatternRule(pattern: string): boolean;
    private validateConfig;
    private initializeStatistics;
    private truncateFieldsRecursive;
    private truncateArray;
    private truncateObject;
    private truncateValue;
    private isFieldExcluded;
    private findFieldRule;
    private findPathPatternRule;
    private shouldApplyPathPattern;
    private pathMatchesPattern;
    private applyFieldRule;
    private applyPathPatternRule;
    private applyTruncation;
    private getFieldMaxLength;
    private getFieldTruncationStrategy;
    private getFieldReplacementText;
    private updateFieldStats;
    private updateStatistics;
}

/**
 * Request context manager that handles cross-module chain tracking
 */
declare class RequestContextManager {
    private activeContexts;
    private contextHistory;
    private chainBreakpoints;
    private moduleContexts;
    private globalSessionId;
    constructor();
    /**
     * Create new request context
     */
    createContext(options?: RequestContextOptions): RequestContext;
    /**
     * Get request context
     */
    getContext(requestId: string): RequestContext | undefined;
    /**
     * Update request context
     */
    updateContext(requestId: string, updates: Partial<RequestContext>): boolean;
    /**
     * Complete request context
     */
    completeContext(requestId: string, status?: 'completed' | 'error'): boolean;
    /**
     * Get all active contexts
     */
    getActiveContexts(): RequestContext[];
    /**
     * Get contexts by session
     */
    getContextsBySession(sessionId: string): RequestContext[];
    /**
     * Get contexts by module
     */
    getContextsByModule(moduleId: string): RequestContext[];
    /**
     * Get chain status
     */
    getChainStatus(chainId: string): ChainStatus | undefined;
    /**
     * Detect chain breakpoint
     */
    private detectChainBreakpoint;
    /**
     * Attempt chain repair
     */
    private attemptChainRepair;
    /**
     * Get chain breakpoints
     */
    getChainBreakpoints(chainId?: string): Array<{
        chainId: string;
        timestamp: number;
        reason: string;
        details: string;
        repairAttempted: boolean;
    }>;
    /**
     * Clear chain breakpoints
     */
    clearChainBreakpoints(chainId?: string): void;
    /**
     * Set shared data
     */
    setSharedData(requestId: string, key: string, value: any): boolean;
    /**
     * Get shared data
     */
    getSharedData(requestId: string, key: string): any | undefined;
    /**
     * Get all shared data
     */
    getAllSharedData(requestId: string): Map<string, any> | undefined;
    /**
     * Share data across chain
     */
    shareDataAcrossChain(chainId: string, key: string, value: any): number;
    /**
     * Generate trace report
     */
    generateTraceReport(context: RequestContext): TraceReport;
    /**
     * Get trace reports for session
     */
    getTraceReports(sessionId?: string): TraceReport[];
    /**
     * Update module registration
     */
    private updateModuleRegistration;
    /**
     * Remove from module contexts
     */
    private removeFromModuleContexts;
    /**
     * Get active modules
     */
    getActiveModules(): string[];
    /**
     * Get module context count
     */
    getModuleContextCount(moduleId: string): number;
    private createConfigSnapshot;
    private resolveBasePath;
    private calculateModuleTimings;
    private extractErrors;
    private generateTraceSummary;
    /**
     * Cleanup old contexts
     */
    cleanup(maxAge?: number): number;
    /**
     * Get statistics
     */
    getStatistics(): {
        activeContexts: number;
        totalContexts: number;
        chainBreakpoints: number;
        activeModules: number;
        sessionCount: number;
    };
    private extractModuleName;
}

/**
 * Global configuration manager that ensures consistent configuration across modules
 */
declare class GlobalConfigManager {
    private globalConfig;
    private configSubscribers;
    private validationHistory;
    private consistencyInterval;
    private moduleConfigs;
    constructor(baseConfig?: BaseModuleRecordingConfig);
    /**
     * Get global configuration
     */
    getGlobalConfig(): GlobalRecordingConfig;
    /**
     * Update global configuration
     */
    updateGlobalConfig(updates: Partial<GlobalRecordingConfig>): Promise<ConfigUpdateResult>;
    /**
     * Register module configuration
     */
    registerModuleConfig(moduleId: string, config: BaseModuleRecordingConfig): ConfigUpdateResult;
    /**
     * Unregister module configuration
     */
    unregisterModuleConfig(moduleId: string): boolean;
    /**
     * Get module configuration
     */
    getModuleConfig(moduleId: string): BaseModuleRecordingConfig | undefined;
    /**
     * Get all module configurations
     */
    getAllModuleConfigs(): Record<string, BaseModuleRecordingConfig>;
    /**
     * Synchronize configuration across modules
     */
    syncConfiguration(moduleConfigs: Record<string, BaseModuleRecordingConfig>): Promise<ConfigSyncResult>;
    /**
     * Force synchronization
     */
    forceSync(): Promise<ConfigSyncResult>;
    /**
     * Validate global configuration consistency
     */
    validateGlobalConsistency(): ConsistencyValidationResult;
    /**
     * Validate module configuration
     */
    validateModuleConfig(config: BaseModuleRecordingConfig): ValidatedRecordingConfig;
    /**
     * Check module compatibility with global config
     */
    private checkModuleCompatibility;
    /**
     * Check for conflicts between modules
     */
    private checkModuleConflicts;
    /**
     * Subscribe to configuration changes
     */
    subscribe(moduleId: string, callback: ConfigChangeCallback): void;
    /**
     * Unsubscribe from configuration changes
     */
    unsubscribe(moduleId: string): boolean;
    /**
     * Notify all subscribers of configuration changes
     */
    private notifySubscribers;
    /**
     * Start consistency validation interval
     */
    private startConsistencyValidation;
    /**
     * Stop consistency validation
     */
    stopConsistencyValidation(): void;
    /**
     * Get validation history
     */
    getValidationHistory(version?: string): ConsistencyValidationResult[];
    /**
     * Get latest validation result
     */
    getLatestValidation(): ConsistencyValidationResult | undefined;
    /**
     * Export configuration
     */
    exportConfiguration(): {
        globalConfig: GlobalRecordingConfig;
        moduleConfigs: Record<string, BaseModuleRecordingConfig>;
        exportTime: number;
        version: string;
    };
    /**
     * Import configuration
     */
    importConfiguration(data: {
        globalConfig: GlobalRecordingConfig;
        moduleConfigs: Record<string, BaseModuleRecordingConfig>;
    }, force?: boolean): Promise<ConfigUpdateResult>;
    private initializeGlobalConfig;
    private generateConfigVersion;
    /**
     * Get statistics
     */
    getStatistics(): {
        moduleCount: number;
        subscriberCount: number;
        validationCount: number;
        lastValidation: ConsistencyValidationResult | undefined;
        configVersion: string;
        uptime: number;
    };
    /**
     * Cleanup
     */
    destroy(): void;
}

/**
 * Configuration validator that ensures all recording configurations are valid
 */
declare class ConfigValidator {
    private validationRules;
    constructor();
    /**
     * Validate complete recording configuration
     */
    validateRecordingConfig(config: BaseModuleRecordingConfig): ValidatedRecordingConfig;
    /**
     * Validate global recording configuration
     */
    validateGlobalConfig(config: GlobalRecordingConfig): GlobalConsistencyResult;
    /**
     * Validate chain configuration (multiple related modules)
     */
    validateChainConfig(moduleConfigs: Record<string, BaseModuleRecordingConfig>): ChainConfigValidationResult;
    private validateTopLevelConfig;
    private validateCycleConfig;
    private validateErrorConfig;
    private validateTruncationConfig;
    private validateFileConfig;
    private validateConfigDependencies;
    private validateCrossModuleConsistency;
    private validateConsistencySettings;
    private validatePath;
    private validateTemplate;
    private validateFieldRule;
    private validatePathPattern;
    private isValidVersion;
    private initializeValidationRules;
    /**
     * Add custom validation rule
     */
    addValidationRule(name: string, rule: (config: any) => string[]): void;
    /**
     * Remove custom validation rule
     */
    removeValidationRule(name: string): boolean;
    /**
     * Get all validation rules
     */
    getValidationRules(): Array<{
        name: string;
        description: string;
    }>;
}

/**
 * Path resolver that handles template-based path resolution with variable substitution
 */
declare class PathResolver {
    private globalVariables;
    private customTemplates;
    constructor();
    /**
     * Resolve a path template with variables
     */
    resolveTemplate(template: string, variables?: Record<string, any>): string;
    /**
     * Resolve cycle recording path
     */
    resolveCyclePath(config: CycleRecordingConfig, variables: {
        cycleId: string;
        requestId?: string;
        sessionId?: string;
        timestamp: number;
    }): string;
    /**
     * Resolve error recording path
     */
    resolveErrorPath(config: ErrorRecordingConfig, variables: {
        errorId: string;
        timestamp: number;
        level?: string;
        category?: string;
    }): string;
    /**
     * Resolve complete file path for cycle recording
     */
    resolveCycleFilePath(config: CycleRecordingConfig, variables: {
        cycleId: string;
        type: 'start' | 'middle' | 'end';
        index: number;
        format: string;
        timestamp: number;
    }): string;
    /**
     * Resolve error index file path
     */
    resolveErrorIndexPath(config: ErrorRecordingConfig, variables: {
        date?: string;
        timestamp: number;
    }): string;
    /**
     * Set global variable
     */
    setGlobalVariable(name: string, value: string): void;
    /**
     * Get global variable
     */
    getGlobalVariable(name: string): string | undefined;
    /**
     * Remove global variable
     */
    removeGlobalVariable(name: string): boolean;
    /**
     * Get all global variables
     */
    getGlobalVariables(): Record<string, string>;
    /**
     * Set custom template
     */
    setCustomTemplate(name: string, template: string): void;
    /**
     * Get custom template
     */
    getCustomTemplate(name: string): string | undefined;
    /**
     * Remove custom template
     */
    removeCustomTemplate(name: string): boolean;
    /**
     * Get all custom templates
     */
    getCustomTemplates(): Record<string, string>;
    /**
     * Validate path template
     */
    validateTemplate(template: string): {
        valid: boolean;
        errors: string[];
        variables: string[];
    };
    /**
     * Normalize path
     */
    normalizePath(path: string): string;
    /**
     * Join path segments
     */
    joinPaths(...segments: string[]): string;
    /**
     * Get absolute path
     */
    getAbsolutePath(relativePath: string, basePath?: string): string;
    /**
     * Check if path is absolute
     */
    isAbsolutePath(path: string): boolean;
    /**
     * Extract variables from template
     */
    extractVariables(template: string): string[];
    /**
     * Check if template contains variable
     */
    containsVariable(template: string, variable: string): boolean;
    /**
     * Get format extension
     */
    private getFormatExtension;
    /**
     * Apply built-in functions
     */
    private applyBuiltInFunctions;
    /**
     * Format date
     */
    private formatDate;
    /**
     * Format timestamp
     */
    private formatTimestamp;
    /**
     * Generate random string
     */
    private generateRandomString;
    /**
     * Generate UUID
     */
    private generateUUID;
    /**
     * Initialize global variables
     */
    private initializeGlobalVariables;
    /**
     * Get supported variables
     */
    getSupportedVariables(): Array<{
        category: string;
        variables: Array<{
            name: string;
            description: string;
        }>;
    }>;
}

/**
 * Message center for module communication
 */
declare class MessageCenter {
    private static instance;
    private modules;
    private pendingRequests;
    private stats;
    private responseTimes;
    private startTime;
    /**
     * Private constructor for singleton pattern
     */
    private constructor();
    /**
     * Get the singleton instance of MessageCenter
     * @returns MessageCenter instance
     */
    static getInstance(): MessageCenter;
    /**
     * Register a module with the message center
     * @param moduleId - Module ID
     * @param moduleInstance - Module instance
     */
    registerModule(moduleId: string, moduleInstance: any): void;
    /**
     * Unregister a module from the message center
     * @param moduleId - Module ID
     */
    unregisterModule(moduleId: string): void;
    /**
     * Send a one-way message
     * @param message - Message to send
     */
    sendMessage(message: Message): void;
    /**
     * Broadcast a message to all modules
     * @param message - Message to broadcast
     */
    broadcastMessage(message: Message): void;
    /**
     * Send a request and wait for response
     * @param message - Request message
     * @param timeout - Timeout in milliseconds
     * @returns Promise that resolves to the response
     */
    sendRequest(message: Message, timeout?: number): Promise<MessageResponse>;
    /**
     * Send a request with callback (non-blocking)
     * @param message - Request message
     * @param callback - Callback function for response
     * @param timeout - Timeout in milliseconds
     */
    sendRequestAsync(message: Message, callback: (response: MessageResponse) => void, timeout?: number): void;
    /**
     * Process an incoming message
     * @param message - Message to process
     */
    private processMessage;
    /**
     * Deliver a message to a specific module
     * @param message - Message to deliver
     * @param moduleInstance - Target module instance
     */
    private deliverMessage;
    /**
     * Get message center statistics
     * @returns Statistics object
     */
    getStats(): MessageCenterStats;
    /**
     * Reset message center statistics
     */
    resetStats(): void;
}

/**
 * Debug log levels
 */
type DebugLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';
/**
 * Debug log entry
 */
interface DebugLogEntry {
    /**
     * Timestamp of the log entry
     */
    timestamp: number;
    /**
     * Log level
     */
    level: DebugLevel;
    /**
     * Log message
     */
    message: string;
    /**
     * Additional data associated with the log
     */
    data?: any;
    /**
     * Call stack information
     */
    stack?: string;
    /**
     * Module ID that generated the log
     */
    moduleId: string;
    /**
     * Method name where the log was generated
     */
    method?: string | undefined;
}
/**
 * Debug configuration
 */
interface DebugConfig {
    enabled: boolean;
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error';
    recordStack: boolean;
    maxLogEntries: number;
    consoleOutput: boolean;
    trackDataFlow: boolean;
    enableFileLogging: boolean;
    maxFileSize: number;
    maxLogFiles: number;
    pipelinePosition?: 'start' | 'middle' | 'end';
}
/**
 * Abstract base class for all modules
 * Provides foundational functionality for module management, connections, validation, debug, and messaging
 */
declare abstract class BaseModule implements MessageHandler {
    /**
     * Module information
     */
    protected info: ModuleInfo;
    /**
     * Input connections
     */
    protected inputConnections: Map<string, ConnectionInfo>;
    /**
     * Output connections
     */
    protected outputConnections: Map<string, ConnectionInfo>;
    /**
     * Validation rules for input data
     */
    protected validationRules: ValidationRule[];
    /**
     * Whether the module is initialized
     */
    protected initialized: boolean;
    /**
     * Configuration data for the module
     */
    protected config: Record<string, any>;
    /**
     * Whether the module is configured
     */
    protected configured: boolean;
    /**
     * Message center instance
     */
    protected messageCenter: MessageCenter;
    /**
     * Debug configuration
     */
    protected debugConfig: DebugConfig;
    /**
     * Debug log entries
     */
    protected debugLogs: DebugLogEntry[];
    /**
     * Debug event bus
     */
    protected eventBus: DebugEventBus;
    /**
     * Current session ID for pipeline operations
     */
    protected currentSessionId?: string;
    /**
     * Pipeline position of this module
     */
    protected pipelinePosition?: 'start' | 'middle' | 'end';
    /**
     * Pending message requests
     */
    protected pendingRequests: Map<string, {
        resolve: (response: MessageResponse) => void;
        reject: (error: any) => void;
    }>;
    /**
     * Creates an instance of BaseModule
     * @param info - Module information
     */
    constructor(info: ModuleInfo);
    /**
     * Static factory method to create an instance of the module
     * This ensures static compilation with dynamic instantiation
     * @param info - Module information
     * @returns Instance of the module
     */
    static createInstance<T extends BaseModule>(this: new (info: ModuleInfo) => T, info: ModuleInfo): T;
    /**
     * Sets the debug configuration
     * @param config - Debug configuration
     */
    setDebugConfig(config: Partial<DebugConfig>): void;
    /**
     * Sets the pipeline position for this module
     * @param position - Pipeline position
     */
    setPipelinePosition(position: 'start' | 'middle' | 'end'): void;
    /**
     * Sets the current session ID for pipeline operations
     * @param sessionId - Session ID
     */
    setCurrentSession(sessionId: string): void;
    /**
     * Gets the current debug configuration
     * @returns Debug configuration
     */
    getDebugConfig(): DebugConfig;
    /**
     * Start a pipeline session
     * @param sessionId - Session ID
     * @param pipelineConfig - Pipeline configuration
     */
    startPipelineSession(sessionId: string, pipelineConfig: any): void;
    /**
     * End a pipeline session
     * @param sessionId - Session ID
     * @param success - Whether session was successful
     */
    endPipelineSession(sessionId: string, success?: boolean): void;
    /**
     * Logs a debug message
     * @param level - Log level
     * @param message - Log message
     * @param data - Additional data to log
     * @param method - Method name where the log was generated
     */
    protected debug(level: DebugLevel, message: string, data?: any, method?: string): void;
    /**
     * Logs a trace message
     * @param message - Log message
     * @param data - Additional data to log
     * @param method - Method name where the log was generated
     */
    protected trace(message: string, data?: any, method?: string): void;
    /**
     * Logs a debug message
     * @param message - Log message
     * @param data - Additional data to log
     * @param method - Method name where the log was generated
     */
    protected log(message: string, data?: any, method?: string): void;
    /**
     * Logs an info message
     * @param message - Log message
     * @param data - Additional data to log
     * @param method - Method name where the log was generated
     */
    protected logInfo(message: string, data?: any, method?: string): void;
    /**
     * Logs a warning message
     * @param message - Log message
     * @param data - Additional data to log
     * @param method - Method name where the log was generated
     */
    protected warn(message: string, data?: any, method?: string): void;
    /**
     * Logs an error message
     * @param message - Log message
     * @param data - Additional data to log
     * @param method - Method name where the log was generated
     */
    protected error(message: string, data?: any, method?: string): void;
    /**
     * Gets debug logs
     * @param level - Optional filter by log level
     * @param limit - Optional limit on number of entries returned
     * @returns Array of debug log entries
     */
    getDebugLogs(level?: DebugLevel, limit?: number): DebugLogEntry[];
    /**
     * Clears debug logs
     */
    clearDebugLogs(): void;
    /**
     * Configures the module with initialization data
     * This method should be called before initialize()
     * @param config - Configuration data for the module
     */
    configure(config: Record<string, any>): void;
    /**
     * Gets the module information
     * @returns Module information
     */
    getInfo(): ModuleInfo;
    /**
     * Gets the module configuration
     * @returns Module configuration
     */
    getConfig(): Record<string, any>;
    /**
     * Initializes the module
     * This method should be overridden by subclasses
     */
    initialize(): Promise<void>;
    /**
     * Adds an input connection
     * @param connection - Connection information
     */
    addInputConnection(connection: ConnectionInfo): void;
    /**
     * Adds an output connection
     * @param connection - Connection information
     */
    addOutputConnection(connection: ConnectionInfo): void;
    /**
     * Removes an input connection
     * @param connectionId - Connection ID
     */
    removeInputConnection(connectionId: string): void;
    /**
     * Removes an output connection
     * @param connectionId - Connection ID
     */
    removeOutputConnection(connectionId: string): void;
    /**
     * Gets all input connections
     * @returns Array of input connections
     */
    getInputConnections(): ConnectionInfo[];
    /**
     * Gets all output connections
     * @returns Array of output connections
     */
    getOutputConnections(): ConnectionInfo[];
    /**
     * Validates input data against validation rules
     * @param data - Data to validate
     * @returns Validation result
     */
    protected validateInput(data: any): ValidationResult;
    /**
     * Performs handshake with another module
     * @param targetModule - Target module to handshake with
     * @returns Whether handshake was successful
     */
    handshake(targetModule: BaseModule): Promise<boolean>;
    /**
     * Transfers data to connected modules
     * @param data - Data to transfer
     * @param targetConnectionId - Optional target connection ID
     */
    protected transferData(data: any, targetConnectionId?: string): Promise<void>;
    /**
     * Receives data from connected modules
     * This method should be overridden by subclasses
     * @param dataTransfer - Data transfer information
     */
    receiveData(dataTransfer: DataTransfer): Promise<void>;
    /**
     * Cleans up resources and connections
     */
    destroy(): Promise<void>;
    /**
     * Send a one-way message (fire and forget)
     * @param type - Message type
     * @param payload - Message payload
     * @param target - Target module ID (optional for broadcasts)
     * @param metadata - Additional metadata
     * @param ttl - Time to live in milliseconds
     * @param priority - Message priority (0-9)
     */
    protected sendMessage(type: string, payload: any, target?: string, metadata?: Record<string, any>, ttl?: number, priority?: number): void;
    /**
     * Send a message and wait for response (blocking)
     * @param type - Message type
     * @param payload - Message payload
     * @param target - Target module ID
     * @param timeout - Timeout in milliseconds
     * @param metadata - Additional metadata
     * @param ttl - Time to live in milliseconds
     * @param priority - Message priority (0-9)
     * @returns Promise that resolves to the response
     */
    protected sendRequest(type: string, payload: any, target: string, timeout?: number, metadata?: Record<string, any>, ttl?: number, priority?: number): Promise<MessageResponse>;
    /**
     * Send a message with callback for response (non-blocking)
     * @param type - Message type
     * @param payload - Message payload
     * @param target - Target module ID
     * @param callback - Callback function for response
     * @param timeout - Timeout in milliseconds
     * @param metadata - Additional metadata
     * @param ttl - Time to live in milliseconds
     * @param priority - Message priority (0-9)
     */
    protected sendRequestAsync(type: string, payload: any, target: string, callback: (response: MessageResponse) => void, timeout?: number, metadata?: Record<string, any>, ttl?: number, priority?: number): void;
    /**
     * Broadcast a message to all modules
     * @param type - Message type
     * @param payload - Message payload
     * @param metadata - Additional metadata
     * @param ttl - Time to live in milliseconds
     * @param priority - Message priority (0-9)
     */
    protected broadcastMessage(type: string, payload: any, metadata?: Record<string, any>, ttl?: number, priority?: number): void;
    /**
     * Handle incoming messages
     * This method should be overridden by subclasses
     * @param message - The incoming message
     * @returns Promise that resolves to a response or void
     */
    handleMessage(message: Message): Promise<MessageResponse | void>;
    /**
     * Handle module lifecycle events
     * @param moduleId - The module ID that was registered
     */
    onModuleRegistered(moduleId: string): void;
    /**
     * Handle module lifecycle events
     * @param moduleId - The module ID that was unregistered
     */
    onModuleUnregistered(moduleId: string): void;
    /**
     * Record an I/O operation start
     * @param operationId - Unique identifier for the operation
     * @param input - Input data
     * @param method - Method name that performed the operation
     */
    startIOTracking(operationId: string, input: any, method?: string): void;
    /**
     * Record an I/O operation end
     * @param operationId - Unique identifier for the operation
     * @param output - Output data
     * @param success - Whether the operation was successful
     * @param error - Error message if operation failed
     */
    endIOTracking(operationId: string, output: any, success?: boolean, error?: string): void;
}

export { ActionPriority, ActionStatus, ActionType, AnnotationType, BaseModule, ConditionOperator, ConfigValidator, ConfigValidator as ConfigurationValidation, CycleRecorder, CycleRecorder as CycleRecording, ErrorImpact, ErrorRecorder, ErrorRecorder as ErrorRecording, ErrorRecoverability, ErrorSeverity, ErrorSource, ErrorType, FieldTruncator as FieldTruncation, FieldTruncator, GlobalConfigManager, GlobalConfigManager as GlobalConfiguration, HandlingStatus, LogicalOperator, MessageCenter, PathResolver as PathResolution, PathResolver, PolicyType, RecordingManager, RequestContextManager, RequestContextManager as RequestContextTracking, ResponseActionType, ResponseStatus, RuleType };
export type { Action, AppError, BaseModuleOptions, BaseModuleRecordingConfig, ChainConfigValidationResult, ChainStatus, CircuitBreakerConfig, ConfigChangeCallback, ConfigSyncResult, ConfigUpdateResult, ConnectionInfo, ConsistencyValidationResult, CycleHandle, CycleInfo, CycleRecord, CycleRecordingConfig, DataTransfer, DebugConfig, DebugLevel, DebugLogEntry, ErrorCategory, ErrorClassification, ErrorContext, ErrorFilters, ErrorHandlingConfig, ErrorLevel, ErrorRecord, ErrorRecordData, ErrorRecordingConfig, ErrorRecordingOptions, ErrorResponse, ErrorStatistics, ErrorTrendPoint, FieldTruncationConfig, FieldTruncationRule, FileManagementConfig, GlobalConsistencyResult, GlobalRecordingConfig, HandlingMetrics, HandlingResult, IDebugModule, Message, MessageCenterStats, MessageHandler, MessageResponse, ModuleAnnotation, ModuleErrorStatistics, ModuleInfo, ModuleRecordingConfig, ModuleRegistration, ModuleResponse, ModuleResponseData, ModuleSource, PathPatternRule, RecordingConfigSnapshot, RecordingTemplates, RelatedInfo, RequestContext, RequestContextOptions, ResponseAction, ResponseAnnotation, ResponseData, ResponseHandler, ResponseMetadata, RetryPolicy, RouteCondition, TraceReport, TruncationContext, TruncationReport, TruncationStatistics, ValidatedRecordingConfig, ValidationResult, ValidationRule };
