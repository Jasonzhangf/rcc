/**
 * 运行时类型验证器 - RCC TypeSafety 的核心组件
 * 提供函数、对象、数组的运行时类型验证和错误追踪
 */

import { z, ZodSchema, ZodError } from 'zod';
import { v4 as uuidv4 } from 'uuid';

/**
 * 运行时验证错误
 */
export class RuntimeValidationError extends Error {
  constructor(
    message: string,
    public readonly errorCode: string,
    public readonly validationContext: string,
    public readonly originalValue: unknown,
    public readonly expectedType: string,
    public readonly validationPath: string[] = [],
    public readonly suggestions?: string[]
  ) {
    super(message);
    this.name = 'RuntimeValidationError';
  }
}

/**
 * 安全的函数包装器
 */
export interface SafeFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T>;
  originalFunction: T;
  validationSchema: FunctionValidationSchema;
  validationStats: ValidationStats;
}

/**
 * 安全的对象包装器
 */
export interface SafeObject<T> {
  readonly value: T;
  readonly isValid: boolean;
  readonly errors: RuntimeValidationError[];
  readonly validationPath: string[];
  get<K extends keyof T>(key: K): SafeObject<T[K]>;
  set<K extends keyof T>(key: K, value: T[K]): SafeObject<T>;
}

/**
 * 安全的数组包装器
 */
export interface SafeArray<T> {
  readonly values: T[];
  readonly isValid: boolean;
  readonly errors: RuntimeValidationError[];
  readonly length: number;
  get(index: number): SafeObject<T>;
  map<U>(mapper: (item: SafeObject<T>, index: number) => U): U[];
  filter(predicate: (item: SafeObject<T>, index: number) => boolean): SafeArray<T>;
}

/**
 * 函数验证模式
 */
export interface FunctionValidationSchema {
  parameters?: ZodSchema[];
  returnValue?: ZodSchema;
  async?: boolean;
  options?: ValidationOptions;
}

/**
 * 对象验证模式
 */
export interface ObjectValidationSchema<T = any> {
  schema: ZodSchema<T>;
  options?: ValidationOptions;
}

/**
 * 数组验证模式
 */
export interface ArrayValidationSchema<T = any> {
  itemSchema: ZodSchema<T>;
  minLength?: number;
  maxLength?: number;
  unique?: boolean;
  options?: ValidationOptions;
}

/**
 * 验证选项
 */
export interface ValidationOptions {
  /**
   * 是否启用缓存
   */
  enableCache?: boolean;

  /**
   * 验证失败时的行为：'throw' | 'warn' | 'return'
   */
  onError?: 'throw' | 'warn' | 'return';

  /**
   * 是否启用详细日志
   */
  verbose?: boolean;

  /**
   * 验证超时时间（毫秒）
   */
  timeout?: number;

  /**
   * 验证路径前缀
   */
  validationPath?: string[];

  /**
   * 是否启用性能监控
   */
  enableProfiling?: boolean;

  /**
   * 自定义错误消息
   */
  customErrorMessages?: Record<string, string>;
}

/**
 * 验证统计
 */
export interface ValidationStats {
  totalValidations: number;
  successfulValidations: number;
  failedValidations: number;
  averageValidationTime: number;
  lastValidationTime: number;
  lastValidationError?: RuntimeValidationError;
}

/**
 * 验证上下文
 */
export interface ValidationContext {
  readonly id: string;
  readonly timestamp: number;
  readonly path: string[];
  readonly options: ValidationOptions;
  readonly depth: number;
  readonly parentContext?: ValidationContext;
}

/**
 * 缓存条目
 */
interface CacheEntry {
  key: string;
  result: ValidationResult;
  timestamp: number;
  hitCount: number;
}

/**
 * 验证结果
 */
interface ValidationResult {
  success: boolean;
  errors?: RuntimeValidationError[];
  warnings?: string[];
  value?: unknown;
  validationTime: number;
}

/**
 * 主要的运行时验证器类
 */
export class RuntimeValidator {
  private static instance: RuntimeValidator;
  private cache: Map<string, CacheEntry> = new Map();
  private stats: Map<string, ValidationStats> = new Map();
  private profiling: Map<string, number[]> = new Map();
  private readonly maxCacheSize: number;
  private readonly cacheTimeout: number;

  constructor(options: { maxCacheSize?: number; cacheTimeout?: number } = {}) {
    this.maxCacheSize = options.maxCacheSize || 1000;
    this.cacheTimeout = options.cacheTimeout || 300000; // 5 minutes
  }

