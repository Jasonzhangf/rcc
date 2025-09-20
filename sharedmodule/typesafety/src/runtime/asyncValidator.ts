/**
 * 异步验证和Promise安全包装器
 * 提供异步操作的类型验证、错误处理和性能优化
 */

import { z, ZodSchema } from 'zod';
import { RuntimeValidator, RuntimeValidationError, ValidationOptions } from './RuntimeValidator.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * 异步验证错误
 */
export class AsyncValidationError extends RuntimeValidationError {
  constructor(
    message: string,
    errorCode: string,
    validationContext: string,
    originalValue: unknown,
    expectedType: string,
    validationPath: string[] = [],
    suggestions?: string[],
    public readonly asyncOperationId?: string,
    public readonly operationDuration?: number
  ) {
    super(message, errorCode, validationContext, originalValue, expectedType, validationPath, suggestions);
    this.name = 'AsyncValidationError';
  }
}

/**
 * Promise验证配置
 */
export interface PromiseValidationConfig {
  /**
   * 返回值验证模式
   */
  returnSchema?: ZodSchema;

  /**
   * 错误验证模式
   */
  errorSchema?: ZodSchema;

  /**
   * 超时时间（毫秒）
   */
  timeout?: number;

  /**
   * 重试配置
   */
  retry?: {
    /**
     * 重试次数
     */
    attempts: number;

    /**
     * 重试间隔（毫秒）
     */
    delay?: number;

    /**
     * 退避策略：'fixed' | 'exponential' | 'linear'
     */
    backoff?: 'fixed' | 'exponential' | 'linear';

    /**
     * 何时重试（验证函数）
     */
    condition?: (error: Error, attempt: number) => boolean;
  };

  /**
   * 性能监控
   */
  profiling?: {
    /**
     * 记录执行时间
     */
    trackDuration?: boolean;

    /**
     * 记录内存使用
     */
    trackMemory?: boolean;

    /**
     * 自定义指标
     */
    customMetrics?: string[];
  };

  /**
   * 错误处理策略
   */
  errorHandling?: {
    /**
     * 是否包装原始错误
     */
    wrapOriginal?: boolean;

    /**
     * 错误转换函数
     */
    transformError?: (error: Error) => Error;

    /**
     * 错误上下文
     */
    errorContext?: Record<string, any>;
  };

  /**
   * 验证选项
   */
  validationOptions?: ValidationOptions;

  /**
   * 异步操作ID（用于追踪）
   */
  operationId?: string;
}

/**
 * 安全的Promise包装器
 */
export interface SafePromise<T> extends Promise<T> {
  readonly operationId: string;
  readonly validationConfig: PromiseValidationConfig;
  readonly metrics: AsyncOperationMetrics;

  /**
   * 验证结果（如果可用）
   */
  validationResult?: ValidationResult;

  /**
   * 添加验证器链
   */
  validate<U>(schema: ZodSchema<U>, options?: Partial<PromiseValidationConfig>): SafePromise<U>;

  /**
   * 添加错误处理
   */
  handleErrors(handler: (error: Error) => T | Promise<T>): SafePromise<T>;

  /**
   * 添加超时
   */
  withTimeout(ms: number): SafePromise<T>;

  /**
   * 添加重试逻辑
   */
  withRetry(config: PromiseValidationConfig['retry']): SafePromise<T>;

  /**
   * 添加性能监控
   */
  withProfiling(enabled?: boolean): SafePromise<T>;

  /**
   * 获取操作指标
   */
  getMetrics(): AsyncOperationMetrics;
}

/**
 * 验证结果
 */
interface ValidationResult {
  success: boolean;
  data?: any;
  errors?: RuntimeValidationError[];
  warnings?: string[];
  duration: number;
  timestamp: number;
}

/**
 * 异步操作指标
 */
export interface AsyncOperationMetrics {
  operationId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  errorCount: number;
  retryCount: number;
  memoryDelta?: number;
  customMetrics: Record<string, any>;
}

