// DebugEventBus has been moved to rcc-debugcenter package
// This is a simplified compatibility layer that will be removed in future versions

/**
 * Debug log levels
 */
export type DebugLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

/**
 * Debug log entry
 */
export interface DebugLogEntry {
  /**
   * Timestamp of the log entry
   */
  timestamp: number;

  /**
   * Log level
   */
  level: DebugLevel;

  /**
   * Log message
   */
  message: string;

  /**
   * Additional data associated with the log
   */
  data?: any;

  /**
   * Call stack information
   */
  stack?: string;

  /**
   * Module ID that generated the log
   */
  moduleId: string;

  /**
   * Method name where the log was generated
   */
  method?: string | undefined;
}

/**
 * Debug configuration
 */
export interface DebugConfig {
  enabled: boolean;
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  recordStack: boolean;
  maxLogEntries: number;
  consoleOutput: boolean;
  trackDataFlow: boolean;
  enableFileLogging: boolean;
  maxFileSize: number;
  maxLogFiles: number;
  pipelinePosition?: 'start' | 'middle' | 'end';
}

/**
 * Simplified debug event for backward compatibility
 */
interface DebugEvent {
  sessionId?: string;
  moduleId: string;
  operationId: string;
  timestamp: number;
  type: 'start' | 'end' | 'error';
  position: 'start' | 'middle' | 'end';
  data: any;
}

/**
 * Handles all debug logging and I/O tracking operations
 */
export class DebugLogger {
  private debugConfig: DebugConfig;
  private debugLogs: DebugLogEntry[] = [];
  private moduleId: string;
  private moduleName: string;
  private moduleVersion: string;
  private currentSessionId?: string;
  private pipelinePosition?: 'start' | 'middle' | 'end';
  private externalDebugHandler?: (event: DebugEvent) => void;

  constructor(moduleId: string, moduleName: string, moduleVersion: string) {
    this.moduleId = moduleId;
    this.moduleName = moduleName;
    this.moduleVersion = moduleVersion;

    // Initialize debug configuration with defaults
    this.debugConfig = {
      enabled: true,
      level: 'debug',
      recordStack: true,
      maxLogEntries: 1000,
      consoleOutput: true,
      trackDataFlow: true,
      enableFileLogging: false,
      maxFileSize: 10485760, // 10MB
      maxLogFiles: 5
    };
  }

  /**
   * Set external debug handler for integration with DebugCenter
   */
  public setExternalDebugHandler(handler: (event: DebugEvent) => void): void {
    this.externalDebugHandler = handler;
  }

  /**
   * Sets the debug configuration
   */
  public setDebugConfig(config: Partial<DebugConfig>): void {
    this.debugConfig = { ...this.debugConfig, ...config };
  }

  /**
   * Sets the pipeline position for this module
   */
  public setPipelinePosition(position: 'start' | 'middle' | 'end'): void {
    this.pipelinePosition = position;
    this.debugConfig.pipelinePosition = position;
  }

  /**
   * Sets the current session ID for pipeline operations
   */
  public setCurrentSession(sessionId: string): void {
    this.currentSessionId = sessionId;
  }

  /**
   * Gets the current debug configuration
   */
  public getDebugConfig(): DebugConfig {
    return { ...this.debugConfig };
  }

