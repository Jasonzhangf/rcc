// ===== Zod Schema 导出 =====
export * from './schemas/core.js';
export * from './schemas/config.js';
export * from './schemas/module.js';

// ===== 验证器导出 =====
export {
  SafeJSON,
  ConfigValidator,
  JSONParseError,
  JSONValidationError,
  JSONSchemaValidator
} from './validators/safeJson.js';

export {
  SafeEnv,
  EnvAccessError,
  EnvValidationError
} from './validators/envValidator.js';

export {
  SafeDynamicImport,
  DynamicImportError,
  ImportValidationError,
  ModuleSecurityError
} from './validators/dynamicImport.js';

// ===== 迁移工具导出 =====
export {
  JS2TSTransformer,
  JSONParseMigrator,
  TypeDeclarationGenerator,
  CodeTransformError
} from './migration/codeTransformer.js';

// ===== 运行时验证器导出 =====
export {
  RuntimeValidator,
  RuntimeValidationError,
  SafeFunction,
  SafeObject,
  SafeArray,
  FunctionValidationSchema,
  ObjectValidationSchema,
  ArrayValidationSchema,
  ValidationOptions,
  ValidationStats,
  ValidationContext,
  SafeExecutionContext
} from './runtime/RuntimeValidator.js';

export {
  RuntimeValidate,
  ValidateMethod,
  ValidateParam,
  ValidateProperty,
  ValidationGroup,
  ValidateBatch,
  LazyValidate,
  AsyncValidate,
  ValidatePromise,
  setActiveValidationGroups,
  getActiveValidationGroups,
  clearValidationGroups,
  validateInstance,
  quickValidate,
  createTypedValidator,
  DecoratorOptions,
  ParameterDecoratorOptions,
  PropertyDecoratorOptions,
  ClassDecoratorOptions
} from './runtime/decorators.js';

export {
  AsyncValidator,
  AsyncValidationError,
  SafePromise,
  PromiseValidationConfig,
  AsyncOperationMetrics,
  AsyncRetry,
  AsyncTimeout,
  ValidateBatchAsync
} from './runtime/asyncValidator.js';

export {
  ValidationCache,
  CacheConfig,
  CacheEntry,
  CacheStatistics,
  BatchConfig,
  PerformanceMetrics
} from './runtime/validationCache.js';

export {
  ValidationUtils,
  commonSchemas,
  ValidationResult,
  ValidationContext,
  ValidatorFunction,
  ValidationComposer,
  createQuickValidator,
  conditionalValidate,
  createValidationPipeline,
  ObjectValidatorBuilder,
  RecursiveObjectValidator
} from './runtime/validationUtils.js';

// ===== 工具函数 =====

// ===== 工具函数 =====

import { SafeJSON, JSONParseError, JSONValidationError } from './validators/safeJson.js';
import { SafeEnv, EnvAccessError, EnvValidationError } from './validators/envValidator.js';
import { SafeDynamicImport, DynamicImportError, ModuleSecurityError } from './validators/dynamicImport.js';
import { packageJsonSchema, rccConfigSchema } from './schemas/index.js';
import { RuntimeValidator, ValidationOptions } from './runtime/RuntimeValidator.js';
import { ValidationCache } from './runtime/validationCache.js';
import { ValidationUtils } from './runtime/validationUtils.js';

/**
 * 创建完整的类型安全环境（增强版）
 */
