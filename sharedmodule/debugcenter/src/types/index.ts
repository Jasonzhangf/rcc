// DebugEvent interface is now defined in DebugEventBus.ts to avoid circular imports

/**
 * Debug log levels
 */
export type DebugLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

/**
 * Pipeline operation types
 */
export type PipelineOperationType = 
  | 'pipeline_start'
  | 'pipeline_end'
  | 'module_operation'
  | 'data_transfer'
  | 'session_start'
  | 'session_end';

/**
 * Pipeline position in the overall flow
 */
export type PipelinePosition = 'start' | 'middle' | 'end';

/**
 * Debug log entry
 */
export interface DebugLogEntry {
  timestamp: number;
  level: DebugLevel;
  message: string;
  moduleId?: string;
  method?: string;
  data?: any;
  stack?: string;
}

/**
 * Enhanced pipeline I/O entry for comprehensive operation tracking
 */
export interface PipelineIOEntry {
  timestamp: number;
  pipelineId: string;
  pipelineName?: string;
  moduleId: string;
  operationId: string;
  operationType: PipelineOperationType;
  input?: any;
  output?: any;
  duration?: number;
  success: boolean;
  error?: string;
  method?: string;
  position?: PipelinePosition;
  context?: {
    phase?: string;
    stage?: number;
    previousOperation?: string;
    nextOperation?: string;
    sessionContext?: any;
  };
}

/**
 * Pipeline session information
 */
export interface PipelineSession {
  sessionId: string;
  pipelineId: string;
  pipelineName?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success?: boolean;
  operations: PipelineIOEntry[];
  metadata?: Record<string, any>;
}

/**
 * Debug center configuration
 */
export interface DebugCenterConfig {
  enabled: boolean;
  level: DebugLevel;
  recordStack: boolean;
  maxLogEntries: number;
  consoleOutput: boolean;
  trackDataFlow: boolean;
  enableFileLogging: boolean;
  maxFileSize: number;
  maxLogFiles: number;
  baseDirectory: string;
  pipelineIO: {
    enabled: boolean;
    autoRecordPipelineStart: boolean;
    autoRecordPipelineEnd: boolean;
    pipelineSessionFileName: string;
    pipelineDirectory: string;
    recordAllOperations: boolean;
    includeModuleContext: boolean;
    includeTimestamp: boolean;
    includeDuration: boolean;
    maxPipelineOperationsPerFile: number;
  };
  eventBus: {
    enabled: boolean;
    maxSubscribers: number;
    eventQueueSize: number;
  };
}

/**
 * Recording statistics
 */
export interface RecordingStats {
  totalSessions: number;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageDuration: number;
  lastSessionTime?: number;
  diskUsage: {
    totalSize: number;
    fileCount: number;
  };
}

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'csv' | 'ndjson';

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat;
  includeStats: boolean;
  includeContext: boolean;
  dateRange?: {
    start: number;
    end: number;
  };
  operationTypes?: PipelineOperationType[];
  pipelineIds?: string[];
}