/**
 * 异步验证器
 */
export class AsyncValidator {
  private static instance: AsyncValidator;
  private operationMetrics: Map<string, AsyncOperationMetrics> = new Map();
  private activeOperations: Set<string> = new Set();

  constructor(private validator: RuntimeValidator = RuntimeValidator.getInstance()) {}

  static getInstance(): AsyncValidator {
    if (!this.instance) {
      this.instance = new AsyncValidator();
    }
    return this.instance;
  }

  /**
   * 包装Promise以进行验证
   */
  wrapPromise<T>(
    promise: Promise<T>,
    config: PromiseValidationConfig = {}
  ): SafePromise<T> {
    const operationId = config.operationId || uuidv4();
    const startTime = Date.now();
    const startMemory = config.profiling?.trackMemory ? process.memoryUsage().heapUsed : undefined;

    // 创建指标对象
    const metrics: AsyncOperationMetrics = {
      operationId,
      startTime,
      success: false,
      errorCount: 0,
      retryCount: 0,
      customMetrics: {}
    };

    this.activeOperations.add(operationId);

    // 创建安全Promise
    const safePromise = this.createSafePromise(promise, config, metrics, startMemory);

    this.operationMetrics.set(operationId, metrics);

    return safePromise;
  }

  /**
   * 异步验证函数
   */
  async validateAsync<T>(
    input: T | Promise<T>,
    schema: ZodSchema,
    options: ValidationOptions = {}
  ): Promise<T> {
    const operationId = uuidv4();
    const startTime = Date.now();

    try {
      // 等待输入（如果它是Promise）
      const value = await input;

      // 执行验证
      const result = schema.safeParse(value);

      if (!result.success) {
        const validationErrors = this.validator.validateObject(value, { schema }).errors;
        const primaryError = validationErrors[0] || new RuntimeValidationError(
          result.error.message,
          'ASYNC_VALIDATION_ERROR',
          'validateAsync',
          value,
          schema._def.typeName || 'unknown',
          ['validateAsync'],
          ['Check input against schema', 'Verify schema definition']
        );

        throw new AsyncValidationError(
          primaryError.message,
          primaryError.errorCode,
          primaryError.validationContext,
          primaryError.originalValue,
          primaryError.expectedType,
          primaryError.validationPath,
          primaryError.suggestions,
          operationId,
          Date.now() - startTime
        );
      }

      return result.data;

    } catch (error) {
      if (error instanceof AsyncValidationError) {
        throw error;
      }

      throw new AsyncValidationError(
        `Async validation failed: ${error instanceof Error ? error.message : String(error)}`,
        'ASYNC_VALIDATION_FAILED',
        'validateAsync',
        input,
        schema._def.typeName || 'unknown',
        ['validateAsync'],
        ['Check input validity', 'Review schema requirements'],
        operationId,
        Date.now() - startTime
      );
    }
  }

