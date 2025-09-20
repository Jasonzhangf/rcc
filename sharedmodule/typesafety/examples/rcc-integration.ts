#!/usr/bin/env tsx

/**
 * RCC TypeSafety 框架 - RCC 项目集成示例
 *
 * 演示如何在 RCC 项目中应用类型安全框架
 */

import { createTypeSafeEnvironment, ConfigValidator } from 'rcc-typesafety';

// 创建类型安全的 RCC 环境
const rccEnv = createTypeSafeEnvironment('RCC_');

/**
 * RCC 类型安全配置示例
 */
const sampleRCCConfig = {
  "version": "1.0.0",
  "name": "RCC TypeSafety Demo",
  "environment": "development",

  "server": {
    "port": 5506,
    "host": "0.0.0.0",
    "cors": {
      "enabled": true,
      "origins": ["http://localhost:3000"],
      "credentials": true
    },
    "compression": true,
    "timeout": 60000,
    "bodyLimit": "50mb"
  },

  "providers": {
    "openai": {
      "id": "openai",
      "name": "OpenAI",
      "type": "openai",
      "enabled": true,
      "endpoint": "https://api.openai.com/v1",
      "auth": {
        "type": "apikey",
        "keys": [
          "${OPENAI_API_KEY}"
        ]
      },
      "models": {
        "gpt-3.5-turbo": {
          "id": "gpt-3.5-turbo",
          "name": "GPT-3.5 Turbo",
          "type": "chat",
          "maxTokens": 4096,
          "capabilities": ["chat", "function-calling"]
        },
        "gpt-4-turbo": {
          "id": "gpt-4-turbo",
          "name": "GPT-4 Turbo",
          "type": "chat",
          "maxTokens": 8192,
          "capabilities": ["chat", "function-calling", "vision"]
        }
      }
    },
    "anthropic": {
      "id": "anthropic",
      "name": "Anthropic Claude",
      "type": "anthropic",
      "enabled": true,
      "endpoint": "https://api.anthropic.com/v1",
      "auth": {
        "type": "apikey",
        "keys": [
          "${ANTHROPIC_API_KEY}"
        ]
      },
      "models": {
        "claude-3-sonnet": {
          "id": "claude-3-sonnet-20240229",
          "name": "Claude 3 Sonnet",
          "type": "chat",
          "maxTokens": 200000,
          "capabilities": ["chat", "function-calling", "vision"]
        }
      }
    }
  },

  "virtualModels": {
    "chat-gpt": {
      "id": "chat-gpt",
      "name": "ChatGPT Proxy",
      "enabled": true,
      "provider": "openai",
      "model": "gpt-3.5-turbo",
      "capabilities": ["chat", "function-calling"],
      "maxTokens": 4096,
      "temperature": 0.7,
      "loadBalancing": {
        "strategy": "round-robin"
      },
      "targets": [
        {
          "providerId": "openai",
          "modelId": "gpt-3.5-turbo",
          "priority": 1,
          "weight": 1.0,
          "enabled": true
        }
      ]
    },
    "claude-assistant": {
      "id": "claude-assistant",
      "name": "Claude Assistant",
      "enabled": true,
      "provider": "anthropic",
      "model": "claude-3-sonnet",
      "capabilities": ["chat", "function-calling", "vision"],
      "maxTokens": 200000,
      "temperature": 0.8,
      "targets": [
        {
          "providerId": "anthropic",
          "modelId": "claude-3-sonnet-20240229",
          "priority": 1,
          "weight": 1.0,
          "enabled": true
        }
      ]
    }
  },

  "pipeline": {
    "enabled": true,
    "modules": [
      {
        "id": "auth",
        "type": "authentication",
        "enabled": true,
        "config": {
          "required": false
        }
      },
      {
        "id": "rate-limit",
        "type": "rate-limiter",
        "enabled": true,
        "config": {
          "requestsPerMinute": 100
        }
      },
      {
        "id": "transformer",
        "type": "transformer",
        "enabled": true,
        "config": {
          "inputFormat": "openai",
          "outputFormat": "anthropic"
        }
      }
    ]
  },

  "debug": {
    "enabled": true,
    "level": "info",
    "output": "both",
    "format": "json",
    "performance": {
      "enabled": true,
      "trackMemory": true,
      "trackCPU": true,
      "samplingInterval": 1000
    }
  },

  "paths": {
    "config": "./config",
    "logs": "./logs",
    "cache": "./cache",
    "modules": "./modules"
  }
};

