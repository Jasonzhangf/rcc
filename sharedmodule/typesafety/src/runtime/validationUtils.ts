/**
 * 验证实用工具函数
 * 提供常用的验证功能、帮助函数和集成支持
 */

import { z, ZodSchema, ZodError } from 'zod';
import { RuntimeValidator, RuntimeValidationError, ValidationOptions, FunctionValidationSchema } from './RuntimeValidator.js';
import { AsyncValidator, PromiseValidationConfig } from './asyncValidator.js';
import { ValidationCache, CacheConfig } from './validationCache.js';

/**
 * 常见验证模式
 */
export const commonSchemas = {
  // 基础类型
  email: z.string().email(),
  url: z.string().url(),
  uuid: z.string().uuid(),
  ipv4: z.string().ip({ version: 'v4' }),
  ipv6: z.string().ip({ version: 'v6' }),
  ip: z.string().ip(),

  // 数值验证
  port: z.number().int().min(1).max(65535),
  percentage: z.number().min(0).max(100),
  positiveInt: z.number().int().positive(),
  negativeInt: z.number().int().negative(),
  nonNegativeInt: z.number().int().nonnegative(),

  // 字符串验证
  alpha: z.string().regex(/^[a-zA-Z]+$/),
  alphanumeric: z.string().regex(/^[a-zA-Z0-9]+$/),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  strongPassword: z.string().min(12).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  creditCard: z.string().regex(/^\d{4}-?\d{4}-?\d{4}-?\d{4}$/),
  phone: z.string().regex(/^\+?[\d\s-()]+$/),

  // JSON验证
  jsonString: z.string().refine(
    (str) => {
      try {
        JSON.parse(str);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Invalid JSON string' }
  ),

  // 日期时间
  dateString: z.string().datetime(),
  isoDate: z.string().datetime(),
  unixTimestamp: z.number().int().positive(),
  dateFormat: (format: string = 'YYYY-MM-DD') => z.string().refine(
    (str) => !isNaN(Date.parse(str)),
    { message: `Invalid date format, expected ${format}` }
  ),

  // 文件路径
  filePath: z.string().regex(/^[\w\-.\/]+$/),
  absolutePath: z.string().refine(
    (path) => path.startsWith('/') || /^[a-zA-Z]:[\\\/]/.test(path),
    { message: 'Path must be absolute' }
  ),
  relativePath: z.string().refine(
    (path) => !path.startsWith('/') && !/^[a-zA-Z]:[\\\/]/.test(path),
    { message: 'Path must be relative' }
  ),

  // 枚举验证
  enum: <T extends [string, ...string[]]>(values: T) => z.enum(values),

  // 范围验证
  range: (min: number, max: number) => z.number().min(min).max(max),
  stringLength: (min: number, max: number) => z.string().min(min).max(max),
  arrayLength: (min: number, max: number) => z.array(z.any()).min(min).max(max),

  // 颜色验证
  hexColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  rgbColor: z.string().regex(/^rgb\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/),
  rgbaColor: z.string().regex(/^rgba\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/),

  // Base64 验证
  base64: z.string().refine(
    (str) => {
      try {
        return btoa(atob(str)) === str;
      } catch {
        return false;
      }
    },
    { message: 'Invalid base64 string' }
  ),

  // JWT 验证
  jwt: z.string().refine(
    (token) => {
      const parts = token.split('.');
      return parts.length === 3 && parts.every(part => {
        try {
          return btoa(atob(part)) === part;
        } catch {
          return false;
        }
      });
    },
    { message: 'Invalid JWT format' }
  ),

  // MongoDB ObjectId
  mongodbId: z.string().regex(/^[0-9a-fA-F]{24}$/),

  // 版本号验证
  semanticVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  npmVersion: z.string().regex(/^(\^|~)?\d+\.\d+\.\d+/),

  // 配置验证
  environment: z.enum(['development', 'staging', 'production', 'test']),
  booleanString: z.enum(['true', 'false', 'yes', 'no', '1', '0']),
  portRange: z.number().int().min(1).max(65535),

  // 复合验证
  userName: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_-]+$/),
  databaseName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_]+$/),
  tableName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_]+$/),
  columnName: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_]+$/),

  // 安全配置
  securePassword: z.string()
    .min(12)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .refine(
      (password) => !/(\w)\1{2,}/.test(password), // 不允许连续重复字符
      { message: 'Password cannot contain repeated characters' }
    ),

  apiKey: z.string().min(32).regex(/^[a-zA-Z0-9_-]+$/),
  secretKey: z.string().min(64).regex(/^[a-zA-Z0-9_-]+$/)
};

