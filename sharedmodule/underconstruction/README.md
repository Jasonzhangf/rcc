# RCC UnderConstruction

用于显式标记未完成功能的模块，替代 mock 站位，提供明确的开发提示和调用追踪。

## 🎯 核心理念

UnderConstruction 模块的设计理念是：

1. **显式而非隐式** - 明确标识未完成功能，而不是使用 mock 或空实现
2. **可追踪性** - 记录所有调用，便于开发时追踪和调试
3. **自文档化** - 功能描述和预期行为本身就是文档
4. **开发友好** - 提供清晰的提示和统计信息

## ✨ 主要特性

- 🔍 **显式标记** - 明确标识未完成的功能，而不是使用 mock 站位
- 📍 **调用追踪** - 精确记录调用位置，知道哪个文件的哪个函数调用了未完成功能
- 📝 **功能描述** - 记录功能描述和预期行为，说明该功能应该做什么
- 📊 **开发提示** - 提供开发阶段的明确提示和统计信息
- ⚙️ **灵活配置** - 支持多种配置选项，包括异常抛出和日志记录
- 🏗️ **模块化设计** - 继承自 BaseModule，符合 RCC 架构规范
- 🔒 **类型安全** - 完整的 TypeScript 类型定义
- 📈 **统计分析** - 提供未完成功能的详细统计信息

## 📦 安装

```bash
npm install rcc-underconstruction
```

## 🚀 快速开始

### 基本用法

```typescript
import { UnderConstruction } from 'rcc-underconstruction';

// 创建实例
const underConstruction = new UnderConstruction();
await underConstruction.initialize();

// 标记未完成功能
underConstruction.markFeature(
  'user-authentication',
  '用户认证功能',
  {
    intendedBehavior: '验证用户凭据并返回认证令牌',
    priority: 'high',
    category: 'authentication'
  }
);

// 在未实现功能中调用
function authenticateUser(username: string, password: string): string {
  underConstruction.callUnderConstructionFeature('user-authentication', {
    caller: 'authenticateUser',
    parameters: { username, password },
    purpose: '用户登录认证'
  });
  
  return 'temp-token'; // 临时返回值
}
```

### 启用异常抛出

```typescript
const underConstruction = new UnderConstruction();

// 配置为调用未完成功能时抛出异常
const moduleInfo = underConstruction.getInfo();
moduleInfo.config = {
  ...moduleInfo.config,
  throwOnCall: true,
  logToConsole: true
};

await underConstruction.initialize();

// 调用时将抛出 UnderConstructionError
try {
  underConstruction.callUnderConstructionFeature('user-authentication');
} catch (error) {
  if (error instanceof UnderConstructionError) {
    console.error(`调用未完成功能: ${error.featureName}`);
    console.error(`调用位置: ${error.callLocation.file}:${error.callLocation.line}`);
    console.error(`功能描述: ${error.call.feature.description}`);
  }
}
```

## 📚 详细指南

### 1. 功能标记

使用 `markFeature()` 方法标记未完成功能：

```typescript
underConstruction.markFeature(
  'feature-name',                    // 功能名称
  '功能描述',                         // 简短描述
  {                                  // 配置选项
    intendedBehavior: '预期行为描述', // 详细说明该功能应该做什么
    priority: 'high',               // 优先级: 'low' | 'medium' | 'high' | 'critical'
    category: 'authentication',     // 功能分类
    estimatedCompletion: '2024-12-31', // 预计完成时间
    createdBy: 'developer-name'     // 创建者
  }
);
```

### 2. 功能调用

在未实现的功能中调用 `callUnderConstructionFeature()`：

```typescript
function processData(data: any): any {
  // 声明调用了未完成的功能
  underConstruction.callUnderConstructionFeature('data-processor', {
    caller: 'processData',                    // 调用者函数名
    parameters: { data },                     // 调用参数
    purpose: '处理用户数据',                   // 调用目的
    additionalInfo: {                        // 额外信息
      dataType: typeof data,
      timestamp: Date.now()
    }
  });
  
  // 返回临时值或默认值
  return { status: 'pending', message: '功能未完成' };
}
```

### 3. 功能管理

