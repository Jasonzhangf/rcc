import { ILogger } from '../types';

export interface DynamicImportOptions {
  timeout?: number;
  retries?: number;
  cache?: boolean;
}

export interface LoadedModule {
  module: unknown;
  path: string;
  timestamp: number;
}

export class DynamicImportManager {
  private logger: ILogger;
  private cache: Map<string, LoadedModule>;
  private defaultOptions: Required<DynamicImportOptions>;

  constructor(logger: ILogger, options: DynamicImportOptions = {}) {
    this.logger = logger;
    this.cache = new Map();
    this.defaultOptions = {
      timeout: 5000,
      retries: 3,
      cache: true,
      ...options
    };
  }

  async import<T = unknown>(modulePath: string, options: DynamicImportOptions = {}): Promise<T> {
    const finalOptions = { ...this.defaultOptions, ...options };

    if (finalOptions.cache && this.cache.has(modulePath)) {
      const cached = this.cache.get(modulePath)!;
      this.logger.debug(`Using cached module: ${modulePath}`);
      return cached.module as T;
    }

    this.logger.debug(`Importing module: ${modulePath}`);

    for (let attempt = 1; attempt <= finalOptions.retries; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Import timeout after ${finalOptions.timeout}ms`)), finalOptions.timeout);
        });

        const importPromise = import(modulePath);

        const module = await Promise.race([importPromise, timeoutPromise]);

        if (finalOptions.cache) {
          this.cache.set(modulePath, {
            module,
            path: modulePath,
            timestamp: Date.now()
          });
        }

        this.logger.debug(`Successfully imported module: ${modulePath}`);
        return module as T;

      } catch (error) {
        this.logger.warn(`Import attempt ${attempt} failed for ${modulePath}:`, error);

        if (attempt === finalOptions.retries) {
          throw new Error(`Failed to import module ${modulePath} after ${finalOptions.retries} attempts: ${error instanceof Error ? error.message : String(error)}`);
        }

        // Wait before retrying
        await this.delay(1000 * attempt);
      }
    }

    throw new Error('Unexpected error in import loop');
  }

  clearCache(): void {
    this.cache.clear();
    this.logger.debug('Module cache cleared');
  }

  getCacheStats(): { size: number; entries: Array<{ path: string; timestamp: number }> } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([path, data]) => ({
        path,
        timestamp: data.timestamp
      }))
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}