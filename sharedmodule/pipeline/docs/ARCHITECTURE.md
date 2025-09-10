# RCC Pipeline Architecture Documentation

## Overview

The RCC Pipeline module implements a configurable four-layer architecture for AI model request processing and transformation. Built on the BaseModule framework, it provides flexible protocol conversion, workflow management, compatibility adaptation, and standardized provider communication.

## Core Architecture

### Design Principles

1. **Modularity**: Each layer is an independent module extending BasePipelineModule
2. **Bidirectional Communication**: All modules support request/response processing
3. **Configuration-Driven**: Transform tables define mappings without code changes
4. **Extensibility**: Easy to add new protocols, transformers, and workflow behaviors

### Architecture Diagram

```
Client Request → LLMSwitch → Workflow → Compatibility → Provider → AI Service
                  ↑           ↑            ↑            ↑
Client Response ← LLMSwitch ← Workflow ← Compatibility ← Provider
```

## Module Architecture

### BasePipelineModule Abstract Class

All pipeline modules extend this base class, providing standardized interfaces and lifecycle management.

```typescript
abstract class BasePipelineModule extends BaseModule {
  // Core processing methods
  abstract processRequest(request: any): Promise<any>;
  abstract processResponse(response: any): Promise<any>;
  
  // Module lifecycle
  abstract activate(): Promise<void>;
  abstract deactivate(): Promise<void>;
  abstract configure(config: any): Promise<void>;
  
  // Communication interfaces
  abstract handleRequestIn(request: any): Promise<any>;
  abstract handleRequestOut(request: any): Promise<any>;
  abstract handleResponseIn(response: any): Promise<any>;
  abstract handleResponseOut(response: any): Promise<any>;
}
```

### Communication Protocol

Each module implements the same four-interface pattern:

1. **req_in**: receives incoming requests
2. **process**: processes the data
3. **req_out**: sends processed requests to next layer
4. **response_in**: receives incoming responses
5. **process**: processes the response
6. **response_out**: sends processed responses to previous layer

## Layer 1: LLMSwitch Module

### Purpose
Protocol conversion between different AI service providers. Acts as the entry point for all external requests.

### Responsibilities
- Convert request formats between protocols
- Transform response formats back to original protocol
- Maintain protocol-specific field mappings
- Handle request/response correlation

### Supported Protocol Conversions

| Input Protocol | Output Protocol | Transform Table |
|----------------|-----------------|-----------------|
| anthropic      | openai          | anthropic-to-openai |
| anthropic      | gemini          | anthropic-to-gemini  |
| openai         | gemini          | openai-to-gemini     |

### Internal Architecture

```typescript
class LLMSwitchModule extends BasePipelineModule {
  private transformTable: TransformTable;
  private inputProtocol: SupportedProtocol;
  private outputProtocol: SupportedProtocol;
  
  async processRequest(request: any): Promise<any> {
    // Convert input protocol to internal protocol
    return this.transformRequest(request);
  }
  
  async processResponse(response: any): Promise<any> {
    // Convert internal protocol to output protocol
    return this.transformResponse(response);
  }
  
  private transformRequest(request: any): any {
    // Apply transform table mappings
    const transformed = {};
    
    for (const [sourceKey, targetConfig] of Object.entries(this.transformTable.requestMappings)) {
      const sourceValue = this.getNestedValue(request, sourceKey);
      if (sourceValue !== undefined) {
        this.setNestedValue(transformed, targetConfig, sourceValue);
      }
    }
    
    return transformed;
  }
  
  private transformResponse(response: any): any {
    // Apply reverse transformation
    const transformed = {};
    
    for (const [targetKey, sourceConfig] of Object.entries(this.transformTable.responseMappings)) {
      const sourceValue = this.getNestedValue(response, sourceConfig);
      if (sourceValue !== undefined) {
        this.setNestedValue(transformed, targetKey, sourceValue);
      }
    }
    
    return transformed;
  }
}
```

## Layer 2: Workflow Module

### Purpose
System-level control and workflow management for requests that have been converted to the standard protocol.