  static getInstance(options?: { maxCacheSize?: number; cacheTimeout?: number }): RuntimeValidator {
    if (!this.instance) {
      this.instance = new RuntimeValidator(options);
    }
    return this.instance;
  }

  /**
   * 验证函数并创建安全包装器
   */
  validateFunction<T extends (...args: any[]) => any>(
    fn: T,
    schema: FunctionValidationSchema,
    name?: string
  ): SafeFunction<T> {
    const functionName = name || fn.name || 'anonymous';
    const validationId = `function:${functionName}:${uuidv4()}`;

    // 创建验证统计
    const stats: ValidationStats = {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      averageValidationTime: 0,
      lastValidationTime: 0
    };

    // 创建安全包装函数
    const safeFunction = ((...args: Parameters<T>): ReturnType<T> => {
      const startTime = Date.now();
      const context = this.createContext(validationId, schema.options);

      try {
        stats.totalValidations++;

        // 验证参数
        this.validateArguments(args, schema, context);

        // 执行原函数
        const result = fn(...args);

        // 验证返回值（如果是Promise，需要特殊处理）
        if (schema.async || result instanceof Promise) {
          return this.handleAsyncResult(result, schema, context, stats, startTime) as ReturnType<T>;
        } else {
          this.validateReturnValue(result, schema, context);
          this.updateStats(stats, startTime, true);
          return result;
        }

      } catch (error) {
        this.updateStats(stats, startTime, false, error as Error);
        this.handleValidationError(error as Error, schema.options, context);
      }
    }) as SafeFunction<T>;

    // 附加元数据
    safeFunction.originalFunction = fn;
    safeFunction.validationSchema = schema;
    safeFunction.validationStats = stats;

    return safeFunction;
  }

  /**
   * 验证对象并创建安全包装器
   */
  validateObject<T>(obj: unknown, schema: ObjectValidationSchema<T>): SafeObject<T> {
    const startTime = Date.now();
    const context = this.createContext('object-validation', schema.options);

    try {
      // 使用缓存优化重复验证
      const cacheKey = this.generateCacheKey(obj, schema.schema);
      const cached = this.getFromCache(cacheKey);

      if (cached && cached.result.success) {
        return this.createSafeObject(cached.result.value as T, [], cached.result.errors || [], schema.schema, context);
      }

      // 执行验证
      const validationResult = this.performZodValidation(obj, schema.schema, context);

      if (validationResult.success) {
        this.addToCache(cacheKey, {
          success: true,
          value: validationResult.data,
          validationTime: Date.now() - startTime
        });

        return this.createSafeObject(validationResult.data, [], [], schema.schema, context);
      } else {
        const errors = this.convertZodErrors(validationResult.error, context);
        this.addToCache(cacheKey, {
          success: false,
          errors,
          validationTime: Date.now() - startTime
        });

        return this.createSafeObject(obj, errors, errors, schema.schema, context);
      }

    } catch (error) {
      const runtimeError = new RuntimeValidationError(
        `Object validation failed: ${error instanceof Error ? error.message : String(error)}`,
        'OBJECT_VALIDATION_ERROR',
        'validateObject',
        obj,
        'unknown',
        context.path,
        ['Check the object structure against the schema', 'Verify schema definition']
      );

      return this.createSafeObject(obj, [runtimeError], [runtimeError], schema.schema, context);
    }
  }

