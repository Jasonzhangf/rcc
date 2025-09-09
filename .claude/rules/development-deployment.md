# Development and Deployment Rules

This document defines the development workflows, documentation requirements, CI/CD standards, and coding standards for the RCC modular system.

## Module Structure and Documentation Requirements

### Rule 1.1: Module Directory Structure
- **Requirement**: Each module MUST follow a standardized directory structure
- **Rationale**: Ensures consistency, maintainability, and easy discovery of resources
- **Implementation**: Include README, tests, and implementation in module directory

```bash
# ✅ Correct Module Structure
src/modules/example-module/
├── README.md                    # Module documentation
├── index.ts                     # Module entry point
├── ExampleModule.ts            # Main module implementation
├── interfaces/
│   └── IExampleModule.ts       # Module interfaces
├── constants/
│   └── ExampleModuleConstants.ts # Module constants
├── utils/
│   └── ExampleModuleUtils.ts   # Module utilities
└── tests/
    ├── ExampleModule.test.ts   # Module unit tests
    ├── integration/
    │   └── ExampleModuleIntegration.test.ts # Integration tests
    └── fixtures/
        └── SampleData.ts       # Test fixtures

# ❌ Violation - Inconsistent Structure
src/modules/
├── ExampleModule.ts           # Just implementation file
└── more-examples/
    └── AnotherModule.ts       # No structure, no documentation
```

### Rule 1.2: Module Registration Compliance
- **Requirement**: All modules MUST follow the registration compliance requirements
- **Rationale**: Ensures proper integration with the module registry and messaging system
- **Implementation**: Follow the guidelines in [Module Registration Compliance](../../doc/MODULE_REGISTRATION_COMPLIANCE.md)

```typescript
// ✅ Correct Module Registration
// Register module type
const registry = ModuleRegistry.getInstance();
registry.registerModuleType('my-module-type', MyModuleClass);

// Create module instance
const moduleInfo: ModuleInfo = {
  id: 'unique-module-id',
  name: 'My Module',
  version: '1.0.0',
  description: 'A sample module',
  type: 'my-module-type'
};

const module = await registry.createModule<MyModuleClass>(moduleInfo);

// ❌ Violation - Bypassing Registry
// Direct instantiation without registration
const module = new MyModule(moduleInfo);
```

### Rule 1.2: Mandatory Module README
- **Requirement**: Each module directory MUST have a comprehensive README.md
- **Rationale**: Provides clear documentation for developers and maintainers
- **Implementation**: Use structured README template with all required sections

```markdown
<!-- ✅ Correct README.md Template -->

# Example Module

## Overview

{Brief description of module purpose and functionality}

## Features

- {Feature 1 with description}
- {Feature 2 with description}
- {Feature 3 with description}

## Installation

```bash
# Module installation if required
npm install module-dependencies
```

## Usage

### Basic Usage

```typescript
import { ExampleModule } from './index';
import { ModuleInfo } from '../../interfaces/ModuleInfo';

const moduleInfo: ModuleInfo = {
  id: 'example-1',
  name: 'Example Module',
  version: '1.0.0',
  description: 'An example module for demonstration',
  type: 'example'
};

const module = ExampleModule.createInstance(moduleInfo);
await module.initialize();
```

### API Reference

#### Methods

| Method | Parameters | Return Type | Description |
|--------|------------|-------------|-------------|
| `processMessage` | `message: string` | `Promise<void>` | Processes incoming messages |
| `getStatus` | None | `string` | Returns current module status |

#### Properties

| Property | Type | Read Only | Description |
|----------|------|-----------|-------------|
| `name` | `string` | Yes | Module name |
| `version` | `string` | Yes | Module version |

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EXAMPLE_MODULE_TIMEOUT` | No | `5000` | Timeout in milliseconds |
| `EXAMPLE_MODULE_LOG_LEVEL` | No | `info` | Logging level |

### Configuration Schema

```typescript
interface ExampleModuleConfig {
  timeoutMs: number;
  enableLogging: boolean;
  maxRetries: number;
}
```

## Testing

### Running Tests

