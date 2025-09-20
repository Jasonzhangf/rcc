# RCC 项目开发指引和规则

## 已发布模块清单

### 核心模块

#### 1. rcc-basemodule
- **版本**: 0.1.3
- **描述**: RCC BaseModule - 模块化TypeScript开发的核心框架
- **功能**: 提供基础的模块化架构、消息中心、生命周期管理
- **依赖**: uuid (^9.0.1)
- **npm包**: https://www.npmjs.com/package/rcc-basemodule
- **仓库**: https://github.com/rcc/rcc-basemodule.git

#### 2. rcc-configuration
- **版本**: 0.1.0
- **描述**: RCC Configuration Module - 模块化TypeScript应用的全面配置管理
- **功能**: 配置管理、验证、持久化、Web UI、自动加载、文件监控
- **依赖**: 
  - rcc-basemodule (^0.1.2)
  - ajv (^8.12.0)
  - chokidar (^3.5.3)
  - express (^4.18.2)
  - fs-extra (^11.1.1)
  - lodash (^4.17.21)
  - uuid (^9.0.1)
- **npm包**: https://www.npmjs.com/package/rcc-configuration
- **仓库**: https://github.com/rcc/rcc-configuration.git

#### 3. rcc-errorhandling
- **版本**: 1.0.3
- **描述**: RCC ErrorHandling Center - RCC模块的简单错误处理
- **功能**: 错误分类、错误管理、错误恢复
- **依赖**: rcc-basemodule (>=0.1.0)
- **npm包**: https://www.npmjs.com/package/rcc-errorhandling
- **仓库**: https://github.com/rcc/rcc-errorhandling.git

#### 4. rcc-pipeline
- **版本**: 0.1.0
- **描述**: RCC Pipeline Module System
- **功能**: 流水线系统、工作流管理、模块编排
- **依赖**:
  - rcc-basemodule (^0.1.3)
  - rcc-errorhandling (^1.0.1)
  - axios (^1.6.0)
  - uuid (^9.0.0)
- **npm包**: https://www.npmjs.com/package/rcc-pipeline
- **仓库**: https://github.com/rcc/rcc-pipeline.git

#### 5. rcc-server
- **版本**: 0.1.0
- **描述**: RCC Server Module - 带虚拟模型路由的客户端输入代理响应服务器
- **功能**: HTTP服务器、代理、虚拟模型路由、模块化架构
- **依赖**:
  - rcc-basemodule (>=0.1.0)
  - rcc-underconstruction (>=0.1.0)
  - rcc-virtual-model-rules (^1.0.5)
  - uuid (^9.0.1)
  - express (^4.18.2)
  - cors (^2.8.5)
  - helmet (^7.1.0)
  - compression (^1.7.4)
  - body-parser (^1.20.2)
- **npm包**: https://www.npmjs.com/package/rcc-server
- **仓库**: https://github.com/rcc/rcc-server.git
- **发布状态**: ✅ 已成功发布到npm (2025-09-11)

## 开发规则

### 1. 禁止功能重复模块开发
- **规则**: 所有已发布的模块功能都是唯一的，不允许开发功能重复的新模块
- **目的**: 避免资源浪费，保持代码库的简洁性
- **执行**: 在开发新模块前，必须检查已发布模块清单，确保功能不重复
- **例外**: 如果现有模块无法满足需求，应该通过issue或PR改进现有模块，而不是创建新模块

### 2. 依赖必须使用npm发布渠道版本
- **规则**: 所有模块依赖必须使用npm官方发布渠道的版本，不允许使用本地路径或未发布的版本
- **目的**: 确保依赖的稳定性和可追溯性
- **执行**: 
  - 在package.json中使用明确的版本号或版本范围
  - 不允许使用`file:../path/to/module`这类本地路径依赖
  - 所有RCC内部模块依赖必须使用已发布的npm版本
- **检查**: 在CI/CD流程中验证所有依赖是否来自npm官方渠道

### 3. 模块开发标准
- **命名规范**: 所有RCC模块必须使用`rcc-`前缀
- **版本管理**: 遵循语义化版本控制(SemVer)
- **文档要求**: 每个模块必须包含README.md、CHANGELOG.md、LICENSE文件
- **测试要求**: 所有模块必须有完整的测试覆盖，覆盖率不低于90%
- **发布流程**: 必须通过完整的CI/CD流程验证后才能发布

### 4. 代码质量标准
- **TypeScript**: 所有代码必须使用TypeScript编写
- **ESLint**: 必须配置并运行ESLint检查
- **Prettier**: 必须配置并使用Prettier格式化代码
- **构建工具**: 使用Rollup进行模块打包
- **类型定义**: 必须提供完整的TypeScript类型定义文件

### 5. 模块间依赖关系
- **依赖层级**: 
  - Level 1: rcc-basemodule (基础模块)
  - Level 2: rcc-configuration, rcc-errorhandling (依赖基础模块)
  - Level 3: rcc-pipeline (依赖Level 1和2模块)
  - Level 4: rcc-server (依赖多个模块)
- **循环依赖**: 严格禁止模块间循环依赖
- **版本兼容**: 依赖版本必须明确指定兼容范围

### 6. 本地开发模块使用规范
- **禁止使用npm link**: 所有本地开发模块必须通过`npm install -g`全局安装
- **必须使用发布版本**: package.json中严禁使用`file:`前缀的本地路径依赖
- **开发流程**:
  1. 本地模块开发完成后先执行`npm pack`生成`.tgz`包
  2. 使用`npm install -g ./module-name-1.0.0.tgz`全局安装到本地环境
  3. 在目标项目中使用标准的npm版本依赖，如`"rcc-pipeline": ">=0.1.0"`
- **版本管理**: 即使在开发阶段，也必须遵循语义化版本控制

### 7. 调试系统架构规范

#### 7.1 BaseModule 与 DebugCenter 职责分离
- **BaseModule 调试功能**: 仅作为调试信息输出接口，提供模块内部调试信息的统一输出通道
  - 职责：提供 `startIOTracking()`, `endIOTracking()`, `logDebug()` 等基础调试接口
  - 作用：让所有继承自BaseModule的模块能够输出调试信息到外部调试中心
  - 限制：不负责调试信息的存储、管理、分析，仅作为输出通道

- **DebugCenter 调试管理**: 作为全局调试管理中心，负责调试信息的收集、存储、管理和跨模块协调
  - 职责：初始化全局调试环境、管理调试会话、协调跨模块调试、持久化调试数据
  - 作用：接收所有模块的调试输出，提供统一的调试管理界面和API
  - 定位：独立运行的中心化调试服务，不依赖BaseModule的调试功能

#### 7.2 调试系统设计原则
- **单向数据流**: BaseModule → DebugCenter (调试信息只能从模块流向中心，不能反向)
- **职责明确**: BaseModule负责输出，DebugCenter负责管理
- **解耦设计**: DebugCenter不继承BaseModule，避免循环依赖
- **独立运行**: DebugCenter可以作为独立服务运行，不依赖其他模块的调试功能
- **统一接口**: 所有模块通过相同的方式向DebugCenter输出调试信息

## 更新日志

### 2025-09-11
- 初始化开发指引文档
- 添加已发布的5个核心模块信息
- 制定开发规则和标准
- 建立模块发布流程