export function createTypeSafeEnvironment(prefix: string = 'RCC_') {
  const safeJson = {
    parse: SafeJSON.parse.bind(SafeJSON),
    parseAndValidate: SafeJSON.parseAndValidate.bind(SafeJSON),
    parseFromFile: SafeJSON.parseFromFile.bind(SafeJSON),
    parseAndValidateFromFile: SafeJSON.parseAndValidateFromFile.bind(SafeJSON),
    stringify: SafeJSON.stringify.bind(SafeJSON)
  };

  const safeEnv = new SafeEnv(prefix);
  const safeDynamicImport = SafeDynamicImport.getInstance();
  const runtimeValidator = RuntimeValidator.getInstance();
  const validationUtils = ValidationUtils.getInstance();
  const validationCache = new ValidationCache();

  return {
    safeJson,
    safeEnv,
    safeDynamicImport,
    runtimeValidator,
    validationUtils,
    validationCache,

    // 增强的便捷验证函数
    validatePackageJson: (data: string) => SafeJSON.parseAndValidate(data, packageJsonSchema),
    validateRCCConfig: (data: string) => SafeJSON.parseAndValidate(data, rccConfigSchema),

    // 运行时验证快捷方式
    validateValue: <T>(value: unknown, schema: ZodSchema<T>) => validationUtils.validateValue(value, schema),
    validateAsync: <T>(input: T | Promise<T>, schema: ZodSchema<T>, options?: ValidationOptions) =>
      validationUtils.validateAsync(input, schema, { options }),

    // 安全配置快捷方式
    safeFunction: <T extends (...args: any[]) => any>(fn: T, schema: FunctionValidationSchema) =>
      runtimeValidator.validateFunction(fn, schema),

    // 缓存验证
    cachedValidate: <T>(value: unknown, schema: ZodSchema<T>) =>
      ValidationCache.createCachedValidator(validationCache, schema).validate(value)
  };
}

/**
 * 全局类型安全设置（增强版）
 */
export class TypeSafetyManager {
  private static instance: TypeSafetyManager;
  private environment: SafeEnv;
  private jsonValidator: typeof SafeJSON;
  private importValidator: SafeDynamicImport;
  private runtimeValidator: RuntimeValidator;
  private validationUtils: ValidationUtils;

  private constructor() {
    this.environment = new SafeEnv('RCC_');
    this.jsonValidator = SafeJSON;
    this.importValidator = SafeDynamicImport.getInstance();
    this.runtimeValidator = RuntimeValidator.getInstance();
    this.validationUtils = ValidationUtils.getInstance();
  }

  static getInstance(): TypeSafetyManager {
    if (!this.instance) {
      this.instance = new TypeSafetyManager();
    }
    return this.instance;
  }

  /**
   * 验证配置文件
   */
  async validateConfigFile<T>(
    filePath: string,
    schema: any,
    options?: any
  ) {
    return this.jsonValidator.parseAndValidateFromFile(filePath, schema, options);
  }

  /**
   * 安全访问环境变量
   */
  getEnvironmentVariable(
    varName: string,
    options?: any
  ) {
    return this.environment.get(varName, options);
  }

  /**
   * 安全导入模块
   */
  async importModule(modulePath: string, options?: any) {
    return this.importValidator.import(modulePath, options);
  }

  /**
   * 创建安全函数包装器
   */
  createSafeFunction<T extends (...args: any[]) => any>(
    fn: T,
    schema: FunctionValidationSchema
  ) {
    return this.runtimeValidator.validateFunction(fn, schema);
  }

  /**
   * 运行时验证值
   */
  validateValue<T>(value: unknown, schema: ZodSchema<T>) {
    return this.validationUtils.validateValue(value, schema);
  }

  /**
   * 异步验证值
   */
  async validateValueAsync<T>(input: T | Promise<T>, schema: ZodSchema<T>) {
    return this.validationUtils.validateAsync(input, schema);
  }

  /**
   * 获取安全验证工具
   */
  getValidators() {
    return {
      json: this.jsonValidator,
      env: this.environment,
      dynamicImport: this.importValidator,
      runtimeValidator: this.runtimeValidator,
      validationUtils: this.validationUtils
    };
  }
}

/**
 * 默认的 Zod 验证模式
 */
export const schemas = {
  core: {
    packageJson: packageJsonSchema,
    rccConfig: rccConfigSchema
  }
} as const;

// 生成索引文件（需要时）
export * from './schemas/index.js';
export { SafeJSON as JSON } from './validators/safeJson.js';
export { SafeEnv as Env } from './validators/envValidator.js';
export { SafeDynamicImport as DynamicImport } from './validators/dynamicImport.js';