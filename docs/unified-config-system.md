# RCC 统一配置管理系统

## 概述

RCC 统一配置管理系统提供完整的配置管理解决方案，包括配置验证、迁移、模板生成和实时监听功能。系统支持多重配置源（文件、环境变量、数据库），提供智能错误检测和自动修复建议。

## 主要特性

### 🔧 核心功能
- **统一配置结构** - 标准化的多层配置架构
- **智能验证** - 深度配置验证和依赖关系检查
- **自动迁移** - 从旧版本到新版本的自动迁移
- **实时监听** - 配置文件变更实时响应
- **模板生成** - 基于环境生成标准配置模板

### 📋 配置结构
```typescript
interface UnifiedConfig {
  rcc: RCCConfig;        // RCC核心配置
  modules: ModuleConfig; // 模块系统配置
  pipeline: PipelineConfig; // 流水线配置
  global: GlobalConfig;  // 全局配置
}
```

### 🎯 设计目标
1. **单一配置源** - 消除配置分散问题
2. **类型安全** - 完整的TypeScript类型支持
3. **向后兼容** - 支持旧配置迁移
4. **智能建议** - 运行时配置优化建议
5. **生产就绪** - 包含验证、备份、回滚机制

## 安装和使用

### 基础导入
```typescript
import {
  createConfigManager,
  createValidator,
  createMigrator
} from 'rcc/config';
```

### 快速开始
```typescript
// 创建配置管理器
const configManager = createConfigManager('./rcc-config.json', true);

// 加载配置
await configManager.loadConfig();

// 获取配置
const config = configManager.getConfig();
const serverPort = configManager.getConfigValue('rcc.server.port');
```

## 配置结构详解

### 1. RCC配置 (rcc)
```typescript
interface RCCConfig {
  port?: number;
  server?: {
    port?: number;
    host?: string;
    protocol?: 'http' | 'https';
    cors?: CorsConfig;
    rateLimiting?: RateLimitConfig;
  };
  providers: Record<string, ProviderConfig>;
  virtualModels: Record<string, VirtualModelConfig>;
  pipeline: PipelineConfig;
  debugging?: DebugConfig;
  monitoring?: MonitorConfig;
  security?: SecurityConfig;
}
```

### 2. 模块配置 (modules)
```typescript
interface ModuleConfig {
  global: GlobalModuleConfig;      // 全局模块设置
  discovery: ModuleDiscoveryConfig; // 模块发现配置
  loader: ModuleLoaderConfig;      // 模块加载配置
  errorHandling: ErrorHandlingConfig; // 错误处理配置
}
```

### 3. 全局配置 (global)
```typescript
interface GlobalConfig {
  environment: 'development' | 'staging' | 'production';
  paths: PathConfig;          // 文件路径配置
  performance: PerformanceConfig; // 性能监控配置
  security: SecurityConfig;   // 安全配置
  network: NetworkConfig;     // 网络配置
  storage: StorageConfig;     // 存储配置
}
```

## 配置验证功能

### 基础验证
```typescript
const validator = createValidator();
const validation = await validator.validateConfigFile('./rcc-config.json');

if (validation.valid) {
  console.log('✅ Configuration is valid');
} else {
  console.log('❌ Configuration has errors');
  validation.errors.forEach(error => {
    console.log(`   • ${error.path}: ${error.message}`);
  });
}
```

### 高级验证特性
- **依赖关系检查** - 确保配置项之间相互依赖正确
- **安全扫描** - 检测硬编码密钥和安全问题
- **性能建议** - 识别潜在的性能瓶颈
- **环境适配** - 根据环境进行特定验证

### 自动修复
```typescript
const autoFixResult = await validator.autoFix(config);
if (autoFixResult.fixed) {
  console.log('✅ Configuration was automatically fixed');
  config = autoFixResult.config;
}
```

## 配置迁移功能

### 单文件迁移
```typescript
const migrator = createMigrator({
  backup: true,
  dryRun: false,
  autoFixErrors: true,
  generateReport: true
});

const result = await migrator.migrateConfigFile(
  './old-config.json',
  './new-config.json'
);
```

### 批量迁移
```typescript
const results = await migrator.batchMigrate('./configs', '*.json');

results.forEach(result => {
  console.log(`${result.originalPath}: ${result.success ? '✅' : '❌'}`);
});
```

### 迁移报告
迁移工具会生成详细的迁移报告，包含：
- 总变更数量
- 破坏性变更
- 兼容变更
- 必需操作列表
- 回滚说明

## CLI命令行工具

### 基础命令
```bash
# 初始化配置
rcc-config init --template development --output ./config.json

# 验证配置
rcc-config validate --file ./config.json

# 显示配置
rcc-config show --section rcc.server --output table

# 更新配置
rcc-config set rcc.server.port 8080

# 生成模板
rcc-config template --environment production --providers --pipeline

# 迁移配置
rcc-config migrate --input ./old-config.json --output ./new-config.json
```

### 进阶命令
```bash
# 监听配置变更
rcc-config watch --interval 5000

# 扫描目录批量验证
rcc-config validate --scan ./configs/

# 批量迁移
rcc-config migrate --scan ./configs/ --pattern "*.json"
```

## 配置模板系统

### 环境模板
```typescript
const validator = createValidator();

// 开发环境模板
const devTemplate = validator.createConfigTemplate({
  environment: 'development',
  includeProviders: true,
  includeVirtualModels: false,
  includePipeline: false
});

// 生产环境模板
const prodTemplate = validator.createConfigTemplate({
  environment: 'production',
  includeProviders: true,
  includeVirtualModels: true,
  includePipeline: true
});
```