  /**
   * 验证数组并创建安全包装器
   */
  validateArray<T>(arr: unknown, schema: ArrayValidationSchema<T>): SafeArray<T> {
    const startTime = Date.now();
    const context = this.createContext('array-validation', schema.options);

    try {
      // 基础数组验证
      if (!Array.isArray(arr)) {
        throw new RuntimeValidationError(
          `Expected array, got ${typeof arr}`,
          'ARRAY_TYPE_ERROR',
          'validateArray',
          arr,
          'Array',
          context.path,
          ['Ensure the input is an array', 'Check data source']
        );
      }

      // 数组长度验证
      if (schema.minLength && arr.length < schema.minLength) {
        throw new RuntimeValidationError(
          `Array length ${arr.length} is less than minimum ${schema.minLength}`,
          'ARRAY_MIN_LENGTH_ERROR',
          'validateArray',
          arr,
          `Array[${schema.minLength}-]`,
          context.path,
          ['Add more items to the array', 'Reduce minimum length requirement']
        );
      }

      if (schema.maxLength && arr.length > schema.maxLength) {
        throw new RuntimeValidationError(
          `Array length ${arr.length} exceeds maximum ${schema.maxLength}`,
          'ARRAY_MAX_LENGTH_ERROR',
          'validateArray',
          arr,
          `Array[-${schema.maxLength}]`,
          context.path,
          ['Remove items from the array', 'Increase maximum length limit']
        );
      }

      // 唯一性验证
      if (schema.unique) {
        const seen = new Set();
        const duplicates = new Set();

        arr.forEach((item, index) => {
          const key = JSON.stringify(item);
          if (seen.has(key)) {
            duplicates.add(key);
          }
          seen.add(key);
        });

        if (duplicates.size > 0) {
          throw new RuntimeValidationError(
            `Array contains duplicate items: ${Array.from(duplicates).join(', ')}`,
            'ARRAY_UNIQUE_ERROR',
            'validateArray',
            arr,
            'Array[unique]',
            context.path,
            ['Remove duplicate items', 'Disable unique validation']
          );
        }
      }

      // 验证数组项
      const validatedItems: T[] = [];
      const errors: RuntimeValidationError[] = [];

      arr.forEach((item, index) => {
        try {
          const itemContext = { ...context, path: [...context.path, `[${index}]`] };
          const result = this.performZodValidation(item, schema.itemSchema, itemContext);

          if (result.success) {
            validatedItems.push(result.data);
          } else {
            const itemErrors = this.convertZodErrors(result.error, itemContext);
            errors.push(...itemErrors);
            validatedItems.push(item); // 保留原始值
          }
        } catch (error) {
          const itemError = new RuntimeValidationError(
            `Item at index ${index} validation failed: ${error instanceof Error ? error.message : String(error)}`,
            'ARRAY_ITEM_VALIDATION_ERROR',
            'validateArray',
            item,
            'ArrayItem',
            [...context.path, `[${index}]`],
            ['Check array item structure', 'Verify item schema']
          );
          errors.push(itemError);
          validatedItems.push(item);
        }
      });

      this.updateProfilingStats('array-validation', Date.now() - startTime);

      return {
        values: validatedItems,
        isValid: errors.length === 0,
        errors,
        length: validatedItems.length,

        get: (index: number): SafeObject<T> => {
          if (index < 0 || index >= validatedItems.length) {
            const error = new RuntimeValidationError(
              `Array index ${index} out of bounds`,
              'ARRAY_INDEX_ERROR',
              'array.get',
              index,
              `valid index [0-${validatedItems.length - 1}]`,
              context.path
            );
            return this.createSafeObject(undefined, [error], [error], schema.itemSchema, context);
          }

          const itemContext = { ...context, path: [...context.path, `[${index}]`] };
          return this.createSafeObject(validatedItems[index], [], [], schema.itemSchema, itemContext);
        },

        map: <U>(mapper: (item: SafeObject<T>, index: number) => U): U[] => {
          return validatedItems.map((item, index) => {
            const itemContext = { ...context, path: [...context.path, `[${index}]`] };
            const safeItem = this.createSafeObject(item, [], [], schema.itemSchema, itemContext);
            return mapper(safeItem, index);
          });
        },

        filter: (predicate: (item: SafeObject<T>, index: number) => boolean): SafeArray<T> => {
          const filteredItems = validatedItems.filter((item, index) => {
            const itemContext = { ...context, path: [...context.path, `[${index}]`] };
            const safeItem = this.createSafeObject(item, [], [], schema.itemSchema, itemContext);
            return predicate(safeItem, index);
          });

          return this.validateArray(filteredItems, schema);
        }
      };

    } catch (error) {
      const runtimeError = error instanceof RuntimeValidationError ? error : new RuntimeValidationError(
        `Array validation failed: ${error instanceof Error ? error.message : String(error)}`,
        'ARRAY_VALIDATION_ERROR',
        'validateArray',
        arr,
        'Array',
        context.path
      );

      return {
        values: Array.isArray(arr) ? arr : [],
        isValid: false,
        errors: [runtimeError],
        length: Array.isArray(arr) ? arr.length : 0,
        get: (index: number) => this.createSafeObject(undefined, [runtimeError], [runtimeError], schema.itemSchema, context),
        map: <U>() => [] as U[],
        filter: () => this.createSafeArray([], schema, context)
      };
    }
  }

