# Pipeline Configuration Guide

## Overview

This guide provides comprehensive documentation for configuring RCC Pipeline modules. The pipeline uses a hierarchical configuration system that allows fine-grained control over each layer's behavior.

## Configuration Architecture

### Configuration Hierarchy

```
Global Configuration
├── Pipeline Assembly Table
│   ├── Layer Configurations
│   │   ├── LLMSwitch Config
│   │   ├── Workflow Config
│   │   ├── Compatibility Config
│   │   └── Provider Config
│   └── Transform References
├── Environment Variables
└── Runtime Overrides
```

### Configuration Loading Order

1. **Default Configuration**: Built-in defaults
2. **Configuration Files**: JSON/YAML files
3. **Environment Variables**: Environment-based overrides
4. **Runtime Parameters**: Dynamic configuration updates

## Pipeline Assembly Table

### Complete Assembly Table Structure

```typescript
interface PipelineAssemblyTable {
  // Pipeline Identification
  id: string;
  name: string;
  version: string;
  description?: string;
  
  // Protocol Configuration
  inputProtocol: SupportedProtocol;
  outputProtocol: SupportedProtocol;
  
  // Layer Configurations
  layers: {
    llmswitch: LLMSwitchConfig;
    workflow: WorkflowConfig;
    compatibility: CompatibilityConfig;
    provider: ProviderConfig;
  };
  
  // Transform References
  transforms: {
    requestTransform: string;
    responseTransform: string;
    errorTransform?: string;
  };
  
  // Pipeline-Level Configuration
  global: {
    timeout?: number;
    enableLogging?: boolean;
    enableMetrics?: boolean;
    enableTracing?: boolean;
    retryPolicy?: {
      maxRetries: number;
      backoffMs: number;
      retryableErrors?: string[];
    };
  };
  
  // Metadata
  metadata?: {
    tags?: string[];
    owner?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}
```

### Supported Protocol Types

```typescript
type SupportedProtocol = 
  | 'anthropic'      // Anthropic Messages API
  | 'openai'         // OpenAI Chat Completions API
  | 'gemini'         // Google Gemini API
  | 'claude'         // Claude API
  | 'custom';        // Custom protocol implementation
```

## Layer Configuration Details

### 1. LLMSwitch Configuration

#### Configuration Structure

```typescript
interface LLMSwitchConfig {
  // Protocol Settings
  inputProtocol: SupportedProtocol;
  outputProtocol: SupportedProtocol;
  
  // Transform Settings
  transformTable: string;
  strictMode?: boolean;  // Fail on unknown fields
  
  // Request Processing
  requestOptions?: {
    stripUnknownFields?: boolean;
    defaultValues?: Record<string, any>;
    fieldMapping?: {
      rename?: Record<string, string>;
      ignore?: string[];
    };
  };
  
  // Response Processing
  responseOptions?: {
    includeRawResponse?: boolean;
    normalizeErrors?: boolean;
    errorMapping?: Record<string, string>;
  };
  
  // Performance
  caching?: {
    enabled?: boolean;
    ttlMs?: number;
    maxSize?: number;
  };
}
```

#### Example LLMSwitch Configuration

```typescript
{
  inputProtocol: 'anthropic',
  outputProtocol: 'openai',
  transformTable: 'anthropic-to-openai-v1',
  strictMode: true,
  
  requestOptions: {
    stripUnknownFields: true,
    defaultValues: {
      temperature: 1.0,
      max_tokens: 4096
    },
    fieldMapping: {
      rename: {
        'claude_request_id': 'request_id',
        'thinking_blocks': 'thinking'
      },
      ignore: ['debug_info', 'internal_metadata']
    }
  },
  
  responseOptions: {
    includeRawResponse: false,
    normalizeErrors: true,
    errorMapping: {
      'rate_limit': 'rate_limit_exceeded',
      'invalid_key': 'authentication_failed'
    }
  },
  
  caching: {
    enabled: true,
    ttlMs: 300000,  // 5 minutes
    maxSize: 1000
  }
}
```

### 2. Workflow Configuration

#### Configuration Structure

