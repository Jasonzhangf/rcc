# RCC配置版本管理规范

## 1. 版本控制策略

### 1.1 语义化版本控制
RCC配置文件采用语义化版本控制（Semantic Versioning）：

```
主版本号.次版本号.修订号 (MAJOR.MINOR.PATCH)
```

- **主版本号 (MAJOR)**: 不兼容的API修改
- **次版本号 (MINOR)**: 向后兼容的功能性新增
- **修订号 (PATCH)**: 向后兼容的问题修正

### 1.2 配置文件版本分类

| 配置类型 | 版本控制方式 | 说明 |
|----------|--------------|------|
| 静态配置 | 与代码版本同步 | 随模块代码版本更新 |
| 动态配置 | 时间戳版本 | 基于生成时间戳 |
| 用户配置 | 独立版本管理 | 用户可控制版本 |

## 2. 版本管理实现

### 2.1 静态配置版本管理
静态配置文件版本与模块版本保持一致：

```json
{
  "version": "1.2.3",
  "metadata": {
    "module": "pipeline",
    "type": "static-config",
    "createdAt": "2025-09-14T10:30:45Z",
    "compatibility": ">=1.0.0 <2.0.0"
  },
  "config": {
    // 配置内容
  }
}
```

### 2.2 动态配置版本管理
动态配置文件使用时间戳作为版本标识：

```json
{
  "version": "20250914103045",
  "metadata": {
    "generatedAt": "2025-09-14T10:30:45Z",
    "generator": "pipeline-module",
    "schemaVersion": "1.0.0"
  },
  "config": {
    // 动态生成的配置内容
  }
}
```

### 2.3 用户配置版本管理
用户配置文件支持版本历史追踪：

```json
{
  "version": "1.0.5",
  "history": [
    {
      "version": "1.0.4",
      "updatedAt": "2025-09-13T15:22:30Z",
      "changedBy": "user"
    },
    {
      "version": "1.0.3",
      "updatedAt": "2025-09-12T09:15:45Z",
      "changedBy": "system"
    }
  ],
  "config": {
    // 用户配置内容
  }
}
```

## 3. 版本变更管理

### 3.1 版本升级规则

#### 3.1.1 主版本升级
- 配置结构发生不兼容变更
- 需要迁移脚本支持
- 必须提供升级文档

#### 3.1.2 次版本升级
- 新增可选配置项
- 保持向后兼容
- 可自动升级

#### 3.1.3 修订版本升级
- 修复配置错误
- 优化配置内容
- 无破坏性变更

### 3.2 版本兼容性管理

#### 3.2.1 向后兼容性
```typescript
// 配置兼容性检查
class ConfigCompatibilityChecker {
  static checkCompatibility(currentVersion: string, requiredVersion: string): boolean {
    // 实现版本兼容性检查逻辑
    const current = this.parseVersion(currentVersion);
    const required = this.parseVersion(requiredVersion);

    if (current.major !== required.major) {
      return false;
    }

    if (current.minor < required.minor) {
      return false;
    }

    return true;
  }
}
```

#### 3.2.2 向前兼容性
- 支持旧版本配置文件
- 自动迁移旧配置格式
- 提供配置转换工具

## 4. 版本发布流程

### 4.1 静态配置发布
1. **开发阶段**: 在功能分支中修改配置文件
2. **测试阶段**: 验证配置文件正确性和兼容性
3. **合并阶段**: 合并到主分支并更新版本号
4. **发布阶段**: 随模块一起打包发布

### 4.2 动态配置管理
1. **生成阶段**: 系统运行时自动生成配置
2. **验证阶段**: 验证生成配置的正确性
3. **存储阶段**: 保存到指定目录并记录版本
4. **清理阶段**: 定期清理过期配置版本

### 4.3 用户配置版本控制
1. **变更检测**: 监控用户配置变更
2. **版本创建**: 每次变更创建新版本
3. **历史保存**: 保留指定数量的历史版本
4. **回滚支持**: 支持版本回滚操作

## 5. 版本回滚机制

### 5.1 回滚策略
- **自动回滚**: 系统检测到配置错误时自动回滚
- **手动回滚**: 管理员手动执行回滚操作
- **条件回滚**: 满足特定条件时触发回滚

### 5.2 回滚实现
```typescript
class ConfigRollbackManager {
  async rollbackToVersion(configPath: string, targetVersion: string): Promise<void> {
    // 验证目标版本存在
    const versionExists = await this.versionExists(configPath, targetVersion);
    if (!versionExists) {
      throw new Error(`Version ${targetVersion} not found`);
    }

    // 备份当前配置
    await this.backupCurrentVersion(configPath);

    // 恢复目标版本
    await this.restoreVersion(configPath, targetVersion);

    // 记录回滚操作
    await this.logRollback(configPath, targetVersion);
  }
}
```

## 6. 版本监控和告警

### 6.1 版本监控指标
- 配置文件版本分布
- 版本升级频率
- 回滚操作统计
- 兼容性问题报告

### 6.2 版本告警机制
```typescript
class ConfigVersionMonitor {
  async checkVersionIssues(): Promise<VersionIssue[]> {
    const issues: VersionIssue[] = [];

    // 检查过期配置版本
    const outdatedConfigs = await this.findOutdatedConfigs();
    for (const config of outdatedConfigs) {
      issues.push({
        type: 'outdated',
        configPath: config.path,
        currentVersion: config.version,
        latestVersion: config.latestVersion,
        severity: 'warning'
      });
    }

    // 检查不兼容配置版本
    const incompatibleConfigs = await this.findIncompatibleConfigs();
    for (const config of incompatibleConfigs) {
      issues.push({
        type: 'incompatible',
        configPath: config.path,
        version: config.version,
        requiredVersion: config.requiredVersion,
        severity: 'error'
      });
    }

    return issues;
  }
}
```

## 7. 版本管理工具

### 7.1 配置版本查看工具
```bash
# 查看配置文件版本信息
rcc config version show /path/to/config.json

# 列出配置文件历史版本
rcc config version list /path/to/config.json

# 比较两个版本的差异
rcc config version diff /path/to/config.json v1.0.0 v1.1.0
```

### 7.2 配置版本管理工具
```bash
# 升级配置文件版本
rcc config version upgrade /path/to/config.json --to 1.2.0

# 回滚配置文件版本
rcc config version rollback /path/to/config.json --to 1.0.5

# 验证配置文件版本兼容性
rcc config version validate /path/to/config.json --against 1.0.0
```