  /**
   * 创建类型安全的执行环境
   */
  createSafeExecutionContext<T extends Record<string, any>>(
    context: T,
    schema?: Record<string, ObjectValidationSchema>
  ): SafeExecutionContext<T> {
    const validatedContext: Record<string, SafeObject<any>> = {};
    const errors: RuntimeValidationError[] = [];

    Object.entries(context).forEach(([key, value]) => {
      try {
        if (schema && schema[key]) {
          validatedContext[key] = this.validateObject(value, schema[key]);
          if (!validatedContext[key].isValid) {
            errors.push(...validatedContext[key].errors);
          }
        } else {
          // 没有模式的值直接包装
          validatedContext[key] = this.createSafeObject(value, [], [], z.any(), { path: [key] } as ValidationContext);
        }
      } catch (error) {
        const validationError = new RuntimeValidationError(
          `Context validation failed for key "${key}": ${error instanceof Error ? error.message : String(error)}`,
          'CONTEXT_VALIDATION_ERROR',
          'createSafeExecutionContext',
          value,
          'unknown',
          [key]
        );
        errors.push(validationError);
        validatedContext[key] = this.createSafeObject(value, [validationError], [validationError], z.any(), { path: [key] } as ValidationContext);
      }
    });

    return new SafeExecutionContext(validatedContext as T, errors, this);
  }

  /**
   * 清理验证缓存
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const [key, entry] of this.cache.entries()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * 获取验证统计信息
   */
  getStatistics(): Map<string, ValidationStats> {
    return new Map(this.stats);
  }

  /**
   * 获取性能分析数据
   */
  getProfilingData(): Map<string, { average: number; min: number; max: number; count: number }> {
    const result = new Map<string, { average: number; min: number; max: number; count: number }>();

    for (const [key, times] of this.profiling.entries()) {
      if (times.length === 0) continue;

      const min = Math.min(...times);
      const max = Math.max(...times);
      const average = times.reduce((sum, time) => sum + time, 0) / times.length;

      result.set(key, { average, min, max, count: times.length });
    }

    return result;
  }

  // ===== 私有辅助方法 =====

  private createContext(operation: string, options?: ValidationOptions): ValidationContext {
    return {
      id: uuidv4(),
      timestamp: Date.now(),
      path: options?.validationPath || [operation],
      options: options || {},
      depth: 0
    };
  }

  private validateArguments(args: any[], schema: FunctionValidationSchema, context: ValidationContext): void {
    if (!schema.parameters || schema.parameters.length === 0) {
      return;
    }

    if (args.length < schema.parameters.length) {
      throw new RuntimeValidationError(
        `Expected ${schema.parameters.length} arguments, got ${args.length}`,
        'ARGUMENT_COUNT_ERROR',
        'validateArguments',
        args,
        `${schema.parameters.length} arguments`,
        context.path,
        ['Provide all required arguments', 'Check function signature']
      );
    }

    schema.parameters.forEach((paramSchema, index) => {
      const argPath = [...context.path, `arg[${index}]`];
      try {
        const result = this.performZodValidation(args[index], paramSchema, { ...context, path: argPath });
        if (!result.success) {
          throw this.convertZodErrors(result.error, { ...context, path: argPath })[0];
        }
      } catch (error) {
        if (error instanceof RuntimeValidationError) {
          throw error;
        }
        throw new RuntimeValidationError(
          `Argument ${index} validation failed: ${error instanceof Error ? error.message : String(error)}`,
          'ARGUMENT_VALIDATION_ERROR',
          'validateArguments',
          args[index],
          'unknown',
          argPath
        );
      }
    });
  }

  private validateReturnValue(value: any, schema: FunctionValidationSchema, context: ValidationContext): void {
    if (!schema.returnValue) {
      return;
    }

    const result = this.performZodValidation(value, schema.returnValue, context);
    if (!result.success) {
      const errors = this.convertZodErrors(result.error, context);
      throw new RuntimeValidationError(
        `Return value validation failed: ${errors.map(e => e.message).join(', ')}`,
        'RETURN_VALUE_ERROR',
        'validateReturnValue',
        value,
        schema.returnValue._def.typeName || 'unknown',
        context.path,
        ['Check function implementation', 'Review return type schema']
      );
    }
  }

