# RCC Config-Parser Module

[![npm version](https://badge.fury.io/js/rcc-config-parser.svg)](https://badge.fury.io/js/rcc-config-parser)
[![npm](https://img.shields.io/npm/v/rcc-config-parser.svg)](https://www.npmjs.com/package/rcc-config-parser)
[![Build Status](https://github.com/rcc/rcc-config-parser/actions/workflows/build.yml/badge.svg)](https://github.com/rcc/rcc-config-parser/actions/workflows/build.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 概述

RCC Config-Parser Module是RCC生态系统的核心配置解析模块，专注于提供强大、灵活、可扩展的配置处理功能。该模块遵循单一职责原则，专门负责配置数据的解析、验证、加载、转换等核心功能，为上层配置管理模块提供坚实的基础。

## 主要特性

### 🚀 核心功能
- **多格式支持**: JSON、YAML、TOML等配置格式解析
- **环境变量集成**: 自动环境变量替换 (`${VAR_NAME}`)
- **模板处理**: 支持变量插值和模板 (`{{template}}`)
- **数据验证**: 多层次配置数据验证和错误检查
- **流水线生成**: 自动生成流水线配置表

### 🔧 高级特性
- **缓存机制**: 智能缓存提升性能
- **文件监听**: 配置文件热重载
- **备份管理**: 自动配置备份和恢复
- **性能监控**: 完整的执行跟踪和性能统计
- **扩展性**: 支持自定义处理器、验证器、转换器

## 项目架构

### 文件结构详解

```
rcc-config-parser/
├── src/                          # 源代码目录
│   ├── core/                      # 核心功能实现
│   │   ├── ConfigParser.ts       # 配置解析器 - 多格式配置解析, 环境变量替换, 模板处理
│   │   │   ├── 多格式配置解析 (JSON, YAML, TOML)
│   │   │   ├── 环境变量替换 (${VAR})
│   │   │   ├── 模板处理 ({{template}})
│   │   │   ├── 数据预处理和标准化
│   │   │   └── 兼容性处理 (旧格式转换)
│   │   ├── ConfigLoader.ts       # 配置加载器 (221行)
│   │   │   ├── 多源加载 (文件、URL、环境变量)
│   │   │   ├── 缓存机制 (提升性能)
│   │   │   ├── 文件监听 (热重载)
│   │   │   ├── 备份管理 (自动备份)
│   │   │   └── 错误恢复 (加载失败处理)
│   │   ├── PipelineConfigGenerator.ts # 流水线配置生成器 (303行)
│   │   │   ├── 流水线表生成 (ConfigData → PipelineTable)
│   │   │   ├── 虚拟模型映射 (虚拟模型到实际模型)
│   │   │   ├── 负载均衡配置 (权重、策略)
│   │   │   ├── 优先级排序 (按优先级组织)
│   │   │   └── 条目过滤 (启用/禁用状态)
│   │   └── ConfigData.ts           # 数据结构定义 (594行)
│   │       ├── ProviderConfig: 供应商配置
│   │       ├── VirtualModelConfig: 虚拟模型配置
│   │       ├── ConfigValidationResult: 验证结果
│   │       └── PipelineExecutionRecord: 执行记录
│   ├── interfaces/               # 接口定义
│   │   ├── IConfigLoaderModule.ts # 配置加载器接口 (628行)
│   │   │   ├── loadFromSource(): 多源加载
│   │   │   ├── loadAndMerge(): 合并配置
│   │   │   ├── startWatching(): 监听变化
│   │   │   └── registerTransform(): 注册转换器
│   │   └── IConfigPersistenceModule.ts # 持久化接口
│   ├── types/                    # 类型定义
│   │   └── index.ts              # 工具类型和类型守卫 (504行)
│   │       ├── ConfigModuleType: 模块类型
│   │       ├── ConfigFormat: 配置格式
│   │       ├── ConfigurationError: 错误类型
│   │       └── 工具函数和类型守卫
│   ├── constants/                # 常量定义
│   │   └── ConfigurationConstants.ts # 配置常量 (316行)
│   │       ├── 模块信息常量
│   │       ├── 验证常量
│   │       ├── 超时设置
│   │       └── 错误代码
│   └── index.ts                  # 模块导出 (107行)
├── __test__/                     # 测试目录
│   ├── ConfigParser.test.ts      # 解析器测试
│   ├── ConfigLoader.test.ts      # 加载器测试
│   ├── PipelineConfigGenerator.test.ts # 生成器测试
│   └── integration.test.ts       # 集成测试
├── dist/                         # 构建输出目录
│   ├── commonjs/                 # CommonJS格式
│   ├── esm/                      # ES模块格式
│   └── types/                    # TypeScript声明文件
├── package.json                  # 项目配置
├── tsconfig.json                 # TypeScript配置
├── jest.config.cjs               # 测试配置
└── README.md                     # 项目文档
```

### 核心架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    应用层 (Applications)                     │
├─────────────────────────────────────────────────────────────┤
│                    接口层 (Interfaces)                       │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │IConfigLoader    │  │IConfigPersistence│                  │
│  │Module           │  │Module           │                  │
│  └─────────────────┘  └─────────────────┘                  │
├─────────────────────────────────────────────────────────────┤
│                    核心层 (Core)                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   ConfigParser  │  │   ConfigLoader  │  │PipelineGen  │ │
│  │                 │  │                 │  │             │ │
│  │ • parseConfig   │  │ • loadFromFile  │  │ • generate  │ │
│  │ • preprocess    │  │ • saveConfig    │  │ • create     │ │
│  │ • validate     │  │ • createBackup  │  │ • complete   │ │
│  │ • translate     │  │ • cache         │  │ • track     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    数据层 (Data)                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                 ConfigData                              │ │
│  │  • ProviderConfig • VirtualModelConfig • Validation    │ │
│  └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    基础层 (Infrastructure)                   │
│             rcc-basemodule, Node.js APIs                    │
└─────────────────────────────────────────────────────────────┘
```

### 数据流向架构

```
原始配置 → ConfigLoader.loadFromFile() → 缓存检查 → 文件读取 → 格式解析 → 返回ConfigData
    │              │              │                    │
    │              │              │                    └─ 文件监听和备份
    │              │              └─ 性能优化和错误处理
    │              └─ 多源加载支持
    └─ JSON/YAML/TOML格式

ConfigData → ConfigParser.parseConfig() → 数据预处理 → 结构化解析 → 验证 → 标准化ConfigData
    │              │              │                    │
    │              │              │                    └─ 兼容性处理
    │              │              └─ 环境变量替换和模板处理
    │              └─ 数据标准化和转换
    └─ 原始配置数据

标准化配置 → PipelineConfigGenerator.generatePipelineTable() → 创建执行记录 → 处理虚拟模型 → 生成PipelineTable
    │              │              │                    │
    │              │              │                    └─ 性能统计和记录
    │              │              └─ 虚拟模型映射和配置
    │              └─ 流水线表生成逻辑
    └─ 完整的配置数据
```

## 核心组件详解

### 1. ConfigParser (配置解析器)

**职责**: 将原始配置数据解析为标准化的ConfigData结构

**核心功能**:
- 多格式配置解析 (JSON, YAML, TOML)
- 环境变量替换 (`${VAR_NAME}`)
- 模板处理 (`{{template}}`)
- 数据预处理和标准化
- 兼容性处理 (旧格式转换)

**关键方法**:
```typescript
class ConfigParser extends BaseModule {
  // 基础解析
  async parseConfig(rawData: any): Promise<ConfigData>

  // 从文件解析
  async parseConfigFromFile(configPath: string, options?: PreprocessingOptions): Promise<ConfigData>

  // 预处理配置
  async preprocessConfig(rawData: any, options?: PreprocessingOptions): Promise<any>

  // 翻译配置
  async translateConfig(config: ConfigData, locale?: string): Promise<ConfigData>
}
```

### 2. ConfigLoader (配置加载器)

**职责**: 从各种来源加载配置数据

**核心功能**:
- 多源加载 (文件、URL、环境变量、内存)
- 缓存机制 (提升性能)
- 文件监听 (热重载)
- 备份管理 (自动备份)
- 错误恢复 (加载失败处理)

**关键方法**:
```typescript
class ConfigLoader extends BaseModule {
  // 从文件加载
  async loadFromFile(filePath: string, options?: LoadOptions): Promise<ConfigData>

  // 保存配置
  async saveConfig(config: ConfigData, filePath: string, options?: SaveOptions): Promise<void>

  // 创建备份
  async createBackup(filePath: string): Promise<string>

  // 监听文件变化
  async startWatching(filePath: string, callback: (config: ConfigData) => void): Promise<void>
}
```

### 3. PipelineConfigGenerator (流水线配置生成器)

**职责**: 将配置数据转换为流水线表格式

**核心功能**:
- 流水线表生成 (ConfigData → PipelineTable)
- 虚拟模型映射 (虚拟模型到实际模型)
- 负载均衡配置 (权重、策略)
- 优先级排序 (按优先级组织)
- 条目过滤 (启用/禁用状态)

**关键方法**:
```typescript
class PipelineConfigGenerator extends BaseModule {
  // 生成流水线表
  async generatePipelineTable(config: ConfigData): Promise<PipelineTable>

  // 创建执行记录
  private createExecutionRecord(virtualModelId: string, providerId: string, modelId: string): PipelineExecutionRecord

  // 完成执行记录
  private completeExecutionRecord(recordId: string, output?: any, error?: string): void
}
```

## 核心数据结构

### ConfigData (核心配置数据)

```typescript
interface ConfigData {
  version: string;                                    // 配置版本
  providers: Record<string, ProviderConfig>;         // 供应商配置
  virtualModels: Record<string, VirtualModelConfig>; // 虚拟模型配置
  createdAt: string;                                 // 创建时间
  updatedAt: string;                                 // 更新时间
}
```

### ProviderConfig (供应商配置)

```typescript
interface ProviderConfig {
  id: string;                              // 供应商ID
  name: string;                           // 供应商名称
  type: string;                           // 供应商类型
  endpoint?: string;                      // API端点
  models: Record<string, ModelConfig>;    // 可用模型
  auth: {                                // 认证信息
    type: string;                        // 认证类型
    keys: string[];                      // API密钥列表
  };
}
```

### VirtualModelConfig (虚拟模型配置)

```typescript
interface VirtualModelConfig {
  id: string;                           // 虚拟模型ID
  targets: VirtualModelTarget[];        // 目标配置列表
  enabled: boolean;                     // 是否启用
  priority: number;                     // 优先级
  weight?: number;                      // 权重
}

interface VirtualModelTarget {
  providerId: string;                   // 目标供应商ID
  modelId: string;                      // 目标模型ID
  keyIndex: number;                     // 密钥索引
}
```

## 安装

```bash
npm install rcc-config-parser
```

## 依赖要求

```bash
npm install rcc-basemodule uuid
```

## 快速开始

### 基础使用

```typescript
import {
  createConfigParser,
  createConfigLoader,
  createPipelineConfigGenerator
} from 'rcc-config-parser';

// 1. 创建配置处理器
const parser = createConfigParser();
const loader = createConfigLoader();
const generator = createPipelineConfigGenerator();

// 2. 初始化处理器
await Promise.all([
  parser.initialize(),
  loader.initialize(),
  generator.initialize()
]);

try {
  // 3. 加载配置文件
  const config = await loader.loadFromFile('./config.json', {
    enableCache: true,
    watchChanges: true
  });

  // 4. 解析配置
  const parsedConfig = await parser.parseConfig(config);

  // 5. 生成流水线表
  const pipelineTable = await generator.generatePipelineTable(parsedConfig);

  console.log('配置处理完成');
  console.log('流水线条目数量:', pipelineTable.size);

} finally {
  // 6. 清理资源
  await Promise.all([
    parser.destroy(),
    loader.destroy(),
    generator.destroy()
  ]);
}
```

### 环境变量和模板处理

```typescript
import { createConfigParser } from 'rcc-config-parser';

const parser = createConfigParser();
await parser.initialize();

// 设置环境变量
process.env.API_KEY = 'secret-key';
process.env.MODEL_NAME = 'gpt-4';

// 配置文件内容
const configData = {
  version: '1.0.0',
  providers: {
    openai: {
      id: 'openai',
      name: 'OpenAI',
      auth: {
        type: 'api-key',
        keys: ['${API_KEY}']  // 环境变量替换
      },
      models: {
        '{{MODEL_NAME}}': {  // 模板处理
          endpoint: 'https://api.openai.com/v1/chat/completions'
        }
      }
    }
  },
  virtualModels: {}
};

// 处理配置
const processedConfig = await parser.parseConfig(configData);
console.log('处理后的配置:', processedConfig);
```

### 流水线表生成

```typescript
import { createPipelineConfigGenerator } from 'rcc-config-parser';

const generator = createPipelineConfigGenerator();
await generator.initialize();

// 示例配置数据
const configData = {
  version: '1.0.0',
  providers: {
    openai: {
      id: 'openai',
      name: 'OpenAI',
      models: {
        'gpt-4': {},
        'gpt-3.5-turbo': {}
      }
    }
  },
  virtualModels: {
    'gpt-4-virtual': {
      id: 'gpt-4-virtual',
      enabled: true,
      priority: 1,
      weight: 3,
      targets: [
        {
          providerId: 'openai',
          modelId: 'gpt-4',
          keyIndex: 0
        }
      ]
    }
  }
};

// 生成流水线表
const pipelineTable = await generator.generatePipelineTable(configData);

// 获取流水线条目
const entries = pipelineTable.getEntries();
console.log('流水线条目:', entries);

// 按虚拟模型过滤
const gpt4Entries = pipelineTable.getEntriesByVirtualModel('gpt-4-virtual');
console.log('GPT-4虚拟模型条目:', gpt4Entries);
```

## 高级使用

### 自定义处理器和验证器

```typescript
import { createConfigParser, ConfigTransformer, ConfigValidator } from 'rcc-config-parser';

const parser = createConfigParser();
await parser.initialize();

// 自定义处理器
const customTransformer: ConfigTransformer = (data: any) => {
  // 添加自定义字段
  data.processedAt = new Date().toISOString();
  data.processedBy = 'custom-transformer';
  return data;
};

// 自定义验证器
const customValidator: ConfigValidator = (data: any) => {
  if (data.providers && Object.keys(data.providers).length > 10) {
    return '供应商数量不能超过10个';
  }
  return true;
};

// 使用自定义处理器
const processedConfig = await parser.parseConfig(configData, {
  customProcessors: [customTransformer],
  customValidators: [customValidator]
});
```

### 文件监听和热重载

```typescript
import { createConfigLoader } from 'rcc-config-parser';

const loader = createConfigLoader();
await loader.initialize();

// 启动文件监听
await loader.startWatching('./config.json', (newConfig) => {
  console.log('配置文件已更新:', newConfig.version);

  // 重新生成流水线表
  generator.generatePipelineTable(newConfig).then(pipelineTable => {
    console.log('流水线表已更新，条目数量:', pipelineTable.size);
  });
});

// 监听多个文件
const watchFiles = ['./config.json', './providers.json', './virtual-models.json'];

for (const filePath of watchFiles) {
  await loader.startWatching(filePath, (config) => {
    console.log(`${filePath} 已更新`);
  });
}
```

### 缓存和性能优化

```typescript
import { createConfigLoader } from 'rcc-config-parser';

const loader = createConfigLoader();
await loader.initialize();

// 启用缓存
const config = await loader.loadFromFile('./config.json', {
  enableCache: true,
  cacheExpiry: 300000, // 5分钟
  backup: {
    enabled: true,
    maxBackups: 5,
    backupDir: './backups'
  }
});

// 并行处理多个配置文件
const configFiles = ['./config1.json', './config2.json', './config3.json'];

const configs = await Promise.all(
  configFiles.map(file =>
    loader.loadFromFile(file, { enableCache: true })
  )
);

console.log('批量加载完成:', configs.length);
```

## 配置选项

### 解析选项 (PreprocessingOptions)

```typescript
interface PreprocessingOptions {
  substituteEnvVars?: boolean;     // 环境变量替换
  processTemplates?: boolean;     // 模板处理
  validateData?: boolean;          // 数据验证
  translate?: boolean;             // 翻译配置
  locale?: string;                 // 语言环境
  customProcessors?: ConfigTransformer[]; // 自定义处理器
  customValidators?: ConfigValidator[];   // 自定义验证器
}
```

### 加载选项 (LoadOptions)

```typescript
interface LoadOptions {
  enableCache?: boolean;         // 启用缓存
  cacheExpiry?: number;         // 缓存过期时间
  watchChanges?: boolean;       // 监听文件变化
  backup?: {                    // 备份选项
    enabled: boolean;
    maxBackups: number;
    backupDir: string;
  };
}
```

### 生成选项 (GenerationOptions)

```typescript
interface GenerationOptions {
  includeDisabled?: boolean;    // 包含禁用的条目
  sortByPriority?: boolean;     // 按优先级排序
  filterByProvider?: string[];  // 按提供者过滤
  performanceTracking?: boolean; // 性能跟踪
}
```

## 错误处理

### 错误类型

```typescript
import {
  ConfigurationError,
  ConfigValidationError,
  LoadError
} from 'rcc-config-parser';

try {
  const config = await loader.loadFromFile('./config.json');
} catch (error) {
  if (error instanceof ConfigValidationError) {
    console.error('配置验证错误:', error.message);
    console.error('错误路径:', error.path);
    console.error('期望值:', error.expected);
    console.error('实际值:', error.actual);
  } else if (error instanceof LoadError) {
    console.error('配置加载错误:', error.message);
    console.error('源文件:', error.source);
    console.error('格式:', error.format);
  } else if (error instanceof ConfigurationError) {
    console.error('配置错误:', error.message);
    console.error('错误代码:', error.code);
    console.error('详细信息:', error.details);
  }
}
```

### 错误恢复策略

```typescript
// 带错误恢复的配置加载
async function loadConfigWithFallback(primaryPath: string, fallbackPath: string) {
  try {
    return await loader.loadFromFile(primaryPath);
  } catch (primaryError) {
    console.warn('主配置文件加载失败，尝试备用配置:', primaryError.message);

    try {
      return await loader.loadFromFile(fallbackPath);
    } catch (fallbackError) {
      console.error('备用配置文件也加载失败:', fallbackError.message);

      // 返回默认配置
      return {
        version: '1.0.0',
        providers: {},
        virtualModels: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  }
}
```

## 性能监控

### 执行跟踪

```typescript
import { createPipelineConfigGenerator } from 'rcc-config-parser';

const generator = createPipelineConfigGenerator();
await generator.initialize();

// 生成流水线表（带性能跟踪）
const pipelineTable = await generator.generatePipelineTable(config, {
  performanceTracking: true
});

// 获取性能统计
const stats = generator.getPerformanceStatistics();
console.log('性能统计:', {
  totalProcessingTime: stats.totalProcessingTime,
  averageProcessingTime: stats.averageProcessingTime,
  totalRecordsCreated: stats.totalRecordsCreated,
  cacheHitRate: stats.cacheHitRate
});
```

### 缓存统计

```typescript
import { createConfigLoader } from 'rcc-config-parser';

const loader = createConfigLoader();
await loader.initialize();

// 获取缓存统计
const cacheStats = loader.getCacheStatistics();
console.log('缓存统计:', {
  totalRequests: cacheStats.totalRequests,
  cacheHits: cacheStats.cacheHits,
  cacheMisses: cacheStats.cacheMisses,
  hitRate: cacheStats.hitRate,
  averageCacheTime: cacheStats.averageCacheTime
});
```

## 测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- --grep "ConfigParser"

# 运行覆盖率测试
npm run test:coverage

# 运行集成测试
npm run test:integration
```

## 已知问题和待改进项

### 🚨 需要UnderConstruction模块替换的TODO项目

#### 1. 多语言翻译功能未实现
**位置**: `src/core/ConfigParser.ts`
**状态**: 翻译功能请求但未实现
```typescript
// 当前代码:
this.warn(`Translation to locale ${locale} requested but not implemented`);

// 应该使用UnderConstruction声明:
import { underConstruction } from 'rcc-underconstruction';

underConstruction.callUnderConstructionFeature('config-translation', {
  caller: 'ConfigParser.translateConfig',
  parameters: { config, locale },
  purpose: '配置文件多语言翻译功能，支持国际化配置'
});
```

#### 2. YAML格式支持未实现
**位置**: `src/core/ConfigParser.ts`
**状态**: YAML配置格式解析未实现
```typescript
// 当前代码:
throw new Error('YAML support not implemented');

// 应该使用UnderConstruction声明:
underConstruction.callUnderConstructionFeature('yaml-format-support', {
  caller: 'ConfigParser.parseConfigurationString',
  parameters: { content, format: 'yaml' },
  purpose: 'YAML配置格式的完整解析和处理支持'
});
```

#### 3. TOML格式支持待实现
**位置**: `src/core/ConfigParser.ts`
**状态**: TOML配置格式解析待实现
```typescript
// 应该添加TOML支持:
underConstruction.callUnderConstructionFeature('toml-format-support', {
  caller: 'ConfigParser.parseConfigurationString',
  parameters: { content, format: 'toml' },
  purpose: 'TOML配置格式的完整解析和处理支持'
});
```

### ⚠️ 潜在架构改进点

#### 1. 配置格式扩展机制
当前硬编码支持JSON格式，可以改进为插件式的格式扩展机制。

#### 2. 配置验证规则引擎
可以引入更强大的验证规则引擎，支持复杂的验证逻辑和自定义规则。

#### 3. 配置模板系统
可以开发更强大的配置模板系统，支持模板继承、覆盖和组合。

#### 4. 配置版本迁移
可以添加配置版本迁移功能，自动处理配置格式的向后兼容性。

### 📋 性能优化机会

#### 1. 大型配置文件处理
对于大型配置文件，可以添加流式处理和分块加载机制。

#### 2. 并行配置处理
可以优化多个配置文件的并行处理能力。

#### 3. 配置缓存策略
可以实现更智能的缓存策略，包括依赖关系缓存。

## 开发标准合规性

### ✅ 已符合的开发标准

1. **模块化架构**: 严格遵循RCC模块化架构原则
2. **错误处理**: 完整的错误类型和恢复机制
3. **类型安全**: 完整的TypeScript类型定义
4. **性能监控**: 内置性能统计和监控功能
5. **扩展性**: 支持自定义处理器和验证器

### 🔄 需要改进的方面

1. **UnderConstruction模块集成**: 需要替换未实现功能的错误抛出
2. **配置格式支持**: 需要扩展YAML和TOML格式支持
3. **测试覆盖率**: 需要增加边缘情况和错误场景的测试

### 📝 UnderConstruction使用标准

所有未完成功能必须使用UnderConstruction模块显式声明：

```typescript
import { underConstruction } from 'rcc-underconstruction';

// 标准使用模式
underConstruction.callUnderConstructionFeature('feature-identifier', {
  caller: 'ClassName.methodName',
  parameters: { /* 相关参数 */ },
  purpose: '功能的具体目的和预期行为'
});
```

## 开发指南

### 添加新的配置格式支持

```typescript
class ConfigParser extends BaseModule {
  private async parseConfigurationString(content: string, format: ConfigFormat): Promise<any> {
    switch (format) {
      case 'json':
        return JSON.parse(content);
      case 'yaml':
        // 使用UnderConstruction声明
        underConstruction.callUnderConstructionFeature('yaml-format-support', {
          caller: 'ConfigParser.parseConfigurationString',
          parameters: { content, format: 'yaml' },
          purpose: 'YAML配置格式的完整解析和处理支持'
        });
        return this.parseYaml(content);
      case 'toml':
        // 使用UnderConstruction声明
        underConstruction.callUnderConstructionFeature('toml-format-support', {
          caller: 'ConfigParser.parseConfigurationString',
          parameters: { content, format: 'toml' },
          purpose: 'TOML配置格式的完整解析和处理支持'
        });
        return this.parseToml(content);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }
}
```

### 自定义验证规则

```typescript
interface ValidationRule {
  name: string;
  validate: (value: any, path: string) => boolean | string;
  message?: string;
}

class CustomValidator {
  private rules: ValidationRule[] = [];

  addRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  validate(config: any): ConfigValidationResult {
    const errors: string[] = [];

    for (const rule of this.rules) {
      const result = rule.validate(config, '');
      if (result !== true) {
        errors.push(rule.message || result);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }
}
```

## API 参考

### 导出函数

```typescript
// 创建配置解析器
function createConfigParser(): ConfigParser;

// 创建配置加载器
function createConfigLoader(): ConfigLoader;

// 创建流水线配置生成器
function createPipelineConfigGenerator(): PipelineConfigGenerator;

// 快速解析配置文件
async function parseConfigFile(filePath: string, options?: ParseOptions): Promise<ConfigData>;

// 快速生成流水线表
async function generatePipelineTable(config: ConfigData): Promise<PipelineTable>;
```

### 核心类

```typescript
class ConfigParser extends BaseModule {
  async initialize(): Promise<void>;
  async destroy(): Promise<void>;
  async parseConfig(rawData: any): Promise<ConfigData>;
  async parseConfigFromFile(configPath: string, options?: PreprocessingOptions): Promise<ConfigData>;
  async preprocessConfig(rawData: any, options?: PreprocessingOptions): Promise<any>;
}

class ConfigLoader extends BaseModule {
  async initialize(): Promise<void>;
  async destroy(): Promise<void>;
  async loadFromFile(filePath: string, options?: LoadOptions): Promise<ConfigData>;
  async saveConfig(config: ConfigData, filePath: string, options?: SaveOptions): Promise<void>;
  async startWatching(filePath: string, callback: (config: ConfigData) => void): Promise<void>;
  async stopWatching(filePath: string): Promise<void>;
}

class PipelineConfigGenerator extends BaseModule {
  async initialize(): Promise<void>;
  async destroy(): Promise<void>;
  async generatePipelineTable(config: ConfigData, options?: GenerationOptions): Promise<PipelineTable>;
  getPerformanceStatistics(): PerformanceStatistics;
}
```

## 最佳实践

### 1. 模块初始化

```typescript
// ✅ 正确：总是初始化模块
const parser = createConfigParser();
await parser.initialize();

// ❌ 错误：忘记初始化
const parser = createConfigParser();
await parser.parseConfig(data); // 可能失败
```

### 2. 资源清理

```typescript
// ✅ 正确：使用 try-finally 确保清理
const loader = createConfigLoader();
await loader.initialize();

try {
  const config = await loader.loadFromFile('./config.json');
  // 处理配置...
} finally {
  await loader.destroy(); // 确保清理资源
}
```

### 3. 错误处理

```typescript
// ✅ 正确：具体的错误处理
try {
  const config = await loader.loadFromFile('./config.json');
} catch (error) {
  if (error instanceof ConfigValidationError) {
    // 处理验证错误
  } else if (error instanceof LoadError) {
    // 处理加载错误
  } else {
    // 处理其他错误
  }
}
```

### 4. 性能优化

```typescript
// ✅ 正确：使用缓存和并行处理
const configs = await Promise.all([
  loader.loadFromFile('./config1.json', { enableCache: true }),
  loader.loadFromFile('./config2.json', { enableCache: true }),
  loader.loadFromFile('./config3.json', { enableCache: true })
]);
```

## 贡献指南

1. Fork 项目
2. 创建功能分支: `git checkout -b feature/amazing-feature`
3. 提交更改: `git commit -m 'Add amazing feature'`
4. 推送到分支: `git push origin feature/amazing-feature`
5. 创建Pull Request

## 许可证

本项目采用MIT许可证 - 详见 [LICENSE](LICENSE) 文件

## 支持

如有问题，请在 [GitHub Issues](https://github.com/rcc/rcc-config-parser/issues) 页面提交问题。

## 相关项目

- [RCC Base Module](https://github.com/rcc/rcc-basemodule) - 核心框架基础模块
- [RCC Bootstrap](https://github.com/rcc/rcc-bootstrap) - 系统初始化模块
- [RCC Server](https://github.com/rcc/rcc-server) - HTTP服务器模块
- [RCC Pipeline](https://github.com/rcc/rcc-pipeline) - 流水线管理模块

---

**使用 ❤️ 构建 by RCC开发团队**