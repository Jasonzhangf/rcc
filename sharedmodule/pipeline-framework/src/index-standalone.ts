/**
 * Standalone Debug Logging Module
 * 独立调试日志模块
 *
 * This is a complete standalone implementation that doesn't rely on relative imports.
 * 这是一个完整的独立实现，不依赖相对导入。
 */

// Types
export interface DebugConfig {
  enabled: boolean;
  baseDirectory: string;
  paths: {
    requests: string;
    responses: string;
    errors: string;
    pipeline: string;
    system: string;
  };
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'silent';
  contentFiltering: {
    enabled: boolean;
    sensitiveFields: string[];
  };
  maxLogFiles: number;
  maxLogSize: string;
}

export interface RequestContext {
  requestId: string;
  pipelineId: string;
  startTime: number;
  provider: string;
  operation: string;
  metadata?: any;
  getRequestId: () => string;
  getPipelineId: () => string;
  getStartTime: () => number;
  getProvider: () => string;
  getOperation: () => string;
  getMetadata: () => any;
}

export interface LogEntry {
  type: 'success' | 'error' | 'info' | 'warn' | 'debug';
  requestId: string;
  provider: string;
  operation: string;
  timestamp: number;
  request?: any;
  response?: any;
  error?: any;
  message?: string;
  duration?: number;
  data?: any;
}

export interface DebugStatistics {
  systemHealth: {
    status: 'healthy' | 'warning' | 'error';
    lastCheck: number;
    issues: string[];
  };
  systemLogStats: {
    totalLogs: number;
    successCount: number;
    errorCount: number;
    lastActivity: number;
  };
  activeRequests: RequestContext[];
  performanceMetrics: {
    averageResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
  };
}

// Default configuration
export const DEFAULT_DEBUG_CONFIG: DebugConfig = {
  enabled: false,
  baseDirectory: './debug-logs',
  paths: {
    requests: 'requests',
    responses: 'responses',
    errors: 'errors',
    pipeline: 'pipeline',
    system: 'system'
  },
  logLevel: 'info',
  contentFiltering: {
    enabled: true,
    sensitiveFields: ['apiKey', 'password', 'token', 'secret', 'key']
  },
  maxLogFiles: 1000,
  maxLogSize: '100MB'
};

// Simple Debug Log Manager Implementation
export class SimpleDebugLogManager {
  private config: DebugConfig;
  private logs: LogEntry[] = [];
  private activeRequests: Map<string, RequestContext> = new Map();
  private fileSystem: any;
  private path: any;

  constructor(config: Partial<DebugConfig> = {}) {
    this.config = { ...DEFAULT_DEBUG_CONFIG, ...config };

    try {
      this.fileSystem = require('fs');
      this.path = require('path');
    } catch (error) {
      console.warn('FileSystem not available, logging to memory only');
    }
  }

