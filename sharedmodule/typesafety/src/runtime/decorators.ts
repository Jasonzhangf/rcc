/**
 * 运行时验证装饰器 - 支持类和方法级别的类型验证
 * 提供装饰器语法糖来启用运行时类型检查
 */

import 'reflect-metadata';
import { z, ZodSchema } from 'zod';
import { RuntimeValidator, FunctionValidationSchema, ValidationOptions, RuntimeValidationError } from './RuntimeValidator.js';

/**
 * 装饰器选项
 */
export interface DecoratorOptions extends ValidationOptions {
  /**
   * 验证模式（可以传入 Zod Schema 或验证函数）
   */
  schema?: ZodSchema | ((value: any) => boolean | string);

  /**
   * 错误消息模板
   */
  errorMessage?: string;

  /**
   * 验证组（用于条件验证）
   */
  groups?: string[];

  /**
   * 条件验证函数
   */
  condition?: (target: any, propertyKey: string, value: any) => boolean;

  /**
   * 异步验证模式
   */
  async?: boolean;

  /**
   * 缓存验证结果
   */
  cacheValidation?: boolean;

  /**
   * 验证优先级
   */
  priority?: number;
}

/**
 * 方法参数装饰器选项
 */
export interface ParameterDecoratorOptions extends DecoratorOptions {
  /**
   * 参数索引
   */
  index?: number;

  /**
   * 参数名称（用于错误消息）
   */
  paramName?: string;
}

/**
 * 属性装饰器选项
 */
export interface PropertyDecoratorOptions extends DecoratorOptions {
  /**
   * 是否允许 null
   */
  nullable?: boolean;

  /**
   * 默认值
   */
  defaultValue?: any;

  /**
   * 转换器（在验证前转换值）
   */
  transformer?: (value: any) => any;

  /**
   * 类型信息（用于运行时类型检查）
   */
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date' | 'function';
}

/**
 * 类装饰器选项
 */
export interface ClassDecoratorOptions extends ValidationOptions {
  /**
   * 是否验证所有方法
   */
  validateAllMethods?: boolean;

  /**
   * 是否验证属性访问器
   */
  validateProperties?: boolean;

  /**
   * 构造函数参数验证
   */
  constructorValidation?: boolean;

  /**
   * 实例生命周期验证
   */
  lifecycleValidation?: 'none' | 'constructor' | 'all';

  /**
   * 错误处理策略
   */
  errorHandling?: 'throw' | 'collect' | 'callback';

  /**
   * 错误回调函数
   */
  onError?: (errors: RuntimeValidationError[], target: any, method?: string) => void;
}

/**
 * 验证元数据
 */
interface ValidationMetadata {
  type: 'method' | 'parameter' | 'property' | 'class';
  target: any;
  propertyKey?: string | symbol;
  parameterIndex?: number;
  schema?: ZodSchema | ((value: any) => boolean | string);
  options?: DecoratorOptions | ClassDecoratorOptions;
  groups?: string[];
}

/**
 * 方法验证存储
 */
interface MethodValidationConfig {
  methodName: string;
  parameters: Map<number, FunctionValidationSchema>;
  returnSchema?: ZodSchema;
  options?: FunctionValidationSchema['options'];
}

/**
 * 类验证配置存储
 */
const CLASS_VALIDATION_CONFIG = new WeakMap<any, MethodValidationConfig[]>();
const PROPERTY_VALIDATION_CONFIG = new WeakMap<any, Map<string, PropertyDecoratorOptions>>();

/**
 * 类装饰器：启用运行时验证
 * @example
 * @RuntimeValidate({
 *   validateAllMethods: true,
 *   validateProperties: true,
 *   errorHandling: 'collect'
 * })
 * class UserService {
 *   @ValidateMethod({
 *     parameters: [z.string(), z.number()],
 *     returnValue: z.object({ id: z.string(), name: z.string() })
 *   })
 *   createUser(name: string, age: number) {
 *     return { id: '123', name, age };
 *   }
 * }
 */
