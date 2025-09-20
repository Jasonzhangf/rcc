# RCC Pipeline Module

[![npm version](https://badge.fury.io/js/rcc-pipeline.svg)](https://badge.fury.io/js/rcc-pipeline)
[![Build Status](https://github.com/rcc/rcc-pipeline/actions/workflows/build.yml/badge.svg)](https://github.com/rcc/rcc-pipeline/actions/workflows/build.yml)
[![Coverage Status](https://coveralls.io/github/rcc/rcc-pipeline/badge.svg)](https://coveralls.io/github/rcc/rcc-pipeline)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 概述

RCC Pipeline Module是一个模块化的AI模型请求处理系统，实现了一个标准化的执行流水线架构。该系统通过llmswitch → workflow → compatibility → provider的执行流程，为AI模型请求提供统一的处理框架，支持多种AI提供商的无缝集成和协议转换。

## 核心架构

### 模块化执行流水线

系统采用模块化设计，每个模块都实现标准接口，确保组件间的互操作性和可替换性：

```
┌─────────────────────────────────────────────────────────────────┐
│                    Pipeline Request Flow                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Request → llmswitch → workflow → compatibility → provider → Response  │
│       │            │            │               │                 │
│       │            │            │               │                 │
│       ▼            ▼            ▼               ▼                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────┐   │
│  │ LLM      │   │ Workflow │   │ Compat   │   │ Provider     │   │
│  │ Switch   │   │ Module   │   │ Module   │   │ Module       │   │
│  └──────────┘   └──────────┘   └──────────┘   └──────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 模块类型和职责

#### 1. LLM Switch Module (llmswitch)
- **职责**: 根据请求特征和配置规则选择合适的模型或提供商
- **接口**: `ILLMSwitch`
- **关键功能**:
  - 请求分析和路由决策
  - 基于配置表的字段转换
  - 负载均衡和故障转移
  - 模型能力匹配

#### 2. Workflow Module (workflow)
- **职责**: 管理请求的工作流程，处理多步骤任务和依赖关系
- **接口**: `IWorkflowModule`
- **关键功能**:
  - 工作流定义和执行
  - 任务依赖管理
  - 状态管理和持久化
  - 并发控制和同步

#### 3. Compatibility Module (compatibility)
- **职责**: 处理不同提供商协议之间的兼容性转换
- **接口**: `ICompatibilityModule`
- **关键功能**:
  - 请求格式转换
  - 响应格式标准化
  - 协议适配和映射
  - 字段映射和转换

#### 4. Provider Module (provider)
- **职责**: 实现具体的AI模型提供商接口调用
- **接口**: `IProviderModule`
- **关键功能**:
  - HTTP请求处理
  - 认证和授权
  - 错误处理和重试
  - 流式响应处理

### 标准接口定义

所有模块必须实现以下标准接口：

```typescript
// 基础模块接口
interface IPipelineModule {
  // 模块初始化
  initialize(config: ModuleConfig): Promise<InitializationResult>;

  // 模块销毁
  destroy(): Promise<void>;

  // 健康检查
  healthCheck(): Promise<HealthCheckResult>;

  // 获取模块信息
  getModuleInfo(): ModuleInfo;

  // 协议握手
  handshake(handshakeRequest: HandshakeRequest): Promise<HandshakeResponse>;
}

// 可执行模块接口
interface IExecutableModule extends IPipelineModule {
  // 执行请求
  execute(request: PipelineRequest): Promise<PipelineResponse>;

  // 执行流式请求
  executeStreaming(request: PipelineRequest): AsyncGenerator<PipelineResponse>;

  // 验证请求
  validateRequest(request: PipelineRequest): Promise<ValidationResult>;
}
```

## 主要特性

### 🚀 核心功能
- **模块化架构**: 标准化的模块接口和协议
- **配置表驱动**: 基于配置表的字段转换和映射
- **无异常设计**: 所有错误返回给调度器，不抛出异常
- **协议验证**: 每个模块执行前进行握手验证
- **IO记录跟踪**: 完整的输入输出记录和跟踪

### 🔧 高级特性
- **动态发现**: 自动发现和注册模块
- **健康检查**: 定期组件健康状态检查
- **性能监控**: 实时性能指标和系统健康监控
- **流式处理**: 支持实时流式AI响应
- **错误恢复**: 指数退避重试策略

### 🎯 模块集成
- **调度器集成**: 与系统调度器无缝集成
- **组装器支持**: 支持模块动态组装
- **调试中心**: 集成调试中心和日志系统
- **配置管理**: 支持运行时配置更新

## 系统架构详解

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              RCC Pipeline System                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                          System Scheduler                           │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                        Pipeline Assembler                          │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                      Module Scanner & Discovery                  │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                    Pipeline Execution Flow                         │  │
│  │                                                                         │  │
│  │  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────┐        │  │
│  │  │ LLM      │   │ Workflow │   │ Compat   │   │ Provider     │        │  │
│  │  │ Switch   │   │ Module   │   │ Module   │   │ Module       │        │  │
│  │  └──────────┘   └──────────┘   └──────────┘   └──────────────┘        │  │
│  │      │            │            │               │                     │  │
│  │      │            │            │               │                     │  │
│  │      ▼            ▼            ▼               ▼                     │  │
│  │  ┌─────────────────────────────────────────────────────┐              │  │
│  │  │               Pipeline Tracker                        │              │  │
│  │  │           (Request Tracking & IO Recording)             │              │  │
│  │  └─────────────────────────────────────────────────────┘              │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                        Debug Center                            │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 配置表系统

配置表是系统的核心，定义了模块间的字段转换和映射规则：

```typescript
// 配置表接口定义
interface ConfigurationTable {
  // 模块配置
  modules: ModuleConfig[];

  // 字段映射规则
  fieldMappings: FieldMapping[];

  // 协议转换规则
  protocolMappings: ProtocolMapping[];

  // 握手规则
  handshakeRules: HandshakeRule[];
}

// 字段映射示例
interface FieldMapping {
  sourceModule: string;    // 源模块类型
  targetModule: string;    // 目标模块类型
  sourceField: string;     // 源字段名
  targetField: string;     // 目标字段名
  transformRule?: string;   // 转换规则
  defaultValue?: any;       // 默认值
  required: boolean;        // 是否必需
}
```

### 协议握手机制

每个模块在执行前必须进行协议握手，确保模块间的兼容性：

```typescript
// 握手请求
interface HandshakeRequest {
  moduleId: string;
  moduleType: 'llmswitch' | 'workflow' | 'compatibility' | 'provider';
  version: string;
  capabilities: string[];
  supportedProtocols: string[];
  configuration: any;
}

// 握手响应
interface HandshakeResponse {
  success: boolean;
  compatible: boolean;
  errors?: string[];
  warnings?: string[];
  protocol: string;
  capabilities: string[];
}
```

### 错误处理规范

系统采用无异常设计，所有错误通过返回值传递：

```typescript
// 标准错误响应
interface PipelineError {
  code: string;
  message: string;
  details?: any;
  module?: string;
  stage?: string;
  timestamp: number;
  recoverable: boolean;
}

// 错误处理流程
async function executeWithPipeline(request: PipelineRequest): Promise<PipelineResponse> {
  // 不使用 try-catch，所有错误通过返回值处理
  const result = await pipelineModule.execute(request);

  if (result.status === 'error') {
    // 返回错误给调度器
    return {
      status: 'error',
      error: result.error,
      requestId: request.requestId
    };
  }

  return result;
}
```

## 安装

```bash
npm install rcc-pipeline
```

## 依赖要求

此模块需要以下RCC模块：

```bash
npm install rcc-basemodule rcc-errorhandling rcc-config-parser rcc-virtual-model-rules
```

## 模块实现指南

### 1. 创建LLM Switch模块

```typescript
import { IExecutableModule, PipelineRequest, PipelineResponse } from 'rcc-pipeline';

class LLMSwitchModule implements IExecutableModule {
  private config: ModuleConfig;
  private fieldMappings: FieldMapping[];

  constructor(config: ModuleConfig) {
    this.config = config;
    this.fieldMappings = this.loadFieldMappings();
  }

  async initialize(config: ModuleConfig): Promise<InitializationResult> {
    // 加载配置表和映射规则
    this.fieldMappings = this.loadFieldMappings();
    return { success: true };
  }

  async execute(request: PipelineRequest): Promise<PipelineResponse> {
    // 应用字段映射
    const mappedRequest = this.applyFieldMappings(request);

    // 执行路由逻辑
    const targetModule = this.selectTargetModule(mappedRequest);

    // 转发到下一个模块
    const result = await this.forwardToModule(targetModule, mappedRequest);

    return result;
  }

  private applyFieldMappings(request: PipelineRequest): PipelineRequest {
    // 基于配置表进行字段转换
    const mapped = { ...request };

    for (const mapping of this.fieldMappings) {
      if (mapping.sourceModule === 'llmswitch' && mapping.sourceField in mapped) {
        mapped[mapping.targetField] = this.transformField(
          mapped[mapping.sourceField],
          mapping.transformRule
        );
      }
    }

    return mapped;
  }

  private selectTargetModule(request: PipelineRequest): string {
    // 基于请求特征选择目标模块
    if (request.model?.includes('qwen')) {
      return 'qwen-provider';
    }
    return 'default-provider';
  }
}
```

### 2. 创建Workflow模块

```typescript
class WorkflowModule implements IExecutableModule {
  private workflows: Map<string, WorkflowDefinition> = new Map();

  async execute(request: PipelineRequest): Promise<PipelineResponse> {
    // 确定工作流类型
    const workflowType = this.determineWorkflowType(request);
    const workflow = this.workflows.get(workflowType);

    if (!workflow) {
      return {
        status: 'error',
        error: {
          code: 'WORKFLOW_NOT_FOUND',
          message: `Workflow ${workflowType} not found`
        }
      };
    }

    // 执行工作流
    const context = this.createWorkflowContext(request);
    const result = await this.executeWorkflow(workflow, context);

    return result;
  }

  private async executeWorkflow(
    workflow: WorkflowDefinition,
    context: WorkflowContext
  ): Promise<PipelineResponse> {
    const results: any[] = [];

    for (const step of workflow.steps) {
      const stepResult = await this.executeStep(step, context);

      if (stepResult.status === 'error') {
        // 返回错误，不抛出异常
        return stepResult;
      }

      results.push(stepResult);

      // 更新上下文
      context.stepResults[step.id] = stepResult;

      // 检查是否需要继续
      if (stepResult.shouldStop) {
        break;
      }
    }

    return {
      status: 'success',
      data: results,
      workflowId: workflow.id
    };
  }
}
```

### 3. 创建Compatibility模块

```typescript
class CompatibilityModule implements IExecutableModule {
  private protocolMappings: ProtocolMapping[] = [];

  async execute(request: PipelineRequest): Promise<PipelineResponse> {
    // 获取目标提供商
    const provider = request.metadata?.targetProvider;

    if (!provider) {
      return {
        status: 'error',
        error: {
          code: 'MISSING_PROVIDER',
          message: 'Target provider not specified'
        }
      };
    }

    // 应用协议映射
    const mappedRequest = this.applyProtocolMapping(request, provider);

    // 转发到Provider模块
    const providerResult = await this.forwardToProvider(provider, mappedRequest);

    // 转换响应格式
    const standardResponse = this.standardizeResponse(providerResult, provider);

    return standardResponse;
  }

  private applyProtocolMapping(
    request: PipelineRequest,
    provider: string
  ): PipelineRequest {
    const mapping = this.protocolMappings.find(
      m => m.sourceProtocol === 'standard' && m.targetProtocol === provider
    );

    if (!mapping) {
      return request; // 无需映射
    }

    const mapped = { ...request };

    // 应用字段映射
    for (const fieldMap of mapping.fieldMappings) {
      mapped[fieldMap.targetField] = this.transformField(
        request[fieldMap.sourceField],
        fieldMap.transform
      );
    }

    return mapped;
  }
}
```

### 4. 创建Provider模块

```typescript
class ProviderModule implements IExecutableModule {
  private httpClient: any;
  private authManager: any;

  async execute(request: PipelineRequest): Promise<PipelineResponse> {
    // 验证认证状态
    const authResult = await this.authenticate();
    if (authResult.status === 'error') {
      return authResult;
    }

    // 转换为提供商格式
    const providerRequest = this.convertToProviderFormat(request);

    // 执行HTTP请求
    const httpResponse = await this.makeHttpRequest(providerRequest);

    if (httpResponse.status >= 400) {
      return {
        status: 'error',
        error: {
          code: 'PROVIDER_ERROR',
          message: `Provider returned ${httpResponse.status}`,
          details: httpResponse.data
        }
      };
    }

    // 转换为标准响应格式
    const standardResponse = this.convertToStandardFormat(httpResponse.data);

    return {
      status: 'success',
      data: standardResponse,
      provider: this.config.name
    };
  }

  private async makeHttpRequest(request: any): Promise<any> {
    try {
      const response = await this.httpClient.post(
        this.config.endpoint,
        request.data,
        {
          headers: {
            'Authorization': `Bearer ${this.authManager.getToken()}`,
            'Content-Type': 'application/json'
          },
          timeout: this.config.timeout || 30000
        }
      );

      return response;
    } catch (error: any) {
      // 返回错误，不抛出异常
      return {
        status: 'error',
        error: {
          code: 'NETWORK_ERROR',
          message: error.message
        }
      };
    }
  }
}
```

### 5. 模块组装示例

```typescript
import { PipelineAssembler, PipelineTracker } from 'rcc-pipeline';

// 创建跟踪器
const tracker = new PipelineTracker();

// 创建组装器
const assembler = new PipelineAssembler({
  enableAutoDiscovery: true,
  fallbackStrategy: 'first-available'
}, tracker);

// 定义虚拟模型配置
const virtualModelConfig = {
  id: 'universal-ai-model',
  name: 'Universal AI Model',
  modelId: 'gpt-3.5-turbo',
  provider: 'universal',
  enabled: true,
  targets: [
    {
      providerId: 'qwen',
      modelId: 'qwen-turbo',
      weight: 1,
      enabled: true
    },
    {
      providerId: 'iflow',
      modelId: 'iflow-chat',
      weight: 1,
      enabled: true
    }
  ]
};

// 组装流水线
const assemblyResult = await assembler.assemblePipelines([virtualModelConfig]);

if (assemblyResult.success) {
  console.log('Pipeline assembly completed successfully');
  // 获取流水线池
  const pipelinePool = assembler.getPipelinePool('universal-ai-model');

  // 执行请求
  const request = {
    messages: [{ role: 'user', content: 'Hello!' }],
    model: 'gpt-3.5-turbo'
  };

  const response = await pipelinePool.activePipeline?.execute(request);
  console.log('Response:', response);
} else {
  console.error('Pipeline assembly failed:', assemblyResult.errors);
}
```

### 配置表格式规范

配置表是模块间数据交换的核心，必须遵循以下格式：

```json
{
  "version": "1.0.0",
  "metadata": {
    "description": "Pipeline Configuration Table",
    "lastUpdated": "2025-09-19T00:00:00Z"
  },
  "modules": [
    {
      "id": "llmswitch-module",
      "type": "llmswitch",
      "name": "LLM Switch Module",
      "version": "1.0.0",
      "enabled": true,
      "config": {
        "routingStrategy": "model-based",
        "defaultProvider": "qwen"
      }
    },
    {
      "id": "workflow-module",
      "type": "workflow",
      "name": "Workflow Module",
      "version": "1.0.0",
      "enabled": true,
      "config": {
        "maxSteps": 10,
        "timeout": 30000
      }
    },
    {
      "id": "compatibility-module",
      "type": "compatibility",
      "name": "Compatibility Module",
      "version": "1.0.0",
      "enabled": true,
      "config": {
        "targetProtocols": ["qwen", "iflow", "openai"]
      }
    },
    {
      "id": "qwen-provider",
      "type": "provider",
      "name": "Qwen Provider",
      "version": "1.0.0",
      "enabled": true,
      "config": {
        "endpoint": "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
        "models": ["qwen-turbo", "qwen-plus", "qwen-max"]
      }
    }
  ],
  "fieldMappings": [
    {
      "id": "model-mapping",
      "sourceModule": "llmswitch",
      "targetModule": "workflow",
      "sourceField": "model",
      "targetField": "targetModel",
      "transformRule": "mapModelToTarget",
      "required": true
    },
    {
      "id": "temperature-mapping",
      "sourceModule": "workflow",
      "targetModule": "compatibility",
      "sourceField": "temperature",
      "targetField": "temperature",
      "transformRule": "normalizeTemperature",
      "required": false,
      "defaultValue": 0.7
    },
    {
      "id": "messages-mapping",
      "sourceModule": "compatibility",
      "targetModule": "qwen-provider",
      "sourceField": "messages",
      "targetField": "input",
      "transformRule": "formatMessagesForQwen",
      "required": true
    }
  ],
  "protocolMappings": [
    {
      "id": "qwen-mapping",
      "sourceProtocol": "standard",
      "targetProtocol": "qwen",
      "endpoint": "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
      "authentication": {
        "type": "oauth2",
        "flow": "device-code"
      },
      "fieldMappings": [
        {
          "sourceField": "messages",
          "targetField": "input.text",
          "transform": "extractTextFromMessages"
        },
        {
          "sourceField": "model",
          "targetField": "model",
          "transform": "mapStandardModelToQwen"
        },
        {
          "sourceField": "temperature",
          "targetField": "parameters.temperature",
          "transform": "scaleTemperature"
        }
      ]
    }
  ],
  "handshakeRules": [
    {
      "sourceModule": "llmswitch",
      "targetModule": "workflow",
      "requiredCapabilities": ["request-routing", "field-mapping"],
      "versionCompatibility": ">=1.0.0"
    },
    {
      "sourceModule": "workflow",
      "targetModule": "compatibility",
      "requiredCapabilities": ["workflow-execution", "state-management"],
      "versionCompatibility": ">=1.0.0"
    },
    {
      "sourceModule": "compatibility",
      "targetModule": "provider",
      "requiredCapabilities": ["protocol-conversion", "field-mapping"],
      "versionCompatibility": ">=1.0.0"
    }
  ]
}
```

### 完整的错误处理规范

#### 错误分类和编码

```typescript
// 错误代码标准
enum ErrorCategory {
  INITIALIZATION_ERROR = 'INIT_ERROR',
  CONFIGURATION_ERROR = 'CONFIG_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTH_ERROR',
  AUTHORIZATION_ERROR = 'AUTHZ_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RESOURCE_ERROR = 'RESOURCE_ERROR',
  WORKFLOW_ERROR = 'WORKFLOW_ERROR',
  COMPATIBILITY_ERROR = 'COMPATIBILITY_ERROR',
  HANDSHAKE_ERROR = 'HANDSHAKE_ERROR'
}

// 标准错误响应
interface StandardErrorResponse {
  status: 'error';
  error: {
    code: ErrorCategory;
    message: string;
    details?: any;
    module: string;
    stage: string;
    timestamp: number;
    requestId: string;
    traceId: string;
    recoverable: boolean;
    retryAfter?: number; // 重试延迟（秒）
    suggestions?: string[]; // 建议的解决方案
  };
}
```

#### 错误处理最佳实践

```typescript
class ErrorHandlingModule {
  async handleModuleError(
    error: any,
    moduleType: string,
    stage: string,
    requestId: string
  ): Promise<StandardErrorResponse> {
    const timestamp = Date.now();
    const traceId = this.generateTraceId();

    // 记录错误日志
    await this.logError(error, {
      moduleType,
      stage,
      requestId,
      timestamp,
      traceId
    });

    // 分析错误类型
    const errorInfo = this.analyzeError(error);

    // 确定是否可恢复
    const recoverable = this.isRecoverableError(errorInfo);

    // 生成错误响应
    const errorResponse: StandardErrorResponse = {
      status: 'error',
      error: {
        code: errorInfo.category,
        message: errorInfo.message,
        details: errorInfo.details,
        module: moduleType,
        stage,
        timestamp,
        requestId,
        traceId,
        recoverable,
        retryAfter: this.calculateRetryDelay(errorInfo),
        suggestions: this.generateSuggestions(errorInfo)
      }
    };

    // 通知错误处理中心
    await this.notifyErrorCenter(errorResponse);

    return errorResponse;
  }

  private analyzeError(error: any): ErrorInfo {
    if (error.response) {
      // HTTP错误
      return {
        category: ErrorCategory.PROVIDER_ERROR,
        message: `Provider error: ${error.response.status}`,
        details: {
          status: error.response.status,
          data: error.response.data
        }
      };
    } else if (error.code === 'ECONNREFUSED') {
      // 网络错误
      return {
        category: ErrorCategory.NETWORK_ERROR,
        message: 'Connection refused',
        details: {
          code: error.code,
          address: error.address,
          port: error.port
        }
      };
    } else if (error.code === 'ETIMEDOUT') {
      // 超时错误
      return {
        category: ErrorCategory.TIMEOUT_ERROR,
        message: 'Request timeout',
        details: {
          code: error.code,
          timeout: error.timeout
        }
      };
    } else {
      // 其他错误
      return {
        category: ErrorCategory.UNKNOWN_ERROR,
        message: error.message || 'Unknown error',
        details: error
      };
    }
  }
}
```

### 系统集成要求

#### 与调度器集成

```typescript
// 调度器接口
interface IScheduler {
  scheduleTask(task: PipelineTask): Promise<ScheduleResult>;
  cancelTask(taskId: string): Promise<boolean>;
  getTaskStatus(taskId: string): Promise<TaskStatus>;
  getSchedulerMetrics(): Promise<SchedulerMetrics>;
}

// 集成实现
class PipelineSchedulerIntegration implements IScheduler {
  private pipelineAssembler: PipelineAssembler;
  private tracker: PipelineTracker;

  async scheduleTask(task: PipelineTask): Promise<ScheduleResult> {
    // 创建请求上下文
    const context = await this.tracker.createRequestContext(
      task.virtualModelId,
      task.operation,
      { ...task.metadata, taskId: task.id }
    );

    // 获取流水线池
    const pipelinePool = this.pipelineAssembler.getPipelinePool(task.virtualModelId);

    if (!pipelinePool) {
      return {
        success: false,
        error: {
          code: 'PIPELINE_POOL_NOT_FOUND',
          message: `Pipeline pool for ${task.virtualModelId} not found`
        }
      };
    }

    // 执行流水线
    const result = await pipelinePool.activePipeline?.execute(task.request);

    // 记录执行结果
    this.tracker.completeStage(task.id, 'pipeline-execution', {
      result,
      pipelineId: pipelinePool.activePipeline?.id,
      executionTime: Date.now() - context.startTime
    });

    return {
      success: result?.status === 'success',
      result,
      taskId: task.id
    };
  }
}
```

#### 与调试中心集成

```typescript
// 调试中心接口
interface IDebugCenter {
  startOperation(moduleId: string, operationId: string, inputData: any, operationType: string): Promise<void>;
  endOperation(moduleId: string, operationId: string, outputData: any, success: boolean, error?: any): Promise<void>;
  logEvent(level: 'info' | 'warn' | 'error', message: string, data?: any): Promise<void>;
  getOperationLogs(operationId: string): Promise<DebugLog[]>;
}

// 集成实现
class PipelineDebugIntegration implements IDebugCenter {
  private debugLogs: Map<string, DebugLog[]> = new Map();

  async startOperation(moduleId: string, operationId: string, inputData: any, operationType: string): Promise<void> {
    const log: DebugLog = {
      id: this.generateLogId(),
      operationId,
      moduleId,
      operationType,
      timestamp: Date.now(),
      type: 'start',
      data: inputData
    };

    this.addLog(operationId, log);
  }

  async endOperation(moduleId: string, operationId: string, outputData: any, success: boolean, error?: any): Promise<void> {
    const log: DebugLog = {
      id: this.generateLogId(),
      operationId,
      moduleId,
      timestamp: Date.now(),
      type: 'end',
      success,
      data: outputData,
      error
    };

    this.addLog(operationId, log);
  }

  async logEvent(level: 'info' | 'warn' | 'error', message: string, data?: any): Promise<void> {
    const log: DebugLog = {
      id: this.generateLogId(),
      timestamp: Date.now(),
      type: 'event',
      level,
      message,
      data
    };

    this.addLog('global', log);
  }

  private addLog(operationId: string, log: DebugLog): void {
    if (!this.debugLogs.has(operationId)) {
      this.debugLogs.set(operationId, []);
    }
    this.debugLogs.get(operationId)!.push(log);
  }
}
```

### 性能监控和指标

#### 关键性能指标

```typescript
interface PipelineMetrics {
  // 请求指标
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;

  // 模块指标
  moduleMetrics: Map<string, ModuleMetrics>;

  // 系统指标
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  queueLength: number;

  // 错误指标
  errorRate: number;
  errorByCategory: Map<ErrorCategory, number>;

  // 时间戳
  lastUpdated: number;
}

interface ModuleMetrics {
  moduleId: string;
  executionCount: number;
  averageExecutionTime: number;
  successRate: number;
  errorCount: number;
  lastExecutionTime: number;
}
```

## 部署和配置

### 环境配置

```bash
# 环境变量配置
export RCC_PIPELINE_CONFIG_PATH=/path/to/config/pipeline-config.json
export RCC_PIPELINE_LOG_LEVEL=info
export RCC_PIPELINE_DEBUG_ENABLED=true
export RCC_PIPELINE_METRICS_ENABLED=true
export RCC_PIPELINE_HEALTH_CHECK_INTERVAL=30000
```

### 配置文件示例

```json
{
  "pipeline": {
    "version": "1.0.0",
    "name": "RCC Pipeline System",
    "description": "Modular AI model request processing system",
    "enabled": true
  },
  "modules": {
    "autoDiscovery": {
      "enabled": true,
      "scanInterval": 60000,
      "modulePaths": [
        "./modules/llmswitch",
        "./modules/workflow",
        "./modules/compatibility",
        "./modules/providers"
      ]
    },
    "defaults": {
      "timeout": 30000,
      "maxRetries": 3,
      "healthCheckInterval": 30000
    }
  },
  "scheduler": {
    "maxConcurrentRequests": 100,
    "queueSize": 1000,
    "loadBalancingStrategy": "weighted",
    "circuitBreaker": {
      "enabled": true,
      "failureThreshold": 5,
      "recoveryTimeout": 60000
    }
  },
  "tracking": {
    "enabled": true,
    "maxTrackedRequests": 10000,
    "cleanupInterval": 3600000,
    "logLevel": "info"
  },
  "debug": {
    "enabled": true,
    "twoPhaseDebug": true,
    "ioTracking": true,
    "logDirectory": "./debug-logs",
    "maxLogFiles": 100,
    "maxLogFileSize": "50MB"
  },
  "performance": {
    "metricsEnabled": true,
    "metricsInterval": 5000,
    "profilingEnabled": false
  }
}
```

### 部署架构图

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            Production Deployment                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                      Load Balancer                              │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                    Pipeline Cluster                             │  │
│  │                                                                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │  │
│  │  │ Pipeline    │  │ Pipeline    │  │ Pipeline    │  │ Pipeline    │    │  │
│  │  │ Instance 1  │  │ Instance 2  │  │ Instance 3  │  │ Instance 4  │    │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                    Shared Services                              │  │
│  │                                                                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │  │
│  │  │ Config      │  │ Debug       │  │ Metrics     │  │ Health      │    │  │
│  │  │ Service     │  │ Center      │  │ Service     │  │ Check       │    │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                    Data Storage                               │  │
│  │                                                                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │  │
│  │  │ Redis       │  │ PostgreSQL  │  │ Object      │  │ Time Series │    │  │
│  │  │ Cache       │  │ Database    │  │ Storage     │  │ Database    │    │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 测试和验证

### 单元测试

```typescript
// 模块测试示例
describe('LLMSwitchModule', () => {
  let module: LLMSwitchModule;
  let mockConfig: ModuleConfig;

  beforeEach(() => {
    mockConfig = {
      id: 'test-llmswitch',
      type: 'llmswitch',
      name: 'Test LLM Switch',
      version: '1.0.0',
      enabled: true,
      config: {
        routingStrategy: 'model-based'
      }
    };
    module = new LLMSwitchModule(mockConfig);
  });

  test('should initialize successfully', async () => {
    const result = await module.initialize(mockConfig);
    expect(result.success).toBe(true);
  });

  test('should apply field mappings correctly', async () => {
    const request: PipelineRequest = {
      requestId: 'test-123',
      model: 'qwen-turbo',
      messages: [{ role: 'user', content: 'Hello' }],
      metadata: {}
    };

    const result = await module.execute(request);
    expect(result.status).toBe('success');
    expect(result.data.targetModel).toBeDefined();
  });

  test('should handle errors gracefully', async () => {
    const invalidRequest: PipelineRequest = {
      requestId: 'test-456',
      model: '',
      messages: [],
      metadata: {}
    };

    const result = await module.execute(invalidRequest);
    expect(result.status).toBe('error');
    expect(result.error.code).toBe('VALIDATION_ERROR');
  });
});
```

### 集成测试

```typescript
// 集成测试示例
describe('Pipeline Integration', () => {
  let assembler: PipelineAssembler;
  let tracker: PipelineTracker;

  beforeEach(async () => {
    tracker = new PipelineTracker();
    assembler = new PipelineAssembler({
      enableAutoDiscovery: true
    }, tracker);

    // 注册测试模块
    await assembler.registerModule(new TestLLMSwitchModule());
    await assembler.registerModule(new TestWorkflowModule());
    await assembler.registerModule(new TestCompatibilityModule());
    await assembler.registerModule(new TestProviderModule());
  });

  test('should assemble pipeline successfully', async () => {
    const config: VirtualModelConfig = {
      id: 'test-model',
      name: 'Test Model',
      modelId: 'test-model-1',
      provider: 'test',
      enabled: true,
      targets: [
        {
          providerId: 'test-provider',
          modelId: 'test-model',
          weight: 1,
          enabled: true
        }
      ]
    };

    const result = await assembler.assemblePipelines([config]);
    expect(result.success).toBe(true);
    expect(result.pipelinePools.size).toBe(1);
  });

  test('should execute complete pipeline flow', async () => {
    const request: PipelineRequest = {
      requestId: 'integration-test-123',
      model: 'test-model',
      messages: [{ role: 'user', content: 'Hello, integration test!' }],
      metadata: {}
    };

    const result = await assembler.executeRequest('test-model', request);
    expect(result.status).toBe('success');
    expect(result.data).toBeDefined();
  });
});
```

### 性能测试

```typescript
// 性能测试示例
describe('Pipeline Performance', () => {
  let assembler: PipelineAssembler;
  let tracker: PipelineTracker;

  beforeAll(async () => {
    tracker = new PipelineTracker();
    assembler = new PipelineAssembler({
      enableAutoDiscovery: true
    }, tracker);

    // 设置性能测试配置
    await assembler.setupPerformanceTest();
  });

  test('should handle 1000 concurrent requests', async () => {
    const requests = Array.from({ length: 1000 }, (_, i) => ({
      requestId: `perf-test-${i}`,
      model: 'test-model',
      messages: [{ role: 'user', content: `Test message ${i}` }],
      metadata: {}
    }));

    const startTime = Date.now();
    const results = await Promise.all(
      requests.map(req => assembler.executeRequest('test-model', req))
    );
    const endTime = Date.now();

    const successCount = results.filter(r => r.status === 'success').length;
    const averageResponseTime = (endTime - startTime) / results.length;

    expect(successCount).toBeGreaterThan(950); // 95% success rate
    expect(averageResponseTime).toBeLessThan(100); // < 100ms average
  });

  test('should maintain performance under load', async () => {
    const metrics = await assembler.getMetrics();

    expect(metrics.averageResponseTime).toBeLessThan(50);
    expect(metrics.errorRate).toBeLessThan(0.05); // < 5% error rate
    expect(metrics.memoryUsage).toBeLessThan(512 * 1024 * 1024); // < 512MB
  });
});
```

### 负载测试

```bash
# 负载测试脚本
#!/bin/bash

echo "Starting Pipeline Load Test..."

# 配置测试参数
CONCURRENT_USERS=100
REQUESTS_PER_USER=10
TOTAL_REQUESTS=$((CONCURRENT_USERS * REQUESTS_PER_USER))
TEST_DURATION=300 # 5分钟

echo "Concurrent Users: $CONCURRENT_USERS"
echo "Requests per User: $REQUESTS_PER_USER"
echo "Total Requests: $TOTAL_REQUESTS"
echo "Test Duration: ${TEST_DURATION}s"

# 启动监控
./start-monitoring.sh &

# 执行负载测试
 artillery run load-test-config.yml

# 生成报告
./generate-report.sh

echo "Load Test Completed!"
```

## 监控和运维

### 健康检查端点

```typescript
// 健康检查实现
class HealthChecker {
  private pipelineAssembler: PipelineAssembler;
  private tracker: PipelineTracker;

  async getHealthStatus(): Promise<HealthStatus> {
    const checks: HealthCheck[] = [];

    // 检查模块健康状态
    const modules = this.pipelineAssembler.getDiscoveredModules();
    for (const [moduleId, module] of modules) {
      try {
        const moduleHealth = await module.healthCheck();
        checks.push({
          component: moduleId,
          status: moduleHealth.status,
          timestamp: Date.now(),
          details: moduleHealth
        });
      } catch (error) {
        checks.push({
          component: moduleId,
          status: 'unhealthy',
          timestamp: Date.now(),
          error: error.message
        });
      }
    }

    // 检查流水线池状态
    const pools = this.pipelineAssembler.getPipelinePools();
    for (const [poolId, pool] of pools) {
      checks.push({
        component: `pipeline-pool-${poolId}`,
        status: pool.healthStatus,
        timestamp: Date.now(),
        details: {
          pipelines: pool.pipelines.size,
          activePipeline: pool.activePipeline?.id,
          metrics: pool.metrics
        }
      });
    }

    // 整体状态
    const overallStatus = checks.every(c => c.status === 'healthy') ? 'healthy' : 'degraded';

    return {
      status: overallStatus,
      timestamp: Date.now(),
      checks,
      uptime: process.uptime(),
      version: require('./package.json').version
    };
  }
}
```

### 指标收集和导出

```typescript
// 指标收集器
class MetricsCollector {
  private metrics: PipelineMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    p95ResponseTime: 0,
    p99ResponseTime: 0,
    moduleMetrics: new Map(),
    memoryUsage: 0,
    cpuUsage: 0,
    activeConnections: 0,
    queueLength: 0,
    errorRate: 0,
    errorByCategory: new Map(),
    lastUpdated: 0
  };

  collectRequestMetrics(requestId: string, response: PipelineResponse): void {
    this.metrics.totalRequests++;

    if (response.status === 'success') {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;

      // 按类别统计错误
      const errorCategory = response.error?.code || 'UNKNOWN_ERROR';
      const currentCount = this.metrics.errorByCategory.get(errorCategory) || 0;
      this.metrics.errorByCategory.set(errorCategory, currentCount + 1);
    }

    // 更新错误率
    this.metrics.errorRate = this.metrics.failedRequests / this.metrics.totalRequests;

    this.metrics.lastUpdated = Date.now();
  }

  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }

  exportPrometheusMetrics(): string {
    let metrics = '';

    // 请求计数
    metrics += `# HELP pipeline_requests_total Total number of requests\n`;
    metrics += `# TYPE pipeline_requests_total counter\n`;
    metrics += `pipeline_requests_total ${this.metrics.totalRequests}\n`;

    // 成功率
    metrics += `# HELP pipeline_success_rate Success rate of requests\n`;
    metrics += `# TYPE pipeline_success_rate gauge\n`;
    const successRate = this.metrics.totalRequests > 0
      ? this.metrics.successfulRequests / this.metrics.totalRequests
      : 0;
    metrics += `pipeline_success_rate ${successRate}\n`;

    // 平均响应时间
    metrics += `# HELP pipeline_average_response_time_ms Average response time in milliseconds\n`;
    metrics += `# TYPE pipeline_average_response_time_ms gauge\n`;
    metrics += `pipeline_average_response_time_ms ${this.metrics.averageResponseTime}\n`;

    return metrics;
  }
}
```

## 最佳实践

### 1. 模块开发最佳实践

- **接口一致性**: 确保所有模块实现标准接口
- **错误处理**: 使用返回值而非异常进行错误处理
- **配置管理**: 支持动态配置更新
- **日志记录**: 记录详细的操作日志和调试信息
- **性能优化**: 避免阻塞操作，使用异步编程

### 2. 性能优化建议

- **连接池**: 使用HTTP连接池复用连接
- **缓存策略**: 实现智能缓存减少重复计算
- **并发控制**: 合理设置并发限制避免资源耗尽
- **监控指标**: 实时监控关键性能指标
- **负载均衡**: 使用合适的负载均衡策略

### 3. 故障处理建议

- **重试机制**: 实现指数退避重试策略
- **熔断器**: 使用熔断器保护系统免受故障影响
- **降级策略**: 在故障时提供降级服务
- **监控告警**: 设置合理的监控告警阈值
- **故障恢复**: 实现自动故障恢复机制

## 故障排除

### 常见问题及解决方案

#### 问题1: 模块初始化失败

**症状**:
```
Error: Module initialization failed: INIT_ERROR
```

**解决方案**:
1. 检查模块配置文件格式
2. 验证依赖项是否已安装
3. 确认模块路径是否正确
4. 检查权限设置

#### 问题2: 流水线组装失败

**症状**:
```
Error: Pipeline assembly failed: No providers discovered
```

**解决方案**:
1. 检查Provider模块是否正确注册
2. 验证Provider模块的健康状态
3. 确认配置表中的目标配置
4. 检查模块扫描路径

#### 问题3: 请求执行超时

**症状**:
```
Error: Request timeout: TIMEOUT_ERROR
```

**解决方案**:
1. 增加超时时间配置
2. 检查网络连接状态
3. 优化Provider模块性能
4. 考虑使用负载均衡

#### 问题4: 内存使用过高

**症状**:
```
Warning: High memory usage detected
```

**解决方案**:
1. 检查内存泄漏
2. 优化数据处理逻辑
3. 增加垃圾回收频率
4. 考虑使用对象池

### 调试工具

```bash
# 查看流水线状态
curl http://localhost:8080/api/v1/pipeline/status

# 获取性能指标
curl http://localhost:8080/api/v1/pipeline/metrics

# 执行健康检查
curl http://localhost:8080/api/v1/pipeline/health

# 查看调试日志
curl http://localhost:8080/api/v1/pipeline/debug/logs
```

## 版本兼容性

### 模块版本要求

- **Pipeline Core**: >= 1.0.0
- **BaseModule**: >= 0.1.3
- **ErrorHandling**: >= 1.0.3
- **Configuration**: >= 0.1.0

### 升级指南

1. **备份数据**: 升级前备份配置文件和数据
2. **检查兼容性**: 确认新版本与现有模块兼容
3. **测试验证**: 在测试环境中验证升级
4. **逐步升级**: 分批次升级生产环境
5. **监控观察**: 升级后密切监控系统状态

## 详细架构

### 文件结构与功能详解

#### 入口文件
- **`src/index.ts`** - 模块主入口文件，导出所有公共API和类型定义
  - 导出核心框架类：`PipelineBaseModule`, `BaseProvider`, `EnhancedPipelineScheduler`
  - 导出调度系统：`Pipeline`, `PipelineFactory`, `PipelineScheduler`, `VirtualModelSchedulerManager`
  - 导出跟踪系统：`PipelineTracker`
  - 导出OpenAI接口和具体Provider实现：`QwenProvider`, `IFlowProvider`
  - 提供版本信息和模块名称

- **`src/index-build.ts`** - 构建专用的入口文件
  - 用于构建过程的特殊入口点
  - 提供构建时需要的特定导出
  - 支持不同的构建配置和环境

#### 核心模块层 (`src/modules/`)
- **`PipelineBaseModule.ts`** - 流水线基础模块，所有Pipeline组件的基类
  - 继承自`rcc-basemodule`的`BaseModule`，提供统一的模块管理能力
  - 集成两阶段调试系统和I/O跟踪功能
  - 提供流水线特定的配置管理：`PipelineModuleConfig`
  - 实现流水线操作跟踪：`trackPipelineOperation()`
  - 提供流水线阶段记录：`recordPipelineStage()`
  - 集成错误处理中心：`handlePipelineError()`
  - 支持动态配置更新和指标收集

- **`PipelineBaseModule.d.ts`** - PipelineBaseModule的类型定义文件
  - 提供完整的TypeScript类型声明
  - 包含所有公共接口和方法的类型定义
  - 支持IDE智能提示和类型检查

#### 核心处理层 (`src/core/`)
- **`PipelineProcessor.ts`** - 流水线处理器
  - 实现流水线的核心处理逻辑
  - 提供请求处理和响应管理
  - 集成各个组件的协调工作
  - 处理流水线生命周期的各个阶段

- **`PipelineExecutionContext.ts`** - 流水线执行上下文
  - 管理流水线执行的上下文信息
  - 提供请求状态和执行环境的管理
  - 支持上下文数据的存储和检索
  - 实现执行环境的隔离和安全控制

- **`DebuggablePipelineModule.ts`** - 可调试的流水线模块
  - 继承自PipelineBaseModule，增强调试能力
  - 提供详细的调试信息和状态输出
  - 支持断点设置和逐步执行
  - 集成开发环境的调试接口
  - 包含完整的执行跟踪和错误处理功能

#### 框架层 (`src/framework/`)

##### 调度器组件
- **`PipelineScheduler.ts`** - 流水线调度器，核心调度逻辑实现
  - 处理单个虚拟模型的调度任务
  - 实现多种负载均衡策略：round-robin, weighted, least-connections, random
  - 提供熔断器机制和故障恢复
  - 支持请求队列和优先级管理
  - 实现并发控制和资源管理
  - 提供健康检查和性能指标收集
  - 定义调度器配置接口：`SchedulerConfig`
  - 被`VirtualModelSchedulerManager`使用来管理虚拟模型调度

- **`VirtualModelSchedulerManager.ts`** - 虚拟模型调度管理器
  - 管理多个虚拟模型的调度器实例
  - 提供虚拟模型注册和注销功能
  - 实现自动扩缩容机制
  - 提供统一的请求执行接口：`execute()`, `executeStreaming()`
  - 集成健康检查和指标监控
  - 支持虚拟模型映射和生命周期管理

##### 流水线组件
- **`Pipeline.ts`** - 流水线执行器，管理多个目标的负载均衡
  - 实现流水线目标管理：`PipelineTarget`
  - 提供多种负载均衡策略的具体实现
  - 支持流式和非流式请求执行
  - 实现健康检查和故障转移
  - 提供详细的执行结果：`PipelineExecutionResult`
  - 集成请求跟踪和性能监控

- **`PipelineFactory.ts`** - 流水线工厂，从配置创建流水线实例
  - 从虚拟模型配置创建流水线：`createPipelineFromVirtualModel()`
  - 提供配置验证：`validateVirtualModelConfig()`, `validatePipelineConfig()`
  - 支持批量创建：`createPipelinesFromVirtualModels()`
  - 提供测试流水线创建：`createTestPipeline()`
  - 实现配置克隆和工厂配置管理

- **`PipelineTracker.ts`** - 流水线跟踪器，请求ID和流水线跟踪系统
  - 实现请求上下文管理：`RequestContextImpl`
  - 提供流水线阶段管理：`PipelineStageImpl`, `PipelineStageManagerImpl`
  - 实现阶段工厂：`PipelineStageFactoryImpl`
  - 提供请求生命周期跟踪
  - 支持阶段状态管理和统计信息收集
  - 集成rcc-basemodule的两阶段调试系统和I/O跟踪

##### Provider组件
- **`BaseProvider.ts`** - 基础Provider类，定义AI模型提供商的标准接口
  - 继承自`PipelineBaseModule`，具备完整的调试能力
  - 实现标准OpenAI聊天接口：`chat()`, `streamChat()`
  - 提供抽象方法：`executeChat()`, `executeStreamChat()`
  - 实现响应标准化：`standardizeResponse()`
  - 支持兼容性模块：`CompatibilityModule`
  - 提供健康检查和Provider信息管理
  - 集成I/O跟踪和错误处理

##### OpenAI接口
- **`OpenAIInterface.ts`** - OpenAI兼容接口定义
  - 定义标准的OpenAI请求和响应格式
  - 提供类型安全的接口定义
  - 支持流式和非流式响应格式

##### 工具组件
- **`ModuleScanner.ts`** - 模块扫描器
  - 自动发现和扫描pipeline模块
  - 支持动态模块加载和注册
  - 提供模块依赖分析和验证
  - 实现模块生命周期管理


#### Provider实现层 (`src/providers/`)
- **`qwen.ts`** - Qwen Provider实现
  - 继承自`BaseProvider`，实现Qwen API的完整集成
  - 支持OAuth 2.0 Device Flow认证流程
  - 实现自动token刷新和失败重试机制
  - 提供完整的聊天和流式聊天功能：`executeChat()`, `executeStreamChat()`
  - 支持工具调用和OpenAI格式转换
  - 集成PKCE验证和设备授权流程
  - 提供健康检查和模型列表获取
  - 实现token存储和管理
  - 支持多种Qwen模型：qwen-turbo, qwen-plus, qwen-max, qwen3-coder-plus等

- **`iflow.ts`** - iFlow Provider实现
  - 继承自`BaseProvider`，实现iFlow API的完整集成
  - 支持OAuth和API Key两种认证模式
  - 复用iflow现有的OAuth凭据文件
  - 实现自动认证凭据加载和刷新
  - 提供完整的聊天和流式聊天功能
  - 支持工具调用和OpenAI格式转换
  - 实现OAuth Device Flow和token管理
  - 提供认证状态检查和重建功能
  - 支持多种认证模式的无缝切换

#### 接口定义层 (`src/interfaces/`)
- **`IRequestContext.ts`** - 请求上下文接口，集成rcc-basemodule的PipelineIOEntry
  - 定义请求上下文的标准接口
  - 提供请求生命周期管理方法
  - 支持阶段管理和元数据操作

- **`IPipelineStage.ts`** - 流水线阶段接口
  - 定义流水线阶段的标准接口
  - 提供阶段工厂和管理器接口
  - 支持阶段状态和数据管理

- **`ILogEntries.ts`** - 日志条目接口，集成rcc-basemodule的PipelineIOEntry
  - 定义日志条目的标准格式和I/O跟踪接口
  - 提供日志类型和级别定义

- **`IAuthManager.ts`** - 认证管理器接口
  - 定义认证管理的标准接口
  - 支持多种认证方式的抽象

- **`ICompatibility.ts`** - 兼容性接口
  - 定义Provider兼容性的接口
  - 支持请求和响应格式转换

#### 类型定义层 (`src/types/`)
- **`virtual-model.ts`** - 虚拟模型类型定义
  - 定义虚拟模型配置和相关类型
  - 包括目标配置、能力定义等
  - 支持虚拟模型的完整类型系统

#### 测试文件 (`src/test/`)
- **`integration-demo.ts`** - 集成演示文件
  - 提供完整的集成使用示例
  - 展示各个组件的协同工作
  - 包含实际场景的测试用例

- **`debug-integration.test.ts`** - 调试集成测试
  - 测试调试系统的集成功能
  - 验证调试接口的正确性
  - 确保调试功能的稳定性

- **`debuggable-pipeline.test.ts`** - 可调试流水线测试
  - 测试可调试流水线的功能
  - 验证调试模块的正确性
  - 确保调试功能的完整性

#### 工具文件 (`src/`)
- **`new-feature.ts`** - 新功能开发文件
  - 用于新功能的开发和测试
  - 提供功能原型和验证
  - 支持渐进式功能开发

- **`test-sharedmodule-hook.ts`** - 共享模块测试钩子
  - 提供共享模块的测试支持
  - 实现测试环境的初始化和清理
  - 支持跨模块的集成测试

### 分层架构设计

```
RCC Pipeline Module (sharedmodule/pipeline)
├── 管理层 (Management Layer)
│   ├── VirtualModelSchedulerManager (虚拟模型调度管理器)
│   └── PipelineFactory (流水线工厂)
├── 调度层 (Scheduling Layer)
│   ├── PipelineScheduler (流水线调度器)
│   └── Pipeline (流水线执行器)
├── 跟踪层 (Tracking Layer)
│   ├── PipelineTracker (请求跟踪器)
│   ├── IRequestContext (请求上下文接口)
│   ├── IPipelineStage (流水线阶段接口)
│   └── ILogEntries (日志条目接口)
├── 提供者层 (Provider Layer)
│   ├── BaseProvider (基础提供者抽象)
│   ├── QwenProvider (Qwen AI提供者)
│   ├── IFlowProvider (iFlow提供者)
│   └── OpenAIInterface (OpenAI兼容接口)
└── 基础层 (Base Layer)
    ├── PipelineBaseModule (流水线基础模块)
    ├── 类型定义 (virtual-model)
    └── 调试集成 (rcc-basemodule TwoPhaseDebug系统)
```

### 核心组件职责

#### 1. PipelineBaseModule (流水线基础模块)
- **继承**: `BaseModule` (rcc-basemodule)
- **职责**:
  - 提供所有pipeline组件的基础功能
  - 集成两阶段调试系统
  - I/O跟踪和请求生命周期管理
  - 错误处理和恢复机制
- **关键特性**:
  - 模块化设计，易于扩展
  - 完整的调试支持
  - 标准化的错误处理

#### 2. PipelineScheduler (流水线调度器)
- **职责**:
  - 请求调度和负载均衡
  - 并发控制和资源管理
  - 熔断器机制和故障恢复
  - 请求队列和优先级管理
- **核心算法**:
  - 多种负载均衡策略 (round-robin, random, weighted, least-connections)
  - 智能熔断器机制
  - 动态资源分配

#### 3. PipelineTracker (流水线跟踪器)
- **职责**:
  - 请求ID生成和管理
  - 流水线阶段跟踪
  - 执行状态监控
  - 性能指标收集
- **关键组件**:
  - `RequestContextImpl`: 请求上下文实现
  - `PipelineStageImpl`: 流水线阶段实现
  - `PipelineStageManagerImpl`: 阶段管理器

#### 4. BaseProvider (基础提供者)
- **职责**:
  - 定义AI模型提供商的标准接口
  - 提供OAuth 2.0认证支持
  - 实现请求/响应标准化
  - 处理流式响应
- **关键特性**:
  - 统一的API接口
  - 自动token管理
  - 错误处理和重试

## 外部依赖关系

### RCC框架依赖

```typescript
// 核心框架
import { BaseModule, ModuleInfo, DebugConfig } from 'rcc-basemodule';        // v0.1.8
import { ErrorHandlingCenter } from 'rcc-errorhandling';                  // v1.0.3

// 配置管理
import { createConfigParser, createConfigLoader } from 'rcc-config-parser'; // v0.1.0

// 虚拟模型规则
import { VirtualModelRulesModule } from 'rcc-virtual-model-rules';        // v1.0.5
```

### 第三方库依赖

```typescript
// HTTP请求处理
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';          // v1.12.2

// OAuth认证支持
import open from 'open';                                                   // v10.2.0

// Node.js内置模块
import crypto from 'crypto';      // PKCE验证器生成
import fs from 'fs';              // Token文件管理
import path from 'path';          // 文件路径处理
import os from 'os';              // 系统信息获取
```

## 流水线执行流程

### 请求生命周期

```
1. 请求接收 → 2. 上下文创建 → 3. 调度决策 → 4. 流水线选择 → 5. 认证检查 → 6. API执行 → 7. 响应处理
     ↓              ↓              ↓              ↓              ↓           ↓           ↓
 Request ID     Pipeline       Load Balance   Provider       OAuth        API Call     Response
 Generation     Tracking       Strategy       Selection      Validation   Execution   Processing
```

### 详细执行步骤

#### 步骤1: 请求初始化
```typescript
// 创建请求上下文
const context = await pipelineTracker.createRequestContext(
  providerName,
  operationType,
  metadata
);

// 生成唯一请求ID
const requestId = pipelineTracker.generateRequestId();

// 记录请求开始
pipelineTracker.addStage(requestId, 'request-init');
```

#### 步骤2: 调度决策
```typescript
// 调度器处理请求
const scheduledRequest: ScheduledRequest = {
  id: requestId,
  data: requestData,
  priority: requestPriority,
  timeout: requestTimeout,
  timestamp: Date.now(),
  context: context
};

// 检查并发限制和熔断器状态
if (scheduler.canExecuteRequest(requestId)) {
  // 立即执行
  return scheduler.executeImmediately(scheduledRequest);
} else {
  // 加入队列等待
  return scheduler.enqueueRequest(scheduledRequest);
}
```

#### 步骤3: 流水线选择
```typescript
// 根据负载均衡策略选择流水线
const selectedPipeline = scheduler.selectPipeline();

// 健康检查
if (!selectedPipeline.isHealthy()) {
  throw new Error('Selected pipeline is not healthy');
}

// 分配资源
await selectedPipeline.allocateResources();
```

#### 步骤4: 认证检查
```typescript
// 检查OAuth token有效性
if (provider.requiresAuthentication()) {
  const tokens = await provider.getValidTokens();
  if (!tokens) {
    // 启动设备流程获取新token
    await provider.initiateDeviceFlow();
  }
}
```

#### 步骤5: API执行
```typescript
// 执行实际的API调用
try {
  const result = await provider.executeChat(request);

  // 记录成功
  pipelineTracker.completeStage(requestId, 'api-execution', {
    success: true,
    duration: Date.now() - startTime,
    response: result
  });

  return result;
} catch (error) {
  // 记录失败
  pipelineTracker.completeStage(requestId, 'api-execution', {
    success: false,
    duration: Date.now() - startTime,
    error: error.message
  });

  throw error;
}
```

#### 步骤6: 响应处理和清理
```typescript
// 格式化响应
const formattedResponse = provider.formatResponse(result);

// 释放资源
await selectedPipeline.releaseResources();

// 完成请求跟踪
const finalContext = pipelineTracker.completeRequest(requestId);

// 记录性能指标
scheduler.recordPerformanceMetrics(finalContext);

return formattedResponse;
```

## 调度器和负载均衡机制

### PipelineScheduler核心机制

#### 数据结构
```typescript
class PipelineScheduler {
  private pipelines: Map<string, Pipeline> = new Map();
  private requestQueue: ScheduledRequest[] = [];
  private activeRequests: Map<string, Promise<any>> = new Map();
  private circuitBreakerState: CircuitBreakerState;
  private metrics: SchedulerMetrics;

  // 配置参数
  private config: SchedulerConfig = {
    maxConcurrentRequests: 10,
    requestTimeout: 30000,
    loadBalancingStrategy: 'round-robin',
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      recoveryTimeout: 60000
    }
  };
}
```

#### 调度算法实现

```typescript
public async scheduleRequest(
  requestId: string,
  data: any,
  priority: number = 0,
  timeout: number = 30000,
  context?: RequestContext
): Promise<any> {
  // 1. 检查熔断器状态
  if (this.circuitBreakerState.tripped) {
    throw new Error('Circuit breaker is tripped');
  }

  // 2. 检查并发限制
  if (this.activeRequests.size >= this.config.maxConcurrentRequests) {
    // 加入队列
    return this.enqueueRequest({
      id: requestId,
      data,
      priority,
      timeout,
      context
    });
  }

  // 3. 选择流水线
  const pipeline = this.selectPipeline();
  if (!pipeline) {
    throw new Error('No available pipelines');
  }

  // 4. 执行请求
  return this.executeRequest(requestId, data, pipeline, context);
}
```

### 负载均衡策略

#### 1. Round Robin (轮询)
```typescript
private selectPipelineRoundRobin(): Pipeline | null {
  const healthyPipelines = Array.from(this.pipelines.values())
    .filter(p => p.isHealthy());

  if (healthyPipelines.length === 0) return null;

  const selected = healthyPipelines[this.currentRoundRobinIndex % healthyPipelines.length];
  this.currentRoundRobinIndex++;
  return selected;
}
```

#### 2. Weighted (权重)
```typescript
private selectPipelineWeighted(): Pipeline | null {
  const healthyPipelines = Array.from(this.pipelines.values())
    .filter(p => p.isHealthy());

  if (healthyPipelines.length === 0) return null;

  // 计算总权重
  const totalWeight = healthyPipelines.reduce((sum, p) => sum + (p.weight || 1), 0);

  // 随机选择权重区间
  const random = Math.random() * totalWeight;
  let currentWeight = 0;

  for (const pipeline of healthyPipelines) {
    currentWeight += pipeline.weight || 1;
    if (random <= currentWeight) {
      return pipeline;
    }
  }

  return healthyPipelines[healthyPipelines.length - 1];
}
```

#### 3. Least Connections (最少连接)
```typescript
private selectPipelineLeastConnections(): Pipeline | null {
  const healthyPipelines = Array.from(this.pipelines.values())
    .filter(p => p.isHealthy());

  if (healthyPipelines.length === 0) return null;

  // 选择活跃连接最少的流水线
  return healthyPipelines.reduce((best, current) => {
    const bestConnections = this.getActiveConnections(best.id);
    const currentConnections = this.getActiveConnections(current.id);

    return currentConnections < bestConnections ? current : best;
  });
}
```

### 熔断器机制

```typescript
interface CircuitBreakerState {
  tripped: boolean;           // 是否触发熔断
  tripTime: number;           // 熔断触发时间
  failureCount: number;       // 失败计数
  lastFailureTime: number;    // 最后失败时间
  successCount: number;       // 成功计数（用于恢复）
}

private checkCircuitBreaker(): boolean {
  const now = Date.now();
  const config = this.config.circuitBreaker;

  if (!config.enabled) return false;

  // 检查是否需要触发熔断
  if (!this.circuitBreakerState.tripped) {
    if (this.circuitBreakerState.failureCount >= config.failureThreshold) {
      this.circuitBreakerState.tripped = true;
      this.circuitBreakerState.tripTime = now;
      this.logger.warn('Circuit breaker tripped due to high failure rate');
    }
  }

  // 检查是否可以恢复
  if (this.circuitBreakerState.tripped) {
    if (now - this.circuitBreakerState.tripTime > config.recoveryTimeout) {
      this.circuitBreakerState.tripped = false;
      this.circuitBreakerState.failureCount = 0;
      this.circuitBreakerState.successCount = 0;
      this.logger.info('Circuit breaker recovered');
    }
  }

  return this.circuitBreakerState.tripped;
}
```

## 错误处理和恢复机制

### 分层错误处理

#### 1. 提供者层错误
- **API调用失败**: 网络错误、超时、服务器错误
- **认证失败**: Token过期、权限不足
- **模型错误**: 模型不可用、配额用尽

#### 2. 调度器层错误
- **超时错误**: 请求执行超时
- **资源不足**: 并发限制达到上限
- **熔断器触发**: 故障率过高

#### 3. 系统层错误
- **配置错误**: 无效的配置参数
- **资源耗尽**: 内存不足、磁盘空间不足
- **系统异常**: 未预期的系统错误

### 自动恢复策略

#### Token自动刷新
```typescript
class QwenProvider extends BaseProvider {
  async ensureValidTokens(): Promise<OAuthTokens> {
    if (this.isTokenExpired()) {
      try {
        // 刷新access token
        const newTokens = await this.refreshAccessToken();
        this.saveTokens(newTokens);
        return newTokens;
      } catch (refreshError) {
        // 如果refresh失败，启动完整的设备流程
        return this.initiateDeviceFlow();
      }
    }
    return this.tokens;
  }
}
```

#### 请求重试机制
```typescript
private async executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  backoffMultiplier: number = 2
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        throw error;
      }

      // 指数退避
      const delay = Math.pow(backoffMultiplier, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
```

## 性能监控和指标

### 关键性能指标

#### 请求指标
```typescript
interface RequestMetrics {
  requestId: string;
  provider: string;
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: 'success' | 'error';
  error?: string;
  pipelineId: string;
  retryCount: number;
}
```

#### 系统指标
```typescript
interface SystemMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  throughput: number;        // 请求/秒
  activeConnections: number;
  queueLength: number;
  memoryUsage: number;
  cpuUsage: number;
}
```

### 实时监控
```typescript
class PerformanceMonitor {
  private metrics: SystemMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    throughput: 0,
    activeConnections: 0,
    queueLength: 0,
    memoryUsage: 0,
    cpuUsage: 0
  };

  public recordRequest(request: RequestMetrics): void {
    this.metrics.totalRequests++;

    if (request.status === 'success') {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // 更新平均响应时间
    this.metrics.averageResponseTime = this.calculateAverageResponseTime(request);

    // 更新吞吐量
    this.metrics.throughput = this.calculateThroughput();
  }

  public getMetrics(): SystemMetrics {
    return { ...this.metrics };
  }
}
```

## 配置管理

### 配置层次结构
```typescript
interface PipelineModuleConfig {
  // 基础信息
  id: string;
  name: string;
  version: string;
  type: 'provider' | 'scheduler' | 'tracker' | 'pipeline';

  // 流水线配置
  providerName?: string;
  endpoint?: string;
  supportedModels?: string[];
  maxConcurrentRequests?: number;

  // 调度器配置
  loadBalancingStrategy?: 'round-robin' | 'random' | 'weighted' | 'least-connections';
  requestTimeout?: number;

  // 熔断器配置
  circuitBreaker?: {
    enabled: boolean;
    failureThreshold: number;
    recoveryTimeout: number;
  };

  // 调试配置
  enableTwoPhaseDebug?: boolean;
  enableIOTracking?: boolean;

  // OAuth配置
  oauth?: {
    clientId: string;
    clientSecret: string;
    scopes: string[];
  };
}
```

### 动态配置更新
```typescript
class PipelineBaseModule {
  private config: PipelineModuleConfig;

  public updateConfig(newConfig: Partial<PipelineModuleConfig>): void {
    // 验证新配置
    this.validateConfig(newConfig);

    // 更新配置
    this.config = { ...this.config, ...newConfig };

    // 重新初始化组件
    this.reinitializeComponents();

    // 通知其他模块
    this.emit('configUpdated', this.config);
  }
}
```

## 与其他模块的集成

### 与rcc-server集成
```typescript
// 在server模块中使用pipeline
import { PipelineScheduler } from 'rcc-pipeline';

class ServerModule {
  private pipelineScheduler: PipelineScheduler;

  public async initialize(): Promise<void> {
    // 创建pipeline调度器
    this.pipelineScheduler = new PipelineScheduler({
      pipelines: this.createPipelines(),
      loadBalancer: {
        strategy: 'weighted',
        healthCheckInterval: 30000
      }
    });

    // 注册请求处理器
    this.registerRequestHandler();
  }

  private async handleRequest(request: ClientRequest): Promise<ClientResponse> {
    // 通过pipeline处理请求
    return this.pipelineScheduler.scheduleRequest(
      request.id,
      request,
      request.priority || 0,
      request.timeout || 30000
    );
  }
}
```

### 与rcc-configuration集成
```typescript
// 配置驱动的pipeline创建
import { createConfigLoader } from 'rcc-config-parser';

class PipelineManager {
  public async createPipelinesFromConfig(): Promise<Pipeline[]> {
    const configLoader = createConfigLoader();
    const pipelineConfigs = await configLoader.loadPipelineConfigs();

    return pipelineConfigs.map(config => this.createPipeline(config));
  }
}
```

## 扩展性设计

### 添加新的Provider
```typescript
// 1. 继承BaseProvider
class CustomProvider extends BaseProvider {
  async authenticate(): Promise<void> {
    // 实现自定义认证逻辑
  }

  async executeChat(request: OpenAIChatRequest): Promise<OpenAIChatResponse> {
    // 实现自定义API调用逻辑
  }
}

// 2. 注册Provider
const customProvider = new CustomProvider({
  name: 'Custom',
  endpoint: 'https://api.custom.com/v1/chat',
  supportedModels: ['custom-model-1', 'custom-model-2']
});

pipelineScheduler.registerProvider(customProvider);
```

### 添加新的调度策略
```typescript
// 1. 实现调度策略接口
class CustomLoadBalancingStrategy implements LoadBalancingStrategy {
  selectPipeline(pipelines: Pipeline[]): Pipeline | null {
    // 实现自定义选择逻辑
  }
}

// 2. 注册策略
scheduler.registerLoadBalancingStrategy('custom', new CustomLoadBalancingStrategy());
```

## API 参考

### PipelineBaseModule

```typescript
class PipelineBaseModule extends BaseModule {
  constructor(config: PipelineModuleConfig);

  // 带I/O跟踪的流水线操作
  async trackPipelineOperation<T>(
    operationId: string,
    operation: () => Promise<T>,
    inputData?: any,
    operationType: string = 'pipeline-operation'
  ): Promise<T>;

  // 获取模块状态
  getStatus(): PipelineModuleStatus;

  // 更新配置
  updateConfig(newConfig: Partial<PipelineModuleConfig>): void;
}
```

### PipelineScheduler

```typescript
class PipelineScheduler {
  constructor(
    virtualModelId: string,
    config: SchedulerConfig,
    pipelineTracker: PipelineTracker
  );

  // 调度请求
  async execute(
    request: any,
    operation: OperationType,
    options?: SchedulerOptions
  ): Promise<any>;

  // 流式请求
  async *executeStreaming(
    request: any,
    operation: OperationType,
    options?: SchedulerOptions
  ): AsyncGenerator<any, void, unknown>;

  // 添加流水线
  addPipeline(pipeline: Pipeline): void;

  // 获取性能指标
  getMetrics(): SchedulerMetrics;

  // 获取健康状态
  getHealth(): SchedulerHealth;
}
```

### PipelineTracker

```typescript
class PipelineTracker extends PipelineBaseModule {
  constructor();

  // 创建请求上下文
  createRequestContext(
    provider: string,
    operation: 'chat' | 'streamChat' | 'healthCheck',
    metadata?: Record<string, any>
  ): IRequestContext;

  // 添加流水线阶段
  addStage(requestId: string, stageName: string): void;

  // 完成阶段
  completeStage(requestId: string, stageName: string, data?: any): void;

  // 完成请求
  completeRequest(requestId: string): IRequestContext | undefined;

  // 获取请求统计
  getRequestStatistics(): {
    activeRequests: number;
    totalStages: number;
    completedStages: number;
    failedStages: number;
    runningStages: number;
  };
}
```

### QwenProvider

```typescript
class QwenProvider extends BaseProvider {
  constructor(config: ProviderConfig);

  // OAuth设备流程
  async initiateDeviceFlow(autoOpen: boolean = true): Promise<DeviceFlowData>;
  async waitForDeviceAuthorization(deviceCode: string, pkceVerifier: string): Promise<OAuthTokens>;

  // 聊天完成
  async executeChat(request: OpenAIChatRequest): Promise<OpenAIChatResponse>;

  // 流式聊天
  async *executeStreamChat(request: OpenAIChatRequest): AsyncGenerator<OpenAIChatResponse>;

  // 健康检查
  async healthCheck(): Promise<ProviderHealthStatus>;
}
```

## 配置选项

### PipelineModuleConfig

```typescript
interface PipelineModuleConfig {
  // 基础信息
  id: string;
  name: string;
  version: string;
  type: 'provider' | 'scheduler' | 'tracker' | 'pipeline';

  // 流水线配置
  providerName?: string;
  endpoint?: string;
  supportedModels?: string[];
  maxConcurrentRequests?: number;

  // 调度器配置
  loadBalancingStrategy?: 'round-robin' | 'random' | 'weighted' | 'least-connections';
  requestTimeout?: number;

  // 熔断器配置
  circuitBreaker?: {
    enabled: boolean;
    failureThreshold: number;
    recoveryTimeout: number;
  };

  // 调试配置
  enableTwoPhaseDebug?: boolean;
  enableIOTracking?: boolean;

  // OAuth配置
  oauth?: {
    clientId: string;
    clientSecret: string;
    scopes: string[];
  };
}
```

### SchedulerConfig

```typescript
interface SchedulerConfig {
  maxConcurrentRequests: number;
  requestTimeout: number;
  healthCheckInterval: number;
  retryStrategy: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
  };
  loadBalancingStrategy: 'round-robin' | 'weighted' | 'least-connections' | 'random';
  enableCircuitBreaker: boolean;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
}
```

## 错误处理

### 分层错误处理

Pipeline模块提供完整的错误处理机制：

```typescript
try {
  const response = await scheduler.execute(
    'request-123',
    request,
    'chat',
    { timeout: 30000 }
  );

  console.log('Success:', response);
} catch (error) {
  if (error instanceof CircuitBreakerError) {
    console.error('Circuit breaker is tripped:', error.message);
  } else if (error instanceof AuthenticationError) {
    console.error('Authentication failed:', error.message);
  } else if (error instanceof RateLimitError) {
    console.error('Rate limit exceeded:', error.message);
  } else {
    console.error('Request failed:', error.message);
  }
}
```

### 自动恢复机制

- **Token自动刷新**: OAuth token过期自动刷新
- **请求重试**: 指数退避重试策略
- **熔断器**: 故障自动隔离和恢复
- **健康检查**: 定期检查组件状态

## 性能监控

### 关键指标

```typescript
// 获取性能指标
const metrics = scheduler.getMetrics();

console.log('System Metrics:', {
  totalRequests: metrics.totalRequests,
  successfulRequests: metrics.successfulRequests,
  failedRequests: metrics.failedRequests,
  averageResponseTime: metrics.averageResponseTime,
  activeRequests: metrics.activeRequests,
  queueLength: metrics.queueLength
});
```

### 实时监控

```typescript
// 监控系统健康
const health = scheduler.getHealth();

console.log('System Health:', {
  status: health.status,
  checks: health.checks,
  details: health.details
});
```

## 开发指南

### 添加新的Provider

1. **继承BaseProvider**:
```typescript
class CustomProvider extends BaseProvider {
  async authenticate(): Promise<void> {
    // 实现认证逻辑
  }

  async executeChat(request: OpenAIChatRequest): Promise<OpenAIChatResponse> {
    // 实现API调用逻辑
  }
}
```

2. **注册Provider**:
```typescript
const customProvider = new CustomProvider(config);
await scheduler.registerProvider(customProvider);
```

### 添加新的负载均衡策略

```typescript
class CustomStrategy implements LoadBalancingStrategy {
  selectPipeline(pipelines: Pipeline[]): Pipeline | null {
    // 实现选择逻辑
  }
}

scheduler.registerLoadBalancingStrategy('custom', new CustomStrategy());
```

## 测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- --grep "scheduler"

# 运行覆盖率测试
npm run test:coverage

# 运行集成测试
npm run test:integration
```

## 最佳实践

### 1. 配置管理
- 使用环境变量管理敏感信息
- 实现配置验证和默认值
- 支持动态配置更新

### 2. 错误处理
- 实现分层错误处理
- 使用结构化错误信息
- 提供详细的错误上下文

### 3. 性能优化
- 合理设置并发限制
- 使用连接池复用资源
- 实现智能缓存策略

### 4. 监控和日志
- 记录详细的请求追踪信息
- 实现实时性能监控
- 设置合理的日志级别

## 贡献指南

1. Fork 项目
2. 创建功能分支: `git checkout -b feature/amazing-feature`
3. 提交更改: `git commit -m 'Add amazing feature'`
4. 推送到分支: `git push origin feature/amazing-feature`
5. 创建Pull Request

## 许可证

本项目采用MIT许可证 - 详见 [LICENSE](LICENSE) 文件

## 支持

如有问题，请在 [GitHub Issues](https://github.com/rcc/rcc-pipeline/issues) 页面提交问题。

## 更新日志

详见 [CHANGELOG.md](CHANGELOG.md) 了解版本历史和更改。

## 相关项目

- [RCC Base Module](https://github.com/rcc/rcc-basemodule) - 核心框架基础模块
- [RCC Error Handling](https://github.com/rcc/rcc-errorhandling) - 错误处理中心
- [RCC Config Parser](https://github.com/rcc/rcc-config-parser) - 配置管理模块
- [RCC Server](https://github.com/rcc/rcc-server) - HTTP服务器模块
- [RCC Virtual Model Rules](https://github.com/rcc/rcc-virtual-model-rules) - 虚拟模型路由规则

---

**使用 ❤️ 构建 by RCC开发团队**

## API 参考

### 核心接口

#### IPipelineModule
```typescript
interface IPipelineModule {
  initialize(config: ModuleConfig): Promise<InitializationResult>;
  destroy(): Promise<void>;
  healthCheck(): Promise<HealthCheckResult>;
  getModuleInfo(): ModuleInfo;
  handshake(handshakeRequest: HandshakeRequest): Promise<HandshakeResponse>;
}
```

#### IExecutableModule
```typescript
interface IExecutableModule extends IPipelineModule {
  execute(request: PipelineRequest): Promise<PipelineResponse>;
  executeStreaming(request: PipelineRequest): AsyncGenerator<PipelineResponse>;
  validateRequest(request: PipelineRequest): Promise<ValidationResult>;
}
```

#### PipelineRequest
```typescript
interface PipelineRequest {
  requestId: string;
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  parameters?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    [key: string]: any;
  };
  metadata?: {
    [key: string]: any;
  };
  timestamp?: number;
}
```

#### PipelineResponse
```typescript
interface PipelineResponse {
  status: 'success' | 'error';
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
    module?: string;
    stage?: string;
    timestamp: number;
    requestId: string;
    traceId: string;
    recoverable: boolean;
  };
  metadata?: {
    executionTime: number;
    pipelineId: string;
    moduleResults: Array<{
      moduleId: string;
      executionTime: number;
      status: string;
    }>;
  };
}
```

### 核心类

#### PipelineAssembler
```typescript
class PipelineAssembler {
  constructor(config: AssemblerConfig, tracker: PipelineTracker);

  async assemblePipelines(virtualModelConfigs: VirtualModelConfig[]): Promise<AssemblyResult>;
  getPipelinePools(): Map<string, PipelinePool>;
  getPipelinePool(virtualModelId: string): PipelinePool | null;
  async reloadProviders(): Promise<void>;
  getStatus(): AssemblerStatus;
  destroy(): void;
}
```

#### ModuleScanner
```typescript
class ModuleScanner {
  constructor();

  async scan(options?: ProviderDiscoveryOptions): Promise<DiscoveredModule[]>;
  async discoverModules(paths: string[]): Promise<DiscoveredModule[]>;
  validateModule(module: any): boolean;
}
```

#### PipelineTracker
```typescript
class PipelineTracker extends PipelineBaseModule {
  constructor();

  createRequestContext(provider: string, operation: string, metadata?: any): IRequestContext;
  addStage(requestId: string, stageName: string): void;
  completeStage(requestId: string, stageName: string, data?: any): void;
  completeRequest(requestId: string): IRequestContext | undefined;
  getRequestStatistics(): RequestStatistics;
}
```

### 配置类型

#### ModuleConfig
```typescript
interface ModuleConfig {
  id: string;
  type: 'llmswitch' | 'workflow' | 'compatibility' | 'provider';
  name: string;
  version: string;
  enabled: boolean;
  config: {
    [key: string]: any;
  };
  dependencies?: string[];
  capabilities?: string[];
}
```

#### VirtualModelConfig
```typescript
interface VirtualModelConfig {
  id: string;
  name: string;
  modelId: string;
  provider: string;
  enabled: boolean;
  targets: Array<{
    providerId: string;
    modelId: string;
    weight: number;
    enabled: boolean;
    keyIndex?: number;
  }>;
  capabilities?: string[];
  metadata?: {
    [key: string]: any;
  };
}
```

## 许可证

本项目采用MIT许可证 - 详见 [LICENSE](LICENSE) 文件

## 支持

如有问题，请在 [GitHub Issues](https://github.com/rcc/rcc-pipeline/issues) 页面提交问题。

## 更新日志

详见 [CHANGELOG.md](CHANGELOG.md) 了解版本历史和更改。

## 相关项目

- [RCC Base Module](https://github.com/rcc/rcc-basemodule) - 核心框架基础模块
- [RCC Error Handling](https://github.com/rcc/rcc-errorhandling) - 错误处理中心
- [RCC Config Parser](https://github.com/rcc/rcc-config-parser) - 配置管理模块
- [RCC Server](https://github.com/rcc/rcc-server) - HTTP服务器模块
- [RCC Virtual Model Rules](https://github.com/rcc/rcc-virtual-model-rules) - 虚拟模型路由规则

---

**使用 ❤️ 构建 by RCC开发团队**

## 最后更新时间: 2025-09-19
- 文档已全面更新，包含完整的模块化架构设计
- 配置表格式和错误处理规范已详细说明
- 系统集成要求和最佳实践已添加
- 部署、测试和监控指南已完成