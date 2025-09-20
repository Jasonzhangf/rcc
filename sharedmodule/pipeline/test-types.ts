/**
 * 类型检查测试文件
 * 用于验证所有类型定义是否正确
 */

import {
  ProtocolType,
  ModuleConfig,
  PipelineExecutionContext,
  PipelineWrapper
} from './src/interfaces/ModularInterfaces';

import {
  LLMSwitchModule,
  WorkflowModule,
  CompatibilityModule,
  ProviderModule
} from './src/index';

// 测试类型定义
const testProtocol: ProtocolType = ProtocolType.ANTHROPIC;

// 测试ModuleConfig
const testModuleConfig: ModuleConfig = {
  id: 'test-module',
  name: 'Test Module',
  type: 'test',
  version: '1.0.0',
  config: {
    enabled: true
  }
};

// 测试PipelineExecutionContext
const testContext: PipelineExecutionContext = {
  sessionId: 'test-session',
  requestId: 'test-request',
  virtualModelId: 'test-model',
  providerId: 'test-provider',
  startTime: Date.now(),
  metadata: {}
};

// 测试PipelineWrapper
const testWrapper: PipelineWrapper = {
  virtualModels: [],
  modules: [testModuleConfig],
  routing: {
    strategy: 'default',
    fallbackStrategy: 'none'
  },
  metadata: {
    version: '1.0.0'
  }
};

console.log('✅ 所有类型定义正确');
console.log('ProtocolType:', testProtocol);
console.log('ModuleConfig:', testModuleConfig);
console.log('Context:', testContext);
console.log('Wrapper:', testWrapper);