```bash
# Run all tests
npm test -- --testPathPattern=example-module

# Run specific test file
npm test -- ExampleModule.test.ts

# Run tests with coverage
npm test -- --coverage
```

### Test Structure

```
tests/
├── ExampleModule.test.ts          # Unit tests
├── integration/
│   └── ExampleModuleIntegration.test.ts
└── fixtures/
    ├── validData.ts
    └── invalidData.ts
```

## Dependencies

### Runtime Dependencies

- `@types/node`: ^24.3.1
- `typescript`: ^5.9.2

### Development Dependencies

- `jest`: Latest version
- `@types/jest`: Latest version

## Integration

### Module Registration

```typescript
import { ModuleRegistry } from '../../registry/ModuleRegistry';
import { ExampleModule } from './index';

const registry = ModuleRegistry.getInstance();
registry.registerModuleType('example', ExampleModule);
```

### API Isolation

```typescript
import { ApiIsolation } from '../../utils/ApiIsolation';

const moduleApi = ApiIsolation.createModuleInterface(module, {
  methods: ['processMessage', 'getStatus'],
  properties: []
});
```

## Troubleshooting

### Common Issues

1. **Module not initializing**
   - Check if all required dependencies are installed
   - Verify configuration is valid

2. **Tests failing**
   - Ensure test environment is properly set up
   - Check test fixtures are up to date

### Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `INIT_ERROR` | Module initialization failed | Check configuration |
| `VALIDATION_ERROR` | Input validation failed | Check input data format |

## Contributing

1. Follow the project's development rules
2. Ensure all tests pass
3. Update documentation for any new features
4. Follow the anti-hardcoding policy

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | YYYY-MM-DD | Initial release |

## License

{License information}

<!-- ❌ Violation - Inadequate README -->

# Example Module

This is an example module.

## Usage

```typescript
const module = new ExampleModule();
module.process();
```

<!-- Missing: Overview, API reference, testing, dependencies, etc. -->
```

### Rule 1.3: Module API Interface Documentation
- **Requirement**: All module API interfaces MUST be documented in a central API registry
- **Rationale**: Provides comprehensive API reference for all modules
- **Implementation**: Maintain API interface documentation

```markdown
<!-- ✅ Correct API Interface Documentation -->
<!-- docs/api-interfaces.md -->

# API Interface Documentation

## Module Type: data-processor

### Interface: DataProcessor

```typescript
interface DataProcessor {
  // Processing Methods
  processData(data: ProcessableData): Promise<ProcessingResult>;
  batchProcess(data: ProcessableData[]): Promise<ProcessingResult[]>;
  
  // Configuration Methods
  configure(config: ProcessorConfig): Promise<void>;
  getConfiguration(): ProcessorConfig;
  
  // Status Methods
  getStatus(): ProcessorStatus;
  isAvailable(): boolean;
  
  // Lifecycle Methods
  initialize(): Promise<void>;
  destroy(): Promise<void>;
}
```

#### API Methods

##### processData(data: ProcessableData): Promise<ProcessingResult>
- **Description**: Processes a single data item
- **Parameters**:
  - `data`: `ProcessableData` - The data to process
- **Returns**: `Promise<ProcessingResult>` - Processing result with status
- **Throws**: `ValidationError` if data is invalid
- **Throws**: `ProcessingError` if processing fails

##### batchProcess(data: ProcessableData[]): Promise<ProcessingResult[]>
- **Description**: Processes multiple data items in batch
- **Parameters**:
  - `data`: `ProcessableData[]` - Array of data items to process
- **Returns**: `Promise<ProcessingResult[]>` - Array of processing results
- **Throws**: `ValidationError` if any data is invalid
- **Throws**: `BatchProcessingError` if batch processing fails

#### Data Types

```typescript
interface ProcessableData {
  id: string;
  content: any;
  priority: number;
  metadata: Record<string, any>;
}

interface ProcessingResult {
  success: boolean;
  processedData?: any;
  error?: string;
  processingTime: number;
}
```

---

## Module Type: authentication

### Interface: AuthenticationModule

