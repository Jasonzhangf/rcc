# RCC 共享模块架构

## 架构概览

RCC 共享模块采用模块化设计，提供可复用的核心功能组件。每个模块专注于特定的功能领域，通过标准化接口实现模块间的协作。

## 目录结构 (Directory Structure)

```
sharedmodule/
├── basemodule/              # 基础模块定义
│   └── src/
│       └── BaseModule.ts    # 所有模块的基类（唯一定义）
├── config-parser/           # 配置解析核心模块
│   └── src/
│       ├── core/
│       │   ├── ConfigLoader.ts           # 配置加载器
│       │   ├── ConfigValidator.ts        # 配置验证器
│       │   ├── ConfigTransformer.ts      # 配置转换器
│       │   └── PipelineConfigGenerator.ts # 流水线配置生成器
│       ├── interfaces/      # 接口定义
│       ├── types/          # 类型定义
│       └── index.ts        # 模块导出
├── config-management/       # 配置管理模块
│   └── src/
│       ├── core/
│       │   └── ConfigurationModule.ts   # 配置管理主模块
│       ├── webui/          # Web UI 组件
│       └── index.ts        # 管理层导出
├── errorhandling/          # 错误处理中心
├── pipeline/               # 流水线框架
├── cli-framework/          # CLI 框架
├── server/                 # 服务器框架
├── underconstruction/      # 开发模式支持
├── bootstrap/              # 启动引导模块
├── dynamic-routing-classification/    # 动态路由分类
└── README.md              # 本文档
```

## 模块说明 (Module Description)

### 1. 核心基础设施模块

#### BaseModule (`basemodule/`)
- **作用**: 所有模块的基类，提供标准化接口
- **核心功能**:
  - 模块生命周期管理 (initialize, destroy)
  - 模块信息标准化 (ModuleInfo)
  - 连接管理和握手机制
  - 资源清理和错误处理
- **重要性**: 系统中唯一的 BaseModule 定义，所有其他模块必须继承此基类

#### ErrorHandling (`errorhandling/`)
- **作用**: 统一的错误处理中心
- **核心功能**:
  - 错误分类和路由
  - 错误恢复策略
  - 错误日志记录
  - 模块间错误传播

### 2. 配置系统模块

#### Config-Parser (`config-parser/`)
- **作用**: 配置解析的核心功能模块
- **核心组件**:
  - `ConfigLoader`: 配置文件加载和解析
  - `ConfigValidator`: 配置验证和约束检查  
  - `ConfigTransformer`: 配置格式转换和数据处理
  - `PipelineConfigGenerator`: 流水线配置生成
- **设计理念**: 专注于核心配置处理逻辑，可被其他模块复用

#### Config-Management (`config-management/`)
- **作用**: 配置管理和 Web UI 模块
- **核心功能**:
  - 调用 config-parser 提供的核心功能
  - 提供 Web UI 和管理界面
  - 配置文件的增删改查操作
  - 配置变更的版本管理
- **设计理念**: 管理层模块，主要负责用户交互和配置管理

### 3. 流水线和框架模块

#### Pipeline (`pipeline/`)
- **作用**: 流水线框架和执行引擎
- **核心功能**:
  - 流水线组装和执行
  - 模块间数据流管理
  - 流水线状态跟踪
  - 并行和串行执行控制

#### CLI-Framework (`cli-framework/`)
- **作用**: 命令行界面框架
- **核心功能**:
  - CLI 命令注册和路由
  - 参数解析和验证
  - 帮助文档自动生成
  - 交互式命令支持

#### Server (`server/`)
- **作用**: HTTP 服务器基础设施
- **核心功能**:
  - HTTP 服务器基础设施
  - 路由和中间件管理
  - API 端点注册
  - 请求/响应处理

### 4. 开发和工具模块

#### UnderConstruction (`underconstruction/`)
- **作用**: 开发模式支持和 Mock 功能
- **核心功能**:
  - 模块开发时的占位实现
  - 开发阶段的 mock 功能
  - 渐进式开发支持
  - 开发时的调试辅助

#### Bootstrap (`bootstrap/`)
- **作用**: 系统启动引导
- **核心功能**:
  - 系统初始化流程
  - 模块加载顺序管理
  - 依赖关系解析
  - 启动配置处理

#### Dynamic-Routing-Classification (`dynamic-routing-classification/`)
- **作用**: 动态路由分类规则引擎
- **核心功能**:
  - 动态路由映射规则
  - 智能请求分类和路由
  - 规则验证和执行
  - 路由兼容性处理

