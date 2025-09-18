# RCC CLI Framework Documentation

## 概述

RCC CLI Framework 是一个基于 BaseModule 的可扩展命令行框架，提供了完整的命令发现、注册和执行系统。该框架支持插件化架构，允许动态加载命令模块。

## 架构设计

### 核心组件

```
sharedmodule/cli-framework/
├── src/
│   ├── core/
│   │   ├── CLIEngine.ts          # 主引擎（继承 BaseModule）
│   │   ├── CommandRegistry.ts    # 命令注册和管理
│   │   └── ArgumentParser.ts     # 参数解析和帮助生成
│   ├── commands/                 # 内置命令
│   │   ├── start/               # 系统启动命令
│   │   ├── stop/                # 系统停止命令
│   │   └── code/                # 开发工具命令
│   ├── types/                   # 类型定义
│   └── index.ts                 # 框架入口
├── bin/
│   └── rcc                      # 全局命令入口
└── package.json                 # 包配置
```

### 核心功能

1. **命令发现系统**
   - 自动扫描多个命令目录
   - 支持外部模块插件
   - 开发时热重载

2. **命令执行引擎**
   - 参数验证
   - 错误处理
   - 日志记录

3. **插件架构**
   - 模块化命令设计
   - 动态加载
   - 依赖管理

## 详细组件说明

### CLIEngine

主引擎类，继承自 BaseModule，负责整个 CLI 框架的协调和管理。

```typescript
class CLIEngine extends BaseModule {
  async initialize(): Promise<void>          // 初始化引擎和命令发现
  async execute(argv: string[]): Promise<void> // 执行命令行参数
  async executeCommand(name: string, args: string[], options: Record<string, any>): Promise<void>
  async discoverCommands(options?: CommandDiscoveryOptions): Promise<void>
  registerCommand(command: ICommand): void
  unregisterCommand(commandName: string): void
}
```

### CommandRegistry

命令注册表，管理所有可用命令的生命周期。

```typescript
class CommandRegistry {
  register(command: ICommand): void
  unregister(commandName: string): void
  getCommand(commandName: string): ICommand | undefined
  getAllCommands(): ICommand[]
  async discoverCommands(options: CommandDiscoveryOptions): Promise<void>
}
```

### ArgumentParser

参数解析器，处理命令行参数和生成帮助信息。

```typescript
class ArgumentParser {
  parse(argv: string[]): ParsedCommand
  generateHelp(command: ICommand): string
  generateGlobalHelp(commands: ICommand[]): string
}
```

## 命令开发

### 命令接口

```typescript
interface ICommand {
  name: string;                              // 命令名称
  description: string;                       // 命令描述
  usage: string;                            // 使用方法
  options: CommandOption[];                  // 命令选项
  execute(context: CommandContext): Promise<void>;  // 执行方法
  validate?(context: CommandContext): Promise<boolean>; // 可选验证方法
}
```

### 命令选项

```typescript
interface CommandOption {
  name: string;                             // 选项名称
  type: 'string' | 'number' | 'boolean';   // 选项类型
  description: string;                      // 选项描述
  default?: any;                           // 默认值
  alias?: string;                          // 短选项别名
  required?: boolean;                      // 是否必需
}
```

### 命令上下文

```typescript
interface CommandContext {
  args: string[];                           // 位置参数
  options: Record<string, any>;             // 选项参数
  logger: ILogger;                         // 日志接口
  cwd: string;                            // 当前工作目录
  command: ICommand;                       // 命令实例
}
```

### 命令示例

```typescript
import { ICommand, CommandContext } from 'rcc-cli-framework';

class ExampleCommand implements ICommand {
  name = 'example';
  description = '示例命令';
  usage = '[options] <input>';

  options = [
    {
      name: 'output',
      type: 'string',
      description: '输出文件路径',
      alias: 'o'
    },
    {
      name: 'verbose',
      type: 'boolean',
      description: '详细输出',
      default: false
    }
  ];

  async execute(context: CommandContext): Promise<void> {
    const input = context.args[0];
    const output = context.options.output;
    const verbose = context.options.verbose;

    context.logger.info(`Processing input: ${input}`);

    // 命令逻辑...

    if (verbose) {
      context.logger.info('Additional details...');
    }
  }
}
```

## 配置系统

### 命令发现配置

