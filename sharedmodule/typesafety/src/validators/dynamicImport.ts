import { z } from 'zod';

/**
 * 动态导入验证错误
 */
export class DynamicImportError extends Error {
  constructor(
    message: string,
    public readonly modulePath: string,
    public readonly importError?: Error,
    public readonly phase: 'resolve' | 'load' | 'validate' = 'load'
  ) {
    super(message);
    this.name = 'DynamicImportError';
  }
}

/**
 * 导入验证错误
 */
export class ImportValidationError extends Error {
  constructor(
    message: string,
    public readonly modulePath: string,
    public readonly expectedExports: string[],
    public readonly actualExports: string[]
  ) {
    super(message);
    this.name = 'ImportValidationError';
  }
}

/**
 * 模块安全错误
 */
export class ModuleSecurityError extends Error {
  constructor(
    message: string,
    public readonly modulePath: string,
    public readonly securityIssue: string,
    public readonly recommendation: string
  ) {
    super(message);
    this.name = 'ModuleSecurityError';
  }
}

/**
 * 动态导入选项
 */
export interface DynamicImportOptions {
  /**
   * 模块路径验证模式
   */
  pathValidation?: 'strict' | 'loose' | 'none';

  /**
   * 允许的文件扩展名
   */
  allowedExtensions?: string[];

  /**
   * 必需的导出项
   */
  requiredExports?: string[];

  /**
   * 可选的导出项
   */
  optionalExports?: string[];

  /**
   * 类型验证模式
   */
  typeValidation?: 'strict' | 'loose' | 'none';

  /**
   * 安全检查等级
   */
  securityLevel?: 'high' | 'medium' | 'low';

  /**
   * 缓存策略
   */
  cacheStrategy?: 'memory' | 'filesystem' | 'none';

  /**
   * 超时时间（毫秒）
   */
  timeout?: number;

  /**
   * 重试次数
   */
  maxRetries?: number;

  /**
   * 沙箱模式
   */
  sandboxed?: boolean;

  /**
   * 允许的外部依赖
   */
  allowedDependencies?: string[];

  /**
   * 禁止的外部依赖
   */
  blockedDependencies?: string[];
}

/**
 * 模块验证结果
 */
export interface ModuleValidationResult {
  valid: boolean;
  module: any;
  errors: string[];
  warnings: string[];
  metadata: {
    path: string;
    loadTime: number;
    size: number;
    exports: string[];
    dependencies: string[];
    securityIssues: string[];
  };
}

/**
 * 安全的动态导入器
 */
export class SafeDynamicImport {
  private static instance: SafeDynamicImport;
  private moduleCache: Map<string, { module: any; loadTime: number; size: number }>;
  private importStats: Map<string, { success: number; failed: number; lastError?: string }>;

  private constructor() {
    this.moduleCache = new Map();
    this.importStats = new Map();
  }

  static getInstance(): SafeDynamicImport {
    if (!this.instance) {
      this.instance = new SafeDynamicImport();
    }
    return this.instance;
  }

  /**
   * 动态导入模块
   */
  async import<T = any>(
    modulePath: string,
    options: DynamicImportOptions = {}
  ): Promise<T> {
    const mergedOptions = {
      pathValidation: 'strict',
      securityLevel: 'medium',
      cacheStrategy: 'memory',
      timeout: 30000,
      maxRetries: 2,
      sandboxed: false,
      ...options
    };

    // 路径标准化和验证
    const normalizedPath = this.normalizePath(modulePath, mergedOptions);

    // 检查缓存
    if (mergedOptions.cacheStrategy === 'memory') {
      const cached = this.moduleCache.get(normalizedPath);
      if (cached) {
        return cached.module;
      }
    }

    // 路径安全检查
    this.performPathValidation(normalizedPath, mergedOptions);

    // 模块是否存在检查
    await this.checkModuleExists(normalizedPath);

    let retries = 0;
    let lastError: Error | undefined;

    while (retries <= mergedOptions.maxRetries) {
      try {
        // 执行导入
        const startTime = Date.now();

        let module: any;
        if (mergedOptions.sandboxed) {
          module = await this.sandboxedImport(normalizedPath, mergedOptions.timeout);
        } else {
          module = await this.timedImport(normalizedPath, mergedOptions.timeout);
        }

        const loadTime = Date.now() - startTime;

        // 导出验证
        this.validateExports(module, normalizedPath, mergedOptions);

        // 安全检查
        this.performSecurityChecks(module, normalizedPath, mergedOptions);

        // 依赖检查
        await this.validateDependencies(module, normalizedPath, mergedOptions);

        // 缓存结果
        const moduleSize = this.estimateModuleSize(module);
        this.moduleCache.set(normalizedPath, { module, loadTime, size: moduleSize });

        // 更新统计
        this.updateImportStats(normalizedPath, true);

        return module;

      } catch (error) {
        lastError = error as Error;
        this.updateImportStats(normalizedPath, false, lastError.message);

        if (retries === mergedOptions.maxRetries) {
          throw new DynamicImportError(
            `Failed to import module ${modulePath} after ${mergedOptions.maxRetries + 1} attempts: ${lastError.message}`,
            modulePath,
            lastError,
            'load'
          );
        }

        // 指数退避重试
        await this.delay(Math.pow(2, retries) * 1000);
        retries++;
      }
    }

    // 不应该到达这里
    throw new DynamicImportError(
      `Unexpected failure to import module ${modulePath}`,
      modulePath,
      lastError
    );
  }