  private async handleAsyncResult<T>(
    promise: Promise<T>,
    schema: FunctionValidationSchema,
    context: ValidationContext,
    stats: ValidationStats,
    startTime: number
  ): Promise<T> {
    try {
      const result = await promise;
      this.validateReturnValue(result, schema, context);
      this.updateStats(stats, startTime, true);
      return result;
    } catch (error) {
      this.updateStats(stats, startTime, false, error as Error);
      this.handleValidationError(error as Error, schema.options, context);
      throw error; // This line should never be reached due to handleValidationError
    }
  }

  private performZodValidation(value: unknown, schema: ZodSchema, context: ValidationContext) {
    try {
      return schema.safeParse(value);
    } catch (error) {
      return {
        success: false,
        error: error instanceof ZodError ? error : new ZodError([])
      };
    }
  }

  private convertZodErrors(zodError: ZodError, context: ValidationContext): RuntimeValidationError[] {
    return zodError.errors.map(issue => {
      const path = [...context.path, ...issue.path.map(p => String(p))];
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

  private createSafeObject<T>(
    value: T,
    errors: RuntimeValidationError[],
    allErrors: RuntimeValidationError[],
    schema: ZodSchema,
    context: ValidationContext
  ): SafeObject<T> {
    const self = this;

    return {
      value,
      isValid: errors.length === 0,
      errors,
      validationPath: context.path,

      get<K extends keyof T>(key: K): SafeObject<T[K]> {
        if (!value || typeof value !== 'object') {
          const error = new RuntimeValidationError(
            'Cannot get property from non-object value',
            'PROPERTY_ACCESS_ERROR',
            'safeObject.get',
            value,
            'object',
            context.path
          );
          return self.createSafeObject(undefined as T[K], [error], [error], schema, context);
        }

        const itemValue = (value as T)[key];
        const itemPath = [...context.path, String(key)];
        const itemContext = { ...context, path: itemPath };

        // 尝试推断子模式（对于对象模式）
        try {
          if (schema._def.typeName === 'ZodObject' && schema._def.shape) {
            const shape = schema._def.shape();
            const itemSchema = shape[key as string];

            if (itemSchema) {
              const result = self.performZodValidation(itemValue, itemSchema, itemContext);
              const itemErrors = result.success ? [] : self.convertZodErrors(result.error, itemContext);

              return self.createSafeObject(itemValue, itemErrors, itemErrors, itemSchema, itemContext);
            }
          }
        } catch {
          // 如果无法获取子模式，使用原始值
        }

        return self.createSafeObject(itemValue, [], [], z.any(), itemContext);
      },

      set<K extends keyof T>(key: K, newValue: T[K]): SafeObject<T> {
        if (!value || typeof value !== 'object') {
          const error = new RuntimeValidationError(
            'Cannot set property on non-object value',
            'PROPERTY_SET_ERROR',
            'safeObject.set',
            value,
            'object',
            context.path
          );
          return self.createSafeObject(value, [error], [error], schema, context);
        }

        // 创建新对象并设置属性
        const newObject = { ...(value as any) };
        newObject[key] = newValue;

        // 重新验证整个对象
        const result = self.performZodValidation(newObject, schema, context);
        const newErrors = result.success ? [] : self.convertZodErrors(result.error, context);

        return self.createSafeObject(newObject as T, newErrors, newErrors, schema, context);
      }
    };
  }

  private createSafeArray<T>(items: T[], schema: ArrayValidationSchema<T>, context: ValidationContext): SafeArray<T> {
    const errors: RuntimeValidationError[] = [];

    return {
      values: items,
      isValid: errors.length === 0,
      errors,
      length: items.length,

      get(index: number): SafeObject<T> {
        if (index < 0 || index >= items.length) {
          const error = new RuntimeValidationError(
            `Array index ${index} out of bounds`,
            'ARRAY_INDEX_ERROR',
            'safeArray.get',
            index,
            `valid index [0-${items.length - 1}]`,
            context.path
          );
          return this.createSafeObject(undefined as T, [error], [error], schema.itemSchema, { ...context, path: [...context.path, `[${index}]`] });
        }

        return this.createSafeObject(items[index], [], [], schema.itemSchema, { ...context, path: [...context.path, `[${index}]`] });
      },

      map: <U>(mapper: (item: SafeObject<T>, index: number) => U): U[] => {
        return items.map((item, index) => {
          const safeItem = this.createSafeObject(item, [], [], schema.itemSchema, { ...context, path: [...context.path, `[${index}]`] });
          return mapper(safeItem, index);
        });
      },

      filter: (predicate: (item: SafeObject<T>, index: number) => boolean): SafeArray<T> => {
        const filteredItems = items.filter((item, index) => {
          const safeItem = this.createSafeObject(item, [], [], schema.itemSchema, { ...context, path: [...context.path, `[${index}]`] });
          return predicate(safeItem, index);
        });

        return this.createSafeArray(filteredItems, schema, context);
      }
    };
  }

  private updateStats(stats: ValidationStats, startTime: number, success: boolean, error?: Error): void {
    const validationTime = Date.now() - startTime;

    stats.lastValidationTime = validationTime;

    if (success) {
      stats.successfulValidations++;
    } else {
      stats.failedValidations++;
      if (error instanceof RuntimeValidationError) {
        stats.lastValidationError = error;
      }
    }

    stats.averageValidationTime = (stats.averageValidationTime * stats.totalValidations + validationTime) / (stats.totalValidations + 1);
  }

  private updateProfilingStats(operation: string, time: number): void {
    if (!this.profiling.has(operation)) {
      this.profiling.set(operation, []);
    }

    const times = this.profiling.get(operation)!;
    times.push(time);

    // 保持合理的历史记录数量
    if (times.length > 1000) {
      times.splice(0, times.length - 1000);
    }
  }

  private handleValidationError(error: Error, options?: ValidationOptions, context?: ValidationContext): never {
    const behavior = options?.onError || 'throw';

    switch (behavior) {
      case 'warn':
        console.warn(`[RuntimeValidator] Validation warning: ${error.message}`);
        throw error;

      case 'return':
        throw new RuntimeValidationError(
          'Validation error (handled gracefully)',
          'VALIDATION_HANDLED',
          'handleValidationError',
          null,
          'unknown',
          context?.path || []
        );

      case 'throw':
      default:
        throw error;
    }
  }

  private generateCacheKey(value: unknown, schema: ZodSchema): string {
    try {
      const valueStr = JSON.stringify(value);
      const schemaStr = JSON.stringify(schema._def || {});
      return `validation:${this.hashString(valueStr + schemaStr)}`;
    } catch {
      return `validation:${Math.random()}`;
    }
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private getFromCache(key: string): CacheEntry | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // 检查超时
    if (Date.now() - entry.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return undefined;
    }

    entry.hitCount++;
    return entry;
  }

  private addToCache(key: string, result: ValidationResult): void {
    if (this.cache.size >= this.maxCacheSize) {
      // 简单的LRU清理：移除最少使用的条目
      let minHits = Infinity;
      let minKey: string | undefined;

      for (const [k, entry] of this.cache.entries()) {
        if (entry.hitCount < minHits) {
          minHits = entry.hitCount;
          minKey = k;
        }
      }

      if (minKey) {
        this.cache.delete(minKey);
      }
    }

    this.cache.set(key, {
      key,
      result,
      timestamp: Date.now(),
      hitCount: 1
    });
  }
}

/**
 * 安全执行上下文
 */
export class SafeExecutionContext<T extends Record<string, any>> {
  constructor(
    public readonly contexts: T,
    public readonly errors: RuntimeValidationError[],
    private readonly validator: RuntimeValidator
  ) {}

  /**
   * 检查上下文是否有效
   */
  get isValid(): boolean {
    return this.errors.length === 0 && Object.values(this.contexts).every(ctx => ctx.isValid);
  }

  /**
   * 获取验证后的上下文字段
   */
  get<K extends keyof T>(key: K): T[K] {
    return this.contexts[key];
  }

  /**
   * 验证并添加新的上下文字段
   */
  validateAndAdd<K extends string, V>(
    key: K,
    value: V,
    schema: ObjectValidationSchema<V>
  ): SafeExecutionContext<T & { [P in K]: SafeObject<V> }> {
    const validated = this.validator.validateObject(value, schema);
    const newContexts = { ...this.contexts, [key]: validated } as T & { [P in K]: SafeObject<V> };
    const newErrors = validated.isValid ? this.errors : [...this.errors, ...validated.errors];

    return new SafeExecutionContext(newContexts, newErrors, this.validator);
  }

  /**
   * 获取所有错误
   */
  getAllErrors(): RuntimeValidationError[] {
    const contextErrors = Object.values(this.contexts)
      .filter(ctx => !ctx.isValid)
      .flatMap(ctx => ctx.errors);

    return [...this.errors, ...contextErrors];
  }
}