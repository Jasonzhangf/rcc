# Pipeline Scheduler Integration for RCC Server Module

## 概述

本文档描述了RCC Server Module与Pipeline Scheduler的完整集成实现。该集成允许Server Module通过Pipeline Scheduler处理虚拟模型请求，提供了负载均衡、错误处理、重试机制等高级功能。

## 架构设计

### 核心组件

1. **ServerModule**: 主要的服务器模块，负责处理HTTP请求和响应
2. **PipelineScheduler**: Pipeline调度器，负责请求分发和负载均衡
3. **VirtualModelRouter**: 虚拟模型路由器，负责模型选择
4. **Integration Layer**: 集成层，处理Server和Pipeline之间的转换

### 数据流

```
Client Request → ServerModule → VirtualModelRouter → PipelineScheduler → PipelineInstance → Client Response
                ↓                    ↓                    ↓
        Direct Processing   Model Selection   Load Balancing
                ↑                    ↑                    ↑
                ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
                                        Fallback
```

## 主要特性

### 1. 依赖注入设计
- 使用接口 `IPipelineScheduler` 实现松耦合
- 通过 `setPipelineScheduler()` 方法注入Pipeline调度器
- 支持运行时动态配置

### 2. 请求转换机制
- **ClientRequest → PipelineRequestContext**: 将HTTP请求转换为Pipeline执行上下文
- **PipelineExecutionResult → ClientResponse**: 将Pipeline执行结果转换为HTTP响应
- 保持请求元数据和追踪信息

### 3. 智能路由
- 优先使用Pipeline Scheduler处理请求
- 支持基于模型ID的Pipeline选择
- 自动负载均衡和故障转移

### 4. 错误处理和回退
- **Pipeline失败时**: 自动回退到直接处理模式
- **可配置回退策略**: 通过 `fallbackToDirect` 配置
- **详细错误日志**: 记录Pipeline执行错误和回退操作

### 5. 状态监控
- **服务器状态**: 包含Pipeline集成状态信息
- **处理方式标识**: 响应头中显示处理方式 (`pipeline` 或 `direct`)
- **健康检查**: 定期检查Pipeline Scheduler健康状态

## 配置选项

### PipelineIntegrationConfig

```typescript
interface PipelineIntegrationConfig {
  enabled: boolean;                    // 是否启用Pipeline集成
  defaultTimeout: number;              // 默认超时时间 (ms)
  maxRetries: number;                  // 最大重试次数
  retryDelay: number;                  // 重试延迟 (ms)
  fallbackToDirect: boolean;           // 是否回退到直接处理
  enableMetrics: boolean;              // 是否启用指标收集
  enableHealthCheck: boolean;          // 是否启用健康检查
  pipelineSelectionStrategy: string;  // Pipeline选择策略
  customHeaders?: Record<string, string>; // 自定义响应头
  errorMapping?: Record<string, number>;   // 错误码映射
}
```

### 默认配置

```typescript
{
  enabled: false,
  defaultTimeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  fallbackToDirect: true,
  enableMetrics: true,
  enableHealthCheck: true,
  pipelineSelectionStrategy: 'round-robin',
  customHeaders: {
    'X-Pipeline-Integration': 'RCC-Server'
  },
  errorMapping: {
    'NO_AVAILABLE_PIPELINES': 503,
    'PIPELINE_SELECTION_FAILED': 500,
    'EXECUTION_FAILED': 500,
    'EXECUTION_TIMEOUT': 504
  }
}
```

## 使用方法

### 1. 基本设置

```typescript
import { ServerModule } from './src/ServerModule';
import { PipelineScheduler } from './pipeline/src/PipelineScheduler';
import { PipelineSystemConfig } from './pipeline/src/PipelineConfig';

// 创建服务器模块
const server = new ServerModule();
server.configure(serverConfig);
await server.initialize();
await server.start();

// 创建Pipeline调度器
const pipelineScheduler = new PipelineScheduler(pipelineConfig);

// 设置Pipeline调度器
await server.setPipelineScheduler(pipelineScheduler);
```

### 2. 请求处理

