// Export all recording system interfaces
export * from '../interfaces/Recording';

// Export recording system components
export { RecordingManager } from './RecordingManager';
export { CycleRecorder } from './CycleRecorder';
export { ErrorRecorder } from './ErrorRecorder';
export { FieldTruncator } from './FieldTruncator';
export { RequestContextManager } from './RequestContextManager';
export { GlobalConfigManager } from './GlobalConfigManager';
export { ConfigValidator } from './ConfigValidator';
export { PathResolver } from './PathResolver';

// Import for re-export
import { RecordingManager } from './RecordingManager';
import { CycleRecorder } from './CycleRecorder';
import { ErrorRecorder } from './ErrorRecorder';
import { FieldTruncator } from './FieldTruncator';
import { RequestContextManager } from './RequestContextManager';
import { GlobalConfigManager } from './GlobalConfigManager';
import { ConfigValidator } from './ConfigValidator';
import { PathResolver } from './PathResolver';

// Export recording system types
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
} from '../interfaces/Recording';

// Export recording system utilities
export {
  RecordingManager as default,
  CycleRecorder as CycleRecording,
  ErrorRecorder as ErrorRecording,
  FieldTruncator as FieldTruncation,
  RequestContextManager as RequestContextTracking,
  GlobalConfigManager as GlobalConfiguration,
  ConfigValidator as ConfigurationValidation,
  PathResolver as PathResolution
};