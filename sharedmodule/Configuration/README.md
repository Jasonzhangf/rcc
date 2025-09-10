# RCC Configuration Module

A comprehensive configuration management module for the RCC framework, providing centralized configuration loading, validation, persistence, and UI management capabilities.

## Overview

The Configuration module is a standalone npm package that provides modular configuration management with the following key components:

- **ConfigLoaderModule**: Handles loading configuration from various sources
- **ConfigUIModule**: Provides user interface for configuration management  
- **ConfigPersistenceModule**: Manages saving and loading configuration data
- **ConfigValidatorModule**: Validates configuration data integrity

## Installation

```bash
npm install rcc-configuration
```

## Quick Start

```typescript
import { ConfigurationSystem } from 'rcc-configuration';
import { BaseModule } from 'rcc-basemodule';

// Create configuration system
const configSystem = new ConfigurationSystem({
  id: 'config-system-1',
  name: 'Main Configuration System',
  version: '1.0.0',
  description: 'Central configuration management',
  type: 'configuration'
});

// Initialize the system
await configSystem.initialize();

// Load configuration
const config = await configSystem.loadConfiguration('./config.json');
```

## Architecture

### Core Components

#### ConfigLoaderModule
Responsible for loading configuration from multiple sources:
- JSON files
- Environment variables
- Remote APIs
- Database sources

#### ConfigUIModule
Provides user interface capabilities:
- Configuration editor
- Real-time validation feedback
- Configuration wizards
- Import/export functionality

#### ConfigPersistenceModule
Handles data persistence:
- File system storage
- Database storage
- Cloud storage integration
- Backup and versioning

#### ConfigValidatorModule
Ensures configuration integrity:
- Schema validation
- Business rule validation
- Dependency validation
- Security validation

### Configuration System
The main orchestrator that coordinates all configuration modules and provides a unified API.

## API Reference

### ConfigurationSystem

#### Methods

##### `initialize(config?: Record<string, any>): Promise<void>`
Initializes the configuration system with optional configuration.

##### `loadConfiguration(source: string | ConfigSource): Promise<ConfigData>`
Loads configuration from the specified source.

##### `saveConfiguration(config: ConfigData, target?: string): Promise<void>`
Saves configuration to the specified target or default location.

##### `validateConfiguration(config: ConfigData): Promise<ValidationResult>`
Validates the provided configuration data.

##### `getConfiguration(): ConfigData`
Returns the current configuration data.

##### `updateConfiguration(updates: Partial<ConfigData>): Promise<void>`
Updates specific configuration values.

### Configuration Sources

The module supports multiple configuration sources:

```typescript
// File source
const fileSource: ConfigSource = {
  type: 'file',
  path: './config.json',
  format: 'json'
};

// Environment source
const envSource: ConfigSource = {
  type: 'environment',
  prefix: 'APP_'
};

// Remote source
const remoteSource: ConfigSource = {
  type: 'remote',
  url: 'https://api.example.com/config',
  headers: { 'Authorization': 'Bearer token' }
};
```

## Configuration Schema

### Basic Schema Structure

```typescript
interface ConfigSchema {
  version: string;
  metadata: {
    name: string;
    description: string;
    author: string;
    createdAt: string;
    updatedAt: string;
  };
  settings: {
    [category: string]: {
      [key: string]: ConfigValue;
    };
  };
  validation: {
    rules: ValidationRule[];
    constraints: ConstraintRule[];
  };
}
```

### Configuration Value Types

```typescript
type ConfigValue = {
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  default?: any;
  description?: string;
  validation?: ValidationRule[];
};
```

## Examples

### Basic Configuration Loading

```typescript
import { ConfigLoaderModule } from 'rcc-configuration';

const loader = new ConfigLoaderModule({
  id: 'config-loader-1',
  name: 'Configuration Loader',
  version: '1.0.0',
  description: 'Loads configuration data',
  type: 'config-loader'
});

await loader.initialize();

// Load from file
const config = await loader.loadFromFile('./app-config.json');

// Load from environment
const envConfig = await loader.loadFromEnvironment('APP_');

// Merge configurations
const mergedConfig = loader.mergeConfigurations([config, envConfig]);
```

### Configuration Validation

```typescript
import { ConfigValidatorModule } from 'rcc-configuration';

const validator = new ConfigValidatorModule({
  id: 'config-validator-1',
  name: 'Configuration Validator',
  version: '1.0.0',
  description: 'Validates configuration data',
  type: 'config-validator'
});

await validator.initialize();

// Define validation schema
const schema = {
  type: 'object',
  properties: {
    database: {
      type: 'object',
      required: ['host', 'port', 'username'],
      properties: {
        host: { type: 'string' },
        port: { type: 'number', minimum: 1, maximum: 65535 },
        username: { type: 'string', minLength: 1 }
      }
    }
  }
};

// Validate configuration
const result = await validator.validate(config, schema);
if (!result.isValid) {
  console.error('Configuration validation failed:', result.errors);
}
```

### Configuration Persistence

```typescript
import { ConfigPersistenceModule } from 'rcc-configuration';

const persistence = new ConfigPersistenceModule({
  id: 'config-persistence-1',
  name: 'Configuration Persistence',
  version: '1.0.0',
  description: 'Manages configuration persistence',
  type: 'config-persistence'
});

await persistence.initialize();

// Save configuration
await persistence.save(config, {
  type: 'file',
  path: './saved-config.json',
  backup: true,
  encryption: true
});

// Load configuration
const loadedConfig = await persistence.load({
  type: 'file',
  path: './saved-config.json'
});
```

## Advanced Features

### Configuration Watching

```typescript
// Watch for configuration changes
configSystem.onConfigurationChanged((newConfig, oldConfig, changes) => {
  console.log('Configuration changed:', changes);
  // Handle configuration updates
});
```

### Configuration Encryption

```typescript
// Enable encryption for sensitive configuration data
const encryptedConfig = await persistence.save(config, {
  type: 'file',
  path: './encrypted-config.json',
  encryption: {
    enabled: true,
    algorithm: 'aes-256-gcm',
    key: process.env.CONFIG_ENCRYPTION_KEY
  }
});
```

### Configuration Versioning

```typescript
// Enable configuration versioning
await persistence.save(config, {
  type: 'file',
  path: './config.json',
  versioning: {
    enabled: true,
    maxVersions: 10,
    autoCleanup: true
  }
});
```

## Testing

The module includes comprehensive test coverage:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Development

### Project Structure

```
src/
├── core/
│   └── ConfigurationSystem.ts
├── modules/
│   ├── ConfigLoaderModule.ts
│   ├── ConfigUIModule.ts
│   ├── ConfigPersistenceModule.ts
│   └── ConfigValidatorModule.ts
├── interfaces/
│   ├── IConfigurationSystem.ts
│   ├── IConfigLoaderModule.ts
│   ├── IConfigUIModule.ts
│   ├── IConfigPersistenceModule.ts
│   └── IConfigValidatorModule.ts
├── types/
│   └── index.ts
├── constants/
│   └── index.ts
└── index.ts
```

### Building

```bash
# Build the project
npm run build

# Build with watch mode
npm run build:watch

# Clean build artifacts
npm run clean
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Changelog

See CHANGELOG.md for version history and changes.