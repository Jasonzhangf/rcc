/**
 * Unified Configuration System Example
 * 统一配置系统示例
 */

import {
  createConfigManager,
  createValidator,
  createMigrator,
  ConfigValidator,
  ConfigMigrator,
  ConfigManagerFactory,
  type UnifiedConfig,
  type ConfigValidationResult,
  type MigrationResult
} from '../src/config/index.js';

/**
 * 基础使用示例
 */
async function basicUsageExample() {
  console.log('🚀 Basic Configuration Manager Usage');

  // 创建配置管理器
  const configManager = createConfigManager('./rcc-config.json', true); // 启用监听模式

  try {
    // 加载配置
    await configManager.loadConfig();
    console.log('✅ Configuration loaded successfully');

    // 获取完整配置
    const config = configManager.getConfig();
    console.log('📋 Current configuration:', JSON.stringify(config, null, 2));

    // 获取配置片段
    const serverConfig = configManager.getConfigSection('rcc');
    console.log('🌐 Server config:', serverConfig.server);

    // 获取嵌套配置值
    const port = configManager.getConfigValue('rcc.server.port');
    console.log(`🔌 Server port: ${port}`);

    // 监听配置变更
    configManager.on('configChanged', (event) => {
      console.log(`\n🔧 Configuration changed: ${event.key}`);
      console.log(`   Old: ${JSON.stringify(event.oldValue)}`);
      console.log(`   New: ${JSON.stringify(event.newValue)}`);
    });

  } catch (error) {
    console.error('❌ Configuration error:', error);
  }
}

/**
 * 配置验证示例
 */
async function validationExample() {
  console.log('\n🔍 Configuration Validation Example');

  const validator = createValidator();

  try {
    // 验证配置文件
    const validationResult = await validator.validateConfigFile('./rcc-config.json');

    console.log('Validation Result:', {
      valid: validationResult.valid,
      errors: validationResult.errors.length,
      warnings: validationResult.warnings.length,
      suggestions: validationResult.suggestions?.length || 0
    });

    // 显示详细信息
    if (validationResult.errors.length > 0) {
      console.log('\n❌ Errors:');
      validationResult.errors.forEach(error => {
        console.log(`   • ${error.path}: ${error.message}`);
      });
    }

    if (validationResult.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      validationResult.warnings.forEach(warning => {
        console.log(`   • ${warning.path}: ${warning.message}`);
      });
    }

    if (validationResult.suggestions) {
      console.log('\n💡 Suggestions:');
      validationResult.suggestions.forEach(suggestion => {
        console.log(`   • ${suggestion.path}: ${suggestion.suggestion}`);
      });
    }

  } catch (error) {
    console.error('❌ Validation failed:', error);
  }
}

/**
 * 配置迁移示例
 */
