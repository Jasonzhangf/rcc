import { ILogger } from '../types';

export interface SafeJsonOptions {
  pretty?: boolean;
  indent?: number;
  maxDepth?: number;
  circularRefHandler?: 'stringify' | 'replace' | 'throw';
}

export class SafeJson {
  private logger: ILogger;
  private defaultOptions: Required<SafeJsonOptions>;

  constructor(logger: ILogger, options: SafeJsonOptions = {}) {
    this.logger = logger;
    this.defaultOptions = {
      pretty: false,
      indent: 2,
      maxDepth: 100,
      circularRefHandler: 'replace',
      ...options
    };
  }

  stringify(data: unknown, options: SafeJsonOptions = {}): string {
    const finalOptions = { ...this.defaultOptions, ...options };

    try {
      const seen = new WeakSet();

      const replacer = (key: string, value: unknown): unknown => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            switch (finalOptions.circularRefHandler) {
              case 'stringify':
                return '[Circular]';
              case 'replace':
                return null;
              case 'throw':
                throw new Error(`Circular reference detected at key: ${key}`);
              default:
                return '[Circular]';
            }
          }
          seen.add(value);
        }
        return value;
      };

      if (finalOptions.pretty) {
        return JSON.stringify(data, replacer, finalOptions.indent);
      } else {
        return JSON.stringify(data, replacer);
      }

    } catch (error) {
      this.logger.error('Failed to stringify JSON:', error);
      throw new Error(`JSON stringification failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  parse<T = unknown>(jsonString: string): T {
    try {
      return JSON.parse(jsonString) as T;
    } catch (error) {
      this.logger.error('Failed to parse JSON:', error);
      throw new Error(`JSON parsing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  safeParse<T = unknown>(jsonString: string, defaultValue: T): T {
    try {
      return this.parse<T>(jsonString);
    } catch (error) {
      this.logger.warn('JSON parsing failed, using default value:', error);
      return defaultValue;
    }
  }

  validate(jsonString: string): { isValid: boolean; error?: string } {
    try {
      JSON.parse(jsonString);
      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  getStats(data: unknown): { size: string; keys?: number; type: string } {
    const jsonString = this.stringify(data);
    const size = this.formatBytes(jsonString.length);

    let keys: number | undefined;
    let type = typeof data;

    if (typeof data === 'object' && data !== null) {
      if (Array.isArray(data)) {
        type = 'array';
        keys = data.length;
      } else {
        type = 'object';
        keys = Object.keys(data).length;
      }
    }

    return { size, keys, type };
  }
}