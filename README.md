# RCC (Route Claude Code)

A modular TypeScript framework for building AI-powered applications with advanced pipeline-based request processing and service orchestration capabilities.

## 🚀 Overview

RCC is a comprehensive system designed to facilitate the development of AI applications through a modular architecture. It provides:

- **Modular Design**: Pluggable components for maximum flexibility
- **Pipeline-Based Processing**: Request processing through llmswitch → workflow → compatibility → provider flow
- **Service Orchestration**: Bootstrap-based service management and coordination
- **Pure Forwarding Architecture**: Clean separation between HTTP server and routing logic
- **TypeScript Support**: Full type safety and modern development experience

## 📦 Core Modules

### 1. rcc-basemodule
**Foundation module providing core infrastructure**
- Modular architecture with BaseModule class
- Message center for inter-module communication
- Lifecycle management and configuration system
- Debug and logging capabilities

### 2. rcc-server
**HTTP server with pure request forwarding**
- Pure forwarding architecture (v3.0)
- Zero routing logic - delegates all decisions to scheduler
- HTTP server configuration and request forwarding only
- RESTful API support with Express.js

### 3. rcc-pipeline
**Pipeline-based request processing system**
- Modular execution pipeline: llmswitch → workflow → compatibility → provider
- Real provider integration (Qwen, IFlow) with OAuth authentication
- Centralized configuration validation
- Stream processing and compatibility handling
- Integrated error handling with RCC framework

### 4. rcc-bootstrap
**Service initialization and coordination**
- Service lifecycle management
- Health monitoring and metrics collection
- Coordinated startup and shutdown sequences
- Configuration management and validation

### 5. rcc-errorhandling
**Comprehensive error management**
- Centralized error processing and classification
- Strategic recovery with retry, fallback, and circuit breaker patterns
- Real-time error monitoring and metrics collection
- Integration with all pipeline modules for unified error handling

### 6. rcc-llmswitch (Pipeline Module)
**Protocol conversion layer**
- Bidirectional protocol conversion between different AI providers
- Anthropic ↔ OpenAI request/response conversion
- Tool calling and streaming format translation
- Dedicated protocol translation only

### 7. rcc-workflow (Pipeline Module)
**Stream processing layer**
- Converts streaming requests to non-streaming requests for downstream processing
- Converts non-streaming responses back to streaming format for upstream delivery
- SSE (Server-Sent Events) format handling
- Bidirectional stream/non-stream conversion

### 8. rcc-compatibility (Pipeline Module)
**Field mapping and compatibility layer**
- Bidirectional field conversion within the same protocol family
- JSON-based field mapping tables for compatibility
- Supports qwen/iflow/lmstudio provider field mappings
- Pass-through mode for fully OpenAI-compatible third-party services
- Provider-specific field transformations

## ✨ Key Features

### Pipeline-Based Processing
- **llmswitch**: Protocol conversion between different AI providers
- **workflow**: Stream/non-stream format conversion
- **compatibility**: Field mapping and provider compatibility
- **provider**: HTTP request handling and service integration

### Pure Forwarding Architecture
- **Zero Routing Logic**: Server only forwards requests to scheduler
- **Clean Separation**: HTTP server completely separate from routing decisions
- **Scheduler-Centric**: All model selection and routing logic in pipeline system
- **Performance Optimization**: Minimal overhead and focused responsibility

### Service Orchestration
- Automatic service discovery and registration
- Health monitoring and automatic recovery
- Graceful shutdown and resource cleanup
- Dependency resolution and ordering

### Comprehensive Integration
- **Multi-Provider Support**: OpenAI, Anthropic, Qwen, iFlow, LMStudio
- **Protocol Flexibility**: Seamless conversion between different API formats
- **Stream Processing**: Both streaming and non-streaming request handling
- **Error Handling**: Robust error recovery and fallback mechanisms

## 🛠️ Installation

```bash
# Install individual modules
npm install rcc-basemodule
npm install rcc-server
npm install rcc-pipeline
npm install rcc-bootstrap
npm install rcc-errorhandling
npm install rcc-llmswitch
npm install rcc-workflow
npm install rcc-compatibility
```

## 📖 Usage

### Basic Server Setup

```typescript
import { ServerModule } from 'rcc-server';

const server = new ServerModule();

await server.configure({
  server: {
    port: 3000,
    host: 'localhost',
    cors: true,
    helmet: true,
    compression: true
  }
});

await server.initialize();
await server.start();
```

### Bootstrap Service Integration