```typescript
// 检查功能状态
const feature = underConstruction.getFeature('user-authentication');
if (feature) {
  console.log(`功能状态: ${feature.status}`);
  console.log(`优先级: ${feature.priority}`);
  console.log(`创建时间: ${new Date(feature.createdAt).toLocaleString()}`);
}

// 获取所有未完成功能
const allFeatures = underConstruction.getUnderConstructionFeatures();
console.log(`共有 ${allFeatures.length} 个未完成功能`);

// 更新功能描述
underConstruction.updateFeatureDescription(
  'user-authentication',
  '用户认证功能（支持多因素认证）',
  '验证用户凭据，支持密码和短信验证'
);

// 完成功能
underConstruction.completeFeature('user-authentication', '功能已完成，通过所有测试');
```

### 4. 统计和监控

```typescript
// 获取统计信息
const stats = underConstruction.getStatistics();
console.log(`总功能数: ${stats.totalFeatures}`);
console.log(`总调用次数: ${stats.totalCalls}`);
console.log(`24小时内调用次数: ${stats.recentCalls24h}`);
console.log('按分类统计:', stats.byCategory);
console.log('按优先级统计:', stats.byPriority);

// 获取调用历史
const recentCalls = underConstruction.getCallHistory(10); // 最近10次调用
recentCalls.forEach(call => {
  console.log(`${new Date(call.timestamp).toLocaleString()}: ${call.featureName} 被调用`);
  console.log(`  位置: ${call.callLocation.file}:${call.callLocation.line}`);
  console.log(`  调用者: ${call.context.caller}`);
  console.log(`  目的: ${call.context.purpose}`);
});
```

### 5. 配置选项

```typescript
const moduleInfo = underConstruction.getInfo();
moduleInfo.config = {
  enableTracking: true,        // 启用追踪功能
  maxHistorySize: 1000,       // 最大历史记录数
  throwOnCall: false,         // 调用时是否抛出异常
  logToConsole: true          // 是否输出到控制台
};

await underConstruction.initialize();
```

## 🏗️ 最佳实践

### 1. 项目初始化时创建单例

```typescript
// src/utils/underConstruction.ts
import { UnderConstruction } from 'rcc-underconstruction';

export const underConstruction = new UnderConstruction();

// 在应用启动时初始化
export async function initUnderConstruction() {
  await underConstruction.initialize();
  
  // 预先标记已知的未完成功能
  underConstruction.markFeature('advanced-search', '高级搜索功能', {
    intendedBehavior: '支持全文搜索、过滤器、排序和分页',
    priority: 'medium',
    category: 'search'
  });
  
  underConstruction.markFeature('real-time-notifications', '实时通知系统', {
    intendedBehavior: '推送实时通知给用户，支持多种通知方式',
    priority: 'high',
    category: 'notifications'
  });
}
```

### 2. 在类中使用

```typescript
class SearchService {
  private underConstruction = underConstruction;
  
  searchAdvanced(query: string, filters: SearchFilters): SearchResult[] {
    // 声明调用了未完成的高级搜索功能
    this.underConstruction.callUnderConstructionFeature('advanced-search', {
      caller: 'SearchService.searchAdvanced',
      parameters: { query, filters },
      purpose: '执行高级搜索'
    });
    
    // 临时实现：返回基本搜索结果
    return this.basicSearch(query);
  }
}
```

### 3. 在 API 端点中使用

```typescript
import { Router } from 'express';
import { underConstruction } from '../utils/underConstruction';

const router = Router();

router.post('/api/users/2fa', (req, res) => {
  // 声明调用了未完成的二因素认证功能
  underConstruction.callUnderConstructionFeature('two-factor-auth', {
    caller: 'POST /api/users/2fa',
    parameters: req.body,
    purpose: '启用二因素认证'
  });
  
  res.status(501).json({
    error: 'Not Implemented',
    message: '二因素认证功能尚未完成',
    feature: 'two-factor-auth'
  });
});
```

### 4. 在测试中使用

