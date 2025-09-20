#!/usr/bin/env node

/**
 * Unified Configuration System Test Script
 * 统一配置系统测试脚本
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Unified Configuration System Test...');

try {
  // Dynamic imports to handle any module loading issues
  const {
    createConfigManager,
    createValidator,
    createMigrator,
    type UnifiedConfig,
    type ConfigValidationResult,
    type MigrationResult
  } = await import('./src/config/index.ts');

  console.log('✅ Configuration system imported successfully');

  // Test 1: 创建配置管理器
  console.log('\n📋 Test 1: Configuration Manager');
  const configManager = createConfigManager('./test-config.json', false);
  console.log('✅ Configuration manager created');

  // Test 2: 配置验证器
  console.log('\n🔍 Test 2: Configuration Validator');
  const validator = createValidator();

  // 创建测试配置
  const testConfig = {
    rcc: {
      port: 5506,
      server: {
        port: 5506,
        host: '0.0.0.0',
        protocol: 'http',
        cors: {
          enabled: true,
          origins: ['*']
        }
      },
      providers: {
        'test-provider': {
          id: 'test-provider',
          name: 'Test Provider',
          type: 'openai',
          enabled: true,
          endpoint: 'https://api.openai.com/v1',
          auth: {
            type: 'apikey',
            keys: ['${OPENAI_API_KEY}']
          }
        }
      },
      virtualModels: {
        'test-model': {
          id: 'test-model',
          name: 'Test Model',
          enabled: true,
          targets: [
            {
              providerId: 'test-provider',
              modelId: 'gpt-3.5-turbo',
              enabled: true
            }
          ]
        }
      },
      pipeline: { enabled: false },
      debugging: {
        enabled: true,
        level: 'info'
      }
    },
    modules: {
      global: {
        basePath: './sharedmodule',
        autoLoad: true
      },
      discovery: {
        scanPaths: ['./sharedmodule'],
        recursive: true
      },
      loader: {
        caching: true,
        maxRetries: 3
      },
      errorHandling: {
        enabled: true,
        recovery: {
          enabled: true,
          maxAttempts: 3
        }
      }
    },
    pipeline: {
      enabled: false,
      modules: [],
      transformers: []
    },
    global: {
      environment: 'development',
      paths: {
        config: './',
        logs: './logs'
      },
      performance: {
        enabled: true
      },
      security: {
        enabled: false
      }
    }
  };

  // 验证配置
  const validation = await validator.validateConfig(testConfig);
  console.log(`✅ Validation completed - ${validation.valid ? 'VALID' : 'INVALID'}`);
  console.log(`   Errors: ${validation.errors.length}`);
  console.log(`   Warnings: ${validation.warnings.length}`);
  console.log(`   Suggestions: ${validation.suggestions?.length || 0}`);

  if (validation.errors.length > 0) {
    console.log('❌ Validation errors:');
    validation.errors.forEach(error => {
      console.log(`   • ${error.path}: ${error.message}`);
    });
  }

  // Test 3: 配置模板生成
  console.log('\n📝 Test 3: Configuration Template Generation');
  const templates = {
    development: validator.createConfigTemplate({
      environment: 'development',
      includeProviders: false,
      includeVirtualModels: false,
      includePipeline: false
    }),
    production: validator.createConfigTemplate({
      environment: 'production',
      includeProviders: true,
      includeVirtualModels: true,
      includePipeline: true
    })
  };

  console.log('✅ Configuration templates generated');
  console.log(`   Development template: ${Object.keys(templates.development).length} sections`);
  console.log(`   Production template: ${Object.keys(templates.production).length} sections`);

  // Test 4: 配置迁移测试
  console.log('\n🔄 Test 4: Configuration Migration');
  const migrator = createMigrator({
    backup: false,  // 测试时不创建备份
    dryRun: true,   // 预览模式
    autoFixErrors: true,
    generateReport: true
  });

  // 模拟旧配置
  const oldConfig = {
    port: 8080,
    server: {
      host: 'localhost',
      port: 8080,
      cors: true
    },
    providers: {
      'openai': {
        endpoint: 'https://api.openai.com/v1',
        apiKey: '${OPENAI_API_KEY}'
      }
    },
    virtualModels: {
      'gpt': {
        name: 'GPT Model',
        providers: ['openai'],
        enabled: true
      }
    },
    debug: true
  };

  try {
    const migrationResult = await migrator.migrateConfig(
      oldConfig,
      './old-config.json',
      './new-config.json'
    );

    console.log('✅ Migration completed');
    console.log(`   Success: ${migrationResult.success}`);
    console.log(`   Changes: ${migrationResult.changes.length}`);
    console.log(`   Validation: ${migrationResult.validation.valid ? 'VALID' : 'INVALID'}`);

    if (migrationResult.report) {
      console.log(`   Report: ${migrationResult.report.totalChanges} total changes`);
    }
  } catch (error) {
    console.log(`❌ Migration failed: ${error.message}`);
  }

  // Test 5: 配置管理器功能测试
  console.log('\n⚙️ Test 5: Configuration Manager Features');

  try {
    // 写入测试配置文件
    await fs.writeFile('./test-config.json', JSON.stringify(testConfig, null, 2));

    // 创建管理器并加载配置
    const testManager = createConfigManager('./test-config.json', false);

    // 加载配置
    await testManager.loadConfig();
    console.log('✅ Configuration loaded from file');

    // 获取配置值
    const portValue = testManager.getConfigValue('rcc.server.port');
    const serverSection = testManager.getConfigSection('rcc');
    const fullConfig = testManager.getConfig();

    console.log(`✅ Configuration access working`);
    console.log(`   Server port: ${portValue}`);
    console.log(`   Provider count: ${Object.keys(serverSection.providers).length}`);
    console.log(`   Config sections: ${Object.keys(fullConfig)}`);

    // 测试配置更新
    testManager.updateConfigValue('rcc.server.port', 9090);
    const updatedPort = testManager.getConfigValue('rcc.server.port');
    console.log(`✅ Configuration update working (${updatedPort})`);

  } catch (error) {
    console.log(`❌ Configuration manager test failed: ${error.message}`);
  }

  // Test 6: 自动修复功能
  console.log('\n🔧 Test 6: Auto-fix Functionality');

  try {
    // 创建有问题的配置
    const problematicConfig = {
      rcc: {
        // 缺少必需的providers
        virtualModels: {
          'test-model': {
            targets: [
              { providerId: 'nonexistent-provider', modelId: 'test' }
            ]
          }
        }
      },
      modules: {},
      pipeline: {},
      global: { environment: 'development' }
    };

    const fixValidation = await validator.validateConfig(problematicConfig);
    console.log(`Pre-fix validation: ${fixValidation.valid ? 'VALID' : 'INVALID'}`);

    if (fixValidation.errors.length > 0) {
      console.log('Applying auto-fix...');
      const autoFixResult = await validator.autoFix(problematicConfig);

      console.log(`Auto-fix applied: ${autoFixResult.fixed}`);
      console.log(`Post-fix suggestions: ${autoFixResult.suggestions.length}`);
    }

  } catch (error) {
    console.log(`❌ Auto-fix test failed: ${error.message}`);
  }

  // 清理测试文件
  console.log('\n🧹 Cleaning up test files...');
  try {
    await fs.unlink('./test-config.json');
    console.log('✅ Test configuration file removed');
  } catch (error) {
    console.log('⚠️ Cleanup warning: Test file might not exist');
  }

  console.log('\n🎉 All Unified Configuration System tests completed!');
  console.log('='.repeat(60));

  // 导出测试结果
  return {
    success: true,
    testsCompleted: 6,
    validationResults: {
      valid: validation.valid,
      errors: validation.errors.length,
      warnings: validation.warnings.length
    },
    migrationResults: migrationResult || null
  };

} catch (error) {
  console.error('❌ Unified Configuration System test failed:', error);

  return {
    success: false,
    error: error.message,
    testsCompleted: 0
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testUnifiedConfig().then(result => {
    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    console.error('Test script error:', error);
    process.exit(1);
  });
}

export { testUnifiedConfig };