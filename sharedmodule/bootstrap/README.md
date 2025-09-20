# RCC Bootstrap Module

[![npm version](https://badge.fury.io/js/rcc-bootstrap.svg)](https://badge.fury.io/js/rcc-bootstrap)
[![Build Status](https://github.com/rcc/rcc-bootstrap/actions/workflows/build.yml/badge.svg)](https://github.com/rcc/rcc-bootstrap/actions/workflows/build.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 概述

RCC Bootstrap Module是RCC生态系统的系统初始化和服务协调模块，负责整个系统的启动、配置管理、服务协调和健康监控。作为系统的核心协调器，它确保所有模块按正确的顺序初始化并协同工作。

## 主要特性

### 🚀 核心功能
- **系统初始化协调**: 统一的系统启动流程管理
- **服务生命周期管理**: 服务启动、停止、重启和健康监控
- **配置管理集成**: 动态配置加载、验证和流水线生成
- **两阶段调试系统**: 完整的调试和IO跟踪支持
- **容错和恢复**: 多层错误处理和自动恢复机制

### 🔧 高级特性
- **依赖注入系统**: 灵活的组件注入和配置
- **服务发现和注册**: 动态服务管理和协调
- **健康状态监控**: 实时系统健康检查和性能监控
- **适配器模式**: 与外部模块的无缝集成
- **事件驱动架构**: 异步处理和状态管理

## 项目架构

### 文件结构详解

```
rcc-bootstrap/
├── src/                          # 源代码目录
│   ├── BootstrapService.ts       # 核心服务实现类 (827行)
│   │   ├── 系统初始化协调
│   │   ├── 服务生命周期管理
│   │   ├── 配置管理集成
│   │   ├── 两阶段调试系统
│   │   └── 错误处理和恢复
│   ├── interfaces/
│   │   └── IBootstrapService.ts  # 服务接口定义 (163行)
│   │   ├── IBootstrapService: 主服务接口
│   │   ├── IServiceCoordinator: 服务协调器接口
│   │   ├── IConfigurationSystem: 配置系统接口
│   │   └── IHealthMonitor: 健康监控接口
│   ├── types/
│   │   └── BootstrapTypes.ts     # 完整类型定义 (696行)
│   │   ├── BootstrapConfig: 启动配置
│   │   ├── ServiceConfig: 服务配置
│   │   ├── SystemHealth: 系统健康状态
│   │   ├── ServiceInstance: 服务实例
│   │   └── ConfigurationSystem: 配置系统包装器
│   ├── types.d.ts                # 模块类型声明 (24行)
│   └── index.ts                  # 模块导出入口 (22行)
├── dist/                         # 编译输出目录
│   ├── commonjs/                 # CommonJS格式
│   ├── esm/                      # ES模块格式
│   └── types/                    # TypeScript声明文件
├── __test__/                     # 测试目录
├── scripts/
│   └── publish.sh               # 发布脚本 (53行)
├── package.json                 # 模块配置 (66行)
├── tsconfig.json                # TypeScript配置 (47行)
└── index.ts                     # 顶级导出入口 (22行)
```

### 核心架构设计

```
┌─────────────────────────────────────────┐
│          应用层 (Application)           │
│  ┌─────────────┐  ┌─────────────────┐  │
│  │   RCC CLI   │  │   其他应用系统   │  │
│  └─────────────┘  └─────────────────┘  │
├─────────────────────────────────────────┤
│          服务层 (Service)               │
│  ┌─────────────────────────────────┐   │
│  │      BootstrapService           │   │
│  │  - 系统初始化                   │   │
│  │  - 服务协调                     │   │
│  │  - 配置管理                     │   │
│  │  - 健康监控                     │   │
│  └─────────────────────────────────┘   │
├─────────────────────────────────────────┤
│          接口层 (Interface)             │
│  ┌─────────────┐  ┌─────────────────┐  │
│  │IBootstrapSvc│  │ IServiceCoord  │  │
│  └─────────────┘  └─────────────────┘  │
├─────────────────────────────────────────┤
│          基础层 (Infrastructure)        │
│  ┌─────────────┐  ┌─────────────────┐  │
│  │ BaseModule  │  │ rcc-config-     │  │
│  │             │  │ parser         │  │
│  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────┘
```

### 核心组件职责

#### 1. BootstrapService (核心服务)
- **继承**: `BaseModule` (rcc-basemodule)
- **职责**:
  - 系统初始化协调
  - 服务生命周期管理
  - 配置管理集成
  - 健康状态监控
  - 错误处理和恢复

#### 2. 配置系统集成
- **动态导入**: 动态导入rcc-config-parser模块
- **适配器模式**: 包装配置系统为统一接口
- **流水线生成**: 自动生成流水线配置表
- **实时更新**: 支持运行时配置更新

#### 3. 服务协调机制
- **依赖注入**: 灵活的组件注入系统
- **服务发现**: 动态服务注册和发现
- **启动顺序**: 智能的依赖解析和启动顺序管理
- **健康检查**: 实时服务健康状态监控

## 安装

```bash
npm install rcc-bootstrap
```

## 依赖要求

此模块需要以下RCC模块：

```bash
npm install rcc-basemodule rcc-config-parser rcc-errorhandling rcc-pipeline rcc-server rcc-virtual-model-rules
```

## 快速开始

### 基础使用

```typescript
import { BootstrapService, BootstrapConfig } from 'rcc-bootstrap';

// 1. 创建启动配置
const config: BootstrapConfig = {
  enableTwoPhaseDebug: true,
  debugBaseDirectory: '~/.rcc/debug',
  configurationPath: './config/rcc-config.json',
  services: [
    {
      id: 'rcc-server',
      type: 'http-server',
      name: 'RCC HTTP Server',
      enabled: true,
      config: {
        port: 3000,
        host: 'localhost',
        cors: {
          origin: ['http://localhost:3000'],
          credentials: true
        }
      }
    }
  ]
};

// 2. 创建Bootstrap服务
const bootstrap = new BootstrapService();

// 3. 配置系统
await bootstrap.configure(config);

// 4. 启动系统
await bootstrap.start();

// 5. 获取系统状态
const status = bootstrap.getSystemStatus();
console.log('System Status:', status);
```

### 完整系统初始化

```typescript
import { BootstrapService } from 'rcc-bootstrap';

async function initializeRCCSystem() {
  const bootstrap = new BootstrapService();

  try {
    // 配置阶段
    await bootstrap.configure({
      enableTwoPhaseDebug: true,
      debugBaseDirectory: '~/.rcc/debug',
      configurationPath: './config/rcc-config.json',
      services: [
        {
          id: 'rcc-server',
          type: 'http-server',
          name: 'RCC HTTP Server',
          enabled: true,
          config: {
            port: 3000,
            host: 'localhost',
            timeout: 30000,
            cors: {
              origin: ['http://localhost:3000'],
              credentials: true
            }
          }
        },
        {
          id: 'pipeline-scheduler',
          type: 'pipeline',
          name: 'Pipeline Scheduler',
          enabled: true,
          config: {
            maxConcurrentRequests: 10,
            loadBalancingStrategy: 'weighted'
          }
        }
      ]
    });

    // 启动阶段
    await bootstrap.start();

    // 监控系统状态
    setInterval(() => {
      const status = bootstrap.getSystemStatus();
      console.log('System Health:', {
        status: status.status,
        runningServices: status.runningServices,
        failedServices: status.failedServices,
        uptime: `${Math.round(status.uptime / 1000)}s`
      });
    }, 30000);

    console.log('RCC System initialized successfully');
    return bootstrap;

  } catch (error) {
    console.error('Failed to initialize RCC system:', error);
    throw error;
  }
}

// 启动系统
initializeRCCSystem().catch(console.error);
```

### 动态服务管理

```typescript
import { BootstrapService, ServiceConfig } from 'rcc-bootstrap';

const bootstrap = new BootstrapService();

// 添加新服务
const newService: ServiceConfig = {
  id: 'custom-service',
  type: 'custom',
  name: 'Custom Service',
  enabled: true,
  config: {
    // 服务特定配置
  }
};

await bootstrap.addService(newService);

// 移除服务
await bootstrap.removeService('custom-service');

// 获取所有服务
const services = bootstrap.getServices();
console.log('Registered Services:', services);
```

## API 参考

### BootstrapService

```typescript
class BootstrapService extends BaseModule implements IBootstrapService {
  constructor();

  // 配置系统
  async configure(config: BootstrapConfig): Promise<void>;

  // 生命周期管理
  async start(): Promise<void>;
  async stop(): Promise<void>;
  async restart(): Promise<void>;

  // 服务管理
  async addService(service: ServiceConfig): Promise<void>;
  async removeService(serviceId: string): Promise<void>;
  getServices(): ServiceConfig[];

  // 状态监控
  getSystemStatus(): SystemHealth;
  getServiceStatus(serviceId: string): ServiceStatus | null;

  // 组件注入
  setModuleLogger(moduleLogger: any): void;
  setRequestTracker(requestTracker: any): void;
  setDebugLogManager(debugLogManager: any): void;
  setTestScheduler(testScheduler: any): void;
  setPipelineScheduler(pipelineScheduler: any): void;

  // 调试支持
  enableTwoPhaseDebug(baseDirectory?: string, ioTracking?: IOTrackingConfig): void;
  disableTwoPhaseDebug(): void;
}
```

### BootstrapConfig

```typescript
interface BootstrapConfig {
  // 调试配置
  enableTwoPhaseDebug?: boolean;
  debugBaseDirectory?: string;
  enableIOTracking?: boolean;

  // 配置文件路径
  configurationPath?: string;

  // 服务配置
  services?: ServiceConfig[];

  // 健康检查配置
  healthCheck?: {
    enabled: boolean;
    interval: number;
    timeout: number;
  };

  // 性能监控配置
  metrics?: {
    enabled: boolean;
    collectionInterval: number;
  };
}
```

### ServiceConfig

```typescript
interface ServiceConfig {
  id: string;                    // 服务唯一标识
  type: 'http-server' | 'pipeline' | 'scheduler' | 'custom'; // 服务类型
  name: string;                  // 服务名称
  enabled: boolean;              // 是否启用
  config: any;                   // 服务特定配置
  dependencies?: string[];        // 依赖的服务ID列表
  healthCheck?: {                // 健康检查配置
    enabled: boolean;
    endpoint: string;
    interval: number;
    timeout: number;
  };
}
```

### SystemHealth

```typescript
interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  totalServices: number;
  runningServices: number;
  failedServices: number;
  uptime: number;
  services: Record<string, ServiceStatus>;
  metrics: {
    totalMemoryUsage: number;
    totalCpuUsage: number;
    healthCheckSuccessRate: number;
    avgResponseTime: number;
  };
  lastHealthCheck: number;
}
```

## 系统初始化流程

### 详细启动流程

```
1. 配置阶段 (configure)
   ↓
   ├── 启用两阶段调试系统
   ├── 动态导入配置解析器
   ├── 创建配置系统包装器
   ├── 验证配置参数
   └── 设置默认服务配置

2. 启动阶段 (start)
   ↓
   ├── 加载配置文件
   │   ├── IO跟踪记录开始
   │   ├── 解析配置文件
   │   ├── 验证配置完整性
   │   └── IO跟踪记录完成
   │
   ├── 生成流水线配置表
   │   ├── IO跟踪记录开始
   │   ├── 调用配置系统生成流水线
   │   └── IO跟踪记录完成
   │
   ├── 初始化服务
   │   ├── 按依赖顺序排序
   │   ├── 创建服务实例
   │   ├── 注入协调组件
   │   ├── 配置服务参数
   │   └── 启动服务
   │
   └── 注册服务实例
       ├── 生成实例ID
       ├── 记录启动时间
       ├── 设置初始状态
       └── 添加到服务注册表
```

### 错误处理机制

```typescript
// 1. 配置系统错误处理
try {
  const configModule = await import('rcc-config-parser');
} catch (importError) {
  // 尝试备用导入路径
  try {
    const configModule = await import('rcc-config-parser/dist/index.js');
  } catch (secondaryError) {
    // 记录错误但不阻止启动
    this.debugSystem?.log('error', 'Failed to import rcc-config-parser functions', {
      error: secondaryError instanceof Error ? secondaryError.message : String(secondaryError)
    });
  }
}

// 2. 服务启动错误处理
try {
  await serverModule.start();
} catch (error: any) {
  console.error('Failed to initialize ServerModule:', error);
  console.error('Error stack:', error.stack);
  // 不抛出错误，继续其他服务初始化
}

// 3. IO操作跟踪错误处理
try {
  await this.configurationSystem.loadConfig(configPath);
} catch (error) {
  this.endIOTracking('bootstrap-load-config', {}, false,
    error instanceof Error ? error.message : String(error));
  throw error;
}
```

## Integration with Other Modules

### Key Integration Points

| Module | Integration Method | Primary Function |
|--------|-------------------|------------------|
| **BaseModule** | Inheritance | Base module functionality, two-phase debug system |
| **rcc-config-parser** | Dynamic Import | Configuration parsing, pipeline generation |
| **rcc-server** | Instantiation | HTTP server, pure forwarding (no routing) |
| **rcc-errorhandling** | Dependency Injection | Error handling and recovery |
| **rcc-pipeline** | Coordinator Injection | Pipeline management and scheduling |
| **rcc-virtual-model-rules** | Configuration Integration | Virtual model rules management |

### 组件注入示例

```typescript
// 注入调试日志管理器
bootstrap.setDebugLogManager(debugLogManager);

// 注入测试调度器
bootstrap.setTestScheduler(testScheduler);

// 注入流水线调度器
bootstrap.setPipelineScheduler(pipelineScheduler);

// 注入请求跟踪器
bootstrap.setRequestTracker(requestTracker);

// 注入模块日志器
bootstrap.setModuleLogger(moduleLogger);
```

## 已知问题和待改进项

### 🚨 需要UnderConstruction模块替换的TODO项目

#### 1. 配置系统导入问题
**位置**: `src/BootstrapService.ts.backup`
**状态**: 需要使用UnderConstruction模块显式声明
```typescript
// 当前代码:
// TODO: Fix rcc-configuration import issues

// 标准替换方式:
import { underConstruction } from 'rcc-underconstruction';
underConstruction.callUnderConstructionFeature('config-system-import', {
  caller: 'BootstrapService.loadConfig',
  parameters: { configPath },
  purpose: '配置系统模块导入和初始化'
});
```

#### 2. 服务实例化错误处理增强
**位置**: `BootstrapService.ts` 服务初始化流程
**状态**: 需要更完善的服务实例化和错误恢复机制
```typescript
// 当前简化错误处理:
try {
  await serverModule.start();
} catch (error: any) {
  console.error('Failed to initialize ServerModule:', error);
  // 不抛出错误，继续其他服务初始化
}

// 应该使用UnderConstruction声明:
underConstruction.callUnderConstructionFeature('service-error-recovery', {
  caller: 'BootstrapService.initializeServices',
  parameters: { serviceId, error },
  purpose: '服务启动失败后的智能恢复和重试机制'
});
```

### 📋 已弃用功能警告

#### 1. 日志方法弃用
**位置**: `BootstrapService.ts`
**状态**: 已弃用，使用BaseModule内置方法替代
```typescript
/**
 * @deprecated 使用BaseModule的logInfo, logError等方法代替
 */
setModuleLogger(moduleLogger: any): void {
  underConstruction.callUnderConstructionFeature('deprecated-logger-method', {
    caller: 'BootstrapService.setModuleLogger',
    purpose: '已弃用的日志器设置方法，应该使用BaseModule内置日志功能'
  });
}
```

#### 2. 请求跟踪器弃用
**位置**: `BootstrapService.ts`
**状态**: 已弃用，使用BaseModule IO跟踪替代
```typescript
/**
 * @deprecated 使用BaseModule的recordIO, startOperation, endOperation等方法代替
 */
setRequestTracker(requestTracker: any): void {
  underConstruction.callUnderConstructionFeature('deprecated-request-tracker', {
    caller: 'BootstrapService.setRequestTracker',
    purpose: '已弃用的请求跟踪器设置方法，应该使用BaseModule内置IO跟踪功能'
  });
}
```

### ⚠️ 潜在架构改进点

#### 1. 动态导入策略优化
当前实现使用简单的try-catch进行模块导入，可以改进为更智能的模块发现和加载机制。

#### 2. 服务健康检查增强
健康检查机制相对基础，可以添加更详细的诊断信息和自动恢复策略。

#### 3. 配置热重载支持
当前系统启动后配置变更需要重启，可以支持运行时配置热重载。

## 开发标准合规性

### ✅ 已符合的开发标准

1. **模块化架构**: 严格遵循RCC模块化架构原则
2. **类型安全**: 完整的TypeScript类型定义
3. **错误处理**: 多层错误处理和恢复机制
4. **生命周期管理**: 完整的服务生命周期管理
5. **依赖注入**: 灵活的组件注入系统

### 🔄 需要改进的方面

1. **UnderConstruction模块集成**: 需要替换所有TODO注释
2. **弃用方法清理**: 需要标记并计划移除已弃用的方法
3. **测试覆盖率**: 需要增加集成测试覆盖边缘情况

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

### 添加新的服务类型

1. **定义服务配置**:
```typescript
interface CustomServiceConfig {
  id: string;
  type: 'custom';
  name: string;
  enabled: boolean;
  config: {
    // 自定义配置参数
  };
}
```

2. **实现服务初始化**:
```typescript
async initializeCustomService(serviceConfig: ServiceConfig): Promise<void> {
  // 创建服务实例
  const service = new CustomService(serviceConfig.config);

  // 配置服务
  await service.configure(serviceConfig.config);

  // 启动服务
  await service.start();

  // 注册服务
  this.registerService(serviceConfig.id, service);
}
```

### 扩展健康检查

```typescript
// 自定义健康检查
class CustomHealthMonitor {
  async checkServiceHealth(serviceId: string): Promise<ServiceStatus> {
    const service = this.services.get(serviceId);
    if (!service) {
      return { state: 'unknown', lastCheck: Date.now() };
    }

    try {
      // 执行健康检查
      const isHealthy = await this.performHealthCheck(service);

      return {
        state: isHealthy ? 'healthy' : 'unhealthy',
        lastCheck: Date.now(),
        lastError: isHealthy ? undefined : 'Health check failed'
      };
    } catch (error) {
      return {
        state: 'unhealthy',
        lastCheck: Date.now(),
        lastError: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
```

## 测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- --grep "bootstrap"

# 运行覆盖率测试
npm run test:coverage

# 运行集成测试
npm run test:integration
```

## 性能监控

### 关键指标

```typescript
// 获取系统性能指标
const status = bootstrap.getSystemStatus();

console.log('System Performance:', {
  status: status.status,
  totalServices: status.totalServices,
  runningServices: status.runningServices,
  failedServices: status.failedServices,
  uptime: `${Math.round(status.uptime / 1000)}s`,
  healthCheckSuccessRate: `${(status.metrics.healthCheckSuccessRate * 100).toFixed(2)}%`,
  avgResponseTime: `${status.metrics.avgResponseTime}ms`
});
```

### 实时监控

```typescript
// 设置定期监控
setInterval(() => {
  const status = bootstrap.getSystemStatus();

  // 检查系统健康状态
  if (status.status === 'unhealthy') {
    console.error('System is unhealthy!');

    // 检查失败的服务
    const failedServices = Object.entries(status.services)
      .filter(([_, status]) => status.state === 'unhealthy')
      .map(([id, _]) => id);

    console.error('Failed services:', failedServices);

    // 尝试重启失败的服务
    for (const serviceId of failedServices) {
      try {
        await bootstrap.restartService(serviceId);
      } catch (error) {
        console.error(`Failed to restart service ${serviceId}:`, error);
      }
    }
  }
}, 60000); // 每分钟检查一次
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

如有问题，请在 [GitHub Issues](https://github.com/rcc/rcc-bootstrap/issues) 页面提交问题。

## 更新日志

详见 [CHANGELOG.md](CHANGELOG.md) 了解版本历史和更改。

## 相关项目

- [RCC Base Module](https://github.com/rcc/rcc-basemodule) - 核心框架基础模块
- [RCC Config Parser](https://github.com/rcc/rcc-config-parser) - 配置管理模块
- [RCC Error Handling](https://github.com/rcc/rcc-errorhandling) - 错误处理中心
- [RCC Pipeline](https://github.com/rcc/rcc-pipeline) - 流水线管理模块
- [RCC Server](https://github.com/rcc/rcc-server) - HTTP服务器模块

---

**使用 ❤️ 构建 by RCC开发团队**