# @rcc/configuration

[![npm version](https://badge.fury.io/js/%40rcc%2Fconfiguration.svg)](https://badge.fury.io/js/%40rcc%2Fconfiguration)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

**Unified Configuration Management Package for RCC Architecture**

A comprehensive, modular configuration management system that provides providers, models, blacklist, and pool management with advanced deduplication logic, multi-protocol support, and enterprise-grade reliability.

## ✨ Features

- 🏗️ **Modular Architecture**: Clean separation of concerns with unified API
- 🔄 **Advanced Deduplication**: Automatic conflict resolution between blacklist and pool
- 🌐 **Multi-Protocol Support**: OpenAI, Anthropic, Gemini APIs with extensible architecture
- 🧪 **Provider Testing**: Real-time API connectivity validation and health checks
- 🤖 **Intelligent Model Management**: Auto-discovery, verification, and token detection
- ⚖️ **Load Balancing Configuration**: Multiple strategies (Round Robin, Weighted, Health-based, Priority, Random, Least Connections)
- 🗺️ **Virtual Model Routing**: Advanced routing configuration with virtual model categories
- 📤 **Import/Export**: Configuration backup and migration capabilities
- 🛡️ **Type Safety**: Full TypeScript support with comprehensive type definitions
- ⚡ **Performance Optimized**: Efficient coordination with minimal overhead
- 📊 **Health Monitoring**: Built-in system health checks and metrics
- 🔐 **Security First**: Input validation, error sanitization, and access control

## 🎯 Load Balancing Strategies

The RoutesManager provides sophisticated load balancing configuration:

- **🔄 Round Robin**: Sequential distribution across targets
- **⚖️ Weighted**: Distribution based on configurable target weights  
- **🎲 Random**: Pseudo-random target selection for load distribution
- **🏥 Health-based**: Intelligent selection based on target health status
- **📈 Priority**: Priority-based selection with automatic failover
- **🔗 Least Connections**: Selection based on active connection counts

## 🚀 Quick Start

### Installation

```bash
npm install @rcc/configuration
```

### Basic Usage

```typescript
import { createConfigurationSystem } from '@rcc/configuration';

// Create and initialize configuration system
const config = await createConfigurationSystem({
  configPath: '/path/to/config.json',
  enableDeduplication: true,
  enableProviderTesting: true
});

// Initialize all modules
await config.initialize();

// Use the configuration system
const providers = await config.providers.getAll();
const models = await config.models.getAll();
await config.models.verifyModel('provider-id', 'model-id');

// Check system health
const health = await config.getSystemHealth();
console.log('System Status:', health.overall);
```

### Individual Module Usage

```typescript
import { 
  ConfigManager, 
  ProvidersManager, 
  ModelsManager,
  BlacklistManager,
  PoolManager 
} from '@rcc/configuration';

// Use individual modules
const configManager = new ConfigManager('/path/to/config.json');
await configManager.initialize();

const providersManager = new ProvidersManager(configManager);
await providersManager.initialize();
```

## 📋 API Reference

### Configuration System

#### `createConfigurationSystem(options)`

Creates a complete configuration management system with all modules integrated.

**Options:**
- `configPath` (string): Path to configuration file
- `enableDeduplication` (boolean): Enable automatic deduplication  
- `enableProviderTesting` (boolean): Enable provider testing capabilities
- `enableModelDiscovery` (boolean): Enable automatic model discovery

**Returns:** `Promise<IConfigurationSystem>`

### Core Modules

#### ConfigManager

Handles configuration file operations, loading, saving, and validation.

```typescript
const config = new ConfigManager('/path/to/config.json');
await config.initialize();

// Load configuration
const data = await config.getConfig();

// Update configuration  
await config.updateConfig(newData);

// Save configuration
await config.save();
```

#### ProvidersManager

Manages API providers with CRUD operations and testing capabilities.

```typescript
const providers = new ProvidersManager(configManager);

// Get all providers
const allProviders = await providers.getAll();

// Add new provider
await providers.add({
  name: 'openai',
  protocol: 'openai',
  api_base_url: 'https://api.openai.com/v1',
  api_key: ['your-api-key']
});

// Test provider connection
const testResult = await providers.testProvider('provider-id');
```

#### ModelsManager

Handles model verification, token detection, and status management.

```typescript
const models = new ModelsManager(configManager, providersManager);

// Verify model
const result = await models.verifyModel('provider-id', 'model-id');

// Detect token limits
const tokens = await models.detectTokens('provider-id', 'model-id');

// Get model status
const status = await models.getModelStatus('provider-id', 'model-id');
```

#### BlacklistManager

Manages model blacklist with deduplication support.

```typescript
const blacklist = new BlacklistManager(configManager);

// Add to blacklist
await blacklist.addToBlacklist('provider-id', 'model-id', 'reason');

// Get blacklisted models
const blacklisted = await blacklist.getAll();

// Remove from blacklist  
await blacklist.removeFromBlacklist('entry-id');
```

#### PoolManager

Manages provider pool with load balancing preparation.

```typescript
const pool = new PoolManager(configManager);

// Add to pool
await pool.addToPool('provider-id', 'model-id');

// Get pool entries
const poolEntries = await pool.getAll();

// Remove from pool
await pool.removeFromPool('entry-id');
```

#### RoutesManager

Manages virtual model routing with advanced load balancing configuration.

```typescript
const routes = new RoutesManager(configManager);

// Create a route with round robin load balancing
const route = await routes.create({
  name: 'Default Route',
  category: 'default',
  virtual_model: 'gpt-4-equivalent',
  targets: [
    {
      provider_id: 'openai',
      provider_name: 'OpenAI',
      model_id: 'gpt-4',
      model_name: 'GPT-4',
      weight: 1,
      status: 'active'
    }
  ],
  load_balancing: {
    type: 'round_robin',
    config: { current_index: 0 }
  },
  status: 'active'
});

// Update load balancing strategy to weighted
await routes.updateLoadBalancingConfig(route.id, {
  type: 'weighted',
  config: { total_weight: 100 }
});

// Generate routing table for consumption by routing engines
const routingTable = await routes.generateRoutingTable();

// Get available models for routing from all sources
const availableModels = await routes.getAvailableModelsForRouting({
  include_config: true,
  include_providers: true,
  include_pool: true,
  exclude_blacklisted: true
});
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Coverage Requirements

- **Unit Tests**: 100% coverage mandatory
- **Integration Tests**: 95% coverage required  
- **E2E Tests**: 90% coverage required

## 🏗️ Development

### Building the Package

```bash
# Clean and build all formats
npm run build

# Build specific formats
npm run build:cjs    # CommonJS
npm run build:esm    # ES Modules  
npm run build:types  # Type declarations
```

### Code Quality

```bash
# Lint code
npm run lint
npm run lint:fix

# Format code
npm run format
npm run format:check

# Type check
npm run typecheck

# Validate everything
npm run validate
```

### Documentation

```bash
# Generate documentation
npm run docs:generate

# Serve documentation locally
npm run docs:serve
```

## 📦 Package Exports

The package supports multiple export paths for granular imports:

```typescript
// Main entry (recommended)
import { createConfigurationSystem } from '@rcc/configuration';

// Individual modules
import { ConfigManager } from '@rcc/configuration/ConfigManager';
import { ProvidersManager } from '@rcc/configuration/ProvidersManager';
import { ModelsManager } from '@rcc/configuration/ModelsManager';
import { BlacklistManager } from '@rcc/configuration/BlacklistManager';
import { PoolManager } from '@rcc/configuration/PoolManager';

// Types only
import type { IConfigurationSystem } from '@rcc/configuration';
```

## 🔧 Configuration

### Configuration File Structure

```json
{
  "version": "2.0.0",
  "last_updated": "2024-01-01T00:00:00.000Z",
  "providers": [
    {
      "id": "openai-provider",
      "name": "OpenAI",
      "protocol": "openai",
      "api_base_url": "https://api.openai.com/v1",
      "api_key": ["sk-..."],
      "models": [...]
    }
  ],
  "routes": [],
  "global_config": {
    "load_balancing": "round_robin",
    "rate_limiting": {
      "enabled": false,
      "requests_per_minute": 100
    }
  },
  "model_blacklist": [...],
  "provider_pool": [...]
}
```

### Environment Variables

- `RCC_CONFIG_PATH`: Override default configuration file path
- `RCC_LOG_LEVEL`: Set logging level (debug, info, warn, error)
- `RCC_ENABLE_DEDUPLICATION`: Enable/disable deduplication (true/false)

## 🚀 Publishing

### Version Management

```bash
# Patch version (bug fixes)
npm run release:patch

# Minor version (new features)
npm run release:minor

# Major version (breaking changes)
npm run release:major
```

### Publishing Process

```bash
# Automated publishing (runs validation, build, and publish)
npm run postversion

# Manual publishing
npm run validate
npm run build
npm publish
```

## 📈 Performance

The unified package provides several performance benefits:

- **Reduced Bundle Size**: Single package eliminates duplicate dependencies
- **Optimized Coordination**: Efficient inter-module communication
- **Memory Efficiency**: Shared resources and connection pooling
- **Caching Strategy**: Configuration and provider data caching

## 🛠️ Troubleshooting

### Common Issues

1. **Configuration File Not Found**
   - Ensure the config path exists
   - Check file permissions
   - Verify the config file format

2. **Provider Connection Failures**
   - Validate API keys and endpoints
   - Check network connectivity
   - Review rate limiting settings

3. **Module Initialization Errors**  
   - Initialize modules in dependency order
   - Ensure all required dependencies are available
   - Check TypeScript version compatibility

### Debug Mode

Enable debug logging for detailed information:

```typescript
process.env.RCC_LOG_LEVEL = 'debug';
const config = await createConfigurationSystem();
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/rcc/rcc-configuration.git

# Install dependencies
npm install

# Run tests
npm test

# Start development
npm run dev
```

## 📄 License

MIT License. See [LICENSE](LICENSE) file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/rcc/rcc-configuration)
- [npm Package](https://www.npmjs.com/package/@rcc/configuration)
- [Documentation](https://rcc.github.io/rcc-configuration)
- [Issue Tracker](https://github.com/rcc/rcc-configuration/issues)

## 📞 Support

- Create an [Issue](https://github.com/rcc/rcc-configuration/issues) for bug reports
- Join our [Discord](https://discord.gg/rcc) for community support  
- Email: support@rcc-config.dev

---

**Built with ❤️ by the RCC Development Team**