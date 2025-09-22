// Export all core interfaces and types
export * from './interfaces/Connection';
export * from './interfaces/Message';
export * from './interfaces/ModuleInfo';
export * from './interfaces/Validation';
export * from './interfaces/SharedTypes';

// Export debug types (excluding deprecated IDebugModule)
export type { DebugLevel, DebugLogEntry, DebugConfig } from './interfaces/Debug';

// Export all recording system interfaces and components
export * from './interfaces/Recording';
export * from './recording';

// Export MessageCenter (now refactored)
export { MessageCenter } from './MessageCenter';

// Export refactored MessageCenter components
export {
  ModuleRegistry,
  RequestManager,
  MessageProcessor,
  StatisticsTracker,
  TopicSubscriptionManager
} from './messagecenter/index';

// Export BaseModule
export { BaseModule } from './BaseModule';

// DebugEventBus has been moved to rcc-debugcenter package
// Import from 'rcc-debugcenter' instead

// Note: DebugModule types have been moved to rcc-debugcenter package
// Import from 'rcc-debugcenter' instead

// Export enhanced recording types
export type {
  BaseModuleRecordingConfig,
  GlobalRecordingConfig,
  RequestContext,
  CycleHandle,
  ErrorRecord,
  TruncationReport,
  ConfigUpdateResult,
  ConfigSyncResult,
  ConsistencyValidationResult,
  ValidatedRecordingConfig,
  ChainConfigValidationResult,
  GlobalConsistencyResult,
  TraceReport,
  ChainStatus,
  RecordingConfigSnapshot
} from './interfaces/Recording';
