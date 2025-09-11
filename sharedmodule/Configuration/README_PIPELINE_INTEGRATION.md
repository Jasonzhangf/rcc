# Configuration to Pipeline Integration

This module extends the RCC Configuration System to provide seamless integration with Pipeline assembly functionality, enabling automatic generation of pipelines from virtual model mapping configurations.

## 🎯 Features

### ✅ Core Functionality
- **Virtual Model Mapping**: Parse virtual model configurations from configuration files
- **Pipeline Assembly**: Automatically generate and assemble pipelines based on mappings
- **Static One-Time Assembly**: Configure pipelines once at startup for production use
- **Dynamic Assembly**: Support for runtime pipeline reconfiguration
- **Configuration Validation**: Comprehensive validation before pipeline assembly
- **Performance Caching**: Intelligent caching for optimized performance

### ✅ Pipeline Strategies
- **Static**: One-time assembly, ideal for production environments
- **Dynamic**: Runtime generation, perfect for development and testing
- **Hybrid**: Balanced approach combining both strategies

### ✅ Advanced Features
- **Custom Pipeline Modules**: Support for custom module configurations
- **Intelligent Routing**: Priority-based virtual model routing
- **Error Handling**: Graceful error handling with detailed reporting
- **Performance Monitoring**: Built-in performance metrics and monitoring
- **Hot Reload**: Runtime configuration updates without system restart

## 🚀 Quick Start

### Installation

```bash
# The module is part of the RCC Configuration System
# No additional installation required
```

### Basic Usage

```typescript
import { createEnhancedConfigurationSystem } from 'rcc-configuration';

// Create enhanced configuration system with pipeline integration
const configSystem = await createEnhancedConfigurationSystem({
  pipelineIntegration: {
    enabled: true,
    strategy: 'static', // One-time assembly
    cache: {
      enabled: true,
      ttl: 300000, // 5 minutes
      maxSize: 100
    },
    validation: {
      strict: true,
      failOnError: false,
      warnOnUnknown: true
    }
  }
});

// Load configuration with virtual model mappings
await configSystem.loadConfiguration({
  metadata: {
    name: 'My App Configuration',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  settings: {
    providers: {
      openai: {
        name: 'OpenAI Provider',
        type: 'openai',
        models: {
          'gpt-4': { name: 'GPT-4', contextLength: 8192 }
        }
      }
    },
    virtualModels: {
      'smart-assistant': {
        targetProvider: 'openai',
        targetModel: 'gpt-4',
        priority: 8,
        enabled: true
      }
    }
  },
  version: '1.0.0'
});

// Pipelines are automatically assembled!
const pipeline = configSystem.getPipeline('smart-assistant');
```

## 📋 Configuration Structure

### Virtual Model Mapping

```typescript
interface VirtualModelMapping {
  virtualModelId: string;           // Virtual model identifier
  targetProvider: string;           // Target provider ID
  targetModel: string;              // Target model ID
  priority?: number;                // Routing priority (1-10)
  enabled?: boolean;                // Whether mapping is enabled
  pipelineConfig?: {                // Optional pipeline configuration
    execution?: {
      timeout?: number;              // Execution timeout
      retryCount?: number;           // Retry count
      fallbackEnabled?: boolean;     // Enable fallback
    };
    modules?: PipelineModuleConfig[]; // Custom pipeline modules
    connections?: ModuleConnection[]; // Custom module connections
    moduleConfigs?: Record<string, any>; // Module-specific configs
  };
  metadata?: Record<string, any>;   // Additional metadata
}
```

### Example Configuration

```json
{
  "metadata": {
    "name": "Advanced Virtual Model Configuration",
    "description": "Configuration with custom pipeline modules",
    "createdAt": "2025-09-11T10:00:00Z",
    "updatedAt": "2025-09-11T10:00:00Z"
  },
  "settings": {
    "providers": {
      "openai": {
        "name": "OpenAI Provider",
        "type": "openai",
        "models": {
          "gpt-4": {
            "name": "GPT-4",
            "contextLength": 8192,
            "supportsFunctions": true
          }
        }
      }
    },
    "virtualModels": {
      "code-assistant": {
        "targetProvider": "openai",
        "targetModel": "gpt-4",
        "priority": 9,
        "enabled": true,
        "pipelineConfig": {
          "execution": {
            "timeout": 45000,
            "retryCount": 2,
            "fallbackEnabled": true
          },
          "modules": [
            {
              "id": "code-assistant-workflow",
              "type": "Workflow",
              "config": {
                "maxIterations": 3,
                "qualityThreshold": 0.8
              }
            },
            {
              "id": "code-assistant-compatibility",
              "type": "Compatibility",
              "config": {
                "enableCodeOptimization": true,
                "syntaxValidation": true
              }
            }
          ],
          "connections": [
            {
              "source": "code-assistant-workflow",
              "target": "code-assistant-compatibility",
              "type": "request"
            }
          ]
        }
      }
    }
  },
  "version": "1.0.0"
}
```

