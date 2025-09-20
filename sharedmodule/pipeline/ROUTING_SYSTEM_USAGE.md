# Virtual Model Routing System - 使用指南

## 概述

虚拟模型路由系统是RCC流水线模块的核心组件，提供智能化的请求路由功能。系统能够根据请求特征、模型能力和用户需求，自动选择最适合的虚拟模型和流水线池来处理请求。

## 核心组件

### 1. RequestAnalyzer（请求分析器）
- **功能**: 分析请求内容特征（token数量、工具调用、图像等）
- **位置**: `src/routing/RequestAnalyzer.ts`
- **主要方法**:
  - `analyzeRequest(request, context)` - 分析请求并返回分析结果
  - `validateCapabilities(analysisResult, capabilities)` - 验证能力匹配
  - `calculateMatchScore(analysisResult, capabilities)` - 计算匹配分数

### 2. RoutingRulesEngine（路由规则引擎）
- **功能**: 基于pipeline pools的路由能力进行路由决策
- **位置**: `src/routing/RoutingRulesEngine.ts`
- **主要方法**:
  - `makeRoutingDecision(analysis, context, strategy)` - 进行路由决策
  - `registerPipelinePool(poolId, capabilities)` - 注册流水线池能力
  - `addRule(rule)` - 添加路由规则
  - `addStrategy(strategy)` - 添加路由策略

### 3. VirtualModelSchedulerManager（虚拟模型调度管理器）
- **功能**: 管理所有流水线池并提供内部API端点
- **位置**: `src/framework/VirtualModelSchedulerManager.ts`
- **主要方法**:
  - `initialize(pipelinePools)` - 初始化调度器
  - `handleRequest(request, context)` - 处理路由请求
  - `execute(virtualModelId, request, operation, options)` - 执行请求

### 4. RoutingCapabilities（路由能力描述）
- **功能**: 描述流水线池的路由能力
- **位置**: `src/routing/RoutingCapabilities.ts`
- **包含信息**: 支持的模型、最大token、流式支持、工具支持等

## 快速开始

### 1. 初始化路由系统

```typescript
import {
  VirtualModelSchedulerManager,
  ManagerConfig
} from './framework/VirtualModelSchedulerManager';

import {
  PipelineAssembler,
  AssemblerConfig
} from './framework/PipelineAssembler';

import { PipelineTracker } from './framework/PipelineTracker';

// 初始化组件
const pipelineTracker = new PipelineTracker();

// 配置支持路由的调度器
const schedulerConfig: ManagerConfig = {
  maxSchedulers: 10,
  enableAutoScaling: true,
  // 启用路由功能
  enableRouting: true,
  requestAnalyzerConfig: {
    enableDetailedTokenCounting: true,
    enableContentAnalysis: true
  },
  routingEngineConfig: {
    defaultMatchThreshold: 0.6,
    enableFallback: true,
    enableLoadBalancing: true
  },
  routingStrategy: 'balanced'
};

const scheduler = new VirtualModelSchedulerManager(
  schedulerConfig,
  pipelineTracker
);

// 配置流水线组装器
const assemblerConfig: AssemblerConfig = {
  enableAutoDiscovery: true,
  fallbackStrategy: 'first-available'
};

const assembler = new PipelineAssembler(
  assemblerConfig,
  pipelineTracker
);

// 连接组装器和调度器
assembler.setVirtualModelScheduler(scheduler);
```

### 2. 组装流水线池

```typescript
// 定义虚拟模型配置
const virtualModelConfigs = [
  {
    id: 'gpt-4-model',
    name: 'GPT-4 Model',
    modelId: 'gpt-4',
    enabled: true,
    capabilities: ['chat', 'tools', 'vision'],
    targets: [
      {
        providerId: 'openai',
        modelId: 'gpt-4',
        weight: 1,
        enabled: true
      }
    ]
  }
];

// 组装流水线池
const result = await assembler.assemblePipelines(virtualModelConfigs);
if (result.success) {
  console.log('Pipelines assembled successfully');
}
```

### 3. 使用路由系统

```typescript
import { RoutingContext } from './routing/RoutingCapabilities';

// 创建请求
const request = {
  messages: [
    { role: 'user', content: 'Hello, how are you?' }
  ],
  model: 'auto'
};

// 创建路由上下文
const context: RoutingContext = {
  requestId: 'req-001',
  userId: 'user-123',
  sessionId: 'session-456',
  timestamp: Date.now(),
  metadata: {
    priority: 'medium'
  }
};

// 使用路由系统处理请求
try {
  const response = await scheduler.handleRequest(request, context);
  console.log('Response:', response);
} catch (error) {
  console.error('Request failed:', error);
}
```

## 高级配置

### 自定义路由规则

```typescript
// 添加自定义路由规则
const customRule = {
  name: 'vision_request_rule',
  description: '图像请求路由到支持视觉的模型',
  enabled: true,
  priority: 90,
  conditions: [
    { field: 'hasImages', operator: 'equals', value: true }
  ],
  actions: [
    { type: 'select_virtual_model', target: 'vision-capable', parameters: {} }
  ],
  weight: 1.0
};

// 添加到路由引擎（需要通过scheduler访问）
if (scheduler['routingEngine']) {
  scheduler['routingEngine'].addRule(customRule);
}
```

