// Export all core interfaces and types
export * from './interfaces/Connection';
export * from './interfaces/Debug';
export * from './interfaces/Message';
export * from './interfaces/ModuleInfo';
export * from './interfaces/Validation';
export * from './interfaces/SharedTypes';

// Export all recording system interfaces and components
export * from './interfaces/Recording';
export * from './recording';

// Export MessageCenter
export { MessageCenter } from './MessageCenter';

// Export BaseModule
export { BaseModule } from './BaseModule';

// Export DebugEventBus (now from debugcenter)
export { DebugEventBus, type DebugEvent } from './debug/DebugEventBus';

// Export all types from BaseModule
export type { DebugLevel, DebugLogEntry, DebugConfig } from './BaseModule';

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