## 使用方式 (Usage)

### 导入模块 (Import Modules)

```typescript
// 从共享模块导入
import { 
  QwenProviderModule, 
  QwenCompatibilityModule 
} from './sharedmodule/modules';

import { QwenPipelineAssemblyFactory } from './sharedmodule/QwenPipelineAssemblyFactory';
```

### 组装Qwen流水线 (Assemble Qwen Pipeline)

```typescript
const factory = QwenPipelineAssemblyFactory.getInstance();
const result = await factory.assemblePipeline(config);

if (result.success) {
  // 使用组装好的流水线
  const modules = result.modules;
  // ...
}
```

### 配置文件 (Configuration File)

```json
{
  "templateId": "qwen-chat-primary",
  "modules": {
    "compatibility": {
      "direction": "openai-to-qwen",
      "modelMapping": {
        "openaiToQwen": {
          "gpt-3.5-turbo": "qwen-turbo"
        }
      }
    },
    "provider": {
      "auth": {
        "type": "qwen",
        "deviceFlow": {
          "enabled": true,
          "clientId": "your_client_id"
        }
      }
    }
  }
}
```

## 依赖关系 (Dependencies)

### 模块依赖 (Module Dependencies)

```
QwenProviderModule
├── basemodule (ModuleInfo, BasePipelineModule)
├── pipeline/src/modules/BasePipelineModule
└── axios

QwenCompatibilityModule
├── basemodule (ModuleInfo, ValidationRule)
└── pipeline/src/modules/BasePipelineModule

QwenPipelineAssemblyFactory
├── basemodule (ModuleInfo)
├── modules/QwenProviderModule
├── modules/QwenCompatibilityModule
└── pipeline/src/modules/* (原有模块)
```

### 运行时依赖 (Runtime Dependencies)

- **rcc-basemodule**: 基础模块接口
- **axios**: HTTP客户端
- **fs**: 文件系统操作
- **crypto**: 加密功能 (PKCE)

## 构建和测试 (Build and Test)

### 安装依赖 (Install Dependencies)

```bash
cd sharedmodule
npm install
```

### 运行测试 (Run Tests)

```bash
# 运行所有测试
npm test

# 运行Qwen特定测试
npm run test:qwen

# 运行特定测试文件
npm test QwenPipelineTest.ts
```

### 构建项目 (Build Project)

```bash
# 构建TypeScript
npm run build

# 构建特定模块
npm run build:modules
```

## 配置说明 (Configuration)

### 环境变量 (Environment Variables)

```bash
# Qwen配置
export QWEN_WORKSPACE_ID="your_workspace_id"
export QWEN_APP_ID="your_app_id"

# 认证配置
export QWEN_CLIENT_ID="your_client_id"
export QWEN_SCOPE="openid profile email model.completion"

# 回调配置
export MAINTENANCE_CALLBACK="your_callback_function"
```

### 认证文件 (Authentication Files)

```
auth/
├── qwen-access-token.json     # 访问令牌
└── qwen-refresh-token.json    # 刷新令牌
```

## 部署指南 (Deployment Guide)

### 生产环境部署 (Production Deployment)

1. **配置认证信息**
   ```bash
   mkdir -p ./auth
   # 配置认证文件
   ```

2. **设置环境变量**
   ```bash
   # 设置必要的环境变量
   ```

3. **启动流水线**
   ```bash
   npm start
   ```

### Docker部署 (Docker Deployment)

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

## 故障排除 (Troubleshooting)

### 常见问题 (Common Issues)

1. **模块导入失败**
   - 检查路径是否正确
   - 确认依赖已安装

2. **认证失败**
   - 检查客户端ID配置
   - 确认认证端点可访问

3. **配置验证失败**
   - 检查JSON格式
   - 确认必填字段完整

### 调试工具 (Debug Tools)

```bash
# 启用调试日志
export DEBUG=qwen:*

# 验证配置
npm run validate:config

# 检查模块状态
npm run check:modules
```

## 贡献指南 (Contributing)

1. 遵循现有代码风格
2. 添加适当的测试
3. 更新相关文档
4. 提交前运行完整测试套件

## 版本历史 (Version History)

### v1.0.0 (2024-01-01)
- 初始版本
- 完整的Qwen集成实现
- OAuth 2.0 Device Flow支持
- OpenAI兼容性转换