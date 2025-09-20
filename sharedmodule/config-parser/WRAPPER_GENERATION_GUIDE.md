# ConfigParser Wrapper Generation - Phase 2

## Overview

Phase 2 enhances the ConfigParser with wrapper generation functionality that transforms the generic `ConfigData` structure into module-specific configurations for ServerModule and PipelineAssembler.

## What's New in Phase 2

### 1. New Wrapper Interfaces

#### ServerWrapper
- Contains only HTTP server configuration
- Excludes virtual model information
- Compatible with ServerModule's ServerConfig interface

#### PipelineWrapper
- Contains virtual model routing tables
- Includes module configurations for llmswitch, workflow, compatibility, provider
- Compatible with PipelineAssembler's expected format

### 2. Wrapper Generation Methods

#### ConfigParser Methods
- `generateServerWrapper(config: ConfigData): ServerWrapper`
- `generatePipelineWrapper(config: ConfigData): PipelineWrapper`
- `generateAllWrappers(config: ConfigData): { server: ServerWrapper; pipeline: PipelineWrapper }`

#### Convenience Functions
- `generateServerWrapper(config: any): Promise<any>`
- `generatePipelineWrapper(config: any): Promise<any>`
- `generateAllWrappers(config: any): Promise<{ server: any; pipeline: any }>`
- `generateServerWrapperFromFile(filePath: string): Promise<any>`
- `generatePipelineWrapperFromFile(filePath: string): Promise<any>`
- `generateAllWrappersFromFile(filePath: string): Promise<{ server: any; pipeline: any }>`

## Usage Examples

### Basic Usage

```typescript
import { createConfigParser } from 'rcc-config-parser';

const parser = createConfigParser();
await parser.initialize();

// Parse configuration
const config = await parser.parseConfig(rawConfigData);

// Generate ServerModule wrapper
const serverWrapper = parser.generateServerWrapper(config);
console.log(`Server will run on ${serverWrapper.host}:${serverWrapper.port}`);

// Generate PipelineAssembler wrapper
const pipelineWrapper = parser.generatePipelineWrapper(config);
console.log(`Pipeline has ${pipelineWrapper.virtualModels.length} virtual models`);

// Generate both wrappers
const { server, pipeline } = parser.generateAllWrappers(config);

await parser.destroy();
```

### Using Convenience Functions

```typescript
import { generateServerWrapperFromFile, generatePipelineWrapperFromFile } from 'rcc-config-parser';

// Generate ServerModule wrapper directly from file
const serverConfig = await generateServerWrapperFromFile('./config.json');

// Generate PipelineAssembler wrapper directly from file
const pipelineConfig = await generatePipelineWrapperFromFile('./config.json');

// Generate both wrappers from file
const { server, pipeline } = await generateAllWrappersFromFile('./config.json');
```

## Wrapper Structure

### ServerWrapper Structure

```typescript
interface ServerWrapper {
  port: number;           // HTTP server port
  host: string;          // HTTP server host
  cors: {                // CORS configuration
    origin: string | string[];
    credentials: boolean;
  };
  compression: boolean;   // Enable compression
  helmet: boolean;       // Enable helmet security
  rateLimit: {           // Rate limiting
    windowMs: number;
    max: number;
  };
  timeout: number;       // Request timeout
  bodyLimit: string;     // Body size limit
  pipeline?: {           // Pipeline integration
    enabled: boolean;
    unifiedErrorHandling: boolean;
    unifiedMonitoring: boolean;
    errorMapping: Record<string, string>;
  };
}
```

### PipelineWrapper Structure

```typescript
interface PipelineWrapper {
  virtualModels: VirtualModelConfig[];  // Virtual model configurations
  modules: ModuleConfig[];             // Module configurations
  routing: RoutingConfig;              // Routing configuration
  metadata: {                          // Pipeline metadata
    version: string;
    createdAt: string;
    updatedAt: string;
    providerCount: number;
    virtualModelCount: number;
  };
}
```

## Configuration Transformation

### ServerModule Transformation
- Extracts HTTP server configuration from `config.server` or `config.rcc.server`
- Uses defaults when configuration is missing:
  - Port: 5506
  - Host: 'localhost'
  - CORS: Allow all origins
  - Rate limit: 100 requests per 15 minutes
- Excludes all virtual model and provider information

### PipelineAssembler Transformation
- Transforms virtual models to PipelineAssembler format
- Creates module configurations for:
  - llmswitch (weighted switching strategy)
  - workflow (request processing)
  - compatibility (format transformation)
  - provider modules (one per provider)
- Generates routing configuration with weighted strategy

## Backward Compatibility

The wrapper generation functionality is fully backward compatible:

- Existing `ConfigData` structure remains unchanged
- Existing parse methods continue to work as before
- New wrapper methods are additive only
- No breaking changes to public API

## Error Handling

All wrapper generation methods include:
- Comprehensive error handling
- IO tracking for debugging
- Detailed logging
- Type validation
- Graceful fallbacks for missing configuration

## Testing

Run the wrapper generation test:

```bash
cd /path/to/config-parser
npm run build
node test-wrapper-generation.js
```

This will demonstrate:
1. Configuration parsing
2. ServerModule wrapper generation
3. PipelineAssembler wrapper generation
4. Convenience method usage

## Integration Guide

### For ServerModule Users
1. Parse configuration using ConfigParser
2. Generate ServerWrapper using `generateServerWrapper()`
3. Pass ServerWrapper to ServerModule constructor
4. ServerModule receives clean HTTP configuration

### For PipelineAssembler Users
1. Parse configuration using ConfigParser
2. Generate PipelineWrapper using `generatePipelineWrapper()`
3. Use virtual models and modules from PipelineWrapper
4. PipelineAssembler receives structured routing configuration

### For Combined Usage
1. Parse configuration once
2. Generate both wrappers using `generateAllWrappers()`
3. Use server wrapper for ServerModule
4. Use pipeline wrapper for PipelineAssembler
5. Both modules receive appropriate configuration subsets

## Next Steps

Phase 3 could include:
- Additional wrapper types for other modules
- Configuration validation and schema checking
- Runtime configuration updates
- Configuration merging from multiple sources
- Enhanced error recovery and fallback strategies