/**
 * Simple debug system with configurable directory
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
}

/**
 * Simple debug system
 */
export class DebugSystem {
  private config: DebugConfig;
  private logs: DebugLogEntry[] = [];
  private logDirectory: string;
  private currentLogFile: string | null = null;

  constructor(logDirectory: string = '~/.rcc/debug') {
    this.logDirectory = logDirectory;
    this.config = {
      enabled: true,
      level: 'debug',
      recordStack: true,
      maxLogEntries: 1000,
      consoleOutput: true,
      trackDataFlow: true
    };
    this.ensureLogDirectory();
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDirectory(): void {
    const dir = this.logDirectory.replace('~', process.env.HOME || '');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Update log directory
   */
  public updateLogDirectory(newDirectory: string): void {
    this.logDirectory = newDirectory;
    this.ensureLogDirectory();
    this.currentLogFile = null;
  }

  /**
   * Set debug configuration
   */
  public setConfig(config: Partial<DebugConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): DebugConfig {
    return { ...this.config };
  }

  /**
   * Get current log directory
   */
  public getLogDirectory(): string {
    return this.logDirectory;
  }

  /**
   * Log a message
   */
  public log(level: DebugLevel, message: string, data?: any, method?: string): void {
    if (!this.config.enabled) {
      return;
    }

    const levelOrder: DebugLevel[] = ['trace', 'debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levelOrder.indexOf(this.config.level);
    const messageLevelIndex = levelOrder.indexOf(level);

    if (messageLevelIndex < currentLevelIndex) {
      return;
    }

    const entry: DebugLogEntry = {
      timestamp: Date.now(),
      level,
      message,
      method,
      data
    };

    if (data !== undefined) {
      entry.data = data;
    }

    if (this.config.recordStack && level === 'error') {
      try {
        throw new Error('Stack trace');
      } catch (e: unknown) {
        if (e instanceof Error) {
          entry.stack = e.stack || undefined;
        }
      }
    }

    this.logs.push(entry);
    if (this.logs.length > this.config.maxLogEntries) {
      this.logs = this.logs.slice(-this.config.maxLogEntries);
    }

    if (this.config.consoleOutput) {
      const timestamp = new Date(entry.timestamp).toISOString();
      const prefix = `[${timestamp}]${method ? ` [${method}]` : ''}`;
      
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

    this.writeToFile(entry);
  }

  /**
   * Write log entry to file
   */
  private writeToFile(entry: DebugLogEntry): void {
    const dir = this.logDirectory.replace('~', process.env.HOME || '');
    const date = new Date(entry.timestamp).toISOString().split('T')[0];
    const logFile = path.join(dir, `${date}.jsonl`);

    try {
      const logLine = JSON.stringify(entry) + '\n';
      fs.appendFileSync(logFile, logLine);
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }

  /**
   * Get log entries
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
}

// Global debug system instance
export const debugSystem = new DebugSystem();

/**
 * Initialize debug system with directory
 */
export function initializeDebugSystem(directory: string = '~/.rcc/debug'): DebugSystem {
  debugSystem.updateLogDirectory(directory);
  return debugSystem;
}

/**
 * Update debug directory
 */
export function updateDebugDirectory(newDirectory: string): void {
  debugSystem.updateLogDirectory(newDirectory);
}