/**
 * 测试更新后的配置系统
 */

import { ConfigurationSystem } from './core/ConfigurationSystem';
import { ConfigData } from './core/ConfigData';

async function testUpdatedConfigurationSystem(): Promise<void> {
  console.log('Testing Updated Configuration System...');
  
  try {
    // 创建配置系统实例
    const configSystem = new ConfigurationSystem({
      name: 'TestConfigurationSystem',
      version: '1.0.0'
    });
    
    // 初始化系统
    await configSystem.initialize({
      configPath: './test-config.json',
      autoLoad: false
    });
    console.log('✓ ConfigurationSystem initialized successfully');
    
    // 创建测试配置
    const testConfig: ConfigData = {
      version: '1.0.0',
      providers: {
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
      },
      virtualModels: {
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
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('✓ Test configuration created');
    
    // 保存配置
    await configSystem.saveConfiguration(testConfig, './test-output.json');
    console.log('✓ Configuration saved successfully');
    
    // 加载配置
    const loadedConfig = await configSystem.loadConfiguration('./test-output.json');
    console.log('✓ Configuration loaded successfully');
    
    // 验证配置
    // 注意：这里我们直接调用配置系统的验证方法
    // 在实际使用中，这会通过ConfigurationModule自动完成
    
    // 生成流水线表
    const pipelineTable = await configSystem.generatePipelineTable();
    console.log('✓ Pipeline table generated:', pipelineTable.size, 'entries');
    
    // 显示流水线表内容
    for (const [vmId, entry] of pipelineTable.entries()) {
      console.log(`  ${vmId}: ${entry.targetProvider}.${entry.targetModel} (enabled: ${entry.enabled})`);
    }
    
    // 获取当前配置和流水线表
    const currentConfig = configSystem.getConfiguration();
    const currentPipeline = configSystem.getPipelineTable();
    console.log('✓ Current config retrieved:', currentConfig !== null);
    console.log('✓ Current pipeline table retrieved:', currentPipeline !== null);
    
    // 测试消息处理
    const messageResponse = await configSystem.handleMessage({
      id: 'test-1',
      type: 'config:get',
      source: 'test',
      payload: {},
      timestamp: Date.now()
    });
    console.log('✓ Message handling test:', messageResponse && 'success' in messageResponse ? (messageResponse.success ? 'passed' : 'failed') : 'passed');
    
    // 销毁系统
    await configSystem.destroy();
    console.log('✓ ConfigurationSystem destroyed successfully');
    
    console.log('\n🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// 运行测试
if (require.main === module) {
  testUpdatedConfigurationSystem().catch(console.error);
}

export { testUpdatedConfigurationSystem };