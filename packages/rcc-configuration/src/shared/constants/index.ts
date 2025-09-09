/**
 * Shared Constants Export Module
 * 
 * Global constants used across the configuration package.
 */

// Package information
export const PACKAGE_INFO = {
  NAME: '@rcc/configuration',
  VERSION: '0.1.0',
  DESCRIPTION: 'RCC Configuration Management Package'
} as const;

// Default configuration paths
export const DEFAULT_PATHS = {
  CONFIG_DIR: '.rcc',
  CONFIG_FILE: 'config.json',
  BACKUP_DIR: 'backups',
  LOGS_DIR: 'logs',
  TEMP_DIR: 'temp'
} as const;

// File size limits
export const FILE_LIMITS = {
  MAX_CONFIG_SIZE_MB: 50,
  MAX_BACKUP_SIZE_MB: 100,
  MAX_LOG_SIZE_MB: 10,
  MAX_IMPORT_SIZE_MB: 100
} as const;

// Timeout values (in milliseconds)
export const TIMEOUTS = {
  DEFAULT_REQUEST_TIMEOUT_MS: 30000,
  DEFAULT_CONNECTION_TIMEOUT_MS: 10000,
  DEFAULT_RETRY_TIMEOUT_MS: 5000,
  MAX_OPERATION_TIMEOUT_MS: 300000, // 5 minutes
  HEALTH_CHECK_TIMEOUT_MS: 10000
} as const;

// Retry configurations
export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY_MS: 1000,
  MAX_DELAY_MS: 10000,
  BACKOFF_FACTOR: 2
} as const;

// Validation rules
export const VALIDATION_RULES = {
  MIN_ID_LENGTH: 1,
  MAX_ID_LENGTH: 100,
  MIN_NAME_LENGTH: 1,
  MAX_NAME_LENGTH: 200,
  MIN_DESCRIPTION_LENGTH: 0,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_URL_LENGTH: 2000,
  MIN_CONTEXT_LENGTH: 1000,
  MAX_CONTEXT_LENGTH: 2000000,
  MIN_SUCCESS_RATE: 0,
  MAX_SUCCESS_RATE: 1,
  MIN_RESPONSE_TIME_MS: 0,
  MAX_RESPONSE_TIME_MS: 300000
} as const;

// Status values
export const STATUS_VALUES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  TESTING: 'testing',
  VERIFIED: 'verified',
  FAILED: 'failed',
  ERROR: 'error',
  MAINTENANCE: 'maintenance',
  HEALTHY: 'healthy',
  UNHEALTHY: 'unhealthy',
  UNKNOWN: 'unknown',
  DEGRADED: 'degraded'
} as const;

// Error codes
export const ERROR_CODES = {
  // Configuration errors
  CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND',
  CONFIG_INVALID: 'CONFIG_INVALID',
  CONFIG_READ_ERROR: 'CONFIG_READ_ERROR',
  CONFIG_WRITE_ERROR: 'CONFIG_WRITE_ERROR',
  
  // Provider errors
  PROVIDER_NOT_FOUND: 'PROVIDER_NOT_FOUND',
  PROVIDER_INVALID: 'PROVIDER_INVALID',
  PROVIDER_ALREADY_EXISTS: 'PROVIDER_ALREADY_EXISTS',
  PROVIDER_CONNECTION_FAILED: 'PROVIDER_CONNECTION_FAILED',
  
  // Model errors
  MODEL_NOT_FOUND: 'MODEL_NOT_FOUND',
  MODEL_INVALID: 'MODEL_INVALID',
  MODEL_VERIFICATION_FAILED: 'MODEL_VERIFICATION_FAILED',
  MODEL_TOKEN_DETECTION_FAILED: 'MODEL_TOKEN_DETECTION_FAILED',
  
  // Blacklist errors
  BLACKLIST_ENTRY_NOT_FOUND: 'BLACKLIST_ENTRY_NOT_FOUND',
  BLACKLIST_ENTRY_INVALID: 'BLACKLIST_ENTRY_INVALID',
  BLACKLIST_ALREADY_EXISTS: 'BLACKLIST_ALREADY_EXISTS',
  
  // Pool errors
  POOL_ENTRY_NOT_FOUND: 'POOL_ENTRY_NOT_FOUND',
  POOL_ENTRY_INVALID: 'POOL_ENTRY_INVALID',
  POOL_ALREADY_EXISTS: 'POOL_ALREADY_EXISTS',
  
  // Route errors
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  ROUTE_INVALID: 'ROUTE_INVALID',
  ROUTE_TARGET_NOT_FOUND: 'ROUTE_TARGET_NOT_FOUND',
  ROUTE_TARGET_INVALID: 'ROUTE_TARGET_INVALID',
  
  // Import/Export errors
  IMPORT_FILE_NOT_FOUND: 'IMPORT_FILE_NOT_FOUND',
  IMPORT_VALIDATION_FAILED: 'IMPORT_VALIDATION_FAILED',
  EXPORT_FAILED: 'EXPORT_FAILED',
  
  // System errors
  INITIALIZATION_FAILED: 'INITIALIZATION_FAILED',
  OPERATION_TIMEOUT: 'OPERATION_TIMEOUT',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RESOURCE_EXHAUSTED: 'RESOURCE_EXHAUSTED',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const;

// Log levels
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  TRACE: 'trace'
} as const;