/**
 * 启动并验证整个 RCC 系统
 */
async function startRCSystemWithTypeSafety() {
  console.log('🚀 启动 RCC 类型安全系统...\n');

  try {
    // 1. 验证必需的环境变量
    console.log('🔧 1. 验证必需的环境变量');

    const requiredEnvVars = [
      'RCC_PORT',
      'RCC_LOG_LEVEL',
      'RCC_ENVIRONMENT'
    ];

    const envValidation = rccEnv.safeEnv.validateRequired(requiredEnvVars);

    if (envValidation.missing.length > 0) {
      console.log('⚠️  缺失的环境变量:', envValidation.missing.join(', '));
      console.log('📋 设置示例环境变量以继续演示...\n');

      // 为演示设置环境变量
      process.env.RCC_PORT = '5506';
      process.env.RCC_LOG_LEVEL = 'info';
      process.env.RCC_ENVIRONMENT = 'development';
      process.env.OPENAI_API_KEY = 'sk-demo-key';

      console.log('✅ 环境变量已设置');
    } else {
      console.log('✅ 所有必需环境变量已配置');
    }

    // 2. 验证服务器配置
    console.log('\n🖥️  2. 验证服务器配置');

    const serverPort = rccEnv.safeEnv.getNumber('RCC_PORT', {
      required: true,
      min: 1024,
      max: 65535
    });

    const logLevel = rccEnv.safeEnv.getEnum('RCC_LOG_LEVEL',
      ['debug', 'info', 'warn', 'error']
    );

    const environment = rccEnv.safeEnv.getEnum('RCC_ENVIRONMENT',
      ['development', 'staging', 'production']
    );

    console.log(`✅ 服务器端口: ${serverPort}`);
    console.log(`✅ 日志级别: ${logLevel}`);
    console.log(`✅ 运行环境: ${environment}`);

    // 3. 验证 API 密钥等敏感信息（实际项目中不会输出）
    const apiKey = rccEnv.safeEnv.getString('OPENAI_API_KEY', {
      description: 'OpenAI API 密钥'
    });

    if (apiKey) {
      const maskedKey = apiKey.substring(0, 8) + '...';
      console.log(`☑️  API 密钥配置: ${maskedKey}`); // 只显示部分信息
    }

    // 4. 验证完整的配置结构
    console.log('\n📋 3. 验证完整的 RCC 配置结构');

    const { rccConfigSchema } = await import('rcc-typesafety/schemas');

    try {
      const validatedConfig = rccEnv.safeJson.parseAndValidate(
        JSON.stringify(sampleRCCConfig),
        rccConfigSchema
      );

      console.log('🎉 RCC 配置结构验证通过！');

      // 提取和展示验证后的配置摘要
      showConfigSummary(validatedConfig);

    } catch (error) {
      console.error('❌ 配置验证失败:', error.message);
      throw error;
    }

    // 5. 验证各个子系统的配置
    console.log('\n🔍 4. 验证各个子系统配置');

    await validateSubsystems(sampleRCCConfig);

    // 6. 性能和安全检查
    console.log('\n🛡️ 5. 性能和安全检查');

    await performSecurityChecks(sampleRCCConfig);

    // 7. 显示最终统计信息
    console.log('\n📊 6. 系统验证统计');

    showValidationStatistics();

    console.log('\n✨ RCC 类型安全系统验证完成！');
    console.log('🚀 系统已准备就绪，可以安全启动！');

  } catch (error) {
    console.error('\n❌ RCC 系统验证失败:', error.message);
    console.log('🔧 请检查配置并修正错误，然后重试。');
    throw error;
  }
}

/**
 * 显示配置摘要
 */
