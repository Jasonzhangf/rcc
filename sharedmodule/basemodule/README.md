# RCC BaseModule

A comprehensive TypeScript framework for modular development with strict architecture governance, comprehensive testing requirements, and security by design.

## Features

- **Modular Architecture**: Static compilation, dynamic instantiation
- **Comprehensive Debug System**: Multi-level logging with configurable output
- **Message Center**: Event-driven communication between modules
- **API Isolation**: Proxy-based security for external module access
- **Validation Framework**: Extensible validation rules for input data
- **Type Safety**: Full TypeScript strict mode with comprehensive interfaces
- **Testing Support**: Built-in testing framework with 100% coverage requirements

## Installation

```bash
npm install rcc-basemodule
```

## Quick Start

```typescript
import { BaseModule } from 'rcc-basemodule';

// Define your module implementation
class MyModule extends BaseModule {
  protected async initialize(): Promise<void> {
    // Your initialization logic
    this.logInfo('Module initialized');
  }

  public async receiveData(dataTransfer: DataTransfer): Promise<void> {
    // Handle incoming data
    this.logInfo('Received data', dataTransfer.data);
  }
}

// Create module instance
const moduleInfo = {
  id: 'my-module',
  name: 'My Module',
  version: '1.0.0',
  description: 'A sample module',
  type: 'processor'
};

const myModule = new MyModule(moduleInfo);
await myModule.initialize();
```

## Core Concepts

### BaseModule

All modules extend the `BaseModule` class, which provides:

- **Lifecycle Management**: `initialize()`, `destroy()` methods
- **Connection Management**: Input/output connection handling
- **Data Transfer**: Secure data transfer between modules
- **Message System**: Event-driven communication
- **Debug Logging**: Multi-level logging with configurable output
- **Configuration**: Module configuration management

### Interfaces

#### ModuleInfo
```typescript
interface ModuleInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  type: string;
  metadata?: Record<string, any>;
}
```

#### Connection
```typescript
interface ConnectionInfo {
  id: string;
  type: 'input' | 'output';
  targetModuleId?: string;
  metadata?: Record<string, any>;
}
```

#### Message
```typescript
interface Message {
  id: string;
  type: string;
  source: string;
  target?: string;
  payload: any;
  timestamp: number;
  correlationId?: string;
  metadata?: Record<string, any>;
  ttl?: number;
  priority?: number;
}
```

## Debug System

The BaseModule provides a comprehensive debug system with configurable logging levels and **dynamic directory management**:

### Configuration

```typescript
// Configure debug settings
myModule.setDebugConfig({
  enabled: true,
  level: 'debug',
  recordStack: true,
  maxLogEntries: 1000,
  consoleOutput: true,
  trackDataFlow: true
});

// Log at different levels
myModule.trace('Trace message', { data: 'value' });
myModule.debug('Debug message');
myModule.logInfo('Info message');
myModule.warn('Warning message');
myModule.error('Error message');
```

### Debug Levels

- **trace**: Most detailed logging, for deep debugging
- **debug**: Standard debugging information
- **info**: General information messages
- **warn**: Warning messages
- **error**: Error messages with stack traces

### 🎯 Dynamic Log Directory Configuration

**Key Feature**: The debug system supports runtime log directory updates without restarting the system.

#### Startup Configuration

When a module starts, it automatically configures the debug system to log to the **system-start** directory:

```typescript
// Default behavior: logs to ~/.rcc/debug/system-start/
const myModule = new MyModule(moduleInfo);
await myModule.initialize();

// System startup logs are automatically recorded
myModule.logInfo('System initialized'); // Logged to system-start directory
```

#### Runtime Directory Updates

Change the log directory at runtime using the configuration update interface:

```typescript
// Example: Switch to port-specific logging
const newConfig = {
  baseDirectory: '~/.rcc/debug/port-5506',
  phase: 'port-specific',
  port: 5506
};

// Update configuration - logs will now be written to the new directory
myModule.setDebugConfig(newConfig);

// Subsequent logs go to the new directory
myModule.logInfo('Service now running on port 5506'); // Logged to port-5506 directory
```

#### Configuration Interface