// Health check configuration
export const HEALTH_CHECK = {
  INTERVAL_MS: 60000, // 1 minute
  TIMEOUT_MS: 10000,  // 10 seconds
  FAILURE_THRESHOLD: 3,
  RECOVERY_THRESHOLD: 2,
  RETRY_AFTER_MS: 300000 // 5 minutes
} as const;

// Cache configuration
export const CACHE_CONFIG = {
  DEFAULT_TTL_MS: 300000, // 5 minutes
  MAX_CACHE_SIZE: 1000,
  CLEANUP_INTERVAL_MS: 600000 // 10 minutes
} as const;

// Metrics configuration
export const METRICS_CONFIG = {
  COLLECTION_INTERVAL_MS: 60000, // 1 minute
  RETENTION_DAYS: 30,
  AGGREGATION_INTERVAL_MS: 300000, // 5 minutes
  MAX_METRICS_ENTRIES: 10000
} as const;

// Supported formats
export const SUPPORTED_FORMATS = {
  EXPORT: ['json', 'yaml', 'toml'],
  IMPORT: ['json', 'yaml', 'toml'],
  COMPRESSION: ['gzip', 'none']
} as const;

// Load balancing types
export const LOAD_BALANCING_TYPES = {
  ROUND_ROBIN: 'round_robin',
  WEIGHTED: 'weighted',
  RANDOM: 'random',
  HEALTH_BASED: 'health_based',
  PRIORITY: 'priority',
  LEAST_CONNECTIONS: 'least_connections'
} as const;

// Virtual model categories
export const VIRTUAL_MODEL_CATEGORIES = {
  DEFAULT: 'default',
  CODING: 'coding',
  REASONING: 'reasoning',
  FAST: 'fast',
  ACCURATE: 'accurate',
  VISION: 'vision'
} as const;

// Provider types
export const PROVIDER_TYPES = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  GOOGLE: 'google',
  IFLOW: 'iflow',
  CUSTOM: 'custom'
} as const;

// Model capabilities
export const MODEL_CAPABILITIES = {
  CODE: 'code',
  REASONING: 'reasoning',
  VISION: 'vision',
  FUNCTIONS: 'functions',
  MULTIMODAL: 'multimodal'
} as const;

// Environment variables
export const ENV_VARS = {
  CONFIG_PATH: 'RCC_CONFIG_PATH',
  LOG_LEVEL: 'RCC_LOG_LEVEL',
  ENABLE_DEBUGGING: 'RCC_DEBUG',
  DISABLE_VALIDATION: 'RCC_NO_VALIDATION',
  BACKUP_COUNT: 'RCC_BACKUP_COUNT'
} as const;

// Regular expressions
export const REGEX_PATTERNS = {
  ID: /^[a-zA-Z0-9\-_]+$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+/,
  VERSION: /^\d+\.\d+\.\d+$/,
  FILENAME: /^[a-zA-Z0-9\-_.]+$/
} as const;

// Default values
export const DEFAULTS = {
  BACKUP_COUNT: 5,
  MAX_RETRIES: 3,
  REQUEST_TIMEOUT_MS: 30000,
  HEALTH_CHECK_INTERVAL_MS: 60000,
  LOG_LEVEL: LOG_LEVELS.INFO,
  ENABLE_VALIDATION: true,
  ENABLE_BACKUPS: true,
  ENABLE_METRICS: true,
  CONTEXT_LENGTH: 128000,
  SUCCESS_RATE: 0.95,
  PRIORITY: 1,
  WEIGHT: 1
} as const;

// API configuration
export const API_CONFIG = {
  DEFAULT_PORT: 3000,
  DEFAULT_HOST: 'localhost',
  MAX_REQUEST_SIZE: '10mb',
  CORS_ORIGINS: ['http://localhost:3000', 'http://localhost:3001'],
  RATE_LIMIT_WINDOW_MS: 900000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 1000
} as const;