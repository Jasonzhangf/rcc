# RCC配置访问控制规范

## 1. 访问控制模型

### 1.1 基于角色的访问控制 (RBAC)
RCC系统采用基于角色的访问控制模型，确保配置文件的安全访问：

| 角色 | 权限 | 说明 |
|------|------|------|
| 系统管理员 | 读写所有配置 | 系统最高权限用户 |
| 模块开发者 | 读写模块配置 | 模块开发和维护人员 |
| 运行时系统 | 读写运行时配置 | 系统运行时进程 |
| 普通用户 | 读写用户配置 | 系统使用用户 |

### 1.2 配置文件分类访问权限

| 配置类型 | 创建者 | 读取权限 | 写入权限 | 删除权限 |
|----------|--------|----------|----------|----------|
| 静态配置 | 开发者 | 所有角色 | 系统管理员、模块开发者 | 系统管理员 |
| 动态配置 | 运行时系统 | 系统管理员、运行时系统 | 运行时系统 | 运行时系统、系统管理员 |
| 用户配置 | 用户 | 用户、系统管理员 | 用户、系统管理员 | 用户、系统管理员 |

## 2. 文件系统权限

### 2.1 目录权限设置
```
目录路径                     权限    所有者      组        说明
----------------------------------------------------------------------------------
src/modules/*/config/       755     developer   developer  模块配置目录
dist/config/runtime/        775     runtime     runtime    运行时配置目录
~/.rcc/config/              700     user        user       用户配置目录
```

### 2.2 文件权限设置
| 文件类型 | 权限 | 说明 |
|----------|------|------|
| 静态配置文件 | 644 | 所有者读写，组和其他用户只读 |
| 动态配置文件 | 664 | 所有者和组读写，其他用户只读 |
| 敏感配置文件 | 600 | 仅所有者可读写 |
| 日志文件 | 644 | 标准读取权限 |

## 3. 敏感配置保护

### 3.1 敏感信息识别
以下配置项被视为敏感信息：
- API密钥和访问令牌
- 数据库连接字符串
- 用户密码和凭证
- 私钥和证书
- 系统安全设置

### 3.2 敏感信息处理
1. **加密存储**: 敏感信息必须加密存储
2. **环境变量优先**: 优先使用环境变量而非配置文件
3. **访问日志**: 记录所有敏感信息访问操作
4. **定期轮换**: 定期更换敏感信息

### 3.3 加密策略
```javascript
// 敏感配置加密示例
{
  "apiKeys": {
    "provider1": "encrypted:AES256:base64encodedEncryptedKey",
    "provider2": "env:PROVIDER2_API_KEY"  // 环境变量引用
  },
  "database": {
    "connectionString": "env:DATABASE_URL"
  }
}
```

## 4. 配置访问审计

### 4.1 审计日志记录
所有配置文件访问操作都必须记录到审计日志中：

```json
{
  "timestamp": "2025-09-14T10:30:45.123Z",
  "user": "system-runtime",
  "action": "read",
  "resource": "/dist/config/runtime/pipeline-config.json",
  "result": "success",
  "ipAddress": "127.0.0.1"
}
```

### 4.2 审计内容
- 访问时间戳
- 访问用户/进程
- 操作类型（读/写/删除）
- 访问资源路径
- 操作结果
- 客户端IP地址

## 5. 访问控制实现

### 5.1 配置管理器API
```typescript
class ConfigurationManager {
  // 读取配置（带权限检查）
  async getConfig(path: string, user: User): Promise<any> {
    // 权限验证
    if (!this.hasReadAccess(path, user)) {
      throw new AccessDeniedError('Insufficient permissions');
    }

    // 记录审计日志
    this.auditLog.recordAccess(user, 'read', path);

    // 返回配置内容
    return this.loadConfig(path);
  }

  // 更新配置（带权限检查）
  async updateConfig(path: string, data: any, user: User): Promise<void> {
    // 权限验证
    if (!this.hasWriteAccess(path, user)) {
      throw new AccessDeniedError('Insufficient permissions');
    }

    // 验证配置数据
    this.validateConfig(path, data);

    // 记录审计日志
    this.auditLog.recordAccess(user, 'write', path);

    // 更新配置文件
    await this.saveConfig(path, data);
  }
}
```

### 5.2 权限验证逻辑
```typescript
class PermissionManager {
  hasReadAccess(filePath: string, user: User): boolean {
    const filePermissions = this.getFilePermissions(filePath);
    return filePermissions.read.includes(user.role);
  }

  hasWriteAccess(filePath: string, user: User): boolean {
    const filePermissions = this.getFilePermissions(filePath);
    return filePermissions.write.includes(user.role);
  }

  private getFilePermissions(filePath: string): FilePermissions {
    // 根据文件路径确定权限规则
    if (filePath.includes('/src/modules/')) {
      return {
        read: ['admin', 'developer', 'runtime'],
        write: ['admin', 'developer']
      };
    }

    if (filePath.includes('/dist/config/runtime/')) {
      return {
        read: ['admin', 'runtime'],
        write: ['admin', 'runtime']
      };
    }

    // 默认权限
    return {
      read: ['admin'],
      write: ['admin']
    };
  }
}
```

## 6. 安全最佳实践

### 6.1 配置文件安全
1. **最小权限原则**: 配置文件只授予必要的最小权限
2. **定期审查**: 定期审查配置文件访问权限
3. **安全备份**: 敏感配置文件的备份也要加密
4. **访问监控**: 实时监控异常配置文件访问行为

### 6.2 运行时安全
1. **内存保护**: 敏感配置在内存中加密存储
2. **进程隔离**: 不同模块的配置访问隔离
3. **超时机制**: 配置访问超时自动终止
4. **异常处理**: 配置访问异常及时告警