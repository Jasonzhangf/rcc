/**
 * Configuration UI Module Constants
 * Following RCC anti-hardcoding policy - ALL configuration values must be defined here
 */

/**
 * Web server configuration constants
 */
export const CONFIG_UI_WEB_SERVER = {
  DEFAULT_PORT: 3001,
  DEFAULT_HOST: 'localhost',
  DEFAULT_PROTOCOL: 'http' as const,
  STARTUP_TIMEOUT_MS: 10000,
  SHUTDOWN_TIMEOUT_MS: 5000,
  HEARTBEAT_INTERVAL_MS: 30000,
  MAX_CONNECTIONS: 100,
  REQUEST_TIMEOUT_MS: 30000,
  STATIC_FILES_MAX_AGE_MS: 86400000, // 24 hours
  CORS_MAX_AGE_SECONDS: 3600
} as const;

/**
 * API endpoint constants
 */
export const CONFIG_UI_API_ENDPOINTS = {
  BASE_PATH: '/api/v1',
  CONFIGURATION: '/config',
  VALIDATION: '/validate',
  BACKUP: '/backup',
  RESTORE: '/restore',
  THEME: '/theme',
  EXTENSIONS: '/extensions',
  STATUS: '/status',
  HEALTH: '/health'
} as const;

/**
 * WebSocket configuration constants
 */
export const CONFIG_UI_WEBSOCKET = {
  PATH: '/ws',
  HEARTBEAT_INTERVAL_MS: 30000,
  CONNECTION_TIMEOUT_MS: 60000,
  RECONNECT_ATTEMPTS: 3,
  RECONNECT_DELAY_MS: 2000,
  MAX_MESSAGE_SIZE_BYTES: 1048576, // 1MB
  PING_TIMEOUT_MS: 10000
} as const;

/**
 * Authentication and session constants
 */
export const CONFIG_UI_AUTH = {
  SESSION_TIMEOUT_MS: 3600000, // 1 hour
  SESSION_CLEANUP_INTERVAL_MS: 300000, // 5 minutes
  MAX_SESSIONS_PER_USER: 5,
  TOKEN_LENGTH: 32,
  SALT_ROUNDS: 12,
  RATE_LIMIT_WINDOW_MS: 900000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100
} as const;

/**
 * Browser integration constants
 */
export const CONFIG_UI_BROWSER = {
  LAUNCH_DELAY_MS: 2000,
  DEFAULT_BROWSER_PATH: '',
  BROWSER_ARGS: [
    '--no-first-run',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows'
  ],
  OPEN_TIMEOUT_MS: 10000
} as const;

/**
 * File and directory constants
 */
export const CONFIG_UI_PATHS = {
  STATIC_ASSETS_DIR: 'ui/dist',
  TEMPLATES_DIR: 'ui/templates',
  UPLOADS_DIR: 'uploads',
  BACKUPS_DIR: 'backups',
  LOGS_DIR: 'logs/config-ui',
  TEMP_DIR: 'tmp'
} as const;

/**
 * Default UI theme constants
 */
export const CONFIG_UI_DEFAULT_THEME = {
  NAME: 'default',
  COLORS: {
    PRIMARY: '#2563eb',
    SECONDARY: '#64748b',
    BACKGROUND: '#ffffff',
    SURFACE: '#f8fafc',
    ERROR: '#dc2626',
    WARNING: '#d97706',
    INFO: '#2563eb',
    SUCCESS: '#16a34a',
    TEXT: {
      PRIMARY: '#1e293b',
      SECONDARY: '#64748b',
      DISABLED: '#cbd5e1'
    }
  },
  TYPOGRAPHY: {
    FONT_FAMILY: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    FONT_SIZE: {
      XS: '0.75rem',
      SM: '0.875rem',
      MD: '1rem',
      LG: '1.125rem',
      XL: '1.25rem'
    },
    FONT_WEIGHT: {
      LIGHT: 300,
      NORMAL: 400,
      MEDIUM: 500,
      BOLD: 700
    }
  },
  SPACING: {
    XS: '0.25rem',
    SM: '0.5rem',
    MD: '1rem',
    LG: '1.5rem',
    XL: '2rem'
  },
  COMPONENTS: {
    BUTTON: {
      BACKGROUND: '#2563eb',
      BORDER: '1px solid #2563eb',
      BORDER_RADIUS: '0.375rem',
      PADDING: '0.5rem 1rem',
      MARGIN: '0.25rem',
      FONT_SIZE: '0.875rem',
      COLOR: '#ffffff'
    },
    INPUT: {
      BACKGROUND: '#ffffff',
      BORDER: '1px solid #d1d5db',
      BORDER_RADIUS: '0.375rem',
      PADDING: '0.5rem 0.75rem',
      MARGIN: '0.25rem 0',
      FONT_SIZE: '0.875rem',
      COLOR: '#1f2937'
    },
    PANEL: {
      BACKGROUND: '#ffffff',
      BORDER: '1px solid #e5e7eb',
      BORDER_RADIUS: '0.5rem',
      PADDING: '1rem',
      MARGIN: '0.5rem',
      FONT_SIZE: '0.875rem',
      COLOR: '#1f2937'
    },
    MODAL: {
      BACKGROUND: '#ffffff',
      BORDER: 'none',
      BORDER_RADIUS: '0.5rem',
      PADDING: '1.5rem',
      MARGIN: '0',
      FONT_SIZE: '0.875rem',
      COLOR: '#1f2937'
    }
  }
} as const;