  /**
   * 批量异步验证
   */
  async validateBatch<T>(
    inputs: (T | Promise<T>)[] | Promise<T[]>,
    schema: ZodSchema,
    options: ValidationOptions = {}
  ): Promise<T[]> {
    const values = await inputs;
    const validationPromises = values.map((input, index) =>
      this.validateAsync(input, schema, options).catch(error => ({
        index,
        error,
        valid: false
      }))
    );

    const results = await Promise.allSettled(validationPromises);
    const validResults: T[] = [];
    const errors: Array<{ index: number; error: any }> = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const value = result.value;
        if (typeof value === 'object' && value && 'error' in value && 'valid' in value) {
          errors.push({ index: (value as any).index, error: (value as any).error });
        } else {
          validResults.push(value as T);
        }
      } else {
        errors.push({ index, error: result.reason });
      }
    });

    if (errors.length > 0 && options.onError !== 'ignore') {
      const errorDetails = errors.map(e => `Index ${e.index}: ${e.error.message}`).join('; ');
      throw new AsyncValidationError(
        `Batch validation failed for ${errors.length} items: ${errorDetails}`,
        'BATCH_VALIDATION_ERROR',
        'validateBatch',
        values,
        'Array',
        ['validateBatch'],
        ['Review individual validation errors', 'Check schema against array items'],
        uuidv4()
      );
    }

    return validResults;
  }

  /**
   * 重试异步操作
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    config: NonNullable<PromiseValidationConfig['retry']>
  ): Promise<T> {
    const { attempts, delay: baseDelay = 1000, backoff = 'fixed', condition } = config;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // 检查重试条件
        if (condition && !condition(lastError, attempt)) {
          throw lastError;
        }

        // 如果不是最后一次尝试，等待后重试
        if (attempt < attempts) {
          let retryDelay = baseDelay;

          switch (backoff) {
            case 'exponential':
              retryDelay = baseDelay * Math.pow(2, attempt - 1);
              break;
            case 'linear':
              retryDelay = baseDelay * attempt;
              break;
            case 'fixed':
            default:
              retryDelay = baseDelay;
          }

          await this.delay(retryDelay);
        }
      }
    }

    throw lastError || new Error(`Operation failed after ${attempts} attempts`);
  }

  /**
   * 带有超时的异步操作
   */
  async withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new AsyncValidationError(
          `Operation timed out after ${timeout}ms`,
          'OPERATION_TIMEOUT',
          'withTimeout',
          null,
          'timeout',
          ['withTimeout'],
          ['Increase timeout duration', 'Optimize operation performance'],
          uuidv4()
        ));
      }, timeout);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * 获取操作指标
   */
  getOperationMetrics(operationId: string): AsyncOperationMetrics | undefined {
    return this.operationMetrics.get(operationId);
  }

  /**
   * 获取所有操作指标
   */
  getAllMetrics(): Map<string, AsyncOperationMetrics> {
    return new Map(this.operationMetrics);
  }

  /**
   * 清理操作指标
   */
  clearMetrics(olderThanMs?: number): void {
    if (olderThanMs) {
      const now = Date.now();
      for (const [id, metrics] of this.operationMetrics.entries()) {
        if (metrics.startTime && (now - metrics.startTime) > olderThanMs && !this.activeOperations.has(id)) {
          this.operationMetrics.delete(id);
        }
      }
    } else {
      this.operationMetrics.clear();
    }
  }

  /**
   * 获取活跃操作统计
   */
  getActiveOperations(): string[] {
    return Array.from(this.activeOperations);
  }

  // ===== 私有辅助方法 =====

  private createSafePromise<T>(
    promise: Promise<T>,
    config: PromiseValidationConfig,
    metrics: AsyncOperationMetrics,
    startMemory?: number
  ): SafePromise<T> {
    const operationId = metrics.operationId;

    // 创建基础Promise
    let safePromise = promise;

    // 应用超时
    if (config.timeout) {
      safePromise = this.withTimeout(safePromise, config.timeout);
    }

    // 应用重试逻辑
    if (config.retry) {
      const originalOperation = () => promise;
      safePromise = this.withRetry(originalOperation, config.retry);
    }

    // 创建SafePromise实例
    const safePromiseInstance: SafePromise<T> = Promise.resolve(safePromise) as SafePromise<T>;

    // 添加元数据和方法
    safePromiseInstance.operationId = operationId;
    safePromiseInstance.validationConfig = config;
    safePromiseInstance.metrics = metrics;

    // 添加验证方法
    safePromiseInstance.validate = <U>(schema: ZodSchema<U>, options: Partial<PromiseValidationConfig> = {}): SafePromise<U> => {
      const newConfig = { ...config, ...options };
      const validatedPromise = safePromise.then(async (result) => {
        try {
          const validated = await this.validateAsync(result, schema, newConfig.validationOptions);
          return validated;
        } catch (error) {
          throw this.wrapError(error as Error, newConfig, operationId);
        }
      });

      return this.createSafePromise(validatedPromise, newConfig, metrics, startMemory);
    };

    // 添加错误处理方法
    safePromiseInstance.handleErrors = (handler: (error: Error) => T | Promise<T>): SafePromise<T> => {
      const handledPromise = safePromise.catch(async (error) => {
        try {
          return await handler(error);
        } catch (handlerError) {
          throw handlerError;
        }
      });

      return this.createSafePromise(handledPromise, config, metrics, startMemory);
    };

    // 添加超时方法
    safePromiseInstance.withTimeout = (timeout: number): SafePromise<T> => {
      const newConfig = { ...config, timeout };
      const timeoutPromise = this.withTimeout(safePromise, timeout);
      return this.createSafePromise(timeoutPromise, newConfig, metrics, startMemory);
    };

    // 添加重试方法
    safePromiseInstance.withRetry = (retryConfig: PromiseValidationConfig['retry']): SafePromise<T> => {
      const newConfig = { ...config, retry: retryConfig };
      const retryPromise = this.withRetry(() => promise, retryConfig);
      return this.createSafePromise(retryPromise, newConfig, metrics, startMemory);
    };

    // 添加性能监控方法
    safePromiseInstance.withProfiling = (enabled: boolean = true): SafePromise<T> => {
      const newConfig = {
        ...config,
        profiling: enabled ? { trackDuration: true, trackMemory: true } : undefined
      };
      return this.createSafePromise(safePromise, newConfig, metrics, startMemory);
    };

    // 添加获取指标方法
    safePromiseInstance.getMetrics = (): AsyncOperationMetrics => {
      return this.getOperationMetrics(operationId) || metrics;
    };

    // 处理Promise完成
    safePromise
      .then((result) => {
        // 验证返回值（如果配置了模式）
        if (config.returnSchema) {
          return this.validateAsync(result, config.returnSchema, config.validationOptions)
            .then(validatedResult => {
              this.updateMetrics(operationId, true, startMemory);
              this.activeOperations.delete(operationId);
              return validatedResult;
            })
            .catch(error => {
              this.updateMetrics(operationId, false, startMemory, error);
              this.activeOperations.delete(operationId);
              throw this.wrapError(error, config, operationId);
            });
        }

        this.updateMetrics(operationId, true, startMemory);
        this.activeOperations.delete(operationId);
        return result;
      })
      .catch(error => {
        this.updateMetrics(operationId, false, startMemory, error);
        this.activeOperations.delete(operationId);
        throw this.wrapError(error, config, operationId);
      });

    return safePromiseInstance;
  }

  private updateMetrics(operationId: string, success: boolean, startMemory?: number, error?: Error): void {
    const metrics = this.operationMetrics.get(operationId);
    if (!metrics) return;

    metrics.success = success;
    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;
    metrics.errorCount = error ? 1 : 0;

    if (startMemory && metrics.endTime) {
      const endMemory = process.memoryUsage().heapUsed;
      metrics.memoryDelta = endMemory - startMemory;
    }

    // 更新统计信息
    this.operationMetrics.set(operationId, metrics);
  }

  private wrapError(error: Error, config: PromiseValidationConfig, operationId: string): Error {
    const { errorHandling } = config;

    if (!errorHandling) {
      return error;
    }

    const { wrapOriginal = false, transformError, errorContext = {} } = errorHandling;

    let wrappedError = error;

    if (transformError) {
      wrappedError = transformError(error);
    }

    if (wrapOriginal && !(error instanceof AsyncValidationError)) {
      wrappedError = new AsyncValidationError(
        wrappedError.message,
        'ASYNC_OPERATION_FAILED',
        'asyncWrap',
        errorContext,
        'unknown',
        ['asyncWrap'],
        ['Check operation configuration', 'Review error details'],
        operationId
      );
    }

    return wrappedError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 异步验证装饰器
 * @example
 * @AsyncValidate({
 *   returnSchema: z.object({ success: z.boolean() }),
 *   timeout: 5000,
 *   retry: { attempts: 3, delay: 1000 }
 * })
 * async createUser(data: any) {
 *   return { success: true };
 * }
 */
export function AsyncValidate(config: PromiseValidationConfig = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const asyncValidator = AsyncValidator.getInstance();

    if (typeof originalMethod !== 'function') {
      throw new Error(`@AsyncValidate can only be applied to async functions`);
    }

    descriptor.value = async function (this: any, ...args: any[]) {
      try {
        // 执行原始异步方法
        const result = await originalMethod.apply(this, args);

        // 包装结果Promise进行验证
        const resultPromise = Promise.resolve(result);
        return asyncValidator.wrapPromise(resultPromise, config);
      } catch (error) {
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Promise验证装饰器：用于返回Promise的方法
 * @example
 * @ValidatePromise({
 *   returnSchema: z.object({ data: z.any() }),
 *   timeout: 10000
 * })
 * async fetchData() {
 *   return { data: await getExternalData() };
 * }
 */
export function ValidatePromise(config: Omit<PromiseValidationConfig, 'returnSchema'> & { returnSchema: ZodSchema }) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const asyncValidator = AsyncValidator.getInstance();

    descriptor.value = async function (this: any, ...args: any[]) {
      const result = await originalMethod.apply(this, args);
      const resultPromise = Promise.resolve(result);

      return asyncValidator.wrapPromise(resultPromise, config);
    };

    return descriptor;
  };
}

/**
 * 异步重试装饰器
 * @example
 * @AsyncRetry({ attempts: 3, delay: 1000, backoff: 'exponential' })
 * async unstableOperation() {
 *   // 这个方法会在失败时自动重试
 * }
 */
export function AsyncRetry(config: NonNullable<PromiseValidationConfig['retry']>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const asyncValidator = AsyncValidator.getInstance();

    descriptor.value = async function (this: any, ...args: any[]) {
      const operation = () => originalMethod.apply(this, args);
      return asyncValidator.withRetry(operation, config);
    };

    return descriptor;
  };
}

/**
 * 异步超时装饰器
 * @example
 * @AsyncTimeout(5000)
 * async longRunningOperation() {
 *   // 这个方法如果在5秒内没有完成会被取消
 * }
 */
export function AsyncTimeout(timeout: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const asyncValidator = AsyncValidator.getInstance();

    descriptor.value = async function (this: any, ...args: any[]) {
      const resultPromise = originalMethod.apply(this, args);
      return asyncValidator.withTimeout(resultPromise, timeout);
    };

    return descriptor;
  };
}

/**
 * 批量异步验证装饰器
 * @example
 * @ValidateBatchAsync(z.string().email())
 * async processEmails(@BatchParam() emails: string[]) {
 *   // 数组中的每个邮箱地址都会被验证
 * }
 */
export function ValidateBatchAsync(itemSchema: ZodSchema, options: ValidationOptions = {}) {
  return function (target: any, propertyKey: string | symbol, parameterIndex: number) {
    const originalMethod = target[propertyKey];
    const asyncValidator = AsyncValidator.getInstance();

    if (typeof originalMethod === 'function') {
      target[propertyKey] = async function (this: any, ...args: any[]) {
        const arrayArg = args[parameterIndex];

        if (!Array.isArray(arrayArg)) {
          throw new Error(`Parameter at index ${parameterIndex} must be an array`);
        }

        // 批量验证数组
        try {
          const validatedArray = await asyncValidator.validateBatch(arrayArg, itemSchema, options);
          args[parameterIndex] = validatedArray;
          return originalMethod.apply(this, args);
        } catch (error) {
          throw error;
        }
      };
    }
  };
}