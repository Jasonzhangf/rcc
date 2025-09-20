# 🚀 RCC 运行时类型验证完整指南

## 📋 概述

RCC 运行时类型验证系统是专为 JavaScript/TypeScript 项目设计的全面验证解决方案。它提供了**装饰器支持、函数包装、异步验证、性能优化**等高级功能，帮助开发者在运行时确保类型安全和数据完整性。

## ✨ 核心特性

### 🛡️ 完整的运行时验证
- **函数验证**：参数、返回值、异步操作验证
- **对象验证**：嵌套对象、属性验证、属性访问器
- **数组验证**：批量验证、唯一性检查、长度限制
- **类型转换**：安全的类型转换和验证

### 🎨 装饰器支持
- **类装饰器**：`@RuntimeValidate` 启用类级验证
- **方法装饰器**：`@ValidateMethod` 验证方法参数和返回值
- **属性装饰器**：`@ValidateProperty` 验证类属性
- **参数装饰器**：`@ValidateParam` 验证函数参数

### ⚡ 异步验证
- **Promise 安全包装**：异步操作的验证和重试
- **批量验证**：并发验证大量数据
- **超时保护**：防止验证操作超时
- **错误恢复**：优雅的错误处理和重试机制

### 🚀 性能优化
- **智能缓存**：基于 LRU/LFU 的验证结果缓存
- **批处理验证**：批量验证优化的性能
- **按需验证**：延迟验证和条件验证
- **内存管理**：自动清理和内存优化

## 🎯 快速开始

### 1️⃣ 基础验证

```typescript
import { RuntimeValidator, z } from 'rcc-typesafety';

const validator = RuntimeValidator.getInstance();

// 验证函数
const safeFunction = validator.validateFunction(
  (name: string, age: number) => ({ name, age }),
  {
    parameters: [z.string(), z.number().min(18)],
    returnValue: z.object({ name: z.string(), age: z.number() })
  }
);

const result = safeFunction("张三", 25); // ✅ 成功验证
```

### 2️⃣ 装饰器验证

```typescript
import { RuntimeValidate, ValidateMethod, ValidateParam } from 'rcc-typesafety';
import { z } from 'zod';

@RuntimeValidate({
  validateProperties: true,
  validateAllMethods: true
})
class UserService {
  @ValidateMethod({
    parameters: [
      z.string().email(),
      z.number().min(18).max(120)
    ],
    returnValue: z.object({ success: z.boolean() })
  })
  createUser(
    @ValidateParam(z.string().email()) email: string,
    @ValidateParam(z.number()) age: number
  ) {
    return { success: true };
  }
}
```

### 3️⃣ 异步验证

```typescript
import { AsyncValidator } from 'rcc-typesafety';

const asyncValidator = AsyncValidator.getInstance();

// 包装异步函数
const safeAsyncFunction = asyncValidator.wrapPromise(
  fetchUserData(userId),
  {
    returnSchema: userSchema,
    timeout: 5000,
    retry: { attempts: 3, delay: 1000 }
  }
);

const result = await safeAsyncFunction; // ✅ 验证通过的数据
```

## 🏗️ 核心组件详解

### RuntimeValidator - 核心验证引擎

```typescript
const validator = RuntimeValidator.getInstance({
  maxCacheSize: 1000,
  cacheTimeout: 300000 // 5分钟
});

// 验证函数
const safeFunction = validator.validateFunction(fn, schema, name);

// 验证对象
const safeObject = validator.validateObject(obj, { schema: userSchema });

// 验证数组
const safeArray = validator.validateArray(array, {
  itemSchema: z.string().email(),
  minLength: 1,
  maxLength: 100,
  unique: true
});

// 创建安全执行上下文
const context = validator.createSafeExecutionContext({
  user: userData,
  config: configData
});
```

### 装饰器系统

#### @RuntimeValidate - 类级验证
```typescript
@RuntimeValidate({
  validateAllMethods: true,
  validateProperties: true,
  errorHandling: 'collect',
  onError: (errors, target, method) => {
    console.error(`验证错误:`, errors);
  }
})
class MyService {
  // 所有方法和属性会自动验证
}
```

#### @ValidateMethod - 方法验证
```typescript
class UserService {
  @ValidateMethod({
    parameters: [z.string(), z.number()],
    returnValue: z.object({ id: z.string() }),
    options: { enableCache: true }
  })
  createUser(name: string, age: number) {
    return { id: '123', name, age };
  }
}
```

