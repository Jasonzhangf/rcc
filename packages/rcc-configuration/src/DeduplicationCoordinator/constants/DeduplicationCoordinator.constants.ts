export const DEDUPLICATION_COORDINATOR_CONSTANTS = {
  MODULE_NAME: 'DeduplicationCoordinator',
  MODULE_VERSION: '1.0.0',
  DEFAULT_CONFIG: {
    ENABLE_AUTO_DEDUPLICATION: true,
    CHECK_INTERVAL: 300000, // 5 minutes
    CONFLICT_RESOLUTION_STRATEGY: 'prefer_blacklist' as const,
  },
  ERRORS: {
    DEDUPLICATION_FAILED: 'Deduplication process failed',
  },
} as const;