```typescript
interface DebugConfig {
  enabled: boolean;           // Enable/disable debug logging
  level: DebugLevel;          // Minimum log level to record
  baseDirectory: string;     // Base directory for log files (default: ~/.rcc/debug)
  phase: 'system-start' | 'port-specific';  // Current logging phase
  port?: number;             // Port number for port-specific logging
  maxLogEntries: number;     // Maximum log entries to keep in memory
  consoleOutput: boolean;     // Enable console output
  recordStack: boolean;       // Record stack traces for errors
  trackDataFlow: boolean;    // Track data flow between modules
}
```

#### Usage Examples

**1. Basic Usage**
```typescript
class MyService extends BaseModule {
  protected async initialize(): Promise<void> {
    // Logs to ~/.rcc/debug/system-start/
    this.logInfo('Service starting up');
    
    // Initialize your service
    await this.startService();
    
    this.logInfo('Service initialized successfully');
  }
  
  private async startService(): Promise<void> {
    // Update config when service port is known
    const port = await this.findAvailablePort();
    
    // Switch to port-specific logging
    this.setDebugConfig({
      ...this.getDebugConfig(),
      baseDirectory: `~/.rcc/debug/port-${port}`,
      phase: 'port-specific',
      port: port
    });
    
    this.logInfo(`Service started on port ${port}`);
  }
}
```

**2. Multi-Instance Support**
```typescript
class ClusterManager extends BaseModule {
  private instances: Map<string, BaseModule> = new Map();
  
  public async addInstance(instanceId: string, config: any): Promise<void> {
    const instance = new ServiceInstance(config);
    
    // Configure instance-specific logging
    instance.setDebugConfig({
      enabled: true,
      baseDirectory: `~/.rcc/debug/instance-${instanceId}`,
      phase: 'port-specific',
      port: config.port
    });
    
    await instance.initialize();
    this.instances.set(instanceId, instance);
    
    this.logInfo(`Instance ${instanceId} added with dedicated logging`);
  }
}
```

**3. Configuration Persistence**
```typescript
class ConfigurableService extends BaseModule {
  private loadSavedConfig(): DebugConfig {
    // Load from file, database, or environment
    const saved = this.loadConfiguration();
    
    return {
      enabled: saved.debug?.enabled ?? true,
      level: saved.debug?.level ?? 'info',
      baseDirectory: saved.debug?.baseDirectory ?? '~/.rcc/debug',
      phase: saved.debug?.phase ?? 'system-start',
      port: saved.debug?.port,
      maxLogEntries: saved.debug?.maxLogEntries ?? 1000,
      consoleOutput: saved.debug?.consoleOutput ?? true,
      recordStack: saved.debug?.recordStack ?? true,
      trackDataFlow: saved.debug?.trackDataFlow ?? true
    };
  }
  
  protected async initialize(): Promise<void> {
    const config = this.loadSavedConfig();
    this.setDebugConfig(config);
    
    this.logInfo('Configuration loaded and applied', config);
  }
}
```

### Best Practices

1. **Startup Phase**: Always use `system-start` phase during initialization
2. **Port Assignment**: Switch to `port-specific` phase when your service port is determined
3. **Directory Structure**: Use consistent naming patterns for log directories
4. **Configuration Updates**: Use `setDebugConfig()` for runtime updates, never modify internal properties directly
5. **Log Rotation**: The system automatically manages log files and handles rotation

## Message System

The BaseModule provides three ways to send messages:

### 1. Fire and Forget
```typescript
myModule.sendMessage('custom-event', { data: 'value' });
```

### 2. Request-Response (Blocking)
```typescript
const response = await myModule.sendRequest(
  'get-status',
  { id: '123' },
  'target-module-id'
);

if (response.success) {
  console.log('Status:', response.data);
} else {
  console.error('Error:', response.error);
}
```

### 3. Request-Response (Non-blocking)
```typescript
myModule.sendRequestAsync(
  'get-status',
  { id: '123' },
  'target-module-id',
  (response) => {
    if (response.success) {
      console.log('Status:', response.data);
    }
  }
);
```

### Broadcasting

```typescript
myModule.broadcastMessage('system-update', { version: '1.0.0' });
```

## Validation Framework