## 🔧 API Reference

### EnhancedConfigurationSystem

#### Constructor

```typescript
const configSystem = new EnhancedConfigurationSystem(
  pipelineAssembler?,        // Optional: PipelineAssembler instance
  virtualModelRulesModule?,  // Optional: VirtualModelRulesModule instance
  pipelineTableConfig?      // Optional: Pipeline table configuration
);
```

#### Factory Functions

```typescript
// Create enhanced configuration system
const configSystem = await createEnhancedConfigurationSystem({
  pipelineIntegration: {
    enabled: true,
    strategy: 'static',
    cache: { enabled: true, ttl: 300000, maxSize: 100 },
    validation: { strict: true, failOnError: false, warnOnUnknown: true }
  }
});
```

#### Core Methods

```typescript
// Load configuration and assemble pipelines
await configSystem.loadConfiguration(config);

// Get pipeline for virtual model
const pipeline = configSystem.getPipeline('virtual-model-id');

// Get pipeline configuration
const pipelineConfig = configSystem.getPipelineConfig('virtual-model-id');

// Get all pipeline configurations
const allConfigs = configSystem.getAllPipelineConfigs();

// Validate configuration for pipeline assembly
const validation = await configSystem.validateConfigurationForPipeline(config);

// Reload and reassemble pipelines
const result = await configSystem.reloadAndReassemble();

// Enable/disable pipeline integration
await configSystem.enablePipelineIntegration();
await configSystem.disablePipelineIntegration();
```

#### Status and Information

```typescript
// Check if pipeline integration is enabled
const isEnabled = configSystem.isPipelineIntegrationEnabled();

// Get enhanced status
const status = configSystem.getEnhancedStatus();

// Get module instances
const assembler = configSystem.getPipelineAssembler();
const rulesModule = configSystem.getVirtualModelRulesModule();
const integration = configSystem.getConfigToPipelineModule();
```

### ConfigurationToPipelineModule

#### Pipeline Assembly

```typescript
// Parse virtual model mappings
const mappings = await integration.parseVirtualModelMappings(config);

// Generate pipeline table
const pipelineTable = await integration.generatePipelineTable(mappings);

// Assemble pipelines from configuration
const result = await integration.assemblePipelinesFromConfiguration(config);
```

#### Assembly Result

```typescript
interface PipelineAssemblyResult {
  success: boolean;
  pipeline?: Pipeline;
  pipelineTable?: Map<string, PipelineAssemblyConfig>;
  errors?: string[];
  warnings?: string[];
  metadata?: {
    assemblyTime: number;
    virtualModelCount: number;
    moduleCount: number;
    connectionCount: number;
  };
}
```

## 🎛️ Configuration Options

### Pipeline Integration Configuration

```typescript
interface PipelineTableConfig {
  enabled: boolean;                 // Enable pipeline generation
  strategy: 'static' | 'dynamic' | 'hybrid'; // Generation strategy
  defaultModules?: PipelineModuleConfig[]; // Default modules
  defaultConnections?: ModuleConnection[]; // Default connections
  cache?: {                         // Cache settings
    enabled: boolean;
    ttl: number;                     // Time to live (ms)
    maxSize: number;                 // Maximum cache size
  };
  validation?: {                    // Validation settings
    strict: boolean;                 // Strict validation
    failOnError: boolean;            // Fail on errors
    warnOnUnknown: boolean;          // Warn on unknown fields
  };
}
```

### Strategy Comparison

| Strategy | Description | Use Case | Performance | Flexibility |
|----------|-------------|----------|-------------|-------------|
| **Static** | One-time assembly at startup | Production | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Dynamic** | Runtime pipeline generation | Development | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Hybrid** | Combination approach | Mixed environments | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Navigate to configuration module directory
cd sharedmodule/Configuration

# Run the test script
npm run test:configuration-to-pipeline