```typescript
interface AuthenticationModule {
  authenticate(credentials: Credentials): Promise<AuthResult>;
  validateToken(token: string): Promise<ValidationResult>;
  refreshToken(refreshToken: string): Promise<TokenPair>;
  revokeToken(token: string): Promise<void>;
}
```

#### API Methods

##### authenticate(credentials: Credentials): Promise<AuthResult>
- **Description**: Authenticates user credentials
- **Parameters**:
  - `credentials`: `Credentials` - User credentials (username/password, API key, etc.)
- **Returns**: `Promise<AuthResult>` - Authentication result with tokens
- **Throws**: `AuthenticationError` if authentication fails
- **Throws**: `ValidationError` if credentials are invalid

#### Data Types

```typescript
interface Credentials {
  username?: string;
  password?: string;
  apiKey?: string;
  oauthToken?: string;
}

interface AuthResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  user?: UserInfo;
}
```

---

## Module Type: logger

### Interface: LoggerModule

```typescript
interface LoggerModule {
  log(level: LogLevel, message: string, metadata?: any): Promise<void>;
  error(message: string, error?: Error): Promise<void>;
  warn(message: string, metadata?: any): Promise<void>;
  info(message: string, metadata?: any): Promise<void>;
  debug(message: string, metadata?: any): Promise<void>;
}
```

#### API Methods

##### log(level: LogLevel, message: string, metadata?: any): Promise<void>
- **Description**: Logs a message at the specified level
- **Parameters**:
  - `level`: `LogLevel` - Log level (error, warn, info, debug)
  - `message`: `string` - Log message
  - `metadata`: `any` - Optional metadata to include with the log
- **Returns**: `Promise<void>` - Resolves when log is written
- **Throws**: `LoggingError` if logging fails

#### Data Types

```typescript
type LogLevel = 'error' | 'warn' | 'info' | 'debug';
```

---

## Module Registry

### Available Modules

| Module Type | Interface | Description | Version |
|-------------|-----------|-------------|---------|
| `data-processor` | DataProcessor | Processes data items with validation | 1.0.0 |
| `authentication` | AuthenticationModule | Handles user authentication | 1.0.0 |
| `logger` | LoggerModule | Provides logging capabilities | 1.0.0 |

### Usage Examples

#### Data Processing

```typescript
import { ModuleRegistry } from '../src/registry/ModuleRegistry';
import { ApiIsolation } from '../src/utils/ApiIsolation';

const registry = ModuleRegistry.getInstance();

// Create data processor module
const moduleInfo = {
  id: 'processor-1',
  name: 'Data Processor',
  version: '1.0.0',
  description: 'Processes data items',
  type: 'data-processor'
};

const processor = await registry.createModule(moduleInfo);

// Create API with only processing methods
const processorApi = ApiIsolation.createModuleInterface(processor, {
  methods: ['processData', 'batchProcess', 'getStatus'],
  properties: []
});

// Use the API
const result = await processorApi.processData({
  id: 'data-1',
  content: { message: 'Hello World' },
  priority: 1,
  metadata: {}
});
```

#### Authentication

```typescript
// Create authentication module
const authInfo = {
  id: 'auth-1',
  name: 'Authentication Service',
  version: '1.0.0',
  description: 'Handles user authentication',
  type: 'authentication'
};

const authModule = await registry.createModule(authInfo);

// Create secure API with authentication methods
const authApi = ApiIsolation.createModuleInterface(authModule, {
  methods: ['authenticate', 'validateToken', 'refreshToken'],
  properties: []
});

// Authenticate user
const authResult = await authApi.authenticate({
  username: 'user@example.com',
  password: 'secure-password'
});
```

<!-- ❌ Violation - Missing API Documentation -->
<!-- API interfaces are not documented or centralized -->
```

## Anti-Hardcoding Policy

### Rule 2.1: Constants-Only Configuration
- **Requirement**: All hardcoded values MUST be replaced with constants
- **Rationale**: Enables configuration, localization, and maintainability
- **Implementation**: Use dedicated constants files and modules

```typescript
// ✅ Correct Implementation - Constants File
// constants/ExampleModuleConstants.ts

