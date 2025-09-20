/**
 * Quick Verification Test for RCC Pipeline Module
 * 快速验证测试脚本
 */

import { ModuleFactory } from '../core/ModuleFactory';
import { ModularPipelineExecutor } from '../core/ModularPipelineExecutor';
import { ConfigurationValidator } from '../core/ConfigurationValidator';
import { LLMSwitchModule } from '../modules/LLMSwitchModule';
import { WorkflowModule } from '../modules/WorkflowModule';
import { CompatibilityModule } from '../modules/CompatibilityModule';
import { ProviderModule } from '../modules/ProviderModule';
import {
  PipelineWrapper,
  ModuleConfig,
  ProtocolType
} from '../interfaces/ModularInterfaces';

/**
 * Mock provider for testing
 */
class MockProvider {
  async executeRequest(request: any, context: any): Promise<any> {
    return {
      id: 'mock-response-' + Date.now(),
      object: 'chat.completion',
      created: Date.now(),
      model: request.model || 'mock-model',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: 'Mock response from provider'
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15
      }
    };
  }

  getProviderInfo() {
    return {
      id: 'mock-provider',
      name: 'Mock Provider',
      type: ProtocolType.OPENAI,
      endpoint: 'https://mock-api.example.com',
      models: ['mock-model'],
      capabilities: {
        streaming: false,
        functions: false,
        vision: false,
        maxTokens: 1000
      },
      authentication: {
        type: 'bearer',
        required: true
      }
    };
  }

  async checkHealth() {
    return {
      isHealthy: true,
      responseTime: 100,
      error: undefined
    };
  }
}

/**
 * Quick verification test suite
 */
class QuickVerification {
  private results: any[] = [];

  constructor() {
    console.log('🚀 开始RCC Pipeline快速验证测试');
  }

  /**
   * 运行所有快速测试
   */
  async runAllTests(): Promise<void> {
    console.log('\n📋 执行快速验证测试...\n');

    try {
      // 测试1: 模块工厂
      await this.testModuleFactory();

      // 测试2: 配置验证
      await this.testConfigurationValidator();

      // 测试3: 模块初始化
      await this.testModuleInitialization();

      // 测试4: 流水线执行器
      await this.testPipelineExecutor();

      // 测试5: 接口兼容性
      await this.testInterfaceCompatibility();

      // 生成报告
      this.generateReport();

    } catch (error) {
      console.error('❌ 快速验证失败:', error);
      throw error;
    }
  }

  /**
   * 测试模块工厂
   */
  private async testModuleFactory(): Promise<void> {
    console.log('🏭 测试模块工厂...');

    try {
      const factory = new ModuleFactory();
      const registeredTypes = factory.getRegisteredModuleTypes();

      const expectedTypes = ['llmswitch', 'workflow', 'compatibility', 'provider'];
      const missingTypes = expectedTypes.filter(type => !registeredTypes.includes(type));

      if (missingTypes.length > 0) {
        throw new Error(`缺少模块类型: ${missingTypes.join(', ')}`);
      }

      this.results.push({
        test: 'Module Factory',
        status: '✅ 通过',
        details: { registeredTypes, expectedTypes }
      });

      console.log('   ✅ 模块工厂正常工作');
    } catch (error) {
      this.results.push({
        test: 'Module Factory',
        status: '❌ 失败',
        error: error instanceof Error ? error.message : String(error)
      });
      console.log('   ❌ 模块工厂测试失败:', error);
    }
  }

