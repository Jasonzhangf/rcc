/**
 * Qwen Debug Module
 * Records pipeline input/output and provides comprehensive logging functionality
 */

import { ModuleInfo, Message, MessageResponse } from 'rcc-basemodule';
import { BasePipelineModule } from './BasePipelineModule';
import { OpenAIChatRequest, OpenAIChatResponse } from './QwenCompatibilityModule';

/**
 * Debug Configuration
 */
export interface QwenDebugConfig {
  /** Enable debug logging */
  enabled: boolean;
  /** Log file directory */
  logDirectory: string;
  /** Maximum log file size (bytes) */
  maxLogSize: number;
  /** Maximum number of log files to keep */
  maxLogFiles: number;
  /** Log level */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** Enable request/response logging */
  logRequests: boolean;
  /** Enable response logging */
  logResponses: boolean;
  /** Enable error logging */
  logErrors: boolean;
  /** Enable performance metrics */
  logPerformance: boolean;
  /** Enable tool call logging */
  logToolCalls: boolean;
  /** Enable authentication logging */
  logAuth: boolean;
  /** Enable pipeline state logging */
  logPipelineState: boolean;
  /** Enable sensitive data filtering */
  filterSensitiveData: boolean;
  /** Sensitive data patterns to filter */
  sensitivePatterns?: string[];
}

/**
 * Debug Log Entry
 */
export interface DebugLogEntry {
  /** Unique entry ID */
  id: string;
  /** Timestamp */
  timestamp: number;
  /** Log level */
  level: 'debug' | 'info' | 'warn' | 'error';
  /** Module that generated the log */
  module: string;
  /** Log category */
  category: string;
  /** Log message */
  message: string;
  /** Additional data */
  data?: any;
  /** Error information */
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  /** Request/response information */
  requestResponse?: {
    type: 'request' | 'response';
    direction: 'inbound' | 'outbound';
    requestId: string;
    model: string;
    content?: any;
    tools?: any;
    toolCalls?: any;
  };
  /** Performance metrics */
  performance?: {
    duration: number;
    startTime: number;
    endTime: number;
    memoryUsage?: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  /** Authentication information */
  auth?: {
    state: string;
    tokenStatus?: string;
    authMethod?: string;
  };
  /** Pipeline state information */
  pipeline?: {
    stage: string;
    status: string;
    pipelineId: string;
    executionId: string;
  };
}

/**
 * Debug Statistics
 */
export interface DebugStats {
  /** Total log entries */
  totalEntries: number;
  /** Entries by level */
  entriesByLevel: Record<string, number>;
  /** Entries by category */
  entriesByCategory: Record<string, number>;
  /** Entries by module */
  entriesByModule: Record<string, number>;
  /** Total requests logged */
  totalRequests: number;
  /** Total responses logged */
  totalResponses: number;
  /** Total errors logged */
  totalErrors: number;
  /** Average response time */
  averageResponseTime: number;
  /** Memory usage */
  memoryUsage: {
    current: number;
    peak: number;
    average: number;
  };
}

/**
 * Qwen Debug Module
 */
export class QwenDebugModule extends BasePipelineModule {
  protected override config: QwenDebugConfig = {} as QwenDebugConfig;
  
  /** Log entries storage */
  private logEntries: DebugLogEntry[] = [];
  /** Performance metrics */
  private performanceMetrics: Map<string, number[]> = new Map();
  /** Active requests tracking */
  private activeRequests: Map<string, { startTime: number; data: any }> = new Map();
  /** Log file handles */
  private logFileHandles: Map<string, any> = new Map();
  /** Current log file size */
  private currentLogSize: number = 0;
  /** Statistics */
  private stats: DebugStats = {
    totalEntries: 0,
    entriesByLevel: {},
    entriesByCategory: {},
    entriesByModule: {},
    totalRequests: 0,
    totalResponses: 0,
    totalErrors: 0,
    averageResponseTime: 0,
    memoryUsage: {
      current: 0,
      peak: 0,
      average: 0
    }
  };

  constructor(info: ModuleInfo) {
    super(info);
    this.logInfo('QwenDebugModule initialized', { module: this.moduleName }, 'constructor');
  }

