# BaseModule Recording System Design

## 概述

本文档详细描述了BaseModule重构后的高级记录系统设计，该系统提供了完整的环状请求-响应记录、专门的错误记录机制，以及完全可配置的文件管理功能。

## 核心设计原则

### 1. 完全可配置性
- 所有路径、文件名、行为都可通过配置控制
- 支持模板化路径和自定义变量
- 灵活的启用/禁用机制

### 2. 环状记录架构
- **起点**: 接收请求时创建文件
- **中间点**: 处理过程中传递上下文并记录
- **终点**: 完成响应时关闭文件
- 支持单次记录和循环记录模式

### 3. 专门的错误记录
- 独立的错误索引系统，支持快速查找
- 错误分类、级别管理、解决追踪
- 完整的错误生命周期管理

### 4. 向后兼容性
- 现有代码无需修改即可工作
- 新功能通过可选参数添加
- 未启用时零性能开销

## 系统架构

```
BaseModule (重构)
├── 核心功能 (保持原有功能)
├── RecordingManager (新增 - 统一记录管理)
│   ├── CycleRecorder (环状记录组件)
│   ├── ErrorRecorder (错误记录组件)
│   ├── FileTemplateEngine (文件模板引擎)
│   └── FieldTruncator (字段截断组件)
├── ConfigValidator (新增 - 配置验证器)
└── PathResolver (新增 - 路径解析器)
```

## 配置系统

### 主配置接口

```typescript
interface BaseModuleRecordingConfig {
  // 全局开关
  enabled?: boolean;

  // 基础路径配置
  basePath?: string;
  port?: number;

  // 环状记录配置
  cycle?: CycleRecordingConfig;

  // 错误记录配置
  error?: ErrorRecordingConfig;

  // 文件管理配置
  file?: FileManagementConfig;

  // 模板配置
  templates?: RecordingTemplates;

  // 字段截断配置
  truncation?: FieldTruncationConfig;
}

interface CycleRecordingConfig {
  enabled?: boolean;
  mode?: 'disabled' | 'single' | 'cyclic';

  // 文件路径模板
  basePath?: string;
  cycleDirTemplate?: string;
  mainFileTemplate?: string;
  summaryFileTemplate?: string;

  // 格式配置
  format?: 'json' | 'jsonl' | 'csv';
  includeIndex?: boolean;
  includeTimestamp?: boolean;

  // 行为配置
  autoCreateDirectory?: boolean;
  autoCloseOnComplete?: boolean;
  maxCyclesRetained?: number;
}

interface ErrorRecordingConfig {
  enabled?: boolean;
  levels?: ErrorLevel[];
  categories?: ErrorCategory[];

  // 文件路径模板
  basePath?: string;
  indexFileTemplate?: string;
  detailFileTemplate?: string;
  summaryFileTemplate?: string;
  dailyDirTemplate?: string;

  // 格式配置
  indexFormat?: 'jsonl' | 'csv';
  detailFormat?: 'json' | 'pretty';

  // 行为配置
  autoRecoveryTracking?: boolean;
  maxErrorsRetained?: number;
  enableStatistics?: boolean;
}

// 字段截断配置接口
interface FieldTruncationConfig {
  // 全局截断设置
  enabled?: boolean;
  defaultStrategy?: 'truncate' | 'replace' | 'hide';
  defaultMaxLength?: number;
  defaultReplacementText?: string;

  // 字段级别配置
  fields?: FieldTruncationRule[];

  // 路径模式配置
  pathPatterns?: PathPatternRule[];

  // 全局排除字段
  excludedFields?: string[];

  // 高级选项
  preserveStructure?: boolean;
  truncateArrays?: boolean;
  arrayTruncateLimit?: number;
  recursiveTruncation?: boolean;
}

interface FieldTruncationRule {
  // 字段路径（支持点分隔符，如 "request.messages.content"）
  fieldPath: string;

  // 截断策略
  strategy?: 'truncate' | 'replace' | 'hide';

  // 最大长度
  maxLength?: number;

  // 替换文本
  replacementText?: string;

  // 条件函数
  condition?: (value: any, context: any) => boolean;

  // 优先级（数字越大优先级越高）
  priority?: number;
}

interface PathPatternRule {
  // 路径模式（支持通配符，如 "request.messages.*.content"）
  pattern: string;

  // 应用条件
  condition?: 'always' | 'if_long' | 'if_nested';

  // 截断配置
  strategy?: 'truncate' | 'replace' | 'hide';
  maxLength?: number;
  replacementText?: string;
}
```

### 默认配置

```typescript
const DEFAULT_RECORDING_CONFIG: BaseModuleRecordingConfig = {
  enabled: false, // 默认关闭，不影响现有代码
  basePath: '~/.rcc/debug',
  port: undefined, // 运行时确定

  cycle: {
    enabled: true,
    mode: 'single',
    basePath: '${basePath}/port-${port}',
    cycleDirTemplate: 'cycles/${cycleId}',
    mainFileTemplate: 'cycle.${format}',
    summaryFileTemplate: 'summary.json',
    format: 'jsonl',
    includeIndex: true,
    includeTimestamp: true,
    autoCreateDirectory: true,
    autoCloseOnComplete: true,
    maxCyclesRetained: 1000
  },

  error: {
    enabled: true,
    levels: ['fatal', 'error', 'warning'],
    categories: ['network', 'validation', 'processing', 'system'],
    basePath: '${basePath}/port-${port}',
    indexFileTemplate: 'errors/error-index.${indexFormat}',
    detailFileTemplate: 'errors/${date}/${errorId}.${detailFormat}',
    summaryFileTemplate: 'errors/error-summary.json',
    dailyDirTemplate: 'errors/${date}',
    indexFormat: 'jsonl',
    detailFormat: 'json',
    autoRecoveryTracking: true,
    maxErrorsRetained: 10000,
    enableStatistics: true
  },

  truncation: {
    enabled: true,
    defaultStrategy: 'truncate',
    defaultMaxLength: 100,
    defaultReplacementText: '[内容已省略]',
    excludedFields: ['id', 'timestamp', 'traceId', 'requestId'],
    preserveStructure: true,
    truncateArrays: true,
    arrayTruncateLimit: 10,
    recursiveTruncation: true,
    fields: [
      {
        fieldPath: 'request.messages.*.content',
        strategy: 'truncate',
        maxLength: 200,
        priority: 10
      },
      {
        fieldPath: 'response.choices.*.message.content',
        strategy: 'truncate',
        maxLength: 500,
        priority: 10
      },
      {
        fieldPath: 'request.files.*.data',
        strategy: 'replace',
        replacementText: '[文件数据已省略]',
        priority: 5
      },
      {
        fieldPath: 'response.data',
        strategy: 'truncate',
        maxLength: 1000,
        condition: (value, context) => typeof value === 'string' && value.length > 1000
      }
    ],
    pathPatterns: [
      {
        pattern: 'request.messages.*.content',
        condition: 'if_long',
        strategy: 'truncate',
        maxLength: 200
      },
      {
        pattern: '*.token',
        condition: 'always',
        strategy: 'hide',
        replacementText: '[TOKEN]'
      }
    ]
  }
};
```

## 环状记录系统

### CycleRecorder

