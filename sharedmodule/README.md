# Shared Module Structure

## 目录结构 (Directory Structure)

```
sharedmodule/
├── basemodule/              # 基础模块
├── Configuration/           # 配置模块
├── errorhandling/           # 错误处理模块
├── pipeline/                # 流水线模块
│   └── src/
│       └── modules/         # 原有流水线模块
├── modules/                 # 新增共享模块
│   ├── index.ts            # 模块导出
│   ├── QwenProviderModule.ts    # Qwen提供商模块
│   └── QwenCompatibilityModule.ts # Qwen兼容性模块
├── QwenPipelineAssemblyFactory.ts    # Qwen流水线组装工厂
├── QwenPipelineConfigOutput.json     # Qwen流水线配置
├── QwenPipelineTest.ts              # Qwen流水线测试
└── QWEN_IMPLEMENTATION_SUMMARY.md   # 实现总结文档
```

## 模块说明 (Module Description)

### 核心Qwen模块 (Core Qwen Modules)

1. **QwenProviderModule** (`modules/QwenProviderModule.ts`)
   - 独立的Qwen提供商模块
   - 实现OAuth 2.0 Device Flow认证
   - 管理token生命周期和自动刷新
   - 处理维护模式切换

2. **QwenCompatibilityModule** (`modules/QwenCompatibilityModule.ts`)
   - Qwen兼容性转换模块
   - OpenAI ↔ Qwen协议转换
   - 字段映射和模型映射
   - 请求/响应验证

### 组装和配置 (Assembly and Configuration)

3. **QwenPipelineAssemblyFactory** (`QwenPipelineAssemblyFactory.ts`)
   - Qwen流水线组装工厂
   - 模块化组件组装
   - 配置驱动的依赖管理

4. **QwenPipelineConfigOutput.json** (`QwenPipelineConfigOutput.json`)
   - 完整的Qwen流水线配置
   - 遵循PIPELINE_CONFIG_OUTPUT_DOCS.md格式
   - 包含路由规则、流水线模板、模块注册表

### 测试和文档 (Testing and Documentation)

5. **QwenPipelineTest.ts** (`QwenPipelineTest.ts`)
   - 完整的测试套件
   - 配置验证、模块兼容性、工厂操作测试

6. **QWEN_IMPLEMENTATION_SUMMARY.md** (`QWEN_IMPLEMENTATION_SUMMARY.md`)
   - 详细的实现总结文档
   - 使用说明和部署指南

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