```typescript
interface WorkflowConfig {
  // Streaming Configuration
  streaming: {
    enabled: boolean;
    convertToNonStream?: boolean;
    chunkProcessor?: string;
    streamTimeoutMs?: number;
  };
  
  // Rate Limiting
  rateLimiting: {
    enabled: boolean;
    requestsPerSecond: number;
    maxConcurrent: number;
    bucketSize?: number;
    queueTimeoutMs?: number;
  };
  
  // Timeout Configuration
  timeouts: {
    requestMs: number;
    responseMs: number;
    idleMs?: number;
    totalMs?: number;
  };
  
  // Retry Configuration
  retryPolicy: {
    enabled: boolean;
    maxRetries: number;
    backoffStrategy: 'linear' | 'exponential' | 'fixed';
    backoffMs: number;
    retryableErrors?: string[];
    exponentialBase?: number;
  };
  
  // Request Processing
  requestProcessing: {
    batching?: {
      enabled: boolean;
      maxBatchSize: number;
      maxWaitTimeMs: number;
    };
    priorityQueuing?: {
      enabled: boolean;
      priorityLevels: number;
      priorityFields?: string[];
    };
  };
  
  // Monitoring
  monitoring: {
    metricsEnabled: boolean;
    logLevel: 'none' | 'basic' | 'detailed' | 'debug';
    performanceTracking?: {
      enabled: boolean;
      sampleRate: number;
    };
  };
}
```

#### Example Workflow Configuration

```typescript
{
  streaming: {
    enabled: true,
    convertToNonStream: true,
    chunkProcessor: 'default-stream-processor',
    streamTimeoutMs: 30000
  },
  
  rateLimiting: {
    enabled: true,
    requestsPerSecond: 10,
    maxConcurrent: 5,
    bucketSize: 100,
    queueTimeoutMs: 60000
  },
  
  timeouts: {
    requestMs: 30000,
    responseMs: 60000,
    idleMs: 120000,
    totalMs: 300000
  },
  
  retryPolicy: {
    enabled: true,
    maxRetries: 3,
    backoffStrategy: 'exponential',
    backoffMs: 1000,
    retryableErrors: [
      'timeout',
      'rate_limit_exceeded',
      'service_unavailable'
    ],
    exponentialBase: 2
  },
  
  requestProcessing: {
    batching: {
      enabled: false,
      maxBatchSize: 10,
      maxWaitTimeMs: 1000
    },
    priorityQueuing: {
      enabled: true,
      priorityLevels: 3,
      priorityFields: ['user_tier', 'request_urgency']
    }
  },
  
  monitoring: {
    metricsEnabled: true,
    logLevel: 'detailed',
    performanceTracking: {
      enabled: true,
      sampleRate: 0.1
    }
  }
}
```

### 3. Compatibility Configuration

#### Configuration Structure

```typescript
interface CompatibilityConfig {
  // Field Mapping Configuration
  fieldMappings: {
    mappingTable: string;
    strictMapping?: boolean;
    preserveUnknownFields?: boolean;
    fieldTransformations?: {
      beforeMapping?: string[];
      afterMapping?: string[];
    };
  };
  
  // Response Normalization
  responseNormalization: {
    enabled: boolean;
    standardizeErrors: boolean;
    standardizeFormats: boolean;
    formatPreferences?: {
      errorFormat: 'standard' | 'detailed' | 'minimal';
      responseFormat: 'compact' | 'verbose';
    };
  };
  
  // Data Type Handling
  typeConversion: {
    enabled: boolean;
    strictTyping?: boolean;
    conversionRules?: {
      autoConvert?: boolean;
      allowLossyConversion?: boolean;
      customConverters?: Record<string, string>;
    };
  };
  
  // Value Adaptation
  valueAdaptation: {
    enums: {
      enabled: boolean;
      mappingTables?: Record<string, string>;
    };
    ranges: {
      clampValues?: boolean;
      clampMode?: 'error' | 'warn' | 'silent';
    };
    defaults: {
      applyDefaults?: boolean;
      defaultValues?: Record<string, any>;
    };
  };
  
  // Validation Configuration
  validation: {
    enabled: boolean;
    level: 'none' | 'warning' | 'error' | 'strict';
    customValidators?: Record<string, string>;
    validationRules?: {
      requiredFields?: string[];
      forbiddenFields?: string[];
      fieldConstraints?: Record<string, any>;
    };
  };
}
```

#### Example Compatibility Configuration