export function RuntimeValidate(options: ClassDecoratorOptions = {}) {
  return function <T extends { new(...args: any[]): {} }>(constructor: T) {
    const validator = RuntimeValidator.getInstance();
    const className = constructor.name;

    // 存储类的验证配置
    const methodConfigs: MethodValidationConfig[] = [];

    // 包装构造函数
    const NewConstructor: any = class extends constructor {
      constructor(...args: any[]) {
        super(...args);

        // 如果启用了构造函数验证
        if (options.constructorValidation) {
          // TODO: 实现构造函数参数验证
        }

        // 如果启用了属性验证
        if (options.validateProperties) {
          this._setupPropertyValidation(validator, options);
        }
      }

      private _setupPropertyValidation(validator: RuntimeValidator, opts: ClassDecoratorOptions) {
        const propertyConfig = PROPERTY_VALIDATION_CONFIG.get(this);
        if (!propertyConfig) return;

        // 遍历所有属性并设置 getter/setter
        for (const [propertyKey, config] of propertyConfig.entries()) {
          const originalDescriptor = Object.getOwnPropertyDescriptor(this, propertyKey);
          const originalValue = (this as any)[propertyKey];

          Object.defineProperty(this, propertyKey, {
            get() {
              if (config.schema && opts.validateProperties) {
                const validated = validator.validateObject(originalValue, { schema: config.schema as ZodSchema });
                if (!validated.isValid) {
                  this._handlePropertyValidationErrors(validated.errors, propertyKey, opts);
                }
                return validated.value;
              }
              return originalValue;
            },
            set(newValue: any) {
              if (config.schema && opts.validateProperties) {
                let valueToValidate = newValue;

                // 应用转换器
                if (config.transformer) {
                  valueToValidate = config.transformer(newValue);
                }

                // 验证新值
                const validated = validator.validateObject(valueToValidate, { schema: config.schema as ZodSchema });
                if (!validated.isValid) {
                  this._handlePropertyValidationErrors(validated.errors, propertyKey, opts);
                  if (opts.errorHandling === 'throw') {
                    throw validated.errors[0];
                  }
                }
                return validated.value;
              }
              return originalValue;
            },
            enumerable: true,
            configurable: true
          });
        }
      }

      private _handlePropertyValidationErrors(errors: RuntimeValidationError[], propertyKey: string, opts: ClassDecoratorOptions) {
        if (opts.onError) {
          opts.onError(errors, this, propertyKey);
        } else if (opts.errorHandling === 'throw') {
          throw errors[0];
        } else if (opts.errorHandling === 'collect') {
          if (!this._validationErrors) {
            this._validationErrors = [];
          }
          this._validationErrors.push(...errors);
        }
      }
    };

    // 复制静态属性和方法
    Object.setPrototypeOf(NewConstructor, constructor);
    Object.defineProperty(NewConstructor, 'name', { value: constructor.name });
    Object.defineProperty(NewConstructor, 'prototype', { value: constructor.prototype });

    // 遍历原型链上的方法进行验证包装
    if (options.validateAllMethods) {
      NewConstructor.prototype = wrapAllMethods(constructor.prototype, validator, options);
    }

    // 存储方法验证配置
    CLASS_VALIDATION_CONFIG.set(NewConstructor, methodConfigs);

    return NewConstructor as T;
  };
}

/**
 * 方法装饰器：验证方法参数和返回值
 * @example
 * @ValidateMethod({
 *   parameters: [z.string().email(), z.number().min(18)],
 *   returnValue: z.object({ success: z.boolean() }),
 *   options: { enableCache: true }
 * })
 * createUser(email: string, age: number) {
 *   return { success: true };
 * }
 */