/**
 * 验证结果
 */
export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  errors?: RuntimeValidationError[];
  warnings?: string[];
  metadata?: {
    validationTime: number;
    cacheHit?: boolean;
    schemaType?: string;
    [key: string]: any;
  };
}

/**
 * 验证上下文
 */
export interface ValidationContext {
  path?: string[];
  options?: ValidationOptions;
  metadata?: Record<string, any>;
}

/**
 * 验证工具函数
 */
export type ValidatorFunction = (value: unknown, context?: ValidationContext) => ValidationResult;

/**
 * 验证组合器
 */
export interface ValidationComposer {
  <T>(...validators: ValidatorFunction[]): ValidatorFunction;
  parallel: <T>(...validators: ValidatorFunction[]) => ValidatorFunction;
  series: <T>(...validators: ValidatorFunction[]) => ValidatorFunction;
  conditional: <T>(condition: (value: unknown) => boolean, thenValidator: ValidatorFunction, elseValidator?: ValidatorFunction) => ValidatorFunction;
}

/**
 * 验证实用工具类
 */
export class ValidationUtils {
  private static instance: ValidationUtils;
  private cache = new ValidationCache();
  private validator = RuntimeValidator.getInstance();
  private asyncValidator = AsyncValidator.getInstance();

  constructor() {}

  static getInstance(): ValidationUtils {
    if (!this.instance) {
      this.instance = new ValidationUtils();
    }
    return this.instance;
  }

