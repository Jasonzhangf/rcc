// Error Handling Center Enum Definitions
export enum ErrorSource {
  MODULE = 'module',
  SYSTEM = 'system',
  EXTERNAL = 'external',
  NETWORK = 'network',
  UNKNOWN = 'unknown'
}

export enum ErrorType {
  BUSINESS = 'business',
  TECHNICAL = 'technical',
  CONFIGURATION = 'configuration',
  RESOURCE = 'resource',
  DEPENDENCY = 'dependency'
}

export enum ErrorSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum ErrorImpact {
  SINGLE_MODULE = 'single_module',
  MULTIPLE_MODULE = 'multiple_module',
  SYSTEM_WIDE = 'system_wide'
}

export enum ErrorRecoverability {
  RECOVERABLE = 'recoverable',
  NON_RECOVERABLE = 'non_recoverable',
  AUTO_RECOVERABLE = 'auto_recoverable'
}

export enum ResponseStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SUCCESS = 'success',
  FAILURE = 'failure',
  RETRY = 'retry',
  FALLENBACK = 'fallback',
  CANCELLED = 'cancelled'
}

export enum ResponseActionType {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  LOG = 'log',
  NOTIFY = 'notify',
  ISOLATE = 'isolate',
  RESTART = 'restart',
  CUSTOM = 'custom'
}

export enum ResponsePriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum PolicyType {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  ISOLATION = 'isolation',
  NOTIFICATION = 'notification',
  CUSTOM = 'custom'
}

export enum RuleType {
  ROUTING = 'routing',
  FILTERING = 'filtering',
  TRANSFORMATION = 'transformation',
  CUSTOM = 'custom'
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
  CUSTOM = 'custom'
}

export enum LogicalOperator {
  AND = 'and',
  OR = 'or'
}

export enum ActionType {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  LOG = 'log',
  NOTIFY = 'notify',
  ISOLATE = 'isolate',
  RESTART = 'restart',
  CUSTOM = 'custom'
}

export enum AnnotationType {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  DEBUG = 'debug',
  CUSTOM = 'custom'
}

export enum HandlingStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PARTIAL = 'partial',
  RETRY = 'retry',
  FALLENBACK = 'fallback'
}