export function ValidateMethod(schema: FunctionValidationSchema) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const validator = RuntimeValidator.getInstance();

    if (typeof originalMethod !== 'function') {
      throw new Error(`@ValidateMethod can only be applied to functions, got ${typeof originalMethod}`);
    }

    descriptor.value = function (this: any, ...args: any[]) {
      const context = {
        target: this,
        methodName: propertyKey,
        className: this.constructor.name,
        args
      };

      try {
        // 创建安全的函数包装器
        const safeMethod = validator.validateFunction(originalMethod, schema, propertyKey);

        // 执行验证后的方法
        return safeMethod.apply(this, args);
      } catch (error) {
        if (error instanceof RuntimeValidationError) {
          throw new Error(`[${context.className}.${context.methodName}] ${error.message}`);
        }
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * 参数装饰器：验证方法参数
 * @example
 * createUser(@ValidateParam(z.string().email()) email: string,
 *           @ValidateParam(z.number().min(18)) age: number) {
 *   // 参数在调用前会被自动验证
 * }
 */
export function ValidateParam(schema: ZodSchema | ((value: any) => boolean | string), options: ParameterDecoratorOptions = {}) {
  return function (target: any, propertyKey: string | symbol, parameterIndex: number) {
    const existingParams = Reflect.getMetadata('validation:parameters', target, propertyKey) || [];

    existingParams.push({
      index: parameterIndex,
      schema,
      options: { ...options, index: parameterIndex }
    });

    Reflect.defineMetadata('validation:parameters', existingParams, target, propertyKey);

    // 包装目标方法以应用参数验证
    const originalMethod = target[propertyKey];
    if (typeof originalMethod === 'function') {
      target[propertyKey] = function (...args: any[]) {
        const validator = RuntimeValidator.getInstance();

        // 获取所有参数验证配置
        const allParams = Reflect.getMetadata('validation:parameters', target, propertyKey) || [];

        allParams.forEach((paramConfig: any) => {
          const { index, schema: paramSchema } = paramConfig;
          const argValue = args[index];

          try {
            if (paramSchema instanceof z.ZodType) {
              const result = paramSchema.safeParse(argValue);
              if (!result.success) {
                const paramName = paramConfig.options?.paramName || `parameter ${index}`;
                throw new Error(`Parameter validation failed for ${paramName}: ${result.error.message}`);
              }
            } else if (typeof paramSchema === 'function') {
              const validationResult = paramSchema(argValue);
              if (validationResult !== true) {
                const paramName = paramConfig.options?.paramName || `parameter ${index}`;
                const errorMessage = typeof validationResult === 'string' ? validationResult : 'Validation failed';
                throw new Error(`Parameter validation failed for ${paramName}: ${errorMessage}`);
              }
            }
          } catch (error) {
            const className = this.constructor.name;
            throw new Error(`[${className}.${String(propertyKey)}] ${error instanceof Error ? error.message : String(error)}`);
          }
        });

        return originalMethod.apply(this, args);
      };
    }
  };
}

/**
 * 属性装饰器：验证类属性
 * @example
 * class User {
 *   @ValidateProperty(z.string().min(2).max(50))
 *   name: string;
 *
 *   @ValidateProperty(z.number().int().positive())
 *   age: number;
 * }
 */
export function ValidateProperty(schema: ZodSchema | ((value: any) => boolean | string), options: PropertyDecoratorOptions = {}) {
  return function (target: any, propertyKey: string | symbol) {
    // 存储属性验证配置
    if (!PROPERTY_VALIDATION_CONFIG.has(target)) {
      PROPERTY_VALIDATION_CONFIG.set(target, new Map());
    }

    const propertyConfig = PROPERTY_VALIDATION_CONFIG.get(target)!;
    propertyConfig.set(propertyKey as string, { ...options, schema });

    // 设置属性 getter/setter 用于验证
    const privateKey = `_${String(propertyKey)}`;

    Object.defineProperty(target, propertyKey, {
      get() {
        return this[privateKey];
      },
      set(value: any) {
        let valueToSet = value;

        // 应用转换器
        if (options.transformer) {
          valueToSet = options.transformer(value);
        }

        // 验证值
        if (schema instanceof z.ZodType) {
          const result = schema.safeParse(valueToSet);
          if (!result.success) {
            const errorMessage = options.errorMessage || `Property ${String(propertyKey)} validation failed: ${result.error.message}`;

            if (options.onError === 'throw') {
              throw new Error(errorMessage);
            } else if (options.onError === 'warn') {
              console.warn(`[ValidateProperty] ${errorMessage}`);
            }

            // 如果不允许设置，使用默认值
            if (options.defaultValue !== undefined) {
              valueToSet = options.defaultValue;
            } else {
              return; // 不设置值
            }
          } else {
            valueToSet = result.data;
          }
        } else if (typeof schema === 'function') {
          const validationResult = schema(valueToSet);
          if (validationResult !== true) {
            const errorMessage = options.errorMessage ||
              (typeof validationResult === 'string' ? validationResult : `Property ${String(propertyKey)} validation failed`);

            if (options.onError === 'throw') {
              throw new Error(errorMessage);
            } else if (options.onError === 'warn') {
              console.warn(`[ValidateProperty] ${errorMessage}`);
            }

            if (options.defaultValue !== undefined) {
              valueToSet = options.defaultValue;
            } else {
              return;
            }
          }
        }

        this[privateKey] = valueToSet;
      },
      enumerable: true,
      configurable: true
    });
  };
}

/**
 * 验证组装饰器：条件性验证
 * @example
 * @ValidationGroup('create', {
 *   parameters: [z.string(), z.string().email()],
 *   returnValue: z.object({ id: z.string() })
 * })
 * @ValidationGroup('update', {
 *   parameters: [z.string(), z.object({}).passthrough()],
 *   returnValue: z.object({ success: z.boolean() })
 * })
 * saveUser(id: string, data: any) {
 *   // Will validate based on active validation group
 * }
 */
export function ValidationGroup(groupName: string, schema: FunctionValidationSchema) {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const validator = RuntimeValidator.getInstance();

    descriptor.value = function (this: any, ...args: any[]) {
      // 检查当前激活的验证组
      const activeGroups = Reflect.getMetadata('validation:active-groups', this) || [];

      if (activeGroups.includes(groupName)) {
        // 应用此验证组的配置
        const safeMethod = validator.validateFunction(originalMethod, schema, String(propertyKey));
        return safeMethod.apply(this, args);
      } else {
        // 执行原始方法（不验证）
        return originalMethod.apply(this, args);
      }
    };

    // 存储验证组配置
    const existingGroups = Reflect.getMetadata('validation:groups', target, propertyKey) || {};
    existingGroups[groupName] = schema;
    Reflect.defineMetadata('validation:groups', existingGroups, target, propertyKey);

    return descriptor;
  };
}

/**
 * 批量验证装饰器：验证数组参数
 * @example
 * @ValidateBatch(z.string().email())
 * sendEmails(@BatchParam() emails: string[]) {
 *   // emails 数组中的每个元素都会被验证为有效的邮箱地址
 * }
 */
export function ValidateBatch(itemSchema: ZodSchema, options: DecoratorOptions = {}) {
  return function (target: any, propertyKey: string | symbol, parameterIndex: number) {
    const originalMethod = target[propertyKey];
    const validator = RuntimeValidator.getInstance();

    if (typeof originalMethod === 'function') {
      target[propertyKey] = function (this: any, ...args: any[]) {
        const arrayArg = args[parameterIndex];

        if (!Array.isArray(arrayArg)) {
          throw new Error(`Parameter at index ${parameterIndex} must be an array`);
        }

        // 验证数组中的每个元素
        const errors: string[] = [];
        arrayArg.forEach((item, index) => {
          const result = itemSchema.safeParse(item);
          if (!result.success) {
            errors.push(`Item at index ${index}: ${result.error.message}`);
          }
        });

        if (errors.length > 0) {
          throw new Error(`Batch validation failed: ${errors.join(', ')}`);
        }

        return originalMethod.apply(this, args);
      };
    }
  };
}

/**
 * 延迟验证装饰器：在第一次访问时验证
 * @example
 * @LazyValidate(z.string().min(5))
 * lazyProperty: string;
 */
export function LazyValidate(schema: ZodSchema, options: DecoratorOptions = {}) {
  return function (target: any, propertyKey: string | symbol) {
    const privateKey = `_${String(propertyKey)}_validated`;
    let hasBeenValidated = false;

    Object.defineProperty(target, propertyKey, {
      get() {
        if (!hasBeenValidated) {
          const value = this[privateKey];
          const result = schema.safeParse(value);

          if (!result.success) {
            const error = new Error(`Lazy validation failed for ${String(propertyKey)}: ${result.error.message}`);
            if (options.onError === 'throw') {
              throw error;
            } else if (options.onError === 'warn') {
              console.warn(error.message);
            }
          }

          hasBeenValidated = true;
        }

        return this[privateKey];
      },
      set(value: any) {
        this[privateKey] = value;
        hasBeenValidated = false; // 重新设置时需要重新验证
      },
      enumerable: true,
      configurable: true
    });
  };
}

/**
 * 设置激活的验证组
 * @example
 * setActiveValidationGroups(userService, ['create', 'admin']);
 */
export function setActiveValidationGroups(target: any, groups: string[]): void {
  Reflect.defineMetadata('validation:active-groups', groups, target);
}

/**
 * 获取当前激活的验证组
 */
export function getActiveValidationGroups(target: any): string[] {
  return Reflect.getMetadata('validation:active-groups', target) || [];
}

/**
 * 清除验证组
 */
export function clearValidationGroups(target: any): void {
  Reflect.defineMetadata('validation:active-groups', [], target);
}

/**
 * 验证类实例的所有属性
 * @example
 * const errors = validateInstance(userService);
 */
export function validateInstance<T>(instance: T): RuntimeValidationError[] {
  const errors: RuntimeValidationError[] = [];
  const validator = RuntimeValidator.getInstance();

  if (instance && typeof instance === 'object') {
    // 获取对象的键
    const keys = Object.keys(instance) as Array<keyof T>;

    keys.forEach(key => {
      try {
        const value = instance[key];
        const propertyConfig = PROPERTY_VALIDATION_CONFIG.get(instance.constructor.prototype)?.get(String(key));

        if (propertyConfig?.schema) {
          const result = validator.validateObject(value, { schema: propertyConfig.schema as ZodSchema });
          if (!result.isValid) {
            errors.push(...result.errors);
          }
        }
      } catch (error) {
        if (error instanceof RuntimeValidationError) {
          errors.push(error);
        }
      }
    });
  }

  return errors;
}

/**
 * 辅助函数：包装类中的所有方法
 */
function wrapAllMethods(prototype: any, validator: RuntimeValidator, options: ClassDecoratorOptions) {
  const methodNames = Object.getOwnPropertyNames(prototype).filter(name => {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
    return descriptor && typeof descriptor.value === 'function' && name !== 'constructor';
  });

  methodNames.forEach(methodName => {
    const originalMethod = prototype[methodName];
    const methodConfig = CLASS_VALIDATION_CONFIG.get(prototype.constructor)?.find(config => config.methodName === methodName);

    if (!methodConfig) {
      // 如果没有特定的验证配置，创建基本的验证包装器
      prototype[methodName] = function (this: any, ...args: any[]) {
        try {
          return originalMethod.apply(this, args);
        } catch (error) {
          if (error instanceof RuntimeValidationError && options.onError) {
            options.onError([error], this, methodName);
          }
          throw error;
        }
      };
    }
  });

  return prototype;
}

/**
 * 快速验证函数：用于简单场景
 * @example
 * const result = quickValidate(z.string().email(), 'user@example.com');
 */
export function quickValidate<T>(schema: ZodSchema<T>, value: unknown): { success: boolean; data?: T; error?: string } {
  try {
    const result = schema.safeParse(value);
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return { success: false, error: result.error.message };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * 类型安全的类装饰器工厂函数
 */
export function createTypedValidator<T>() {
  return {
    validateProperty: <K extends keyof T>(schema: ZodSchema, options?: PropertyDecoratorOptions) => {
      return ValidateProperty(schema, options);
    },

    validateMethod: (schema: FunctionValidationSchema) => {
      return ValidateMethod(schema);
    },

    validateParam: <K extends keyof T>(index: number, schema: ZodSchema, options?: ParameterDecoratorOptions) => {
      return ValidateParam(schema, { ...options, index });
    }
  };
}

// 元数据键定义
export const VALIDATION_METADATA = {
  PARAMETERS: 'validation:parameters',
  PROPERTIES: 'validation:properties',
  GROUPS: 'validation:groups',
  ACTIVE_GROUPS: 'validation:active-groups'
} as const;