import {
  SafeJSON,
  SafeEnv,
  SafeDynamicImport,
  createTypeSafeEnvironment,
  packageJsonSchema,
  rccConfigSchema,
  ConfigValidator
} from 'rcc-typesafety';

/**
 * 基础使用示例
 */
async function basicUsageExamples() {
  console.log('🚀 RCC TypeSafety 基础使用示例\n');

  // ===== 1. JSON 安全解析 =====
  console.log('📋 1. JSON 安全解析示例');

  // 简单 JSON 解析
  const jsonString = '{"name": "rcc-typesafety", "version": "0.1.0", "enabled": true}';

  try {
    const data = SafeJSON.parse(jsonString);
    console.log('✅ 解析结果:', data);
  } catch (error) {
    console.error('❌ JSON 解析错误:', error.message);
  }

  // 带验证的 JSON 解析
  const packageJson = {
    name: 'rcc-typesafety',
    version: '0.1.0',
    description: 'RCC TypeScript Type Safety Framework'
  };

  try {
    const validated = SafeJSON.parseAndValidate(
      JSON.stringify(packageJson),
      packageJsonSchema
    );
    console.log('✅ Package.json 验证通过:', validated.name);
  } catch (error) {
    console.error('❌ Schema 验证失败:', error.message);
  }

  // ===== 2. 环境变量安全访问 =====
  console.log('\n🔧 2. 环境变量安全访问示例');

  const env = new SafeEnv('EXAMPLE_');

  // 模拟环境变量（实际环境中需要在系统环境变量中设置）
  process.env.EXAMPLE_APP_NAME = 'MyApp';
  process.env.EXAMPLE_PORT = '3000';
  process.env.EXAMPLE_DEBUG = 'true';
  process.env.EXAMPLE_CONFIG = '{"theme": "dark", "language": "zh-CN"}';

  // 字符串环境变量
  const appName = env.getString('APP_NAME', {
    default: 'DefaultApp',
    description: 'Application name'
  });
  console.log('✅ App name:', appName);

  // 数字环境变量
  const port = env.getNumber('PORT', {
    default: 8080,
    min: 1000,
    max: 65535
  });
  console.log('✅ Port:', port);

  // 布尔环境变量
  const debug = env.getBoolean('DEBUG');
  console.log('✅ Debug mode:', debug);

  // JSON 环境变量
  const config = env.getJSON<{
    theme: string;
    language: string;
  }>('CONFIG');
  console.log('✅ Config:', config);

  // 枚举环境变量
  process.env.EXAMPLE_ENVIRONMENT = 'development';
  const environment = env.getEnum('ENVIRONMENT',
    ['development', 'staging', 'production']
  );
  console.log('✅ Environment:', environment);

  // ===== 3. 安全的动态导入 =====
  console.log('\n📦 3. 动态导入安全示例');

  const safeImport = SafeDynamicImport.getInstance();

  try {
    // 安全导入内置模块（跳过路径验证）
    const fs = await safeImport.import('fs', {
      pathValidation: 'none'
    });
    console.log('✅ 成功导入 fs 模块');

    // 验证模块
    const validation = await safeImport.validateModule('./example-module.js', {
      securityLevel: 'medium',
      requiredExports: ['exampleFunction'],
      timeout: 5000
    });

    if (validation.valid) {
      console.log('✅ 模块验证通过:', validation.metadata.path);
    } else {
      console.log('❌ 模块验证失败:', validation.errors);
    }

  } catch (error) {
    console.error('❌ 导入错误:', error.message);
  }

  // 清理环境变量
  delete process.env.EXAMPLE_APP_NAME;
  delete process.env.EXAMPLE_PORT;
  delete process.env.EXAMPLE_DEBUG;
  delete process.env.EXAMPLE_CONFIG;
  delete process.env.EXAMPLE_ENVIRONMENT;

  console.log('\n🎉 基础示例完成！');
}

/**
 * RCC 配置验证示例
 */