export const EXAMPLE_MODULE_CONSTANTS = {
  // Timeouts
  DEFAULT_TIMEOUT_MS: 5000,
  MAX_TIMEOUT_MS: 30000,
  RETRY_TIMEOUT_MS: 1000,
  
  // Limits
  MAX_BATCH_SIZE: 100,
  MAX_RETRY_ATTEMPTS: 3,
  MAX_QUEUE_SIZE: 1000,
  
  // Error Messages
  ERRORS: {
    VALIDATION_REQUIRED: 'Field {field} is required',
    VALIDATION_INVALID_FORMAT: 'Field {field} has invalid format',
    TIMEOUT_EXCEEDED: 'Operation timed out after {timeout}ms',
    MAX_RETRIES_EXCEEDED: 'Maximum retry attempts ({max}) exceeded'
  },
  
  // Status Codes
  STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
  },
  
  // API Endpoints
  API_ENDPOINTS: {
    BASE_URL: process.env.API_BASE_URL || 'https://api.example.com',
    VERSION: 'v1',
    ENDPOINTS: {
      PROCESS: '/process',
      STATUS: '/status/{id}',
      BATCH: '/batch'
    }
  },
  
  // Default Configuration
  DEFAULT_CONFIG: {
    enableLogging: process.env.ENABLE_LOGGING === 'true',
    logLevel: process.env.LOG_LEVEL || 'info',
    enableValidation: true,
    sanitizeOutput: true
  }
};

// Usage in Module
import { EXAMPLE_MODULE_CONSTANTS } from './constants/ExampleModuleConstants';

export class ExampleModule extends BaseModule {
  public async processData(data: any): Promise<void> {
    const timeout = EXAMPLE_MODULE_CONSTANTS.DEFAULT_TIMEOUT_MS;
    const maxRetries = EXAMPLE_MODULE_CONSTANTS.MAX_RETRY_ATTEMPTS;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.processWithTimeout(data, timeout);
        break;
      } catch (error) {
        if (attempt === maxRetries) {
          throw new Error(
            EXAMPLE_MODULE_CONSTANTS.ERRORS.MAX_RETRIES_EXCEEDED
              .replace('{max}', maxRetries.toString())
          );
        }
        
        await this.delay(EXAMPLE_MODULE_CONSTANTS.RETRY_TIMEOUT_MS);
      }
    }
  }
  
  private async processWithTimeout(data: any, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error(
          EXAMPLE_MODULE_CONSTANTS.ERRORS.TIMEOUT_EXCEEDED
            .replace('{timeout}', timeout.toString())
        ));
      }, timeout);
      
      // Process data
      resolve();
    });
  }
}

// ❌ Violation - Hardcoded Values
export class BadExampleModule extends BaseModule {
  public async processData(data: any): Promise<void> {
    const timeout = 5000; // Hardcoded
    const maxRetries = 3; // Hardcoded
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.processWithTimeout(data, timeout);
        break;
      } catch (error) {
        if (attempt === maxRetries) {
          throw new Error('Maximum retry attempts (3) exceeded'); // Hardcoded
        }
        
        await this.delay(1000); // Hardcoded
      }
    }
  }
}
```

### Rule 2.2: Environment Variable Configuration
- **Requirement**: All runtime configuration MUST use environment variables
- **Rationale**: Enables different configurations for different environments
- **Implementation**: Use environment variables with fallback to constants

```typescript
// ✅ Correct Configuration Management
// config/EnvironmentConfig.ts

interface AppConfig {
  timeoutMs: number;
  maxBatchSize: number;
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  apiBaseUrl: string;
  maxRetries: number;
}

class EnvironmentConfig {
  private static instance: EnvironmentConfig;
  private config: AppConfig;
  
  private constructor() {
    this.config = this.loadConfiguration();
  }
  