  /**
   * Initialize the debug module
   */
  public async initialize(): Promise<void> {
    try {
      this.logInfo('Initializing Qwen debug module', { config: this.config }, 'initialize');
      
      // Validate configuration
      this.validateConfig();
      
      // Setup log directory
      await this.setupLogDirectory();
      
      // Initialize statistics
      this.initializeStats();
      
      // Setup periodic log rotation
      this.setupLogRotation();
      
      this.logInfo('Qwen debug module initialized successfully', {}, 'initialize');
    } catch (error) {
      this.logError('Failed to initialize Qwen debug module', error, 'initialize');
      throw error;
    }
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config.logDirectory) {
      throw new Error('Log directory is required');
    }

    if (this.config.maxLogSize <= 0) {
      throw new Error('Max log size must be positive');
    }

    if (this.config.maxLogFiles <= 0) {
      throw new Error('Max log files must be positive');
    }

    // Set default values
    this.config.enabled = this.config.enabled !== false;
    this.config.logLevel = this.config.logLevel || 'info';
    this.config.logRequests = this.config.logRequests !== false;
    this.config.logResponses = this.config.logResponses !== false;
    this.config.logErrors = this.config.logErrors !== false;
    this.config.logPerformance = this.config.logPerformance !== false;
    this.config.logToolCalls = this.config.logToolCalls !== false;
    this.config.logAuth = this.config.logAuth !== false;
    this.config.logPipelineState = this.config.logPipelineState !== false;
    this.config.filterSensitiveData = this.config.filterSensitiveData !== false;
  }

  /**
   * Setup log directory
   */
  private async setupLogDirectory(): Promise<void> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      // Create log directory if it doesn't exist
      if (!fs.existsSync(this.config.logDirectory)) {
        fs.mkdirSync(this.config.logDirectory, { recursive: true });
      }
      
