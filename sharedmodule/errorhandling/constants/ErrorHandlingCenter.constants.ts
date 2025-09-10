export const ERROR_HANDLING_CENTER_VERSION = '1.0.0';
export const ERROR_HANDLING_CENTER_NAME = 'ErrorHandlingCenter';

// Queue configuration
export const DEFAULT_QUEUE_SIZE = 1000;
export const MAX_QUEUE_SIZE = 10000;
export const QUEUE_FLUSH_INTERVAL = 5000; // 5 seconds

// Error handling modes
export const ERROR_HANDLING_MODES = {
  BLOCKING: 'blocking',
  NON_BLOCKING: 'non-blocking',
  BATCH: 'batch'
} as const;

// Error severity levels
export const ERROR_SEVERITY_LEVELS = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
} as const;

// Error types
export const ERROR_TYPES = {
  BUSINESS: 'business',
  TECHNICAL: 'technical',
  CONFIGURATION: 'configuration',
  RESOURCE: 'resource',
  NETWORK: 'network',
  DEPENDENCY: 'dependency'
} as const;

// Error sources
export const ERROR_SOURCES = {
  MODULE: 'module',
  SYSTEM: 'system',
  EXTERNAL: 'external',
  UNKNOWN: 'unknown'
} as const;

// Response types
export const RESPONSE_TYPES = {
  IGNORE: 'ignore',
  LOG: 'log',
  RETRY: 'retry',
  FALLBACK: 'fallback',
  CIRCUIT_BREAK: 'circuit_break',
  NOTIFICATION: 'notification'
} as const;

// Default configuration
export const DEFAULT_ERROR_HANDLING_CONFIG = {
  queueSize: DEFAULT_QUEUE_SIZE,
  flushInterval: QUEUE_FLUSH_INTERVAL,
  enableBatchProcessing: true,
  maxBatchSize: 100,
  enableCompression: true,
  enableMetrics: true,
  enableLogging: true,
  logLevel: 'info',
  retryPolicy: {
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 2,
    maxRetryDelay: 30000
  },
  circuitBreaker: {
    failureThreshold: 5,
    recoveryTime: 60000,
    requestVolumeThreshold: 20
  }
};

// Export constants object for convenience
export const ERROR_HANDLING_CENTER_CONSTANTS = {
  VERSION: ERROR_HANDLING_CENTER_VERSION,
  NAME: ERROR_HANDLING_CENTER_NAME,
  DEFAULT_QUEUE_SIZE,
  MAX_QUEUE_SIZE,
  QUEUE_FLUSH_INTERVAL,
  ERROR_HANDLING_MODES,
  ERROR_SEVERITY_LEVELS,
  ERROR_TYPES,
  ERROR_SOURCES,
  RESPONSE_TYPES,
  DEFAULT_ERROR_HANDLING_CONFIG
};