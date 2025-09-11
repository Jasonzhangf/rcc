/**
 * Logger for RCC CLI Framework
 */

import fs from 'fs';
import path from 'path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerOptions {
  level: LogLevel;
  file?: string;
  console?: boolean;
  timestamp?: boolean;
}

export class Logger {
  private level: LogLevel;
  private file?: string;
  private console: boolean;
  private timestamp: boolean;
  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  constructor(options: LoggerOptions) {
    this.level = options.level;
    this.file = options.file;
    this.console = options.console !== false;
    this.timestamp = options.timestamp !== false;

    // Create log directory if file logging is enabled
    if (this.file) {
      const logDir = path.dirname(this.file);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (this.levels[level] < this.levels[this.level]) {
      return;
    }

    const timestamp = this.timestamp ? new Date().toISOString() : '';
    const prefix = timestamp ? `[${timestamp}] ` : '';
    const logLevel = `[${level.toUpperCase()}]`;
    const logMessage = `${prefix}${logLevel} ${message}`;
    
    let fullMessage = logMessage;
    if (data) {
      fullMessage += ` ${JSON.stringify(data)}`;
    }

    // Console output
    if (this.console) {
      switch (level) {
        case 'debug':
          console.debug(this.colorize(logMessage, 'gray'), data || '');
          break;
        case 'info':
          console.info(this.colorize(logMessage, 'blue'), data || '');
          break;
        case 'warn':
          console.warn(this.colorize(logMessage, 'yellow'), data || '');
          break;
        case 'error':
          console.error(this.colorize(logMessage, 'red'), data || '');
          break;
      }
    }

    // File output
    if (this.file) {
      try {
        fs.appendFileSync(this.file, fullMessage + '\n', 'utf8');
      } catch (error) {
        console.error('Failed to write to log file:', (error as Error).message);
      }
    }
  }

  private colorize(text: string, color: string): string {
    const colors: Record<string, string> = {
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      gray: '\x1b[90m',
      reset: '\x1b[0m'
    };

    return `${colors[color] || ''}${text}${colors.reset}`;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }
}