  public static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig();
    }
    return EnvironmentConfig.instance;
  }
  
  public get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }
  
  public set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    this.config[key] = value;
  }
  
  public getAll(): AppConfig {
    return { ...this.config };
  }
  
  private loadConfiguration(): AppConfig {
    return {
      timeoutMs: this.getNumberEnv('MODULE_TIMEOUT_MS', 5000),
      maxBatchSize: this.getNumberEnv('MODULE_MAX_BATCH_SIZE', 100),
      enableLogging: this.getBooleanEnv('MODULE_ENABLE_LOGGING', true),
      logLevel: this.getStringEnv('MODULE_LOG_LEVEL', 'info') as 'debug' | 'info' | 'warn' | 'error',
      apiBaseUrl: this.getStringEnv('MODULE_API_BASE_URL', 'https://api.example.com'),
      maxRetries: this.getNumberEnv('MODULE_MAX_RETRIES', 3)
    };
  }
  
  private getStringEnv(key: string, defaultValue: string): string {
    const value = process.env[key];
    return value || defaultValue;
  }
  
  private getNumberEnv(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (value) {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return defaultValue;
  }
  
  private getBooleanEnv(key: string, defaultValue: boolean): boolean {
    const value = process.env[key];
    if (value) {
      return value.toLowerCase() === 'true' || value === '1';
    }
    return defaultValue;
  }
}

// Usage in Module
const config = EnvironmentConfig.getInstance();

export class ConfiguredModule extends BaseModule {
  public async processData(data: any): Promise<void> {
    const timeout = config.get('timeoutMs');
    const maxRetries = config.get('maxRetries');
    const enableLogging = config.get('enableLogging');
    
    if (enableLogging) {
      console.log(`Processing data with timeout: ${timeout}ms`);
    }
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.processWithTimeout(data, timeout);
        break;
      } catch (error) {
        if (attempt === maxRetries) {
          throw new Error(
            `Maximum retry attempts (${maxRetries}) exceeded`
          );
        }
        
        await this.delay(config.get('timeoutMs') / 5);
      }
    }
  }
}

// ❌ Violation - No Environment Configuration
export class UnconfiguredModule extends BaseModule {
  private timeout = 5000; // Hardcoded, no environment support
  
  public async processData(data: any): Promise<void> {
    // Cannot change configuration without code changes
  }
}
```

## Testing Requirements

### Rule 3.1: Comprehensive Test Coverage
- **Requirement**: All modules MUST have complete test coverage
- **Rationale**: Ensures functionality works as expected and prevents regressions
- **Implementation**: Use Jest with unit, integration, and fixture-based tests

```typescript
// ✅ Correct Test Structure
// tests/ExampleModule.test.ts

import { ExampleModule } from '../ExampleModule';
import { ModuleInfo } from '../../interfaces/ModuleInfo';
import { EXAMPLE_MODULE_CONSTANTS } from '../constants/ExampleModuleConstants';

describe('ExampleModule', () => {
  let module: ExampleModule;
  let moduleInfo: ModuleInfo;
  
  beforeEach(async () => {
    moduleInfo = {
      id: 'test-module',
      name: 'Test Module',
      version: '1.0.0',
      description: 'Test module for unit tests',
      type: 'example'
    };
    
    module = ExampleModule.createInstance(moduleInfo);
    await module.initialize();
  });
  
  afterEach(async () => {
    await module.destroy();
  });
  
  describe('processMessage', () => {
    it('should process valid message successfully', async () => {
      const message = 'Hello World';
      
      await expect(module.processMessage(message)).resolves.not.toThrow();
    });
    
    it('should reject empty messages', async () => {
      const message = '';
      
      await expect(module.processMessage(message)).rejects.toThrow('Message cannot be empty');
    });
    
    it('should reject messages exceeding max length', async () => {
      const longMessage = 'a'.repeat(EXAMPLE_MODULE_CONSTANTS.MAX_MESSAGE_LENGTH + 1);
      
      await expect(module.processMessage(longMessage)).rejects.toThrow('Message too long');
    });
  });
  
  describe('getStatus', () => {
    it('should return current status', () => {
      const status = module.getStatus();
      
      expect(typeof status).toBe('string');
      expect(status).toContain(module.info.id);
    });
  });
  
  describe('connection management', () => {
    it('should add input connection successfully', () => {
      const connection = {
        id: 'test-connection',
        sourceModuleId: 'test-source',
        targetModuleId: module.info.id,
        type: 'input' as const,
        status: 'connected' as const
      };
      
      expect(() => module.addInputConnection(connection)).not.toThrow();
      expect(module.getInputConnections()).toContain(connection);
    });
    
    it('should reject invalid connection type', () => {
      const invalidConnection = {
        id: 'test-connection',
        sourceModuleId: 'test-source',
        targetModuleId: module.info.id,
        type: 'output' as const, // Wrong type for input connection
        status: 'connected' as const
      };
      
      expect(() => module.addInputConnection(invalidConnection)).toThrow('Invalid connection type for input');
    });
  });
  
  describe('lifecycle management', () => {
    it('should initialize and destroy correctly', async () => {
      expect(module.initialized).toBe(true);
      
      await module.destroy();
      
      expect(module.initialized).toBe(false);
      expect(module.getInputConnections().length).toBe(0);
      expect(module.getOutputConnections().length).toBe(0);
    });
  });
});

