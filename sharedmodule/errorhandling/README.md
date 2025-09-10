# RCC ErrorHandling Center

A comprehensive error handling and response management system for RCC modular applications.

## Features

- **Centralized Error Management**: Single entry point for all error handling operations
- **Modular Architecture**: Clean separation of concerns with specialized components
- **Asynchronous Processing**: Support for both blocking and non-blocking error handling
- **Priority-based Queue**: Intelligent error queuing with priority management
- **Flexible Routing**: Configurable error routing based on type, severity, and custom rules
- **Template System**: Standardized response templates with dynamic content support
- **Policy Engine**: Configurable retry, fallback, and recovery strategies
- **Module Registry**: Dynamic module registration and lifecycle management

## Components

### Core Components

- **ErrorInterfaceGateway**: Main entry point for external error requests
- **ErrorQueueManager**: Manages error queue and priority processing
- **ResponseRouterEngine**: Routes errors to appropriate handlers
- **ErrorClassifier**: Classifies errors by type and severity
- **ResponseExecutor**: Executes error response actions
- **ResponseTemplateManager**: Manages response templates
- **ModuleRegistryManager**: Manages module registration
- **PolicyEngine**: Enforces error handling policies

## Installation

```bash
npm install @rcc/errorhandling
```

## Usage

### Basic Usage

```typescript
import { ErrorInterfaceGateway, ErrorQueueManager, ResponseRouterEngine } from '@rcc/errorhandling';

// Initialize components
const queueManager = new ErrorQueueManager();
const routerEngine = new ResponseRouterEngine();
const errorGateway = new ErrorInterfaceGateway(queueManager, routerEngine);

// Initialize the system
await errorGateway.initialize();

// Handle an error
const errorContext = {
  errorId: 'error-123',
  error: new Error('Something went wrong'),
  timestamp: new Date(),
  source: {
    moduleId: 'my-module',
    moduleName: 'MyModule',
    version: '1.0.0'
  },
  classification: {
    source: 'module' as any,
    type: 'technical' as any,
    severity: 'medium' as any,
    impact: 'single_module' as any,
    recoverability: 'recoverable' as any
  },
  data: {},
  config: {}
};

// Blocking error handling
const response = await errorGateway.handleError(errorContext);

// Non-blocking error handling
errorGateway.handleErrorAsync(errorContext);
```

### Module Registration

```typescript
import { ModuleRegistration } from '@rcc/errorhandling';

const moduleRegistration: ModuleRegistration = {
  moduleId: 'my-module',
  moduleName: 'MyModule',
  moduleType: 'business',
  version: '1.0.0',
  config: {
    enableLogging: true,
    enableMetrics: true
  },
  capabilities: ['error-handling', 'business-logic'],
  responseHandler: {
    handleId: 'my-module-handler',
    name: 'MyModule Handler',
    priority: 100,
    isEnabled: true,
    conditions: [],
    execute: async (error) => {
      // Custom error handling logic
      return {
        responseId: `response_${error.errorId}`,
        errorId: error.errorId,
        result: {
          status: 'success' as any,
          message: 'Error handled by MyModule',
          details: 'Custom error processing completed',
          code: 'CUSTOM_HANDLED'
        },
        timestamp: new Date(),
        processingTime: 0,
        data: {
          moduleName: 'MyModule',
          moduleId: 'my-module',
          response: { message: 'Custom response' },
          config: error.config,
          metadata: { customHandler: true }
        },
        actions: [],
        annotations: []
      };
    }
  }
};

// Register module
errorGateway.registerModule(moduleRegistration);
```

## API Reference

### ErrorInterfaceGateway

Main interface for error handling operations.

#### Methods

- `initialize(): Promise<void>` - Initialize the error handling system
- `handleError(error: ErrorContext): Promise<ErrorResponse>` - Handle error in blocking mode
- `handleErrorAsync(error: ErrorContext): void` - Handle error in non-blocking mode
- `handleBatchErrors(errors: ErrorContext[]): Promise<ErrorResponse[]>` - Handle multiple errors
- `registerModule(module: ModuleRegistration): void` - Register a module
- `unregisterModule(moduleId: string): void` - Unregister a module
- `shutdown(): Promise<void>` - Shutdown the system

### ErrorContext

Interface for error context information.

```typescript
interface ErrorContext {
  errorId: string;
  error: Error;
  timestamp: Date;
  source: ModuleSource;
  classification: ErrorClassification;
  data: Record<string, any>;
  config: ErrorHandlingConfig;
  callback?: (response: ErrorResponse) => void;
}
```

### ErrorResponse

Interface for error response information.

```typescript
interface ErrorResponse {
  responseId: string;
  errorId: string;
  result: HandlingResult;
  timestamp: Date;
  processingTime: number;
  data: ResponseData;
  actions: Action[];
  annotations: ModuleAnnotation[];
}
```

## Configuration

### Error Handling Configuration

```typescript
const config: ErrorHandlingConfig = {
  queueSize: 1000,
  flushInterval: 5000,
  enableBatchProcessing: true,
  maxBatchSize: 50,
  enableCompression: false,
  enableMetrics: true,
  enableLogging: true,
  logLevel: 'info',
  retryPolicy: {
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 2,
    maxRetryDelay: 10000
  },
  circuitBreaker: {
    failureThreshold: 5,
    recoveryTime: 30000,
    requestVolumeThreshold: 10
  }
};
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
npm run test:coverage
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Support

For issues and questions, please use the [GitHub Issues](https://github.com/rcc/rcc-errorhandling/issues) page.