```typescript
{
  fieldMappings: {
    mappingTable: 'openai-standard-compatibility',
    strictMapping: false,
    preserveUnknownFields: true,
    fieldTransformations: {
      beforeMapping: ['preprocess-fields'],
      afterMapping: ['postprocess-fields']
    }
  },
  
  responseNormalization: {
    enabled: true,
    standardizeErrors: true,
    standardizeFormats: true,
    formatPreferences: {
      errorFormat: 'standard',
      responseFormat: 'compact'
    }
  },
  
  typeConversion: {
    enabled: true,
    strictTyping: false,
    conversionRules: {
      autoConvert: true,
      allowLossyConversion: false,
      customConverters: {
        'timestamp': 'timestamp-converter',
        'enum': 'enum-converter'
      }
    }
  },
  
  valueAdaptation: {
    enums: {
      enabled: true,
      mappingTables: {
        'role': 'role-mapping',
        'finish_reason': 'finish-reason-mapping'
      }
    },
    ranges: {
      clampValues: true,
      clampMode: 'warn'
    },
    defaults: {
      applyDefaults: true,
      defaultValues: {
        'temperature': 1.0,
        'max_tokens': 4096,
        'top_p': 1.0
      }
    }
  },
  
  validation: {
    enabled: true,
    level: 'error',
    customValidators: {
      'model': 'model-validator',
      'tokens': 'token-validator'
    },
    validationRules: {
      requiredFields: ['model', 'messages'],
      forbiddenFields: ['password', 'api_key'],
      fieldConstraints: {
        'max_tokens': { min: 1, max: 200000 },
        'temperature': { min: 0.0, max: 2.0 }
      }
    }
  }
}
```

### 4. Provider Configuration

#### Configuration Structure

```typescript
interface ProviderConfig {
  // Provider Identification
  provider: string;
  version?: string;
  
  // Authentication
  authentication: {
    type: 'bearer' | 'basic' | 'api_key' | 'oauth' | 'custom';
    credentials?: {
      apiKey?: string;
      accessToken?: string;
      refreshToken?: string;
      username?: string;
      password?: string;
    };
    headers?: Record<string, string>;
    tokenRefresh?: {
      enabled: boolean;
      refreshBeforeExpiryMs?: number;
    };
  };
  
  // Endpoint Configuration
  endpoints: {
    base?: string;
    completions?: string;
    chat?: string;
    models?: string;
    health?: string;
    custom?: Record<string, string>;
  };
  
  // Model Configuration
  models: {
    default: string;
    available: string[];
    aliases?: Record<string, string>;
    constraints?: Record<string, {
      maxTokens: number;
      supportedFeatures?: string[];
    }>;
  };
  
  // Request Configuration
  requestSettings: {
    timeoutMs: number;
    maxRetries: number;
    retryDelayMs: number;
    headers?: Record<string, string>;
    compression?: boolean;
    userAgent?: string;
  };
  
  // Response Configuration
  responseSettings: {
    streaming?: boolean;
    expectStructuredOutput?: boolean;
    parseFunctionCalls?: boolean;
    handleErrors?: boolean;
  };
  
  // Features Support
  features: {
    streaming: boolean;
    functionCalling: boolean;
    vision: boolean;
    jsonMode: boolean;
    tools: boolean;
    custom?: Record<string, boolean>;
  };
  
  // Health and Reliability
  health: {
    enabled: boolean;
    checkIntervalMs?: number;
    timeoutMs?: number;
    failureThreshold?: number;
    recoveryThreshold?: number;
    circuitBreaker?: {
      enabled: boolean;
      timeoutMs?: number;
      requestVolumeThreshold?: number;
      sleepWindowMs?: number;
      errorThresholdPercentage?: number;
    };
  };
}
```

#### Example Provider Configuration