async function configValidationExample() {
  console.log('\n⚙️ RCC 配置验证示例\n');

  // 示例 RCC 配置
  const sampleConfig = {
    version: '1.0.0',
    name: 'RCC Service',
    environment: 'development',

    server: {
      port: 5506,
      host: '0.0.0.0',
      cors: {
        enabled: true,
        origins: ['http://localhost:3000']
      }
    },

    providers: {
      example: {
        id: 'example',
        name: 'Example Provider',
        type: 'custom',
        enabled: true,
        endpoint: 'https://api.example.com',
        auth: {
          type: 'apikey',
          keys: ['api-key-123']
        }
      }
    },

    virtualModels: {
      'example-model': {
        id: 'example-model',
        name: 'Example Model',
        enabled: true,
        model: 'example-type',
        targets: [
          {
            providerId: 'example',
            modelId: 'example-type',
            priority: 1
          }
        ]
      }
    }
  };

  try {
    // 验证配置
    const validated = SafeJSON.parseAndValidate(
      JSON.stringify(sampleConfig),
      rccConfigSchema
    );

    console.log('✅ RCC 配置验证通过');
    console.log('  - Config name:', validated.name);
    console.log('  - Server port:', validated.server?.port);
    console.log('  - Providers:', Object.keys(validated.providers || {}));
    console.log('  - Virtual models:', Object.keys(validated.virtualModels || {}));

  } catch (error) {
    console.error('❌ 配置验证失败:', error.message);
  }

  // 配置文件验证
  console.log('\n📁 配置文件验证示例');

  try {
    // 模拟配置文件路径（实际使用时替换为真实路径）
    const configResult = await ConfigValidator.validateConfigFile(
      './example-config.json',
      rccConfigSchema
    );

    if (configResult.valid && configResult.data) {
      console.log('✅ 配置文件验证通过');
      console.log('  - 数据类型:', typeof configResult.data);
    } else {
      console.log('❌ 配置文件验证失败');
      configResult.errors.forEach(error => {
        console.log(`  - ${error.path}: ${error.message}`);
      });
    }

  } catch (error) {
    console.log('ℹ️  配置文件不存在（这是正常的演示）');
  }
}

/**
 * 完整类型安全环境示例
 */
async function completeTypeSafetyExample() {
  console.log('\n🛡️ 完整类型安全环境示例\n');

  // 创建完整的类型安全环境
  const env = createTypeSafeEnvironment('SAFETY_');

  // 设置测试环境变量
  process.env.SAFETY_CONFIG_PATH = './config.json';
  process.env.SAFETY_LOG_LEVEL = 'info';
  process.env.SAFETY_ENV_TYPE = 'production';

  try {
    // 使用便捷验证函数
    const configPath = env.safeEnv.getString('CONFIG_PATH', { required: true });
    console.log('✅ Config path:', configPath);

    const logLevel = env.safeEnv.getEnum('LOG_LEVEL', ['debug', 'info', 'warn', 'error']);
    console.log('✅ Log level:', logLevel);

    // 验证 package.json
    const mockPackageJson = JSON.stringify({
      name: 'safety-demo',
      version: '1.0.0',
      dependencies: { 'zod': '^3.22.0' }
    });

    const validatedPackage = env.validatePackageJson(mockPackageJson);
    console.log('✅ Package.json validated:', validatedPackage.name);

    // 使用 SafeJSON 处理配置文件（假设文件存在）
    const mockConfig = JSON.stringify({
      version: '1.0.0',
      environment: 'production',
      features: {
        validation: true,
        caching: true
      }
    });

    const config = env.safeJson.parse(mockConfig);
    console.log('✅ Configuration parsed:', config.version);

    console.log('\n🎯 类型安全环境特性:');
    console.log('  ✅ JSON 解析与 Schema 验证');
    console.log('  ✅ 环境变量的安全访问与验证');
    console.log('  ✅ 类型安全的动态导入');
    console.log('  ✅ 配置文件完整性验证');
    console.log('  ✅ 统一的错误处理');

  } catch (error) {
    console.error('❌ 类型安全检查失败:', error.message);
  }

  // 清理环境变量
  delete process.env.SAFETY_CONFIG_PATH;
  delete process.env.SAFETY_LOG_LEVEL;
  delete process.env.SAFETY_ENV_TYPE;
}

/**
 * 错误处理示例
 */