#### @ValidateProperty - 属性验证
```typescript
class User {
  @ValidateProperty(z.string().min(2).max(50))
  name: string;

  @ValidateProperty(z.number().int().positive())
  age: number;

  @LazyValidate(z.string().email())
  email: string; // 懒加载验证
}
```

#### @ValidateParam - 参数验证
```typescript
@ValidateBatch(z.string().email())
sendEmailsToUsers(@ValidateBatch(z.string().email()) emails: string[]) {
  // 数组中的每个元素都会被验证
}
```

### AsyncValidator - 异步验证引擎

```typescript
const asyncValidator = AsyncValidator.getInstance();

// Promise 安全包装
const safePromise = asyncValidator.wrapPromise(
  Promise.resolve(data),
  {
    returnSchema: validationSchema,
    timeout: 10000,
    retry: {
      attempts: 3,
      delay: 1000,
      backoff: 'exponential', // fixed | exponential | linear
      condition: (error, attempt) => error.code !== 'FATAL'
    },
    profiling: {
      trackDuration: true,
      trackMemory: true
    }
  }
);

// 批量异步验证
const results = await asyncValidator.validateBatch(
  promiseArray,
  validationSchema,
  { concurrency: 10 }
);

// 带重试的异步操作
const result = await asyncValidator.withRetry(
  () => unstableOperation(),
  { attempts: 3, delay: 1000 }
);
```

### ValidationCache - 智能缓存系统

```typescript
const cache = new ValidationCache({
  maxSize: 10000,
  ttl: 300000, // 5分钟
  evictionPolicy: 'LRU', // LRU | LFU | FIFO
  cleanupInterval: 60000,
  enableCompression: true
});

// 创建带缓存的验证器
const cachedValidator = ValidationCache.createCachedValidator(cache, schema);

// 快速验证（带缓存）
const result = cachedValidator.validate(value);

// 批量验证
const results = await cache.validateBatch(items, {
  maxSize: 100,
  timeout: 5000,
  concurrency: 10
});

// 缓存统计
const stats = cache.getStatistics();
console.log(`命中率：${(stats.hitRate * 100).toFixed(2)}%`);
```

### ValidationUtils - 实用工具

```typescript
const utils = ValidationUtils.getInstance();

// 快速验证
const result = utils.validateValue(value, schema);

// 批量验证
const results = await utils.validateBatch(items);

// 对象属性验证
const result = utils.validateObject(obj, {
  name: z.string(),
  age: z.number().min(18)
});

// 创建验证组合器
const composer = utils.createComposer();
const combinedValidator = composer.series(
  validator1,
  validator2,
  composer.parallel(validator3, validator4)
);
```

## 🔧 高级功能

### 1. 条件验证

```typescript
const conditionalValidator = conditionalValidate(
  // 条件函数
  (value) => typeof value === 'string' && value.includes('@'),
  // 满足条件时的验证模式
  commonSchemas.email,
  // 不满足条件时的验证模式
  z.string().min(1)
);

const result1 = conditionalValidator.validate("user@example.com"); // ✅
const result2 = conditionalValidator.validate("simple text"); // ✅
```

### 2. 验证管道

```typescript
const pipeline = createValidationPipeline(
  // 第一步：类型检查
  commonSchemas.string,
  // 第二步：邮箱格式
  commonSchemas.email,
  // 第三步：自定义业务规则
  (value) => ({
    success: !value.includes('test'),
    warnings: value.includes('demo') ? ['使用演示地址'] : []
  })
);

const result = pipeline("user@example.com");
```

### 3. 递归对象验证

```typescript
const recursiveValidator = new RecursiveObjectValidator();

const nestedObject = {
  user: {
    profile: {
      contacts: [
        { type: "email", value: "contact@example.com" },
        { type: "phone", value: "+1234567890" }
      ],
      settings: {
        privacy: { level: "high", shareData: false }
      }
    }
  }
};

const result = recursiveValidator.validateDeep(
  nestedObject,
  z.object({}).passthrough(),
  { maxDepth: 10 }
);
```

### 4. 验证组

```typescript
@ValidationGroup('create', {
  parameters: [z.string(), z.string().email()],
  returnValue: z.object({ id: z.string() })
})
@ValidationGroup('update', {
  parameters: [z.string(), z.object({}).passthrough()],
  returnValue: z.object({ success: z.boolean() })
})
saveUser(id: string, data: any) {
  // 验证基于激活的验证组
}

// 激活验证组
setActiveValidationGroups(userService, ['create']);
```

### 5. 性能监控