```typescript
interface CommandDiscoveryOptions {
  commandDirs: string[];                   // 命令目录列表
  modulePatterns: string[];                // 模块匹配模式
  autoLoad: boolean;                      // 自动加载
  watchForChanges: boolean;               // 监听文件变化
}
```

### CLI 引擎配置

```typescript
interface CLIEngineConfig {
  name: string;                           // CLI 名称
  version: string;                        // 版本号
  description?: string;                   // 描述
  commandDiscovery: CommandDiscoveryOptions; // 命令发现配置
  defaultCommand?: string;                // 默认命令
}
```

### 默认配置

```typescript
export const defaultCLIConfig = {
  name: 'rcc',
  version: '1.0.0',
  description: 'RCC Command Line Interface Framework',
  commandDiscovery: {
    commandDirs: [
      __dirname + '/commands',              // 内置命令
      process.cwd() + '/commands',          // 项目命令
      process.cwd() + '/src/commands'       // 源码命令
    ],
    modulePatterns: [
      'rcc-command-*',                     // RCC 命令插件
      '@rcc/command-*'                     // 组织命令插件
    ],
    autoLoad: true,
    watchForChanges: process.env.NODE_ENV === 'development'
  },
  defaultCommand: 'help'
};
```

## 插件开发

### 命令插件

创建一个独立的命令插件模块：

```typescript
// my-command-plugin/src/index.ts
import { ICommand } from 'rcc-cli-framework';

class MyCommand implements ICommand {
  name = 'my-command';
  description = '我的自定义命令';
  usage = '[options]';

  options = [
    {
      name: 'option',
      type: 'string',
      description: '命令选项'
    }
  ];

  async execute(context: CommandContext): Promise<void> {
    // 命令实现
  }
}

export const myCommand = new MyCommand();
```

插件 package.json 配置：

```json
{
  "name": "rcc-command-my",
  "version": "1.0.0",
  "main": "dist/index.js",
  "dependencies": {
    "rcc-cli-framework": "^1.0.0"
  }
}
```

### 动态加载

框架会自动发现符合命名约定的插件：

- `rcc-command-*` - 标准命令插件
- `@rcc/command-*` - 组织范围内的命令插件

## 内置命令

### start 命令

启动 RCC 系统：

```bash
rcc start [options]
```

选项：
- `-p, --port <port>` - 端口号（默认：5506）
- `-c, --configPath <path>` - 配置文件路径
- `-d, --debugBasePath <path>` - 调试日志路径
- `--enablePipelineTracking` - 启用流水线跟踪
- `--enableAutoRestart` - 启用自动重启
- `--enableTwoPhaseDebug` - 启用两阶段调试
- `-v, --verbose` - 详细输出

### stop 命令

停止 RCC 系统：

```bash
rcc stop
```

### code 命令

开发工具命令：

```bash
rcc code <action> [options]
```

动作：
- `generate` - 生成代码
- `format` - 格式化代码
- `lint` - 代码检查

## 使用指南

### 基本使用

```typescript
import { CLIEngine, createCLIEngine } from 'rcc-cli-framework';

// 创建 CLI 引擎
const cliEngine = createCLIEngine({
  name: 'my-cli',
  version: '1.0.0',
  description: 'My CLI Application'
});

// 初始化
await cliEngine.initialize();

// 执行命令
await cliEngine.execute(process.argv);
```

### 快速启动

```typescript
import { executeCommand } from 'rcc-cli-framework';

// 直接执行命令
await executeCommand(process.argv);
```

### 自定义命令

```typescript
// 注册自定义命令
cliEngine.registerCommand({
  name: 'my-command',
  description: '自定义命令',
  usage: '[options]',
  options: [
    {
      name: 'option',
      type: 'string',
      description: '命令选项'
    }
  ],
  async execute(context) {
    // 命令逻辑
  }
});
```

## 最佳实践

### 1. 命令设计原则

- **单一职责** - 每个命令只做一件事
- **一致性** - 遵循统一的命名和选项约定
- **可测试性** - 将业务逻辑与 CLI 逻辑分离
- **错误处理** - 提供清晰的错误信息和帮助

### 2. 错误处理

```typescript
async execute(context: CommandContext): Promise<void> {
  try {
    // 命令逻辑
  } catch (error) {
    context.logger.error('Command failed:', error);

    // 抛出 ConfigurationError 以便框架处理
    throw new ConfigurationError(
      `Command failed: ${error.message}`,
      'COMMAND_EXECUTION_FAILED',
      error
    );
  }
}
```