```typescript
class CycleRecorder {
  // 创建记录周期
  async startCycle(
    operation: string,
    data?: any,
    metadata?: Record<string, any>
  ): Promise<CycleHandle>;

  // 中间点记录
  async record(
    cycleId: string,
    record: CycleRecord,
    options?: { isCyclic?: boolean }
  ): Promise<void>;

  // 结束周期
  async endCycle(
    cycleId: string,
    result?: any,
    error?: Error
  ): Promise<void>;

  // 获取周期信息
  getCycleInfo(cycleId: string): CycleInfo | null;
  getActiveCycles(): CycleInfo[];
}
```

### BaseModule环状记录接口

```typescript
abstract class BaseModule {
  // 简化的单次记录
  protected async recordSingleOperation(
    operation: string,
    input?: any,
    output?: any
  ): Promise<string>;

  // 循环记录
  protected async startCyclicRecording(
    operation: string,
    initialData?: any
  ): Promise<string>;

  protected async addCyclicRecord(
    cycleId: string,
    data: any,
    operation?: string
  ): Promise<void>;

  protected async endCyclicRecording(
    cycleId: string,
    finalResult?: any
  ): Promise<void>;
}
```

## 错误专门记录系统

### ErrorRecorder

```typescript
class ErrorRecorder {
  // 记录错误
  async recordError(
    errorData: ErrorRecordData
  ): Promise<ErrorRecord>;

  // 标记错误已解决
  async markErrorResolved(
    errorId: string,
    resolution: string,
    result?: any
  ): Promise<void>;

  // 查询错误
  async findErrors(filters?: ErrorFilters): Promise<ErrorRecord[]>;

  // 获取错误统计
  async getErrorStatistics(): Promise<ErrorStatistics>;

  // 获取错误趋势
  async getErrorTrend(
    timeRange: { start: number; end: number },
    granularity: 'hour' | 'day' | 'week' = 'hour'
  ): Promise<ErrorTrendPoint[]>;
}

### FieldTruncator (字段截断器)

```typescript
class FieldTruncator {
  constructor(config: FieldTruncationConfig);

  // 截断数据中的字段
  truncateData(
    data: any,
    context?: TruncationContext
  ): any;

  // 添加自定义截断规则
  addRule(rule: FieldTruncationRule): void;

  // 移除截断规则
  removeRule(fieldPath: string): boolean;

  // 检查字段是否匹配规则
  matchFieldPath(fieldPath: string): FieldTruncationRule | null;

  // 获取截断统计
  getStatistics(): TruncationStatistics;

  // 重置统计
  resetStatistics(): void;
}

interface TruncationContext {
  operation?: string;
  module?: string;
  cycleId?: string;
  timestamp?: number;
  custom?: Record<string, any>;
}

interface TruncationStatistics {
  totalProcessed: number;
  totalTruncated: number;
  totalReplaced: number;
  totalHidden: number;
  fieldStats: Map<string, {
    processed: number;
    truncated: number;
    replaced: number;
    hidden: number;
  }>;
  averageSavings: number; // 平均节省的字节数
}
```

### BaseModule错误记录接口

```typescript
abstract class BaseModule {
  // 主要错误记录方法
  protected async recordError(
    error: Error | string,
    options?: ErrorRecordingOptions
  ): Promise<string>;

  // 便捷方法
  protected async recordWarning(
    message: string,
    options?: Omit<ErrorRecordingOptions, 'level'>
  ): Promise<string>;

  protected async recordFatalError(
    error: Error | string,
    options?: Omit<ErrorRecordingOptions, 'level'>
  ): Promise<string>;

  protected async recordValidationError(
    message: string,
    context?: Record<string, any>
  ): Promise<string>;

  // 标记错误已解决
  protected async recordErrorRecovery(
    errorId: string,
    resolution: string,
    result?: any
  ): Promise<void>;

  // 获取模块错误统计
  protected async getModuleErrorStats(): Promise<ModuleErrorStatistics>;
}
```

## 文件管理和路径解析

### PathResolver

```typescript
class PathResolver {
  constructor(basePath: string, initialVariables?: PathVariables);

  // 解析路径模板
  resolve(template: string, additionalVariables?: Record<string, any>): string;

  // 更新变量
  updateVariables(updates: Partial<PathVariables>): void;
}
```

### 支持的路径变量

#### 系统变量
- `${port}`: 端口号
- `${hostname}`: 主机名
- `${pid}`: 进程ID

#### 时间变量
- `${date}`: 日期 (YYYY-MM-DD)
- `${time}`: 时间 (HH:MM:SS)
- `${timestamp}`: 时间戳
- `${isoDate}`: ISO格式日期时间

#### 模块变量
- `${moduleId}`: 模块ID
- `${moduleName}`: 模块名称
- `${moduleType}`: 模块类型

#### 自定义变量
- `${cycleId}`: 周期ID
- `${errorId}`: 错误ID
- 任意用户自定义变量

### FileManager

```typescript
class FileManager {
  // 确保目录存在
  async ensureDirectory(path: string): Promise<void>;

  // 创建文件
  async createFile(path: string, options?: { flags?: string }): Promise<WriteStream>;

  // 原子写入
  async atomicWrite(path: string, data: string | Buffer): Promise<void>;

  // 关闭文件
  async closeFile(stream: WriteStream): Promise<void>;

