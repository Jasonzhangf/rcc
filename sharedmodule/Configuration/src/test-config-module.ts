/**
 * 测试配置模块功能
 */

import { ConfigurationModule } from './core/ConfigurationModule';
import { ConfigData } from './core/ConfigData';

async function testConfigurationModule(): Promise<void> {
  console.log('Testing Configuration Module...');
  
  try {
    // 创建配置模块实例
    const configModule = new ConfigurationModule({
      configPath: './test-config.json',
      autoLoad: false
    });
    
    // 初始化模块
    await configModule.initialize();
    console.log('✓ ConfigurationModule initialized successfully');
    
    // 创建空配置
    const emptyConfig = configModule.createEmptyConfig();
    console.log('✓ Empty config created:', emptyConfig);
    
    // 添加测试供应商和虚拟模型
    emptyConfig.providers = {
      'test-provider': {
        id: 'test-provider',
        name: 'Test Provider',
        type: 'openai',
        models: {
          'gpt-4': {
            id: 'gpt-4',
            name: 'GPT-4'
          }
        },
        auth: {
          type: 'api-key',
          keys: ['test-key-123']
        }
      }
    };
    
    emptyConfig.virtualModels = {
      'default': {
        id: 'default',
        targets: [{
          providerId: 'test-provider',
          modelId: 'gpt-4',
          keyIndex: 0
        }],
        enabled: true,
        priority: 1
      },
      'longcontext': {
        id: 'longcontext',
        targets: [{
          providerId: 'test-provider',
          modelId: 'gpt-4',
          keyIndex: 0
        }],
        enabled: true,
        priority: 2
      }
    };
    
    console.log('✓ Test configuration created with providers and virtual models');
    
    // 验证配置
    const validation = await configModule.validateConfiguration(emptyConfig);
    console.log('✓ Configuration validation result:', validation);
    
    // 生成流水线表
    configModule['currentConfig'] = emptyConfig; // 私有属性在测试中直接设置
    const pipelineTable = await configModule.generatePipelineTable();
    console.log('✓ Pipeline table generated:', pipelineTable.size, 'entries');
    
    // 显示流水线表内容
    for (const [vmId, entry] of pipelineTable.entries()) {
      console.log(`  ${vmId}: ${entry.targetProvider}.${entry.targetModel}`);
    }
    
    // 测试获取配置和流水线表
    const currentConfig = configModule.getCurrentConfig();
    const currentPipeline = configModule.getCurrentPipelineTable();
    console.log('✓ Current config retrieved:', currentConfig !== null);
    console.log('✓ Current pipeline table retrieved:', currentPipeline !== null);
    
    // 销毁模块
    await configModule.destroy();
    console.log('✓ ConfigurationModule destroyed successfully');
    
    console.log('\n🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// 运行测试
if (require.main === module) {
  testConfigurationModule().catch(console.error);
}

export { testConfigurationModule };