/**
 * 运行时验证系统演示
 * 展示完整的运行时类型验证、装饰器、异步验证和性能优化功能
 */

import {
  // 核心运行时验证器
  RuntimeValidator,
  RuntimeValidationError,
  SafeFunction,
  SafeObject,
  SafeArray,

  // 装饰器
  RuntimeValidate,
  ValidateMethod,
  ValidateParam,
  ValidateProperty,
  ValidationGroup,
  ValidateBatch,
  LazyValidate,
  AsyncValidate,
  ValidatePromise,
  AsyncRetry,
  AsyncTimeout,
  ValidateBatchAsync,
  setActiveValidationGroups,
  getActiveValidationGroups,
  createTypedValidator,

  // 异步验证
  AsyncValidator,
  SafePromise,

  // 缓存和性能优化
  ValidationCache,
  CacheConfig,

  // 实用工具
  ValidationUtils,
  commonSchemas,
  createQuickValidator,
  conditionalValidate,
  createValidationPipeline,
  ObjectValidatorBuilder,
  RecursiveObjectValidator,

  // 类型 Schema
  z,
  createTypeSafeEnvironment
} from '../src/index.js';

// 演示数据模式
const userSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(2).max(50),
  email: z.string().email(),
  age: z.number().int().min(18).max(120),
  role: z.enum(['user', 'admin', 'moderator']),
  isActive: z.boolean().default(true),
  createdAt: z.date().optional()
});

const configSchema = z.object({
  port: z.number().int().min(1).max(65535),
  host: z.string().ip().or(z.literal('localhost')),
  database: z.object({
    url: z.string().url(),
    poolSize: z.number().int().min(1).max(100).default(10)
  }),
  features: z.array(z.string()).optional()
});

/**
 * 1. 基础运行时验证演示
 */
async function demonstrateBasicRuntimeValidation() {
  console.log('🎯 基础运行时验证演示');
  console.log('=' .repeat(50));

  const validator = RuntimeValidator.getInstance();

  // 验证函数
  function calculateDiscount(price: number, discount: number): number {
    return price * (1 - discount);
  }

  const safeCalculate = validator.validateFunction(calculateDiscount, {
    parameters: [
      z.number().positive(),
      z.number().min(0).max(1)
    ],
    returnValue: z.number().positive(),
    options: { enableCache: true }
  });

  // 测试函数验证
  try {
    const result = safeCalculate(100, 0.2); // 有效的参数
    console.log(`✅ 计算折扣：$${result}`);

    // 获取验证统计
    const stats = safeCalculate.validationStats;
    console.log(`📊 验证统计：`, stats);
  } catch (error) {
    console.log(`❌ 验证失败：${error}`);
  }

  // 验证对象
  const testUser = {
    id: 1,
    name: "张三",
    email: "zhang@example.com",
    age: 25,
    role: "user" as const
  };

  const validatedUser = validator.validateObject(testUser, { schema: userSchema });
  console.log(`✅ 用户验证：`, validatedUser.isValid);
  console.log(`👤 用户数据：`, validatedUser.value);

  // 验证数组
  const userEmails = ["user1@example.com", "user2@example.com", "invalid-email"];
  const validatedEmails = validator.validateArray(userEmails, {
    itemSchema: z.string().email(),
    unique: true,
    minLength: 1
  });

  console.log(`📧 邮件验证：`, validatedEmails.isValid);
  console.log(`📊 邮件统计：length=${validatedEmails.length}, errors=${validatedEmails.errors.length}`);
}

/**
 * 2. 装饰器验证演示
 */
