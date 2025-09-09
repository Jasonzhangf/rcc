// Configuration Module Types Index
// Exports all configuration-related types following RCC standards

// Export common types from interfaces
export type { ConfigurationData } from '../interfaces/IConfigurationSystem';
export type { ConfigMetadata } from '../interfaces/IConfigurationSystem';
export type { ValidationError } from '../interfaces/IConfigurationSystem';
export type { ConfigUpdateCallback } from '../interfaces/IConfigurationSystem';
export type { ConfigurationDebugInfo } from '../interfaces/IConfigurationSystem';
export type { SystemHealthStatus } from '../interfaces/IConfigurationSystem';

// Export UI types
export type { WebServerInfo } from '../interfaces/IConfigUIModule';
export type { UIConfigurationRequest } from '../interfaces/IConfigUIModule';
export type { UIConfigurationResponse } from '../interfaces/IConfigUIModule';
export type { UITheme } from '../interfaces/IConfigUIModule';
export type { WebSocketMessage } from '../interfaces/IConfigUIModule';
export type { UISession } from '../interfaces/IConfigUIModule';

// Export validator types
export type { ConfigSchema } from '../interfaces/IConfigValidatorModule';
export type { ValidationOptions } from '../interfaces/IConfigValidatorModule';
export type { EnhancedValidationResult } from '../interfaces/IConfigValidatorModule';

// Export persistence types
export type { PersistenceResult } from '../interfaces/IConfigPersistenceModule';
export type { ConfigurationMetadata } from '../interfaces/IConfigPersistenceModule';
export type { BackupInfo } from '../interfaces/IConfigPersistenceModule';

// Default export
export default {
  // Types are type-only exports, so we can't default export them
  // This default export is just to satisfy the module structure requirement
};