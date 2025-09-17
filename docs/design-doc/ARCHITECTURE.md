# RCC 模块化架构设计

本文档描述了 RCC 系统的模块化架构设计，包括核心模块系统和共享模块架构。

## 系统概览

RCC 架构基于模块化设计，提供以下核心能力：

1. **BaseModule 基础类**: 所有模块的标准化基础，提供统一接口
2. **模块注册表**: 集中式模块管理和路由
3. **API 隔离**: 严格控制模块接口访问
4. **连接管理**: 输入/输出接口连接与验证
5. **静态编译动态实例化**: 模块静态编译但动态实例化
6. **开发安全**: 通过 iFlow CLI hooks 进行文件创建验证

## 共享模块架构 (SharedModule Architecture)

### 核心设计原则

- **职责分离**: 每个模块专注于特定功能领域
- **可复用性**: 模块可在不同上下文中复用
- **标准化接口**: 统一的模块接口和生命周期管理
- **配置驱动**: 通过配置文件控制模块行为和组装

## 核心组件

### BaseModule 基础模块

`BaseModule` 类是架构的基础：

- 提供标准化的模块信息结构
- 实现输入/输出接口的连接管理
- 包含数据验证框架
- 支持模块间握手连接
- 确保资源的正确清理

### 共享模块结构

#### 1. 配置系统 (Configuration System)

**config-parser** - 核心配置解析模块：
- `ConfigLoader`: 配置文件加载和解析
- `ConfigValidator`: 配置验证和约束检查
- `ConfigTransformer`: 配置格式转换和数据处理
- `PipelineConfigGenerator`: 流水线配置生成

**config-management** - 配置管理模块：
- 调用 config-parser 提供的核心功能
- 提供 Web UI 和管理界面
- 配置文件的增删改查操作
- 配置变更的版本管理

#### 2. 基础设施模块

**basemodule** - 基础模块定义：
- `BaseModule`: 所有模块的基类
- `ModuleInfo`: 模块信息标准化结构
- 模块生命周期管理接口

**errorhandling** - 错误处理中心：
- 统一的错误处理策略
- 错误分类和路由
- 错误恢复机制

**pipeline** - 流水线框架：
- 流水线组装和执行
- 模块间数据流管理
- 流水线状态跟踪

#### 3. 工具和框架模块

**cli-framework** - 命令行框架：
- CLI 命令注册和路由
- 参数解析和验证
- 帮助文档生成

**server** - 服务器框架：
- HTTP 服务器基础设施
- 路由和中间件管理
- API 端点注册

**underconstruction** - 开发模式支持：
- 模块开发时的占位实现
- 开发阶段的 mock 功能
- 渐进式开发支持

### 模块注册表

`ModuleRegistry` 提供：

- 单例模式的集中式模块管理
- 模块类型注册
- 动态模块实例化
- 按 ID 或类型查找模块

### API 隔离

`ApiIsolation` 工具确保：

- 模块只暴露必要的接口
- 内部实现细节保持隐藏
- 受控的模块功能访问

### 连接管理

系统提供：

- 结构化的连接信息
- 数据传输机制
- 连接状态跟踪

## Key Features

### Static Compilation with Dynamic Instantiation

Modules are designed to be:
- Statically compiled for type safety
- Dynamically instantiated through the registry
- Strictly API isolated

### Module Routing

Modules are registered and routed through:
- Unique module IDs
- Module type classification
- Centralized registry lookup

### Development Security

The project implements security measures during development:

- **File Creation Validation**: iFlow CLI hooks prevent unauthorized file creation
- **Temporary File Management**: Controlled handling of temporary files
- **Audit Trail**: Logging of all file operations for review
- **Policy Enforcement**: Automatic application of security policies

## Implementation Details

### 目录结构

#### 项目根目录结构
```
rcc/
├── sharedmodule/           # 共享模块目录
├── src/                    # 主应用源码
├── docs/                   # 文档
├── config/                 # 配置文件
└── pipeline-logs/          # 流水线日志
```