### Responsibilities
- **Stream Response Handling**: Convert streaming responses to non-streaming format
- **Rate Limiting**: Control request frequency and concurrency
- **Timeout Management**: Handle request and response timeouts
- **Request Batching**: Group multiple requests when appropriate
- **Error Recovery**: Implement retry and fallback logic

### Internal Architecture

```typescript
class WorkflowModule extends BasePipelineModule {
  private config: WorkflowConfig;
  private requestQueue: RequestQueue;
  private rateLimiter: RateLimiter;
  
  async processRequest(request: any): Promise<any> {
    // Apply rate limiting
    await this.rateLimiter.waitForSlot();
    
    // Add timeout to request
    const requestWithTimeout = {
      ...request,
      timeoutMs: this.config.timeoutMs
    };
    
    // Apply request preprocessing
    return this.preprocessRequest(requestWithTimeout);
  }
  
  async processResponse(response: any): Promise<any> {
    // Handle stream conversion if needed
    if (this.config.enableStreaming && response.stream) {
      return this.convertStreamToNonStream(response);
    }
    
    // Apply response post-processing
    return this.postprocessResponse(response);
  }
  
  private async convertStreamToNonStream(streamResponse: any): Promise<any> {
    // Collect streaming chunks and convert to single response
    const chunks: any[] = [];
    
    for await (const chunk of streamResponse) {
      chunks.push(chunk);
    }
    
    return {
      ...streamResponse,
      stream: false,
      chunks,
      content: this.extractContentFromChunks(chunks)
    };
  }
}
```

### Workflow Configuration

```typescript
interface WorkflowConfig {
  enableStreaming: boolean;
  rateLimit: {
    requestsPerSecond: number;
    maxConcurrent: number;
  };
  timeoutMs: number;
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
}
```

## Layer 3: Compatibility Module

### Purpose
Field mapping and adaptation for protocol-specific differences and non-standard responses.

### Responsibilities
- **Field Mapping**: Convert between standard and provider-specific field names
- **Response Normalization**: Standardize error formats and response structures
- **Data Type Conversion**: Handle differences in data types between providers
- **Custom Adapters**: Support provider-specific response transformations

### Internal Architecture

```typescript
class CompatibilityModule extends BasePipelineModule {
  private fieldMappings: FieldMappingTable;
  private responseAdapters: Map<string, ResponseAdapter>;
  
  async processRequest(request: any): Promise<any> {
    // Apply field mappings for outgoing request
    return this.mapFields(request, this.fieldMappings.requestMappings);
  }
  
  async processResponse(response: any): Promise<any> {
    // Normalize response structure
    const normalized = this.normalizeResponse(response);
    
    // Apply reverse field mappings
    const mapped = this.mapFields(normalized, this.fieldMappings.responseMappings);
    
    return mapped;
  }
  
  private normalizeResponse(response: any): any {
    // Handle different error formats
    if (response.error) {
      return this.normalizeError(response);
    }
    
    // Apply response-specific adapters
    const adapter = this.responseAdapters.get(response.type);
    if (adapter) {
      return adapter.adapt(response);
    }
    
    return response;
  }
  
  private normalizeError(errorResponse: any): any {
    // Convert various error formats to standard format
    return {
      type: 'error',
      code: errorResponse.code || errorResponse.error?.code || 'unknown',
      message: errorResponse.message || errorResponse.error?.message || 'Unknown error',
      details: errorResponse.details || errorResponse.error || errorResponse,
      timestamp: Date.now()
    };
  }
}
```

### Field Mapping Configuration

```typescript
interface FieldMappingTable {
  requestMappings: Record<string, FieldMapping>;
  responseMappings: Record<string, FieldMapping>;
}

type FieldMapping = {
  targetField: string;
  transform?: (value: any) => any;
  required?: boolean;
  defaultValue?: any;
};
```

## Layer 4: Provider Module

### Purpose
Standardized communication with AI service providers. Handles all provider-specific communication details.

### Responsibilities
- **Endpoint Management**: Route requests to correct provider endpoints
- **Authentication**: Handle API keys, tokens, and other auth mechanisms
- **Request Formatting**: Ensure requests meet provider requirements
- **Response Handling**: Extract and standardize provider responses
- **Reliability**: Implement retries, circuit breakers, and health checks