```typescript
import { BootstrapService } from 'rcc-bootstrap';
import { ServerModule } from 'rcc-server';

const bootstrap = new BootstrapService();
const server = new ServerModule();

// Configure bootstrap with services
await bootstrap.configure({
  version: '1.0.0',
  systemName: 'My RCC Application',
  environment: 'development',
  services: [{
    id: 'main-server',
    name: 'Main Server',
    type: 'http-server',
    modulePath: './dist/server.js',
    config: { port: 3000 }
  }]
});

// Connect server to bootstrap
bootstrap.setServerModule(server);

// Initialize and start
await bootstrap.initialize();
await bootstrap.start();
```

### Pipeline Integration

```typescript
import { PipelineAssembler } from 'rcc-pipeline';
import { ServerModule } from 'rcc-server';

// Create pipeline with standard modules
const pipeline = new PipelineAssembler();
await pipeline.configure({
  modules: [
    { type: 'llmswitch', config: { /* protocol conversion config */ } },
    { type: 'workflow', config: { /* stream processing config */ } },
    { type: 'compatibility', config: { /* field mapping config */ } },
    { type: 'provider', config: { /* HTTP service config */ } }
  ]
});

// Server forwards all requests to pipeline for processing
// No routing logic in server - pure forwarding only
```

## 🧪 Integration Testing

The system includes comprehensive integration tests that verify module interoperability:

```bash
# Run complete system integration test
node test-complete-system.mjs

# Run specific integration tests
node test-integration.mjs
node test-phase4-integration.ts
```

**Test Coverage:**
- ✅ Module import and dependency resolution
- ✅ Service lifecycle management
- ✅ Health monitoring and state tracking
- ✅ Pipeline-based request processing
- ✅ Real provider integration (Qwen, IFlow)
- ✅ Centralized configuration validation
- ✅ RCC error handling framework integration
- ✅ Real system error handling verification
- ✅ Pure forwarding architecture
- ✅ Multi-provider compatibility
- ✅ Stream/non-stream conversion

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    RCC System Architecture                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │   Client    │───►│   Server    │───►│     Pipeline        │  │
│  │   Request   │    │   Module    │    │     System          │  │
│  └─────────────┘    │ (Pure HTTP) │    │                     │  │
│                      └─────────────┘    │  ┌─────────────┐    │  │
│                                         │  │ llmswitch   │    │  │
│                      ┌─────────────┐    │  └─────────────┘    │  │
│                      │  Bootstrap  │    │  ┌─────────────┐    │  │
│                      │   Service   │◄───┤  │ workflow     │    │  │
│                      └─────────────┘    │  └─────────────┘    │  │
│                                         │  ┌─────────────┐    │  │
│                      ┌─────────────┐    │  │compatibility│    │  │
│                      │ BaseModule  │    │  └─────────────┘    │  │
│                      │ Framework   │    │  ┌─────────────┐    │  │
│                      └─────────────┘    │  │  provider    │    │  │
│                                         │  └─────────────┘    │  │
└─────────────────────────────────────────────────────────────────┘
```

**Data Flow**: Request → Server (HTTP) → Pipeline (Processing) → Provider (AI Service) → Response

**Key Principles:**
- **Pure Forwarding**: Server only handles HTTP, no routing logic
- **Pipeline Processing**: All request processing through standardized modules
- **Modular Design**: Each component has single responsibility
- **Scheduler-Centric**: All intelligent decisions in pipeline system

## 🔧 Configuration

### Server Configuration
```typescript
interface ServerConfig {
  server: {
    port: number;
    host: string;
    cors?: boolean;
    helmet?: boolean;
    compression?: boolean;
  };
}
```

### Bootstrap Configuration
```typescript
interface BootstrapConfig {
  version: string;
  systemName: string;
  environment: 'development' | 'staging' | 'production';
  services: ServiceConfig[];
  global: {
    healthCheckInterval: number;
    serviceTimeout: number;
    maxRestartAttempts: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}
```

## 📚 Documentation

- [Integration Test Summary](./INTEGRATION_TEST_SUMMARY.md)
- [Phase 4 Integration Complete](./PHASE4_INTEGRATION_COMPLETE.md)
- [Module-specific READMEs](./sharedmodule/)
- [Pipeline Module Documentation](./sharedmodule/pipeline/README.md)
- [Server Module Documentation](./sharedmodule/server/README.md)
- [API Documentation](./docs/)
- [Configuration Guide](./docs/configuration/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Related Projects

- [rcc-virtual-model-rules](https://github.com/rcc/rcc-virtual-model-rules) - Virtual model routing rules
- [rcc-debugcenter](https://github.com/rcc/rcc-debugcenter) - Debug and monitoring tools

---

**Built with ❤️ using TypeScript and modern web technologies**