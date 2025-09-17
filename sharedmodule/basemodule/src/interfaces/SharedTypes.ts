// Shared type definitions to avoid circular dependencies

// Error type alias for consistency
export type AppError = Error;

export interface ModuleSource {
  moduleId: string;
  moduleName: string;
  version: string;
  fileName?: string;
  lineNumber?: number;
  stackTrace?: string;
}

export interface ErrorClassification {
  source: ErrorSource;
  type: ErrorType;
  severity: ErrorSeverity;
  impact: ErrorImpact;
  recoverability: ErrorRecoverability;
}

export interface ErrorHandlingConfig {
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

export interface RetryPolicy {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  maxRetryDelay: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTime: number;
  requestVolumeThreshold: number;
}

export interface HandlingResult {
  status: HandlingStatus;
  message: string;
  details: string;
  code: string;
  metrics?: HandlingMetrics;
}

export interface HandlingMetrics {
  retryCount: number;
  processingStartTime: number;
  processingEndTime: number;
  memoryUsage: number;
  cpuUsage?: number;
  networkCalls?: number;
}

export interface ResponseData {
  moduleName: string;
  moduleId: string;
  response: any;
  config: ErrorHandlingConfig;
  metadata: Record<string, any>;
}

export interface RelatedInfo {
  errorId?: string;
  moduleIds?: string[];
  componentIds?: string[];
  dependencies?: string[];
  customFields?: Record<string, any>;
}

export interface ErrorContext {
  errorId: string;
  error: AppError;
  timestamp: Date;
  source: ModuleSource;
  classification: ErrorClassification;
  data: Record<string, any>;
  config: ErrorHandlingConfig;
  callback?: (response: ErrorResponse) => void;
}

export interface ErrorResponse {
  responseId: string;
  errorId: string;
  result: HandlingResult;
  timestamp: Date;
  processingTime: number;
  data: ResponseData;
  actions: Action[];
  annotations: ModuleAnnotation[];
}

export interface ModuleResponse {
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

export interface ModuleResponseData {
  message: string;
  details?: string;
  result?: any;
  error?: any;
  config?: Record<string, any>;
  context?: Record<string, any>;
}

export interface ResponseAction {
  actionId: string;
  type: ResponseActionType;
  description: string;
  parameters: Record<string, any>;
  priority: ActionPriority;
  status: ResponseStatus;
  executionTime: number;
  timestamp: Date;
}

export interface ResponseAnnotation {
  annotationId: string;
  type: AnnotationType;
  content: string;
  timestamp: Date;
  moduleRef: string;
  context?: Record<string, any>;
}

export interface ResponseMetadata {
  processingTime: number;
  retryCount: number;
  attempts: number;
  memoryUsed: number;
  cpuUsed?: number;
  version: string;
  environment: string;
}

export interface Action {
  actionId: string;
  type: ActionType;
  target: string;
  payload: Record<string, any>;
  priority: ActionPriority;
  status: ActionStatus;
  timestamp: Date;
}

export interface ModuleRegistration {
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

export interface ResponseHandler {
  handleId: string;
  name: string;
  priority: number;
  isEnabled: boolean;
  conditions: RouteCondition[];
  execute: (context: ErrorContext) => Promise<ErrorResponse>;
  config?: Record<string, any>;
}

export interface RouteCondition {
  moduleIds?: string[];
  errorTypes?: ErrorType[];
  severities?: ErrorSeverity[];
  priorities?: ActionPriority[];
  custom?: Record<string, any>;
}

export interface ModuleAnnotation {
  annotationId: string;
  moduleInfo: any; // Using any to avoid circular dependency
  type: AnnotationType;
  content: string;
  createdAt: Date;
  createdBy: string;
  related: RelatedInfo;
}

// Enums
export enum ErrorSource {
  MODULE = 'module',
  SYSTEM = 'system',
  EXTERNAL = 'external',
  NETWORK = 'network',
  UNKNOWN = 'unknown',
}

export enum ErrorType {
  BUSINESS = 'business',
  TECHNICAL = 'technical',
  CONFIGURATION = 'configuration',
  RESOURCE = 'resource',
  DEPENDENCY = 'dependency',
}

export enum ErrorSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum ErrorImpact {
  SINGLE_MODULE = 'single_module',
  MULTIPLE_MODULE = 'multiple_module',
  SYSTEM_WIDE = 'system_wide',
}

export enum ErrorRecoverability {
  RECOVERABLE = 'recoverable',
  NON_RECOVERABLE = 'non_recoverable',
  AUTO_RECOVERABLE = 'auto_recoverable',
}

export enum ResponseStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SUCCESS = 'success',
  FAILURE = 'failure',
  RETRY = 'retry',
  FALLENBACK = 'fallback',
  CANCELLED = 'cancelled',
}

export enum ResponseActionType {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  LOG = 'log',
  NOTIFY = 'notify',
  ISOLATE = 'isolate',
  RESTART = 'restart',
  CUSTOM = 'custom',
}

// ResponsePriority removed - use ActionPriority instead

export enum PolicyType {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  ISOLATION = 'isolation',
  NOTIFICATION = 'notification',
  CUSTOM = 'custom',
}

export enum RuleType {
  ROUTING = 'routing',
  FILTERING = 'filtering',
  TRANSFORMATION = 'transformation',
  CUSTOM = 'custom',
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  IN = 'in',
  NOT_IN = 'not_in',
  REGEX = 'regex',
  CUSTOM = 'custom',
}

export enum LogicalOperator {
  AND = 'and',
  OR = 'or',
}

export enum ActionType {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  LOG = 'log',
  NOTIFY = 'notify',
  ISOLATE = 'isolate',
  RESTART = 'restart',
  CUSTOM = 'custom',
}

export enum AnnotationType {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  DEBUG = 'debug',
  CUSTOM = 'custom',
}

export enum HandlingStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PARTIAL = 'partial',
  RETRY = 'retry',
  FALLENBACK = 'fallback',
}

export enum ActionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum ActionPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

// Re-export ModuleInfo at the end to avoid circular dependencies
export type { ModuleInfo } from './ModuleInfo';
