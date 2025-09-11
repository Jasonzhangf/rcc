import { DebugConfig, DebugLevel } from '../basemodule/src/BaseModule';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Two-phase debug configuration system
 * Phase 1: systemstart (before port initialization)
 * Phase 2: port-specific (after port initialization)
 */
export interface TwoPhaseDebugConfig {
  /**
   * Current debug phase
   */
  phase: 'systemstart' | 'port';

  /**
   * Base debug directory
   */
  baseDirectory: string;

  /**
   * System start phase directory
   */
  systemStartDirectory: string;

  /**
   * Port-specific directory (set after port initialization)
   */
  portDirectory?: string;

  /**
   * Current port number
   */
  port?: number;

  /**
   * Whether to enable file logging
   */
  enableFileLogging: boolean;

  /**
   * Whether to enable console logging
   */
  enableConsoleLogging: boolean;

  /**
   * Maximum log file size in bytes
   */
  maxFileSize: number;

  /**
   * Maximum number of log files to keep
   */
  maxLogFiles: number;

  /**
   * Whether debug logging is enabled
   */
  enabled: boolean;

  /**
   * Minimum log level to output
   */
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error';

  /**
   * Whether to record call stacks
   */
  recordStack: boolean;

  /**
   * Maximum number of log entries to keep in memory
   */
  maxLogEntries: number;

  /**
   * Whether to output to console
   */
  consoleOutput: boolean;

  /**
   * Whether to track data flow
   */
  trackDataFlow: boolean;
}

/**
 * Debug system configuration for two-phase logging
 */
export class TwoPhaseDebugSystem {
  private config: TwoPhaseDebugConfig;
  private currentLogFile?: string;
  private logEntries: string[] = [];

  constructor(baseDirectory: string = './debug-logs') {
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
      // Create base directory
      if (!fs.existsSync(this.config.baseDirectory)) {
        fs.mkdirSync(this.config.baseDirectory, { recursive: true });
      }

      // Create system start directory
      if (!fs.existsSync(this.config.systemStartDirectory)) {
        fs.mkdirSync(this.config.systemStartDirectory, { recursive: true });
      }

      this.log('info', 'Debug directories initialized', {
        baseDirectory: this.config.baseDirectory,
        systemStartDirectory: this.config.systemStartDirectory,
      });
    } catch (error) {
      console.error('Failed to initialize debug directories:', error);
    }
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
    if (!fs.existsSync(this.config.portDirectory)) {
      fs.mkdirSync(this.config.portDirectory, { recursive: true });
    }

    this.log('info', 'Debug system switched to port mode', {
      port,
      portDirectory: this.config.portDirectory,
    });
  }

  /**
   * Get current log directory
   */
  public getCurrentLogDirectory(): string {
    return this.config.phase === 'systemstart'
      ? this.config.systemStartDirectory
      : this.config.portDirectory || this.config.systemStartDirectory;
  }

  /**
   * Get current log file path
   */
  public getCurrentLogFilePath(): string {
    const directory = this.getCurrentLogDirectory();
    const date = new Date().toISOString().split('T')[0];
    return path.join(directory, `${date}.jsonl`);
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

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data: data || null,
      method: method || null,
      phase: this.config.phase,
      port: this.config.port || null,
      directory: this.getCurrentLogDirectory(),
    };

    // Console output
    if (this.config.enableConsoleLogging) {
      const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.config.phase}]${method ? ` [${method}]` : ''}`;
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
  private writeToFile(logEntry: any): void {
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
      const date = new Date().toISOString().split('T')[0];

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
   * Get configuration
   */
  public getConfig(): TwoPhaseDebugConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
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
  public readLogFile(filePath: string, limit?: number): any[] {
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
        this.config.systemStartDirectory,
        ...(this.config.portDirectory ? [this.config.portDirectory] : []),
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

      this.log('info', 'Cleaned up old log files', { daysToKeep });
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }
}

// Global instance
export const twoPhaseDebugSystem = new TwoPhaseDebugSystem();
