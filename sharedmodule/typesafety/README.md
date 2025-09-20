# 🔒 RCC TypeSafety

[![npm version](https://badge.fury.io/js/rcc-typesafety.svg)](https://badge.fury.io/js/rcc-typesafety)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

一个全面的 TypeScript 类型安全和 JSON 验证框架，专为 RCC项目设计，帮助将 JavaScript 代码安全地迁移到 TypeScript。

## 🎯 功能特性

### 🛡️ JSON 安全解析
- **SafeJSON**: 增强的 JSON 解析器，支持深度限制、大小检查和安全验证
- **Schema 验证**: 基于 Zod 的 JSON Schema 验证
- **错误上下文**: 详细的错误信息和位置追踪
- **安全选项**: 防止循环引用、内存耗尽和代码注入

### 🔧 环境变量安全访问
- **SafeEnv**: 类型安全的环境变量访问器
- **自动类型转换**: string → number, string → boolean, string → JSON
- **验证规则**: 枚举、正则表达式、长度限制、自定义验证器
- **访问审计**: 记录环境变量访问历史和安全分析

### 📦 动态导入安全验证
- **SafeDynamicImport**: 类型安全的动态导入管理
- **路径验证**: 防止路径遍历和恶意文件加载
- **安全检查**: 依赖分析、危险代码检测、沙箱模式
- **性能优化**: 模块缓存、批量导入、并行验证

### 🔄 代码迁移工具
- **JS2TSTransformer**: 自动化 JavaScript → TypeScript 转换
- **JSON.parse 迁移**: 自动添加类型注解和验证
- **类型声明生成**: 从 JavaScript 代码生成 TypeScript 声明
- **批量处理**: 支持文件和目录级别的批量转换

### 📋 预设 Schema
- **package.json**: 完整的 npm 包配置Schema
- **tsconfig.json**: TypeScript 配置Schema
- **RCC 配置**: 专门为 RCC 项目设计的配置Schema
- **模块配置**: BaseModule 和其他模块的配置Schema

## 📦 安装

```bash
# NPM
npm install rcc-typesafety

# Yarn
yarn add rcc-typesafety

# PNPM
pnpm add rcc-typesafety
```

## 🚀 快速开始

### 1. JSON 安全解析

```typescript
import { SafeJSON, packageJsonSchema } from 'rcc-typesafety';

// 基础安全解析
const data = SafeJSON.parse<ConfigType>(jsonString);

// 带 Schema 验证的解析
const packageJson = SafeJSON.parseAndValidate(
  packageJsonContent,
  packageJsonSchema
);

// 从文件解析并验证
const config = await SafeJSON.parseAndValidateFromFile(
  './config.json',
  schema
);
```

### 2. 环境变量安全访问

```typescript
import { SafeEnv } from 'rcc-typesafety';

const env = new SafeEnv('MYAPP_');

// 字符串变量
const apiKey = env.getString('API_KEY', { required: true });

// 数字变量
const port = env.getNumber('PORT', {
  default: 3000,
  min: 1000,
  max: 65535
});

// 布尔变量
const debug = env.getBoolean('DEBUG');

// JSON 变量
const config = env.getJSON<ConfigType>('APP_CONFIG');

// 枚举验证
const envType = env.getEnum('ENV', ['development', 'staging', 'production']);
```

### 3. 安全的动态导入

```typescript
import { SafeDynamicImport } from 'rcc-typesafety';

const safeImport = SafeDynamicImport.getInstance();

// 安全导入并验证导出
const module = await safeImport.import('./my-module.js', {
  requiredExports: ['initialize', 'cleanup'],
  securityLevel: 'medium'
});

// 批量导入
const modules = await safeImport.importBatch({
  core: './core/module.js',
  utils: './utils/helpers.js'
});

// 模块安全验证
const validation = await safeImport.validateModule('./module.js', {
  securityLevel: 'high',
  allowedExtensions: ['.js', '.ts'],
  timeout: 5000
});
```

### 4. 代码自动转换

```typescript
import { JS2TSTransformer, JSONParseMigrator } from 'rcc-typesafety';

const transformer = new JS2TSTransformer();

// 转换单个文件
const result = await transformer.transformFile('./src/server.js', {
  createBackup: true,
  verbose: true
});

// 批量转换目录
const results = await transformer.transformDirectory('./src', {
  recursive: true,
  fileTypes: ['.js', '.mjs'],
  excludePatterns: [/node_modules/, /test/]
});

// 自动迁移 JSON.parse 调用
const { content, migrations } = JSONParseMigrator.migrateJSONParseCalls(
  sourceCode,
  {
    addTypeAssertions: true,
    defaultType: 'any'
  }
);
```

### 5. 完整的类型安全环境

```typescript
import { createTypeSafeEnvironment } from 'rcc-typesafety';

// 创建完整的类型安全环境
const env = createTypeSafeEnvironment('MYAPP_');

// 使用便捷函数验证和解析数据
const packageJson = env.validatePackageJson(packageJsonContent);
const rccConfig = env.validateRCCConfig(configContent);

// 综合验证
await env.safeJson.parseAndValidateFromFile('./config.json', schema);
const apiKey = env.safeEnv.getString('API_KEY', { required: true });
const module = await env.safeDynamicImport.import('./module.js');
```

## 📋 Schema 支持

### 核心 Schema
- **Core Schemas**: `packageJsonSchema`, `tsconfigSchema`
- **Config Schemas**: `rccConfigSchema`, `providerConfigSchema`, `virtualModelConfigSchema`
- **Module Schemas**: `baseModuleConfigSchema`, `moduleManifestSchema`

### 使用预设 Schema

```typescript
import { rccConfigSchema, providerConfigSchema } from 'rcc-typesafety/schemas';

// 验证 RCC 配置
const rccConfig = SafeJSON.parseAndValidate(configContent, rccConfigSchema);

// 验证提供程序配置
const providerConfig = SafeJSON.parseAndValidate(providerContent, providerConfigSchema);

// 验证配置文件
const validationResult = await ConfigValidator.validateConfigFile(
  './rcc-config.json',
  rccConfigSchema
);
```

## 🔧 配置选项

### JSON 解析选项

```typescript
interface JSONParseOptions {
  allowComments?: boolean;           // 允许注释
  allowTrailingCommas?: boolean;     // 允许尾随逗号
  maxDepth?: number;                 // 最大深度限制（默认100）
  maxStringLength?: number;          // 最大字符串长度（默认10MB）
  maxArrayLength?: number;           // 最大数组长度（默认10000）
  maxObjectProperties?: number;      // 最大对象属性数（默认1000）
}
```

### 环境变量选项

```typescript
interface EnvAccessOptions {
  default?: string;                  // 默认值
  required?: boolean;                // 是否必需
  pattern?: RegExp;                  // 验证正则表达式
  enum?: string[];                   // 枚举值
  minLength?: number;                // 最小长度
  maxLength?: number;                // 最大长度
  validator?: (value: string) => boolean | string; // 自定义验证器
  description?: string;              // 描述信息
}
```

### 动态导入选项

```typescript
interface DynamicImportOptions {
  pathValidation?: 'strict' | 'loose' | 'none';  // 路径验证级别
  securityLevel?: 'high' | 'medium' | 'low';     // 安全检查级别
  timeout?: number;                                // 超时时间（毫秒）
  maxRetries?: number;                            // 最大重试次数
  sandboxed?: boolean;                            // 沙箱模式
  allowedDependencies?: string[];                  // 允许的依赖
  blockedDependencies?: string[];                  // 禁止的依赖
}
```

## 📖 错误处理

### 专门的错误类型

```typescript
import {
  JSONParseError,
  JSONValidationError,
  EnvAccessError,
  DynamicImportError,
  ModuleSecurityError
} from 'rcc-typesafety';

try {
  const result = SafeJSON.parseAndValidate(jsonString, schema);
} catch (error) {
  if (error instanceof JSONParseError) {
    console.error('Parse error at position:', error.position);
  } else if (error instanceof JSONValidationError) {
    console.error('Validation errors:', error.errors);
  } else if (error instanceof EnvAccessError) {
    console.error('Environment variable error:', error.varName);
  } else if (error instanceof DynamicImportError) {
    console.error('Import error:', error.modulePath);
  } else if (error instanceof ModuleSecurityError) {
    console.error('Security error:', error.securityIssue);
  }
}
```

## 📊 性能特征

### 基准测试 (Node.js 18)

| 操作 | 平均时间 | 内存使用 |
|------|----------|----------|
| JSON 解析 (1KB) | 0.1ms | 低 |
| JSON 解析 (100KB) | 2.3ms | 低 |
| Schema 验证 | +0.5ms | 低 |
| 环境变量访问 | 0.01ms | 极低 |
| 动态导入验证 | 5-50ms | 中等 |
| 代码转换 (1KB 文件) | 10-30ms | 中等 |

### 性能优化

1. **内存缓存**: 模块导入和环境变量访问结果缓存
2. **批量处理**: 支持批量文件转换和验证
3. **并行执行**: 并发处理多个文件和操作
4. **流式处理**: 大文件支持流式验证
5. **资源限制**: 防止内存耗尽和时间超限

## 🧪 测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- --testPathPattern=safeJson.test.ts

# 覆盖率测试
npm run test:coverage

# 性能测试
npm run test:performance
```

## 📚 示例

### 快速示例

```bash
# 查看基础使用示例
npm run example:basic

# 查看迁移示例
npm run example:migration

# 查看配置验证示例
npm run example:config
```

### 实际项目集成

```typescript
// main.ts
import { createTypeSafeEnvironment } from 'rcc-typesafety';
import { rccConfigSchema } from 'rcc-typesafety/schemas';

async function main() {
  const env = createTypeSafeEnvironment('RCC_');

  try {
    // 加载并验证配置
    const configPath = env.safeEnv.getString('CONFIG_PATH', {
      default: './rcc-config.json'
    });

    const config = await env.safeJson.parseAndValidateFromFile(
      configPath,
      rccConfigSchema
    );

    console.log(`✅ 配置加载成功: ${config.name}`);
    console.log(`   端口: ${config.server?.port}`);
    console.log(`   提供程序: ${Object.keys(config.providers || {}).length} 个`);

    // 安全加载模块
    const coreModule = await env.safeDynamicImport.import('./modules/core.js', {
      requiredExports: ['initialize', 'start'],
      securityLevel: 'medium'
    });

    await coreModule.initialize(config);

  } catch (error) {
    console.error('❌ 启动失败:', error);
    process.exit(1);
  }
}

main().catch(console.error);
```

## 🔗 相关模块

- **rcc-basemodule**: RCC 基础模块框架
- **rcc-errorhandling**: 错误处理和中管理
- **rcc-configuration**: 高级配置管理
- **rcc-pipeline**: 流水线系统管理

## 📄 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件获取详情。

## 🤝 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解如何进行贡献。

## 📞 支持

- GitHub Issues: [报告问题或请求功能](https://github.com/rcc/rcc-typesafety/issues)
- 文档: [详细文档和示例](https://github.com/rcc/rcc-typesafety/wiki)
- 迁移指南: [JavaScript → TypeScript 迁移](examples/migration-guide.md)

---

Made with ❤️ by the RCC Team