  /**
   * Logs a debug message
   */
  public debug(level: DebugLevel, message: string, data?: any, method?: string): void {
    // Check if debug is enabled and level is appropriate
    if (!this.debugConfig.enabled) return;

    const levelOrder: DebugLevel[] = ['trace', 'debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levelOrder.indexOf(this.debugConfig.level);
    const messageLevelIndex = levelOrder.indexOf(level);

    if (messageLevelIndex < currentLevelIndex) return;

    // Create log entry
    const logEntry: DebugLogEntry = {
      timestamp: Date.now(),
      level,
      message,
      moduleId: this.moduleId,
      method
    };

    // Add data if provided
    if (data !== undefined) {
      logEntry.data = data;
    }

    // Record stack trace if enabled
    if (this.debugConfig.recordStack && level === 'error') {
      try {
        throw new Error('Stack trace');
      } catch (e: unknown) {
        if (e instanceof Error) {
          logEntry.stack = e.stack || undefined;
        }
      }
    }

    // Add to logs
    this.debugLogs.push(logEntry);

    // Trim logs if necessary
    if (this.debugLogs.length > this.debugConfig.maxLogEntries) {
      this.debugLogs = this.debugLogs.slice(-this.debugConfig.maxLogEntries);
    }

    // Output to console if enabled
    if (this.debugConfig.consoleOutput) {
      const timestamp = new Date(logEntry.timestamp).toISOString();
      const prefix = `[${timestamp}] [${this.moduleId}] [${level.toUpperCase()}]${method ? ` [${method}]` : ''}`;

      switch (level) {
        case 'trace':
        case 'debug':
        case 'info':
          console.log(`${prefix} ${message}`, data || '');
          break;
        case 'warn':
          console.warn(`${prefix} ${message}`, data || '');
          break;
        case 'error':
          console.error(`${prefix} ${message}`, data || '');
          break;
      }
    }
  }

  /**
   * Logs a trace message
   */
  public trace(message: string, data?: any, method?: string): void {
    this.debug('trace', message, data, method);
  }

  /**
   * Logs a debug message
   */
  public log(message: string, data?: any, method?: string): void {
    this.debug('debug', message, data, method);
  }

  /**
   * Logs an info message
   */
  public logInfo(message: string, data?: any, method?: string): void {
    this.debug('info', message, data, method);
  }

  /**
   * Logs a warning message
   */
  public warn(message: string, data?: any, method?: string): void {
    this.debug('warn', message, data, method);
  }

  /**
   * Logs an error message
   */
  public error(message: string, data?: any, method?: string): void {
    this.debug('error', message, data, method);
  }

  /**
   * Gets debug logs
   */
  public getDebugLogs(level?: DebugLevel, limit?: number): DebugLogEntry[] {
    let logs = [...this.debugLogs];

    // Filter by level if specified
    if (level) {
      logs = logs.filter(log => log.level === level);
    }

    // Limit results if specified
    if (limit && limit > 0) {
      logs = logs.slice(-limit);
    }

    return logs;
  }

  /**
   * Clears debug logs
   */
  public clearDebugLogs(): void {
    this.debugLogs = [];
  }

  /**
   * Start a pipeline session
   */
  public startPipelineSession(sessionId: string, pipelineConfig: any): void {
    this.currentSessionId = sessionId;

    const event: DebugEvent = {
      sessionId,
      moduleId: this.moduleId,
      operationId: 'session_start',
      timestamp: Date.now(),
      type: 'start',
      position: this.pipelinePosition || 'middle',
      data: {
        pipelineConfig,
        moduleInfo: {
          id: this.moduleId,
          name: this.moduleName,
          version: this.moduleVersion
        }
      }
    };

    // Send to external debug handler if available
    if (this.externalDebugHandler) {
      this.externalDebugHandler(event);
    }

    // Log locally for backward compatibility
    this.logInfo('Pipeline session started', {
      sessionId,
      pipelinePosition: this.pipelinePosition
    }, 'startPipelineSession');
  }

  /**
   * End a pipeline session
   */
  public endPipelineSession(sessionId: string, success: boolean = true): void {
    const event: DebugEvent = {
      sessionId,
      moduleId: this.moduleId,
      operationId: 'session_end',
      timestamp: Date.now(),
      type: success ? 'end' : 'error',
      position: this.pipelinePosition || 'middle',
      data: {
        success,
        moduleInfo: {
          id: this.moduleId,
          name: this.moduleName,
          version: this.moduleVersion
        }
      }
    };

    // Send to external debug handler if available
    if (this.externalDebugHandler) {
      this.externalDebugHandler(event);
    }
    this.currentSessionId = undefined;

    // Log locally for backward compatibility
    this.logInfo('Pipeline session ended', {
      sessionId,
      success,
      pipelinePosition: this.pipelinePosition
    }, 'endPipelineSession');
  }

  /**
   * Record an I/O operation start
   */
  public startIOTracking(operationId: string, input: any, method?: string): void {
    if (!this.currentSessionId || !this.debugConfig.enabled) return;

    const event: DebugEvent = {
      sessionId: this.currentSessionId,
      moduleId: this.moduleId,
      operationId,
      timestamp: Date.now(),
      type: 'start',
      position: this.pipelinePosition || 'middle',
      data: {
        input,
        method,
        pipelinePosition: this.pipelinePosition,
        moduleInfo: {
          id: this.moduleId,
          name: this.moduleName,
          version: this.moduleVersion
        }
      }
    };

    // Send to external debug handler if available
    if (this.externalDebugHandler) {
      this.externalDebugHandler(event);
    }

    // Log locally for backward compatibility
    this.debug('debug', `I/O tracking started: ${operationId}`, {
      sessionId: this.currentSessionId,
      input: this.debugConfig.trackDataFlow ? input : '[INPUT_DATA]',
      method
    }, 'startIOTracking');
  }

  /**
   * Record an I/O operation end
   */
  public endIOTracking(operationId: string, output: any, success: boolean = true, error?: string): void {
    if (!this.currentSessionId || !this.debugConfig.enabled) return;

    const event: DebugEvent = {
      sessionId: this.currentSessionId,
      moduleId: this.moduleId,
      operationId,
      timestamp: Date.now(),
      type: success ? 'end' : 'error',
      position: this.pipelinePosition || 'middle',
      data: {
        output,
        success,
        error,
        pipelinePosition: this.pipelinePosition,
        moduleInfo: {
          id: this.moduleId,
          name: this.moduleName,
          version: this.moduleVersion
        }
      }
    };

    // Send to external debug handler if available
    if (this.externalDebugHandler) {
      this.externalDebugHandler(event);
    }

    // Log locally for backward compatibility
    this.debug('debug', `I/O tracking ended: ${operationId}`, {
      sessionId: this.currentSessionId,
      output: this.debugConfig.trackDataFlow ? output : '[OUTPUT_DATA]',
      success,
      error
    }, 'endIOTracking');
  }

  /**
   * Cleanup
   */
  public cleanup(): void {
    this.clearDebugLogs();
    this.currentSessionId = undefined;
  }
}