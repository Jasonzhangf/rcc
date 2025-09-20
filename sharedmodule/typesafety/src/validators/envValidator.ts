import { z } from 'zod';
import { envVarNameSchema, envAccessSchema } from '../schemas/core.js';
import { JSONParseError } from './safeJson.js';

/**
 * 环境变量访问错误
 */
export class EnvAccessError extends Error {
  constructor(
    message: string,
    public readonly varName: string,
    public readonly expectedType?: string,
    public readonly actualValue?: string
  ) {
    super(message);
    this.name = 'EnvAccessError';
  }
}

/**
 * 环境变量验证错误
 */
export class EnvValidationError extends Error {
  constructor(
    message: string,
    public readonly varName: string,
    public readonly validationRule?: string,
    public readonly value?: string
  ) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

/**
 * 环境变量访问选项
 */
export interface EnvAccessOptions {
  /**
   * 默认值
   */
  default?: string;

  /**
   * 是否必需
   */
  required?: boolean;

  /**
   * 验证正则表达式
   */
  pattern?: RegExp;

  /**
   * 枚举值
   */
  enum?: string[];

  /**
   * 最小长度
   */
  minLength?: number;

  /**
   * 最大长度
   */
  maxLength?: number;

  /**
   * 自定义验证函数
   */
  validator?: (value: string) => boolean | string;

  /**
   * 描述信息
   */
  description?: string;

  /**
   * 是否允许空字符串
   */
  allowEmpty?: boolean;
}

/**
 * 类型转换选项
 */
export interface TypeTransformOptions {
  /**
   * 默认值
   */
  default?: any;

  /**
   * 是否必需
   */
  required?: boolean;

  /**
   * 描述信息
   */
  description?: string;
}

/**
 * 安全的环境变量访问器
 */
export class SafeEnv {
  private static readonly DEFAULT_PREFIX = 'RCC_';
  private static readonly SENSITIVE_PATTERNS = [
    /password/i,
    /secret/i,
    /key/i,
    /token/i,
    /auth/i,
    /credential/i
  ];

  private readonly prefix: string;
  private readonly caseSensitive: boolean;
  private readonly cache: Map<string, string | undefined>;
  private readonly accessLog: Array<{
    varName: string;
    accessedAt: Date;
    valueExists: boolean;
    sensitive: boolean;
  }>;

  constructor(
    prefix: string = SafeEnv.DEFAULT_PREFIX,
    caseSensitive: boolean = false
  ) {
    this.prefix = prefix;
    this.caseSensitive = caseSensitive;
    this.cache = new Map();
    this.accessLog = [];
  }

  /**
   * 获取环境变量值
   */
  get(varName: string, options: EnvAccessOptions = {}): string | undefined {
    // 标准化变量名
    const normalizedName = this.normalizeVarName(varName);

    // 检查缓存
    let value = this.cache.get(normalizedName);
    if (value === undefined) {
      // 从环境变量获取，先尝试完整名称，再尝试带前缀的名称
      value = process.env[normalizedName] ?? process.env[this.prefix + normalizedName];
      this.cache.set(normalizedName, value);
    }

    // 记录访问日志
    const sensitive = this.isSensitiveVar(varName);
    this.accessLog.push({
      varName: normalizedName,
      accessedAt: new Date(),
      valueExists: value !== undefined,
      sensitive
    });

    // 验证和转换
    if (value !== undefined) {
      try {
        return this.validateAndTransform(value, options);
      } catch (error) {
        if (error instanceof EnvValidationError) {
          throw error;
        } else {
          throw new EnvValidationError(
            `Validation failed for ${varName}: ${error instanceof Error ? error.message : String(error)}`,
            varName
          );
        }
      }
    }

    // 处理默认值
    if (options.default !== undefined) {
      return options.default;
    }

    // 处理必需字段
    if (options.required) {
      throw new EnvAccessError(
        `Required environment variable ${varName} is not set`,
        varName
      );
    }

    return undefined;
  }

  /**
   * 获取字符串类型的环境变量
   */
  getString(varName: string, options: TypeTransformOptions = {}): string {
    const value = this.get(varName, options);
    if (value === undefined) {
      if (options.required) {
        throw new EnvAccessError(`Required string environment variable ${varName} is not set`, varName);
      }
      return options.default || '';
    }
    return value;
  }