The BaseModule includes a validation framework for input data:

```typescript
// Add validation rules
this.validationRules = [
  {
    field: 'name',
    type: 'required',
    message: 'Name is required'
  },
  {
    field: 'age',
    type: 'number',
    message: 'Age must be a number'
  },
  {
    field: 'email',
    type: 'custom',
    message: 'Invalid email format',
    validator: (value) => /^[^@]+@[^@]+\.[^@]+$/.test(value)
  }
];

// Validate input
const result = this.validateInput(inputData);
if (!result.isValid) {
  console.error('Validation errors:', result.errors);
}
```

### Validation Types

- **required**: Field must be present and not null/undefined
- **string**: Field must be a string
- **number**: Field must be a number
- **boolean**: Field must be a boolean
- **object**: Field must be an object
- **array**: Field must be an array
- **custom**: Custom validation function

## API Isolation

The BaseModule supports API isolation to restrict external access:

```typescript
import { ApiIsolation } from 'rcc-basemodule';

// Create isolated interface
const moduleApi = ApiIsolation.createModuleInterface(myModule, {
  methods: ['publicMethod1', 'publicMethod2'],
  properties: ['readOnlyProperty']
});

// Only specified methods and properties are accessible
moduleApi.publicMethod1(); // ✅ Allowed
moduleApi.internalMethod(); // ❌ Blocked
```

## Testing

BaseModule provides comprehensive testing support:

### Installing Test Dependencies

```bash
npm install --save-dev jest @types/jest ts-jest
```

### Example Test

```typescript
import { BaseModule } from 'rcc-basemodule';

describe('MyModule', () => {
  let myModule: MyModule;

  beforeEach(() => {
    myModule = new MyModule({
      id: 'test-module',
      name: 'Test Module',
      version: '1.0.0',
      description: 'Test module',
      type: 'test'
    });
  });

  test('should initialize correctly', async () => {
    await myModule.initialize();
    expect(myModule.getInfo()).toEqual({
      id: 'test-module',
      name: 'Test Module',
      version: '1.0.0',
      description: 'Test module',
      type: 'test'
    });
  });

  test('should handle data transfer', async () => {
    await myModule.initialize();
    const mockDataTransfer = {
      id: 'test-transfer',
      sourceConnectionId: 'source',
      targetConnectionId: 'target',
      data: { test: 'value' },
      timestamp: Date.now(),
      metadata: {}
    };
    
    await myModule.receiveData(mockDataTransfer);
    // Verify your logic
  });
});
```

### Running Tests

```bash
npm test                    # Run all tests
npm run test:coverage       # Run tests with coverage
npm run test:watch          # Run tests in watch mode
```

## Building

The BaseModule supports multiple build formats:

```bash
npm run build              # Build all formats
npm run build:cjs          # Build CommonJS format
npm run build:esm          # Build ES Module format
npm run build:types        # Build type declarations
```

## Code Quality

### Linting
```bash
npm run lint               # Check code style
npm run lint:fix           # Fix code style issues
```

### Type Checking
```bash
npm run typecheck          # Check TypeScript types
```

### Formatting
```bash
npm run format             # Format code with Prettier
npm run format:check       # Check code formatting
```

## Configuration

### Dependencies

- **uuid**: Unique identifier generation
- **typescript**: TypeScript language support

### Peer Dependencies

None - BaseModule is designed to be standalone.

## Browser Support

BaseModule supports all modern browsers and Node.js versions >= 16.0.0.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add comprehensive tests
5. Ensure all tests pass
6. Submit a pull request

### Development Setup

```bash
git clone https://github.com/rcc/rcc-basemodule.git
cd rcc-basemodule
npm install
npm run dev
```

## License

MIT License - see LICENSE file for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for details on version changes and updates.

## Support

For issues and questions:
- GitHub Issues: [RCC BaseModule Issues](https://github.com/rcc/rcc-basemodule/issues)
- Documentation: [RCC Documentation](https://rcc.readthedocs.io)

## Roadmap

- [ ] Enhanced plugin system
- [ ] Performance monitoring integration
- [ ] Advanced debugging tools
- [ ] Cloud deployment support
- [ ] Real-time collaboration features