# RCC Debug System 重构设计文档

## 概述

本文档描述了RCC调试系统的重构设计，从现有的分散式模块级调试记录重构为统一的事件驱动调试架构。

## 架构设计

### 核心组件

#### 1. DebugEventBus (事件总线)
- **职责**: 提供模块间的事件通信机制
- **特点**: 单例模式，完全解耦
- **位置**: `sharedmodule/basemodule/src/debug/DebugEventBus.ts`

#### 2. DebugCenter (调试中心)
- **职责**: 管理流水线会话，统一记录调试信息
- **特点**: 集中化管理，统一文件格式
- **位置**: `sharedmodule/debug-center/src/DebugCenter.ts`

#### 3. BaseModule (基础模块)
- **职责**: 组织调试内容，通过事件总线发送事件
- **特点**: 解耦调试实现，只负责内容组织
- **位置**: `sharedmodule/basemodule/src/BaseModule.ts`

### 数据流设计

```
BaseModule → DebugEventBus → DebugCenter → 文件系统
    ↓           ↓              ↓
  组织内容    事件传递       统一记录
```

## 接口定义

### DebugEvent 接口
```typescript
export interface DebugEvent {
  sessionId: string;
  moduleId: string;
  operationId: string;
  timestamp: number;
  type: 'start' | 'end' | 'error';
  position: 'start' | 'middle' | 'end';
  data?: {
    input?: any;
    output?: any;
    error?: string;
  };
}
```

### PipelineSession 接口
```typescript
export interface PipelineSession {
  sessionId: string;
  pipelineId: string;
  startTime: number;
  endTime?: number;
  status: 'active' | 'completed' | 'failed';
  operations: Array<{
    operationId: string;
    moduleId: string;
    position: 'start' | 'middle' | 'end';
    startTime: number;
    endTime?: number;
    status: 'running' | 'completed' | 'failed';
    input?: any;
    output?: any;
    error?: string;
  }>;
}
```

### PipelineConfig 接口
```typescript
export interface PipelineConfig {
  pipelineId: string;
  startModule: string;
  middleModules: string[];
  endModule: string;
  recordingMode: 'unified' | 'separated';
}
```

## 配置系统

### 流水线配置格式
```json
{
  "pipelineId": "anthropic-processing-pipeline",
  "name": "Anthropic Request Processing Pipeline",
  "modules": [
    {
      "moduleId": "llmswitch-module",
      "position": "start",
      "debugEnabled": true
    },
    {
      "moduleId": "compatibility-module",
      "position": "middle",
      "debugEnabled": true
    },
    {
      "moduleId": "provider-module",
      "position": "end",
      "debugEnabled": true
    }
  ],
  "debugSettings": {
    "unifiedRecording": true,
    "outputDirectory": "./debug-logs"
  }
}
```

## 文件格式

### 统一会话文件格式
```json
{
  "sessionId": "session-20250918-001",
  "pipelineId": "anthropic-processing-pipeline",
  "startTime": 1726657200000,
  "endTime": 1726657205000,
  "status": "completed",
  "operations": [
    {
      "operationId": "anthropic-request-processing",
      "moduleId": "llmswitch-module",
      "position": "start",
      "startTime": 1726657200000,
      "endTime": 1726657202000,
      "status": "completed",
      "input": {
        "model": "claude-3-sonnet-20240229",
        "messages": [{"role": "user", "content": "列出本目录中所有文件夹"}]
      },
      "output": {
        "convertedRequest": {
          "model": "gpt-3.5-turbo",
          "messages": [{"role": "user", "content": "列出本目录中所有文件夹"}]
        }
      }
    }
  ]
}
```

## 实施计划

### 阶段 1: BaseModule 重构
1. 移除对现有 DebugModule 的直接依赖
2. 添加 DebugEventBus 集成
3. 实现简化的调试事件发送方法

### 阶段 2: DebugEventBus 实现
1. 创建事件总线单例
2. 实现发布/订阅机制
3. 添加事件类型定义

### 阶段 3: DebugCenter 实现
1. 创建调试中心类
2. 实现会话管理
3. 实现统一文件记录

### 阶段 4: 配置系统实现
1. 创建流水线配置系统
2. 实现配置加载机制
3. 添加系统初始化器

### 阶段 5: 迁移和测试
1. 更新现有模块使用新调试系统
2. 创建测试用例
3. 性能优化

## 优势

1. **完全解耦**: BaseModule 和 DebugCenter 通过事件总线通信
2. **统一记录**: 每个流水线会话在单个文件中记录完整信息
3. **高性能**: 事件驱动架构，避免同步阻塞
4. **易维护**: 集中化调试管理，简化调试逻辑
5. **可扩展**: 通过添加事件类型轻松扩展功能

## 迁移指南

### 现有代码迁移
1. 移除对 `DebugModule` 的直接引用
2. 使用新的调试事件发送方法
3. 更新流水线配置文件

### 向后兼容性
- 保持现有API的兼容性
- 逐步迁移现有模块
- 提供迁移工具和文档

## 性能考虑

1. **事件处理**: 使用异步事件处理避免阻塞
2. **文件写入**: 批量写入优化性能
3. **内存管理**: 定期清理完成的会话
4. **并发控制**: 限制并发会话数量

## 监控和日志

1. **调试中心状态监控**
2. **事件处理性能监控**
3. **文件写入状态监控**
4. **错误追踪和报警**

---

**文档版本**: 1.0
**创建日期**: 2025-09-18
**最后更新**: 2025-09-18