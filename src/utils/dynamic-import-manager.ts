/**
 * DynamicImportManager - Type-safe dynamic import management
 * Provides safe, validated dynamic imports with fallback strategies
 */

import path from 'path';
import fs from 'fs-extra';
import { safeJson } from './safe-json';
import { DynamicImportResult, ImportValidator, RccError } from '../types';

/**
 * Import strategy options
 */
export interface ImportStrategy {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  fallbackPriority?: 'npm' | 'local' | 'remote';
  caching?: boolean;
  validation?: 'strict' | 'loose' | 'none';
  errorRecovery?: 'throw' | 'log' | 'silent';
}

/**
 * Module meta information
 */
export interface ModuleMeta {
  name: string;
  version: string;
  type: 'npm' | 'local' | 'remote';
  path: string;
  dependencies: string[];
  exports: string[];
  lastModified: number;
  size: number;
}

/**
 * Import attempt result
 */
export interface ImportAttempt {
  success: boolean;
  module?: any;
  error?: Error;
  strategy: string;
  duration: number;
  metadata?: ModuleMeta;
}

/**
 * Dynamic import cache
 */
export class ImportCache {
  private cache = new Map<string, { module: any; timestamp: number; ttl: number }>();
  private defaultTtl = 5 * 60 * 1000; // 5 minutes

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.module;
  }

  set(key: string, module: any, ttl?: number): void {
    this.cache.set(key, {
      module,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    return this.cache.has(key) && this.get(key) !== undefined;
  }
}

/**
 * Dynamic import manager with type safety
 */
export class DynamicImportManager {
  private static instance: DynamicImportManager;
  private cache: ImportCache;
  private importStrategies: ImportStrategy[] = [];
  private fallbackModules: Map<string, any> = new Map();
  private buildCache: Map<string, boolean> = new Map();

  private constructor() {
    this.cache = new ImportCache();
    this.setupDefaultImportStrategies();
  }

  /**
   * Singleton instance getter
   */
  static getInstance(): DynamicImportManager {
    if (!DynamicImportManager.instance) {
      DynamicImportManager.instance = new DynamicImportManager();
    }
    return DynamicImportManager.instance;
  }

  /**
   * Type-safe dynamic import with validation and fallback
   */
  async import<T = any>(
    modulePath: string,
    options: {
      validator?: ImportValidator<T>;
      fallback?: () => Promise<T>;
      required?: boolean;
      timeout?: number;
      retryAttempts?: number;
      strategy?: ImportStrategy;
      cacheKey?: string;
      metadata?: boolean;
      deferValidation?: boolean;
    } = {}
  ): Promise<T> {
    const {
      validator,
      fallback,
      required = true,
      timeout = 30000,
      retryAttempts = 2,
      strategy = {},
      cacheKey,
      metadata = false,
      deferValidation = false,
    } = options;

    const effectiveKey = cacheKey || this.generateCacheKey(modulePath);

    // Check cache first
    if (this.cache.has(effectiveKey)) {
      const cachedModule = this.cache.get<T>(effectiveKey);
      if (cachedModule) {
        if (!deferValidation && validator) {
          if (validator(cachedModule)) {
            return cachedModule;
          } else {
            console.warn('Cached module failed validation, re-importing...');
            this.cache.clear();
          }
        } else {
          return cachedModule;
        }
      }
    }

    const importResult = await this.performImportWithRetry<T>(
      modulePath,
      validator,
      required,
      timeout,
      retryAttempts,
      strategy
    );

    if (importResult.success && importResult.module !== undefined) {
      // Cache successful import
      this.cache.set(effectiveKey, importResult.module);
      return importResult.module;
    }

    // Try fallback if provided
    if (fallback) {
      try {
        const fallbackResult = await fallback();
        if (!deferValidation && validator) {
          if (validator(fallbackResult)) {
            return fallbackResult;
          } else {
            throw new Error('Fallback module validation failed');
          }
        }
        return fallbackResult;
      } catch (fallbackError) {
        console.warn(
          'Fallback import failed:',
          fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        );
      }
    }

    if (required) {
      throw new Error(
        `Import failed: ${importResult.error?.message || 'Unknown error'}. ` +
          `Module: ${modulePath}. ` +
          `Tried ${retryAttempts + 1} times with timeout ${timeout}ms.`
      );
    }

    return null as any;
  }

  /**
   * Build and import a module (for TypeScript builds)
   */
  async buildAndImport<T = any>(
    modulePath: string,
    buildCommand: string,
    options: {
      workingDirectory?: string;
      cleanup?: boolean;
      timeout?: number;
      validator?: ImportValidator<T>;
      cacheKey?: string;
    } = {}
  ): Promise<T> {
    const {
      workingDirectory = process.cwd(),
      cleanup = false,
      timeout = 60000,
      validator,
      cacheKey,
    } = options;

    const buildKey = this.generateBuildKey(modulePath, buildCommand);

    // Skip if already built recently
    if (this.buildCache.has(buildKey)) {
      return this.import<T>(modulePath, { validator: validator ?? undefined, cacheKey } as any);
    }

    try {
      console.log(`🔨 Building module: ${modulePath}`);

      const { execSync } = await import('child_process');
      const startTime = Date.now();

      // Execute build command
      const result = execSync(buildCommand, {
        cwd: workingDirectory,
        encoding: 'utf8',
        timeout,
        stdio: cleanup ? 'pipe' : 'inherit',
      });

      const buildTime = Date.now() - startTime;
      console.log(`✅ Build completed in ${buildTime}ms`);

      // Mark as built
      this.buildCache.set(buildKey, true);

      // Clean up old cache entries for this path
      this.clearCacheForPath(modulePath);

      // Import the newly built module
      return this.import<T>(modulePath, { validator: validator ?? undefined, cacheKey } as any);
    } catch (buildError) {
      const errorMessage = buildError instanceof Error ? buildError.message : String(buildError);
      console.error(`❌ Build failed: ${errorMessage}`);
      throw new Error(`Failed to build module ${modulePath}: ${errorMessage}`);
    }
  }

  /**
   * Validate module against schema or custom validator
   */
  async validateModule<T>(
    module: T,
    validator?: ImportValidator<T>
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (validator) {
      try {
        if (!validator(module)) {
          errors.push('Custom validator rejected module');
        }
      } catch (validationError) {
        errors.push(
          `Validation error: ${validationError instanceof Error ? validationError.message : String(validationError)}`
        );
      }
    }

    // Basic structure validation
    if (this.hasValidModuleStructure(module)) {
      // Additional validation can be added here
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get module metadata information
   */
  async getModuleMeta(modulePath: string): Promise<ModuleMeta | null> {
    try {
      const realPath = await this.resolveModulePath(modulePath);
      if (!realPath) return null;

      const stats = fs.statSync(realPath);
      const content = fs.readFileSync(realPath, 'utf8');

      // Basic metadata extraction
      const meta: ModuleMeta = {
        name: path.basename(realPath, path.extname(realPath)),
        version: this.extractVersionFromContent(content) || 'unknown',
        type: this.determineModuleType(realPath),
        path: realPath,
        dependencies: this.extractDependencies(content),
        exports: this.extractExports(content),
        lastModified: stats.mtimeMs,
        size: stats.size,
      };

      return meta;
    } catch (error) {
      console.warn(
        `Failed to get metadata for ${modulePath}:`,
        error instanceof Error ? error.message : String(error)
      );
      return null;
    }
  }

  /**
   * Setup default import strategies
   */
  private setupDefaultImportStrategies(): void {
    this.importStrategies = [
      {
        timeout: 30000,
        retryAttempts: 2,
        retryDelay: 1000,
        fallbackPriority: 'local',
        caching: true,
        validation: 'strict',
        errorRecovery: 'log',
      },
      {
        timeout: 15000,
        retryAttempts: 1,
        retryDelay: 500,
        fallbackPriority: 'npm',
        caching: false,
        validation: 'loose',
        errorRecovery: 'throw',
      },
    ];
  }

  /**
   * Perform import with retry logic
   */
  private async performImportWithRetry<T = any>(
    modulePath: string,
    validator?: ImportValidator<T>,
    required: boolean = true,
    timeout: number = 30000,
    retryAttempts: number = 2,
    strategy?: ImportStrategy
  ): Promise<{ success: boolean; module?: T; error?: Error }> {
    const attempts: ImportAttempt[] = [];

    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      const startTime = Date.now();

      try {
        const importFn = this.createImportWithTimeout<T>(modulePath, timeout);
        const module = await importFn();

        const duration = Date.now() - startTime;

        let valid = true;
        if (validator) {
          valid = validator(module);
          if (!valid && attempt < retryAttempts) {
            console.warn(`Module validation failed on attempt ${attempt + 1}, retrying...`);
          }
        }

        if (valid) {
          attempts.push({
            success: true,
            module,
            strategy: 'import',
            duration,
          });

          return { success: true, module };
        }
      } catch (error) {
        const duration = Date.now() - startTime;

        attempts.push({
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
          strategy: 'import',
          duration,
        });

        if (attempt < retryAttempts) {
          const delay = 1000 * Math.pow(2, attempt); // Exponential backoff
          console.warn(
            `Import attempt ${attempt + 1} failed, retrying in ${delay}ms: ${error instanceof Error ? error.message : String(error)}`
          );
          await this.delay(delay);
        }
      }
    }

    // If all attempts failed, return last attempt details
    const lastAttempt = attempts[attempts.length - 1];
    return {
      success: false,
      error:
        lastAttempt?.error ||
        new Error(`All import attempts failed after ${retryAttempts + 1} tries`),
    };
  }

  /**
   * Create import function with timeout
   */
  private createImportWithTimeout<T>(modulePath: string, timeout: number): () => Promise<T> {
    return async () => {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error(`Import timeout (${timeout}ms) for ${modulePath}`)),
          timeout
        );
      });

      const importPromise = this.performImport<T>(modulePath);

      return Promise.race([importPromise, timeoutPromise]);
    };
  }

  /**
   * Perform the actual import
   */
  private async performImport<T>(modulePath: string): Promise<T> {
    try {
      // Handle npm packages vs local files
      if (this.isNpmPackage(modulePath)) {
        return this.importNpmPackage<T>(modulePath);
      } else {
        return this.importLocalFile<T>(modulePath);
      }
    } catch (error) {
      throw new Error(
        `Import failed for ${modulePath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Import NPM package with module resolution
   */
  private async importNpmPackage<T>(packageName: string): Promise<T> {
    try {
      const module = await import(packageName);
      return module;
    } catch (error) {
      throw new Error(
        `NPM package import failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Import local file with path resolution
   */
  private async importLocalFile<T>(filePath: string): Promise<T> {
    const resolvedPath = this.resolveLocalFilePath(filePath);

    try {
      const module = await import(resolvedPath);
      return module;
    } catch (error) {
      throw new Error(
        `Local file import failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Basic module structure validation
   */
  private hasValidModuleStructure(module: any): boolean {
    if (module === null || module === undefined) {
      return false;
    }

    // Check for common module patterns
    const hasDefaultExport = module.default !== undefined;
    const hasNamedExports = Object.keys(module).length > 1;
    const hasRequiredFunctions =
      typeof module === 'function' || (typeof module === 'object' && module !== null);

    return hasRequiredFunctions || hasDefaultExport || hasNamedExports;
  }

  /**
   * Determine if module path is an NPM package
   */
  private isNpmPackage(modulePath: string): boolean {
    return (
      !modulePath.startsWith('.') && !modulePath.startsWith('/') && !path.isAbsolute(modulePath)
    );
  }

  /**
   * Resolve local file path with extensions and directory support
   */
  private resolveLocalFilePath(filePath: string): string {
    const extensions = ['.js', '.mjs', '.ts', '.json'];
    const resolved = path.resolve(filePath);

    // Check direct path first
    if (fs.existsSync(resolved)) {
      return resolved;
    }

    // Try with extensions
    for (const ext of extensions) {
      const pathWithExt = resolved + ext;
      if (fs.existsSync(pathWithExt)) {
        return pathWithExt;
      }
    }

    // Try directory index files
    for (const ext of extensions) {
      const indexPath = path.join(resolved, 'index' + ext);
      if (fs.existsSync(indexPath)) {
        return indexPath;
      }
    }

    throw new Error(`Cannot resolve module: ${filePath}`);
  }

  /**
   * Resolve actual module path
   */
  private async resolveModulePath(modulePath: string): Promise<string | null> {
    try {
      if (modulePath.startsWith('.')) {
        return path.resolve(process.cwd(), modulePath);
      }

      if (path.isAbsolute(modulePath)) {
        return modulePath;
      }

      // For absolute paths, check if file exists
      if (fs.existsSync(modulePath)) {
        return modulePath;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract version from module content
   */
  private extractVersionFromContent(content: string): string | null {
    const versionRegex = /version\s*[=:]\s*["']([0-9]+\.[0-9]+\.[0-9]+[^"']*)["']/i;
    const match = content.match(versionRegex);
    return match ? (match[1] as string) : null;
  }

  /**
   * Extract dependencies from module content
   */
  private extractDependencies(content: string): string[] {
    const importRegex = /import\s+.*\s+from\s+["']([^"']+)["']/g;
    const requireRegex = /require\s*\(\s*["']([^"']+)["']\s*\)/g;

    const dependencies = new Set<string>();

    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const moduleName = match[1];
      if (moduleName && !this.isLocalImport(moduleName)) {
        dependencies.add(moduleName);
      }
    }

    while ((match = requireRegex.exec(content)) !== null) {
      const moduleName = match[1];
      if (moduleName && !this.isLocalImport(moduleName)) {
        dependencies.add(moduleName);
      }
    }

    return Array.from(dependencies);
  }

  /**
   * Extract exports from module content
   */
  private extractExports(content: string): string[] {
    const exportRegex =
      /export\s+(?:default|class|function|const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    const exports = new Set<string>();

    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      if (match[1]) {
        exports.add(match[1]);
      }
    }

    return Array.from(exports);
  }

  /**
   * Determine module type
   */
  private determineModuleType(filePath: string): 'npm' | 'local' | 'remote' {
    if (filePath.includes('node_modules')) {
      return 'npm';
    } else if (filePath.startsWith('http')) {
      return 'remote';
    }
    return 'local';
  }

  /**
   * Check if import is local file
   */
  private isLocalImport(moduleName: string): boolean {
    return moduleName.startsWith('.') || moduleName.startsWith('/') || path.isAbsolute(moduleName);
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(modulePath: string): string {
    const resolved = this.resolveLocalFilePath(modulePath);
    const stats = fs.statSync(resolved);
    return `${modulePath}:${stats.mtimeMs}:${stats.size}`;
  }

  /**
   * Generate build key
   */
  private generateBuildKey(modulePath: string, buildCommand: string): string {
    return `${modulePath}:${buildCommand}:${this.resolveLocalFilePath(modulePath)}`;
  }

  /**
   * Clear cache for specific path
   */
  private clearCacheForPath(modulePath: string): void {
    const keysToDelete = [...this.cache['cache'].keys()].filter((key) =>
      key.startsWith(modulePath)
    );
    keysToDelete.forEach((key) => this.cache.clear());
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const dynamicImportManager = DynamicImportManager.getInstance();