  /**
   * 验证模块
   */
  async validateModule(
    modulePath: string,
    options: DynamicImportOptions = {}
  ): Promise<ModuleValidationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 尝试导入模块
      const module = await this.import(modulePath, options);
      const loadTime = Date.now() - startTime;

      // 提取模块元数据
      const exports = this.extractExports(module);
      const dependencies = await this.extractDependencies(modulePath);
      const size = this.estimateModuleSize(module);

      // 执行安全检查
      const securityIssues = this.checkSecurityIssues(module, modulePath, options);

      if (securityIssues.length > 0) {
        warnings.push(`Security issues detected: ${securityIssues.join(', ')}`);
      }

      // 验证必需导出
      if (options.requiredExports) {
        const missingExports = options.requiredExports.filter(exp => !exports.includes(exp));
        if (missingExports.length > 0) {
          errors.push(`Missing required exports: ${missingExports.join(', ')}`);
        }
      }

      return {
        valid: errors.length === 0,
        module,
        errors,
        warnings,
        metadata: {
          path: modulePath,
          loadTime,
          size,
          exports,
          dependencies,
          securityIssues
        }
      };

    } catch (error) {
      errors.push(`Module import failed: ${error instanceof Error ? error.message : String(error)}`);

      return {
        valid: false,
        module: null,
        errors,
        warnings,
        metadata: {
          path: modulePath,
          loadTime: Date.now() - startTime,
          size: 0,
          exports: [],
          dependencies: [],
          securityIssues: []
        }
      };
    }
  }

  /**
   * 批量导入模块
   */
  async importBatch<T extends Record<string, any>>(
    modulePaths: Record<string, string>,
    options: DynamicImportOptions = {}
  ): Promise<Record<keyof T, any>> {
    const results: Record<string, any> = {};
    const errors: Array<{ key: string; error: Error }> = [];

    // 创建所有导入任务
    const importPromises = Object.entries(modulePaths).map(async ([key, path]) => {
      try {
        const module = await this.import(path, options);
        results[key] = module;
      } catch (error) {
        errors.push({ key, error: error as Error });
      }
    });

    // 等待所有导入完成
    await Promise.allSettled(importPromises);

    // 如果有错误，收集并提供详细信息
    if (errors.length > 0) {
      const errorDetails = errors.map(({ key, error }) =>
        `${key}: ${error.message}`
      ).join(', ');

      throw new DynamicImportError(
        `Batch import failed for ${errors.length} modules: ${errorDetails}`,
        Object.keys(modulePaths).join(', ')
      );
    }

    return results as Record<keyof T, any>;
  }

  /**
   * 获取导入统计信息
   */
  getImportStats(): Record<string, { success: number; failed: number; lastError?: string }> {
    return new Map(this.importStats).entries().reduce((acc, [path, stats]) => {
      acc[path] = { ...stats };
      return acc;
    }, {} as Record<string, any>);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.moduleCache.clear();
  }

  // ===== 私有工具方法 =====

  private normalizePath(modulePath: string, options: Required<DynamicImportOptions>): string {
    // 基础路径规范化
    let normalized = modulePath.replace(/\\/g, '/');

    // 路径验证
    switch (options.pathValidation) {
      case 'strict':
        this.strictPathValidation(normalized);
        break;
      case 'loose':
        this.loosePathValidation(normalized);
        break;
      case 'none':
        // 不验证路径
        break;
    }

    // 扩展名检查
    if (options.allowedExtensions && options.allowedExtensions.length > 0) {
      const hasAllowedExtension = options.allowedExtensions.some(ext =>
        normalized.endsWith(ext)
      );

      if (!hasAllowedExtension) {
        throw new DynamicImportError(
          `Module path must have one of allowed extensions: ${options.allowedExtensions.join(', ')}`,
          modulePath
        );
      }
    }

    return normalized;
  }

  private strictPathValidation(path: string): void {
    // 检查路径遍历
    if (path.includes('..')) {
      throw new ModuleSecurityError(
        'Path traversal detected in module path',
        path,
        'path-traversal',
        'Use absolute paths or paths relative to project root'
      );
    }

    // 检查绝对路径
    if (!pathModule.isAbsolute(path) && !path.startsWith('.')) {
      throw new ModuleSecurityError(
        'Relative paths must start with ./ or ../ in strict mode',
        path,
        'relative-path-required',
        'Use relative paths starting with ./ or absolute paths'
      );
    }
  }

  private loosePathValidation(path: string): void {
    // 基本的危险模式检查
    const dangerousPatterns = [
      /[<>:"|?*]/,  // Windows 非法字符
      /\x00/,       // 空字符
      /\/\.\./       // 明显的路径遍历
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(path)) {
        throw new ModuleSecurityError(
          'Dangerous characters detected in module path',
          path,
          'dangerous-characters',
          'Remove dangerous characters from path'
        );
      }
    }
  }

  private async checkModuleExists(modulePath: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      await fs.access(modulePath);
    } catch (error) {
      throw new DynamicImportError(
        `Module not found or inaccessible: ${modulePath}`,
        modulePath
      );
    }
  }

  private async timedImport(modulePath: string, timeout: number): Promise<any> {
    const importPromise = import(modulePath);

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Import timeout after ${timeout}ms`)), timeout);
    });

    return Promise.race([importPromise, timeoutPromise]);
  }

  private async sandboxedImport(modulePath: string, timeout: number): Promise<any> {
    // 简化的沙箱导入实现
    // 在实际应用中，可能需要更复杂的沙箱机制
    try {
      const module = await this.timedImport(modulePath, timeout);

      // 创建代理来限制模块访问
      return this.createModuleProxy(module, modulePath);
    } catch (error) {
      throw new DynamicImportError(
        `Sandboxed import failed: ${error instanceof Error ? error.message : String(error)}`,
        modulePath
      );
    }
  }

  private createModuleProxy(module: any, modulePath: string): any {
    return new Proxy(module, {
      get(target, prop, receiver) {
        // 限制对某些危险属性的访问
        const dangerousProps = ['__proto__', 'constructor', 'prototype'];
        if (dangerousProps.includes(String(prop))) {
          throw new ModuleSecurityError(
            `Access to dangerous property ${String(prop)} is blocked`,
            modulePath,
            'dangerous-property-access',
            'Accessing this property is not allowed for security reasons'
          );
        }

        return Reflect.get(target, prop, receiver);
      }
    });
  }

  private validateExports(module: any, modulePath: string, options: Required<DynamicImportOptions>): void {
    if (!options.requiredExports || options.requiredExports.length === 0) {
      return;
    }

    const availableExports = Object.getOwnPropertyNames(module);
    const missingExports = options.requiredExports.filter(exp => !availableExports.includes(exp));

    if (missingExports.length > 0) {
      throw new ImportValidationError(
        `Module is missing required exports: ${missingExports.join(', ')}`,
        modulePath,
        options.requiredExports,
        availableExports
      );
    }
  }

  private performSecurityChecks(module: any, modulePath: string, options: Required<DynamicImportOptions>): void {
    if (options.securityLevel === 'none') {
      return;
    }

    const issues: string[] = [];

    // 检查危险的全局访问
    if (this.hasDangerousGlobalAccess(module)) {
      issues.push('Dangerous global access detected');
    }

    // 检查 eval 使用
    if (this.hasEvalUsage(module)) {
      issues.push('Eval usage detected');
    }

    // 检查文件系统访问
    if (options.securityLevel === 'high' && this.hasFileSystemAccess(module)) {
      issues.push('File system access detected');
    }

    // 检查网络访问
    if (options.securityLevel === 'high' && this.hasNetworkAccess(module)) {
      issues.push('Network access detected');
    }

    if (issues.length > 0 && options.securityLevel === 'high') {
      throw new ModuleSecurityError(
        `Security check failed: ${issues.join(', ')}`,
        modulePath,
        issues.join(','),
        'Review module code and adjust security level or settings'
      );
    }
  }

  private hasDangerousGlobalAccess(module: any): boolean {
    // 简化的危险全局检查
    const dangerousGlobals = ['global', 'process', 'require', 'module'];
    const moduleString = module.toString ? module.toString() : String(module);

    return dangerousGlobals.some(global =>
      moduleString.includes(global) &&
      moduleString.includes('delete')
    );
  }

  private hasEvalUsage(module: any): boolean {
    const moduleString = module.toString ? module.toString() : String(module);
    return /\beval\s*\(/.test(moduleString);
  }

  private hasFileSystemAccess(module: any): boolean {
    const moduleString = module.toString ? module.toString() : String(module);
    return /\bfs\s*\./.test(moduleString) || /require\s*\(\s*['"]fs['"]\s*\)/.test(moduleString);
  }

  private hasNetworkAccess(module: any): boolean {
    const moduleString = module.toString ? module.toString() : String(module);
    return /\bhttp\s*\./.test(moduleString) || /\bhttps\s*\./.test(moduleString);
  }

  private async validateDependencies(module: any, modulePath: string, options: Required<DynamicImportOptions>): Promise<void> {
    if (!options.allowedDependencies && !options.blockedDependencies) {
      return;
    }

    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      // 读取 package.json
      const packagePath = path.join(path.dirname(modulePath), 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf-8');
      const packageJson = JSON.parse(packageContent);

      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies
      };

      const dependencyNames = Object.keys(dependencies || {});

      // 检查允许的依赖
      if (options.allowedDependencies) {
        const disallowedDeps = dependencyNames.filter(dep =>
          !options.allowedDependencies.includes(dep)
        );

        if (disallowedDeps.length > 0) {
          throw new ModuleSecurityError(
            `Module uses disallowed dependencies: ${disallowedDeps.join(', ')}`,
            modulePath,
            'disallowed-dependencies',
            'Update module to use only allowed dependencies'
          );
        }
      }

      // 检查禁止的依赖
      if (options.blockedDependencies) {
        const blockedDeps = dependencyNames.filter(dep =>
          options.blockedDependencies.includes(dep)
        );

        if (blockedDeps.length > 0) {
          throw new ModuleSecurityError(
            `Module uses blocked dependencies: ${blockedDeps.join(', ')}`,
            modulePath,
            'blocked-dependencies',
            'Remove blocked dependencies from module'
          );
        }
      }

    } catch (error) {
      if (error instanceof ModuleSecurityError) {
        throw error;
      }
      // 如果无法访问 package.json，则跳过依赖检查
    }
  }

  private extractExports(module: any): string[] {
    return Object.getOwnPropertyNames(module).filter(name =>
      !name.startsWith('_') && typeof module[name] !== 'undefined'
    );
  }

  private async extractDependencies(modulePath: string): Promise<string[]> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      const packagePath = path.join(path.dirname(modulePath), 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf-8');
      const packageJson = JSON.parse(packageContent);

      return [
        ...Object.keys(packageJson.dependencies || {}),
        ...Object.keys(packageJson.devDependencies || {}),
        ...Object.keys(packageJson.peerDependencies || {})
      ];
    } catch {
      return [];
    }
  }

  private estimateModuleSize(module: any): number {
    try {
      return JSON.stringify(module).length;
    } catch {
      return 0;
    }
  }

  private checkSecurityIssues(module: any, modulePath: string, options: Required<DynamicImportOptions>): string[] {
    const issues: string[] = [];

    if (options.securityLevel !== 'none') {
      if (this.hasDangerousGlobalAccess(module)) {
        issues.push('dangerous-global-access');
      }

      if (this.hasEvalUsage(module)) {
        issues.push('eval-usage');
      }

      if (options.securityLevel === 'high') {
        if (this.hasFileSystemAccess(module)) {
          issues.push('file-system-access');
        }

        if (this.hasNetworkAccess(module)) {
          issues.push('network-access');
        }
      }
    }

    return issues;
  }

  private updateImportStats(modulePath: string, success: boolean, error?: string): void {
    let stats = this.importStats.get(modulePath);
    if (!stats) {
      stats = { success: 0, failed: 0 };
      this.importStats.set(modulePath, stats);
    }

    if (success) {
      stats.success++;
      delete stats.lastError;
    } else {
      stats.failed++;
      stats.lastError = error;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const pathModule = {
  isAbsolute: (path: string) => path.startsWith('/') || /^[a-zA-Z]:[\\\/]/.test(path)
};

/**
 * 模块模式验证
 */
export const moduleSchema = z.object({
  name: z.string(),
  version: z.string(),
  main: z.string().optional(),
  exports: z.union([z.string(), z.object({}).passthrough()]).optional(),
  dependencies: z.record(z.string()).optional(),
  devDependencies: z.record(z.string()).optional(),
  peerDependencies: z.record(z.string()).optional()
}).passthrough();

/**
 * 模块验证配置
 */
export const moduleValidationConfigSchema = z.object({
  securityLevel: z.enum(['high', 'medium', 'low']).optional(),
  allowedExtensions: z.array(z.string()).optional(),
  timeout: z.number().positive().optional(),
  maxRetries: z.number().int().min(0).optional(),
  cacheStrategy: z.enum(['memory', 'filesystem', 'none']).optional(),
  sandboxed: z.boolean().optional()
}).passthrough();

// 类型导出
export type ModuleSchema = z.infer<typeof moduleSchema>;
export type ModuleValidationConfig = z.infer<typeof moduleValidationConfigSchema>;