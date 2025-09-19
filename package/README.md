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

The BaseModule provides a comprehensive debug system with configurable logging levels:

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
myModule.log('Debug message');
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