  /**
   * 获取数字类型的环境变量
   */
  getNumber(varName: string, options: TypeTransformOptions & { min?: number; max?: number } = {}): number {
    const value = this.get(varName, options);
    if (value === undefined) {
      if (options.required) {
        throw new EnvAccessError(`Required number environment variable ${varName} is not set`, varName);
      }
      if (options.default === undefined) {
        throw new EnvAccessError(`Default value required for number environment variable ${varName}`, varName);
      }
      return options.default;
    }

    const num = Number(value);
    if (isNaN(num)) {
      throw new EnvAccessError(
        `Environment variable ${varName} must be a valid number, got: ${value}`,
        varName,
        'number',
        value
      );
    }

    if (options.min !== undefined && num < options.min) {
      throw new EnvAccessError(
        `Environment variable ${varName} must be >= ${options.min}, got: ${num}`,
        varName
      );
    }

    if (options.max !== undefined && num > options.max) {
      throw new EnvAccessError(
        `Environment variable ${varName} must be <= ${options.max}, got: ${num}`,
        varName
      );
    }

    return num;
  }

  /**
   * 获取布尔类型的环境变量
   */
  getBoolean(varName: string, options: TypeTransformOptions = {}): boolean {
    const value = this.get(varName, options);
    if (value === undefined) {
      if (options.required) {
        throw new EnvAccessError(`Required boolean environment variable ${varName} is not set`, varName);
      }
      return Boolean(options.default);
    }

    const lowerValue = value.toLowerCase();
    const truthy = ['true', '1', 'yes', 'on', 'enabled'];
    const falsy = ['false', '0', 'no', 'off', 'disabled'];

    if (truthy.includes(lowerValue)) {
      return true;
    } else if (falsy.includes(lowerValue)) {
      return false;
    } else {
      throw new EnvAccessError(
        `Environment variable ${varName} must be a boolean (true/false, 1/0, yes/no, etc.), got: ${value}`,
        varName,
        'boolean',
        value
      );
    }
  }

  /**
   * 获取 JSON 类型的环境变量
   */
  getJSON<T = any>(varName: string, options: TypeTransformOptions = {}): T {
    const value = this.get(varName, options);
    if (value === undefined) {
      if (options.required) {
        throw new EnvAccessError(`Required JSON environment variable ${varName} is not set`, varName);
      }
      return options.default;
    }

    try {
      return JSON.parse(value);
    } catch (error) {
      throw new EnvAccessError(
        `Environment variable ${varName} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`,
        varName,
        'json',
        value
      );
    }
  }

  /**
   * 获取枚举类型的环境变量
   */
  getEnum<T extends string>(
    varName: string,
    validValues: T[],
    options: TypeTransformOptions = {}
  ): T {
    const value = this.get(varName, options);
    if (value === undefined) {
      if (options.required) {
        throw new EnvAccessError(`Required enum environment variable ${varName} is not set`, varName);
      }
      return options.default;
    }

    if (!validValues.includes(value as T)) {
      throw new EnvAccessError(
        `Environment variable ${varName} must be one of: ${validValues.join(', ')}, got: ${value}`,
        varName
      );
    }

    return value as T;
  }

  /**
   * 检查环境变量是否存在
   */
  has(varName: string): boolean {
    const normalizedName = this.normalizeVarName(varName);
    const value = this.get(varName);
    return value !== undefined && value !== '';
  }

  /**
   * 批量获取环境变量
   */
  getAll(configs: Record<string, EnvAccessOptions>): Record<string, string | undefined> {
    const results: Record<string, string | undefined> = {};

    for (const [varName, options] of Object.entries(configs)) {
      try {
        results[varName] = this.get(varName, options);
      } catch (error) {
        // 如果获取失败，记录错误但不中断批量处理
        if (error instanceof EnvAccessError) {
          results[varName] = undefined;
        } else {
          throw error;
        }
      }
    }

    return results;
  }

  /**
   * 验证必需的环境变量
   */
  validateRequired(requiredVars: string[]): {
    missing: string[];
    invalid: string[];
    valid: string[];
  } {
    const missing: string[] = [];
    const invalid: string[] = [];
    const valid: string[] = [];

    for (const varName of requiredVars) {
      try {
        const value = this.get(varName, { required: true });
        if (value === undefined || value === '') {
          invalid.push(varName);
        } else {
          valid.push(varName);
        }
      } catch (error) {
        if (error instanceof EnvAccessError) {
          missing.push(varName);
        } else {
          invalid.push(varName);
        }
      }
    }

    return { missing, invalid, valid };
  }