      this.logDebug('Log directory setup completed', { 
        directory: this.config.logDirectory 
      }, 'setupLogDirectory');
    } catch (error) {
      this.logError('Failed to setup log directory', error, 'setupLogDirectory');
      throw error;
    }
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): void {
    this.stats = {
      totalEntries: 0,
      entriesByLevel: {},
      entriesByCategory: {},
      entriesByModule: {},
      totalRequests: 0,
      totalResponses: 0,
      totalErrors: 0,
      averageResponseTime: 0,
      memoryUsage: {
        current: 0,
        peak: 0,
        average: 0
      }
    };
  }

  /**
   * Setup log rotation
   */
  private setupLogRotation(): void {
    // Setup periodic log rotation check
    setInterval(() => {
      this.checkLogRotation();
    }, 60000); // Check every minute
  }

  /**
   * Check if log rotation is needed
   */
  private async checkLogRotation(): Promise<void> {
    if (this.currentLogSize >= this.config.maxLogSize) {
      await this.rotateLogs();
    }
  }

  /**
   * Rotate log files
   */
  private async rotateLogs(): Promise<void> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      // Close existing log files
      this.logFileHandles.forEach((handle, filename) => {
        if (handle && typeof handle.end === 'function') {
          handle.end();
        }
      });
      this.logFileHandles.clear();
      
      // Remove old log files if we have too many
      const logFiles = fs.readdirSync(this.config.logDirectory)
        .filter(file => file.startsWith('qwen-debug-'))
        .sort()
        .reverse();
      
      while (logFiles.length > this.config.maxLogFiles) {
        const fileToRemove = logFiles.pop();
        if (fileToRemove) {
          fs.unlinkSync(path.join(this.config.logDirectory, fileToRemove));
        }
      }
      
      this.currentLogSize = 0;
      this.logDebug('Log rotation completed', {}, 'rotateLogs');
    } catch (error) {
      this.logError('Failed to rotate logs', error, 'rotateLogs');
    }
  }

  /**
   * Log a pipeline request
   */
  public logRequest(requestId: string, request: OpenAIChatRequest, module: string): void {
    if (!this.config.enabled || !this.config.logRequests) {
      return;
    }

    this.logDebug('Logging pipeline request', { 
      requestId, 
      model: request.model,
      messageCount: request.messages.length,
      hasTools: !!request.tools?.length
    }, 'logRequest');

    const entry: DebugLogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level: 'info',
      module,
      category: 'request',
      message: 'Pipeline request received',
      data: {
        model: request.model,
        messageCount: request.messages.length,
        hasTools: !!request.tools?.length,
        toolCount: request.tools?.length || 0
      },
      requestResponse: {
        type: 'request',
        direction: 'inbound',
        requestId,
        model: request.model,
        content: this.filterSensitiveData(request),
        tools: request.tools,
        toolCalls: undefined
      },
      performance: {
        duration: 0,
        startTime: Date.now(),
        endTime: 0,
        memoryUsage: this.getMemoryUsage()
      }
    };

    this.addLogEntry(entry);
    this.activeRequests.set(requestId, { startTime: Date.now(), data: request });
    this.stats.totalRequests++;
  }

  /**
   * Log a pipeline response
   */
  public logResponse(requestId: string, response: OpenAIChatResponse, module: string): void {
    if (!this.config.enabled || !this.config.logResponses) {
      return;
    }

    const activeRequest = this.activeRequests.get(requestId);
    const startTime = activeRequest?.startTime || Date.now();
    const duration = Date.now() - startTime;

    this.logDebug('Logging pipeline response', { 
      requestId, 
      duration,
      choiceCount: response.choices?.length || 0
    }, 'logResponse');

    const entry: DebugLogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level: 'info',
      module,
      category: 'response',
      message: 'Pipeline response sent',
      data: {
        duration,
        choiceCount: response.choices?.length || 0,
        hasToolCalls: !!response.choices?.[0]?.message?.tool_calls?.length
      },
      requestResponse: {
        type: 'response',
        direction: 'outbound',
        requestId,
        model: response.model,
        content: this.filterSensitiveData(response),
        tools: undefined,
        toolCalls: response.choices?.[0]?.message?.tool_calls
      },
      performance: {
        duration,
        startTime,
        endTime: Date.now(),
        memoryUsage: this.getMemoryUsage()
      }
    };

    this.addLogEntry(entry);
    this.activeRequests.delete(requestId);
    this.stats.totalResponses++;
    this.updatePerformanceMetrics('responseTime', duration);
  }

  /**
   * Log an error
   */
  public logError(message: string, error: any, module: string, category?: string): void {
    if (!this.config.enabled || !this.config.logErrors) {
      return;
    }

    const entry: DebugLogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level: 'error',
      module,
      category: category || 'error',
      message,
      error: {
        name: error.name || 'Error',
        message: error.message || String(error),
        stack: error.stack
      },
      data: {
        errorType: error.constructor?.name,
        errorCode: error.code
      }
    };

    this.addLogEntry(entry);
    this.stats.totalErrors++;
  }

  /**
   * Log authentication state
   */
  public logAuthState(authState: string, details: any, module: string): void {
    if (!this.config.enabled || !this.config.logAuth) {
      return;
    }

    const entry: DebugLogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level: 'info',
      module,
      category: 'auth',
      message: `Authentication state: ${authState}`,
      data: details,
      auth: {
        state: authState,
        tokenStatus: details.tokenStatus,
        authMethod: details.authMethod
      }
    };

    this.addLogEntry(entry);
  }

  /**
   * Log pipeline state
   */
  public logPipelineState(stage: string, status: string, pipelineId: string, executionId: string, details?: any): void {
    if (!this.config.enabled || !this.config.logPipelineState) {
      return;
    }

    const entry: DebugLogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level: 'debug',
      module: 'pipeline',
      category: 'state',
      message: `Pipeline stage: ${stage}, status: ${status}`,
      data: details,
      pipeline: {
        stage,
        status,
        pipelineId,
        executionId
      }
    };

    this.addLogEntry(entry);
  }

  /**
   * Log tool calls
   */
  public logToolCalls(toolCalls: any[], requestId: string, direction: 'request' | 'response', module: string): void {
    if (!this.config.enabled || !this.config.logToolCalls) {
      return;
    }

    this.logDebug('Logging tool calls', { 
      requestId, 
      direction,
      toolCallCount: toolCalls.length
    }, 'logToolCalls');

    const entry: DebugLogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level: 'info',
      module,
      category: 'tool_calls',
      message: `Tool calls ${direction}`,
      data: {
        direction,
        toolCallCount: toolCalls.length,
        toolNames: toolCalls.map((call: any) => call.function?.name || 'unknown')
      },
      requestResponse: {
        type: direction === 'request' ? 'request' : 'response',
        direction: direction === 'request' ? 'inbound' : 'outbound',
        requestId,
        model: 'unknown',
        toolCalls: toolCalls
      }
    };

    this.addLogEntry(entry);
  }

  /**
   * Add a log entry
   */
  private addLogEntry(entry: DebugLogEntry): void {
    this.logEntries.push(entry);
    this.currentLogSize += JSON.stringify(entry).length;
    
    // Update statistics
    this.stats.totalEntries++;
    this.stats.entriesByLevel[entry.level] = (this.stats.entriesByLevel[entry.level] || 0) + 1;
    this.stats.entriesByCategory[entry.category] = (this.stats.entriesByCategory[entry.category] || 0) + 1;
    this.stats.entriesByModule[entry.module] = (this.stats.entriesByModule[entry.module] || 0) + 1;
    
    // Update memory usage
    const memoryUsage = this.getMemoryUsage();
    this.stats.memoryUsage.current = memoryUsage.used;
    this.stats.memoryUsage.peak = Math.max(this.stats.memoryUsage.peak, memoryUsage.used);
    this.stats.memoryUsage.average = (this.stats.memoryUsage.average + memoryUsage.used) / 2;
    
    // Write to file if configured
    this.writeLogToFile(entry);
    
    // Keep only recent entries in memory
    if (this.logEntries.length > 1000) {
      this.logEntries = this.logEntries.slice(-1000);
    }
  }

  /**
   * Write log entry to file
   */
  private async writeLogToFile(entry: DebugLogEntry): Promise<void> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const timestamp = new Date(entry.timestamp);
      const dateStr = timestamp.toISOString().split('T')[0];
      const filename = `qwen-debug-${dateStr}.jsonl`;
      const filepath = path.join(this.config.logDirectory, filename);
      
      const logLine = JSON.stringify(entry) + '\n';
      
      fs.appendFileSync(filepath, logLine);
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }

  /**
   * Filter sensitive data
   */
  private filterSensitiveData(data: any): any {
    if (!this.config.filterSensitiveData) {
      return data;
    }

    const sensitivePatterns = this.config.sensitivePatterns || [
      /access_token/i,
      /refresh_token/i,
      /api_key/i,
      /secret/i,
      /password/i,
      /authorization/i
    ];

    try {
      const dataStr = JSON.stringify(data);
      let filteredDataStr = dataStr;
      
      sensitivePatterns.forEach(pattern => {
        filteredDataStr = filteredDataStr.replace(pattern, '[FILTERED]');
      });
      
      return JSON.parse(filteredDataStr);
    } catch (error) {
      return data;
    }
  }

  /**
   * Get memory usage
   */
  private getMemoryUsage(): { used: number; total: number; percentage: number } {
    try {
      const usage = process.memoryUsage();
      return {
        used: usage.heapUsed,
        total: usage.heapTotal,
        percentage: (usage.heapUsed / usage.heapTotal) * 100
      };
    } catch (error) {
      return { used: 0, total: 0, percentage: 0 };
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(metric: string, value: number): void {
    if (!this.performanceMetrics.has(metric)) {
      this.performanceMetrics.set(metric, []);
    }
    
    const values = this.performanceMetrics.get(metric)!;
    values.push(value);
    
    // Keep only recent values
    if (values.length > 100) {
      values.splice(0, values.length - 100);
    }
    
    // Update average response time
    if (metric === 'responseTime') {
      this.stats.averageResponseTime = values.reduce((a, b) => a + b, 0) / values.length;
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get debug logs
   */
  public getDebugLogs(filters?: {
    level?: string;
    category?: string;
    module?: string;
    startTime?: number;
    endTime?: number;
    limit?: number;
  }): DebugLogEntry[] {
    let filteredLogs = [...this.logEntries];
    
    if (filters) {
      if (filters.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filters.level);
      }
      if (filters.category) {
        filteredLogs = filteredLogs.filter(log => log.category === filters.category);
      }
      if (filters.module) {
        filteredLogs = filteredLogs.filter(log => log.module === filters.module);
      }
      if (filters.startTime) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startTime!);
      }
      if (filters.endTime) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endTime!);
      }
      if (filters.limit) {
        filteredLogs = filteredLogs.slice(-filters.limit);
      }
    }
    
    return filteredLogs;
  }

  /**
   * Get debug statistics
   */
  public getDebugStats(): DebugStats {
    return { ...this.stats };
  }

  /**
   * Get active requests
   */
  public getActiveRequests(): Array<{ requestId: string; startTime: number; duration: number; data: any }> {
    return Array.from(this.activeRequests.entries()).map(([requestId, request]) => ({
      requestId,
      startTime: request.startTime,
      duration: Date.now() - request.startTime,
      data: request.data
    }));
  }

  /**
   * Clear debug logs
   */
  public clearDebugLogs(): void {
    this.logEntries = [];
    this.activeRequests.clear();
    this.initializeStats();
    this.logInfo('Debug logs cleared', {}, 'clearDebugLogs');
  }

  /**
   * Export debug logs
   */
  public exportDebugLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.logEntries, null, 2);
    } else if (format === 'csv') {
      // Simple CSV export
      const headers = ['id', 'timestamp', 'level', 'module', 'category', 'message'];
      const rows = this.logEntries.map(log => [
        log.id,
        log.timestamp,
        log.level,
        log.module,
        log.category,
        log.message
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    
    throw new Error(`Unsupported export format: ${format}`);
  }

  /**
   * Handle messages
   */
  public async handleMessage(message: Message): Promise<MessageResponse> {
    this.logDebug('Received message', { 
      type: message.type,
      source: message.source,
      target: message.target
    }, 'handleMessage');

    switch (message.type) {
      case 'get_debug_logs':
        return {
          success: true,
          data: {
            logs: this.getDebugLogs(message.payload as any),
            stats: this.getDebugStats(),
            activeRequests: this.getActiveRequests()
          }
        };
      
      case 'clear_debug_logs':
        this.clearDebugLogs();
        return {
          success: true,
          data: { message: 'Debug logs cleared' }
        };
      
      case 'export_debug_logs':
        const format = message.payload?.format || 'json';
        try {
          const exportedData = this.exportDebugLogs(format);
          return {
            success: true,
            data: {
              format,
              data: exportedData
            }
          };
        } catch (error) {
          return {
            success: false,
            error: `Failed to export debug logs: ${error}`
          };
        }
      
      default:
        return {
          success: false,
          error: `Unknown message type: ${message.type}`
        };
    }
  }

  /**
   * Get health status
   */
  public async getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      enabled: boolean;
      logDirectory: string;
      logCount: number;
      memoryUsage: number;
      diskUsage?: number;
    };
  }> {
    const memoryUsage = this.getMemoryUsage();
    
    return {
      status: memoryUsage.percentage > 90 ? 'degraded' : 'healthy',
      details: {
        enabled: this.config.enabled,
        logDirectory: this.config.logDirectory,
        logCount: this.logEntries.length,
        memoryUsage: memoryUsage.percentage
      }
    };
  }

  /**
   * Cleanup resources
   */
  public async destroy(): Promise<void> {
    this.logInfo('Destroying Qwen debug module', {}, 'destroy');
    
    // Close log file handles
    this.logFileHandles.forEach((handle, filename) => {
      if (handle && typeof handle.end === 'function') {
        handle.end();
      }
    });
    this.logFileHandles.clear();
    
    // Clear data
    this.logEntries = [];
    this.activeRequests.clear();
    this.performanceMetrics.clear();
    
    this.logInfo('Qwen debug module destroyed', {}, 'destroy');
  }
}