# Multi-Key UI Server Modular Refactoring Plan v2.0

## Adjusted Module Structure

基于用户反馈，这些模块都是配置管理相关的，应该组织为配置管理的子模块结构：

### 新的模块组织结构

```
src/modules/
├── core/                          # 核心基础模块
│   ├── BaseModule.ts               # 基础模块抽象类
│   └── interfaces/
├── ApiRouter/                      # API路由模块（独立）
│   ├── src/ApiRouter.ts
│   ├── interfaces/IApiRouter.ts
│   └── constants/ApiRouter.constants.ts
└── Configuration/                  # 配置管理主模块
    ├── src/ConfigurationManager.ts  # 主配置管理器
    ├── interfaces/IConfiguration.ts # 配置接口定义
    ├── constants/Configuration.constants.ts
    ├── submodules/                 # 配置相关子模块
    │   ├── ConfigManager/          # 基础配置文件管理
    │   │   ├── src/ConfigManager.ts
    │   │   └── interfaces/IConfigManager.ts
    │   ├── ProvidersManager/       # Provider配置管理
    │   │   ├── src/ProvidersManager.ts
    │   │   ├── interfaces/IProvidersManager.ts
    │   │   └── constants/ProvidersManager.constants.ts
    │   ├── ModelsManager/          # 模型配置管理
    │   │   ├── src/ModelsManager.ts
    │   │   ├── interfaces/IModelsManager.ts
    │   │   └── constants/ModelsManager.constants.ts
    │   ├── BlacklistManager/       # 黑名单配置管理
    │   │   ├── src/BlacklistManager.ts
    │   │   ├── interfaces/IBlacklistManager.ts
    │   │   └── constants/BlacklistManager.constants.ts
    │   └── PoolManager/            # Pool配置管理
    │       ├── src/PoolManager.ts
    │       ├── interfaces/IPoolManager.ts
    │       └── constants/PoolManager.constants.ts
    └── __test__/                   # 集成测试
```

## 模块职责重新分配

### 1. ConfigurationManager (主配置管理器)
- **角色**: 协调各配置子模块
- **职责**: 
  - 初始化所有配置子模块
  - 协调子模块间的数据同步
  - 提供统一的配置管理接口
  - 处理配置的整体验证和备份

### 2. Configuration子模块

#### 2.1 ConfigManager (基础配置)
- **职责**: 配置文件的基础读写、备份恢复
- **已完成**: ✅

#### 2.2 ProvidersManager (Provider配置)
- **职责**: 
  - Provider CRUD操作
  - Provider连接测试
  - API key管理
  - 协议支持管理

#### 2.3 ModelsManager (模型配置)
- **职责**:
  - 模型验证和状态管理
  - Token limit检测
  - 模型性能测试
  - 模型状态更新

#### 2.4 BlacklistManager (黑名单配置)
- **职责**:
  - 黑名单操作
  - 与PoolManager的去重协调
  - 黑名单原因管理

#### 2.5 PoolManager (Pool配置)
- **职责**:
  - Provider pool操作
  - 与BlacklistManager的去重协调
  - Pool状态管理

## 重构步骤

1. **重新组织现有模块** ✅
2. **创建ConfigurationManager主模块**
3. **将现有ConfigManager移动到子模块位置**
4. **提取ProvidersManager子模块**
5. **提取ModelsManager子模块** 
6. **提取BlacklistManager和PoolManager子模块**
7. **集成测试和验证**

## 优势

- **逻辑分组**: 配置相关模块集中管理
- **层次清晰**: 主模块协调，子模块专业化
- **职责明确**: 每个子模块单一职责
- **易于维护**: 相关功能聚合，便于理解和修改
- **扩展性好**: 新的配置功能可以轻松添加为子模块