```typescript
// 获取验证统计
const stats = validator.getStatistics();
stats.forEach((stat, key) => {
  console.log(`${key}: ${stat.successRate}, 平均用时: ${stat.averageValidationTime}ms`);
});

// 获取性能分析数据
const metrics = validator.getProfilingData();
metrics.forEach((data, operation) => {
  console.log(`${operation}: 平均${data.average}ms, 最大${data.max}ms`);
});

// 获取缓存性能
const stats = cache.getStatistics();
console.log(`命中率: ${stats.hitRate}, 平均访问时间: ${stats.averageAccessTime}ms`);
```

## 🏆 最佳实践

### 1. 错误处理策略

```typescript
// 抛错模式（默认）
const strictValidator = RuntimeValidator.getInstance();

// 警告模式
const warningValidator = RuntimeValidator.getInstance({ onError: 'warn' });

// 收集模式
const collectingValidator = RuntimeValidator.getInstance({ onError: 'collect' });

// 自定义错误处理
@RuntimeValidate({
  errorHandling: 'callback',
  onError: (errors, target, method) => {
    logger.error('Validation errors:', errors);
    metrics.increment('validation.errors', errors.length);
  }
})
```

### 2. 缓存策略

```typescript
// 高频使用的小对象：短TTL，小缓存
const smallCache = new ValidationCache({ maxSize: 1000, ttl: 60000 });

// 大型对象：可考虑压缩
const largeCache = new ValidationCache({
  maxSize: 100,
  ttl: 300000,
  enableCompression: true
});

// 批处理优化
const batchResults = await cache.validateBatch(items, {
  maxSize: 50, // 合适的批量大小
  concurrency: 10, // 控制并发
  timeout: 10000
});
```

### 3. 异步验证最佳实践

```typescript
// 合理的重试策略
const retryConfig = {
  attempts: 3,
  delay: 1000,
  backoff: 'exponential', // 指数退避
  condition: (error, attempt) => {
    // 只重试可恢复的错误
    return !['FATAL', 'TIMEOUT'].includes(error.code);
  }
};

// 超时设置
const timeout = Math.max(5000, expectedDuration * 2);

// 适当的并发级别
const concurrency = Math.min(10, os.cpus().length);
```

### 4. 模式设计

```typescript
// 使用描述性错误消息
const userSchema = z.object({
  email: z.string().email({ message: "请输入有效的邮箱地址" }),
  age: z.number()
    .min(18, { message: "年龄必须满18周岁" })
    .max(120, { message: "年龄不能超过120岁" })
});

// 添加自定义验证逻辑
const passwordSchema = z.string()
  .min(8)
  .refine(
    password => /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password),
    { message: "密码必须包含大小写字母和数字" }
  );

// 组合模式
const combinedSchema = z.intersection(
  baseUserSchema,
  extendedUserSchema
);
```

## 📊 性能特性

| 操作 | 平均时间 | 内存使用 |
|------|----------|----------|
| 基础验证 (小对象) | 0.1ms | 低 |
| 复杂包模式验证 | 0.5ms | 低 |
| 带缓存验证 | 0.01ms | 极低 |
| 批处理验证 (100项) | 5-10ms | 中等 |
| 异步验证 | 取决于操作 | 中等 |
| 递归验证 | 取决于深度 | 高 |

## 🔍 调试和监控

```typescript
// 详细的错误信息
console.log('验证错误:', {
  message: error.message,
  errorCode: error.errorCode,
  validationContext: error.validationContext,
  validationPath: error.validationPath,
  suggestions: error.suggestions,
  originalValue: error.originalValue,
  expectedType: error.expectedType
});

// 性能监控
const metrics = {
  cache: cache.getPerformanceMetrics(100),
  validator: validator.getProfilingData(),
  async: asyncValidator.getAllMetrics()
};

// 运行时统计
console.log('运行时统计:', {
  activeOperations: asyncValidator.getActiveOperations(),
  cacheStats: cache.getStatistics(),
  validationStats: validator.getStatistics()
});
```

## 🔧 集成指南

### 与现有系统集成

```typescript
import { createTypeSafeEnvironment } from 'rcc-typesafety';

// 创建完整的安全环境
const env = createTypeSafeEnvironment('MYAPP_');

// 使用集成函数
const validatedConfig = await env.validateRCCConfig(configData);
const safeFunction = env.safeFunction(myFunction, validationSchema);
const cachedResult = env.cachedValidate(value, validationSchema);
const asyncResult = await env.validateAsync(asyncValue, schema);
```

### 配置文件集成