```typescript
{
  provider: 'openai',
  version: 'v1',
  
  authentication: {
    type: 'bearer',
    credentials: {
      accessToken: '${OPENAI_API_KEY}'
    },
    tokenRefresh: {
      enabled: false
    }
  },
  
  endpoints: {
    base: 'https://api.openai.com/v1',
    chat: 'chat/completions',
    models: 'models',
    health: 'health'
  },
  
  models: {
    default: 'gpt-4',
    available: [
      'gpt-4',
      'gpt-4-turbo',
      'gpt-3.5-turbo',
      'claude-3-sonnet-20240229'
    ],
    aliases: {
      'gpt-4-latest': 'gpt-4'
    },
    constraints: {
      'claude-3-sonnet-20240229': {
        maxTokens: 200000,
        supportedFeatures: ['streaming', 'vision', 'tools']
      }
    }
  },
  
  requestSettings: {
    timeoutMs: 30000,
    maxRetries: 3,
    retryDelayMs: 1000,
    headers: {
      'User-Agent': 'RCC-Pipeline/1.0.0'
    },
    compression: true
  },
  
  responseSettings: {
    streaming: true,
    expectStructuredOutput: true,
    parseFunctionCalls: true,
    handleErrors: true
  },
  
  features: {
    streaming: true,
    functionCalling: true,
    vision: true,
    jsonMode: true,
    tools: true
  },
  
  health: {
    enabled: true,
    checkIntervalMs: 30000,
    timeoutMs: 5000,
    failureThreshold: 3,
    recoveryThreshold: 1,
    circuitBreaker: {
      enabled: true,
      timeoutMs: 60000,
      requestVolumeThreshold: 20,
      sleepWindowMs: 30000,
      errorThresholdPercentage: 50
    }
  }
}
```

## Configuration Files

### Example Complete Pipeline Configuration

```typescript
// pipeline-config.json
{
  "id": "anthropic-to-openai-pipeline",
  "name": "Anthropic to OpenAI Conversion Pipeline",
  "version": "1.0.0",
  "description": "Converts Anthropic Messages API to OpenAI Chat Completions API",
  
  "inputProtocol": "anthropic",
  "outputProtocol": "openai",
  
  "layers": {
    "llmswitch": {
      "inputProtocol": "anthropic",
      "outputProtocol": "openai",
      "transformTable": "anthropic-to-openai-v1",
      "strictMode": true,
      "requestOptions": {
        "stripUnknownFields": true
      }
    },
    
    "workflow": {
      "streaming": {
        "enabled": true,
        "convertToNonStream": true
      },
      "rateLimiting": {
        "enabled": true,
        "requestsPerSecond": 10,
        "maxConcurrent": 5
      },
      "timeouts": {
        "requestMs": 30000,
        "responseMs": 60000
      },
      "retryPolicy": {
        "enabled": true,
        "maxRetries": 3,
        "backoffStrategy": "exponential"
      }
    },
    
    "compatibility": {
      "fieldMappings": {
        "mappingTable": "openai-compatibility-v1",
        "strictMapping": false
      },
      "responseNormalization": {
        "enabled": true,
        "standardizeErrors": true
      },
      "validation": {
        "enabled": true,
        "level": "error"
      }
    },
    
    "provider": {
      "provider": "openai",
      "authentication": {
        "type": "bearer",
        "credentials": {
          "accessToken": "${OPENAI_API_KEY}"
        }
      },
      "endpoints": {
        "base": "https://api.openai.com/v1"
      },
      "models": {
        "default": "gpt-4",
        "available": ["gpt-4", "gpt-3.5-turbo"]
      },
      "requestSettings": {
        "timeoutMs": 30000,
        "maxRetries": 3
      }
    }
  },
  
  "transforms": {
    "requestTransform": "anthropic-to-openai-v1",
    "responseTransform": "openai-to-anthropic-v1"
  },
  
  "global": {
    "timeout": 120000,
    "enableLogging": true,
    "enableMetrics": true,
    "retryPolicy": {
      "maxRetries": 3,
      "backoffMs": 1000
    }
  }
}
```

### Environment-based Configuration

```typescript
// config-development.json
{
  "layers": {
    "llmswitch": {
      "strictMode": false,
      "caching": { "enabled": false }
    },
    "workflow": {
      "monitoring": { "logLevel": "debug" }
    },
    "provider": {
      "endpoints": {
        "base": "https://api.openai.com/v1"
      }
    }
  },
  "global": {
    "enableLogging": true,
    "enableMetrics": false
  }
}

// config-production.json
{
  "layers": {
    "llmswitch": {
      "strictMode": true,
      "caching": { "enabled": true }
    },
    "workflow": {
      "monitoring": { "logLevel": "basic" }
    },
    "provider": {
      "endpoints": {
        "base": "https://api.openai.com/v1"
      }
    }
  },
  "global": {
    "enableLogging": false,
    "enableMetrics": true
  }
}
```