function demonstrateDecorators() {
  console.log('\n🎨 装饰器验证演示');
  console.log('=' .repeat(50));

  @RuntimeValidate({
    validateProperties: true,
    validateAllMethods: true,
    errorHandling: 'throw'
  })
  class UserService {
    @ValidateProperty(z.string().min(1))
    private serviceName: string = "UserService";

    @ValidateProperty(z.number().int().positive())
    private maxUsers: number = 1000;

    @ValidateMethod({
      parameters: [
        z.string().email(),
        z.number().int().min(18).max(120)
      ],
      returnValue: z.object({
        success: z.boolean(),
        userId: z.string()
      })
    })
    createUser(
      @ValidateParam(z.string().email()) email: string,
      @ValidateParam(z.number().int().min(18)) age: number
    ) {
      // 模拟用户创建逻辑
      return {
        success: true,
        userId: `user_${Math.random().toString(36).substr(2, 9)}`
      };
    }

    @AsyncValidate({
      returnSchema: z.array(userSchema),
      timeout: 5000
    })
    async getUsersAsync() {
      // 模拟异步操作
      await new Promise(resolve => setTimeout(resolve, 100));
      return [
        { id: 1, name: "User 1", email: "user1@example.com", age: 25, role: "user" },
        { id: 2, name: "User 2", email: "user2@example.com", age: 30, role: "admin" }
      ];
    }

    @ValidateBatch(z.string().email())
    async sendEmailsToUsers(@ValidateBatch(z.string().email()) emails: string[]) {
      console.log(`正在发送邮件到 ${emails.length} 个用户`);
      return { sent: emails.length };
    }
  }

  // 创建服务实例并测试
  const userService = new UserService();

  try {
    // 测试方法验证
    const result = userService.createUser("test@example.com", 25);
    console.log(`✅ 用户创建成功：`, result);

    // 测试异步方法验证
    userService.getUsersAsync().then(users => {
      console.log(`✅ 异步获取用户：`, users.length, "个用户");
    }).catch(error => {
      console.log(`❌ 异步验证失败：${error}`);
    });

    // 测试批量验证
    userService.sendEmailsToUsers([
      "user1@example.com",
      "user2@example.com",
      "user3@example.com"
    ]).then(result => {
      console.log(`✅ 批量邮件发送完成：`, result);
    });

  } catch (error) {
    console.log(`❌ 验证失败：${error}`);
  }
}

/**
 * 3. 异步验证演示
 */
async function demonstrateAsyncValidation() {
  console.log('\n⚡ 异步验证演示');
  console.log('=' .repeat(50));

  const asyncValidator = AsyncValidator.getInstance();

  // 创建异步函数
  async function fetchUserData(userId: number): Promise<any> {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (userId <= 0) {
      throw new Error("无效的用户ID");
    }

    return {
      id: userId,
      name: `User ${userId}`,
      email: `user${userId}@example.com`,
      createdAt: new Date()
    };
  }

  // 包装异步函数
  const safeFetchUser = asyncValidator.wrapPromise(
    fetchUserData(123),
    {
      returnSchema: userSchema,
      timeout: 2000,
      retry: {
        attempts: 3,
        delay: 500,
        backoff: 'exponential'
      },
      profiling: {
        trackDuration: true,
        trackMemory: true
      }
    }
  );

  try {
    const result = await safeFetchUser;
    console.log(`✅ 异步验证成功：`, result);

    // 获取性能指标
    const metrics = safeFetchUser.getMetrics();
    console.log(`📊 性能指标：`, {
      duration: metrics.duration + 'ms',
      success: metrics.success,
      retryCount: metrics.retryCount,
      memoryDelta: metrics.memoryDelta ? Math.round(metrics.memoryDelta / 1024) + 'KB' : 'N/A'
    });

  } catch (error) {
    console.log(`❌ 异步验证失败：${error}`);
  }
}

/**
 * 4. 缓存和性能优化演示
 */
function demonstrateCachingAndPerformance() {
  console.log('\n🚀 缓存和性能优化演示');
  console.log('=' .repeat(50));

  const cache = new ValidationCache({
    maxSize: 1000,
    ttl: 5000, // 5秒TTL用于演示
    evictionPolicy: 'LRU',
    cleanupInterval: 1000
  });

  const validator = ValidationUtils.getInstance();

  // 测试验证性能
  console.time('无缓存验证');
  for (let i = 0; i < 1000; i++) {
    validator.validateValue(`test${i}`, commonSchemas.uuid);
  }
  console.timeEnd('无缓存验证');

  // 测试缓存性能
  console.time('有缓存验证');
  for (let i = 0; i < 1000; i++) {
    const cachedValidator = ValidationCache.createCachedValidator(cache, commonSchemas.uuid);
    cachedValidator.validate(`test${i}`);
  }
  console.timeEnd('有缓存验证');

  // 显示缓存统计
  const stats = cache.getStatistics();
  console.log(`📊 缓存统计：`, {
    entries: stats.totalEntries,
    hitRate: (stats.hitRate * 100).toFixed(2) + '%',
    missRate: (stats.missRate * 100).toFixed(2) + '%',
    totalSize: stats.totalSize + ' bytes'
  });
}