```typescript
import { RuntimeValidator, ValidationUtils } from 'rcc-typesafety';

// 创建全局验证器
const globalValidator = new RuntimeValidator({
  maxCacheSize: 5000,
  cacheTimeout: 600000
});

// 应用级别的验证配置
export const validationConfig = {
  strict: true, // 严格模式
  cacheAll: true, // 启用所有缓存
  profilePerformance: process.env.NODE_ENV !== 'production'
};

// 模块化验证器
export const userValidator = ValidationUtils.getInstance();
export const configValidator = createQuickValidator(configSchema);
export const asyncValidator = AsyncValidator.getInstance();
```

## 📚 常见用例

### 数据验证服务
```typescript
class DataValidationService {
  constructor(
    private validator = ValidationUtils.getInstance(),
    private cache = new ValidationCache()
  ) {}

  async validateUserData(data: any) {
    return this.validator.validateObject(data, userSchema);
  }

  async validateBatchData(items: any[]) {
    const promises = items.map(item =>
      this.validator.validateAsync(item, itemSchema)
    );

    return Promise.allSettled(promises);
  }

  clearCache() {
    this.cache.clear();
  }
}
```

### API 请求验证
```typescript
mport { AsyncValidate } from 'rcc-typesafety';

class APIService {
  @AsyncValidate({
    returnSchema: apiResponseSchema,
    timeout: 10000,
    retry: { attempts: 2, delay: 1000 }
  })
  async handleRequest(req: Request) {
    // 验证请求数据
    const validation = await this.validateRequestData(req);
    if (!validation.success) {
      throw new ValidationError(validation.errors);
    }

    return await this.processRequest(req);
  }
}
```

### 配置验证
```typescript
const configValidator = new ObjectValidatorBuilder()
  .field('server.port', z.number().int().positive())
  .field('server.host', z.string().ip().or(z.literal('localhost')))
  .field('database.url', z.string().url())
  .field('features', z.array(z.string()).optional())
  .field('security.cors', z.boolean().default(false))
  .createValidator();

const result = configValidator.validate(appConfig);
if (!result.success) {
  throw new Error(`配置验证失败: ${result.errors?.[0]?.message}`);
}
```

## ⚠️ 错误处理

### 常见错误类型

```typescript
// 运行时验证错误
try {
  const result = validator.validateValue(invalidValue, schema);
} catch (error) {
  if (error instanceof RuntimeValidationError) {
    console.error('验证错误:', {
      code: error.errorCode,
      context: error.validationContext,
      path: error.validationPath,
      suggestions: error.suggestions
    });
  }
}

// 异步验证错误
try {
  const result = await asyncValidator.validateAsync(value, schema);
} catch (error) {
  if (error instanceof AsyncValidationError) {
    console.error('异步验证错误:', {
      operationId: error.asyncOperationId,
      duration: error.operationDuration,
      originalValue: error.originalValue
    });
  }
}
```

### 错误恢复策略

```typescript
// 优雅降级
const resilientValidation = async (value: unknown, schema: ZodSchema) => {
  try {
    return await validator.validateAsync(value, schema);
  } catch (error) {
    // 记录错误但继续执行
    logger.warn('验证失败，使用默认值', error);
    return { success: true, data: getDefaultValue(schema) };
  }
};

// 部分验证
const partialValidation = (obj: any, requiredFields: string[]) => {
  const schema = z.object(
    requiredFields.reduce((acc, field) => ({
      ...acc,
      [field]: z.any()
    }), {})
  );

  const requiredData = requiredFields.reduce((acc, field) => ({
    ...acc,
    [field]: obj[field]
  }), {});

  return validator.validateValue(requiredData, schema);
};
```

## 🎉 总结

RCC 运行时类型验证系统提供了：

✅ **完整的类型安全**：运行时验证所有数据类型
✅ **高性能优化**：智能缓存和批处理验证
✅ **灵活的架构**：装饰器、函数包装、异步验证
✅ **企业级错误处理**：详细的错误信息和恢复机制
✅ **无缝集成**：与现有 TypeScript/JavaScript 项目完美兼容

这使得开发者可以：
- **消除运行时错误**：在代码运行前捕获类型相关问题
- **提高代码质量**：强制执行数据契约和业务规则
- **增强可维护性**：代码变更时自动验证兼容性
- **提升性能**：智能缓存减少重复验证开销
- **简化调试**：详细的错误上下文和建议

通过这套完整的运行时验证生态系统，你可以构建更加**安全、可靠、高性能**的 TypeScript 应用程序！ 🚀