async function errorHandlingExample() {
  console.log('\n🚨 错误处理示例\n');

  const env = new SafeEnv('ERROR_');

  try {
    // JSON 解析错误
    const invalidJson = '{"invalid": json}';
    env.safeJson.parse(invalidJson);
  } catch (error) {
    if (error instanceof SafeJSON.JSONParseError) {
      console.log('✅ 捕获 JSON 解析错误:', error.message);
      console.log('  - 输入数据:', error.input);
      console.log('  - 错误位置:', error.position);
    }
  }

  try {
    // 环境变量错误
    env.getNumber('INVALID_NUMBER', { required: true });
  } catch (error) {
    if (error instanceof SafeEnv.EnvAccessError) {
      console.log('✅ 捕获环境变量错误:', error.message);
      console.log('  - 变量名:', error.varName);
    }
  }

  try {
    // Schema 验证错误
    const invalidData = { name: '', version: 'invalid' };
    SafeJSON.parseAndValidate(JSON.stringify(invalidData), packageJsonSchema);
  } catch (error) {
    if (error instanceof SafeJSON.JSONValidationError) {
      console.log('✅ 捕获 Schema 验证错误:', error.message);
      console.log('  - 验证错误数:', error.errors.length);
      error.errors.forEach(err => {
        console.log(`    - 路径: ${err.path.join('.')}, 消息: ${err.message}`);
      });
    }
  }

  // 动态导入错误
  try {
    const safeImport = SafeDynamicImport.getInstance();
    await safeImport.import('./non-existent-module.js');
  } catch (error) {
    if (error instanceof SafeDynamicImport.DynamicImportError) {
      console.log('✅ 捕获动态导入错误:', error.message);
      console.log('  - 模块路径:', error.modulePath);
      console.log('  - 错误阶段:', error.phase);
    }
  }

  console.log('\n✨ 错误处理系统提供:');
  console.log('  ✅ 详细的错误信息和上下文');
  console.log('  ✅ 错误位置追踪');
  console.log('  ✅ 错误分类和原因');
  console.log('  ✅ 建议的解决方案');
}

/**
 * 性能监控示例
 */
async function performanceMonitoringExample() {
  console.log('\n⚡ 性能监控示例\n');

  const env = new SafeEnv('PERF_');

  // 模拟多次环境变量访问
  process.env.PERF_VAL_1 = 'value1';
  process.env.PERF_VAL_2 = 'value2';
  process.env.PERF_VAL_3 = '123';

  // 执行多次操作
  const iterations = 100;
  const startTime = Date.now();

  for (let i = 0; i < iterations; i++) {
    env.get('VAL_1');
    env.get('VAL_2');
    env.getNumber('VAL_3');
  }

  const endTime = Date.now();
  const duration = endTime - startTime;

  // 获取访问统计
  const stats = env.getAccessStats();

  console.log('📊 性能监控结果:');
  console.log(`✅ 执行迭代: ${iterations} 次`);
  console.log(`✅ 总耗时: ${duration}ms`);
  console.log(`✅ 平均每次访问: ${(duration / (iterations * 3)).toFixed(3)}ms`);
  console.log(`✅ 总访问次数: ${stats.totalAccesses}`);
  console.log(`✅ 唯一变量数: ${stats.uniqueVariables}`);

  // 获取访问日志摘要
  const log = env.getAccessLog();
  const logsByVariable = log.reduce((acc, entry) => {
    acc[entry.varName] = (acc[entry.varName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\n📈 访问频率统计:');
  Object.entries(logsByVariable).forEach(([varName, count]) => {
    console.log(`  - ${varName}: ${count} 次`);
  });

  // 清理环境变量
  delete process.env.PERF_VAL_1;
  delete process.env.PERF_VAL_2;
  delete process.env.PERF_VAL_3;
}

// 执行所有示例
async function runAllExamples() {
  try {
    await basicUsageExamples();
    await configValidationExample();
    await completeTypeSafetyExample();
    await errorHandlingExample();
    await performanceMonitoringExample();

    console.log('\n🎉 所有示例执行完成！');
    console.log('\n📚 下一步:');
    console.log('  1. 查看迁移指南 (examples/migration-guide.md)');
    console.log('  2. 在真实项目中应用这些模式');
    console.log('  3. 根据项目需求自定义 Schema');
    console.log('  4. 设置持续集成中的类型安全检查');

  } catch (error) {
    console.error('❌ 示例执行失败:', error);
  }
}

// 只在直接运行时执行
if (require.main === module) {
  runAllExamples().catch(console.error);
}

export {
  basicUsageExamples,
  configValidationExample,
  completeTypeSafetyExample,
  errorHandlingExample,
  performanceMonitoringExample,
  runAllExamples
};