/**
 * 5. 高级功能演示
 */
async function demonstrateAdvancedFeatures() {
  console.log('\n🔬 高级功能演示');
  console.log('=' .repeat(50));

  const utils = ValidationUtils.getInstance();

  // 1. 创建快速验证器
  const emailValidator = createQuickValidator(commonSchemas.email);

  const emailResult = emailValidator.validate("test@example.com");
  console.log(`✅ 快速邮件验证：`, emailResult);

  try {
    emailValidator.validateOrThrow("invalid-email");
  } catch (error) {
    console.log(`❌ 快速验证失败：${error}`);
  }

  // 2. 条件验证
  const conditionalValidator = conditionalValidate(
    value => typeof value === 'string' && value.length > 5,
    commonSchemas.email,
    z.string().min(1)
  );

  const longString = "this is a long string";
  const shortString = "short";

  const condResult1 = conditionalValidator.validate(longString);
  const condResult2 = conditionalValidator.validate(shortString);

  console.log(`🔄 条件验证结果：长字符串=${condResult1.success}, 短字符串=${condResult2.success}`);

  // 3. 验证管道
  const pipeline = createValidationPipeline(
    commonSchemas.string, // 必须是字符串
    (value) => utils.validateValue(value, commonSchemas.email), // 必须是邮箱
    (value) => ({
      success: value.includes('example.com'),
      data: value,
      warnings: value.includes('test') ? ['使用测试邮箱'] : []
    })
  );

  const pipelineResult = pipeline("test@example.com");
  console.log(`🔗 验证管道：`, pipelineResult);

  // 4. 对象验证构建器
  const objectValidator = new ObjectValidatorBuilder()
    .field('id', z.number())
    .field('name', z.string().min(1))
    .field('emails', z.array(commonSchemas.email))
    .optional('bio', z.string().max(200))
    .object('settings', new ObjectValidatorBuilder()
      .field('theme', z.enum(['light', 'dark']))
      .field('notifications', z.boolean())
    )
    .createValidator();

  const testObject = {
    id: 123,
    name: "Test User",
    emails: ["user1@example.com", "user2@example.com"],
    bio: "测试用户生物信息",
    settings: {
      theme: "light",
      notifications: true
    }
  };

  const objectResult = objectValidator.validate(testObject);
  console.log(`🏗️ 对象验证构建器：`, objectResult);

  // 5. 递归对象验证
  const recursiveValidator = new RecursiveObjectValidator();

  const nestedObject = {
    user: {
      profile: {
        contacts: [
          { type: "email", value: "contact@example.com" },
          { type: "phone", value: "+1234567890" }
        ],
        settings: {
          privacy: {
            level: "high",
            shareData: false
          }
        }
      }
    }
  };

  const recursiveResult = recursiveValidator.validateDeep(
    nestedObject,
    z.object({}).passthrough(), // 允许任意嵌套结构
    { path: ['recursive', 'validation'] }
  );

  console.log(`🔄 递归验证：`, recursiveResult);
}

/**
 * 6. 集成环境演示
 */
