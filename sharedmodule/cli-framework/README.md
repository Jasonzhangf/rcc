# RCC CLI Framework

A universal command-line interface framework built on BaseModule architecture, serving as the global entry point for all RCC system commands.

## 🎯 Overview

The RCC CLI Framework is the central command entry point for the entire RCC ecosystem. It provides a dynamic, extensible command system with built-in lifecycle management, error handling, and logging powered by BaseModule.

## 🏗️ Architecture

### File Structure and Detailed Functionality

```
rcc-cli-framework/
├── src/                          # Source code directory
│   ├── core/                      # Core framework components (DO NOT DUPLICATE)
│   │   ├── CLIEngine.ts          # [CORE] Main CLI engine - extends BaseModule, handles lifecycle
│   │   │   ├── Command routing and execution
│   │   │   ├── Error handling integration
│   │   │   ├── Configuration management
│   │   │   └── Help system integration
│   │   ├── CommandRegistry.ts    # [CORE] Dynamic command registration and discovery
│   │   │   ├── Command registration/unregistration
│   │   │   ├── Directory scanning for commands
│   │   │   ├── Module pattern matching (rcc-command-*)
│   │   │   ├── Alias management
│   │   │   └── Validation and conflict resolution
│   │   └── ArgumentParser.ts     # [CORE] Command line argument processing
│   │       ├── argv parsing and normalization
│   │       ├── Option validation and type conversion
│   │       ├── Help text generation
│   │       └── Command option validation
│   ├── commands/                 # Built-in command implementations (EXTEND HERE)
│   │   ├── start/               # rcc start command implementation
│   │   │   ├── StartCommand.ts  # System startup command (migrated from startup-cli.ts)
│   │   │   │   ├── Port configuration and validation
│   │   │   │   ├── Two-phase debug system integration
│   │   │   │   ├── Auto-restart functionality
│   │   │   │   └── RCCStartupSystem integration
│   │   │   └── index.ts         # Command export
│   │   ├── stop/                # rcc stop command implementation
│   │   │   ├── StopCommand.ts   # System shutdown command
│   │   │   │   ├── Graceful shutdown logic
│   │   │   │   ├── Force stop functionality
│   │   │   │   └── Timeout management
│   │   │   └── index.ts         # Command export
│   │   └── code/                # rcc code command implementation
│   │       ├── CodeCommand.ts   # Development tools command
│   │       │   ├── Code generation templates
│   │       │   ├── Build system integration
│   │       │   ├── Watch mode functionality
│   │       │   └── Project scaffolding
│   │       └── index.ts         # Command export
│   ├── types/                    # TypeScript definitions (REFERENCE ONLY)
│   │   └── index.ts              # Core interfaces and types
│   │       ├── ICommand interface
│   │       ├── CommandContext structure
│   │       ├── CommandOption definitions
│   │       └── Configuration interfaces
│   └── index.ts                  # Framework entry point and exports
│       ├── Default configuration
│       ├── Pre-registered commands
│       ├── Utility functions
│       └── Framework initialization
├── bin/                          # Binary executables (GLOBAL ENTRY)
│   └── rcc                       # Global CLI entry script
│       ├── Error handling wrapper
│       ├── Process lifecycle management
│       └── Framework initialization
└── package.json                  # Package configuration and dependencies
    ├── CLI binary configuration
    ├── Dependency management
    └── Build and test scripts
```

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

### Building
```bash
npm run build
```

### Testing
```bash
npm test
```

### Development Mode
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