function showConfigSummary(config: any) {
  console.log('\n📋 配置摘要:');
  console.log(`  名称: ${config.name}`);
  console.log(`  版本: ${config.version}`);
  console.log(`  环境: ${config.environment}`);
  console.log(`  服务器端口: ${config.server?.port}`);
  console.log(`  提供程序数量: ${Object.keys(config.providers || {}).length}`);
  console.log(`  虚拟模型数量: ${Object.keys(config.virtualModels || {}).length}`);

  if (config.virtualModels) {
    console.log('  虚拟模型列表:');
    Object.entries(config.virtualModels).forEach(([id, model]: [string, any]) => {
      console.log(`    - ${model.name} (${id})`);
    });
  }

  if (config.providers) {
    console.log('  提供程序配置:');
    Object.entries(config.providers).forEach(([id, provider]: [string, any]) => {
      const enabled = provider.enabled ? '🟢' : '🔴';
      console.log(`    ${enabled} ${provider.name} (${id})`);
      if (provider.models) {
        console.log(`       模型: ${Object.keys(provider.models).join(', ')}`);
      }
    });
  }
}

/**
 * 验证各个子系统
 */
async function validateSubsystems(config: any) {
  let validationCount = 0;
  let validationErrors = 0;

  // 服务器配置验证
  console.log('  📡 服务器子系统');
  try {
    validateServerConfig(config.server);
    console.log('    ✅ 服务器配置有效');
    validationCount++;
  } catch (error) {
    console.log('    ❌ 服务器配置错误:', error.message);
    validationErrors++;
  }

  // 提供程序配置验证
  console.log('  🔌 提供程序子系统');
  try {
    await validateProviderConfigs(config.providers);
    console.log(`    ✅ 提供程序配置有效 (${Object.keys(config.providers || {}).length} 个)`);
    validationCount++;
  } catch (error) {
    console.log('    ❌ 提供程序配置错误:', error.message);
    validationErrors++;
  }

  // 虚拟模型验证
  console.log('  🎯 虚拟模型子系统');
  try {
    validateVirtualModels(config.virtualModels, config.providers);
    console.log(`    ✅ 虚拟模型配置有效 (${Object.keys(config.virtualModels || {}).length} 个)`);
    validationCount++;
  } catch (error) {
    console.log('    ❌ 虚拟模型配置错误:', error.message);
    validationErrors++;
  }

  // 流水线配置验证
  console.log('  ⚙️ 流水线子系统');
  try {
    validatePipelineConfig(config.pipeline);
    console.log('    ✅ 流水线配置有效');
    validationCount++;
  } catch (error) {
    console.log('    ❌ 流水线配置错误:', error.message);
    validationErrors++;
  }

  console.log(`\n  📈 子系统验证结果: ${validationCount} 个通过, ${validationErrors} 个失败`);
}

/**
 * 验证服务器配置
 */
function validateServerConfig(server: any) {
  if (!server) throw new Error('缺少服务器配置');
  if (typeof server.port !== 'number') throw new Error('端口必需是数字');
  if (server.port < 1 || server.port > 65535) throw new Error('端口必需在 1-65535 范围内');
  if (server.cors && typeof server.cors.enabled !== 'boolean') {
    throw new Error('CORS 启用状态必需是布尔值');
  }
  if (server.timeout && (typeof server.timeout !== 'number' || server.timeout <= 0)) {
    throw new Error('超时时间必需是正数');
  }
}

/**
 * 验证提供程序配置
 */
async function validateProviderConfigs(providers: any) {
  if (!providers || Object.keys(providers).length === 0) {
    throw new Error('至少需要一个提供程序');
  }

  const requiredTypes = ['openai', 'anthropic', 'google', 'azure', 'custom'];

  for (const [providerId, provider] of Object.entries(providers || {})) {
    const p = provider as any;

    if (!p.id || !p.name) {
      throw new Error(`提供程序 ${providerId} 缺少必需的 id 或 name 字段`);
    }

    if (!p.type || !requiredTypes.includes(p.type)) {
      throw new Error(`提供程序 ${providerId} 无效的类型: ${p.type}`);
    }

    if (p.enabled && !p.endpoint) {
      throw new Error(`提供程序 ${providerId} 已启用但需要 endpoint`);
    }

    if (p.auth && p.auth.type === 'apikey' && (!p.auth.keys || p.auth.keys.length === 0)) {
      // 实际项目中可能需要检查环境变量是否配置
      console.log(`  ⚠️  提供程序 ${providerId} 已启用但可能缺少 API 密钥`);
    }

    // 验证模型配置
    if (p.models) {
      Object.entries(p.models).forEach(([modelId, model]: [string, any]) => {
        if (!model.id || !model.name) {
          throw new Error(`提供程序 ${providerId} 的模型 ${modelId} 缺少必需字段`);
        }

        if (!['chat', 'completion', 'embedding'].includes(model.type)) {
          throw new Error(`模型 ${model.id} 无效的类型: ${model.type}`);
        }
      });
    }
  }
}