async function demonstrateIntegratedEnvironment() {
  console.log('\n🌍 集成环境演示');
  console.log('=' .repeat(50));

  // 创建完整的类型安全环境
  const env = createTypeSafeEnvironment('DEMO_');

  // 使用各种快捷验证函数
  const emailValidation = env.validateValue(
    "user@example.com",
    commonSchemas.email
  );
  console.log(`✅ 环境邮件验证：`, emailValidation.success);

  // 异步验证
  const asyncValidation = await env.validateAsync(
    Promise.resolve("test@example.com"),
    commonSchemas.email,
    { enableCache: true }
  );
  console.log(`🕐 环境异步验证：`, asyncValidation.success);

  // 创建安全函数
  function riskyCalculation(a: number, b: number): number {
    if (b === 0) throw new Error("除零错误");
    return a / b;
  }

  const safeCalculation = env.safeFunction(riskyCalculation, {
    parameters: [
      z.number(),
      z.number().refine(n => n !== 0, "不能为零")
    ],
    returnValue: z.number(),
    options: { onError: 'throw' }
  });

  try {
    const result = safeCalculation(10, 2);
    console.log(`✅ 安全计算：10 / 2 = ${result}`);

    // 测试错误处理
    safeCalculation(10, 0);
  } catch (error) {
    console.log(`❌ 安全检查触发：${error}`);
  }

  // 使用缓存验证
  const cachedValidation = env.cachedValidate("validation@cache.com", commonSchemas.email);
  console.log(`🏃 缓存验证：`, cachedValidation);

  // 获取类型安全统计
  const stats = env.runtimeValidator.getStatistics();
  console.log(`📈 运行时验证统计：`, {
    totalOperations: Array.from(stats.values()).reduce((sum, stat) => sum + stat.totalValidations, 0),
    successRate: Array.from(stats.values()).reduce((sum, stat) =>
      sum + (stat.totalValidations > 0 ? stat.successfulValidations / stat.totalValidations : 0), 0) / stats.size
  });
}

/**
 * 7. 错误处理和恢复演示
 */
function demonstrateErrorHandling() {
  console.log('\n🚨 错误处理和恢复演示');
  console.log('=' .repeat(50));

  const validator = ValidationUtils.getInstance();

  // 创建带有详细错误信息的验证
  const detailedValidator = createQuickValidator(
    z.object({
      email: z.string().email(),
      age: z.number().int().min(18),
      preferences: z.object({
        theme: z.enum(['light', 'dark', 'auto']),
        notifications: z.boolean()
      })
    })
  );

  const invalidData = {
    email: "invalid-email-format",
    age: 16,
    preferences: {
      theme: "blue", // 无效的主题
      notifications: "yes" // 应该是布尔值
    }
  };

  const result = detailedValidator.validate(invalidData);
  console.log(`❌ 详细错误信息：`);

  if (!result.success && result.error) {
    console.log(`错误类型：${result.error.constructor.name}`);
    console.log(`错误消息：${result.error.message}`);
  }

  // 创建条件验证与错误恢复
  const resilientValidator = conditionalValidate(
    // 条件：如果数据包含 email 字段
    (data) => typeof data === 'object' && data !== null && 'email' in data,
    // 则验证：完整的用户模式
    commonSchemas.email,
    // 否则验证：基础的字符串模式
    z.string().min(1)
  );

  const emailData = "user@example.com";
  const nonEmailData = "simple string";

  const resilientResult1 = resilientValidator.validate(emailData);
  const resilientResult2 = resilientValidator.validate(nonEmailData);

  console.log(`🔄 弹性验证：邮件=${resilientResult1.success}, 字符串=${resilientResult2.success}`);

  // 错误追踪和上下文
  const context: ValidationContext = {
    path: ['user', 'validation', 'demo'],
    options: {
      onError: 'return',
      enableCache: true,
      customErrorMessages: {
        'email': '请输入有效的邮箱地址',
        'required': '此字段为必填项'
      }
    },
    metadata: {
      operation: 'validation_demo',
      timestamp: Date.now()
    }
  };

  const contextResult = validator.validateValue("", commonSchemas.email, context);
  console.log(`📋 带上下文的验证：`, {
    success: contextResult.success,
    validationTime: contextResult.metadata?.validationTime + 'ms',
    schemaType: contextResult.metadata?.schemaType
  });
}

/**
 * 主函数 - 运行所有演示
 */
async function main() {
  console.log('🚀 RCC 运行时类型验证系统演示');
  console.log('==========================');

  try {
    // 运行所有演示
    await demonstrateBasicRuntimeValidation();
    demonstrateDecorators();
    await demonstrateAsyncValidation();
    demonstrateCachingAndPerformance();
    await demonstrateAdvancedFeatures();
    await demonstrateIntegratedEnvironment();
    demonstrateErrorHandling();

    console.log('\n🎉 所有演示完成！');
    console.log('================================');

  } catch (error) {
    console.error('💥 演示过程中发生错误：', error);
  }
}

// 如果直接运行此文件，执行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  userSchema,
  configSchema,
  main as runRuntimeValidationDemo
};