  // 文件清理
  async cleanup(olderThan?: number): Promise<void>;
}
```

## 字段截断系统

### 核心功能

字段截断系统提供了灵活的数据处理能力，可以在记录I/O请求时自动截断、替换或隐藏长但不重要的字段，减少存储空间并提高记录文件的可读性。

### 截断策略

1. **truncate (截断)**: 保留指定长度的前缀，添加省略标记
2. **replace (替换)**: 用指定文本完全替换字段内容
3. **hide (隐藏)**: 用固定标记替换，适用于敏感信息

### 路径匹配规则

- **精确匹配**: `request.messages.0.content`
- **通配符匹配**: `request.messages.*.content`
- **嵌套匹配**: `request.*.data`
- **全局匹配**: `*.token`

### 基本使用

```typescript
class MyModule extends BaseModule {
  async processRequest(request: Request): Promise<Response> {
    // 记录时会自动应用字段截断
    await this.startCyclicRecording('process_request', {
      request: this.sanitizeForRecording(request) // 自动截断长字段
    });

    // 处理请求...
    const result = await this.doProcessing(request);

    await this.endCyclicRecording('process_request', {
      response: this.sanitizeForRecording(result)
    });
  }
}
```

### 配置示例

#### 1. 基础字段截断

```typescript
const basicTruncationConfig = {
  enabled: true,
  defaultStrategy: 'truncate',
  defaultMaxLength: 100,
  defaultReplacementText: '[内容已省略]',
  fields: [
    {
      fieldPath: 'request.messages.*.content',
      strategy: 'truncate',
      maxLength: 200,
      priority: 10
    },
    {
      fieldPath: 'response.choices.*.message.content',
      strategy: 'truncate',
      maxLength: 500,
      priority: 10
    },
    {
      fieldPath: 'request.files.*.data',
      strategy: 'replace',
      replacementText: '[文件数据已省略]'
    }
  ]
};
```

#### 2. 条件截断

```typescript
const conditionalTruncationConfig = {
  enabled: true,
  fields: [
    {
      fieldPath: 'request.data',
      strategy: 'truncate',
      maxLength: 1000,
      condition: (value, context) => {
        // 只有在数据超过1000字符且不是关键操作时才截断
        return typeof value === 'string' &&
               value.length > 1000 &&
               context.operation !== 'critical_operation';
      }
    },
    {
      fieldPath: 'response.data',
      strategy: 'replace',
      replacementText: '[大数据响应已省略]',
      condition: (value, context) => {
        // 响应数据大于1MB时替换
        return JSON.stringify(value).length > 1024 * 1024;
      }
    }
  ]
};
```

#### 3. 敏感信息处理

```typescript
const securityTruncationConfig = {
  enabled: true,
  defaultStrategy: 'hide',
  excludedFields: ['timestamp', 'traceId', 'requestId'],
  fields: [
    // 隐藏所有token字段
    {
      fieldPath: '*.token',
      strategy: 'hide',
      replacementText: '[TOKEN]'
    },
    {
      fieldPath: '*.password',
      strategy: 'hide',
      replacementText: '[HIDDEN]'
    },
    {
      fieldPath: '*.apiKey',
      strategy: 'hide',
      replacementText: '[API_KEY]'
    },
    // 截断但保留部分信息的字段
    {
      fieldPath: 'user.email',
      strategy: 'truncate',
      maxLength: 20,
      condition: (value) => typeof value === 'string'
    }
  ]
};
```

#### 4. 高级模式配置

```typescript
const advancedTruncationConfig = {
  enabled: true,
  preserveStructure: true,
  truncateArrays: true,
  arrayTruncateLimit: 10,
  recursiveTruncation: true,
  defaultStrategy: 'truncate',
  defaultMaxLength: 200,

  pathPatterns: [
    {
      pattern: 'request.messages.*.content',
      condition: 'if_long',
      strategy: 'truncate',
      maxLength: 200
    },
    {
      pattern: '*.metadata.*',
      condition: 'always',
      strategy: 'truncate',
      maxLength: 50
    }
  ],

  fields: [
    {
      fieldPath: 'request',
      strategy: 'truncate',
      maxLength: 5000,
      priority: 1 // 低优先级，让更具体的规则先处理
    },
    {
      fieldPath: 'request.messages.*.content',
      strategy: 'truncate',
      maxLength: 200,
      priority: 10 // 高优先级
    }
  ]
};
```

### 编程式使用

```typescript
class AdvancedModule extends BaseModule {
  async processData(data: any): Promise<any> {
    // 获取字段截断器实例
    const truncator = this.getFieldTruncator();

    // 添加运行时规则
    truncator.addRule({
      fieldPath: 'temporary.largeField',
      strategy: 'truncate',
      maxLength: 100,
      priority: 20
    });

    // 应用截断
    const truncatedData = truncator.truncateData(data, {
      operation: 'processData',
      module: this.info.id,
      timestamp: Date.now()
    });

    // 记录截断后的数据
    await this.recordSingleOperation('data_processing', {
      input: truncatedData
    });

    return data; // 返回原始数据（截断仅影响记录）
  }

  // 获取截断统计
  async getTruncationReport(): Promise<TruncationReport> {
    const truncator = this.getFieldTruncator();
    const stats = truncator.getStatistics();

    return {
      totalProcessed: stats.totalProcessed,
      totalTruncated: stats.totalTruncated,
      totalReplaced: stats.totalReplaced,
      totalHidden: stats.totalHidden,
      savingsPercentage: this.calculateSavings(stats),
      fieldDetails: Array.from(stats.fieldStats.entries()).map(([field, fieldStats]) => ({
        field,
        ...fieldStats
      }))
    };
  }
}
```

### 实际应用示例

#### 1. 聊天API处理器

```typescript
class ChatAPIModule extends BaseModule {
  async handleChatRequest(messages: Message[]): Promise<ChatResponse> {
    const cycleId = await this.startCyclicRecording('chat_request', {
      messages: this.sanitizeForRecording(messages),
      messageCount: messages.length,
      estimatedTokens: this.estimateTokens(messages)
    });

    try {
      // 模拟LLM调用
      const response = await this.callLLM(messages);

      await this.addCyclicRecord(cycleId, {
        phase: 'llm_response',
        model: response.model,
        usage: response.usage,
        truncatedContent: this.sanitizeForRecording(response.choices[0].message.content)
      });

      await this.endCyclicRecording(cycleId, {
        success: true,
        responseTime: response.responseTime
      });

      return response;

    } catch (error) {
      await this.recordError(error, {
        category: 'llm_processing',
        context: {
          messageCount: messages.length,
          truncatedInput: this.sanitizeForRecording(messages)
        }
      });

      await this.endCyclicRecording(cycleId, null, error);
      throw error;
    }
  }
}
```

#### 2. 文件上传处理器

```typescript
class FileUploadModule extends BaseModule {
  async handleFileUpload(files: File[], metadata: UploadMetadata): Promise<UploadResult> {
    // 配置文件数据截断
    const truncationConfig = {
      ...this.recordingConfig.truncation,
      fields: [
        ...(this.recordingConfig.truncation?.fields || []),
        {
          fieldPath: 'files.*.data',
          strategy: 'replace',
          replacementText: '[文件数据已省略]',
          priority: 15
        },
        {
          fieldPath: 'files.*.preview',
          strategy: 'truncate',
          maxLength: 100,
          priority: 12
        }
      ]
    };

    await this.startCyclicRecording('file_upload', {
      files: this.sanitizeForRecording(files, truncationConfig),
      metadata,
      totalSize: files.reduce((sum, file) => sum + file.size, 0)
    });

    // 处理文件上传...
    const result = await this.processFiles(files, metadata);

    await this.endCyclicRecording('file_upload', {
      success: true,
      processedFiles: result.processedCount,
      failedFiles: result.failedCount,
      processingTime: result.processingTime
    });

    return result;
  }
}
```

### 性能监控和优化

```typescript
class TruncationMonitorModule extends BaseModule {
  async monitorTruncationEfficiency(): Promise<void> {
    const truncator = this.getFieldTruncator();
    const stats = truncator.getStatistics();

    // 检查截断效率
    if (stats.totalProcessed > 0) {
      const truncationRate = (stats.totalTruncated + stats.totalReplaced + stats.totalHidden) / stats.totalProcessed;

      if (truncationRate > 0.8) {
        await this.recordWarning(`High truncation rate: ${(truncationRate * 100).toFixed(1)}%`, {
          context: {
            totalProcessed: stats.totalProcessed,
            totalTruncated: stats.totalTruncated,
            averageSavings: stats.averageSavings
          }
        });
      }
    }

    // 检查特定字段的截断情况
    for (const [field, fieldStats] of stats.fieldStats.entries()) {
      if (fieldStats.truncated > 1000) {
        await this.recordWarning(`Field ${field} truncated ${fieldStats.truncated} times`, {
          context: {
            field,
            truncatedCount: fieldStats.truncated,
            processedCount: fieldStats.processed
          }
        });
      }
    }
  }
}
```

## 使用指南

### 1. 基本使用

#### 启用记录功能

```typescript
import { BaseModule } from 'rcc-basemodule';