/**
 * 验证虚拟模型配置
 */
function validateVirtualModels(virtualModels: any, providers: any) {
  if (!virtualModels || Object.keys(virtualModels).length === 0) {
    throw new Error('至少需要一个虚拟模型');
  }

  for (const [modelId, model] of Object.entries(virtualModels || {})) {
    const vm = model as any;

    if (!vm.id || !vm.name) {
      throw new Error(`虚拟模型 ${modelId} 缺少必需的 id 或 name 字段`);
    }

    if (vm.enabled && (!vm.targets || vm.targets.length === 0)) {
      throw new Error(`虚拟模型 ${modelId} 已启用但缺少目标`);
    }

    if (vm.targets) {
      vm.targets.forEach((target: any, index: number) => {
        if (!target.providerId || !target.modelId) {
          throw new Error(`虚拟模型 ${modelId} 的目标 ${index} 缺少 providerId 或 modelId`);
        }

        // 检查提供程序是否存在
        if (!providers[target.providerId]) {
          throw new Error(`虚拟模型 ${modelId} 目标中的提供程序 ${target.providerId} 不存在`);
        }

        // 检查优先级和权重
        if (target.priority && (typeof target.priority !== 'number' || target.priority < 1)) {
          throw new Error(`虚拟模型 ${modelId} 目标 ${index} 优先级必需是正整数`);
        }

        if (target.weight && (typeof target.weight !== 'number' || target.weight <= 0)) {
          throw new Error(`虚拟模型 ${modelId} 目标 ${index} 权重必需是正数`);
        }
      });
    }
  }
}

/**
 * 验证流水线配置
 */
function validatePipelineConfig(pipeline: any) {
  if (!pipeline || !pipeline.enabled) {
    console.log('  ℹ️  流水线未启用，跳过验证');
    return;
  }

  if (pipeline.modules) {
    pipeline.modules.forEach((module: any, index: number) => {
      if (!module.id || !module.type) {
        throw new Error(`流水线模块 ${index} 缺少必需的 id 或 type 字段`);
      }

      if (typeof module.enabled !== 'boolean') {
        throw new Error(`流水线模块 ${module.id} 的 enabled 必需是布尔值`);
      }
    });
  }
}

/**
 * 执行安全性和性能检查
 */
async function performSecurityChecks(config: any) {
  console.log('  🔍 安全性检查');

  // 检查敏感信息
  let sensitiveFields = 0;
  let publicFields = 0;

  function scanObject(obj: any, path: string = '') {
    if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        const currentPath = path ? `${path}.${key}` : key;

        // 检查敏感字段
        const isSensitive = /
          (password|secret|key|token|auth|pwd|pass)
        /i.test(key);

        if (isSensitive) {
          if (typeof value === 'string' && value.length > 0) {
            sensitiveFields++;
          }
        } else {
          publicFields++;
        }

        // 递归扫描
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          scanObject(value, currentPath);
        }
      });
    }
  }

  scanObject(config);

  console.log(`    ✅ 侦测到的敏感字段: ${sensitiveFields}`);
  console.log(`    ✅ 公开字段: ${publicFields}`);
  console.log(`    ✅ 安全性评分: ${publicFields > 0 ? '良' : '优秀'}`);

  // 性能检查
  console.log('\n  ⚡ 性能检查');

  const providerCount = Object.keys(config.providers || {}).length;
  const modelCount = Object.keys(config.virtualModels || {}).length;
  const moduleCount = config.pipeline?.modules ? config.pipeline.modules.length : 0;

  console.log(`    ✅ 提供程序数量: ${providerCount} (${providerCount > 10 ? '高' : providerCount > 5 ? '中' : '低'})`);
  console.log(`    ✅ 虚拟模型数量: ${modelCount} (${modelCount > 20 ? '高' : modelCount > 10 ? '中' : '低'})`);
  console.log(`    ✅ 流水线模块数量: ${moduleCount} (${moduleCount > 10 ? '高' : moduleCount > 5 ? '中' : '低'})`);
  console.log(`    ✅ 整体复杂度: ${providerCount + modelCount + moduleCount > 50 ? '高' : providerCount + modelCount + moduleCount > 25 ? '中' : '低'}`);

  console.log('\n  📋 配置安全检查建议:');
  if (providerCount > 10) {
    console.log('    💡 建议：提供程序数量较多，考虑分组管理');
  }
  if (modelCount > 20) {
    console.log('    💡 建议：虚拟模型数量较多，考虑命名规范');
  }
  if (sensitiveFields === 0) {
    console.log('    ⚠️  警告：没有检测到凭据信息，请在部署时配置实际 API 密钥');
  }
}

