import { ValidationResult } from '../../../interfaces/Validation';

/**
 * Main interface for the Configuration System
 */
export interface IConfigurationSystem {
  // Lifecycle management
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  
  // Configuration operations
  loadConfiguration(configPath?: string): Promise<ConfigurationData>;
  saveConfiguration(config: ConfigurationData): Promise<boolean>;
  validateConfiguration(config: any): Promise<ValidationResult>;
  
  // Real-time updates
  subscribeToUpdates(callback: ConfigUpdateCallback): string;
  unsubscribeFromUpdates(subscriptionId: string): void;
  
  // Debug integration
  getDebugInfo(): ConfigurationDebugInfo;
  enableDebugMode(level: DebugLevel): void;
}

/**
 * Configuration data structure
 */
export interface ConfigurationData {
  raw: any;                    // Original file content
  parsed: any;                 // Parsed JSON5 data
  validated: boolean;          // Validation status
  errors?: ValidationError[];  // Validation errors
  warnings?: string[];         // Warning messages
  metadata: ConfigMetadata;    // Configuration metadata
}

/**
 * Configuration metadata
 */
export interface ConfigMetadata {
  filePath: string;
  fileSize: number;
  lastModified: number;
  version: string;
  environmentVariables: string[];
  loadTime: number;
}

/**
 * Validation error structure
 */
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code?: string;
}

/**
 * Configuration update callback
 */
export type ConfigUpdateCallback = (update: ConfigurationData) => void;

/**
 * Debug information
 */
export interface ConfigurationDebugInfo {
  moduleStates: Map<string, ModuleDebugState>;
  performanceMetrics: PerformanceMetrics;
  recentOperations: DebugOperation[];
  systemHealth: SystemHealthStatus;
}

/**
 * Module debug state
 */
export interface ModuleDebugState {
  moduleId: string;
  status: 'initialized' | 'running' | 'error' | 'stopped';
  connections: ConnectionDebugInfo[];
  lastActivity: number;
  errorCount: number;
}

/**
 * Connection debug information
 */
export interface ConnectionDebugInfo {
  connectionId: string;
  type: 'input' | 'output';
  status: 'connected' | 'disconnected' | 'error';
  dataTransferCount: number;
  lastDataTransfer: number;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  totalOperations: number;
  averageResponseTime: number;
  errorRate: number;
  throughput: number;
  memoryUsage: number;
}

/**
 * Debug operation
 */
export interface DebugOperation {
  id: string;
  moduleId: string;
  operation: string;
  startTime: number;
  endTime?: number;
  status: 'pending' | 'completed' | 'error';
  data?: any;
}

/**
 * System health status
 */
export interface SystemHealthStatus {
  overall: 'healthy' | 'warning' | 'critical';
  modules: Map<string, 'healthy' | 'warning' | 'error'>;
  issues: HealthIssue[];
}

/**
 * Health issue
 */
export interface HealthIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  moduleId?: string;
  timestamp: number;
}

/**
 * Debug level enumeration
 */
export enum DebugLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

/**
 * Configuration section enumeration
 */
export enum ConfigSection {
  PROVIDERS = 'providers',
  ROUTER = 'router',
  TRANSFORMERS = 'transformers',
  STATUS_LINE = 'statusLine',
  GENERAL = 'general'
}