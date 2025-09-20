# Bootstrap Service Pipeline Integration Guide

## Overview

This document describes the complete integration between the Bootstrap Service, Pipeline System, and Server Module in the RCC (Route Claude Code) system.

## Architecture

The integration follows this flow:

```
Bootstrap Service
    ↓
1. Initialize Pipeline System Components
   - PipelineTracker (for request tracking)
   - PipelineAssembler (for pipeline creation)
   - VirtualModelSchedulerManager (for request routing)
    ↓
2. Load Configuration
   - Parse rcc-config.json
   - Generate pipeline table
   - Discover providers and virtual models
    ↓
3. Assemble Pipeline Pools
   - Create pipelines for each virtual model
   - Initialize pipeline pools with routing capabilities
   - Pass pools to VirtualModelSchedulerManager
    ↓
4. Initialize Server Module
   - Configure HTTP server settings
   - Connect server to VirtualModelSchedulerManager
   - Enable pipeline-based request routing
    ↓
5. System Ready for Requests
   - HTTP server accepts requests
   - Server forwards to VirtualModelSchedulerManager
   - Scheduler routes requests through appropriate pipelines
```

## Key Components

### 1. BootstrapService (Core Orchestrator)

**File**: `/sharedmodule/bootstrap/src/core/BootstrapService.ts`

**Responsibilities**:
- System initialization and coordination
- Pipeline system component lifecycle management
- Configuration loading and validation
- Service orchestration (server module startup/shutdown)
- Health monitoring and metrics collection

**New Features**:
- `initializePipelineSystem()`: Creates and connects pipeline components
- Enhanced `getSystemStatus()`: Includes pipeline system health
- Graceful shutdown with pipeline cleanup
- Integration methods for server-pipeline connection

### 2. PipelineAssembler (Factory Pattern)

**File**: `/sharedmodule/pipeline/src/framework/PipelineAssembler.ts`

**Responsibilities**:
- Pipeline pool creation from configuration
- Provider discovery and validation
- Virtual model to pipeline mapping
- Configuration integration with rcc-config-parser
- Routing capabilities generation

**Key Methods**:
- `assemblePipelines()`: Main assembly orchestration
- `loadFromPipelineTable()`: Configuration-driven assembly
- `setVirtualModelScheduler()`: Scheduler integration

### 3. VirtualModelSchedulerManager (Request Router)

**File**: `/sharedmodule/pipeline/src/framework/VirtualModelSchedulerManager.ts`

**Responsibilities**:
- Pipeline pool management and lifecycle
- Request routing and load balancing
- Smart routing with analysis and decision making
- Health monitoring and metrics collection
- Fallback strategies for error handling

**Key Features**:
- `initialize()`: Pipeline pool registration
- `handleRequest()`: Main routing entry point
- Smart routing with `RequestAnalyzer` and `RoutingRulesEngine`
- Health checks and metrics tracking

### 4. ServerModule (HTTP Layer)

**File**: `/sharedmodule/server/src/ServerModule.ts`

**Responsibilities**:
- HTTP server management
- Request forwarding to pipeline system
- Virtual model routing integration
- Authentication and security

**Integration Points**:
- `setVirtualModelSchedulerManager()`: Connect to pipeline routing
- Request forwarding to scheduler for processing

## Integration Flow

### Phase 1: Bootstrap Initialization

```typescript
// BootstrapService constructor
constructor() {
  super(moduleInfo);
  this.initializePipelineSystem(); // New pipeline system initialization
}

private initializePipelineSystem(): void {
  // 1. Create PipelineTracker for request tracking
  this.pipelineTracker = new PipelineTracker(config);

  // 2. Create PipelineAssembler with configuration
  this.pipelineAssembler = new PipelineAssembler(assemblerConfig, this.pipelineTracker);

  // 3. Create VirtualModelSchedulerManager
  this.virtualModelScheduler = new VirtualModelSchedulerManager(managerConfig, this.pipelineTracker);

  // 4. Connect assembler to scheduler
  this.pipelineAssembler.setVirtualModelScheduler(this.virtualModelScheduler);
}
```

### Phase 2: Configuration Loading

```typescript
// During bootstrap.configure()
async configure(config: ExtendedBootstrapConfig): Promise<void> {
  // Load and parse configuration
  await this.configurationSystem.loadConfig(configPath);
  const currentConfig = await this.configurationSystem.getCurrentConfig();

  // Generate pipeline table from configuration
  await this.configurationSystem.generatePipelineTable(currentConfig);
  const pipelineTable = this.configurationSystem.getPipelineTable();
}
```

### Phase 3: Pipeline Assembly

```typescript
// During bootstrap.start()
async start(): Promise<void> {
  // Initialize pipeline system with loaded configuration
  if (this.pipelineAssembler && this.virtualModelScheduler) {
    const assemblyResult = await this.pipelineAssembler.assemblePipelines();

    if (assemblyResult.success) {
      // Store pipeline pools locally
      this.pipelinePools = assemblyResult.pipelinePools;

      // Initialize virtual model scheduler with pipeline pools
      this.virtualModelScheduler.initialize(assemblyResult.pipelinePools);
    }
  }
}
```

### Phase 4: Server Integration

