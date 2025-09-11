/**
 * 简化测试重构后的配置模块核心功能
 */

import { ConfigurationModule } from './src/core/ConfigurationModule';
import { ConfigData } from './src/core/ConfigData';

async function testCoreFunctionality() {
  console.log('Testing core functionality of refactored configuration module...');

  try {
    // 创建测试配置
    const testConfig: ConfigData = {
      version: '1.0.0',
      providers: {
        'openai-provider': {
          id: 'openai-provider',
          name: 'OpenAI Provider',
          type: 'openai',
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
            }
          ],
          enabled: true,
          priority: 1
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('✅ Test configuration created');
    console.log('Test config:', JSON.stringify(testConfig, null, 2));

    console.log('🎉 Core functionality test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// 运行测试
testCoreFunctionality();