#### 共享模块目录结构
```
sharedmodule/
├── basemodule/             # 基础模块定义
│   └── src/
│       └── BaseModule.ts   # 基础模块类（唯一定义）
├── config-parser/          # 配置解析核心模块
│   └── src/
│       ├── core/
│       │   ├── ConfigLoader.ts
│       │   ├── ConfigValidator.ts
│       │   ├── ConfigTransformer.ts
│       │   └── PipelineConfigGenerator.ts
│       ├── interfaces/
│       ├── types/
│       └── index.ts
├── config-management/      # 配置管理模块
│   └── src/
│       ├── core/
│       │   └── ConfigurationModule.ts
│       ├── webui/          # Web UI 组件
│       └── index.ts
├── errorhandling/          # 错误处理中心
├── pipeline/               # 流水线框架
├── cli-framework/          # CLI 框架
├── server/                 # 服务器框架
├── underconstruction/      # 开发模式支持
├── bootstrap/              # 启动引导
└── virtual-model-rules/    # 虚拟模型规则
```

#### 主应用目录结构
```
src/
├── core/                   # 核心应用类
├── modules/                # 应用特定模块
├── interfaces/             # 共享接口
├── registry/               # 模块注册表
├── utils/                  # 工具函数
└── index.ts                # 应用入口点
```

### Module Lifecycle

1. **Registration**: Module types are registered with the registry
2. **Instantiation**: Modules are created through the registry
3. **Initialization**: Modules are initialized with standardized process
4. **Connection**: Modules establish connections with validation
5. **Operation**: Modules exchange data through controlled interfaces
6. **Destruction**: Modules are properly cleaned up

## 使用示例

### 配置系统使用

```typescript
// 使用配置解析器
import { ConfigLoader, ConfigValidator, PipelineConfigGenerator } from '../sharedmodule/config-parser';

// 加载配置
const loader = new ConfigLoader();
const config = await loader.loadConfig('config.yaml');

// 验证配置
const validator = new ConfigValidator();
const isValid = await validator.validate(config);

// 生成流水线配置
const generator = new PipelineConfigGenerator();
const pipelineConfig = await generator.generate(config);
```

### 配置管理使用

```typescript
// 使用配置管理模块
import { ConfigurationModule } from '../sharedmodule/config-management';

// 创建配置管理实例
const configModule = new ConfigurationModule({
  name: 'ConfigManager',
  version: '1.0.0',
  description: 'Configuration management module'
});

// 初始化模块
await configModule.initialize();

// 通过管理接口操作配置
const webInterface = configModule.getWebInterface();
```

### 基础模块继承

```typescript
// 继承 BaseModule
import { BaseModule, ModuleInfo } from '../sharedmodule/basemodule';

class CustomModule extends BaseModule {
  constructor(moduleInfo: ModuleInfo) {
    super(moduleInfo);
  }

  async initialize(): Promise<void> {
    // 模块初始化逻辑
  }

  async destroy(): Promise<void> {
    // 模块清理逻辑
  }
}
```

### 模块注册和使用

```typescript
// 注册模块类型
registry.registerModuleType('custom', CustomModule);

// 创建模块实例
const moduleInfo: ModuleInfo = {
  name: 'CustomModule',
  version: '1.0.0',
  description: 'Custom module implementation'
};

const module = await registry.createModule<CustomModule>(moduleInfo);

// 使用受限 API
const moduleApi = ApiIsolation.createModuleInterface(module, {
  methods: ['processMessage', 'receiveData'],
  properties: []
});
```

## 架构优势

### 1. 模块化设计
- **职责分离**: 每个模块专注于特定功能
- **可维护性**: 模块独立开发和维护
- **可测试性**: 模块可独立测试

### 2. 配置驱动
- **灵活性**: 通过配置控制系统行为
- **可扩展性**: 新功能通过配置启用
- **环境适应**: 不同环境使用不同配置

### 3. 标准化接口
- **一致性**: 所有模块遵循相同接口规范
- **互操作性**: 模块间可以无缝协作
- **API 稳定性**: 接口变更有版本控制

### 4. 开发友好
- **渐进式开发**: 支持模块的渐进式实现
- **调试支持**: 完整的日志和调试功能
- **文档完整**: 每个模块都有详细文档

这种架构为构建复杂的模块化应用程序提供了坚实的基础，具有严格的 API 边界和受控的模块交互。