  startRequest(provider: string, operation: string, metadata?: any): RequestContext {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const pipelineId = `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    const context: RequestContext = {
      requestId,
      pipelineId,
      startTime,
      provider,
      operation,
      metadata,
      getRequestId: () => requestId,
      getPipelineId: () => pipelineId,
      getStartTime: () => startTime,
      getProvider: () => provider,
      getOperation: () => operation,
      getMetadata: () => metadata
    };

    this.activeRequests.set(requestId, context);

    if (this.config.enabled && this.config.logLevel === 'debug') {
      this.logDebug(`Request started: ${provider}.${operation}`, { requestId, metadata });
    }

    return context;
  }

  async logSuccess(context: RequestContext, request: any, response: any): Promise<void> {
    if (!this.config.enabled) return;

    const duration = Date.now() - context.getStartTime();
    const entry: LogEntry = {
      type: 'success',
      requestId: context.getRequestId(),
      provider: context.getProvider(),
      operation: context.getOperation(),
      timestamp: Date.now(),
      request: this.filterContent(request),
      response: this.filterContent(response),
      duration
    };

    await this.writeLogEntry(entry);
    this.logs.push(entry);
    this.activeRequests.delete(context.getRequestId());

    if (this.config.logLevel !== 'silent') {
      console.log(`[${context.getRequestId()}] Request completed successfully`);
    }
  }

  async logError(context: RequestContext, request: any, error: any): Promise<void> {
    if (!this.config.enabled) return;

    const duration = Date.now() - context.getStartTime();
    const entry: LogEntry = {
      type: 'error',
      requestId: context.getRequestId(),
      provider: context.getProvider(),
      operation: context.getOperation(),
      timestamp: Date.now(),
      request: this.filterContent(request),
      error: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Error'
      },
      duration
    };

    await this.writeLogEntry(entry, this.config.paths.errors);
    this.logs.push(entry);
    this.activeRequests.delete(context.getRequestId());

    if (this.config.logLevel !== 'silent') {
      console.error(`[${context.getRequestId()}] Request failed: ${error.message}`);
    }
  }

  async info(message: string, data?: any): Promise<void> {
    if (!this.config.enabled || this.config.logLevel === 'silent') return;

    const entry: LogEntry = {
      type: 'info',
      requestId: 'system',
      provider: 'system',
      operation: 'info',
      timestamp: Date.now(),
      message,
      data: this.filterContent(data)
    };

    await this.writeLogEntry(entry);
    this.logs.push(entry);

    if (this.config.logLevel === 'debug' || this.config.logLevel === 'info') {
      console.log(`[INFO] ${message}`, data || '');
    }
  }

  async warn(message: string, data?: any): Promise<void> {
    if (!this.config.enabled || this.config.logLevel === 'silent' || this.config.logLevel === 'error') return;

    const entry: LogEntry = {
      type: 'warn',
      requestId: 'system',
      provider: 'system',
      operation: 'warn',
      timestamp: Date.now(),
      message,
      data: this.filterContent(data)
    };

    await this.writeLogEntry(entry);
    this.logs.push(entry);

    if (this.config.logLevel === 'debug' || this.config.logLevel === 'info' || this.config.logLevel === 'warn') {
      console.warn(`[WARN] ${message}`, data || '');
    }
  }

  async error(message: string, data?: any): Promise<void> {
    if (!this.config.enabled || this.config.logLevel === 'silent') return;

    const entry: LogEntry = {
      type: 'error',
      requestId: 'system',
      provider: 'system',
      operation: 'error',
      timestamp: Date.now(),
      message,
      data: this.filterContent(data)
    };

    await this.writeLogEntry(entry, this.config.paths.errors);
    this.logs.push(entry);

    console.error(`[ERROR] ${message}`, data || '');
  }

  async logDebug(message: string, data?: any): Promise<void> {
    if (!this.config.enabled || this.config.logLevel !== 'debug') return;

    const entry: LogEntry = {
      type: 'debug',
      requestId: 'system',
      provider: 'system',
      operation: 'debug',
      timestamp: Date.now(),
      message,
      data: this.filterContent(data)
    };

    await this.writeLogEntry(entry);
    this.logs.push(entry);

    console.log(`[DEBUG] ${message}`, data || '');
  }

  async getDebugStatistics(): Promise<DebugStatistics> {
    const totalLogs = this.logs.length;
    const successCount = this.logs.filter(log => log.type === 'success').length;
    const errorCount = this.logs.filter(log => log.type === 'error').length;

    const responseTimes = this.logs
      .filter(log => log.duration !== undefined)
      .map(log => log.duration!);

    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    return {
      systemHealth: {
        status: 'healthy',
        lastCheck: Date.now(),
        issues: []
      },
      systemLogStats: {
        totalLogs,
        successCount,
        errorCount,
        lastActivity: this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : Date.now()
      },
      activeRequests: Array.from(this.activeRequests.values()),
      performanceMetrics: {
        averageResponseTime,
        maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
        minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0
      }
    };
  }

  async destroy(): Promise<void> {
    // Clean up resources
    this.activeRequests.clear();
    this.logs = [];

    if (this.config.enabled) {
      await this.info('Debug logging manager destroyed');
    }
  }

  private async writeLogEntry(entry: LogEntry, subdirectory?: string): Promise<void> {
    if (!this.fileSystem || !this.path) {
      // Memory-only mode
      return;
    }

    try {
      const timestamp = new Date(entry.timestamp);
      const dateStr = timestamp.toISOString().split('T')[0];
      const timeStr = timestamp.toTimeString().split(' ')[0].replace(/:/g, '-');
      const randomId = Math.random().toString(36).substr(2, 6);

      const filename = `debug-${entry.timestamp}-${randomId}.json`;
      const subdir = subdirectory || this.config.paths.system;
      const dirPath = this.path.join(this.config.baseDirectory, subdir, dateStr);
      const filePath = this.path.join(dirPath, filename);

      // Ensure directory exists
      if (!this.fileSystem.existsSync(dirPath)) {
        this.fileSystem.mkdirSync(dirPath, { recursive: true });
      }

      // Write log file
      this.fileSystem.writeFileSync(filePath, JSON.stringify(entry, null, 2));

      if (this.config.logLevel === 'debug') {
        console.log(`📝 Log written to: ${filePath}`);
      }
    } catch (error) {
      console.warn('Failed to write log file:', error instanceof Error ? error.message : String(error));
    }
  }

  private filterContent(obj: any): any {
    if (!this.config.contentFiltering.enabled || !obj) {
      return obj;
    }

    const filtered = JSON.parse(JSON.stringify(obj));
    const filterRecursive = (current: any) => {
      if (typeof current === 'object' && current !== null) {
        for (const key in current) {
          if (this.config.contentFiltering.sensitiveFields.some(field =>
            key.toLowerCase().includes(field.toLowerCase())
          )) {
            current[key] = '[REDACTED]';
          } else if (typeof current[key] === 'object') {
            filterRecursive(current[key]);
          }
        }
      }
    };

    filterRecursive(filtered);
    return filtered;
  }
}

// Provider interfaces
export interface ProviderConfig {
  name: string;
  endpoint: string;
  supportedModels?: string[];
  defaultModel?: string;
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
  debug?: Partial<DebugConfig>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatResponse {
  content: string;
  model: string;
  totalTokens: number;
}

// Default export
export default {
  SimpleDebugLogManager,
  DEFAULT_DEBUG_CONFIG
};