// Integration tests
// tests/integration/ExampleModuleIntegration.test.ts

import { ModuleRegistry } from '../../../registry/ModuleRegistry';
import { ApiIsolation } from '../../../utils/ApiIsolation';

describe('ExampleModule Integration', () => {
  let registry: ModuleRegistry;
  
  beforeEach(() => {
    registry = ModuleRegistry.getInstance();
    registry.registerModuleType('example', ExampleModule);
  });
  
  afterEach(async () => {
    await registry.clear();
  });
  
  it('should work with module registry', async () => {
    const moduleInfo = {
      id: 'integration-test',
      name: 'Integration Test Module',
      version: '1.0.0',
      description: 'Integration test for ExampleModule',
      type: 'example'
    };
    
    const module = await registry.createModule<ExampleModule>(moduleInfo);
    
    expect(module).toBeInstanceOf(ExampleModule);
    expect(module.getInfo().id).toBe('integration-test');
  });
  
  it('should work with API isolation', async () => {
    const moduleInfo = {
      id: 'api-test',
      name: 'API Test Module',
      version: '1.0.0',
      description: 'API isolation test for ExampleModule',
      type: 'example'
    };
    
    const module = await registry.createModule<ExampleModule>(moduleInfo);
    const moduleApi = ApiIsolation.createModuleInterface(module, {
      methods: ['processMessage', 'getStatus'],
      properties: []
    });
    
    expect(moduleApi.processMessage).toBeDefined();
    expect(moduleApi.getStatus).toBeDefined();
    expect((moduleApi as any).shouldNotExist).toBeUndefined();
  });
});

// Test fixtures
// tests/fixtures/SampleData.ts

export const VALID_MESSAGES = [
  'Hello World',
  'Test message with proper length',
  'Another valid message for testing'
];

export const INVALID_MESSAGES = [
  '', // Empty
  'a'.repeat(1001), // Too long
  null, // Null
  undefined, // Undefined
];

export const VALID_CONNECTIONS = [
  {
    id: 'input-1',
    sourceModuleId: 'source-1',
    targetModuleId: 'target-1',
    type: 'input' as const,
    status: 'connected' as const
  },
  {
    id: 'output-1',
    sourceModuleId: 'source-1',
    targetModuleId: 'target-1',
    type: 'output' as const,
    status: 'connected' as const
  }
];

export const INVALID_CONNECTIONS = [
  {
    id: 'invalid-type',
    sourceModuleId: 'source-1',
    targetModuleId: 'target-1',
    type: 'input' as const,
    status: 'invalid' as const // Invalid status
  }
];

// ❌ Violation - Inadequate Testing
// No tests, or only basic happy path tests
```

### Rule 3.2: Test Environment Configuration
- **Requirement**: All tests MUST have proper environment configuration
- **Rationale**: Ensures tests run consistently across different environments
- **Implementation**: Use Jest configuration with environment setup

```typescript
// ✅ Correct Test Configuration
// jest.config.js

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts',
    '**/tests/**/*.test.ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 10000,
  verbose: true,
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  }
};