class MyModule extends BaseModule {
  protected async initialize(): Promise<void> {
    // 单次操作记录
    await this.recordSingleOperation(
      'initialization',
      { config: this.getConfig() },
      { status: 'success' }
    );

    // 初始化逻辑...
  }
}

// 创建模块时启用记录
const module = new MyModule({
  id: 'my-module',
  name: 'My Module',
  version: '1.0.0',
  type: 'processor'
}, {
  recordingConfig: {
    enabled: true
  }
});
```

#### 环状记录使用

```typescript
class HTTPServerModule extends BaseModule {
  async handleRequest(request: Request): Promise<Response> {
    // 起点：创建记录周期
    const cycleId = await this.startCyclicRecording('http_request', {
      method: request.method,
      url: request.url
    });

    try {
      // 处理过程中记录
      await this.addCyclicRecord(cycleId, {
        phase: 'authentication',
        user: request.user
      });

      const result = await this.processRequest(request);

      await this.addCyclicRecord(cycleId, {
        phase: 'response_ready',
        status: result.status
      });

      // 终点：完成周期
      await this.endCyclicRecording(cycleId, {
        statusCode: result.status,
        responseTime: Date.now() - startTime
      });

      return result;

    } catch (error) {
      // 错误时也完成周期
      await this.endCyclicRecording(cycleId, null, error);
      throw error;
    }
  }
}
```

#### 错误记录使用

```typescript
class ProcessorModule extends BaseModule {
  async processData(data: any): Promise<any> {
    try {
      // 数据验证
      const validationResult = await this.validateData(data);
      if (!validationResult.valid) {
        await this.recordValidationError(
          `Validation failed: ${validationResult.errors.join(', ')}`,
          { data }
        );
        throw new Error('Invalid data');
      }

      // 处理数据
      const result = await this.performProcessing(data);
      return result;

    } catch (error) {
      // 记录错误
      const errorId = await this.recordError(error, {
        level: 'error',
        category: 'processing',
        operation: 'processData',
        context: { dataSize: JSON.stringify(data).length },
        recoverable: true
      });

      // 尝试恢复
      try {
        const fallbackResult = await this.fallbackProcessing(data);
        await this.recordErrorRecovery(errorId, 'Used fallback processing');
        return fallbackResult;
      } catch (fallbackError) {
        await this.recordFatalError(fallbackError, {
          context: { originalErrorId: errorId }
        });
        throw fallbackError;
      }
    }
  }
}
```

### 2. 配置示例

#### 开发环境配置

```typescript
const developmentConfig = {
  enabled: true,
  basePath: '~/.rcc/debug',

  cycle: {
    enabled: true,
    basePath: '${basePath}/port-${port}',
    cycleDirTemplate: 'cycles/${date}/${cycleId}',
    mainFileTemplate: 'cycle.log',
    format: 'json',
    maxCyclesRetained: 100
  },

  error: {
    enabled: true,
    levels: ['fatal', 'error', 'warning', 'info'],
    basePath: '${basePath}/port-${port}',
    detailFileTemplate: 'errors/${date}/${errorId}.json',
    maxErrorsRetained: 1000
  }
};
```

#### 生产环境配置

```typescript
const productionConfig = {
  enabled: true,
  basePath: '/var/log/rcc',

  cycle: {
    enabled: true,
    basePath: '${basePath}/${port}',
    cycleDirTemplate: 'cycles/${date}/${hour}/${cycleId}',
    mainFileTemplate: 'trace.jsonl',
    format: 'jsonl',
    includeIndex: true,
    includeTimestamp: true,
    maxCyclesRetained: 10000
  },

  error: {
    enabled: true,
    levels: ['fatal', 'error'],
    basePath: '${basePath}/${port}',
    indexFileTemplate: 'errors/error-index.jsonl',
    detailFileTemplate: 'errors/${date}/${errorId}.json',
    summaryFileTemplate: 'errors/error-summary.json',
    maxErrorsRetained: 50000,
    enableStatistics: true
  },

  file: {
    autoCleanup: true,
    maxFileAge: 30 * 24 * 60 * 60 * 1000, // 30天
    maxFileSize: 500 * 1024 * 1024, // 500MB
    atomicWrites: true
  }
};
```

#### 自定义模板配置

```typescript
const customConfig = {
  enabled: true,
  basePath: '/logs/rcc',

  templates: {
    pathVariables: {
      environment: 'production',
      service: 'api-gateway',
      version: '1.0.0'
    },
    customPaths: {
      cyclePath: '${basePath}/${environment}/${service}/v${version}/cycles/${date}/${cycleId}',
      errorPath: '${basePath}/${environment}/${service}/v${version}/errors/${date}'
    }
  },

  cycle: {
    enabled: true,
    cycleDirTemplate: '${customPaths.cyclePath}',
    mainFileTemplate: 'flow.${format}',
    summaryFileTemplate: 'summary.json'
  },

  error: {
    enabled: true,
    detailFileTemplate: '${customPaths.errorPath}/${errorId}.json'
  }
};
```

### 3. 流水线记录配置

#### HTTP服务器（起点+终点）

```typescript
class HTTPServerModule extends BaseModule {
  async handleRequest(request: Request): Promise<Response> {
    // 起点：创建记录周期
    const cycleId = await this.startCyclicRecording('http_request', {
      method: request.method,
      url: request.url,
      headers: request.headers,
      timestamp: Date.now()
    });

    try {
      // 记录处理开始
      await this.addCyclicRecord(cycleId, {
        phase: 'processing_start',
        message: '开始处理HTTP请求'
      });

      // 业务逻辑处理
      const result = await this.processBusinessLogic(request);

      // 记录处理完成
      await this.addCyclicRecord(cycleId, {
        phase: 'processing_complete',
        result: {
          status: result.status,
          contentType: result.headers['content-type']
        }
      });

      // 终点：完成周期
      await this.endCyclicRecording(cycleId, {
        statusCode: result.status,
        responseSize: result.body.length,
        duration: Date.now() - startTime
      });

      return result;

    } catch (error) {
      // 错误处理和记录
      await this.recordError(error, {
        level: 'error',
        category: 'http_processing',
        operation: 'handleRequest',
        context: {
          method: request.method,
          url: request.url
        },
        cycleId
      });

      await this.endCyclicRecording(cycleId, null, error);
      throw error;
    }
  }
}
```

#### 调度器（中间点）

```typescript
class SchedulerModule extends BaseModule {
  async schedule(request: Request, cycleId: string): Promise<ScheduleResult> {
    // 接收来自起点的上下文
    await this.addCyclicRecord(cycleId, {
      phase: 'scheduling_start',
      input: {
        endpoint: request.endpoint,
        priority: request.priority,
        timestamp: Date.now()
      }
    });

    // 调度决策逻辑
    const target = await this.makeSchedulingDecision(request);

    // 记录调度结果
    await this.addCyclicRecord(cycleId, {
      phase: 'scheduling_complete',
      output: {
        targetModule: target.module,
        targetProvider: target.provider,
        estimatedDuration: target.duration,
        priority: target.priority
      }
    });

    return { target, cycleId };
  }
}
```

#### 流水线处理器（中间点）

```typescript
class PipelineProcessorModule extends BaseModule {
  async process(target: Target, request: Request, cycleId: string): Promise<Response> {
    // LLM Switch阶段
    await this.addCyclicRecord(cycleId, {
      phase: 'llm_switch_start',
      input: {
        messages: request.messages,
        model: request.model
      }
    });

    const switchResult = await this.executeLLMSwitch(request);

    await this.addCyclicRecord(cycleId, {
      phase: 'llm_switch_complete',
      output: {
        provider: switchResult.provider,
        model: switchResult.model,
        parameters: switchResult.parameters
      }
    });

    // Provider执行阶段
    await this.addCyclicRecord(cycleId, {
      phase: 'provider_execution_start',
      provider: switchResult.provider,
      input: switchResult.transformedRequest
    });

    const providerResult = await this.executeProvider(switchResult);

    await this.addCyclicRecord(cycleId, {
      phase: 'provider_execution_complete',
      output: {
        responseTime: providerResult.responseTime,
        tokenCount: providerResult.tokenCount,
        cost: providerResult.cost
      }
    });

    return providerResult;
  }
}
```

#### 数据流处理器（循环记录）

```typescript
class DataStreamProcessorModule extends BaseModule {
  async processStream(dataStream: ReadableStream): Promise<ProcessResult> {
    // 开始循环记录
    const cycleId = await this.startCyclicRecording('stream_processing', {
      streamSize: dataStream.size,
      startTime: Date.now()
    });

    try {
      let totalProcessed = 0;
      let totalDuration = 0;

      for await (const chunk of dataStream) {
        const chunkStart = Date.now();

        // 循环记录每个数据块处理
        await this.addCyclicRecord(cycleId, {
          phase: 'chunk_processing',
          input: {
            chunkSize: chunk.length,
            chunkIndex: totalProcessed++
          }
        });

        const processed = await this.processChunk(chunk);
        const chunkDuration = Date.now() - chunkStart;
        totalDuration += chunkDuration;

        await this.addCyclicRecord(cycleId, {
          phase: 'chunk_complete',
          output: {
            result: processed,
            processingTime: chunkDuration,
            throughput: processed.length / (chunkDuration / 1000)
          }
        });
      }

      // 结束循环记录
      const finalResult = await this.aggregateResults();
      await this.endCyclicRecording(cycleId, {
        totalChunks: totalProcessed,
        totalDuration,
        averageThroughput: totalProcessed / (totalDuration / 1000)
      });

      return finalResult;

    } catch (error) {
      await this.endCyclicRecording(cycleId, null, error);
      throw error;
    }
  }
}
```

### 4. 文件结构示例

#### 环状记录文件结构

```
~/.rcc/debug/port-5506/
├── system-startup.log
├── cycles/
│   ├── cycle-001/
│   │   ├── cycle.log            # 完整的处理过程记录
│   │   └── summary.json         # 周期摘要和统计
│   ├── cycle-002/
│   │   ├── cycle.log
│   │   └── summary.json
│   └── cycle-003/
│       ├── cycle.log
│       └── summary.json
└── errors/
    ├── error-index.jsonl        # 错误索引（快速查找）
    ├── error-details.log         # 详细错误信息
    ├── error-summary.json        # 错误统计汇总
    └── 2025-09-18/               # 按日期分类的错误文件
        ├── error-001.json
        ├── error-002.json
        └── error-003.json