  /**
   * 测试配置验证器
   */
  private async testConfigurationValidator(): Promise<void> {
    console.log('🔍 测试配置验证器...');

    try {
      const validator = new ConfigurationValidator();

      // 创建测试配置
      const testConfig: PipelineWrapper = {
        virtualModels: [
          {
            id: 'test-model',
            name: 'Test Model',
            description: 'Test virtual model',
            targets: [{ providerId: 'mock-provider' }],
            capabilities: ['text-generation']
          }
        ],
        modules: [
          {
            id: 'llmswitch',
            name: 'LLMSwitch',
            type: 'llmswitch',
            config: { enabled: true }
          },
          {
            id: 'workflow',
            name: 'Workflow',
            type: 'workflow',
            config: { enabled: true }
          },
          {
            id: 'compatibility',
            name: 'Compatibility',
            type: 'compatibility',
            config: { enabled: true }
          },
          {
            id: 'provider',
            name: 'Provider',
            type: 'provider',
            config: { enabled: true }
          }
        ],
        routing: {
          strategy: 'round-robin',
          fallbackStrategy: 'failover'
        },
        metadata: {
          version: '1.0.0',
          description: 'Test configuration'
        }
      };

      const validationResult = await validator.validateWrapper(testConfig);

      if (!validationResult.isValid) {
        throw new Error(`配置验证失败: ${validationResult.errors.join(', ')}`);
      }

      this.results.push({
        test: 'Configuration Validator',
        status: '✅ 通过',
        details: validationResult
      });

      console.log('   ✅ 配置验证器正常工作');
    } catch (error) {
      this.results.push({
        test: 'Configuration Validator',
        status: '❌ 失败',
        error: error instanceof Error ? error.message : String(error)
      });
      console.log('   ❌ 配置验证器测试失败:', error);
    }
  }

  /**
   * 测试模块初始化
   */
  private async testModuleInitialization(): Promise<void> {
    console.log('🔧 测试模块初始化...');

    try {
      const factory = new ModuleFactory();

      // 测试LLMSwitch模块
      const llmswitch = await factory.createLLMSwitch({
        id: 'test-llmswitch',
        name: 'Test LLMSwitch',
        type: 'llmswitch',
        config: { enabled: true }
      });

      // 测试Workflow模块
      const workflow = await factory.createWorkflowModule({
        id: 'test-workflow',
        name: 'Test Workflow',
        type: 'workflow',
        config: { enabled: true }
      });

      // 测试Compatibility模块
      const compatibility = await factory.createCompatibilityModule({
        id: 'test-compatibility',
        name: 'Test Compatibility',
        type: 'compatibility',
        config: { enabled: true }
      });

      // 测试Provider模块
      const provider = await factory.createProviderModule({
        id: 'test-provider',
        name: 'Test Provider',
        type: 'provider',
        config: {
          enabled: true,
          provider: new MockProvider() as any
        }
      });

      // 检查模块状态
      const llmswitchStatus = await llmswitch.getStatus();
      const workflowStatus = await workflow.getStatus();
      const compatibilityStatus = await compatibility.getStatus();
      const providerStatus = await provider.getStatus();

      if (!llmswitchStatus.isInitialized || !workflowStatus.isInitialized ||
          !compatibilityStatus.isInitialized || !providerStatus.isInitialized) {
        throw new Error('部分模块初始化失败');
      }

      this.results.push({
        test: 'Module Initialization',
        status: '✅ 通过',
        details: {
          llmswitch: llmswitchStatus.isInitialized,
          workflow: workflowStatus.isInitialized,
          compatibility: compatibilityStatus.isInitialized,
          provider: providerStatus.isInitialized
        }
      });

      console.log('   ✅ 所有模块初始化成功');
    } catch (error) {
      this.results.push({
        test: 'Module Initialization',
        status: '❌ 失败',
        error: error instanceof Error ? error.message : String(error)
      });
      console.log('   ❌ 模块初始化测试失败:', error);
    }
  }

  /**
   * 测试流水线执行器
   */
  private async testPipelineExecutor(): Promise<void> {
    console.log('🏗️ 测试流水线执行器...');

    try {
      const factory = new ModuleFactory();
      const validator = new ConfigurationValidator();
      const executor = new ModularPipelineExecutor(factory, validator);

      // 创建测试配置
      const testConfig: PipelineWrapper = {
        virtualModels: [
          {
            id: 'test-model',
            name: 'Test Model',
            targets: [{ providerId: 'mock-provider' }],
            capabilities: ['text-generation']
          }
        ],
        modules: [
          {
            id: 'llmswitch',
            name: 'LLMSwitch',
            type: 'llmswitch',
            config: { enabled: true }
          },
          {
            id: 'workflow',
            name: 'Workflow',
            type: 'workflow',
            config: { enabled: true }
          },
          {
            id: 'compatibility',
            name: 'Compatibility',
            type: 'compatibility',
            config: { enabled: true }
          },
          {
            id: 'provider',
            name: 'Provider',
            type: 'provider',
            config: {
              enabled: true,
              provider: new MockProvider() as any
            }
          }
        ],
        routing: {
          strategy: 'round-robin',
          fallbackStrategy: 'failover'
        },
        metadata: {
          version: '1.0.0'
        }
      };

      // 初始化执行器
      await executor.initialize(testConfig);

      // 检查执行器状态
      const status = await executor.getStatus();

      if (!status.isInitialized) {
        throw new Error('执行器初始化失败');
      }

      this.results.push({
        test: 'Pipeline Executor',
        status: '✅ 通过',
        details: {
          initialized: status.isInitialized,
          modules: Object.keys(status.modules).length
        }
      });

      console.log('   ✅ 流水线执行器初始化成功');
    } catch (error) {
      this.results.push({
        test: 'Pipeline Executor',
        status: '❌ 失败',
        error: error instanceof Error ? error.message : String(error)
      });
      console.log('   ❌ 流水线执行器测试失败:', error);
    }
  }

