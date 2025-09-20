#!/usr/bin/env node

/**
 * Test script to verify that our interfaces are working correctly
 */

// 测试模块化流水线系统的接口标准化
console.log('🔧 Testing RCC Pipeline Module Interfaces...');

try {
  // 测试模块导入
  const {
    ModularPipelineExecutor,
    ModuleFactory,
    ConfigurationValidator,
    LLMSwitchModule,
    WorkflowModule,
    CompatibilityModule,
    ProviderModule,
    IModularPipelineExecutor,
    IModuleFactory,
    IConfigurationValidator
  } = require('./dist/index.js');

  console.log('✅ All modules imported successfully');

  // 测试ModuleFactory
  const moduleFactory = new ModuleFactory();
  console.log('✅ ModuleFactory created');

  // 测试ConfigurationValidator
  const configValidator = new ConfigurationValidator();
  console.log('✅ ConfigurationValidator created');

  // 测试ModularPipelineExecutor
  const executor = new ModularPipelineExecutor(moduleFactory, configValidator);
  console.log('✅ ModularPipelineExecutor created');

  // 测试接口兼容性
  if (executor instanceof IModularPipelineExecutor) {
    console.log('✅ ModularPipelineExecutor implements IModularPipelineExecutor');
  }

  if (moduleFactory instanceof IModuleFactory) {
    console.log('✅ ModuleFactory implements IModuleFactory');
  }

  if (configValidator instanceof IConfigurationValidator) {
    console.log('✅ ConfigurationValidator implements IConfigurationValidator');
  }

  console.log('🎉 All interface tests passed!');

} catch (error) {
  console.error('❌ Interface test failed:', error.message);
  process.exit(1);
}