# Or run directly with Node.js
node test-configuration-to-pipeline.ts
```

The test suite includes:
- Basic configuration and pipeline assembly
- Advanced custom pipeline configurations
- Error handling and validation
- Performance and caching tests

## 📚 Examples

### Example 1: Production Setup

```typescript
const productionConfig = {
  pipelineIntegration: {
    enabled: true,
    strategy: 'static',
    cache: {
      enabled: true,
      ttl: 3600000 // 1 hour
    },
    validation: {
      strict: true,
      failOnError: true
    }
  }
};

const configSystem = await createEnhancedConfigurationSystem(productionConfig);
await configSystem.loadConfiguration(productionConfigFile);
```

### Example 2: Development Setup

```typescript
const devConfig = {
  pipelineIntegration: {
    enabled: true,
    strategy: 'dynamic',
    cache: {
      enabled: false // No caching for development
    },
    validation: {
      strict: false,
      failOnError: false,
      warnOnUnknown: true
    }
  }
};

const configSystem = await createEnhancedConfigurationSystem(devConfig);
await configSystem.loadConfiguration(devConfigFile);
```

### Example 3: Custom Pipeline Modules

```typescript
const customConfig = {
  settings: {
    virtualModels: {
      'custom-assistant': {
        targetProvider: 'openai',
        targetModel: 'gpt-4',
        pipelineConfig: {
          modules: [
            {
              id: 'custom-workflow',
              type: 'Workflow',
              config: {
                customLogic: true,
                parameters: { maxTokens: 2000 }
              }
            }
          ]
        }
      }
    }
  }
};
```

## 🐛 Troubleshooting

### Common Issues

1. **Pipeline Assembly Fails**
   - Check configuration syntax
   - Verify provider and model exist
   - Ensure all required fields are present
   - Review validation errors

2. **Pipeline Not Found**
   - Verify virtual model ID
   - Check if mapping is enabled
   - Ensure assembly completed successfully
   - Review pipeline table contents

3. **Performance Issues**
   - Adjust cache settings
   - Consider static strategy for production
   - Monitor pipeline assembly time
   - Optimize module configurations

### Debug Information

```typescript
// Get detailed status
const status = configSystem.getEnhancedStatus();
console.log('System Status:', status);

// Check pipeline table
const pipelineTable = configSystem.getAllPipelineConfigs();
console.log('Available Pipelines:', Array.from(pipelineTable.keys()));

// Validate configuration
const validation = await configSystem.validateConfigurationForPipeline(config);
console.log('Validation Result:', validation);
```

## 🔗 Integration with Other Modules

### Virtual Model Rules Module

```typescript
// The integration automatically works with VirtualModelRulesModule
const rulesModule = configSystem.getVirtualModelRulesModule();

// Rules are automatically applied during pipeline assembly
await rulesModule.registerRule({
  id: 'cost-optimization',
  name: 'Cost Optimization Rule',
  priority: 'high',
  conditions: [
    {
      field: 'request.user.tier',
      operator: 'equals',
      value: 'free'
    }
  ],
  actions: [
    {
      type: 'route_to_model',
      parameters: { modelId: 'gpt-3.5-turbo' }
    }
  ]
});
```

### Pipeline Module Integration

```typescript
// Access the pipeline assembler for advanced operations
const assembler = configSystem.getPipelineAssembler();

// Get pipeline status
const pipelineStatus = assembler.getPipelineStatus();
console.log('Pipeline Status:', pipelineStatus);

// Manually activate/deactivate pipelines
await assembler.activate();
await assembler.deactivate();
```

## 📈 Performance Optimization

### Caching Strategy

```typescript
const optimalConfig = {
  pipelineIntegration: {
    enabled: true,
    strategy: 'static',
    cache: {
      enabled: true,
      ttl: 300000, // 5 minutes - balance between freshness and performance
      maxSize: 100   // Reasonable limit for most applications
    }
  }
};
```

### Memory Management

```typescript
// Monitor cache usage
const status = configSystem.getEnhancedStatus();
const cacheSize = status.pipelineIntegration?.pipelineCacheSize || 0;

// Implement cleanup if needed
if (cacheSize > 1000) {
  await configSystem.reloadAndReassemble();
}
```

## 🤝 Contributing

This module is part of the RCC (Route Claude Code) project. Please refer to the main project documentation for contribution guidelines.

## 📄 License

This module is licensed under the MIT License. See the LICENSE file for details.

## 🔗 Related Modules

- **RCC Configuration System**: Core configuration management
- **RCC Pipeline System**: Pipeline assembly and execution
- **RCC Virtual Model Rules**: Virtual model routing rules
- **RCC Base Module**: Common base functionality

---

**Note**: This module is designed to work seamlessly with other RCC modules. Ensure all dependencies are properly installed and configured for optimal functionality.