  /**
   * 获取访问日志
   */
  getAccessLog(): Array<{
    varName: string;
    accessedAt: Date;
    valueExists: boolean;
    sensitive: boolean;
  }> {
    return [...this.accessLog];
  }

  /**
   * 获取访问统计
   */
  getAccessStats(): {
    totalAccesses: number;
    missingVariables: number;
    sensitiveAccesses: number;
    uniqueVariables: number;
    accessFrequency: Record<string, number>;
  } {
    const stats = {
      totalAccesses: this.accessLog.length,
      missingVariables: 0,
      sensitiveAccesses: 0,
      uniqueVariables: new Set(this.accessLog.map(entry => entry.varName)).size,
      accessFrequency: {} as Record<string, number>
    };

    for (const entry of this.accessLog) {
      if (!entry.valueExists) {
        stats.missingVariables++;
      }
      if (entry.sensitive) {
        stats.sensitiveAccesses++;
      }

      const varName = entry.varName;
      stats.accessFrequency[varName] = (stats.accessFrequency[varName] || 0) + 1;
    }

    return stats;
  }

  /**
   * 清除访问日志
   */
  clearAccessLog(): void {
    this.accessLog.length = 0;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  // ===== 私有工具方法 =====

  private normalizeVarName(varName: string): string {
    let normalized = varName.trim();

    // 如果不区分大小写，转换为大写
    if (!this.caseSensitive) {
      normalized = normalized.toUpperCase();
    }

    // 验证变量名格式
    try {
      envVarNameSchema.parse(normalized);
    } catch (error) {
      throw new EnvAccessError(
        `Invalid environment variable name: ${varName}`,
        varName
      );
    }

    return normalized;
  }

  private isSensitiveVar(varName: string): boolean {
    return SafeEnv.SENSITIVE_PATTERNS.some(pattern => pattern.test(varName));
  }

  private validateAndTransform(value: string, options: EnvAccessOptions): string {
    // 检查空值
    if (!options.allowEmpty && value.trim() === '') {
      throw new EnvValidationError(
        `Environment variable value cannot be empty`,
        options.description || ''
      );
    }

    // 检查枚举值
    if (options.enum && !options.enum.includes(value)) {
      throw new EnvValidationError(
        `Value must be one of: ${options.enum.join(', ')}`,
        value
      );
    }

    // 检查长度
    if (options.minLength && value.length < options.minLength) {
      throw new EnvValidationError(
        `Value must be at least ${options.minLength} characters long`,
        value
      );
    }

    if (options.maxLength && value.length > options.maxLength) {
      throw new EnvValidationError(
        `Value must be no more than ${options.maxLength} characters long`,
        value
      );
    }

    // 检查正则表达式
    if (options.pattern && !options.pattern.test(value)) {
      throw new EnvValidationError(
        `Value does not match required pattern`,
        value,
        options.pattern.source
      );
    }

    // 自定义验证
    if (options.validator) {
      const result = options.validator(value);
      if (result !== true) {
        const message = typeof result === 'string' ? result : 'Custom validation failed';
        throw new EnvValidationError(message, value);
      }
    }

    return value;
  }
}

/**
 * 环境变量配置模式
 */
export const envConfigSchema = z.object({
  prefix: z.string().optional(),
  caseSensitive: z.boolean().optional(),
  defaults: z.record(z.string()).optional(),
  required: z.array(z.string()).optional(),
  validation: z.object({
    strict: z.boolean().optional(),
    allowUnknown: z.boolean().optional(),
    customValidators: z.record(z.function()).optional()
  }).optional(),
  logging: z.object({
    enabled: z.boolean().optional(),
    level: z.enum(['trace', 'debug', 'info', 'warn', 'error']).optional(),
    sensitiveMasking: z.boolean().optional()
  }).optional()
}).passthrough();

/**
 * 环境变量映射配置
 */
export const envMappingConfigSchema = z.object({
  mappings: z.array(z.object({
    from: z.string(),
    to: z.string(),
    transform: z.enum(['string', 'number', 'boolean', 'json']).optional(),
    required: z.boolean().optional(),
    default: z.string().optional(),
    validation: z.object({
      pattern: z.string().optional(),
      minLength: z.number().int().min(0).optional(),
      maxLength: z.number().int().min(0).optional(),
      enum: z.array(z.string()).optional()
    }).optional()
  })),
  settings: envConfigSchema.optional()
}).passthrough();

// ===== 类型导出 =====
export type EnvConfig = z.infer<typeof envConfigSchema>;
export type EnvMappingConfig = z.infer<typeof envMappingConfigSchema>;