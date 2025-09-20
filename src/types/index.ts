/**
 * Type definitions for RCC TypeScript CLI
 * Comprehensive type safety for all components
 */

/**
 * Package.json structure
 */
export interface PackageJson {
  name: string;
  version: string;
  description?: string;
  bin?: Record<string, string>;
  dependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  main?: string;
  type?: string;
}

/**
 * Provider configuration types
 */
export interface ProviderAuth {
  type: string;
  keys?: string[];
  [key: string]: any;
}

export interface ProviderConfig {
  type: string;
  endpoint: string;
  models: Record<string, any>;
  auth?: ProviderAuth;
  [key: string]: any;
}

/**
 * Virtual model target configuration
 */
export interface VirtualModelTarget {
  providerId: string;
  modelId: string;
  keyIndex?: number;
  [key: string]: any;
}

export interface VirtualModelConfig {
  id: string;
  name?: string;
  enabled: boolean;
  targets: VirtualModelTarget[];
  capabilities?: string[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  provider?: string;
  endpoint?: string;
  model?: string;
  routingRules?: any[];
  [key: string]: any;
}

/**
 * Pipeline system configuration
 */
export interface PipelineConfig {
  // Add pipeline-specific configuration
  [key: string]: any;
}

/**
 * Main RCC configuration structure
 */
export interface RccConfig {
  port?: number;
  server?: {
    port?: number;
    host?: string;
    [key: string]: any;
  };
  providers: Record<string, ProviderConfig>;
  virtualModels: Record<string, VirtualModelConfig>;
  pipeline: PipelineConfig;
  debugging?: {
    enabled?: boolean;
    outputDirectory?: string;
    includeTimestamp?: boolean;
    maxEntriesPerFile?: number;
  };
  monitoring?: {
    enabled?: boolean;
    detailedMetrics?: boolean;
    requestTracing?: boolean;
    performanceMonitoring?: boolean;
  };
  [key: string]: any;
}

/**
 * Async operation result with error handling
 */
export interface AsyncResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  message?: string;
}

/**
 * Common error interface
 */
export interface RccError {
  code?: string;
  message: string;
  details?: any;
  stack?: string;
}

/**
 * Debug efforts with enhanced type safety
 */
export interface DebugLogEntry {
  sessionId: string;
  moduleId: string;
  operationId: string;
  timestamp: number;
  type: 'start' | 'data' | 'end' | 'error' | 'warning';
  position: 'start' | 'middle' | 'end';
  data: {
    input?: any;
    output?: any;
    error?: RccError;
    meta?: Record<string, any>;
  };
}

export interface DebugOptions {
  enabled?: boolean;
  level?: 'debug' | 'info' | 'warn' | 'error';
  trackDataFlow?: boolean;
  baseDirectory?: string;
  enableFileLogging?: boolean;
  maxFileSize?: number;
  maxLogFiles?: number;
}

/**
 * Server module types (placeholders - actual types should be imported from modules)
 */
export interface ServerModuleConfig {
  port: number;
  host: string;
  cors: {
    origin: string;
    credentials: boolean;
  };
  compression: boolean;
  helmet: boolean;
  rateLimit: {
    windowMs: number;
    max: number;
  };
  timeout: number;
  bodyLimit: string;
  enableVirtualModels: boolean;
  enablePipeline: boolean;
  debug: DebugOptions;
  monitoring: {
    enabled: boolean;
    detailedMetrics: boolean;
    requestTracing: boolean;
    performanceMonitoring: boolean;
  };
  parsedConfig: {
    providers: Record<string, ProviderConfig>;
    virtualModels: Record<string, VirtualModelConfig>;
    pipeline: PipelineConfig;
  };
  basePath: string;
  enableTwoPhaseDebug: boolean;
}

export interface BaseModuleModule {
  BaseModule: any;
  [key: string]: any;
}

export interface ServerModuleModule {
  new (): any;
  configure: (config: ServerModuleConfig) => Promise<void>;
  initialize: () => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  setVirtualModelSchedulerManager?: (manager: any) => void;
  registerVirtualModel?: (config: VirtualModelConfig) => Promise<void>;
  setDebugConfig?: (config: DebugOptions) => void;
  enableTwoPhaseDebug?: (enabled: boolean, baseDir: string, options: any) => void;
  pipelineTracker?: any;
  debugCenter?: any;
  debugCenterSessionId?: string;
}

export interface DebugCenterModule {
  new (options: { outputDirectory: string; enableRealTimeUpdates?: boolean }): {
    destroy: () => Promise<void>;
    getStats?: () => any;
    exportData?: (options: any) => any;
  };
}

export interface PipelineModule {
  Pipeline: any;
  VirtualModelSchedulerManager: {
    new (
      pools: Map<any, any>,
      config: any,
      tracker: any
    ): {
      getVirtualModelMappings: () => any[];
    };
  };
  PipelineAssembler: {
    new (
      config: any,
      tracker: any
    ): {
      assemblePipelines: (configs: any[]) => Promise<any>;
    };
  };
  PipelineTracker: {
    new (options: any): {
      initialize: () => Promise<void>;
    };
  };
}

/**
 * Dynamic import result with type safety
 */
export interface DynamicImportResult<T = any> {
  success: boolean;
  module?: T;
  error?: Error;
}

/**
 * Import validation function
 */
export type ImportValidator<T> = (module: T) => boolean;

/**
 * Safe JSON parsing options
 */
export interface SafeJsonOptions {
  required?: boolean;
  schema?: any; // JSON Schema object
  defaultValue?: any;
  reviver?: (key: string, value: any) => any;
  maxDepth?: number;
  fallback?: () => any;
}

/**
 * CLI command options
 */
export interface StartOptions {
  port: string;
  config?: string;
  debug?: string;
  enableTwoPhaseDebug?: boolean;
  enableAutoRestart?: boolean;
  autoRestartAttempts?: string;
  enablePipelineTracking?: boolean;
  verbose?: boolean;
}

export interface StopOptions {
  port?: string;
  force?: boolean;
  verbose?: boolean;
}

export interface CodeOptions {
  port?: string;
  config?: string;
  verbose?: boolean;
}

/**
 * Server startup statistics
 */
export interface StartupStats {
  timestamp: number;
  port: number;
  configPath: string;
  debugPath: string;
  providersCount: number;
  virtualModelsCount: number;
  serverStartTime: number;
  pipelineInitTime?: number;
  debugInitTime?: number;
  totalDuration: number;
}

/**
 * Module loader result
 */
export interface ModuleLoadResult {
  found: boolean;
  module?: any;
  error?: Error;
  buildRequired?: boolean;
}

/**
 * Port availability check result
 */
export interface PortCheckResult {
  available: boolean;
  processes: string[];
  signature?: string;
}

/**
 * Process information
 */
export interface ProcessInfo {
  pid: string;
  name?: string;
  port?: number;
  startTime?: number;
}

declare global {
  namespace NodeJS {
    interface Global {
      debugCenter?: any;
      systemStartSessionId?: string;
      __DEV__?: boolean;
      rccConfig?: RccConfig;
    }
  }
}

export {};
