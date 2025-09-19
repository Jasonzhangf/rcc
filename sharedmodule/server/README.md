# RCC Server 模块（sharedmodule/server）

## 概述
RCC 服务端核心模块，专注于 HTTP 服务接入和虚拟模型路由。严格遵循"只路由不调度"架构原则，提供高性能的 API 网关功能。

## 架构原则
- **职责分离**: Server 只负责 HTTP 服务和路由，不处理调度或 Provider 实例化
- **流水线优先**: 流水线系统必须先于 Server 初始化，确保调度器就绪
- **无状态路由**: VirtualModelRouter 专注于路由决策，不管理 Provider 生命周期

## 快速开始
1. 安装依赖：`npm install`
2. 构建：`npm run build`  
3. 运行测试：`npm test`

## 文件结构与详细职责

### 核心入口 (src/)
- **index.ts** - 模块导出入口，统一暴露公共接口和类型
- **ServerModule.ts** - 服务器主模块，负责整体配置、依赖注入和生命周期管理

### 组件层 (src/components/)
- **HttpServer.ts** - HTTP 服务器组件，处理端口监听、请求接收、响应返回和连接管理
- **VirtualModelRouter.ts** - 虚拟模型路由组件，实现纯路由功能，将请求转发到对应虚拟模型

### 核心服务层 (src/core/)
- **ServerCore.ts** - 服务器核心逻辑，包含配置管理、状态监控、中间件管理和性能指标收集
- **VirtualModelManager.ts** - 虚拟模型生命周期管理器，负责模型的注册、注销、状态管理和调度器集成

### 业务服务层 (src/services/)
- **RequestHandlerService.ts** - 请求处理服务，封装完整的请求处理流水线：中间件执行、请求路由、错误处理和指标记录

### 接口定义层 (src/interfaces/)
- **IServerModule.ts** - 服务器模块接口契约，定义公共 API 和扩展点

### 类型系统层 (src/types/)
- 请求/响应数据结构、虚拟模型配置、服务器配置、监控指标等类型定义

### 工具函数层 (src/utils/)
- 配置验证、日志工具、性能监控、错误格式化等通用工具函数

### 架构特性
- ✅ 调度器集成通过 `setVirtualModelSchedulerManager()` 方法注入
- ✅ 无 Provider 实例化逻辑，遵循"路由不调度"原则  
- ✅ 清理所有 mock provider 回退逻辑
- ✅ 简化的错误处理，专注于路由职责

## 初始化流程
1. **流水线系统初始化** - 创建 `VirtualModelSchedulerManager`
2. **服务器实例化** - 配置 HTTP 服务和路由组件
3. **调度器绑定** - 通过 `setVirtualModelSchedulerManager()` 注入
4. **服务器启动** - 调用 `initialize()` 开始服务

## 接口与能力
模块暴露以下核心接口：
- `IVirtualModelRouter` - 虚拟模型路由接口
- `IServerModule` - 服务器模块配置接口
- 支持 OpenAPI 标准请求/响应格式

## 错误处理
- 调度器不可用返回明确错误: `Scheduler not available for virtual model execution`
- 遵循标准 HTTP 状态码和错误格式
- 提供详细的诊断日志和监控指标

## 性能特性
- 轻量级路由决策，无运行时 Provider 实例化开销
- 异步请求处理，支持高并发场景
- 内置健康检查和监控端点

## 测试覆盖
- 单元测试验证路由逻辑正确性
- 集成测试确保调度器绑定正常工作
- 端到端测试模拟真实请求流程

## 部署要求
- Node.js 16+ 运行环境
- 必须先初始化流水线系统和调度器
- 支持容器化部署和水平扩展

## 技术支持
如需帮助或报告问题，请在项目仓库创建 Issue。