/**
 * Validation and error constants
 */
export const CONFIG_UI_VALIDATION = {
  MAX_CONFIG_SIZE_BYTES: 10485760, // 10MB
  MAX_BACKUP_SIZE_BYTES: 52428800, // 50MB
  MAX_UPLOAD_SIZE_BYTES: 5242880, // 5MB
  ALLOWED_FILE_EXTENSIONS: ['.json', '.yaml', '.yml', '.toml'],
  CONFIG_SCHEMA_VERSION: '1.0.0',
  VALIDATION_TIMEOUT_MS: 5000
} as const;

/**
 * Performance and monitoring constants
 */
export const CONFIG_UI_PERFORMANCE = {
  REQUEST_LOG_SAMPLE_RATE: 0.1, // 10% of requests
  MEMORY_CHECK_INTERVAL_MS: 60000, // 1 minute
  MAX_MEMORY_USAGE_MB: 500,
  GC_THRESHOLD_MB: 400,
  METRICS_COLLECTION_INTERVAL_MS: 30000, // 30 seconds
  MAX_LOG_FILE_SIZE_MB: 100,
  LOG_ROTATION_INTERVAL_MS: 86400000 // 24 hours
} as const;

/**
 * Error messages constants
 */
export const CONFIG_UI_ERROR_MESSAGES = {
  SERVER_START_FAILED: 'Failed to start web server',
  SERVER_STOP_FAILED: 'Failed to stop web server',
  INVALID_PORT: 'Invalid port number provided',
  PORT_IN_USE: 'Port is already in use',
  BROWSER_LAUNCH_FAILED: 'Failed to launch browser',
  INVALID_SESSION: 'Invalid or expired session',
  UNAUTHORIZED: 'Unauthorized access',
  CONFIGURATION_LOAD_FAILED: 'Failed to load configuration',
  CONFIGURATION_SAVE_FAILED: 'Failed to save configuration',
  VALIDATION_FAILED: 'Configuration validation failed',
  BACKUP_CREATE_FAILED: 'Failed to create backup',
  BACKUP_RESTORE_FAILED: 'Failed to restore from backup',
  WEBSOCKET_CONNECTION_FAILED: 'WebSocket connection failed',
  FILE_UPLOAD_FAILED: 'File upload failed',
  THEME_LOAD_FAILED: 'Failed to load theme',
  EXTENSION_REGISTER_FAILED: 'Failed to register UI extension'
} as const;

/**
 * Module information constants
 */
export const CONFIG_UI_MODULE_INFO = {
  ID: 'config-ui-module',
  NAME: 'Configuration UI Module',
  VERSION: '1.0.0',
  DESCRIPTION: 'Web-based configuration management interface with React frontend',
  TYPE: 'ui',
  AUTHOR: 'RCC Framework',
  LICENSE: 'MIT'
} as const;

/**
 * Development and debugging constants
 */
export const CONFIG_UI_DEBUG = {
  ENABLE_REQUEST_LOGGING: false,
  ENABLE_PERFORMANCE_MONITORING: true,
  ENABLE_WEBSOCKET_DEBUGGING: false,
  LOG_LEVEL: 'info' as 'debug' | 'info' | 'warn' | 'error',
  PRETTY_PRINT_JSON: true,
  STACK_TRACE_LIMIT: 10
} as const;