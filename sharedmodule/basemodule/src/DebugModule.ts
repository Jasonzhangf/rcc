/**
 * Debug Module - Integrated debug system for BaseModule
 *
 * This module provides comprehensive debug functionality including:
 * - Two-phase logging (system start and port-specific)
 * - Configurable log directories
 * - Runtime directory updates
 * - File and console output
 * - Log rotation and cleanup
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Debug log levels
 */
export type DebugLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

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
  phase?: 'systemstart' | 'port';
  port?: number;
  directory?: string;
}

/**
 * Module I/O tracking entry
 */
export interface ModuleIOEntry {
  timestamp: number;
  moduleId: string;
  operationId: string;
  input?: any;
  output?: any;
  duration?: number;
  success: boolean;
  error?: string;
  method?: string;
}

/**
 * Pipeline I/O entry for recording pipeline operations
 */
export interface PipelineIOEntry {
  timestamp: number;
  pipelineId: string;
  pipelineName?: string;
  moduleId: string;
  operationId: string;
  operationType: 'pipeline_start' | 'pipeline_end' | 'module_operation' | 'data_transfer';
  input?: any;
  output?: any;
  duration?: number;
  success: boolean;
  error?: string;
  method?: string;
  context?: {
    phase?: string;
    stage?: number;
    previousOperation?: string;
    nextOperation?: string;
  };
}

/**
 * I/O tracking configuration
 */
export interface IOTrackingConfig {
  enabled: boolean;
  autoRecord: boolean;
  saveIndividualFiles: boolean;
  saveSessionFiles: boolean;
  sessionFileName?: string;
  ioDirectory: string;
  includeTimestamp: boolean;
  includeDuration: boolean;
  maxEntriesPerFile: number;
}

/**
 * Pipeline I/O recording configuration
 */
export interface PipelineIOConfig {
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
}

/**
 * Debug configuration
 */
export interface DebugConfig {
  enabled: boolean;
  level: DebugLevel;
  recordStack: boolean;
  maxLogEntries: number;
  consoleOutput: boolean;
  trackDataFlow: boolean;
  enableFileLogging: boolean;
  maxFileSize: number;
  maxLogFiles: number;
  ioTracking?: IOTrackingConfig;
  pipelineIO?: PipelineIOConfig;
  baseDirectory?: string;
}

/**
 * Two-phase debug configuration
 */
export interface TwoPhaseDebugConfig {
  phase: 'systemstart' | 'port';
  baseDirectory: string;
  systemStartDirectory: string;
  portDirectory?: string;
  port?: number;
  enableFileLogging: boolean;
  enableConsoleLogging: boolean;
  maxFileSize: number;
  maxLogFiles: number;
  enabled: boolean;
  level: DebugLevel;
  recordStack: boolean;
  maxLogEntries: number;
  consoleOutput: boolean;
  trackDataFlow: boolean;
  ioTracking: IOTrackingConfig;
  pipelineIO: PipelineIOConfig;
}

/**
 * Integrated debug system with two-phase logging
 */
export class DebugModule {
  private config: TwoPhaseDebugConfig;
  private logs: DebugLogEntry[] = [];
  private ioTrackingConfig: IOTrackingConfig;
  private ioEntries: ModuleIOEntry[] = [];
  private pipelineIOConfig: PipelineIOConfig;
  private pipelineEntries: PipelineIOEntry[] = [];
  private activeOperations: Map<string, { startTime: number; input: any; method?: string }> =
    new Map();
  // private currentLogFile: string | null = null; // Reserved for future use

  constructor(baseDirectory: string = '~/.rcc/debug') {
    this.ioTrackingConfig = {
      enabled: true,
      autoRecord: true,
      saveIndividualFiles: true,
      saveSessionFiles: true,
      sessionFileName: 'session-io.jsonl',
      ioDirectory: path.join(baseDirectory, 'io-logs'),
      includeTimestamp: true,
      includeDuration: true,
      maxEntriesPerFile: 1000,
    };

    this.pipelineIOConfig = {
      enabled: true,
      autoRecordPipelineStart: true,
      autoRecordPipelineEnd: true,
      pipelineSessionFileName: 'pipeline-session.jsonl',
      pipelineDirectory: path.join(baseDirectory, 'pipeline-logs'),
      recordAllOperations: false,
      includeModuleContext: true,
      includeTimestamp: true,
      includeDuration: true,
      maxPipelineOperationsPerFile: 2000,
    };

    this.config = {
      enabled: true,
      level: 'debug',
      recordStack: true,
      maxLogEntries: 1000,
      consoleOutput: true,
      trackDataFlow: true,
      phase: 'systemstart',
      baseDirectory,
      systemStartDirectory: path.join(baseDirectory, 'systemstart'),
      enableFileLogging: true,
      enableConsoleLogging: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxLogFiles: 5,
      ioTracking: { ...this.ioTrackingConfig },
      pipelineIO: { ...this.pipelineIOConfig },
    };

    this.initializeDirectories();
  }