  /**
   * 测试接口兼容性
   */
  private async testInterfaceCompatibility(): Promise<void> {
    console.log('🔌 测试接口兼容性...');

    try {
      const factory = new ModuleFactory();

      // 创建模块实例
      const llmswitch = await factory.createLLMSwitch({
        id: 'test-llmswitch',
        name: 'Test LLMSwitch',
        type: 'llmswitch',
        config: { enabled: true }
      });

      // 测试LLMSwitch接口方法
      const conversions = llmswitch.getSupportedConversions();
      if (!Array.isArray(conversions)) {
        throw new Error('getSupportedConversions应该返回数组');
      }

      const supportsConversion = llmswitch.supportsConversion(ProtocolType.ANTHROPIC, ProtocolType.OPENAI);
      if (typeof supportsConversion !== 'boolean') {
        throw new Error('supportsConversion应该返回布尔值');
      }

      // 测试协议转换
      const testRequest = {
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const context = {
        sessionId: 'test-session',
        requestId: 'test-request',
        virtualModelId: 'test-model',
        providerId: 'mock-provider',
        startTime: Date.now(),
        ioRecords: [],
        metadata: {}
      };

      const convertedRequest = await llmswitch.convertRequest(
        testRequest,
        ProtocolType.ANTHROPIC,
        ProtocolType.OPENAI,
        context
      );

      if (!convertedRequest || typeof convertedRequest !== 'object') {
        throw new Error('协议转换失败');
      }

      this.results.push({
        test: 'Interface Compatibility',
        status: '✅ 通过',
        details: {
          supportedConversions: conversions.length,
          supportsAnthropicToOpenAI: supportsConversion,
          conversionSuccessful: true
        }
      });

      console.log('   ✅ 接口兼容性测试通过');
    } catch (error) {
      this.results.push({
        test: 'Interface Compatibility',
        status: '❌ 失败',
        error: error instanceof Error ? error.message : String(error)
      });
      console.log('   ❌ 接口兼容性测试失败:', error);
    }
  }

  /**
   * 生成测试报告
   */
  private generateReport(): void {
    console.log('\n' + '='.repeat(50));
    console.log('📊 快速验证测试报告');
    console.log('='.repeat(50));

    const passed = this.results.filter(r => r.status === '✅ 通过').length;
    const failed = this.results.filter(r => r.status === '❌ 失败').length;
    const total = this.results.length;

    console.log(`\n测试结果: ${passed}/${total} 通过 (${(passed/total*100).toFixed(1)}%)`);

    this.results.forEach(result => {
      console.log(`\n${result.test}: ${result.status}`);
      if (result.error) {
        console.log(`   错误: ${result.error}`);
      }
      if (result.details) {
        console.log(`   详情: ${JSON.stringify(result.details, null, 2)}`);
      }
    });

    console.log('\n' + '='.repeat(50));

    if (failed === 0) {
      console.log('🎉 所有快速验证测试通过！系统基本功能正常');
    } else {
      console.log(`⚠️  发现 ${failed} 个问题需要修复`);
    }
    console.log('='.repeat(50));
  }

  /**
   * 获取测试结果
   */
  getResults(): any[] {
    return this.results;
  }
}

/**
 * 运行快速验证
 */
export async function runQuickVerification(): Promise<void> {
  const verification = new QuickVerification();
  await verification.runAllTests();
}

// 如果直接运行此文件，执行验证
if (import.meta.url === `file://${process.argv[1]}`) {
  runQuickVerification()
    .then(() => {
      console.log('\n🏁 快速验证完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 快速验证失败:', error);
      process.exit(1);
    });
}