### 自定义模板
系统支持自定义模板生成，可指定：
- 环境类型
- 包含的组件
- 示例数据
- 默认设置

## 实时监听功能

### 文件监听
```typescript
const configManager = createConfigManager('./config.json', true);

// 设置变更监听器
configManager.on('configChanged', (event) => {
  console.log(`Configuration changed: ${event.key}`);
  console.log(`Old value: ${JSON.stringify(event.oldValue)}`);
  console.log(`New value: ${JSON.stringify(event.newValue)}`);
});

// 设置错误监听器
configManager.on('configError', (error) => {
  console.error('Configuration error:', error);
});

await configManager.loadConfig();
```

### 多源配置监听
支持同时监听多个配置源：
- 文件系统变更
- 环境变量变化
- 数据库存储
- 网络配置服务

## 错误处理和恢复

### 配置错误处理
```typescript
try {
  await configManager.loadConfig();
} catch (error) {
  console.log('Failed to load configuration, using fallback');

  // 使用默认配置
  const defaultConfig = validator.createConfigTemplate({
    environment: 'development'
  });

  await configManager.loadConfig(defaultConfig);
}
```

### 配置恢复机制
- **备份创建** - 自动备份现有配置
- **回滚支持** - 支持回滚到之前版本
- **增量更新** - 仅应用有效变更
- **事务处理** - 确保配置原子性更新

## 最佳实践

### 1. 配置组织
```typescript
// 按功能模块组织配置
const config = {
  rcc: {
    core: { /* 核心设置 */ },
    server: { /* 服务器设置 */ },
    providers: { /* 提供程序设置 */ }
  },
  modules: {
    discovery: { /* 发现设置 */ },
    loader: { /* 加载器设置 */ },
    validation: { /* 验证设置 */ }
  },
  global: {
    environment: 'production',
    security: { /* 安全设置 */ },
    performance: { /* 性能设置 */ }
  }
};
```

### 2. 环境分离
- 开发环境：`rcc-config.dev.json`
- 测试环境：`rcc-config.staging.json`
- 生产环境：`rcc-config.prod.json`

### 3. 配置验证流程
```typescript
// 1. 加载配置
await configManager.loadConfig();

// 2. 执行验证
const validation = await validator.validateConfig(configManager.getConfig());

// 3. 处理错误
if (!validation.valid) {
  // 尝试自动修复
  const autoFix = await validator.autoFix(configManager.getConfig());

  // 重新加载修复后的配置
  await configManager.loadConfig(autoFix.config);
}
```

### 4. 生产环境配置
- 启用安全验证
- 配置SSL/TLS
- 设置日志记录
- 启用监控告警
- 配置备份策略

### 5. 配置文档
- 为每个配置项添加注释
- 使用描述性命名的选项
- 提供配置示例
- 维护配置变更日志

## 故障排除

### 常见问题

**Q: 配置文件无法加载**
```bash
# 检查文件权限
ls -la ./rcc-config.json

# 验证JSON格式
rcc-config validate --file ./rcc-config.json

# 使用绝对路径
rcc-config validate --file /full/path/to/config.json
```

**Q: 配置验证失败**
```typescript
// 获取详细错误信息
const validation = await validator.validateConfigFile('./config.json');
console.log('Errors:', validation.errors);
console.log('Warnings:', validation.warnings);
console.log('Suggestions:', validation.suggestions);
```

**Q: 迁移后配置不生效**
```bash
# 检查迁移报告
rcc-config migrate --input old.json --output new.json --verbose

# 验证迁移后配置
rcc-config validate --file new.json

# 查看必需操作
# 迁移报告中的 requiredActions 部分
```

**Q: 监听功能不工作**
```typescript
// 检查文件系统权限
// 检查文件锁定
// 验证监听模式已启用
const configManager = createConfigManager('./config.json', true);
```

## 性能优化

### 配置加载优化
- 使用缓存机制
- 实现延迟加载
- 优化配置文件大小
- 减少不必要的监听

### 内存管理
- 及时清理监听器
- 使用配置快照
- 实现配置分段加载
- 开启配置压缩

### 验证性能
- 使用增量验证
- 缓存验证结果
- 并行验证流程
- 优化验证算法

## 安全考虑

### 配置安全
- 避免硬编码密钥
- 使用环境变量
- 配置加密存储
- 限制配置访问权限

### 验证安全
- 防止配置注入
- 验证配置源
- 使用安全默认值
- 启用访问控制

## 扩展和定制

### 自定义验证规则
```typescript
class CustomConfigValidator extends ConfigValidator {
  async validateCustomRules(config: UnifiedConfig): Promise<ConfigValidationResult> {
    // 实现自定义验证逻辑
  }
}
```

### 自定义配置提供程序
```typescript
class DatabaseConfigProvider implements ConfigProvider {
  async load(): Promise<UnifiedConfig> {
    // 从数据库加载配置
  }

  async validate(): Promise<ConfigValidationResult> {
    // 验证数据库配置
  }
}
```

### 自定义模板处理器
```typescript
class EnvironmentTemplateGenerator {
  generateTemplate(environment: string): UnifiedConfig {
    // 基于环境生成定制模板
  }
}
```

## 总结

RCC 统一配置管理系统为现代应用提供了完整的配置管理解决方案：

1. **统一性** - 消除了配置分散，提供了单一配置源
2. **智能性** - 智能验证、建议、自动修复功能
3. **兼容性** - 向后兼容，支持平滑迁移
4. **安全性** - 内置安全检查和保护机制
5. **可扩展性** - 支持自定义验证规则和提供程序
6. **生产就绪** - 包含故障恢复、监听、日志等生产功能

系统支持从开发到生产的完整配置生命周期管理，是现代应用配置管理的理想选择。