```

#### 环状记录日志格式示例

**cycle.log** (JSON Lines格式):
```json
{"index":1,"type":"start","module":"http-server","operation":"http_request","data":{"method":"POST","url":"/api/chat"},"timestamp":1699999999999,"cycleId":"cycle-001"}
{"index":2,"type":"middle","module":"http-server","phase":"processing_start","timestamp":1699999999999,"cycleId":"cycle-001"}
{"index":3,"type":"middle","module":"scheduler","phase":"scheduling_start","input":{"endpoint":"chat"},"timestamp":1699999999999,"cycleId":"cycle-001"}
{"index":4,"type":"middle","module":"scheduler","phase":"scheduling_complete","output":{"targetModule":"pipeline"},"timestamp":1699999999999,"cycleId":"cycle-001"}
{"index":5,"type":"middle","module":"pipeline","phase":"llm_switch_start","input":{"messages":[{"role":"user","content":"Hello"}]},"timestamp":1699999999999,"cycleId":"cycle-001"}
{"index":6,"type":"middle","module":"pipeline","phase":"llm_switch_complete","output":{"provider":"qwen"},"timestamp":1699999999999,"cycleId":"cycle-001"}
{"index":7,"type":"middle","module":"pipeline","phase":"provider_execution_start","provider":"qwen","timestamp":1699999999999,"cycleId":"cycle-001"}
{"index":8,"type":"middle","module":"pipeline","phase":"provider_execution_complete","result":{"response":"Hello!"},"timestamp":1699999999999,"cycleId":"cycle-001"}
{"index":9,"type":"middle","module":"http-server","phase":"processing_complete","result":{"status":200},"timestamp":1699999999999,"cycleId":"cycle-001"}
{"index":10,"type":"end","module":"http-server","result":{"status":200,"responseSize":6},"duration":150,"timestamp":1699999999999,"cycleId":"cycle-001"}
```

#### 错误记录格式示例

**error-index.jsonl**:
```json
{"errorId":"err-001","cycleId":"cycle-001","module":"pipeline","category":"processing","level":"error","timestamp":1699999999999,"summary":"[ERROR] pipeline: Provider connection failed","filePath":"errors/2025-09-18/err-001.json"}
{"errorId":"err-002","cycleId":"cycle-002","module":"validator","category":"validation","level":"warning","timestamp":1699999999999,"summary":"[WARNING] validator: Missing required field","filePath":"errors/2025-09-18/err-002.json"}
```

### 5. 调试和分析工具

#### 查看完整请求链路

```bash
# 查看特定周期的完整处理过程
cat ~/.rcc/debug/port-5506/cycles/cycle-001/cycle.log | jq

# 查看周期摘要
cat ~/.rcc/debug/port-5506/cycles/cycle-001/summary.json | jq

# 查看特定阶段的处理时间
cat ~/.rcc/debug/port-5506/cycles/*/cycle.log | jq 'select(.phase | contains("provider"))' | jq '{phase: .phase, timestamp: .timestamp}'
```

#### 分析错误

```bash
# 查找所有致命错误
cat ~/.rcc/debug/port-5506/errors/error-index.jsonl | jq 'select(.level == "fatal")'

# 查找特定模块的错误
cat ~/.rcc/debug/port-5506/errors/error-index.jsonl | jq 'select(.module == "pipeline-processor")'

# 查找未解决的错误
cat ~/.rcc/debug/port-5506/errors/error-index.jsonl | jq 'select(.resolved == false)'

# 查看错误统计
cat ~/.rcc/debug/port-5506/errors/error-summary.json | jq '.stats'

# 查找特定周期的错误
cat ~/.rcc/debug/port-5506/errors/error-index.jsonl | jq 'select(.cycleId == "cycle-001")'
```

#### 性能分析

```bash
# 分析各阶段耗时
grep -E "(start|complete)" ~/.rcc/debug/port-5506/cycles/*/cycle.log | jq '{phase: .phase, timestamp: .timestamp}'

