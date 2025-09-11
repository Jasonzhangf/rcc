# UnderConstruction 模块使用示例

## 概述

UnderConstruction 模块用于显式标记未完成的功能，替代 mock 站位，提供明确的开发提示和调用追踪。

## 基本使用

### 1. 标记未完成功能

```typescript
import { UnderConstruction } from './src/UnderConstruction';

const underConstruction = new UnderConstruction();
await underConstruction.initialize();

// 标记一个未完成的功能
underConstruction.markFeature(
  'user-authentication',
  '用户认证功能',
  {
    intendedBehavior: '验证用户凭据并返回认证令牌',
    priority: 'high',
    category: 'authentication',
    estimatedCompletion: '2024-12-31',
    createdBy: 'security-team'
  }
);
```

### 2. 在未实现功能中调用

```typescript
class UserService {
  private underConstruction = new UnderConstruction();
  
  constructor() {
    this.underConstruction.initialize();
  }

  authenticateUser(username: string, password: string): string {
    // 声明调用了未完成的功能
    this.underConstruction.callUnderConstructionFeature('user-authentication', {
      caller: 'UserService.authenticateUser',
      parameters: { username, password },
      purpose: '用户登录认证'
    });
    
    // 临时返回默认值
    return 'temp-token';
  }
}
```

### 3. 检查功能状态

```typescript
// 检查特定功能是否未完成
const feature = underConstruction.getFeature('user-authentication');
if (feature) {
  console.log(`功能状态: ${feature.status}`);
  console.log(`优先级: ${feature.priority}`);
  console.log(`描述: ${feature.description}`);
}

// 获取所有未完成功能
const allFeatures = underConstruction.getUnderConstructionFeatures();
console.log(`共有 ${allFeatures.length} 个未完成功能`);
```

## 高级用法

### 1. 启用异常抛出

```typescript
const underConstruction = new UnderConstruction();
const moduleInfo = underConstruction.getModuleInfo();

// 配置为调用未完成功能时抛出异常
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

### 2. 功能完成和更新

```typescript
// 完成功能
underConstruction.completeFeature('user-authentication', '功能已完成，通过了所有测试');

// 更新功能描述
underConstruction.updateFeatureDescription(
  'user-authentication',
  '用户认证功能（支持多因素认证）',
  '验证用户凭据，支持密码和短信验证'
);
```

### 3. 统计和监控

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
  console.log(`${call.timestamp}: ${call.featureName} 被调用`);
  console.log(`  位置: ${call.callLocation.file}:${call.callLocation.line}`);
  console.log(`  调用者: ${call.context.caller}`);
});
```

## 最佳实践

### 1. 在项目初始化时创建单例

```typescript
// src/utils/underConstruction.ts
import { UnderConstruction } from '../sharedmodule/underconstruction';

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

### 3. 在API端点中使用

```typescript
app.post('/api/users/2fa', (req, res) => {
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
describe('UserService', () => {
  let userService: UserService;
  let underConstruction: UnderConstruction;

  beforeEach(() => {
    underConstruction = new UnderConstruction();
    underConstruction.getModuleInfo().config = {
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

## 集成建议

### 1. 与错误处理系统集成

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

### 2. 与监控系统集成

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

### 3. 与文档生成系统集成

```typescript
// 生成未完成功能报告
function generateUnderConstructionReport() {
  const features = underConstruction.getUnderConstructionFeatures();
  const stats = underConstruction.getStatistics();
  
  return {
    summary: stats,
    features: features.map(f => ({
      name: f.name,
      description: f.description,
      intendedBehavior: f.intendedBehavior,
      priority: f.priority,
      category: f.category,
      estimatedCompletion: f.estimatedCompletion,
      callLocation: f.callLocation,
      createdAt: new Date(f.createdAt).toISOString()
    }))
  };
}
```

## 注意事项

1. **不要在生产环境中启用异常抛出**：仅在开发和测试环境中启用 `throwOnCall`
2. **定期清理已完成的功能**：使用 `completeFeature` 方法标记功能完成
3. **保持功能描述更新**：及时更新功能的描述和预期行为
4. **合理设置历史记录大小**：根据项目需求调整 `maxHistorySize`
5. **分类管理功能**：使用有意义的分类来组织未完成功能