  /**
   * 快速验证单个值
   */
  validateValue<T = any>(
    value: unknown,
    schema: ZodSchema<T>,
    context?: ValidationContext
  ): ValidationResult<T> {
    const startTime = performance.now();
    const cacheKey = this.cache.createCacheKey(value, schema);

    // 检查缓存
    const cached = this.cache.get<ValidationResult<T>>(cacheKey);
    if (cached && context?.options?.enableCache !== false) {
      return {
        ...cached.value,
        metadata: {
          ...cached.value.metadata,
          cacheHit: true,
          validationTime: cached.value.metadata?.validationTime || 0
        }
      };
    }

    try {
      const result = schema.safeParse(value);
      const validationTime = performance.now() - startTime;

      const validationResult: ValidationResult<T> = {
        success: result.success,
        data: result.success ? result.data : undefined,
        errors: result.success ? undefined : this.convertZodErrors(result.error, context),
        metadata: {
          validationTime,
          cacheHit: false,
          schemaType: schema._def.typeName
        }
      };

      // 缓存成功的结果
      if (result.success) {
        this.cache.set(cacheKey, validationResult, context?.options?.validationPath);
      }

      return validationResult;

    } catch (error) {
      const validationTime = performance.now() - startTime;

      return {
        success: false,
        errors: [new RuntimeValidationError(
          `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
          'VALIDATION_ERROR',
          'validateValue',
          value,
          schema._def.typeName || 'unknown',
          context?.path || ['validateValue'],
          ['Check input value', 'Verify schema definition']
        )],
        metadata: {
          validationTime,
          cacheHit: false,
          schemaType: schema._def.typeName
        }
      };
    }
  }

  /**
   * 批量验证
   */
  async validateBatch<T>(
    items: Array<{ key: string; value: unknown; schema: ZodSchema<T> }>,
    context?: ValidationContext
  ): Promise<Map<string, ValidationResult<T>>> {
    const results = new Map<string, ValidationResult<T>>();
    const cacheConfig: CacheConfig = {
      maxSize: 1000,
      ttl: 300000,
      evictionPolicy: 'LRU'
    };

    const batchConfig = {
      maxSize: 100,
      timeout: 5000,
      concurrency: 10,
      enableDeduplication: true
    };

    // 使用批处理验证
    const batchResults = await this.cache.validateBatch(
      items,
      batchConfig
    );

    // 处理结果
    for (const [key, isValid] of batchResults.entries()) {
      const item = items.find(item => item.key === key);
      if (item) {
        const result = this.validateValue(item.value, item.schema, context);
        results.set(key, result);
      }
    }

    return results;
  }

  /**
   * 异步验证
   */
  async validateAsync<T>(
    input: T | Promise<T>,
    schema: ZodSchema<T>,
    context?: ValidationContext,
    config?: PromiseValidationConfig
  ): Promise<ValidationResult<T>> {
    const startTime = performance.now();

    try {
      const validated = await this.asyncValidator.validateAsync(input, schema, context?.options);
      const validationTime = performance.now() - startTime;

      return {
        success: true,
        data: validated,
        metadata: {
          validationTime,
          schemaType: schema._def.typeName,
          operationId: context?.metadata?.operationId
        }
      };

    } catch (error) {
      const validationTime = performance.now() - startTime;

      return {
        success: false,
        errors: error instanceof RuntimeValidationError ? [error] : this.createErrorFromUnknown(error, context),
        metadata: {
          validationTime,
          schemaType: schema._def.typeName,
          operationId: context?.metadata?.operationId
        }
      };
    }
  }

  /**
   * 验证对象的所有属性
   */
  validateObject<T extends Record<string, any>>(
    obj: T,
    schemaMap: Record<keyof T, ZodSchema>,
    context?: ValidationContext
  ): ValidationResult<T> {
    const startTime = performance.now();
    const errors: RuntimeValidationError[] = [];
    const warnings: string[] = [];
    const validatedData: Partial<T> = {};

    // 验证每个属性
    Object.entries(schemaMap).forEach(([key, schema]) => {
      const propertyContext: ValidationContext = {
        path: [...(context?.path || []), key],
        options: context?.options,
        metadata: { ...context?.metadata, propertyKey: key }
      };

      const result = this.validateValue(obj[key], schema, propertyContext);

      if (result.success && result.data !== undefined) {
        (validatedData as any)[key] = result.data;
      } else if (result.errors) {
        errors.push(...result.errors);
      }

      if (result.warnings) {
        warnings.push(...result.warnings.map(w => `${key}: ${w}`));
      }
    });

    const validationTime = performance.now() - startTime;

    return {
      success: errors.length === 0,
      data: validatedData as T,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      metadata: {
        validationTime,
        propertyCount: Object.keys(schemaMap).length,
        errorCount: errors.length
      }
    };
  }

  /**
   * 创建安全的验证包装器
   */
  createSafeWrapper<T extends (...args: any[]) => any>(
    fn: T,
    schema: FunctionValidationSchema,
    name?: string
  ): T {
    return this.validator.validateFunction(fn, schema, name) as T;
  }

  /**
   * 创建验证组合器
   */
  createComposer(): ValidationComposer {
    const composer = (<T>(...validators: ValidatorFunction[]): ValidatorFunction => {
      return (value: unknown, context?: ValidationContext): ValidationResult => {
        const errors: RuntimeValidationError[] = [];
        const warnings: string[] = [];

        for (const validator of validators) {
          const result = validator(value, context);

          if (result.errors) {
            errors.push(...result.errors);
          }

          if (result.warnings) {
            warnings.push(...result.warnings);
          }
        }

        return {
          success: errors.length === 0,
          data: errors.length === 0 ? value : undefined,
          errors: errors.length > 0 ? errors : undefined,
          warnings: warnings.length > 0 ? warnings : undefined
        };
      };
    }) as ValidationComposer;

    // 添加并行验证方法
    composer.parallel = <T>(...validators: ValidatorFunction[]): ValidatorFunction => {
      return async (value: unknown, context?: ValidationContext): Promise<ValidationResult> => {
        const promises = validators.map(validator => Promise.resolve(validator(value, context)));
        const results = await Promise.allSettled(promises);

        const errors: RuntimeValidationError[] = [];
        const warnings: string[] = [];

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            if (result.value.errors) {
              errors.push(...result.value.errors);
            }
            if (result.value.warnings) {
              warnings.push(...result.value.warnings);
            }
          } else {
            errors.push(new RuntimeValidationError(
              `Parallel validator ${index} failed: ${result.reason}`,
              'PARALLEL_VALIDATION_ERROR',
              'composer.parallel',
              value,
              'unknown',
              context?.path || ['parallel'],
              ['Check individual validator errors']
            ));
          }
        });

        return {
          success: errors.length === 0,
          data: errors.length === 0 ? value : undefined,
          errors: errors.length > 0 ? errors : undefined,
          warnings: warnings.length > 0 ? warnings : undefined
        };
      };
    };

    // 添加串行验证方法
    composer.series = <T>(...validators: ValidatorFunction[]): ValidatorFunction => {
      return async (value: unknown, context?: ValidationContext): Promise<ValidationResult> => {
        let currentValue = value;
        const errors: RuntimeValidationError[] = [];
        const warnings: string[] = [];

        for (let i = 0; i < validators.length; i++) {
          const validator = validators[i];
          const result = await Promise.resolve(validator(currentValue, context));

          if (result.errors) {
            errors.push(...result.errors.map(error => new RuntimeValidationError(
              `Step ${i}: ${error.message}`,
              error.errorCode,
              'composer.series',
              currentValue,
              error.expectedType,
              [...(error.validationPath || []), `step_${i}`],
              error.suggestions
            )));
            break;
          }

          if (result.warnings) {
            warnings.push(...result.warnings.map(w => `Step ${i}: ${w}`));
          }

          if (result.data !== undefined) {
            currentValue = result.data;
          }
        }

        return {
          success: errors.length === 0,
          data: errors.length === 0 ? currentValue : undefined,
          errors: errors.length > 0 ? errors : undefined,
          warnings: warnings.length > 0 ? warnings : undefined
        };
      };
    };

    // 添加条件验证方法
    composer.conditional = <T>(
      condition: (value: unknown) => boolean,
      thenValidator: ValidatorFunction,
      elseValidator?: ValidatorFunction
    ): ValidatorFunction => {
      return (value: unknown, context?: ValidationContext): ValidationResult => {
        if (condition(value)) {
          return thenValidator(value, context);
        } else if (elseValidator) {
          return elseValidator(value, context);
        } else {
          return { success: true, data: value };
        }
      };
    };

    return composer;
  }

  // ===== 私有辅助方法 =====

  private convertZodErrors(zodError: ZodError, context?: ValidationContext): RuntimeValidationError[] {
    return zodError.errors.map(issue => {
      const path = [...(context?.path || []), ...issue.path.map(p => String(p))];
      const errorCode = issue.code.toUpperCase().replace(/-/g, '_');

      return new RuntimeValidationError(
        issue.message,
        errorCode,
        'zod_validation',
        issue.path.length > 0 ? issue.path[issue.path.length - 1] : null,
        issue.expected || 'unknown',
        path,
        [`Check field "${issue.path.join('.')}"`, 'Verify data types and format']
      );
    });
  }

  private createErrorFromUnknown(error: unknown, context?: ValidationContext): RuntimeValidationError[] {
    if (error instanceof RuntimeValidationError) {
      return [error];
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    return [new RuntimeValidationError(
      errorMessage,
      'UNKNOWN_ERROR',
      'createErrorFromUnknown',
      null,
      'unknown',
      context?.path || ['error'],
      ['Check error details', 'Review stack trace']
    )];
  }
}

/**
 * 验证快速函数工厂
 */
export function createQuickValidator<T>(schema: ZodSchema<T>) {
  const utils = ValidationUtils.getInstance();

  return {
    validate: (value: unknown): ValidationResult<T> => utils.validateValue(value, schema),
    validateOrThrow: (value: unknown): T => {
      const result = utils.validateValue(value, schema);
      if (!result.success) {
        throw result.errors?.[0] || new Error('Validation failed');
      }
      return result.data!;
    },
    validateAsync: (value: T | Promise<T>) => utils.validateAsync(value, schema),
    createWrapper: (fn: (...args: any[]) => any) => utils.createSafeWrapper(fn, {
      parameters: [schema],
      options: { enableCache: true }
    })
  };
}

/**
 * 条件验证函数
 */
export function conditionalValidate<T>(
  condition: (value: unknown) => boolean,
  ifSchema: ZodSchema<T>,
  elseSchema?: ZodSchema<T>
) {
  return {
    validate: (value: unknown): ValidationResult<T> => {
      const utils = ValidationUtils.getInstance();

      if (condition(value)) {
        return utils.validateValue(value, ifSchema);
      } else if (elseSchema) {
        return utils.validateValue(value, elseSchema);
      } else {
        return { success: true, data: value as T };
      }
    }
  };
}

/**
 * 创建验证管道
 */
export function createValidationPipeline(...validators: Array<ZodSchema | ValidatorFunction>) {
  const utils = ValidationUtils.getInstance();
  const composer = utils.createComposer();

  // 转换所有验证器为通用格式
  const normalizedValidators = validators.map(validator => {
    if ('_def' in validator) { // ZodSchema
      return (value: unknown, context?: ValidationContext) => utils.validateValue(value, validator, context);
    } else { // ValidatorFunction
      return validator;
    }
  });

  return composer(...normalizedValidators);
}

/**
 * 类型安全的对象验证构建器
 */
export class ObjectValidatorBuilder<T extends Record<string, any> = {}> {
  private schemas: Record<string, ZodSchema> = {};

  constructor(private schemaMap: Record<string, ZodSchema> = {}) {
    this.schemas = schemaMap;
  }

  /**
   * 添加字段验证
   */
  field<K extends string, V>(
    key: K,
    schema: ZodSchema<V>
  ): ObjectValidatorBuilder<T & { [P in K]: V }> {
    return new ObjectValidatorBuilder({
      ...this.schemas,
      [key]: schema
    });
  }

  /**
   * 添加可选字段
   */
  optional<K extends string, V>(
    key: K,
    schema: ZodSchema<V>
  ): ObjectValidatorBuilder<T & { [P in K]?: V }> {
    return new ObjectValidatorBuilder({
      ...this.schemas,
      [key]: schema.optional()
    });
  }

  /**
   * 添加数组字段
   */
  array<K extends string, V>(
    key: K,
    schema: ZodSchema<V>
  ): ObjectValidatorBuilder<T & { [P in K]: V[] }> {
    return new ObjectValidatorBuilder({
      ...this.schemas,
      [key]: z.array(schema)
    });
  }

  /**
   * 添加嵌套对象字段
   */
  object<K extends string, V extends Record<string, any>>(
    key: K,
    builder: ObjectValidatorBuilder<V>
  ): ObjectValidatorBuilder<T & { [P in K]: V }> {
    const nestedSchema = z.object(builder.build());
    return new ObjectValidatorBuilder({
      ...this.schemas,
      [key]: nestedSchema
    });
  }

  /**
   * 构建最终的验证模式
   */
  build(): Record<keyof T, ZodSchema> {
    return this.schemas as Record<keyof T, ZodSchema>;
  }

  /**
   * 创建验证函数
   */
  createValidator() {
    const utils = ValidationUtils.getInstance();
    const objectSchema = z.object(this.schemas as any);

    return {
      validate: (value: unknown) => utils.validateValue(value, objectSchema),
      schema: objectSchema,
      builder: this
    };
  }
}

/**
 * 递归对象验证器
 */
export class RecursiveObjectValidator {
  private cache = new WeakMap<object, any>();

  constructor(private validator: ValidationUtils = ValidationUtils.getInstance()) {}

  /**
   * 递归验证对象的所有嵌套属性
   */
  validateDeep<T>(
    obj: T,
    schema: ZodSchema,
    context?: ValidationContext,
    maxDepth: number = 10
  ): ValidationResult<T> {
    if (maxDepth <= 0) {
      return {
        success: false,
        errors: [new RuntimeValidationError(
          'Maximum validation depth exceeded',
          'MAX_DEPTH_EXCEEDED',
          'validateDeep',
          obj,
          'object',
          context?.path || ['deep', 'validation'],
          ['Reduce object nesting', 'Increase max depth limit']
        )]
      };
    }

    // 非对象类型的基础验证
    if (!obj || typeof obj !== 'object') {
      return this.validator.validateValue(obj, schema, context);
    }

    // 循环引用检测
    if (this.cache.has(obj)) {
      return {
        success: true,
        data: this.cache.get(obj)
      };
    }

    try {
      let result: ValidationResult<T>;

      if (Array.isArray(obj)) {
        result = this.validateDeepArray(obj, schema, context, maxDepth);
      } else {
        result = this.validateDeepObject(obj as Record<string, any>, schema, context, maxDepth);
      }

      // 缓存结果（用于循环引用检测）
      if (result.success && result.data !== undefined) {
        this.cache.set(obj, result.data);
      }

      return result;

    } catch (error) {
      return {
        success: false,
        errors: [new RuntimeValidationError(
          `Deep validation failed: ${error instanceof Error ? error.message : String(error)}`,
          'DEEP_VALIDATION_ERROR',
          'validateDeep',
          obj,
          'object',
          context?.path || ['deep', 'validation'],
          ['Check object structure', 'Verify schema compatibility']
        )]
      };
    }
  }

  private validateDeepArray<T>(
    arr: any[],
    schema: ZodSchema,
    context?: ValidationContext,
    maxDepth: number = 10
  ): ValidationResult<T> {
    // 尝试推断数组项模式
    let itemSchema: ZodSchema;
    if (schema._def.typeName === 'ZodArray' && schema._def.type) {
      itemSchema = schema._def.type;
    } else {
      itemSchema = z.any(); // 回退到 any 模式
    }

    const results: any[] = [];
    const errors: RuntimeValidationError[] = [];

    arr.forEach((item, index) => {
      const itemContext: ValidationContext = {
        path: [...(context?.path || []), `[${index}]`],
        options: context?.options,
        metadata: { ...context?.metadata, arrayIndex: index }
      };

      const result = this.validateDeep(item, itemSchema, itemContext, maxDepth - 1);

      if (result.success && result.data !== undefined) {
        results.push(result.data);
      } else if (result.errors) {
        errors.push(...result.errors);
        results.push(item); // 保留原始值
      }
    });

    return {
      success: errors.length === 0,
      data: results as T,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private validateDeepObject<T>(
    obj: Record<string, any>,
    schema: ZodSchema,
    context?: ValidationContext,
    maxDepth: number = 10
  ): ValidationResult<T> {
    // 尝试推断对象模式
    let objectSchema: Record<string, ZodSchema> = {};
    if (schema._def.typeName === 'ZodObject' && schema._def.shape) {
      try {
        objectSchema = schema._def.shape();
      } catch {
        objectSchema = {};
      }
    }

    const results: Record<string, any> = {};
    const errors: RuntimeValidationError[] = [];

    Object.entries(obj).forEach(([key, value]) => {
      const fieldContext: ValidationContext = {
        path: [...(context?.path || []), key],
        options: context?.options,
        metadata: { ...context?.metadata, objectKey: key }
      };

      const fieldSchema = objectSchema[key] || z.any();
      const result = this.validateDeep(value, fieldSchema, fieldContext, maxDepth - 1);

      if (result.success && result.data !== undefined) {
        results[key] = result.data;
      } else if (result.errors) {
        errors.push(...result.errors);
        results[key] = value; // 保留原始值
      }
    });

    return {
      success: errors.length === 0,
      data: results as T,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * 清除循环引用缓存
   */
  clearCache(): void {
    this.cache = new WeakMap();
  }
}