### Internal Architecture

```typescript
class ProviderModule extends BasePipelineModule {
  private providerRegistry: ProviderRegistry;
  private authManager: AuthenticationManager;
  
  async processRequest(request: any): Promise<any> {
    // Get provider configuration
    const providerConfig = this.providerRegistry.getProvider(request.provider);
    
    // Apply authentication
    const authRequest = await this.authManager.authenticate(request, providerConfig);
    
    // Format request for provider
    const formattedRequest = this.formatRequest(authRequest, providerConfig);
    
    // Send to provider
    const response = await this.sendToProvider(formattedRequest, providerConfig);
    
    return response;
  }
  
  async processResponse(response: any): Promise<any> {
    // Standardize response format
    return this.standardizeResponse(response);
  }
  
  private formatRequest(request: any, config: ProviderConfig): any {
    // Apply provider-specific formatting
    const formatted = {
      ...request,
      url: this.buildEndpoint(config.endpoint, request.model),
      headers: this.buildHeaders(config, request),
      body: this.buildBody(config, request)
    };
    
    return formatted;
  }
  
  private async sendToProvider(request: any, config: ProviderConfig): Promise<any> {
    // Implement HTTP client with retry logic
    const client = new HttpClient({
      timeout: config.timeoutMs,
      retries: config.maxRetries
    });
    
    try {
      const response = await client.post(request.url, {
        headers: request.headers,
        body: request.body
      });
      
      return response.data;
    } catch (error) {
      // Handle provider-specific errors
      throw this.normalizeProviderError(error, config);
    }
  }
}
```

### Provider Configuration

```typescript
interface ProviderConfig {
  name: string;
  endpoint: string;
  authentication: {
    type: 'bearer' | 'basic' | 'custom';
    token?: string;
    headers?: Record<string, string>;
  };
  models: string[];
  maxTokens: number;
  timeoutMs: number;
  maxRetries: number;
  features: {
    streaming: boolean;
    functions: boolean;
    vision: boolean;
  };
}
```

## Pipeline Assembly

### PipelineAssembler

The assembler is responsible for creating and configuring complete pipeline instances based on assembly tables.

```typescript
class PipelineAssembler {
  private moduleRegistry: Map<string, typeof BasePipelineModule>;
  
  async assemble(assemblyTable: PipelineAssemblyTable): Promise<Pipeline> {
    // Create layer instances
    const layers = {
      llmswitch: await this.createModule('LLMSwitchModule', assemblyTable.layers.llmswitch),
      workflow: await this.createModule('WorkflowModule', assemblyTable.layers.workflow),
      compatibility: await this.createModule('CompatibilityModule', assemblyTable.layers.compatibility),
      provider: await this.createModule('ProviderModule', assemblyTable.layers.provider)
    };
    
    // Configure inter-module communication
    await this.connectModules(layers);
    
    // Configure each module
    await this.configureModules(layers, assemblyTable);
    
    // Create pipeline instance
    const pipeline = new Pipeline(layers, assemblyTable);
    
    // Initialize pipeline
    await pipeline.initialize();
    
    return pipeline;
  }
  
  private async connectModules(layers: PipelineLayers): Promise<void> {
    // Connect modules in chain: LLMSwitch → Workflow → Compatibility → Provider
    layers.llmswitch.connect(layers.workflow);
    layers.workflow.connect(layers.compatibility);
    layers.compatibility.connect(layers.provider);
    
    // Set up reverse connections for responses
    layers.provider.connectResponse(layers.compatibility);
    layers.compatibility.connectResponse(layers.workflow);
    layers.workflow.connectResponse(layers.llmswitch);
  }
}
```

### Pipeline Assembly Table Structure

