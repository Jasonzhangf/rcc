# RCC CLI Framework

[![npm version](https://badge.fury.io/js/rcc-cli-framework.svg)](https://badge.fury.io/js/rcc-cli-framework)
[![npm](https://img.shields.io/npm/v/rcc-cli-framework.svg)](https://www.npmjs.com/package/rcc-cli-framework)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/Build-Success-brightgreen.svg)](#构建状态-)
[![Tests Passing](https://img.shields.io/badge/Tests-Passing-brightgreen.svg)](#功能测试-)

## 🎉 构建成功状态

**✅ 所有编译构建已完成并验证通过**
- **TypeScript编译**: 所有严格类型检查通过 ✅
- **ESM模块构建**: 纯ESM格式包生成成功 ✅
- **TypeScript声明**: 完整.d.ts文件生成 ✅
- **功能测试**: 核心功能端到端测试通过 ✅
- **依赖集成**: 与rcc-basemodule 0.2.3集成成功 ✅
- **npm发布**: 成功发布到npm (rcc-cli-framework@0.1.7) ✅

A universal command-line interface framework built on BaseModule architecture, serving as the global entry point for all RCC system commands.

## 🎯 Overview

The RCC CLI Framework is the central command entry point for the entire RCC ecosystem. It provides a dynamic, extensible command system with built-in lifecycle management, error handling, and logging powered by BaseModule.

## 🏗️ Architecture

### 文件结构和详细功能说明

```
rcc-cli-framework/
├── src/                          # 源代码目录
│   ├── core/                      # 核心框架组件 (核心功能，请勿修改)
│   │   ├── CLIEngine.ts          # [核心] 主CLI引擎 - 继承BaseModule，处理生命周期
│   │   │   ├── 动态BaseModule导入和初始化
│   │   │   ├── 命令路由和执行调度
│   │   │   ├── 错误处理和日志记录集成
│   │   │   ├── 配置管理和验证
│   │   │   ├── 帮助系统集成和生成
│   │   │   ├── 命令发现和注册管理
│   │   │   └── 生命周期管理 (initialize → execute → destroy)
│   │   ├── CommandRegistry.ts    # [核心] 动态命令注册和发现系统
│   │   │   ├── 命令注册/注销管理
│   │   │   ├── 目录扫描和文件发现 (支持 .js, .ts, .mjs, .cjs)
│   │   │   ├── 模块模式匹配 (rcc-command-*, @rcc/command-*)
│   │   │   ├── 别名管理和冲突解决
│   │   │   ├── 命令验证和类型检查
│   │   │   ├── 插件系统集成
│   │   │   └── 动态模块加载 (ESM兼容)
│   │   └── ArgumentParser.ts     # [核心] 命令行参数处理
│   │       ├── argv解析和标准化
│   │       ├── 选项验证和类型转换
│   │       ├── 帮助文本自动生成
│   │       ├── 命令选项验证
│   │       └── 参数解析错误处理
│   ├── commands/                 # 内置命令实现 (扩展点)
│   │   ├── start/               # rcc start 命令实现
│   │   │   ├── StartCommand.ts  # 系统启动命令
│   │   │   │   ├── 端口配置和验证 (默认5506)
│   │   │   │   ├── 配置文件路径管理
│   │   │   │   ├── 调试系统集成
│   │   │   │   ├── 自动重启功能
│   │   │   │   ├── 管道跟踪启用
│   │   │   │   └── 详细输出模式
│   │   │   └── index.ts         # 命令导出文件
│   │   ├── stop/                # rcc stop 命令实现
│   │   │   ├── StopCommand.ts   # 系统停止命令
│   │   │   │   ├── 优雅关闭逻辑
│   │   │   │   ├── 强制停止功能
│   │   │   │   ├── 超时管理 (默认5000ms)
│   │   │   │   ├── 详细状态输出
│   │   │   │   └── 进程清理
│   │   │   └── index.ts         # 命令导出文件
│   │   └── code/                # rcc code 命令实现
│   │       ├── CodeCommand.ts   # 开发工具命令
│   │       │   ├── 代码生成模板
│   │       │   ├── 构建系统集成
│   │       │   ├── 监听模式功能
│   │       │   └── 项目脚手架
│   │       └── index.ts         # 命令导出文件
│   ├── types/                    # TypeScript类型定义 (参考用)
│   │   ├── index.ts              # 核心接口和类型定义
│   │   │   ├── ICommand 接口定义
│   │   │   ├── CommandContext 上下文结构
│   │   │   ├── CommandOption 选项定义
│   │   │   ├── CLIEngineConfig 配置接口
│   │   │   ├── ILogger 日志接口
│   │   │   └── CommandDiscoveryOptions 发现选项
│   │   └── rcc-basemodule.d.ts   # rcc-basemodule类型声明
│   │       ├── BaseModule 类型声明
│   │       ├── ModuleInfo 接口定义
│   │       └── ESM模块兼容性处理
│   └── index.ts                  # 框架入口点和导出
│       ├── CLIEngine类导出
│       ├── createCLIEngine工厂函数
│       ├── 核心类型和接口导出
│       └── 框架公共API
├── dist/                         # 构建输出目录 (自动生成)
│   ├── index.js                  # ESM格式的主包文件
│   └── index.d.ts                # TypeScript类型声明文件
├── test-cli.mjs                  # 测试脚本 (ESM格式)
│   ├── CLI引擎创建和初始化测试
│   ├── 帮助和版本功能测试
│   ├── 命令注册和执行测试
│   ├── 错误处理测试
│   └── 资源清理测试
├── rollup.config.mjs            # Rollup构建配置 (ESM)
│   ├── TypeScript编译配置
│   ├── ESM输出格式配置
│   ├── 外部依赖管理
│   ├── 声明文件生成
│   └── CommonJS兼容性处理
├── tsconfig.json                # TypeScript配置
│   ├── 严格类型检查启用
│   ├── ESM模块系统配置
│   ├── 声明文件生成设置
│   └── 编译目标设置
└── package.json                  # 包配置和依赖管理
    ├── 模块基本信息和版本
    ├── 依赖管理 (rcc-basemodule ^0.2.3)
    ├── 构建脚本配置
    ├── 开发依赖管理
    └── npm发布配置
```

### 各文件详细作用说明

#### 核心文件 (src/core/)

**CLIEngine.ts** - CLI引擎核心
- **主要职责**: 继承BaseModule，提供完整的CLI框架生命周期管理
- **动态导入**: 使用ESM动态导入加载rcc-basemodule，确保兼容性
- **命令管理**: 统一的命令注册、发现和执行调度
- **错误处理**: 集成BaseModule的错误处理和日志系统
- **配置管理**: 支持灵活的命令发现配置
- **帮助系统**: 自动生成帮助文本和版本信息
- **生命周期**: initialize() → execute() → destroy() 完整流程

**CommandRegistry.ts** - 命令注册中心
- **动态发现**: 支持从目录和npm模块自动发现命令
- **文件扫描**: 识别 .js, .ts, .mjs, .cjs 文件作为命令源
- **模块加载**: 使用ESM import()动态加载命令模块
- **别名管理**: 支持命令别名和冲突解决
- **类型安全**: 完整的TypeScript类型检查和验证
- **插件系统**: 支持外部rcc-command-*模块插件

**ArgumentParser.ts** - 参数解析器
- **argv处理**: 标准化命令行参数解析
- **选项验证**: 支持多种类型选项 (string, number, boolean)
- **帮助生成**: 自动生成命令帮助和使用说明
- **错误处理**: 参数解析错误的友好提示

#### 命令实现 (src/commands/)

**StartCommand.ts** - 系统启动命令
- **端口管理**: 默认端口5506，支持自定义端口配置
- **配置文件**: 支持配置文件路径指定
- **调试支持**: 集成调试和跟踪功能
- **自动重启**: 支持系统自动重启机制
- **详细输出**: 可选的详细日志输出

**StopCommand.ts** - 系统停止命令
- **优雅关闭**: 支持超时控制的优雅关闭
- **强制停止**: 提供强制停止选项
- **状态反馈**: 详细的停止状态反馈
- **资源清理**: 完整的系统资源清理

**CodeCommand.ts** - 开发工具命令
- **开发辅助**: 提供代码生成和项目管理工具
- **构建集成**: 与构建系统的集成支持
- **监听模式**: 支持文件监听和自动重建

#### 类型定义 (src/types/)

**index.ts** - 核心类型定义
- **ICommand**: 命令接口标准定义
- **CommandContext**: 命令执行上下文
- **CommandOption**: 命令选项配置
- **CLIEngineConfig**: 引擎配置接口
- **ILogger**: 日志记录接口

**rcc-basemodule.d.ts** - 外部模块类型声明
- **BaseModule**: 基础模块类型声明
- **ModuleInfo**: 模块信息接口
- **ESM兼容**: 确保与ESM模块系统的兼容性

#### 配置文件

**rollup.config.mjs** - 构建配置
- **ESM输出**: 纯ESM模块格式输出
- **TypeScript**: 集成TypeScript编译和声明文件生成
- **依赖管理**: 正确处理外部依赖和内部依赖
- **CommonJS**: 兼容性处理用于__dirname等Node.js特性

**tsconfig.json** - TypeScript配置
- **严格模式**: 启用所有严格类型检查
- **ESM目标**: 针对ESM模块系统优化
- **声明文件**: 自动生成.d.ts类型声明文件

**test-cli.mjs** - 功能测试脚本
- **完整测试**: 覆盖所有核心功能的端到端测试
- **ESM格式**: 使用ESM import语法确保兼容性
- **错误处理**: 完整的错误处理和资源清理
- **自动化**: 可作为CI/CD流程的一部分

### Core Components

#### 1. CLIEngine (src/core/CLIEngine.ts)
- **Extends BaseModule** for built-in lifecycle management
- **Command discovery** - Automatically scans and loads commands
- **Execution orchestration** - Routes commands to appropriate handlers
- **Error handling** - Inherits BaseModule's error management
- **Logging** - Uses BaseModule's built-in logging system

#### 2. CommandRegistry (src/core/CommandRegistry.ts)
- **Dynamic registration** - Supports plugin commands at runtime
- **Command validation** - Ensures command interface compliance
- **Namespace management** - Handles command naming and conflicts
- **Help system** - Generates command documentation automatically

#### 3. ArgumentParser (src/core/ArgumentParser.ts)
- **argv parsing** - Processes command line arguments
- **Option validation** - Validates command options and flags
- **Type conversion** - Converts string arguments to appropriate types
- **Help generation** - Creates usage information for commands

## 🚀 Core Commands

### 1. rcc start
**Purpose**: Start the RCC system
**Usage**: `rcc start [options]`
**Features**:
- System initialization
- Service startup
- Port allocation and management
- Startup verification

### 2. rcc stop  
**Purpose**: Stop the RCC system
**Usage**: `rcc stop [options]`
**Features**:
- Graceful shutdown
- Process termination
- Resource cleanup
- Status reporting

### 3. rcc code
**Purpose**: Development and code management tools
**Usage**: `rcc code [subcommand]`
**Features**:
- Code generation
- Project scaffolding
- Development server management
- Build tools integration

## 🔌 Extensibility

### Command Plugin System
```typescript
// Custom command implementation
import { ICommand, CommandContext } from 'rcc-cli-framework';

export class CustomCommand implements ICommand {
  name = 'custom';
  description = 'Custom command example';
  
  async execute(context: CommandContext) {
    // Command implementation
    console.log('Custom command executed');
  }
}
```

### Dynamic Registration
Commands can be registered:
1. **Built-in**: Pre-packaged with the framework
2. **Module-based**: Loaded from external modules
3. **Runtime**: Registered programmatically

## 🛠️ Integration with BaseModule

### Inherited Features
- **Lifecycle Management**: initialize() → execute() → destroy()
- **Error Handling**: Automatic error catching and reporting
- **Logging**: Built-in log levels and output handling
- **Configuration**: BaseModule config system integration
- **Dependency Management**: Module dependency resolution

### Custom Enhancements
- **Command-specific logging**: Per-command log contexts
- **Execution metrics**: Command performance tracking
- **User feedback**: Interactive command output
- **Progress reporting**: Real-time progress indicators

## 📦 Installation

### As Global Command
```bash
npm install -g rcc-cli-framework
```

### As Dependency
```bash
npm install rcc-cli-framework
```

## 🚦 Usage

### Basic Usage
```bash
# Start the RCC system
rcc start

# Stop the RCC system  
rcc stop

# Development tools
rcc code --help
```

### Advanced Usage
```bash
# Start with specific port
rcc start --port 8080

# Stop force shutdown
rcc stop --force

# Verbose output
rcc start --verbose
```

## 🔧 Development Guidelines

### ✅ Implementation Patterns (Use These)

#### 1. Adding New Commands
```typescript
// commands/new-feature/NewFeatureCommand.ts
export class NewFeatureCommand implements ICommand {
  name = 'new-feature';
  description = 'Description of new feature';
  
  options = [
    {
      name: 'option1',
      type: 'string',
      description: 'Option description',
      required: true
    }
  ];

  async execute(context: CommandContext) {
    // Implementation using context.logger for logging
    context.logger.info('Executing new feature');
  }
}

// commands/new-feature/index.ts
export { NewFeatureCommand, newFeatureCommand } from './NewFeatureCommand';
```

#### 2. Plugin Commands (External Modules)
```typescript
// External module package.json
{
  "name": "rcc-command-myplugin",
  "main": "dist/index.js"
}

// External module implementation
export function registerCommands(registry: CommandRegistry) {
  registry.register(new MyPluginCommand());
}
```

### ❌ Anti-Patterns (Avoid These)

#### 1. DUPLICATE CORE FUNCTIONALITY
```typescript
// ❌ WRONG - Don't create alternative CLI engines
class CustomCLI { /* ... */ }

// ❌ WRONG - Don't implement manual argv parsing
const args = process.argv.slice(2);

// ❌ WRONG - Don't create separate command registries
const myRegistry = new Map();
```

#### 2. HARDCODED COMMAND PATHS
```typescript
// ❌ WRONG - Don't hardcode command locations
import { SomeCommand } from '../../some/path';

// ✅ CORRECT - Use dynamic discovery
// Commands are automatically discovered from:
// - ./commands/ directory
// - External rcc-command-* modules
// - Configuration-specified paths
```

#### 3. MANUAL ERROR HANDLING
```typescript
// ❌ WRONG - Don't implement custom error handling
try { /* ... */ } catch (error) { 
  console.error('Custom error'); 
}

// ✅ CORRECT - Use BaseModule integrated error handling
// Errors are automatically handled and logged through BaseModule
```

### File Responsibility Matrix

| File | Responsibility | Extension Point |
|------|----------------|-----------------|
| `CLIEngine.ts` | Core framework lifecycle | ❌ DO NOT MODIFY |
| `CommandRegistry.ts` | Command discovery system | ❌ DO NOT MODIFY |
| `ArgumentParser.ts` | Argument processing | ❌ DO NOT MODIFY |
| `commands/*/` | Command implementations | ✅ EXTEND HERE |
| `types/index.ts` | Interface definitions | ✅ EXTEND TYPES |
| `bin/rcc` | Global entry point | ⚠️ UPDATE CAREFULLY |

### Configuration Extensibility

#### Command Discovery Paths
```typescript
// Add additional command directories
const cli = createCLIEngine({
  commandDiscovery: {
    commandDirs: [
      './commands',                    // Built-in
      './src/commands',               // Project commands  
      './vendor/rcc-commands',        // Additional vendor commands
      process.env.CUSTOM_COMMANDS_PATH // Environment configured
    ],
    modulePatterns: [
      'rcc-command-*',               // Official plugins
      '@myorg/rcc-command-*',        // Organization plugins
      '*-rcc-command'               // Alternative naming
    ]
  }
});
```

### Testing Patterns

#### Unit Test Structure
```typescript
// tests/commands/NewFeatureCommand.test.ts
describe('NewFeatureCommand', () => {
  it('should validate options correctly', async () => {
    const command = new NewFeatureCommand();
    const context = createMockContext();
    
    await expect(command.validate(context)).resolves.toBe(true);
  });
});
```

### 构建状态 ✅
**构建已成功完成并验证**

```bash
npm run build
# ✅ 成功生成ESM格式包和TypeScript声明文件
# ✅ 所有TypeScript严格类型检查通过
# ✅ 动态模块加载和ESM兼容性验证通过
```

### 功能测试 ✅
**完整功能测试已通过验证**

```bash
node test-cli.mjs
# ✅ CLI引擎创建和初始化测试通过
# ✅ 帮助和版本功能测试通过
# ✅ 命令注册和执行测试通过
# ✅ 错误处理和资源清理测试通过
# ✅ 与rcc-basemodule 0.2.3集成测试通过
```

### 核心功能验证 ✅
**以下核心功能已验证正常工作**:

1. **CLI引擎生命周期管理**: initialize → execute → destroy
2. **动态命令注册和发现**: 支持运行时命令注册
3. **参数解析和验证**: 完整的命令行参数处理
4. **帮助系统生成**: 自动帮助文本和版本信息
5. **错误处理和日志**: 继承BaseModule的错误处理
6. **ESM模块兼容**: 纯ESM格式，支持动态导入
7. **TypeScript类型安全**: 严格类型检查，完整声明文件

### 开发模式
```bash
npm run dev
```

## 🎨 Command Interface

### ICommand Interface
```typescript
interface ICommand {
  name: string;
  description: string;
  usage?: string;
  aliases?: string[];
  options?: CommandOption[];
  execute(context: CommandContext): Promise<void>;
}

interface CommandContext {
  args: string[];
  options: Record<string, any>;
  logger: ILogger;
  cwd: string;
}
```

### Command Options
```typescript
interface CommandOption {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  description: string;
  required?: boolean;
  default?: any;
  alias?: string;
}
```

## 🌐 Global Integration

### Replacement Strategy
This framework replaces:
- Current direct `rcc` command implementation
- Ad-hoc command parsing in start-rcc-system.mjs
- Manual argument processing

### Migration Path
1. **Phase 1**: Implement framework with core commands
2. **Phase 2**: Migrate existing functionality  
3. **Phase 3**: Deprecate old entry points
4. **Phase 4**: Full framework adoption

## 📊 Performance

### Optimizations
- **Lazy loading**: Commands loaded on-demand
- **Caching**: Command metadata and help caching
- **Parallel processing**: Concurrent command execution support
- **Memory efficiency**: Minimal overhead for command routing

### Metrics Tracking
- Command execution time
- Memory usage per command
- Success/failure rates
- Usage statistics

## 🔒 Security

### Features
- **Input validation**: Sanitize all command arguments
- **Permission checking**: Command execution permissions
- **Audit logging**: Security-relevant command execution
- **Sandboxing**: Isolated command execution environments

## 📈 Future Enhancements

### Planned Features
- **Interactive mode**: REPL-style command interface
- **Command composition**: Pipe command outputs
- **Plugin ecosystem**: Official command plugin support
- **Auto-completion**: Shell completion generation
- **Remote commands**: Execute commands on remote systems

## 🤝 Contributing

### Adding New Commands
1. Create command in `src/commands/`
2. Implement `ICommand` interface
3. Add tests in `__tests__/`
4. Update documentation

### Plugin Development
```typescript
// Plugin entry point
export function registerCommands(registry: CommandRegistry) {
  registry.register(new CustomCommand());
}
```

## 📝 License

MIT License - see LICENSE file for details.

## 🆘 Support

- GitHub Issues: https://github.com/rcc/rcc-cli-framework/issues
- Documentation: https://rcc.dev/docs/cli-framework
- Community: https://community.rcc.dev

---

**Built with ❤️ by the RCC Team**