### 自定义路由策略

```typescript
// 添加自定义路由策略
const customStrategy = {
  name: 'cost_optimized',
  description: '成本优化策略',
  isDefault: false,
  enabled: true,
  matchingAlgorithm: 'weighted',
  weights: {
    capabilityScore: 0.3,
    performanceScore: 0.1,
    costScore: 0.5,  // 成本权重最高
    availabilityScore: 0.08,
    priorityScore: 0.02
  },
  thresholds: {
    minimumMatchScore: 0.5,
    highAvailabilityThreshold: 0.8,
    loadBalanceThreshold: 0.7
  },
  loadBalancing: {
    enabled: true,
    strategy: 'weighted'
  }
};

// 添加到路由引擎
if (scheduler['routingEngine']) {
  scheduler['routingEngine'].addStrategy(customStrategy);
}
```

### 监控和统计

```typescript
// 获取路由统计信息
if (scheduler['routingEngine']) {
  const routingStats = scheduler['routingEngine'].getStatistics();
  console.log('Total decisions:', routingStats.totalDecisions);
  console.log('Average decision time:', routingStats.averageDecisionTime);
  console.log('Success rate:', routingStats.successfulDecisions / routingStats.totalDecisions);
}

// 获取请求分析统计
if (scheduler['requestAnalyzer']) {
  const analyzerStats = scheduler['requestAnalyzer'].getStatistics();
  console.log('Average tokens:', analyzerStats.averageTokenCount);
  console.log('Request types:', analyzerStats.requestTypeDistribution);
}
```

## 路由能力配置

每个流水线池都可以配置路由能力，系统会根据这些能力进行路由决策：

```typescript
const routingCapabilities: RoutingCapabilities = {
  supportedModels: ['gpt-4', 'gpt-3.5-turbo'],
  maxTokens: 8192,
  supportsStreaming: true,
  supportsTools: true,
  supportsImages: true,
  supportsFunctionCalling: true,
  supportsMultimodal: true,
  supportedModalities: ['text', 'vision'],
  priority: 80,
  availability: 0.95,
  loadWeight: 1.0,
  costScore: 0.8,
  performanceScore: 0.9,
  routingTags: ['gpt-4', 'high-performance', 'vision-capable'],
  extendedCapabilities: {
    supportsVision: true,
    supportsAudio: false,
    supportsCodeExecution: true,
    supportsWebSearch: true,
    maxContextLength: 8192,
    temperatureRange: [0, 1],
    topPRange: [0, 1]
  }
};
```

## 错误处理和回退

路由系统包含完整的错误处理和回退机制：

```typescript
try {
  const response = await scheduler.handleRequest(request, context);
} catch (error) {
  if (error.message.includes('No suitable candidates found')) {
    // 处理无合适候选的情况
    console.log('No suitable model found, using fallback');
  } else if (error.message.includes('Routing decision failed')) {
    // 处理路由决策失败
    console.log('Routing failed, retrying with different strategy');
  }
  // 其他错误处理
}
```

## 性能优化

### 1. 缓存配置
- 启用请求分析缓存
- 配置路由规则缓存时间
- 优化流水线池能力注册

### 2. 负载均衡
- 配置合适的负载均衡策略
- 设置权重和优先级
- 监控负载分布

### 3. 资源管理
- 定期清理过期缓存
- 监控内存使用
- 优化并发处理

## 最佳实践

1. **能力描述准确**: 确保流水线池的路由能力描述准确反映实际能力
2. **合理设置阈值**: 根据业务需求设置合适的匹配阈值
3. **监控关键指标**: 定期检查路由决策时间、成功率等关键指标
4. **渐进式优化**: 从简单配置开始，逐步优化路由规则和策略
5. **测试验证**: 在生产环境使用前充分测试路由逻辑

## 故障排除

### 常见问题

1. **路由决策失败**
   - 检查流水线池是否正确注册
   - 验证路由能力配置是否正确
   - 确认路由规则是否合理

2. **性能问题**
   - 检查缓存配置
   - 优化负载均衡策略
   - 监控资源使用情况

3. **匹配分数过低**
   - 调整能力权重配置
   - 检查请求分析准确性
   - 优化匹配算法

### 调试工具

使用示例代码中的调试功能：

```typescript
// 运行完整演示
import { runRoutingExample } from './routing/RoutingExample';
runRoutingExample();
```

## 扩展和定制

路由系统设计为可扩展的，可以通过以下方式定制：

1. **自定义分析器**: 继承RequestAnalyzer实现特定需求
2. **自定义规则引擎**: 扩展RoutingRulesEngine添加新功能
3. **自定义策略**: 实现特定的路由策略
4. **插件系统**: 通过接口添加外部插件

---

*文档版本: 1.0.0*
*最后更新: 2025-01-20*