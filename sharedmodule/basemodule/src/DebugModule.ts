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
}

/**
 * Integrated debug system with two-phase logging
 */
export class DebugModule {
  private config: TwoPhaseDebugConfig;
  private logs: DebugLogEntry[] = [];
  // private currentLogFile: string | null = null; // Reserved for future use

  constructor(baseDirectory: string = '~/.rcc/debug') {
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

      // Create base directory
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }

      // Create system start directory
      if (!fs.existsSync(systemStartDir)) {
        fs.mkdirSync(systemStartDir, { recursive: true });
      }

      this.log('info', 'Debug directories initialized', {
        baseDirectory: baseDir,
        systemStartDirectory: systemStartDir,
      }, 'initializeDirectories');
    } catch (error) {
      console.error('Failed to initialize debug directories:', error);
    }
  }

  /**
   * Get current log directory
   */
  private getCurrentLogDirectory(): string {
    const directory = this.config.phase === 'systemstart'
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

    this.log('info', 'Debug system switched to port mode', {
      port,
      portDirectory: portDir,
    }, 'switchToPortMode');
  }

  /**
   * Update debug configuration
   * @param updates - Configuration updates
   */
  public updateConfig(updates: Partial<TwoPhaseDebugConfig>): void {
    this.config = { ...this.config, ...updates };

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
    
    this.log('info', 'Debug base directory updated', {
      newDirectory: newDirectory.replace('~', process.env.HOME || ''),
      systemStartDirectory: this.config.systemStartDirectory.replace('~', process.env.HOME || ''),
    }, 'updateBaseDirectory');
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
      logs = logs.filter(log => log.level === level);
    }
    
    if (limit && limit > 0) {
      logs = logs.slice(-limit);
    }
    
    return logs;
  }

  /**
   * Clear in-memory logs
   */
  public clearLogs(): void {
    this.logs = [];
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
        ...(this.config.portDirectory ? [this.config.portDirectory.replace('~', process.env.HOME || '')] : []),
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
    return this.getCurrentDirectory();
  }
}

