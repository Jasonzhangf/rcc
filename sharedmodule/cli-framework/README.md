# RCC CLI Framework

A universal command-line interface framework based on BaseModule architecture for building modular CLI applications.

## Features

- 🏗️ **Modular Architecture**: Built on BaseModule for consistent module management
- 🔌 **Dynamic Command Loading**: Automatically discover and load command modules
- ⚙️ **Flexible Configuration**: JSON-based configuration with sensible defaults
- 🔄 **Hot Reload**: Development mode with module hot reloading
- 📝 **Rich Logging**: Comprehensive logging with multiple levels and outputs
- 🎯 **TypeScript Support**: Full TypeScript support with type definitions
- 📦 **Multiple Formats**: CommonJS and ES Module builds
- 🛠️ **Process Management**: Built-in process lifecycle management

## Installation

```bash
npm install rcc-cli-framework
```

## Quick Start

### 1. Create a CLI Application

```typescript
import { createCLIFramework } from 'rcc-cli-framework';

const cli = createCLIFramework({
  name: 'my-cli',
  version: '1.0.0',
  projectRoot: process.cwd(),
  modulePaths: ['./commands/*/src/*Module.js'],
  devMode: process.env.NODE_ENV === 'development'
});

// Initialize and run
async function main() {
  await cli.initialize();
  await cli.execute(process.argv.slice(2));
}

main().catch(console.error);
```

### 2. Create Command Modules

Create a command module that implements the `ICommandModule` interface:

```typescript
// commands/hello/src/HelloModule.js
import { ICommandModule, ICommand } from 'rcc-cli-framework';

export default class HelloModule implements ICommandModule {
  metadata = {
    name: 'hello',
    version: '1.0.0',
    description: 'Hello world commands'
  };

  async getCommands(): Promise<ICommand[]> {
    return [{
      name: 'hello',
      description: 'Say hello to someone',
      usage: 'hello [name]',
      async execute(context) {
        const name = context.args[0] || 'World';
        console.log(`Hello, ${name}!`);
      }
    }];
  }
}
```

### 3. Configuration

Create a `rcc-cli.config.json` file:

```json
{
  "framework": {
    "name": "my-cli",
    "version": "1.0.0",
    "description": "My awesome CLI application"
  },
  "modules": {
    "paths": ["./commands/*/src/*Module.js"],
    "autoLoad": true,
    "watchMode": false
  },
  "logging": {
    "level": "info",
    "console": true
  },
  "defaults": {
    "protocol": "anthropic",
    "port": 5506
  }
}
```

## API Reference

### CLIFramework

The main framework class that orchestrates command loading and execution.

#### Methods

- `initialize()`: Initialize the framework and load modules
- `execute(args: string[])`: Execute a command with given arguments
- `getCommand(name: string)`: Get a specific command by name
- `getCommands()`: Get all registered commands
- `showHelp(commandName?: string)`: Display help information
- `shutdown()`: Gracefully shutdown the framework

### ICommandModule

Interface that command modules must implement:

```typescript
interface ICommandModule {
  metadata: CommandModuleMetadata;
  getCommands(): Promise<ICommand[]>;
  initialize?(): Promise<void>;
  cleanup?(): Promise<void>;
  canLoad?(): Promise<boolean>;
}
```

### ICommand

Interface for individual commands:

```typescript
interface ICommand {
  name: string;
  description: string;
  usage: string;
  aliases?: string[];
  options?: CommandOption[];
  flags?: CommandFlag[];
  hidden?: boolean;
  execute(context: CommandContext): Promise<void>;
  validate?(context: CommandContext): Promise<boolean>;
}
```

## Architecture

The RCC CLI Framework is built on the BaseModule architecture, providing:

- **Modular Design**: Each component is a BaseModule with lifecycle management
- **Message System**: Inter-module communication through message center
- **Configuration Management**: Hierarchical configuration system
- **Process Management**: PID tracking and process lifecycle
- **Debug System**: Comprehensive logging and debugging support

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Development Mode

Enable development mode for hot reloading and enhanced debugging:

```typescript
const cli = createCLIFramework({
  // ... other options
  devMode: true,
  hotReload: true
});
```

## License

MIT

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting PRs.