```typescript
// 处理虚拟模型请求
const response = await server.processVirtualModelRequest(request, virtualModel);

// 响应将包含Pipeline信息
console.log(response.headers['X-Processing-Method']); // 'pipeline' 或 'direct'
console.log(response.headers['X-Pipeline-Id']);      // Pipeline ID
console.log(response.headers['X-Instance-Id']);     // 实例ID
```

### 3. 监控和状态

```typescript
// 获取服务器状态
const status = server.getStatus();
console.log(status.pipelineIntegration);
// {
//   enabled: true,
//   schedulerAvailable: true,
//   processingMethod: 'pipeline',
//   fallbackEnabled: true
// }

// 获取Pipeline集成配置
const config = server.getPipelineIntegrationConfig();
console.log(config.enabled); // true
```

## 错误处理

### Pipeline执行错误

当Pipeline执行失败时，系统会：

1. 记录错误日志
2. 如果启用了回退，则使用直接处理
3. 在响应中包含错误信息
4. 维护错误统计信息

### 常见错误场景

1. **Pipeline不可用**: 回退到直接处理
2. **超时**: 返回504状态码
3. **配置错误**: 抛出配置验证错误
4. **网络错误**: 根据重试配置进行重试

## 性能考虑

### 1. 并发处理
- Pipeline Scheduler支持多实例并发处理
- 自动负载均衡和请求分发
- 可配置的最大并发请求数

### 2. 响应时间
- Pipeline处理可能比直接处理稍慢
- 通过负载均衡优化响应时间
- 支持超时配置

### 3. 资源管理
- 自动清理失败的Pipeline实例
- 定期健康检查和资源回收
- 内存使用优化

## 测试策略

### 单元测试
- 测试Pipeline调度器设置和集成
- 测试请求转换逻辑
- 测试错误处理和回退机制
- 测试状态监控功能

### 集成测试
- 测试完整的请求处理流程
- 测试Pipeline和直接处理的切换
- 测试并发请求处理
- 测试性能和资源使用

### 模拟测试
- 使用Mock对象测试Pipeline Scheduler
- 模拟各种错误场景
- 验证回退机制的正确性

## 部署建议

### 1. 生产环境
- 启用健康检查和监控
- 配置适当的超时和重试
- 使用负载均衡器
- 实施日志记录和警报

### 2. 开发环境
- 使用简化的Pipeline配置
- 启用详细日志记录
- 配置较短的调试超时

### 3. 测试环境
- 使用Mock Pipeline进行测试
- 测试各种错误场景
- 验证回退机制

## 故障排除

### 常见问题

1. **Pipeline Scheduler不可用**
   - 检查Pipeline Scheduler健康状态
   - 验证网络连接
   - 查看错误日志

2. **请求处理缓慢**
   - 检查Pipeline实例负载
   - 验证超时配置
   - 检查网络延迟

3. **回退到直接处理**
   - 检查Pipeline配置
   - 验证Pipeline实例状态
   - 查看错误日志

### 调试工具

1. **状态检查**
   ```typescript
   const status = server.getStatus();
   console.log(status.pipelineIntegration);
   ```

2. **配置验证**
   ```typescript
   const config = server.getPipelineIntegrationConfig();
   console.log(config);
   ```

3. **错误分析**
   ```typescript
   const metrics = server.getMetrics();
   const errorRate = metrics.filter(m => m.status >= 400).length / metrics.length;
   ```

## 扩展功能

### 1. 自定义Pipeline选择策略
可以实现基于请求内容的智能Pipeline选择逻辑。

### 2. 高级监控
添加更详细的性能指标和监控功能。

### 3. 动态配置
支持运行时动态更新Pipeline配置。

### 4. 多租户支持
支持基于租户的Pipeline隔离和管理。

## 总结

这个Pipeline Scheduler集成实现提供了：

- ✅ 完整的依赖注入架构
- ✅ 智能的请求路由和负载均衡
- ✅ 可靠的错误处理和回退机制
- ✅ 全面的监控和状态跟踪
- ✅ 灵活的配置选项
- ✅ 完整的测试覆盖
- ✅ 详细的文档和示例

该集成确保了Server Module能够充分利用Pipeline Scheduler的强大功能，同时保持了系统的可维护性和可扩展性。