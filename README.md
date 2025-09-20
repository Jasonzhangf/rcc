# RCC (Route Claude Code)

A modular TypeScript framework for building AI-powered applications with advanced routing and service orchestration capabilities.

## 🚀 Overview

RCC is a comprehensive system designed to facilitate the development of AI applications through a modular architecture. It provides:

- **Modular Design**: Pluggable components for maximum flexibility
- **Virtual Model Routing**: Intelligent request routing to optimal AI models
- **Service Orchestration**: Bootstrap-based service management and coordination
- **Pipeline Architecture**: Workflows and task automation
- **TypeScript Support**: Full type safety and modern development experience

## 📦 Core Modules

### 1. rcc-basemodule
**Foundation module providing core infrastructure**
- Modular architecture with BaseModule class
- Message center for inter-module communication
- Lifecycle management and configuration system
- Debug and logging capabilities

### 2. rcc-server
**HTTP server with virtual model routing**
- Pure forwarding architecture (v3.0)
- Virtual model routing integration
- Request forwarding with intelligent prioritization
- RESTful API support with Express.js

### 3. rcc-pipeline
**Workflow and task automation system**
- Pipeline assembly and pool management
- Task scheduling and execution
- Virtual model scheduler integration
- Error handling and recovery mechanisms

### 4. rcc-bootstrap
**Service initialization and coordination**
- Service lifecycle management
- Health monitoring and metrics collection
- Coordinated startup and shutdown sequences
- Configuration management and validation

### 5. rcc-errorhandling
**Comprehensive error management**
- Error classification and management
- Recovery strategies and logging
- Integration with debug systems

## ✨ Key Features

### Virtual Model Routing
- Intelligent request analysis and model selection
- Fallback mechanisms for reliability
- Performance optimization through load balancing
- Support for multiple AI providers

### Service Orchestration
- Automatic service discovery and registration
- Health monitoring and automatic recovery
- Graceful shutdown and resource cleanup
- Dependency resolution and ordering

### Pipeline Architecture
- Modular workflow design
- Task parallelization and optimization
- Event-driven execution
- Comprehensive monitoring and logging

## 🛠️ Installation

```bash
# Install individual modules
npm install rcc-basemodule
npm install rcc-server
npm install rcc-pipeline
npm install rcc-bootstrap
npm install rcc-errorhandling
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

### Virtual Model Routing

```typescript
import { VirtualModelSchedulerManager } from 'rcc-pipeline';

// Connect virtual model scheduler to server
server.setVirtualModelSchedulerManager(schedulerManager);

// Requests will be automatically routed to optimal models
```

## 🧪 Integration Testing

The system includes comprehensive integration tests that verify module interoperability:

```bash
# Run integration test
node test-integration.mjs
```

**Test Coverage:**
- ✅ Module import and dependency resolution
- ✅ Service lifecycle management
- ✅ Health monitoring and state tracking
- ✅ Virtual model routing integration
- ✅ Configuration validation and error handling

## 📊 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Bootstrap    │    │     Server      │    │    Pipeline     │
│   Service      │◄──►│     Module      │◄──►│     System      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   BaseModule    │
                    │   Framework     │
                    └─────────────────┘
```

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
- [Module-specific READMEs](./sharedmodule/)
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