  /**
   * Initialize debug directories
   */
  private initializeDirectories(): void {
    try {
      const baseDir = this.config.baseDirectory.replace('~', process.env.HOME || '');
      const systemStartDir = this.config.systemStartDirectory.replace('~', process.env.HOME || '');
      const ioDir = this.ioTrackingConfig.ioDirectory.replace('~', process.env.HOME || '');
      const pipelineDir = this.pipelineIOConfig.pipelineDirectory.replace('~', process.env.HOME || '');

      // Create base directory
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }

      // Create system start directory
      if (!fs.existsSync(systemStartDir)) {
        fs.mkdirSync(systemStartDir, { recursive: true });
      }

      // Create I/O logs directory
      if (!fs.existsSync(ioDir)) {
        fs.mkdirSync(ioDir, { recursive: true });
      }

      // Create pipeline logs directory
      if (!fs.existsSync(pipelineDir)) {
        fs.mkdirSync(pipelineDir, { recursive: true });
      }

      this.log(
        'info',
        'Debug directories initialized',
        {
          baseDirectory: baseDir,
          systemStartDirectory: systemStartDir,
          ioDirectory: ioDir,
          pipelineDirectory: pipelineDir,
        },
        'initializeDirectories'
      );
    } catch (error) {
      console.error('Failed to initialize debug directories:', error);
    }
  }

  /**
   * Get current log directory
   */
  private getCurrentLogDirectory(): string {
    const directory =
      this.config.phase === 'systemstart'
        ? this.config.systemStartDirectory
        : this.config.portDirectory || this.config.systemStartDirectory;

    return directory.replace('~', process.env.HOME || '');
  }

  /**
   * Get current log file path
   */
  private getCurrentLogFilePath(): string {
    const directory = this.getCurrentLogDirectory();
    const date = new Date().toISOString().split('T')[0];
    return path.join(directory, `${date}.jsonl`);
  }

  /**
   * Switch to port-specific logging
   * @param port - Port number
   */
  public switchToPortMode(port: number): void {
    this.config.phase = 'port';
    this.config.port = port;
    this.config.portDirectory = path.join(this.config.baseDirectory, `port-${port}`);

    // Create port directory
    const portDir = this.config.portDirectory.replace('~', process.env.HOME || '');
    if (!fs.existsSync(portDir)) {
      fs.mkdirSync(portDir, { recursive: true });
    }

    this.log(
      'info',
      'Debug system switched to port mode',
      {
        port,
        portDirectory: portDir,
      },
      'switchToPortMode'
    );
  }

  /**
   * Update debug configuration
   * @param updates - Configuration updates
   */
  public updateConfig(updates: Partial<TwoPhaseDebugConfig>): void {
    this.config = { ...this.config, ...updates };

    // Update ioTrackingConfig if ioTracking is being updated
    if (updates.ioTracking) {
      this.ioTrackingConfig = { ...this.ioTrackingConfig, ...updates.ioTracking };
    }

    // Update pipelineIOConfig if pipelineIO is being updated
    if (updates.pipelineIO) {
      this.pipelineIOConfig = { ...this.pipelineIOConfig, ...updates.pipelineIO };
    }

    // Reinitialize directories if needed
    if (updates.baseDirectory || updates.systemStartDirectory) {
      this.initializeDirectories();
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): TwoPhaseDebugConfig {
    return { ...this.config };
  }

  /**
   * Update base directory
   * @param newDirectory - New base directory
   */
  public updateBaseDirectory(newDirectory: string): void {
    this.config.baseDirectory = newDirectory;
    this.config.systemStartDirectory = path.join(newDirectory, 'systemstart');
    this.initializeDirectories();

    this.log(
      'info',
      'Debug base directory updated',
      {
        newDirectory: newDirectory.replace('~', process.env.HOME || ''),
        systemStartDirectory: this.config.systemStartDirectory.replace('~', process.env.HOME || ''),
      },
      'updateBaseDirectory'
    );
  }

  /**
   * Get current log directory
   */
  public getCurrentDirectory(): string {
    return this.getCurrentLogDirectory();
  }

  /**
   * Log a message
   * @param level - Log level
   * @param message - Log message
   * @param data - Additional data
   * @param method - Method name
   */
  public log(level: DebugLevel, message: string, data?: any, method?: string): void {
    if (!this.config.enabled) return;

    const levelOrder: DebugLevel[] = ['trace', 'debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levelOrder.indexOf(this.config.level);
    const messageLevelIndex = levelOrder.indexOf(level);

    if (messageLevelIndex < currentLevelIndex) return;

    const timestamp = Date.now();
    const logEntry: DebugLogEntry = {
      timestamp,
      level,
      message,
      method,
      data: data || null,
      phase: this.config.phase,
      port: this.config.port || undefined,
      directory: this.getCurrentLogDirectory(),
    };

    if (data !== undefined) {
      logEntry.data = data;
    }

    if (this.config.recordStack && level === 'error') {
      try {
        throw new Error('Stack trace');
      } catch (e: unknown) {
        if (e instanceof Error) {
          logEntry.stack = e.stack || undefined;
        }
      }
    }

    // Add to in-memory logs
    this.logs.push(logEntry);
    if (this.logs.length > this.config.maxLogEntries) {
      this.logs = this.logs.slice(-this.config.maxLogEntries);
    }

    // Console output
    if (this.config.enableConsoleLogging) {
      const formattedTimestamp = new Date(timestamp).toISOString();
      const prefix = `[${formattedTimestamp}] [${level.toUpperCase()}] [${this.config.phase}]${method ? ` [${method}]` : ''}`;
      const messageText = `${prefix} ${message}`;

      switch (level) {
        case 'trace':
        case 'debug':
        case 'info':
          console.log(messageText, data || '');
          break;
        case 'warn':
          console.warn(messageText, data || '');
          break;
        case 'error':
          console.error(messageText, data || '');
          break;
      }
    }

    // File output
    if (this.config.enableFileLogging) {
      this.writeToFile(logEntry);
    }
  }

  /**
   * Write log entry to file
   * @param logEntry - Log entry to write
   */
  private writeToFile(logEntry: DebugLogEntry): void {
    try {
      const logFilePath = this.getCurrentLogFilePath();

      // Check file size and rotate if needed
      if (fs.existsSync(logFilePath)) {
        const stats = fs.statSync(logFilePath);
        if (stats.size >= this.config.maxFileSize) {
          this.rotateLogFile(logFilePath);
        }
      }

      // Write log entry
      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(logFilePath, logLine);
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }

  /**
   * Rotate log file
   * @param currentFilePath - Current log file path
   */
  private rotateLogFile(currentFilePath: string): void {
    try {
      const directory = path.dirname(currentFilePath);
      const baseName = path.basename(currentFilePath, '.jsonl');

      // Find existing rotated files
      const files = fs
        .readdirSync(directory)
        .filter((file) => file.startsWith(`${baseName}.`) && file.endsWith('.jsonl'))
        .sort();

      // Remove old files if we have too many
      while (files.length >= this.config.maxLogFiles) {
        const oldestFile = files.shift();
        if (oldestFile) {
          fs.unlinkSync(path.join(directory, oldestFile));
        }
      }

      // Rename current file with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedPath = path.join(directory, `${baseName}.${timestamp}.jsonl`);
      fs.renameSync(currentFilePath, rotatedPath);
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  /**
   * Get log entries from memory
   * @param level - Optional filter by log level
   * @param limit - Optional limit on number of entries
   */
  public getLogs(level?: DebugLevel, limit?: number): DebugLogEntry[] {
    let logs = [...this.logs];

    if (level) {
      logs = logs.filter((log) => log.level === level);
    }

    if (limit && limit > 0) {
      logs = logs.slice(-limit);
    }

    return logs;
  }

  /**
   * Clear in-memory logs and I/O entries
   */
  public clearLogs(): void {
    this.logs = [];
    this.ioEntries = [];

    // Clear I/O files
    try {
      const ioDir = this.ioTrackingConfig.ioDirectory.replace('~', process.env.HOME || '');
      if (fs.existsSync(ioDir)) {
        const files = fs.readdirSync(ioDir);
        files.forEach((file) => {
          if (file.endsWith('.json') || file.endsWith('.jsonl')) {
            fs.unlinkSync(path.join(ioDir, file));
          }
        });
      }
    } catch (error) {
      // Don't throw error during cleanup
      console.warn('Failed to clear I/O files:', error);
    }
  }

  /**
   * Get log files in current directory
   */
  public getLogFiles(): string[] {
    try {
      const directory = this.getCurrentLogDirectory();
      return fs
        .readdirSync(directory)
        .filter((file) => file.endsWith('.jsonl'))
        .map((file) => path.join(directory, file));
    } catch (error) {
      console.error('Failed to get log files:', error);
      return [];
    }
  }

  /**
   * Read log file content
   * @param filePath - Log file path
   * @param limit - Optional limit on number of entries
   */
  public readLogFile(filePath: string, limit?: number): DebugLogEntry[] {
    try {
      if (!fs.existsSync(filePath)) {
        return [];
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.trim().split('\n');
      const entries = lines
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter((entry) => entry !== null);

      if (limit && limit > 0) {
        return entries.slice(-limit);
      }

      return entries;
    } catch (error) {
      console.error('Failed to read log file:', error);
      return [];
    }
  }

  /**
   * Clean up old log files
   * @param daysToKeep - Number of days to keep logs
   */
  public cleanupOldLogs(daysToKeep: number = 30): void {
    try {
      const directories = [
        this.config.systemStartDirectory.replace('~', process.env.HOME || ''),
        ...(this.config.portDirectory
          ? [this.config.portDirectory.replace('~', process.env.HOME || '')]
          : []),
      ];

      const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

      for (const directory of directories) {
        if (!fs.existsSync(directory)) continue;

        const files = fs.readdirSync(directory);
        for (const file of files) {
          const filePath = path.join(directory, file);
          const stats = fs.statSync(filePath);

          if (stats.mtime.getTime() < cutoffTime) {
            fs.unlinkSync(filePath);
          }
        }
      }

      this.log('info', 'Cleaned up old log files', { daysToKeep }, 'cleanupOldLogs');
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  /**
   * Convenience methods
   */
  public trace(message: string, data?: any, method?: string): void {
    this.log('trace', message, data, method);
  }

  public debug(message: string, data?: any, method?: string): void {
    this.log('debug', message, data, method);
  }

  public info(message: string, data?: any, method?: string): void {
    this.log('info', message, data, method);
  }

  public warn(message: string, data?: any, method?: string): void {
    this.log('warn', message, data, method);
  }

  public error(message: string, data?: any, method?: string): void {
    this.log('error', message, data, method);
  }

  /**
   * Legacy method for compatibility with original DebugSystem
   */
  public updateLogDirectory(newDirectory: string): void {
    this.updateBaseDirectory(newDirectory);
  }

  /**
   * Legacy method for compatibility with original DebugSystem
   */
  public setConfig(config: Partial<DebugConfig>): void {
    this.updateConfig(config);
  }

  /**
   * Legacy method for compatibility with original DebugSystem
   */
  public getLogDirectory(): string {
    return this.config.baseDirectory;
  }

  // ========================================
  // I/O Tracking Methods
  // ========================================

  /**
   * Update I/O tracking configuration
   * @param config - New I/O tracking configuration
   */
  public updateIOTrackingConfig(config: Partial<IOTrackingConfig>): void {
    this.ioTrackingConfig = { ...this.ioTrackingConfig, ...config };
    this.config.ioTracking = { ...this.ioTrackingConfig };
    this.log('info', 'I/O tracking configuration updated', config, 'updateIOTrackingConfig');
  }

  /**
   * Get current I/O tracking configuration
   */
  public getIOTrackingConfig(): IOTrackingConfig {
    return { ...this.ioTrackingConfig };
  }

  /**
   * Start tracking a module operation
   * @param moduleId - Module ID
   * @param operationId - Operation ID
   * @param input - Input data
   * @param method - Method name
   */
  public startOperation(moduleId: string, operationId: string, input: any, method?: string): void {
    if (!this.ioTrackingConfig.enabled) return;

    this.activeOperations.set(`${moduleId}-${operationId}`, {
      startTime: Date.now(),
      input,
      method,
    });

    this.log(
      'debug',
      `Operation started: ${operationId}`,
      {
        moduleId,
        operationId,
        input: this.ioTrackingConfig.autoRecord ? input : '[INPUT_DATA]',
      },
      'startOperation'
    );
  }

  /**
   * End tracking a module operation and record I/O
   * @param moduleId - Module ID
   * @param operationId - Operation ID
   * @param output - Output data
   * @param success - Whether operation was successful
   * @param error - Error message if failed
   */
  public endOperation(
    moduleId: string,
    operationId: string,
    output: any,
    success: boolean = true,
    error?: string
  ): void {
    if (!this.ioTrackingConfig.enabled) return;

    const operationKey = `${moduleId}-${operationId}`;
    const operation = this.activeOperations.get(operationKey);

    if (!operation) {
      this.warn(`Operation not found: ${operationId}`, { moduleId, operationId }, 'endOperation');
      return;
    }

    const duration = Date.now() - operation.startTime;
    const ioEntry: ModuleIOEntry = {
      timestamp: Date.now(),
      moduleId,
      operationId,
      input: operation.input, // Always store full data in memory
      output: output, // Always store full data in memory
      duration: this.ioTrackingConfig.includeDuration ? duration : undefined,
      success,
      error,
      method: operation.method, // Retrieve method from startOperation
    };

    // Add to in-memory entries
    this.ioEntries.push(ioEntry);
    if (this.ioEntries.length > this.ioTrackingConfig.maxEntriesPerFile) {
      this.ioEntries = this.ioEntries.slice(-this.ioTrackingConfig.maxEntriesPerFile);
    }

    // Save to individual file if enabled
    if (this.ioTrackingConfig.saveIndividualFiles) {
      this.saveOperationToIndividualFile(ioEntry);
    }

    // Save to session file if enabled
    if (this.ioTrackingConfig.saveSessionFiles) {
      this.saveOperationToSessionFile(ioEntry);
    }

    // Remove from active operations
    this.activeOperations.delete(operationKey);

    this.log(
      'debug',
      `Operation ended: ${operationId}`,
      {
        moduleId,
        operationId,
        duration,
        success,
        output: this.ioTrackingConfig.autoRecord ? output : '[OUTPUT_DATA]',
      },
      'endOperation'
    );
  }

  /**
   * Record a complete operation (start and end in one call)
   * @param moduleId - Module ID
   * @param operationId - Operation ID
   * @param input - Input data
   * @param output - Output data
   * @param method - Method name
   * @param success - Whether operation was successful
   * @param error - Error message if failed
   */
  public recordOperation(
    moduleId: string,
    operationId: string,
    input: any,
    output: any,
    method?: string,
    success: boolean = true,
    error?: string
  ): void {
    if (!this.ioTrackingConfig.enabled) return;

    const ioEntry: ModuleIOEntry = {
      timestamp: Date.now(),
      moduleId,
      operationId,
      input, // Always store full data in memory
      output, // Always store full data in memory
      duration: 0, // Single operation doesn't track duration
      success,
      error,
      method,
    };

    // Add to in-memory entries
    this.ioEntries.push(ioEntry);
    if (this.ioEntries.length > this.ioTrackingConfig.maxEntriesPerFile) {
      this.ioEntries = this.ioEntries.slice(-this.ioTrackingConfig.maxEntriesPerFile);
    }

    // Save to individual file if enabled
    if (this.ioTrackingConfig.saveIndividualFiles) {
      this.saveOperationToIndividualFile(ioEntry);
    }

    // Save to session file if enabled
    if (this.ioTrackingConfig.saveSessionFiles) {
      this.saveOperationToSessionFile(ioEntry);
    }

    this.log(
      'debug',
      `Operation recorded: ${operationId}`,
      {
        moduleId,
        operationId,
        success,
        input: this.ioTrackingConfig.autoRecord ? input : '[INPUT_DATA]',
        output: this.ioTrackingConfig.autoRecord ? output : '[OUTPUT_DATA]',
      },
      'recordOperation'
    );
  }

  /**
   * Save operation to individual file
   * @param ioEntry - I/O entry to save
   */
  private saveOperationToIndividualFile(ioEntry: ModuleIOEntry): void {
    try {
      const ioDir = this.ioTrackingConfig.ioDirectory.replace('~', process.env.HOME || '');
      const timestamp = new Date(ioEntry.timestamp).toISOString().replace(/[:.]/g, '-');
      const fileName = `${ioEntry.moduleId}_${ioEntry.operationId}.json`;
      const filePath = path.join(ioDir, fileName);

      // Apply autoRecord masking for file persistence
      const fileContent = {
        ...ioEntry,
        input: this.ioTrackingConfig.autoRecord ? ioEntry.input : '[INPUT_DATA]',
        output: this.ioTrackingConfig.autoRecord ? ioEntry.output : '[OUTPUT_DATA]',
        savedAt: Date.now(),
        format: 'individual-operation',
      };

      fs.writeFileSync(filePath, JSON.stringify(fileContent, null, 2));
    } catch (error) {
      this.error(
        'Failed to save operation to individual file',
        { error: (error as Error).message },
        'saveOperationToIndividualFile'
      );
    }
  }

  /**
   * Save operation to session file
   * @param ioEntry - I/O entry to save
   */
  private saveOperationToSessionFile(ioEntry: ModuleIOEntry): void {
    try {
      const ioDir = this.ioTrackingConfig.ioDirectory.replace('~', process.env.HOME || '');
      // Create module-specific session file name
      const sessionFileName = `${ioEntry.moduleId}_session.jsonl`;
      const sessionFilePath = path.join(ioDir, sessionFileName);

      // Apply autoRecord masking for file persistence
      const sessionEntry = {
        ...ioEntry,
        input: this.ioTrackingConfig.autoRecord ? ioEntry.input : '[INPUT_DATA]',
        output: this.ioTrackingConfig.autoRecord ? ioEntry.output : '[OUTPUT_DATA]',
        savedAt: Date.now(),
        format: 'session-operation',
      };

      const sessionLine = JSON.stringify(sessionEntry) + '\n';
      fs.appendFileSync(sessionFilePath, sessionLine);
    } catch (error) {
      this.error(
        'Failed to save operation to session file',
        { error: (error as Error).message },
        'saveOperationToSessionFile'
      );
    }
  }

  /**
   * Get I/O entries
   * @param moduleId - Optional filter by module ID
   * @param limit - Optional limit on number of entries
   */
  public getIOEntries(moduleId?: string, limit?: number): ModuleIOEntry[] {
    let entries = [...this.ioEntries];

    if (moduleId) {
      entries = entries.filter((entry) => entry.moduleId === moduleId);
    }

    if (limit && limit > 0) {
      entries = entries.slice(-limit);
    }

    return entries;
  }

  /**
   * Clear I/O entries
   */
  public clearIOEntries(): void {
    this.ioEntries = [];
    this.activeOperations.clear();
  }

  /**
   * Get I/O log files
   */
  public getIOFiles(): string[] {
    try {
      const ioDir = this.ioTrackingConfig.ioDirectory.replace('~', process.env.HOME || '');
      if (!fs.existsSync(ioDir)) return [];

      return fs
        .readdirSync(ioDir)
        .filter((file) => file.endsWith('.json') || file.endsWith('.jsonl'))
        .map((file) => path.join(ioDir, file));
    } catch (error) {
      this.error('Failed to get I/O files', { error: (error as Error).message }, 'getIOFiles');
      return [];
    }
  }

  /**
   * Read I/O file content
   * @param filePath - I/O file path
   * @param limit - Optional limit on number of entries
   */
  public readIOFile(filePath: string, limit?: number): ModuleIOEntry[] {
    try {
      if (!fs.existsSync(filePath)) {
        return [];
      }

      const content = fs.readFileSync(filePath, 'utf8');

      if (filePath.endsWith('.jsonl')) {
        // Handle JSONL format (session files)
        const lines = content.trim().split('\n');
        const entries = lines
          .map((line) => {
            try {
              return JSON.parse(line);
            } catch {
              return null;
            }
          })
          .filter((entry) => entry !== null);

        if (limit && limit > 0) {
          return entries.slice(-limit);
        }
        return entries;
      } else {
        // Handle JSON format (individual files)
        try {
          const entry = JSON.parse(content);
          return [entry];
        } catch {
          return [];
        }
      }
    } catch (error) {
      this.error('Failed to read I/O file', { error: (error as Error).message }, 'readIOFile');
      return [];
    }
  }

  /**
   * Enable or disable I/O tracking
   * @param enabled - Whether to enable I/O tracking
   */
  public setIOTrackingEnabled(enabled: boolean): void {
    this.ioTrackingConfig.enabled = enabled;
    this.log(
      'info',
      `I/O tracking ${enabled ? 'enabled' : 'disabled'}`,
      {},
      'setIOTrackingEnabled'
    );
  }

  /**
   * Enable or disable auto recording of I/O data
   * @param autoRecord - Whether to auto record I/O data
   */
  public setAutoRecord(autoRecord: boolean): void {
    this.ioTrackingConfig.autoRecord = autoRecord;
    this.log('info', `Auto recording ${autoRecord ? 'enabled' : 'disabled'}`, {}, 'setAutoRecord');
  }

  /**
   * Enable or disable individual file saving
   * @param enabled - Whether to save individual files
   */
  public setIndividualFileSaving(enabled: boolean): void {
    this.ioTrackingConfig.saveIndividualFiles = enabled;
    this.log(
      'info',
      `Individual file saving ${enabled ? 'enabled' : 'disabled'}`,
      {},
      'setIndividualFileSaving'
    );
  }

  /**
   * Enable or disable session file saving
   * @param enabled - Whether to save session files
   */
  public setSessionFileSaving(enabled: boolean): void {
    this.ioTrackingConfig.saveSessionFiles = enabled;
    this.log(
      'info',
      `Session file saving ${enabled ? 'enabled' : 'disabled'}`,
      {},
      'setSessionFileSaving'
    );
  }

  /**
   * Set session file name
   * @param fileName - Session file name
   */
  public setSessionFileName(fileName: string): void {
    this.ioTrackingConfig.sessionFileName = fileName;
    this.log('info', `Session file name set to: ${fileName}`, {}, 'setSessionFileName');
  }

  /**
   * Get individual I/O files
   * @param moduleId - Optional module ID to filter by
   */
  public getIndividualIOFiles(moduleId?: string): string[] {
    try {
      const ioDir = this.ioTrackingConfig.ioDirectory.replace('~', process.env.HOME || '');
      if (!fs.existsSync(ioDir)) return [];

      const files = fs.readdirSync(ioDir);
      const individualFiles = files.filter((file) => {
        return (
          file.endsWith('.json') && file.includes('_') && (!moduleId || file.startsWith(moduleId))
        );
      });

      return individualFiles.map((file) => path.join(ioDir, file));
    } catch (error) {
      this.error(
        'Failed to get individual I/O files',
        { error: (error as Error).message },
        'getIndividualIOFiles'
      );
      return [];
    }
  }

  /**
   * Get session I/O files
   * @param moduleId - Optional module ID to filter by
   */
  public getSessionIOFiles(moduleId?: string): string[] {
    try {
      const ioDir = this.ioTrackingConfig.ioDirectory.replace('~', process.env.HOME || '');
      if (!fs.existsSync(ioDir)) return [];

      const files = fs.readdirSync(ioDir);
      const sessionFiles = files.filter((file) => {
        return (
          file.endsWith('.jsonl') &&
          file.includes('_session') &&
          (!moduleId || file.startsWith(moduleId))
        );
      });

      return sessionFiles.map((file) => path.join(ioDir, file));
    } catch (error) {
      this.error(
        'Failed to get session I/O files',
        { error: (error as Error).message },
        'getSessionIOFiles'
      );
      return [];
    }
  }

  /**
   * Read individual I/O file
   * @param filePath - Path to the individual I/O file
   */
  public readIndividualIOFile(filePath: string): ModuleIOEntry | null {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const entry = JSON.parse(content);
      return entry;
    } catch (error) {
      this.error(
        'Failed to read individual I/O file',
        { error: (error as Error).message, filePath },
        'readIndividualIOFile'
      );
      return null;
    }
  }

  /**
   * Read session I/O file
   * @param filePath - Path to the session I/O file
   * @param limit - Optional limit on number of entries
   */
  public readSessionIOFile(filePath: string, limit?: number): ModuleIOEntry[] {
    try {
      if (!fs.existsSync(filePath)) {
        return [];
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content
        .trim()
        .split('\n')
        .filter((line) => line.trim());

      let entries = lines
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter((entry) => entry !== null) as ModuleIOEntry[];

      if (limit && limit > 0) {
        entries = entries.slice(-limit);
      }

      return entries;
    } catch (error) {
      this.error(
        'Failed to read session I/O file',
        { error: (error as Error).message, filePath },
        'readSessionIOFile'
      );
      return [];
    }
  }

  // ========================================
  // Pipeline I/O Tracking Methods
  // ========================================

  /**
   * Update pipeline I/O configuration
   * @param config - New pipeline I/O configuration
   */
  public updatePipelineIOConfig(config: Partial<PipelineIOConfig>): void {
    this.pipelineIOConfig = { ...this.pipelineIOConfig, ...config };
    this.config.pipelineIO = { ...this.pipelineIOConfig };
    this.log('info', 'Pipeline I/O configuration updated', config, 'updatePipelineIOConfig');
  }

  /**
   * Get current pipeline I/O configuration
   */
  public getPipelineIOConfig(): PipelineIOConfig {
    return { ...this.pipelineIOConfig };
  }

  /**
   * Record pipeline start
   * @param pipelineId - Pipeline ID
   * @param pipelineName - Pipeline name
   * @param input - Input data
   * @param context - Optional context information
   */
  public recordPipelineStart(
    pipelineId: string,
    pipelineName: string,
    input: any,
    context?: Record<string, any>
  ): void {
    if (!this.pipelineIOConfig.enabled || !this.pipelineIOConfig.autoRecordPipelineStart) return;

    const pipelineEntry: PipelineIOEntry = {
      timestamp: Date.now(),
      pipelineId,
      pipelineName,
      moduleId: 'system',
      operationId: `${pipelineId}_start`,
      operationType: 'pipeline_start',
      input,
      success: true,
      context: {
        ...context,
        phase: 'start',
        stage: 0,
      },
    };

    this.addPipelineEntry(pipelineEntry);
    this.log(
      'info',
      `Pipeline started: ${pipelineName}`,
      { pipelineId, pipelineName, inputSize: JSON.stringify(input).length },
      'recordPipelineStart'
    );
  }

  /**
   * Record pipeline end
   * @param pipelineId - Pipeline ID
   * @param pipelineName - Pipeline name
   * @param output - Output data
   * @param success - Whether pipeline was successful
   * @param error - Error message if failed
   * @param context - Optional context information
   */
  public recordPipelineEnd(
    pipelineId: string,
    pipelineName: string,
    output: any,
    success: boolean = true,
    error?: string,
    context?: Record<string, any>
  ): void {
    if (!this.pipelineIOConfig.enabled || !this.pipelineIOConfig.autoRecordPipelineEnd) return;

    const pipelineEntry: PipelineIOEntry = {
      timestamp: Date.now(),
      pipelineId,
      pipelineName,
      moduleId: 'system',
      operationId: `${pipelineId}_end`,
      operationType: 'pipeline_end',
      output,
      success,
      error,
      context: {
        ...context,
        phase: 'end',
        stage: 999,
      },
    };

    this.addPipelineEntry(pipelineEntry);
    this.log(
      'info',
      `Pipeline ended: ${pipelineName}`,
      { pipelineId, pipelineName, success, outputSize: JSON.stringify(output).length },
      'recordPipelineEnd'
    );
  }

  /**
   * Record pipeline module operation
   * @param pipelineId - Pipeline ID
   * @param pipelineName - Pipeline name
   * @param moduleId - Module ID
   * @param operationId - Operation ID
   * @param input - Input data
   * @param output - Output data
   * @param method - Method name
   * @param success - Whether operation was successful
   * @param error - Error message if failed
   * @param context - Optional context information
   */
  public recordPipelineOperation(
    pipelineId: string,
    pipelineName: string,
    moduleId: string,
    operationId: string,
    input: any,
    output: any,
    method?: string,
    success: boolean = true,
    error?: string,
    context?: Record<string, any>
  ): void {
    if (!this.pipelineIOConfig.enabled || !this.pipelineIOConfig.recordAllOperations) return;

    const pipelineEntry: PipelineIOEntry = {
      timestamp: Date.now(),
      pipelineId,
      pipelineName,
      moduleId,
      operationId,
      operationType: 'module_operation',
      input,
      output,
      success,
      error,
      method,
      context: {
        ...context,
        phase: 'execution',
      },
    };

    this.addPipelineEntry(pipelineEntry);
  }

  /**
   * Record pipeline data transfer
   * @param pipelineId - Pipeline ID
   * @param pipelineName - Pipeline name
   * @param fromModule - Source module ID
   * @param toModule - Target module ID
   * @param data - Transferred data
   * @param context - Optional context information
   */
  public recordPipelineTransfer(
    pipelineId: string,
    pipelineName: string,
    fromModule: string,
    toModule: string,
    data: any,
    context?: Record<string, any>
  ): void {
    if (!this.pipelineIOConfig.enabled || !this.pipelineIOConfig.recordAllOperations) return;

    const pipelineEntry: PipelineIOEntry = {
      timestamp: Date.now(),
      pipelineId,
      pipelineName,
      moduleId: fromModule,
      operationId: `transfer_${fromModule}_to_${toModule}`,
      operationType: 'data_transfer',
      input: data,
      output: { transferredTo: toModule },
      success: true,
      context: {
        ...context,
        phase: 'transfer',
        previousOperation: fromModule,
        nextOperation: toModule,
      },
    };

    this.addPipelineEntry(pipelineEntry);
  }

  /**
   * Add pipeline entry to storage and save to file
   * @param entry - Pipeline entry to add
   */
  private addPipelineEntry(entry: PipelineIOEntry): void {
    // Add to in-memory entries
    this.pipelineEntries.push(entry);
    if (this.pipelineEntries.length > this.pipelineIOConfig.maxPipelineOperationsPerFile) {
      this.pipelineEntries = this.pipelineEntries.slice(-this.pipelineIOConfig.maxPipelineOperationsPerFile);
    }

    // Save to pipeline session file
    this.savePipelineEntryToFile(entry);
  }

  /**
   * Save pipeline entry to file
   * @param entry - Pipeline entry to save
   */
  private savePipelineEntryToFile(entry: PipelineIOEntry): void {
    try {
      const pipelineDir = this.pipelineIOConfig.pipelineDirectory.replace('~', process.env.HOME || '');
      const sessionFilePath = path.join(pipelineDir, this.pipelineIOConfig.pipelineSessionFileName);

      // Create file entry with timestamp and formatting
      const fileEntry = {
        ...entry,
        savedAt: Date.now(),
        format: 'pipeline-operation',
      };

      const sessionLine = JSON.stringify(fileEntry) + '\n';
      fs.appendFileSync(sessionFilePath, sessionLine);
    } catch (error) {
      this.error(
        'Failed to save pipeline entry to file',
        { error: (error as Error).message },
        'savePipelineEntryToFile'
      );
    }
  }

  /**
   * Get pipeline entries
   * @param pipelineId - Optional filter by pipeline ID
   * @param operationType - Optional filter by operation type
   * @param limit - Optional limit on number of entries
   */
  public getPipelineEntries(
    pipelineId?: string,
    operationType?: string,
    limit?: number
  ): PipelineIOEntry[] {
    let entries = [...this.pipelineEntries];

    if (pipelineId) {
      entries = entries.filter((entry) => entry.pipelineId === pipelineId);
    }

    if (operationType) {
      entries = entries.filter((entry) => entry.operationType === operationType);
    }

    if (limit && limit > 0) {
      entries = entries.slice(-limit);
    }

    return entries;
  }

  /**
   * Clear pipeline entries
   */
  public clearPipelineEntries(): void {
    this.pipelineEntries = [];
  }

  /**
   * Get pipeline I/O files
   */
  public getPipelineFiles(): string[] {
    try {
      const pipelineDir = this.pipelineIOConfig.pipelineDirectory.replace('~', process.env.HOME || '');
      if (!fs.existsSync(pipelineDir)) return [];

      return fs
        .readdirSync(pipelineDir)
        .filter((file) => file.endsWith('.jsonl'))
        .map((file) => path.join(pipelineDir, file));
    } catch (error) {
      this.error('Failed to get pipeline files', { error: (error as Error).message }, 'getPipelineFiles');
      return [];
    }
  }

  /**
   * Read pipeline I/O file
   * @param filePath - Pipeline file path
   * @param limit - Optional limit on number of entries
   */
  public readPipelineFile(filePath: string, limit?: number): PipelineIOEntry[] {
    try {
      if (!fs.existsSync(filePath)) {
        return [];
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.trim().split('\n');

      let entries = lines
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter((entry) => entry !== null) as PipelineIOEntry[];

      if (limit && limit > 0) {
        entries = entries.slice(-limit);
      }

      return entries;
    } catch (error) {
      this.error('Failed to read pipeline file', { error: (error as Error).message }, 'readPipelineFile');
      return [];
    }
  }

  /**
   * Enable or disable pipeline I/O tracking
   * @param enabled - Whether to enable pipeline I/O tracking
   */
  public setPipelineIOEnabled(enabled: boolean): void {
    this.pipelineIOConfig.enabled = enabled;
    this.log(
      'info',
      `Pipeline I/O tracking ${enabled ? 'enabled' : 'disabled'}`,
      {},
      'setPipelineIOEnabled'
    );
  }

  /**
   * Enable or disable auto recording of pipeline start/end
   * @param autoRecord - Whether to auto record pipeline start/end
   */
  public setAutoRecordPipeline(autoRecord: boolean): void {
    this.pipelineIOConfig.autoRecordPipelineStart = autoRecord;
    this.pipelineIOConfig.autoRecordPipelineEnd = autoRecord;
    this.log(
      'info',
      `Auto record pipeline ${autoRecord ? 'enabled' : 'disabled'}`,
      {},
      'setAutoRecordPipeline'
    );
  }

  /**
   * Enable or disable recording all pipeline operations
   * @param recordAll - Whether to record all pipeline operations
   */
  public setRecordAllOperations(recordAll: boolean): void {
    this.pipelineIOConfig.recordAllOperations = recordAll;
    this.log(
      'info',
      `Record all operations ${recordAll ? 'enabled' : 'disabled'}`,
      {},
      'setRecordAllOperations'
    );
  }

  /**
   * Set pipeline session file name
   * @param fileName - Pipeline session file name
   */
  public setPipelineSessionFileName(fileName: string): void {
    this.pipelineIOConfig.pipelineSessionFileName = fileName;
    this.log('info', `Pipeline session file name set to: ${fileName}`, {}, 'setPipelineSessionFileName');
  }

  /**
   * Create a pipeline-specific session file
   * @param pipelineId - Pipeline ID
   * @param pipelineName - Pipeline name
   * @returns Session file path
   */
  public createPipelineSessionFile(pipelineId: string, pipelineName: string): string {
    try {
      const pipelineDir = this.pipelineIOConfig.pipelineDirectory.replace('~', process.env.HOME || '');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${pipelineId}_${pipelineName}_${timestamp}.jsonl`;
      const filePath = path.join(pipelineDir, fileName);

      // Create empty file
      fs.writeFileSync(filePath, '');

      this.log(
        'info',
        `Pipeline session file created: ${fileName}`,
        { pipelineId, pipelineName, filePath },
        'createPipelineSessionFile'
      );

      return filePath;
    } catch (error) {
      this.error(
        'Failed to create pipeline session file',
        { error: (error as Error).message },
        'createPipelineSessionFile'
      );
      throw error;
    }
  }

  /**
   * Export pipeline data to a structured format
   * @param pipelineId - Pipeline ID to export
   * @param format - Export format ('json' | 'csv')
   * @returns Exported data as string
   */
  public exportPipelineData(pipelineId: string, format: 'json' | 'csv' = 'json'): string {
    const entries = this.getPipelineEntries(pipelineId);

    if (format === 'json') {
      return JSON.stringify(entries, null, 2);
    } else if (format === 'csv') {
      // Convert to CSV format
      const headers = [
        'timestamp', 'pipelineId', 'pipelineName', 'moduleId', 'operationId',
        'operationType', 'success', 'method', 'duration', 'error'
      ];

      const rows = entries.map(entry => [
        entry.timestamp,
        entry.pipelineId,
        entry.pipelineName || '',
        entry.moduleId,
        entry.operationId,
        entry.operationType,
        entry.success,
        entry.method || '',
        entry.duration || '',
        entry.error || ''
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    throw new Error(`Unsupported export format: ${format}`);
  }
}