```typescript
interface PipelineAssemblyTable {
  // Pipeline identification
  id: string;
  name: string;
  version: string;
  
  // Protocol configuration
  inputProtocol: SupportedProtocol;
  outputProtocol: SupportedProtocol;
  
  // Layer configurations
  layers: {
    llmswitch: LLMSwitchConfig;
    workflow: WorkflowConfig;
    compatibility: CompatibilityConfig;
    provider: ProviderConfig;
  };
  
  // Transform references
  transforms: {
    requestTransform: string;
    responseTransform: string;
    errorTransform?: string;
  };
  
  // Pipeline-level configuration
  global: {
    timeout?: number;
    enableLogging?: boolean;
    enableMetrics?: boolean;
  };
}
```

## Transform Table Architecture

Transform tables provide configuration-based field mapping without requiring code changes. They define how fields should be transformed between protocols.

### Transform Table Structure

```typescript
interface TransformTable {
  version: string;
  description: string;
  protocols: {
    input: SupportedProtocol;
    output: SupportedProtocol;
  };
  
  // Request transformations (input → output)
  requestMappings: TransformMappings;
  
  // Response transformations (output → input)
  responseMappings: TransformMappings;
  
  // Error transformations
  errorMappings?: TransformMappings;
  
  // Validation rules
  validation?: ValidationRules;
}

type TransformMappings = Record<string, string | TransformFunction | TransformConfig>;

type TransformFunction = (value: any, context: TransformContext) => any;

type TransformConfig = {
  field: string;
  transform?: TransformFunction;
  required?: boolean;
  defaultValue?: any;
  condition?: (value: any) => boolean;
};
```

### Example Transform Table

```typescript
const anthropicToOpenAI: TransformTable = {
  version: '1.0.0',
  description: 'Anthropic to OpenAI protocol conversion',
  protocols: {
    input: 'anthropic',
    output: 'openai'
  },
  
  requestMappings: {
    'model': {
      field: 'model',
      transform: (value) => {
        const mapping = {
          'claude-3-sonnet-20240229': 'claude-3-sonnet-20240229',
          'claude-3-opus-20240229': 'claude-3-opus-20240229',
          'claude-3-haiku-20240307': 'claude-3-haiku-20240307'
        };
        return mapping[value] || value;
      }
    },
    'max_tokens': 'max_tokens',
    'messages': {
      field: 'messages',
      transform: (messages) => messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }))
    }
  },
  
  responseMappings: {
    'content': 'content',
    'role': 'role',
    'usage.prompt_tokens': 'usage.prompt_tokens',
    'usage.completion_tokens': 'usage.completion_tokens',
    'model': 'model'
  }
};
```

## Error Handling Architecture

### Error Types

The pipeline defines several error types for different scenarios:

```typescript
interface PipelineError {
  type: 'configuration' | 'transformation' | 'communication' | 'timeout' | 'rate_limit';
  code: string;
  message: string;
  layer: string;
  details: any;
  timestamp: number;
  recoverable: boolean;
}
```

### Error Handling Flow

1. **Module-level Handling**: Each module handles errors within its scope
2. **Pipeline-level Handling**: The pipeline coordinates error recovery across modules
3. **Client-level Handling**: Structured error responses for client applications

### Error Recovery Strategies

- **Retry**: Transient errors (network timeouts, rate limits)
- **Fallback**: Alternative providers or protocols
- **Degradation**: Reduced functionality when complete service unavailable
- **Fail-fast**: Critical errors that cannot be recovered

## Performance and Scalability

### Connection Pooling

- HTTP connection pooling for provider communication
- Connection reuse within pipeline instances
- Configurable pool sizes and timeouts

### Caching

- Transform table caching to avoid repeated loading
- Response caching for identical requests
- Configuration caching for pipeline assembly

### Monitoring and Metrics

- Request/response timing metrics
- Error rate tracking
- Layer-specific performance monitoring
- Provider performance comparison

## Security Considerations

### Authentication Security

- Secure storage of API keys and tokens
- Token refresh and rotation support
- Authentication failure handling

### Data Privacy

- Request/response data encryption
- Sensitive data logging controls
- Audit trail for compliance

### Input Validation

- Type checking for all inputs
- Field length and content validation
- Malicious input detection

This architecture provides a robust, extensible foundation for AI model request processing that can adapt to new protocols, providers, and requirements through configuration rather than code changes.