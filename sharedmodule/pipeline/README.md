# RCC Pipeline Module

A configurable and extensible pipeline module for AI model routing and transformation, built on the RCC BaseModule framework.

## Overview

The pipeline module provides a flexible architecture for processing AI model requests through a series of transformation layers. Each layer in the pipeline is responsible for specific protocol transformations, workflow management, compatibility adaptation, and provider communication.

## Architecture

### Core Components

1. **BasePipelineModule** - Abstract base class extending BaseModule
2. **Pipeline Layers** - Four specialized modules processing requests
3. **PipelineAssembler** - Configures and connects pipeline layers
4. **Transform Tables** - Configuration-based field mappings

### Pipeline Layers

```
Request Flow:  LLMSwitch → Workflow → Compatibility → Provider
Response Flow: Provider → Compatibility → Workflow → LLMSwitch
```

#### 1. LLMSwitch Layer
- **Purpose**: Protocol conversion between different AI service providers
- **Input**: Native protocol requests (Anthropic, Gemini, etc.)
- **Output**: Standardized protocol requests
- **Supported Conversions**:
  - Anthropic → OpenAI
  - Anthropic → Gemini
  - OpenAI → Gemini (future)

#### 2. Workflow Layer
- **Purpose**: System-level control and flow management
- **Responsibilities**:
  - Stream response handling (convert streaming to non-streaming)
  - Rate limiting and flow control
  - Request batching and queuing
  - Timeout management

#### 3. Compatibility Layer
- **Purpose**: Field mapping and non-standard response adaptation
- **Responsibilities**:
  - Protocol-specific field transformations
  - Non-standard response format adaptation
  - Error message standardization
  - Response structure normalization

#### 4. Provider Layer
- **Purpose**: Standard provider communication
- **Responsibilities**:
  - Endpoint management
  - Authentication and authorization
  - Model and token configuration
  - Communication reliability

## Module Structure

```
src/
├── modules/               # Pipeline layer implementations
│   ├── LLMSwitchModule.ts
│   ├── WorkflowModule.ts
│   ├── CompatibilityModule.ts
│   └── ProviderModule.ts
├── assembler/            # Pipeline assembly logic
│   ├── PipelineAssembler.ts
│   └── PipelineConfig.ts
├── transformers/         # Transform tables and mappings
│   ├── LLMSwitchTransforms.ts
│   ├── CompatibilityTransforms.ts
│   └── TransformRegistry.ts
├── interfaces/           # TypeScript interfaces
│   ├── IPipelineModule.ts
│   ├── IPipelineAssembler.ts
│   └── ITransformTable.ts
├── types/               # Type definitions
│   ├── PipelineTypes.ts
│   └── TransformTypes.ts
└── config/              # Configuration schemas
    ├── PipelineConfig.ts
    └── TransformConfig.ts

docs/
├── ARCHITECTURE.md      # Detailed architecture documentation
├── TRANSFORM_GUIDE.md   # Transform table creation guide
└── CONFIGURATION.md     # Configuration guide
```

## Usage

### Basic Pipeline Creation

```typescript
import { PipelineAssembler } from './src/assembler/PipelineAssembler';
import { LLMSwitchModule } from './src/modules/LLMSwitchModule';
import { WorkflowModule } from './src/modules/WorkflowModule';
import { CompatibilityModule } from './src/modules/CompatibilityModule';
import { ProviderModule } from './src/modules/ProviderModule';

// Create pipeline configuration
const pipelineConfig = {
  inputProtocol: 'anthropic',
  outputProtocol: 'openai',
  layers: {
    llmswitch: {
      inputProtocol: 'anthropic',
      outputProtocol: 'openai',
      transforms: 'anthropic-to-openai'
    },
    workflow: {
      enableStreaming: true,
      rateLimit: 10,
      timeoutMs: 30000
    },
    compatibility: {
      fieldMappings: 'openai-standard',
      normalizeResponses: true
    },
    provider: {
      endpoint: 'https://api.openai.com/v1/chat/completions',
      apiKey: 'your-api-key',
      model: 'gpt-4',
      maxTokens: 4096
    }
  }
};

// Assemble pipeline
const assembler = new PipelineAssembler();
const pipeline = await assembler.assemble(pipelineConfig);

// Process request
const request = {
  // Anthropic request format
  model: 'claude-3-sonnet-20240229',
  max_tokens: 1000,
  messages: [
    { role: 'user', content: 'Hello, world!' }
  ]
};

const response = await pipeline.processRequest(request);
```

### Custom Transform Tables

```typescript
import { TransformRegistry } from './src/transformers/TransformRegistry';

// Register custom transform
TransformRegistry.register('custom-anthropic-to-openai', {
  requestMappings: {
    'model': (value) => modelMapping[value] || value,
    'max_tokens': 'max_tokens',
    'messages': (messages) => messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }))
  },
  responseMappings: {
    'content': 'content',
    'role': 'role',
    'usage.prompt_tokens': 'usage.prompt_tokens',
    'usage.completion_tokens': 'usage.completion_tokens'
  }
});
```

## Configuration

### Pipeline Assembly Table

```typescript
interface PipelineAssemblyTable {
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
  
  // Global settings
  global?: {
    timeout?: number;
    retryCount?: number;
    enableLogging?: boolean;
  };
}
```

### Transform Configuration

```typescript
interface TransformTable {
  version: string;
  description: string;
  
  // Request transformations (input → processing)
  requestMappings: Record<string, string | TransformFunction>;
  
  // Response transformations (processing → output)
  responseMappings: Record<string, string | TransformFunction>;
  
  // Error transformations
  errorMappings?: Record<string, string | TransformFunction>;
}
```

## Development Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run in development mode
npm run dev
```

## API Reference

### BasePipelineModule

Abstract base class for all pipeline modules.

```typescript
abstract class BasePipelineModule extends BaseModule {
  abstract processRequest(request: any): Promise<any>;
  abstract processResponse(response: any): Promise<any>;
  
  // Common interface
  configure(config: any): void;
  activate(): Promise<void>;
  deactivate(): Promise<void>;
}
```

### PipelineAssembler

Assembles and configures pipeline modules.

```typescript
class PipelineAssembler {
  async assemble(config: PipelineAssemblyTable): Promise<Pipeline>;
  async activatePipeline(pipeline: Pipeline): Promise<void>;
  async deactivatePipeline(pipeline: Pipeline): Promise<void>;
}
```

## Contributing

When contributing to the pipeline module:

1. Follow the existing code structure and patterns
2. Implement proper error handling and logging
3. Add comprehensive tests for new functionality
4. Update documentation and API references
5. Ensure all modules extend BasePipelineModule

## License

MIT License - see LICENSE file for details.