// tests/setup.ts

import { ModuleRegistry } from '../src/registry/ModuleRegistry';

// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.ENABLE_LOGGING = 'false';
  process.env.LOG_LEVEL = 'error';
  process.env.API_BASE_URL = 'http://test-api.example.com';
});

beforeEach(() => {
  // Clear module registry before each test
  const registry = ModuleRegistry.getInstance();
  registry.clear();
});

afterAll(() => {
  // Cleanup after all tests
  const registry = ModuleRegistry.getInstance();
  registry.clear();
});

// tests/utils/testHelpers.ts

export const createTestModuleInfo = (overrides = {}): ModuleInfo => ({
  id: 'test-module',
  name: 'Test Module',
  version: '1.0.0',
  description: 'Test module',
  type: 'test',
  ...overrides
});

export const waitFor = async (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const expectAsyncError = async (promise: Promise<any>, expectedError: string): Promise<void> => {
  await expect(promise).rejects.toThrow(expectedError);
};

// ❌ Violation - Poor Test Configuration
// tests without proper setup, environment configuration, or helpers
```

## CI/CD Standards

### Rule 4.1: Complete CI/CD Pipeline
- **Requirement**: All modules MUST have complete CI/CD pipeline configuration
- **Rationale**: Ensures automated testing, building, and deployment
- **Implementation**: Use GitHub Actions with comprehensive workflow

```yaml
# ✅ Correct CI/CD Pipeline
# .github/workflows/ci-cd.yml

name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  NODE_VERSION: '18'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # Code Quality and Linting
  lint-and-format:
    name: Lint and Format Check
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Check formatting
        run: npm run format:check
        
      - name: Run ESLint
        run: npm run lint
        
      - name: Run TypeScript compilation
        run: npm run build:check

  # Testing
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    needs: lint-and-format
    
    strategy:
      matrix:
        node-version: [16, 18, 20]
        
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit tests
        run: npm run test:unit
        
      - name: Run integration tests
        run: npm run test:integration
        
      - name: Run tests with coverage
        run: npm run test:coverage
        
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella
          fail_ci_if_error: true

  # Build and Security Scan
  build-and-scan:
    name: Build and Security Scan
    runs-on: ubuntu-latest
    needs: test
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build project
        run: npm run build
        
      - name: Run security audit
        run: npm audit --audit-level=moderate
        
      - name: Run dependency vulnerability scan
        uses: securecodewarrior/github-action-add-sarif@v1
        with:
          sarif-file: 'vulnerability-scan.sarif'

  # E2E Testing
  test-e2e:
    name: End-to-End Testing
    runs-on: ubuntu-latest
    needs: build-and-scan
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build project
        run: npm run build
        
      - name: Run E2E tests
        run: npm run test:e2e
        
      - name: Upload E2E test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: e2e-test-results
          path: e2e-test-results/

  # Package and Version Check
  package-check:
    name: Package and Version Check
    runs-on: ubuntu-latest
    needs: test-e2e
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Check package version consistency
        run: |
          VERSION=$(node -p "require('./package.json').version")
          if [[ ! $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo "Invalid version format: $VERSION"
            exit 1
          fi
          echo "Version check passed: $VERSION"
          
      - name: Package for distribution
        run: npm pack

  # Deployment (only on main branch)
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [lint-and-format, test, build-and-scan, test-e2e, package-check]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    
    permissions:
      contents: read
      packages: write
      
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          registry-url: 'https://registry.npmjs.org'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build project
        run: npm run build
        
      - name: Log in to registry
        run: npm login --registry https://registry.npmjs.org
        
      - name: Publish package
        run: npm publish
        
      - name: Create release
        uses: softprops/action-gh-release@v1
        with:
          tag_name: v${{ steps.package.outputs.version }}
          name: Release v${{ steps.package.outputs.version }}
          body: |
            Changes in this Release
            - Automated release from CI/CD pipeline
            
            ## Version ${{ steps.package.outputs.version }}
            
            - All tests passed
            - Security scan completed
            - Build successful
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  # Documentation Update
  update-docs:
    name: Update Documentation
    runs-on: ubuntu-latest
    needs: deploy
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          
      - name: Install dependencies
        run: npm ci
        
      - name: Generate API documentation
        run: npm run docs:generate
        
      - name: Commit documentation changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add docs/
          git diff --quiet && git diff --staged --quiet || git commit -m "docs: update API documentation [skip ci]"
          git push

# .github/workflows/quality-check.yml

name: Quality Checks

on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM UTC
  pull_request:
    branches: [ main ]
    types: [opened, synchronize, reopened]

jobs:
  security-audit:
    name: Security Audit
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run npm audit
        run: npm audit --audit-level=moderate
        
      - name: Run dependency vulnerability scan
        run: npm audit --json > audit.json
        
      - name: Upload audit results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: security-audit
          path: audit.json

  performance-check:
    name: Performance Check
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build project
        run: npm run build
        
      - name: Run performance benchmarks
        run: npm run test:performance
        
      - name: Upload performance results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: performance-results
          path: performance-results/

# ❌ Violation - Inadequate CI/CD Pipeline
# Only basic tests, no security scanning, no deployment, no quality checks
```

### Rule 4.2: Deployment Requirements
- **Requirement**: All deployments MUST follow standardized deployment procedures
- **Rationale**: Ensures consistent and safe deployments
- **Implementation**: Use deployment manifests and validation

```typescript
// ✅ Correct Deployment Configuration
// config/deployment.ts

interface DeploymentConfig {
  environment: 'development' | 'staging' | 'production';
  version: string;
  dockerImage: string;
  resourceLimits: {
    memory: string;
    cpu: string;
  };
  healthChecks: {
    path: string;
    interval: number;
    timeout: number;
    retries: number;
  };
  environmentVariables: Record<string, string>;
}

class DeploymentValidator {
  public validate(config: DeploymentConfig): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    // Validate environment
    const validEnvironments = ['development', 'staging', 'production'];
    if (!validEnvironments.includes(config.environment)) {
      errors.push(`Invalid environment: ${config.environment}`);
    }
    
    // Validate version format
    if (!config.version.match(/^\d+\.\d+\.\d+$/)) {
      errors.push(`Invalid version format: ${config.version}`);
    }
    
    // Validate resource limits
    if (!this.validateResourceSpec(config.resourceLimits.memory)) {
      errors.push('Invalid memory limit specification');
    }
    
    if (!this.validateResourceSpec(config.resourceLimits.cpu)) {
      errors.push('Invalid CPU limit specification');
    }
    
    // Validate health checks
    if (!config.healthChecks.path.startsWith('/')) {
      errors.push('Health check path must start with /');
    }
    
    if (config.healthChecks.interval < 10) {
      errors.push('Health check interval must be at least 10 seconds');
    }
    
    if (config.healthChecks.timeout > config.healthChecks.interval) {
      errors.push('Health check timeout must be less than interval');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  private validateResourceSpec(spec: string): boolean {
    return /^[0-9]+[MG]?$/.test(spec);
  }
}

// Docker configuration
// Dockerfile

FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nextjs .next

COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["npm", "start"]

# Kubernetes deployment
// k8s/deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: rcc-module
  labels:
    app: rcc-module
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rcc-module
  template:
    metadata:
      labels:
        app: rcc-module
    spec:
      containers:
      - name: rcc-module
        image: ghcr.io/your-org/rcc:latest
        ports:
        - containerPort: 3000
        resources:
          limits:
            memory: "512Mi"
            cpu: "500m"
          requests:
            memory: "256Mi"
            cpu: "250m"
        env:
        - name: NODE_ENV
          value: "production"
        - name: API_BASE_URL
          valueFrom:
            configMapKeyRef:
              name: rcc-config
              key: api-base-url
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

# ❌ Violation - Inadequate Deployment Configuration
// Missing deployment validation, no Docker configuration, no Kubernetes manifests
```

These development and deployment rules ensure that the RCC modular system maintains high-quality code standards, comprehensive documentation, proper testing, and robust CI/CD pipelines while preventing hardcoded values and enabling flexible configuration.