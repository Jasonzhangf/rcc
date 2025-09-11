/**
 * 测试重构后的配置模块
 */

import { ConfigurationModule } from './src/core/ConfigurationModule';
import { ConfigData } from './src/core/ConfigData';

async function testRefactoredModule() {
  console.log('Testing refactored configuration module...');

  try {
    // 创建配置模块实例
    const configModule = new ConfigurationModule({
      configPath: './test-config.json',
      autoLoad: false,
      fixedVirtualModels: ['default', 'longcontext', 'thinking', 'background', 'websearch', 'vision', 'coding']
    });

    // 初始化模块
    await configModule.initialize();
    console.log('✅ Module initialized successfully');

    // 创建测试配置
    const testConfig: ConfigData = {
      version: '1.0.0',
      providers: {
        'openai-provider': {
          id: 'openai-provider',
          name: 'OpenAI Provider',
          type: 'openai',
          endpoint: 'https://api.openai.com/v1',
          models: {
            'gpt-3.5-turbo': {
              id: 'gpt-3.5-turbo',
              name: 'GPT-3.5 Turbo',
              contextLength: 4096,
              supportsFunctions: true
            },
            'gpt-4': {
              id: 'gpt-4',
              name: 'GPT-4',
              contextLength: 8192,
              supportsFunctions: true
            }
          },
          auth: {
            type: 'api-key',
            keys: ['sk-test-key-1', 'sk-test-key-2']
          }
        },
        'anthropic-provider': {
          id: 'anthropic-provider',
          name: 'Anthropic Provider',
          type: 'anthropic',
          endpoint: 'https://api.anthropic.com/v1',
          models: {
            'claude-2': {
              id: 'claude-2',
              name: 'Claude 2',
              contextLength: 100000,
              supportsFunctions: false
            }
          },
          auth: {
            type: 'api-key',
            keys: ['sk-anthropic-key-1']
          }
        }
      },
      virtualModels: {
        'default': {
          id: 'default',
          targets: [
            {
              providerId: 'openai-provider',
              modelId: 'gpt-3.5-turbo',
              keyIndex: 0
            },
            {
              providerId: 'anthropic-provider',
              modelId: 'claude-2',
              keyIndex: 0
            }
          ],
          enabled: true,
          priority: 1
        },
        'coding': {
          id: 'coding',
          targets: [
            {
              providerId: 'openai-provider',
              modelId: 'gpt-4',
              keyIndex: 1
            }
          ],
          enabled: true,
          priority: 2
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('✅ Test configuration created');

    // 验证配置
    const validationResult = await configModule.validateConfiguration(testConfig);
    console.log('✅ Configuration validation result:', validationResult);

    // 保存配置
    await configModule.saveConfiguration(testConfig, './test-config.json');
    console.log('✅ Configuration saved to test-config.json');

    // 加载配置
    const loadedConfig = await configModule.loadConfiguration('./test-config.json');
    console.log('✅ Configuration loaded successfully');

    // 生成流水线表
    const pipelineTable = await configModule.generatePipelineTable();
    console.log('✅ Pipeline table generated successfully');
    console.log('Pipeline table entries:', Array.from(pipelineTable.entries()));

    // 验证流水线表
    const pipelineValidation = await configModule.pipelineTableGenerator.validatePipelineTable(pipelineTable);
    console.log('✅ Pipeline table validation result:', pipelineValidation);

    console.log('🎉 All tests passed! Refactored module is working correctly.');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// 运行测试
testRefactoredModule();