## Configuration Loading and Management

### Configuration Loader Example

```typescript
import { ConfigLoader } from '../src/config/ConfigLoader';

async function loadPipelineConfig(): Promise<PipelineAssemblyTable> {
  const loader = new ConfigLoader({
    environment: process.env.NODE_ENV || 'development',
    configPath: './config'
  });
  
  // Load base configuration
  const baseConfig = await loader.load('pipeline-config.json');
  
  // Apply environment-specific overrides
  const envConfig = await loader.load(`config-${loader.environment}.json`);
  
  // Apply environment variable overrides
  const envVarOverrides = loader.loadEnvironmentVariables({
    prefix: 'PIPELINE_',
    mappings: {
      'OPENAI_API_KEY': 'layers.provider.authentication.credentials.accessToken',
      'RATE_LIMIT': 'layers.workflow.rateLimiting.requestsPerSecond',
      'TIMEOUT_MS': 'layers.provider.requestSettings.timeoutMs'
    }
  });
  
  // Merge configurations
  const finalConfig = loader.mergeConfigs(
    baseConfig,
    envConfig,
    envVarOverrides
  );
  
  // Validate configuration
  await loader.validate(finalConfig);
  
  return finalConfig;
}
```

### Configuration Validation

```typescript
import { ConfigValidator } from '../src/config/ConfigValidator';

const validator = new ConfigValidator({
  requiredFields: [
    'id',
    'name',
    'version',
    'inputProtocol',
    'outputProtocol',
    'layers.llmswitch.transformTable'
  ],
  
  typeValidators: {
    'layers.workflow.rateLimiting.requestsPerSecond': 'number',
    'layers.provider.authentication.type': 'string',
    'layers.caching.ttlMs': 'number'
  },
  
  customValidators: {
    'protocolCompatibility': (config: PipelineAssemblyTable) => {
      const supportedTransforms = [
        'anthropic-to-openai',
        'anthropic-to-gemini',
        'openai-to-gemini'
      ];
      
      const transformKey = `${config.inputProtocol}-to-${config.outputProtocol}`;
      
      if (!supportedTransforms.includes(transformKey)) {
        throw new Error(`Unsupported protocol conversion: ${transformKey}`);
      }
    },
    
    'modelSupport': (config: PipelineAssemblyTable) => {
      const provider = config.layers.provider;
      const llmswitch = config.layers.llmswitch;
      
      if (provider.models.available.length === 0) {
        throw new Error('Provider must have at least one available model');
      }
      
      // Check if default model is in available list
      if (!provider.models.available.includes(provider.models.default)) {
        throw new Error(`Default model ${provider.models.default} not in available models list`);
      }
    }
  }
});

// Validate configuration
await validator.validate(pipelineConfig);
```

## Configuration Management Best Practices

### 1. Environment Separation

- **Development**: Debug mode, local endpoints, verbose logging
- **Testing**: Mock endpoints, controlled rate limits
- **Production**: Optimized settings, monitoring, minimal logging

### 2. Security Considerations

```typescript
// Use environment variables for secrets
{
  "layers": {
    "provider": {
      "authentication": {
        "credentials": {
          "accessToken": "${OPENAI_API_KEY}",
          "refreshToken": "${OPENAI_REFRESH_TOKEN}"
        }
      }
    }
  }
}
```

### 3. Configuration Versioning

```typescript
{
  "version": "1.0.0",
  "schemaVersion": "2.0.0",
  "backwardCompatibility": ["1.0.0", "0.9.0"]
}
```

### 4. Performance Optimization

```typescript
{
  "layers": {
    "llmswitch": {
      "caching": {
        "enabled": process.env.NODE_ENV === 'production',
        "ttlMs": process.env.NODE_ENV === 'production' ? 300000 : 0
      }
    },
    "workflow": {
      "monitoring": {
        "performanceTracking": {
          "enabled": process.env.NODE_ENV === 'production',
          "sampleRate": 0.1
        }
      }
    }
  }
}
```

This comprehensive configuration guide provides all the necessary information to configure RCC Pipeline modules for various use cases, from simple protocol conversion to complex multi-provider workflows.