/**
 * 显示验证统计信息
 */
function showValidationStatistics() {
  const stats = rccEnv.safeEnv.getAccessStats();
  const log = rccEnv.safeEnv.getAccessLog();

  console.log('\n📊 访问统计:');
  console.log(`  📝 总访问次数: ${stats.totalAccesses}`);
  console.log(`  🔍 缺失变量: ${stats.missingVariables}`);
  console.log(`  🔒 敏感访问: ${stats.sensitiveAccesses}`);
  console.log(`  🔑 唯一变量: ${stats.uniqueVariables}`);

  if (log.length > 0) {
    console.log('\n📋 最近访问记录:');
    log.slice(-5).forEach(entry => {
      const exists = entry.valueExists ? '✅' : '❌';
      const sensitive = entry.sensitive ? '🔒' : '📄';
      console.log(`  ${sensitive} ${exists} ${entry.varName}`);
    });
  }

  // 清理访问日志
  rccEnv.safeEnv.clearAccessLog();
}

/**
 * 实际的RCC配置文件验证函数
 */
export async function validateRCCConfigFile() {
  console.log('\n🔍 验证实际 RCC 配置文件...');

  try {
    // 尝试验证实际的 RCC 配置文件
    const { rccConfigSchema } = await import('rcc-typesafety/schemas');

    const validationResult = await ConfigValidator.validateConfigFile(
      '../rcc-config.json', // 相对路径
      rccConfigSchema
    );

    if (validationResult.valid) {
      console.log('✅ RCC 配置文件验证通过');
      console.log('✅ 配置结构:');
      console.log(`  - 版本: ${validationResult.data?.version}`);
      console.log(`  - 名称: ${validationResult.data?.name}`);
      console.log(`  - 提供程序: ${Object.keys(validationResult.data?.providers || {}).length} 个`);
    } else {
      console.log('❌ RCC 配置文件验证失败:');
      validationResult.errors.forEach(error => {
        console.log(`  - ${error.path}: ${error.message}`);
      });
    }

    return validationResult;

  } catch (error) {
    console.log('ℹ️  RCC 配置文件不存在或不可访问（这是正常的演示）');
    return {
      valid: false,
      errors: [],
      warnings: [
        {
          path: './rcc-config.json',
          message: '配置文件不存在',
          suggestion: '创建 RCC 配置文件以获得完整验证'
        }
      ]
    };
  }
}

// 主要的执行函数
async function main() {
  console.log('🎯 RCC TypeSafety 框架 - RCC 项目集成演示\n');
  console.log('=' .repeat(60));

  try {
    // 执行完整的 RCC 系统验证
    await startRCSystemWithTypeSafety();

    // 验证实际的配置文件（如果有的话）
    await validateRCCConfigFile();

  } catch (error) {
    console.error('\n❌ 演示执行失败:', error);
    process.exit(1);
  }
}

// 支持模块化导入
export {
  startRCSystemWithTypeSafety,
  validateRCCConfigFile,
  sampleRCCConfig
};

// 如果直接运行
if (require.main === module) {
  main().catch(console.error);
}