### 3. 日志记录

```typescript
async execute(context: CommandContext): Promise<void> {
  context.logger.info('Starting command execution');

  // 记录关键步骤
  context.logger.debug('Processing input:', context.args);

  // 成功时记录
  context.logger.info('Command completed successfully');
}
```

### 4. 参数验证

```typescript
async validate(context: CommandContext): Promise<boolean> {
  const input = context.args[0];

  if (!input) {
    throw new Error('Input argument is required');
  }

  if (!fs.existsSync(input)) {
    throw new Error(`Input file not found: ${input}`);
  }

  return true;
}
```

## 性能优化

### 1. 延迟加载

```typescript
// 在命令执行时动态加载模块
async execute(context: CommandContext): Promise<void> {
  const heavyModule = await import('./heavy-module');
  await heavyModule.process(context.args);
}
```

### 2. 缓存策略

```typescript
class CacheCommand implements ICommand {
  private cache = new Map();

  async execute(context: CommandContext): Promise<void> {
    const key = context.args[0];

    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const result = await expensiveOperation(key);
    this.cache.set(key, result);
    return result;
  }
}
```

## 调试和测试

### 1. 调试模式

```bash
# 启用详细日志
NODE_ENV=development rcc start --verbose

# 启用调试模式
DEBUG=rcc-cli-framework:* rcc start
```

### 2. 测试命令

```typescript
import { CLIEngine } from 'rcc-cli-framework';

describe('MyCommand', () => {
  let cliEngine: CLIEngine;

  beforeEach(async () => {
    cliEngine = createCLIEngine({
      name: 'test-cli',
      version: '1.0.0'
    });
    await cliEngine.initialize();
  });

  it('should execute command successfully', async () => {
    await cliEngine.executeCommand('my-command', ['input'], {
      option: 'value'
    });
  });
});
```

## 扩展功能

### 1. 中间件支持

```typescript
class MiddlewareCommand implements ICommand {
  name = 'middleware-command';

  async execute(context: CommandContext): Promise<void> {
    // 前置处理
    await this.preExecute(context);

    // 主要逻辑
    await this.mainExecute(context);

    // 后置处理
    await this.postExecute(context);
  }

  private async preExecute(context: CommandContext): Promise<void> {
    context.logger.info('Pre-execution setup');
  }
}
```

### 2. 钩子系统

```typescript
interface CommandHooks {
  beforeExecute?: (context: CommandContext) => Promise<void>;
  afterExecute?: (context: CommandContext) => Promise<void>;
  onError?: (error: Error, context: CommandContext) => Promise<void>;
}
```

### 3. 事件系统

```typescript
import { EventEmitter } from 'events';

class EventCommand extends EventEmitter implements ICommand {
  name = 'event-command';

  async execute(context: CommandContext): Promise<void> {
    this.emit('before:execute', context);

    try {
      // 命令逻辑
      this.emit('after:execute', context);
    } catch (error) {
      this.emit('error', error, context);
      throw error;
    }
  }
}
```

## 部署和发布

### 1. 构建命令

```bash
# 构建框架
cd sharedmodule/cli-framework
npm run build

# 发布到 npm
npm publish
```

### 2. 版本管理

```bash
# 更新版本
npm version patch/minor/major

# 发布新版本
npm publish
```

## 故障排除

### 常见问题

1. **命令未找到**
   - 检查命令是否正确注册
   - 验证命令目录配置
   - 确认模块依赖安装

2. **参数解析错误**
   - 检查选项定义是否正确
   - 验证参数类型匹配
   - 查看帮助信息

3. **模块加载失败**
   - 检查模块路径配置
   - 验证依赖版本兼容性
   - 查看错误日志

### 调试技巧

1. **启用调试日志**
   ```bash
   DEBUG=rcc-cli-framework:* rcc --verbose
   ```

2. **检查命令注册**
   ```typescript
   console.log(cliEngine.getAllCommands());
   ```

3. **验证配置**
   ```typescript
   console.log(cliEngine.config);
   ```

## 总结

RCC CLI Framework 提供了一个强大而灵活的命令行框架，支持：

- 模块化命令开发
- 插件化架构
- 自动命令发现
- 热重载开发模式
- 完整的错误处理
- 丰富的配置选项

通过遵循本文档的指导，您可以快速开发和部署高质量的命令行工具。