```typescript
import { UnderConstruction } from 'rcc-underconstruction';

describe('UserService', () => {
  let userService: UserService;
  let underConstruction: UnderConstruction;

  beforeEach(() => {
    underConstruction = new UnderConstruction();
    underConstruction.getInfo().config = {
      enableTracking: true,
      throwOnCall: false,
      logToConsole: false
    };
    
    userService = new UserService(underConstruction);
  });

  it('应该正确处理未完成的认证功能', () => {
    const result = userService.authenticateUser('test', 'password');
    
    // 验证调用了未完成功能
    const calls = underConstruction.getCallHistory();
    expect(calls).toHaveLength(1);
    expect(calls[0].featureName).toBe('user-authentication');
    
    // 验证返回了临时值
    expect(result).toBe('temp-token');
  });
});
```

### 5. 与错误处理系统集成

```typescript
// 在错误处理中间件中使用
app.use((err, req, res, next) => {
  if (err instanceof UnderConstructionError) {
    return res.status(501).json({
      error: 'Under Construction',
      feature: err.featureName,
      location: `${err.callLocation.file}:${err.callLocation.line}`,
      message: err.message
    });
  }
  
  next(err);
});
```

### 6. 与监控系统集示例

```typescript
// 定期报告未完成功能统计
setInterval(() => {
  const stats = underConstruction.getStatistics();
  
  // 发送到监控系统
  monitoringService.gauge('underconstruction.features', stats.totalFeatures);
  monitoringService.gauge('underconstruction.calls', stats.totalCalls);
  monitoringService.gauge('underconstruction.calls_24h', stats.recentCalls24h);
  
  // 如果高优先级功能被频繁调用，发送告警
  const criticalFeatures = underConstruction.getUnderConstructionFeatures()
    .filter(f => f.priority === 'critical');
    
  if (criticalFeatures.length > 0) {
    monitoringService.increment('underconstruction.critical_features_count');
  }
}, 60000); // 每分钟
```

## 🔧 API 参考

### UnderConstruction 类

#### 构造函数
```typescript
new UnderConstruction()
```

#### 方法

##### `initialize(): Promise<void>`
初始化模块。

##### `markFeature(featureName: string, description: string, options?: UnderConstructionOptions): void`
标记一个功能为未完成状态。

**参数:**
- `featureName` - 功能名称
- `description` - 功能描述
- `options` - 配置选项

##### `callUnderConstructionFeature(featureName: string, context?: CallContext): void`
声明调用了一个未完成的功能。

**参数:**
- `featureName` - 功能名称
- `context` - 调用上下文信息

##### `getUnderConstructionFeatures(): UnderConstructionFeature[]`
获取所有未完成功能。

##### `getFeature(featureName: string): UnderConstructionFeature | undefined`
根据名称获取未完成功能信息。

##### `getCallHistory(limit?: number): UnderConstructionCall[]`
获取调用历史。

##### `completeFeature(featureName: string, completionNotes?: string): boolean`
完成一个功能（从未完成列表中移除）。

##### `updateFeatureDescription(featureName: string, newDescription: string, newIntendedBehavior?: string): boolean`
更新功能描述。

##### `getStatistics(): UnderConstructionStatistics`
获取统计信息。

##### `clearCallHistory(): void`
清除调用历史。

##### `destroy(): Promise<void>`
销毁模块并清理资源。

### 类型定义

#### UnderConstructionOptions
```typescript
interface UnderConstructionOptions {
  intendedBehavior?: string;    // 预期行为描述
  priority?: 'low' | 'medium' | 'high' | 'critical';  // 优先级
  category?: string;           // 功能分类
  estimatedCompletion?: string | Date;  // 预计完成时间
  createdBy?: string;          // 创建者
}
```

#### CallContext
```typescript
interface CallContext {
  caller?: string;                              // 调用者信息
  parameters?: Record<string, any>;             // 调用参数
  purpose?: string;                             // 调用目的
  additionalInfo?: Record<string, any>;         // 额外的上下文信息
}
```

#### UnderConstructionError
```typescript
class UnderConstructionError extends Error {
  public readonly featureName: string;      // 功能名称
  public readonly callLocation: CallLocation; // 调用位置
  public readonly call: UnderConstructionCall; // 调用记录
}
```

## 📖 相关文档

- [使用示例](./USAGE_EXAMPLES.md) - 详细的使用示例和最佳实践
- [API 文档](./docs/) - 完整的 API 参考
- [变更日志](./CHANGELOG.md) - 版本变更记录

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License