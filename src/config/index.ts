/**
 * Unified Configuration Management System
 * 统一配置管理系统
 */

// Types
export * from '../types/config.js';

// Core Components
export {
  UnifiedConfigManager,
  FileConfigProvider,
  EnvironmentConfigProvider,
  ConfigManagerFactory,
} from './UnifiedConfigManager.js';

export { ConfigValidator } from './ConfigValidator.js';

// ConfigMigrator removed as it was unused

// Utility exports
export { CONFIG_FILE_NAMES, CONFIG_SEARCH_PATHS, unifiedConfigSchema } from '../types/config.js';

// Type exports
export type {
  UnifiedConfig,
  ConfigProvider,
  ConfigChangeEvent,
  ConfigValidationResult,
  ConfigSource,
  UnifiedConfigType,
} from '../types/config.js';

// ConfigMigrator types removed as they were unused

// Convenience factory functions
export function createConfigManager(
  configPath?: string,
  watchMode = false,
  instanceId = 'default'
): UnifiedConfigManager {
  return ConfigManagerFactory.create(configPath, watchMode, instanceId);
}

export function createValidator(): ConfigValidator {
  return new ConfigValidator();
}

// createMigrator removed as ConfigMigrator was unused