# 统计处理时间
cat ~/.rcc/debug/port-5506/cycles/*/summary.json | jq '.duration'

# 按错误类别统计
cat ~/.rcc/debug/port-5506/errors/error-index.jsonl | jq '.category' | sort | uniq -c
```

### 6. 最佳实践

#### 1. 配置管理

```typescript
// 推荐的配置管理方式
class ConfigManager {
  static getRecordingConfig(environment: 'development' | 'production' | 'test'): BaseModuleRecordingConfig {
    const baseConfig = {
      enabled: true,
      basePath: environment === 'production' ? '/var/log/rcc' : '~/.rcc/debug'
    };

    switch (environment) {
      case 'development':
        return {
          ...baseConfig,
          ...developmentConfig
        };
      case 'production':
        return {
          ...baseConfig,
          ...productionConfig
        };
      case 'test':
        return {
          ...baseConfig,
          enabled: false // 测试环境通常关闭记录
        };
    }
  }
}
```

#### 2. 错误处理策略

```typescript
class RobustProcessorModule extends BaseModule {
  async processWithRetry(request: Request, maxRetries = 3): Promise<Response> {
    let lastErrorId: string;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.processInternal(request);
      } catch (error) {
        lastErrorId = await this.recordError(error, {
          level: attempt === maxRetries ? 'fatal' : 'error',
          category: 'processing',
          operation: 'processWithRetry',
          context: {
            attempt,
            maxRetries,
            willRetry: attempt < maxRetries
          },
          recoverable: attempt < maxRetries
        });

        if (attempt < maxRetries) {
          await this.delay(1000 * attempt); // 指数退避
        }
      }
    }

    // 标记最终错误
    await this.recordErrorRecovery(lastErrorId, 'All retry attempts exhausted');
    throw new Error(`Processing failed after ${maxRetries} attempts`);
  }
}
```

#### 3. 性能监控

```typescript
class PerformanceMonitorModule extends BaseModule {
  async withPerformance<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    const cycleId = await this.startCyclicRecording(operation, {
      startTime,
      context
    });

    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      // 记录性能指标
      await this.addCyclicRecord(cycleId, {
        phase: 'performance_metrics',
        metrics: {
          duration,
          success: true
        }
      });

      // 检查性能阈值
      if (duration > 1000) { // 超过1秒
        await this.recordWarning(`Slow operation: ${operation} took ${duration}ms`, {
          context: { duration, threshold: 1000 }
        });
      }

      await this.endCyclicRecording(cycleId, { duration, success: true });
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      await this.recordError(error, {
        level: 'error',
        category: 'performance',
        operation,
        context: { ...context, duration }
      });

      await this.endCyclicRecording(cycleId, { duration, success: false });
      throw error;
    }
  }
}
```

## 高级特性：Request链路追踪与配置管理

### Request链路追踪系统

为了解决动态目录切换时的链路断裂风险，设计了专门的Request链路追踪机制。

#### RequestContextManager

```typescript
interface RequestContext {
  // 核心追踪信息
  requestId: string;
  sessionId: string;
  traceId: string; // 全局追踪ID

  // 链路信息
  chainId: string; // 环状链路ID
  startModule: string;
  startTime: number;

  // 路径信息
  basePath: string;
  currentPath: string;
  pathHistory: Array<{
    moduleId: string;
    path: string;
    timestamp: number;
  }>;

  // 配置快照
  configSnapshot: RecordingConfigSnapshot;

  // 共享数据
  sharedData: Map<string, any>;

  // 状态信息
  status: 'active' | 'completed' | 'error';
  currentModule: string;
  moduleStack: string[];
}

class RequestContextManager {
  private static instance: RequestContextManager;
  private activeRequests: Map<string, RequestContext> = new Map();
  private globalConfig: GlobalRecordingConfig;

  constructor(globalConfig: GlobalRecordingConfig) {
    this.globalConfig = globalConfig;
  }

  // 创建请求上下文
  createRequestContext(
    initialModule: string,
    request: any,
    options?: RequestContextOptions
  ): RequestContext {
    const context: RequestContext = {
      requestId: this.generateRequestId(),
      sessionId: this.globalConfig.sessionId,
      traceId: this.generateTraceId(),
      chainId: this.generateChainId(),
      startModule: initialModule,
      startTime: Date.now(),
      basePath: this.resolveBasePath(options),
      currentPath: this.resolveBasePath(options),
      pathHistory: [],
      configSnapshot: this.createConfigSnapshot(),
      sharedData: new Map(),
      status: 'active',
      currentModule: initialModule,
      moduleStack: [initialModule]
    };

    // 记录初始路径
    this.recordPathChange(context, initialModule, context.currentPath);

    this.activeRequests.set(context.requestId, context);

    // 记录请求开始
    this.logRequestStart(context);

    return context;
  }

  // 模块切换时的路径处理
  async handleModuleTransition(
    requestId: string,
    fromModule: string,
    toModule: string,
    newConfig?: BaseModuleRecordingConfig
  ): Promise<RequestContext> {
    const context = this.activeRequests.get(requestId);
    if (!context) {
      throw new Error(`Request context not found: ${requestId}`);
    }

    // 记录模块切换
    context.moduleStack.push(toModule);
    context.currentModule = toModule;

    // 处理路径变更
    if (newConfig && this.hasPathChange(context, newConfig)) {
      const oldPath = context.currentPath;
      const newPath = this.resolveNewPath(context, newConfig);

      // 记录路径变更
      await this.handlePathChange(context, oldPath, newPath);

      // 更新路径历史
      this.recordPathChange(context, toModule, newPath);
    }

    // 记录模块切换
    await this.logModuleTransition(context, fromModule, toModule);

    return context;
  }

  // 完成请求
  async completeRequest(requestId: string, result?: any, error?: Error): Promise<void> {
    const context = this.activeRequests.get(requestId);
    if (!context) return;

    context.status = error ? 'error' : 'completed';

    // 记录请求完成
    await this.logRequestComplete(context, result, error);

    // 生成链路追踪报告
    const traceReport = this.generateTraceReport(context);
    await this.saveTraceReport(traceReport);

    // 清理
    this.activeRequests.delete(requestId);
  }

  // 获取请求上下文
  getRequestContext(requestId: string): RequestContext | undefined {
    return this.activeRequests.get(requestId);
  }

  // 获取活跃请求
  getActiveRequests(): RequestContext[] {
    return Array.from(this.activeRequests.values());
  }

  // 链路修复：当检测到断点时尝试修复
  async repairBrokenChain(requestId: string): Promise<boolean> {
    const context = this.activeRequests.get(requestId);
    if (!context) return false;

    // 检查链路完整性
    const chainIntegrity = this.validateChainIntegrity(context);
    if (chainIntegrity.isValid) return true;

    // 尝试修复断点
    const repaired = await this.attemptChainRepair(context, chainIntegrity.issues);
    if (repaired) {
      await this.logChainRepair(context, chainIntegrity.issues);
    }

    return repaired;
  }

  private async handlePathChange(
    context: RequestContext,
    oldPath: string,
    newPath: string
  ): Promise<void> {
    // 1. 复制现有日志文件到新路径
    await this.copyLogFiles(context, oldPath, newPath);

    // 2. 更新文件句柄
    await this.updateFileHandles(context, newPath);

    // 3. 记录路径变更
    await this.logPathChange(context, oldPath, newPath);

    // 4. 验证文件连续性
    await this.verifyFileContinuity(context, newPath);
  }

  private generateTraceReport(context: RequestContext): TraceReport {
    return {
      traceId: context.traceId,
      requestId: context.requestId,
      sessionId: context.sessionId,
      chainId: context.chainId,
      duration: Date.now() - context.startTime,
      startModule: context.startModule,
      moduleStack: context.moduleStack,
      pathHistory: context.pathHistory,
      status: context.status,
      summary: this.generateTraceSummary(context),
      performance: this.calculatePerformanceMetrics(context),
      errors: this.collectErrors(context)
    };
  }
}
```

#### 全局配置管理器

```typescript
interface GlobalRecordingConfig {
  sessionId: string;
  environment: 'development' | 'production' | 'test';
  version: string;

  // 全局配置
  baseConfig: BaseModuleRecordingConfig;

  // 模块特定配置覆盖
  moduleOverrides: Map<string, Partial<BaseModuleRecordingConfig>>;

  // 配置版本控制
  configVersion: string;
  lastUpdated: number;

  // 一致性要求
  consistency: {
    enforced: boolean;
    validationInterval: number;
    allowedDeviations: string[];
  };
}

class GlobalConfigManager {
  private static instance: GlobalConfigManager;
  private config: GlobalRecordingConfig;
  private subscribers: Map<string, ConfigChangeCallback> = new Map();

  constructor(initialConfig: Partial<GlobalRecordingConfig>) {
    this.config = this.initializeConfig(initialConfig);
    this.startValidationTimer();
  }

  // 更新全局配置
  async updateGlobalConfig(
    updates: Partial<BaseModuleRecordingConfig>,
    options?: {
      force?: boolean;
      validateConsistency?: boolean;
      skipNotification?: string[];
    }
  ): Promise<ConfigUpdateResult> {
    const oldConfig = JSON.stringify(this.config.baseConfig);

    // 应用更新
    this.config.baseConfig = this.mergeConfig(this.config.baseConfig, updates);
    this.config.lastUpdated = Date.now();
    this.config.configVersion = this.generateConfigVersion();

    // 验证一致性
    if (options?.validateConsistency !== false) {
      const consistency = await this.validateConfigConsistency();
      if (!consistency.valid && !options?.force) {
        return {
          success: false,
          errors: consistency.errors,
          requiresForce: true
        };
      }
    }

    // 通知订阅者
    await this.notifyConfigChange(oldConfig, options?.skipNotification);

    // 保存配置快照
    await this.saveConfigSnapshot();

    return {
      success: true,
      configVersion: this.config.configVersion
    };
  }

  // 注册模块配置订阅
  subscribeToConfigChanges(
    moduleId: string,
    callback: ConfigChangeCallback
  ): () => void {
    this.subscribers.set(moduleId, callback);

    // 返回取消订阅函数
    return () => {
      this.subscribers.delete(moduleId);
    };
  }

  // 获取模块特定配置
  getModuleConfig(moduleId: string): BaseModuleRecordingConfig {
    const baseConfig = this.config.baseConfig;
    const overrides = this.config.moduleOverrides.get(moduleId);

    if (!overrides) return baseConfig;

    return this.mergeConfig(baseConfig, overrides);
  }

  // 设置模块配置覆盖
  async setModuleOverride(
    moduleId: string,
    overrides: Partial<BaseModuleRecordingConfig>
  ): Promise<void> {
    this.config.moduleOverrides.set(moduleId, overrides);

    // 验证一致性
    const consistency = await this.validateModuleConfigConsistency(moduleId);
    if (!consistency.valid) {
      throw new Error(`Module config override violates consistency: ${consistency.errors.join(', ')}`);
    }

    // 通知模块
    await this.notifyModuleConfigChange(moduleId);
  }

  // 强制配置同步
  async forceConfigSync(targetModules?: string[]): Promise<ConfigSyncResult> {
    const modules = targetModules || Array.from(this.subscribers.keys());
    const results = new Map<string, boolean>();

    for (const moduleId of modules) {
      try {
        const callback = this.subscribers.get(moduleId);
        if (callback) {
          await callback(this.getModuleConfig(moduleId));
          results.set(moduleId, true);
        }
      } catch (error) {
        results.set(moduleId, false);
        this.logConfigSyncError(moduleId, error);
      }
    }

    return {
      success: Array.from(results.values()).every(Boolean),
      moduleResults: Object.fromEntries(results)
    };
  }

  // 配置一致性验证
  private async validateConfigConsistency(): Promise<ConsistencyValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查关键配置一致性
    const criticalConfigs = ['enabled', 'basePath', 'port'];
    for (const configKey of criticalConfigs) {
      const consistency = await this.validateConfigKeyConsistency(configKey);
      if (!consistency.consistent) {
        errors.push(`Inconsistent ${configKey}: ${consistency.details}`);
      }
    }

    // 检查文件路径一致性
    const pathConsistency = await this.validatePathConsistency();
    if (!pathConsistency.consistent) {
      warnings.push(`Path consistency issues: ${pathConsistency.details}`);
    }

    // 检查格式一致性
    const formatConsistency = await this.validateFormatConsistency();
    if (!formatConsistency.consistent) {
      warnings.push(`Format consistency issues: ${formatConsistency.details}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      details: {
        criticalConfigs,
        pathConsistency,
        formatConsistency
      }
    };
  }

  // 配置变更通知
  private async notifyConfigChange(
    oldConfig: string,
    skipModules?: string[]
  ): Promise<void> {
    const newConfig = JSON.stringify(this.config.baseConfig);

    if (oldConfig === newConfig) return; // 无实际变更

    const notificationTargets = Array.from(this.subscribers.keys())
      .filter(moduleId => !skipModules?.includes(moduleId));

    const notificationPromises = notificationTargets.map(async moduleId => {
      try {
        const callback = this.subscribers.get(moduleId);
        if (callback) {
          await callback(this.getModuleConfig(moduleId));
        }
      } catch (error) {
        this.logNotificationError(moduleId, error);
      }
    });

    await Promise.allSettled(notificationPromises);
  }

  // 定期验证和修复
  private startValidationTimer(): void {
    setInterval(async () => {
      try {
        const consistency = await this.validateConfigConsistency();
        if (!consistency.valid) {
          this.logConsistencyViolation(consistency);

          // 尝试自动修复
          if (this.config.consistency.enforced) {
            await this.attemptAutoRepair(consistency);
          }
        }
      } catch (error) {
        this.logValidationError(error);
      }
    }, this.config.consistency.validationInterval);
  }
}
```

#### BaseModule集成（增强版）

```typescript
abstract class BaseModule {
  protected requestContextManager: RequestContextManager;
  protected configManager: GlobalConfigManager;
  protected currentRequestContext?: RequestContext;
  private configUnsubscribe?: () => void;

  constructor(moduleInfo: ModuleInfo, options?: BaseModuleOptions) {
    super(moduleInfo);

    // 初始化管理器
    this.requestContextManager = RequestContextManager.getInstance();
    this.configManager = GlobalConfigManager.getInstance();

    // 初始化记录系统
    this.initializeEnhancedRecording(options);
  }

  private initializeEnhancedRecording(options?: BaseModuleOptions): void {
    // 注册配置变更监听
    this.configUnsubscribe = this.configManager.subscribeToConfigChanges(
      this.info.id,
      this.onConfigChange.bind(this)
    );

    // 初始化配置
    const moduleConfig = this.configManager.getModuleConfig(this.info.id);
    this.recordingConfig = ConfigValidator.validate(moduleConfig);

    // 如果启用记录功能，初始化记录器
    if (this.recordingConfig.enabled) {
      this.initializeRecorders();
    }
  }

  // 增强的请求处理方法
  protected async startRequestWithTracking(
    operation: string,
    request: any,
    options?: {
      createNewContext?: boolean;
      inheritContext?: string;
      customConfig?: Partial<BaseModuleRecordingConfig>;
    }
  ): Promise<{ cycleId: string; context: RequestContext }> {
    let requestContext: RequestContext;

    if (options?.createNewContext) {
      // 创建新的请求上下文
      requestContext = this.requestContextManager.createRequestContext(
        this.info.id,
        request,
        {
          customConfig: options?.customConfig
        }
      );
    } else if (options?.inheritContext) {
      // 继承现有上下文，处理模块切换
      requestContext = await this.requestContextManager.handleModuleTransition(
        options.inheritContext,
        'unknown', // 需要传入前一个模块ID
        this.info.id,
        options?.customConfig ? { ...this.recordingConfig, ...options.customConfig } : undefined
      );
    } else {
      // 创建独立上下文
      requestContext = this.requestContextManager.createRequestContext(
        this.info.id,
        request
      );
    }

    this.currentRequestContext = requestContext;

    // 创建记录周期
    const cycleId = await this.startCyclicRecording(
      operation,
      {
        requestId: requestContext.requestId,
        traceId: requestContext.traceId,
        chainId: requestContext.chainId,
        request: this.sanitizeRequest(request)
      },
      {
        basePath: requestContext.currentPath
      }
    );

    // 记录模块处理开始
    await this.addCyclicRecord(cycleId, {
      phase: 'module_start',
      module: this.info.id,
      timestamp: Date.now(),
      context: {
        traceId: requestContext.traceId,
        moduleStack: [...requestContext.moduleStack]
      }
    });

    return { cycleId, context: requestContext };
  }

  protected async completeRequestWithTracking(
    cycleId: string,
    result?: any,
    error?: Error
  ): Promise<void> {
    if (!this.currentRequestContext) return;

    // 记录模块处理完成
    await this.addCyclicRecord(cycleId, {
      phase: 'module_complete',
      module: this.info.id,
      result: result ? this.sanitizeResult(result) : undefined,
      error: error?.message,
      timestamp: Date.now()
    });

    // 完成记录周期
    await this.endCyclicRecording(cycleId, result, error);

    // 完成请求上下文
    await this.requestContextManager.completeRequest(
      this.currentRequestContext.requestId,
      result,
      error
    );

    this.currentRequestContext = undefined;
  }

  // 配置变更处理
  private async onConfigChange(newConfig: BaseModuleRecordingConfig): Promise<void> {
    // 处理动态配置变更
    const oldConfig = this.recordingConfig;
    this.recordingConfig = ConfigValidator.validate(newConfig);

    // 检查是否需要路径变更
    if (this.hasPathChange(oldConfig, this.recordingConfig)) {
      // 处理路径变更，保持链路连续性
      if (this.currentRequestContext) {
        await this.handleConfigPathChange(this.currentRequestContext, oldConfig, this.recordingConfig);
      }
    }

    // 重新初始化记录器（如果需要）
    if (this.requiresReinitialization(oldConfig, this.recordingConfig)) {
      await this.reinitializeRecorders();
    }

    this.logConfigChange(oldConfig, this.recordingConfig);
  }

  // 链路断点检测和修复
  protected async validateAndRepairChain(requestId: string): Promise<boolean> {
    return await this.requestContextManager.repairBrokenChain(requestId);
  }

  // 获取当前请求的链路状态
  protected getCurrentChainStatus(): ChainStatus | null {
    if (!this.currentRequestContext) return null;

    return {
      traceId: this.currentRequestContext.traceId,
      requestId: this.currentRequestContext.requestId,
      currentModule: this.currentRequestContext.currentModule,
      moduleStack: this.currentRequestContext.moduleStack,
      pathHistory: this.currentRequestContext.pathHistory,
      status: this.currentRequestContext.status,
      duration: Date.now() - this.currentRequestContext.startTime
    };
  }
}
```

### 配置验证（增强版）

系统提供了完整的配置验证机制：

```typescript
class ConfigValidator {
  static validate(config: BaseModuleRecordingConfig): ValidatedRecordingConfig {
    // 验证路径模板语法
    // 验证必需字段
    // 验证数值范围
    // 验证文件权限
    // 验证全局一致性
    // 返回验证结果和错误信息
  }

  // 新增：全局配置一致性验证
  static validateGlobalConsistency(
    globalConfig: GlobalRecordingConfig
  ): GlobalConsistencyResult {
    // 验证所有模块配置的一致性
    // 检查关键配置冲突
    // 验证路径兼容性
  }

  // 新增：链路配置验证
  static validateChainConfig(
    modules: string[],
    configs: Map<string, BaseModuleRecordingConfig>
  ): ChainConfigValidationResult {
    // 验证模块间配置兼容性
    // 检查路径切换的连续性
    // 验证文件格式一致性
  }
}
```

### 验证示例

```typescript
const config = {
  enabled: true,
  basePath: '/valid/path',
  cycle: {
    enabled: true,
    // 缺少必需字段会导致验证失败
  }
};

const validated = ConfigValidator.validate(config);

if (!validated.isValid) {
  console.error('配置验证失败:', validated.errors);
  // 处理验证错误
}
```

## 迁移指南

### 从现有BaseModule迁移

1. **无需代码修改**: 现有代码继续工作，记录功能默认关闭
2. **渐进式启用**: 在需要时逐步启用记录功能
3. **配置验证**: 系统会自动验证配置并提供有用的错误信息

### 迁移示例

```typescript
// 现有代码 - 无需修改
class ExistingModule extends BaseModule {
  protected async initialize(): Promise<void> {
    this.logInfo('Module initialized');
  }
}

// 启用记录功能 - 只需添加配置
const module = new ExistingModule({
  id: 'existing-module',
  name: 'Existing Module',
  version: '1.0.0',
  type: 'processor'
}, {
  recordingConfig: {
    enabled: true,
    cycle: {
      enabled: true,
      mode: 'single'
    },
    error: {
      enabled: true
    }
  }
});
```

## 总结

BaseModule重构后的记录系统提供了：

1. **完全可配置**: 所有方面都可以通过配置控制
2. **环状记录**: 支持完整的请求-响应生命周期记录
3. **专门错误记录**: 独立的错误管理和快速查找
4. **灵活的路径管理**: 模板化路径和自定义变量
5. **向后兼容**: 现有代码无需修改
6. **性能优化**: 未启用时零开销

这个设计为RCC系统提供了强大的调试和监控能力，同时保持了系统的简洁性和可维护性。