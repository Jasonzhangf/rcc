# RCC Server Module

[![npm version](https://badge.fury.io/js/rcc-server.svg)](https://badge.fury.io/js/rcc-server)
[![Build Status](https://github.com/rcc/rcc-server/actions/workflows/build.yml/badge.svg)](https://github.com/rcc/rcc-server/actions/workflows/build.yml)
[![Coverage Status](https://coveralls.io/github/rcc/rcc-server/badge.svg)](https://coveralls.io/github/rcc/rcc-server)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

The RCC Server Module is a powerful HTTP server component designed for the RCC (Router-Controlled Computing) framework. It provides client input proxy response capabilities with intelligent virtual model routing, middleware support, and comprehensive monitoring features.

## Features

### 🚀 Core Capabilities
- **HTTP Server**: High-performance Express.js-based HTTP server with security middleware
- **Virtual Model Routing**: Intelligent request routing based on Claude Code Router rules
- **Middleware Support**: Extensible middleware system for request processing
- **WebSocket Support**: Real-time bidirectional communication
- **Load Balancing**: Multiple strategies (round-robin, weighted, least-connections)
- **Monitoring**: Comprehensive metrics and health checking
- **Configuration Management**: Flexible configuration system

### 🔧 Advanced Features
- **Model Capability Detection**: Automatic capability matching for virtual models
- **Intelligent Routing**: Rule-based routing with priority and condition evaluation
- **Health Monitoring**: Real-time health checks and system metrics
- **Error Handling**: Comprehensive error handling and recovery
- **Performance Metrics**: Request tracking and performance analytics
- **Pipeline Integration**: Seamless integration with Pipeline Scheduler for request processing
- **Configuration Management**: Dynamic configuration integration with virtual model mapping
- **Fallback Processing**: Automatic fallback to direct processing when pipeline fails

## Installation

```bash
npm install rcc-server
```

## Peer Dependencies

This module requires the following RCC modules:

```bash
npm install rcc-basemodule rcc-pipeline rcc-errorhandling rcc-configuration rcc-virtual-model-rules rcc-underconstruction
```

## Quick Start

### Basic Server Setup

```typescript
import { ServerModule } from 'rcc-server';

// Create server instance
const server = new ServerModule();

// Initialize with configuration
await server.initialize({
  port: 3000,
  host: 'localhost',
  cors: {
    origin: ['http://localhost:3000'],
    credentials: true
  },
  compression: true,
  helmet: true,
  rateLimit: {
    windowMs: 60000,
    max: 100
  },
  timeout: 30000,
  bodyLimit: '10mb'
});

// Start the server
await server.start();

console.log('Server is running on http://localhost:3000');
```

### Virtual Model Registration

```typescript
import { VirtualModelConfig } from 'rcc-server';

const modelConfig: VirtualModelConfig = {
  id: 'qwen-turbo',
  name: 'Qwen Turbo',
  provider: 'qwen',
  endpoint: 'https://chat.qwen.ai/api/v1/chat/completions',
  model: 'qwen-turbo',
  capabilities: ['chat', 'streaming', 'tools'],
  maxTokens: 4000,
  temperature: 0.7,
  topP: 1.0,
  priority: 8,
  enabled: true,
  routingRules: [
    {
      id: 'chat-rule',
      name: 'Chat requests',
      condition: 'path:/api/chat',
      weight: 1.0,
      enabled: true,
      priority: 5,
      modelId: 'qwen-turbo'
    }
  ]
};

await server.registerVirtualModel(modelConfig);
```

### Custom Route Registration

```typescript
import { RouteConfig } from 'rcc-server';

const routeConfig: RouteConfig = {
  id: 'chat-endpoint',
  path: '/api/chat',
  method: 'POST',
  handler: 'chatHandler',
  middleware: ['auth', 'rateLimit'],
  virtualModel: 'qwen-turbo',
  authRequired: true
};

await server.registerRoute(routeConfig);
```

## Pipeline Integration

The RCC Server Module provides seamless integration with the Pipeline Scheduler for advanced request processing capabilities. This integration enables sophisticated request routing, load balancing, and error handling through a unified pipeline architecture.

### Complete Integration Setup

```typescript
import { ServerModule } from 'rcc-server';
import { PipelineScheduler } from 'rcc-pipeline';
import { PipelineSystemConfig } from 'rcc-pipeline';

// Create server instance
const server = new ServerModule();

// Configure server
const serverConfig = {
  port: 3000,
  host: 'localhost',
  // ... other server configuration
};

server.configure(serverConfig);
await server.initialize();
await server.start();

// Create pipeline scheduler configuration
const pipelineConfig: PipelineSystemConfig = {
  pipelines: [
    {
      id: 'qwen-turbo-pipeline',
      name: 'Qwen Turbo Pipeline',
      type: 'ai-model',
      enabled: true,
      priority: 1,
      weight: 3,
      maxConcurrentRequests: 20,
      timeout: 45000,
      config: {
        model: 'qwen-turbo',
        provider: 'qwen',
        maxTokens: 2000,
        temperature: 0.7,
        topP: 0.9
      }
    }
  ],
  loadBalancer: {
    strategy: 'weighted',
    healthCheckInterval: 15000
  },
  scheduler: {
    defaultTimeout: 45000,
    maxRetries: 5,
    retryDelay: 2000
  }
};

// Create and integrate pipeline scheduler
const pipelineScheduler = new PipelineScheduler(pipelineConfig);
await server.setPipelineScheduler(pipelineScheduler);

// Register virtual models
await server.registerVirtualModel({
  id: 'qwen-turbo-virtual',
  name: 'Qwen Turbo Virtual Model',
  provider: 'qwen',
  model: 'qwen-turbo',
  capabilities: ['text-generation', 'chat'],
  maxTokens: 2000,
  temperature: 0.7,
  enabled: true
});
```

### Configuration-to-Pipeline Integration

The server automatically integrates with the Configuration module to provide dynamic virtual model mapping and pipeline generation:

```typescript
// The server automatically initializes ConfigurationToPipelineModule
// which provides:
// - Virtual model mapping from configuration
// - Pipeline table generation
// - Dynamic pipeline assembly
// - Configuration validation

// Check integration status
const status = server.getStatus();
console.log('Pipeline Integration:', {
  enabled: status.pipelineIntegration.enabled,
  schedulerAvailable: status.pipelineIntegration.schedulerAvailable,
  processingMethod: status.pipelineIntegration.processingMethod,
  fallbackEnabled: status.pipelineIntegration.fallbackEnabled
});
```

### Request Processing Flow

1. **Request Reception**: Server receives HTTP request
2. **Virtual Model Routing**: Request is routed to appropriate virtual model
3. **Pipeline Execution**: Request is processed through Pipeline Scheduler
4. **Fallback Handling**: If pipeline fails, falls back to direct processing
5. **Response Generation**: Response is formatted and returned to client

```typescript
// Example request processing
const request = {
  id: 'test-request',
  method: 'POST',
  path: '/api/chat',
  headers: {
    'Content-Type': 'application/json'
  },
  body: {
    messages: [
      { role: 'user', content: 'Hello!' }
    ]
  },
  timestamp: Date.now(),
  virtualModel: 'qwen-turbo-virtual'
};

// Process request (automatically uses pipeline if available)
const response = await server.handleRequest(request);

// Response includes processing metadata
console.log('Response:', {
  status: response.status,
  processingMethod: response.headers['X-Processing-Method'],
  virtualModel: response.headers['X-Virtual-Model'],
  pipelineId: response.headers['X-Pipeline-Id'],
  executionId: response.headers['X-Execution-Id'],
  processingTime: response.processingTime
});
```

### Error Handling and Fallback

The system provides comprehensive error handling with automatic fallback:

```typescript
// Pipeline execution errors are automatically handled
try {
  const response = await server.handleRequest(request);
  
  if (response.headers['X-Processing-Method'] === 'direct') {
    // Request was processed via fallback
    console.log('Fallback reason:', response.headers['X-Fallback-Reason']);
  }
} catch (error) {
  // Handle critical errors
  console.error('Request failed:', error);
}
```

### Monitoring and Metrics

Monitor pipeline integration performance:

```typescript
// Get detailed integration status
const integrationConfig = server.getPipelineIntegrationConfig();
console.log('Pipeline Integration Config:', {
  enabled: integrationConfig.enabled,
  defaultTimeout: integrationConfig.defaultTimeout,
  maxRetries: integrationConfig.maxRetries,
  fallbackToDirect: integrationConfig.fallbackToDirect
});

// Monitor overall system health
const health = await server.getHealth();
console.log('System Health:', {
  status: health.status,
  pipelineIntegration: health.checks.pipeline_integration,
  schedulerHealth: health.checks.pipeline_scheduler
});
```

## API Documentation

### ServerModule

The main class that provides all server functionality.

#### Methods

##### `initialize(config: ServerConfig): Promise<void>`
Initialize the server with configuration.

##### `start(): Promise<void>`
Start the HTTP server.

##### `stop(): Promise<void>`
Stop the HTTP server.

##### `handleRequest(request: ClientRequest): Promise<ClientResponse>`
Handle a client request and return a response.

##### `registerVirtualModel(model: VirtualModelConfig): Promise<void>`
Register a virtual model for request routing.

##### `registerRoute(route: RouteConfig): Promise<void>`
Register a custom route.

##### `getStatus(): ServerStatus`
Get current server status.

##### `getHealth(): Promise<HealthStatus>`
Get detailed health information.

### VirtualModelConfig

Configuration for virtual models:

```typescript
interface VirtualModelConfig {
  id: string;                    // Unique identifier
  name: string;                  // Human-readable name
  provider: string;              // Provider name (e.g., 'qwen', 'openai')
  endpoint: string;              // API endpoint URL
  apiKey?: string;               // Optional API key
  model: string;                 // Model name
  capabilities: string[];        // Supported capabilities
  maxTokens: number;             // Maximum token limit
  temperature: number;           // Temperature parameter
  topP: number;                  // Top-p parameter
  priority: number;              // Load balancing priority (1-10)
  enabled: boolean;              // Whether model is enabled
  routingRules: RoutingRule[];   // Routing rules
}
```

### ClientRequest

Request object format:

```typescript
interface ClientRequest {
  id: string;                    // Unique request ID
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;                  // Request path
  headers: Record<string, string>; // Request headers
  body?: any;                    // Request body
  query?: Record<string, string>; // Query parameters
  timestamp: number;             // Request timestamp
  clientId?: string;             // Optional client ID
  virtualModel?: string;         // Optional virtual model override
}
```

## Configuration

### ServerConfig

Complete server configuration:

```typescript
interface ServerConfig {
  port: number;                  // Server port
  host: string;                  // Server host
  cors: {                        // CORS configuration
    origin: string | string[];
    credentials: boolean;
  };
  compression: boolean;           // Enable compression
  helmet: boolean;               // Enable security headers
  rateLimit: {                   // Rate limiting
    windowMs: number;
    max: number;
  };
  timeout: number;               // Request timeout (ms)
  bodyLimit: string;             // Request body size limit
}
```

## Routing Rules and Virtual Model Mapping

The server uses routing rules to determine which virtual model should handle each request. When no specific model is requested, the system evaluates all enabled models against their routing rules and selects the first matching candidate.

### Virtual Model Registration
```typescript
const model = {
  id: 'chat-model',
  name: 'Chat Model',
  provider: 'openai',
  endpoint: 'https://api.openai.com/v1/chat',
  capabilities: ['chat', 'streaming'],
  // ... other config
};

await server.registerVirtualModel(model);
```

### Routing Rules
Virtual models can define routing rules to filter which requests they should handle:

```typescript
const model = {
  // ... other config
  routingRules: [
    {
      id: 'chat-only',
      name: 'Chat Requests Only',
      condition: 'path:/api/chat',
      weight: 1.0,
      enabled: true,
      priority: 1
    }
  ]
};
```

## Monitoring and Metrics

### Health Check

```typescript
const health = await server.getHealth();
console.log('Server health:', health.status);
console.log('Health checks:', health.checks);
```

### Request Metrics

```typescript
const metrics = server.getMetrics();
console.log('Total requests:', metrics.length);
console.log('Average response time:', 
  metrics.reduce((sum, m) => sum + m.processingTime, 0) / metrics.length);
```

### Server Status

```typescript
const status = server.getStatus();
console.log('Server status:', status.status);
console.log('Active connections:', status.connections);
console.log('Virtual models:', status.virtualModels);
```

## Middleware System

### Registering Middleware

```typescript
import { MiddlewareConfig } from 'rcc-server';

const middleware: MiddlewareConfig = {
  name: 'auth',
  type: 'pre',
  priority: 10,
  enabled: true,
  config: {
    secretKey: 'your-secret-key'
  }
};

await server.registerMiddleware(middleware);
```

### Built-in Middleware

The server includes several built-in middleware:

- **Security**: Helmet.js for security headers
- **CORS**: Cross-origin resource sharing
- **Compression**: Response compression
- **Body Parsing**: Request body parsing
- **Rate Limiting**: Request rate limiting
- **Request Logging**: Detailed request logging

## Error Handling

The server provides comprehensive error handling:

```typescript
try {
  const response = await server.handleRequest(request);
  console.log('Request successful:', response);
} catch (error) {
  console.error('Request failed:', error);
  
  // Error response includes:
  // - Error details
  // - Request ID for tracking
  // - Processing time
  // - HTTP status code
}
```

## Development

### Building

```bash
# Install dependencies
npm install

# Build the module
npm run build

# Run type checking
npm run typecheck

# Run linting
npm run lint

# Run tests
npm test
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Examples

Check the `examples/` directory for complete usage examples:

- [Basic Server](examples/basic-server.ts) - Basic server setup and configuration
- [Virtual Model Setup](examples/virtual-model.ts) - Virtual model registration and routing
- [Custom Routes](examples/custom-routes.ts) - Custom route registration and handling
- [Middleware](examples/middleware.ts) - Middleware system and custom middleware
- [Pipeline Integration](examples/pipeline-integration-example.ts) - Pipeline scheduler integration examples
- [Complete Integration](examples/complete-integration-example.ts) - Complete end-to-end integration example

## Performance

The server module is optimized for performance:

- **Non-blocking I/O**: Built on Node.js and Express.js
- **Connection Pooling**: Efficient connection management
- **Memory Management**: Automatic garbage collection and cleanup
- **Load Balancing**: Intelligent request distribution
- **Caching**: Response caching where appropriate
- **Compression**: Automatic response compression

## Security

The server includes several security features:

- **Security Headers**: Helmet.js for secure headers
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: Prevent abuse and DoS attacks
- **Input Validation**: Request validation and sanitization
- **Authentication**: Optional authentication middleware
- **HTTPS**: SSL/TLS support (requires certificate)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue on the [GitHub Issues](https://github.com/rcc/rcc-server/issues) page.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and version history.

## Related Projects

- [RCC Base Module](https://github.com/rcc/rcc-basemodule) - Core framework for modular development
- [RCC Pipeline](https://github.com/rcc/rcc-pipeline) - Pipeline and workflow management
- [RCC Configuration](https://github.com/rcc/rcc-configuration) - Configuration management and validation
- [RCC Virtual Model Rules](https://github.com/rcc/rcc-virtual-model-rules) - Virtual model routing and rule management
- [RCC Error Handling](https://github.com/rcc/rcc-errorhandling) - Error handling and recovery
- [RCC Under Construction](https://github.com/rcc/rcc-underconstruction) - Feature development tracking

---

**Built with ❤️ by the RCC Development Team**