async function migrationExample() {
  console.log('\n🔄 Configuration Migration Example');

  const migrator = createMigrator({
    backup: true,
    dryRun: false,
    autoFixErrors: true,
    generateReport: true
  });

  try {
    // 检查是否需要迁移
    const needsMigration = await MigrationUtils.needsMigration('./old-config.json');
    console.log(`Needs migration: ${needsMigration}`);

    if (needsMigration) {
      // 执行迁移
      const result: MigrationResult = await migrator.migrateConfigFile(
        './old-config.json',
        './new-config.json'
      );

      console.log('Migration Result:', {
        success: result.success,
        originalPath: result.originalPath,
        newPath: result.newPath,
        backupPath: result.backupPath,
        changes: result.changes.length,
        warnings: result.warnings.length
      });

      // 显示变更详情
      if (result.changes.length > 0) {
        console.log('\n📋 Changes made:');
        result.changes.forEach(change => {
          console.log(`   • ${change.type}: ${change.path} - ${change.reason}`);
        });
      }

      // 显示迁移报告
      if (result.report) {
        console.log('\n📊 Migration Report:');
        console.log(`   Source version: ${result.report.sourceVersion}`);
        console.log(`   Target version: ${result.report.targetVersion}`);
        console.log(`   Total changes: ${result.report.totalChanges}`);
        console.log(`   Breaking changes: ${result.report.breakingChanges}`);
        console.log(`   Compatible changes: ${result.report.compatibleChanges}`);
      }
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

/**
 * 配置模板生成示例
 */
async function templateExample() {
  console.log('\n📝 Configuration Template Example');

  const validator = createValidator();

  // 开发环境模板
  const devTemplate = validator.createConfigTemplate({
    environment: 'development',
    includeProviders: true,
    includeVirtualModels: true,
    includePipeline: false
  });

  console.log('Development Template Keys:', Object.keys(devTemplate));

  // 生产环境模板
  const prodTemplate = validator.createConfigTemplate({
    environment: 'production',
    includeProviders: true,
    includeVirtualModels: true,
    includePipeline: true
  });

  console.log('Production Template Keys:', Object.keys(prodTemplate));

  // 保存模板到文件
  const fs = await import('fs');
  const path = await import('path');

  await fs.writeFile(
    './rcc-config.template.json',
    JSON.stringify(devTemplate, null, 2),
    'utf8'
  );

  console.log('✅ Template saved to: ./rcc-config.template.json');
}

/**
 * 高级配置管理示例
 */
async function advancedConfigExample() {
  console.log('\n🔧 Advanced Configuration Management');

  // 创建多个配置管理器实例
  const devManager = ConfigManagerFactory.create('./config-dev.json', false, 'development');
  const prodManager = ConfigManagerFactory.create('./config-prod.json', false, 'production');

  try {
    // 分别加载不同环境的配置
    await Promise.all([
      devManager.loadConfig(),
      prodManager.loadConfig()
    ]);

    // 比较配置差异
    const devConfig = devManager.getConfig();
    const prodConfig = prodManager.getConfig();

    console.log('Development vs Production:');
    console.log(`   Dev debug: ${devConfig.rcc.debugging?.enabled}`);
    console.log(`   Prod debug: ${prodConfig.rcc.debugging?.enabled}`);

    // 运行时配置更新
    console.log('\n🔄 Runtime Configuration Update');

    // 更新特定配置值
    devManager.updateConfigValue('rcc.server.timeout', 60000); // 1 minute

    // 获取更新后的值
    const newTimeout = devManager.getConfigValue('rcc.server.timeout');
    console.log(`Updated timeout: ${newTimeout}ms`);

    // 监听变更事件
    devManager.on('configChanged', (event) => {
      console.log(`Configuration updated: ${event.key}`);
    });

  } catch (error) {
    console.error('❌ Advanced configuration error:', error);
  } finally {
    // 清理资源
    devManager.destroy();
    prodManager.destroy();
  }
}

/**
 * 配置依赖验证示例
 */
async function dependencyValidationExample() {
  console.log('\n🔗 Configuration Dependency Validation');

  const validator = createValidator();

  // 创建一个测试配置（缺少必需的依赖项）
  const testConfig: UnifiedConfig = {
    rcc: {
      virtualModels: {
        'gpt-model': {
          id: 'gpt-model',
          name: 'GPT Model',
          enabled: true,
          targets: [
            {
              providerId: 'openai', // 引用不存在的提供程序
              modelId: 'gpt-3.5-turbo',
              enabled: true
            }
          ]
        }
      }
    },
    modules: {
      global: {},
      discovery: {},
      loader: {},
      errorHandling: {}
    },
    pipeline: { enabled: false },
    global: {
      environment: 'development',
      paths: {},
      performance: {},
      security: {}
    }
  };

  try {
    const validation = await validator.validateConfig(testConfig);

    console.log('Dependency validation result:', validation);

    if (!validation.valid && validation.errors.length > 0) {
      console.log('\n❌ Dependency errors found:');
      validation.errors.forEach(error => {
        console.log(`   • ${error.path}: ${error.message}`);
      });
    }

  } catch (error) {
    console.error('❌ Dependency validation failed:', error);
  }
}

/**
 * 批量配置管理示例
 */
async function batchManagementExample() {
  console.log('\n📁 Batch Configuration Management');

  // 批量验证配置
  const validator = createValidator();
  const configFiles = [
    './config1.json',
    './config2.json',
    './config3.json'
  ];

  console.log('🔍 Validating multiple configuration files...');

  const results = await Promise.allSettled(
    configFiles.map(file => validator.validateConfigFile(file))
  );

  results.forEach((result, index) => {
    const file = configFiles[index];
    if (result.status === 'fulfilled') {
      const validation = result.value;
      const status = validation.valid ? '✅' : '❌';
      console.log(`${status} ${file}: ${validation.errors.length} errors, ${validation.warnings.length} warnings`);
    } else {
      console.log(`❌ ${file}: ${result.reason}`);
    }
  });

  // 批量迁移配置
  const migrator = createMigrator({
    backup: true,
    dryRun: true, // 预览模式
    generateReport: true
  });

  try {
    const migrationResults = await migrator.batchMigrate('./configs', '*.json');

    console.log('\n🔄 Batch migration results:');
    migrationResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.originalPath}: ${result.changes.length} changes`);
    });

  } catch (error) {
    console.error('❌ Batch migration failed:', error);
  }
}

/**
 * 实时配置监控示例
 */
async function realTimeMonitoringExample() {
  console.log('\n👁️ Real-time Configuration Monitoring');

  const configManager = createConfigManager('./rcc-config.json', true);

  // 设置各种监听器
  configManager.on('configLoaded', (config) => {
    console.log('📊 Configuration loaded:', {
      environment: config.global.environment,
      providers: Object.keys(config.rcc.providers).length,
      virtualModels: Object.keys(config.rcc.virtualModels).length
    });
  });

  configManager.on('configChanged', (event) => {
    console.log('🔄 Configuration changed:', {
      key: event.key,
      source: event.source.type,
      timestamp: new Date(event.timestamp).toLocaleString()
    });
  });

  configManager.on('configError', (error) => {
    console.error('❌ Configuration error:', error);
  });

  try {
    // 加载配置并开始监控
    await configManager.loadConfig();

    console.log('🔍 Monitoring configuration changes (Press Ctrl+C to stop)...');

    // 模拟一些配置变更（在实际应用中可能来自文件系统或网络）
    setTimeout(() => {
      configManager.updateConfigValue('rcc.server.timeout', 45000);
    }, 5000);

    setTimeout(() => {
      configManager.updateConfigValue('rcc.debugging.level', 'debug');
    }, 10000);

    // 等待用户中断
    await new Promise(resolve => {
      process.on('SIGINT', resolve);
    });

  } catch (error) {
    console.error('❌ Monitoring failed:', error);
  } finally {
    configManager.destroy();
    console.log('👋 Configuration monitoring stopped');
  }
}

/**
 * 错误处理和恢复示例
 */
async function errorHandlingExample() {
  console.log('\n⚠️ Configuration Error Handling');

  const configManager = createConfigManager();
  const validator = createValidator();

  try {
    // 尝试加载无效的配置
    await configManager.loadConfig();
  } catch (error) {
    console.log('❌ Configuration loading failed:', error instanceof Error ? error.message : String(error));

    // 使用默认配置作为回退
    console.log('🔄 Falling back to default configuration...');

    const validator = createValidator();
    const defaultTemplate = validator.createConfigTemplate({
      environment: 'development',
      includeProviders: false,
      includeVirtualModels: false,
      includePipeline: false
    });

    console.log('✅ Fallback configuration created');

    // 验证回退配置
    const validation = await validator.validateConfig(defaultTemplate);
    if (validation.valid) {
      console.log('✅ Fallback configuration is valid');
    } else {
      console.log('❌ Fallback configuration has issues:', validation.errors.length, 'errors');
    }
  }
}

// 运行所有示例
async function runAllExamples() {
  const examples = [
    basicUsageExample,
    validationExample,
    migrationExample,
    templateExample,
    advancedConfigExample,
    dependencyValidationExample,
    batchManagementExample,
    // realTimeMonitoringExample, // 这个会阻塞进程
    errorHandlingExample
  ];

  console.log('🎯 Running Configuration System Examples');
  console.log('==========================================\n');

  for (const example of examples) {
    try {
      await example();
    } catch (error) {
      console.error(`❌ Example failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    console.log('\n' + '='.repeat(50) + '\n');
  }

  console.log('✅ All examples completed!');
}

// 如果直接运行此文件，执行所有示例
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(error => {
    console.error('❌ Examples failed:', error);
    process.exit(1);
  });
}

export {
  basicUsageExample,
  validationExample,
  migrationExample,
  templateExample,
  advancedConfigExample,
  dependencyValidationExample,
  batchManagementExample,
  realTimeMonitoringExample,
  errorHandlingExample,
  runAllExamples
};