```typescript
// During server initialization
const serverModule = new ServerModule();
await serverModule.configure(serverConfig);

// Connect server to virtual model scheduler for pipeline routing
if (this.virtualModelScheduler && serverModule.setVirtualModelSchedulerManager) {
  serverModule.setVirtualModelSchedulerManager(this.virtualModelScheduler);
}

await serverModule.initialize();
await serverModule.start();
```

### Phase 5: Request Processing

```
HTTP Request → ServerModule → VirtualModelSchedulerManager → PipelinePool → Provider → Response
```

## Configuration

### Required Configuration File: `~/.rcc/rcc-config.json`

```json
{
  "providers": {
    "lmstudio": {
      "id": "lmstudio",
      "name": "LM Studio Local Provider",
      "baseUrl": "http://localhost:1234",
      "apiKey": "lm-studio-key",
      "models": ["llama-2-7b", "mistral-7b"]
    }
  },
  "virtualModels": {
    "claude-code": {
      "id": "claude-code",
      "name": "Claude Code Assistant",
      "modelId": "claude-3-sonnet-20240229",
      "providerId": "lmstudio",
      "capabilities": ["chat", "tools", "function-calling"],
      "targets": [
        {
          "providerId": "lmstudio",
          "modelId": "llama-2-7b",
          "weight": 1,
          "enabled": true
        }
      ]
    }
  }
}
```

## Health Monitoring

### System Status

```typescript
interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  totalServices: number;
  runningServices: number;
  failedServices: number;
  pipelineSystem?: {
    status: 'not_initialized' | 'initializing' | 'initialized' | 'error';
    pools: number;
    healthy: boolean;
    assembler: boolean;
    scheduler: boolean;
    tracker: boolean;
  };
}
```

### Pipeline Metrics

```typescript
// PipelineAssembler status
{
  initialized: boolean;
  totalPools: number;
  totalPipelines: number;
  healthyPools: number;
  discoveredProviders: number;
  routingEnabled: boolean;
  schedulerInitialized: boolean;
  configModuleIntegration: {
    enabled: boolean;
    configLoaded: boolean;
    pipelineTableGenerated: boolean;
  };
}

// VirtualModelSchedulerManager metrics
{
  totalSchedulers: number;
  activeSchedulers: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  overallErrorRate: number;
}
```

## Error Handling

### Common Error Scenarios

1. **Configuration Loading Failed**
   - Fallback to default pipeline configuration
   - Log warning and continue with basic functionality

2. **Pipeline Assembly Failed**
   - Use fallback strategy (first available provider)
   - Log errors but continue system startup

3. **Scheduler Initialization Failed**
   - Disable smart routing, use simple round-robin
   - Maintain basic request forwarding capability

4. **Server Integration Failed**
   - Log integration error
   - Continue with server in standalone mode

### Graceful Degradation

The system is designed to degrade gracefully when components fail:

- **Without pipeline system**: Server operates in basic HTTP mode
- **Without smart routing**: Uses simple round-robin load balancing
- **Without configuration**: Uses default provider settings
- **Without health monitoring**: Basic functionality continues

## Testing

### Integration Test Script

Run the integration test:

```bash
cd /Users/fanzhang/Documents/github/rcc
node test-bootstrap-pipeline-integration.mjs
```

### Test Coverage

1. **Pipeline System Initialization**
   - Component creation and connection
   - Configuration loading and parsing
   - Pipeline pool assembly

2. **Server Integration**
   - VirtualModelSchedulerManager connection
   - Request forwarding setup
   - Health monitoring

3. **Request Processing**
   - HTTP request routing
   - Pipeline execution
   - Response handling

4. **Error Scenarios**
   - Configuration failures
   - Component unavailability
   - Graceful degradation

## Performance Considerations

### Memory Usage
- Pipeline pools are created once and reused
- Component lifecycle managed by BootstrapService
- Cleanup on system shutdown

### Request Latency
- Smart routing adds minimal overhead (~5-10ms)
- Pipeline pool selection is O(1) operation
- Health checks run asynchronously

### Scalability
- Pipeline pools support multiple providers per virtual model
- Scheduler can handle concurrent requests
- Load balancing across multiple pipeline instances

## Future Enhancements

1. **Dynamic Pipeline Management**
   - Hot-reload pipeline configurations
   - Runtime pool scaling
   - Provider health monitoring

2. **Advanced Routing**
   - ML-based request analysis
   - Context-aware routing decisions
   - Performance-based load balancing

3. **Monitoring and Observability**
   - Distributed tracing
   - Metrics export to Prometheus
   - Alerting and notifications

4. **Security Enhancements**
   - Request validation and sanitization
   - Rate limiting and throttling
   - Audit logging

## Troubleshooting

### Common Issues

1. **Pipeline system not initializing**
   - Check rcc-config.json exists and is valid
   - Verify rcc-config-parser module is installed
   - Check for missing dependencies

2. **Server not connecting to scheduler**
   - Verify setVirtualModelSchedulerManager method exists
   - Check server module compatibility
   - Review integration logs

3. **Request routing failures**
   - Check pipeline pool initialization
   - Verify virtual model configurations
   - Review provider availability

### Debug Logging

Enable debug logging:

```typescript
const config = {
  enableTwoPhaseDebug: true,
  debugBaseDirectory: './debug-logs'
};
```

Check logs in:
- `./debug-logs/` directory
- Console output with timestamps
- Pipeline tracking information

This integration provides a robust, scalable foundation for the RCC system with comprehensive pipeline management and intelligent request routing capabilities.