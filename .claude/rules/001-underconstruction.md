# 规则 #001: UnderConstruction模块使用规范

## 🎯 规则概述

**所有未完成功能必须使用UnderConstruction模块显式声明，严禁使用mock占位符或TODO注释。**

## 📋 适用范围

此规则适用于RCC项目中的所有代码文件，包括但不限于：
- TypeScript/JavaScript文件
- 测试文件
- 配置文件
- 文档中的代码示例

## ✅ 允许的场景

### 必须使用UnderConstruction的情况
1. **未实现功能** - 业务逻辑尚未开发完成
2. **API未集成** - 第三方服务接口未对接
3. **算法未优化** - 当前使用简单实现等待优化
4. **测试未完成** - 功能已实现但测试未覆盖
5. **配置未确定** - 等待产品确认具体需求

## ❌ 禁止的模式

### 严格禁止的占位符
- `// TODO: 实现此功能`
- `// FIXME: 需要修复此功能`
- `throw new Error('Not implemented')`
- `throw new Error('TODO: 未实现')`
- 空的函数实现
- 返回硬编码的临时值

### 错误示例
```typescript
// ❌ 错误：使用TODO注释
function authenticateUser(username: string, password: string): string {
  // TODO: 实现真正的认证逻辑
  return 'temp-token';
}

// ❌ 错误：抛出NotImplemented错误
function updateUserProfile(userId: string, profile: any): any {
  throw new Error('Not implemented');
}

// ❌ 错误：空的函数实现
function deleteAccount(userId: string): void {
  // 这里应该实现删除账户的逻辑
}
```

## ✅ 正确的使用方式

### 标准模式
```typescript
import { underConstruction } from '../utils/underConstructionIntegration';

class UserService {
  private underConstruction = underConstruction;
  
  authenticateUser(username: string, password: string): string {
    // ✅ 正确：使用UnderConstruction模块
    this.underConstruction.callUnderConstructionFeature('user-authentication', {
      caller: 'UserService.authenticateUser',
      parameters: { username, password },
      purpose: '用户登录认证',
      additionalInfo: {
        authType: 'password',
        timestamp: Date.now()
      }
    });
    
    return 'temp-token';
  }
}
```

### API端点模式
```typescript
router.post('/api/users/2fa', (req, res) => {
  // ✅ 正确：在API端点中使用
  underConstruction.callUnderConstructionFeature('two-factor-auth', {
    caller: 'POST /api/users/2fa',
    parameters: req.body,
    purpose: '启用二因素认证'
  });
  
  res.status(501).json({
    error: 'Under Construction',
    message: '该功能正在开发中',
    feature: 'two-factor-auth'
  });
});
```

### 测试模式
```typescript
describe('UserService', () => {
  it('应该正确追踪未完成功能调用', () => {
    const service = new UserService();
    
    // 调用未完成功能
    service.authenticateUser('test', 'password');
    
    // 验证调用记录
    const calls = underConstruction.getCallHistory();
    expect(calls).toHaveLength(1);
    expect(calls[0].featureName).toBe('user-authentication');
  });
});
```

## 🔧 配置要求

### 开发环境
```typescript
moduleInfo.metadata = {
  config: {
    enableTracking: true,        // 启用追踪
    maxHistorySize: 1000,       // 保存历史记录
    throwOnCall: false,         // 不抛出异常
    logToConsole: true          // 控制台输出
  }
};
```

### 测试环境
```typescript
moduleInfo.metadata = {
  config: {
    enableTracking: true,        // 启用追踪
    maxHistorySize: 100,        // 限制历史记录
    throwOnCall: true,          // 测试时抛出异常
    logToConsole: false         // 禁用控制台输出
  }
};
```

### 生产环境
```typescript
moduleInfo.metadata = {
  config: {
    enableTracking: false,       // 生产环境禁用追踪
    maxHistorySize: 0,          // 不保存历史
    throwOnCall: true,          // 调用时抛出异常
    logToConsole: false         // 禁用控制台输出
  }
};
```

## 📊 功能标记标准

### 优先级分类
- **critical** - 关键功能，影响系统核心流程
- **high** - 高优先级，影响用户体验
- **medium** - 中等优先级，功能增强
- **low** - 低优先级，锦上添花

### 功能分类
- **authentication** - 认证相关功能
- **authorization** - 授权相关功能
- **integration** - 第三方集成
- **optimization** - 性能优化
- **ui-enhancement** - 界面增强
- **data-processing** - 数据处理
- **reporting** - 报表功能
- **admin** - 管理功能

## 🔍 验证检查

### 代码审查检查清单
- [ ] 是否使用了UnderConstruction模块替代mock占位符
- [ ] 是否提供了完整的功能描述和预期行为
- [ ] 是否记录了调用位置和上下文信息
- [ ] 是否根据环境配置了适当的行为
- [ ] 是否有适当的优先级和分类

### 自动化检查
- CI/CD流水线应检查是否使用了禁止的占位符模式
- 静态代码分析应检测TODO/FIXME注释
- 测试覆盖率应包含UnderConstruction调用验证

## 📚 相关资源

### 详细文档
- [UnderConstruction使用指南](../../UNDERCONSTRUCTION_USAGE_GUIDELINES.md)
- [集成示例](../../src/utils/underConstructionIntegration.ts)
- [替换示例](../../src/examples/underConstructionReplacementExamples.ts)

### 工具和模板
- [快速开始示例](../../src/examples/quickStartExample.ts)
- [集成完成报告](../../UNDERCONSTRUCTION_INTEGRATION_REPORT.md)

## 🚨 违规处理

### 轻微违规
- 代码审查中标记问题
- 要求开发者修复
- 记录在项目审查报告中

### 严重违规
- 阻止合并到主分支
- 要求重新学习和理解规则
- 可能影响绩效评估

### 重复违规
- 要求参加额外的培训
- 可能影响项目参与权限
- 需要主管批准才能继续提交代码

---

**规则版本：** 1.0  
**最后更新：** 2024-09-11  
**维护者：** RCC开发团队