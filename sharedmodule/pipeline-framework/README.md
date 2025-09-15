# OpenAI Compatible Providers Framework

A comprehensive framework for OpenAI-compatible providers with advanced debug logging capabilities.

## Features

- **Debug Logging System**: Comprehensive request/response logging with configurable paths
- **Request Tracking**: Unique request IDs for tracking individual request-response pairs
- **Pipeline Logging**: Complete request lifecycle tracking
- **Error Isolation**: Separate logging for failed requests
- **Multi-level Logging**: Support for debug, info, warn, and error levels

## Installation

```bash
npm install openai-compatible-providers-framework
```

## Quick Start

### Basic Usage

```javascript
const { SimpleDebugLogManager, DEFAULT_DEBUG_CONFIG } = require('openai-compatible-providers-framework');

// Initialize debug logging
const debugManager = new SimpleDebugLogManager({
  ...DEFAULT_DEBUG_CONFIG,
  enabled: true,
  baseDirectory: './logs',
  logLevel: 'debug'
});

// Start tracking a request
const context = debugManager.startRequest('MyProvider', 'chat', {
  model: 'gpt-3.5-turbo'
});

// Log successful request
const request = { messages: [{ role: 'user', content: 'Hello' }] };
const response = { content: 'Hello there!', model: 'gpt-3.5-turbo' };

await debugManager.logSuccess(context, request, response);

// Get statistics
const stats = await debugManager.getDebugStatistics();
console.log('System health:', stats.systemHealth.status);
```

### Advanced Configuration

```javascript
const config = {
  enabled: true,
  baseDirectory: './production-logs',
  logLevel: 'info',
  paths: {
    requests: 'requests',
    responses: 'responses',
    errors: 'errors',
    pipeline: 'pipeline',
    system: 'system'
  },
  contentFiltering: {
    enabled: true,
    sensitiveFields: ['apiKey', 'password', 'token']
  }
};

const debugManager = new SimpleDebugLogManager(config);
```

## API Reference

### SimpleDebugLogManager

#### Constructor
```javascript
new SimpleDebugLogManager(config: DebugConfig)
```

#### Methods
- `startRequest(provider: string, operation: string, metadata?: any)` - Start tracking a request
- `logSuccess(context: RequestContext, request: any, response: any)` - Log successful request
- `logError(context: RequestContext, request: any, error: Error)` - Log failed request
- `info(message: string)` - Log info message
- `warn(message: string)` - Log warning message
- `error(message: string)` - Log error message
- `getDebugStatistics()` - Get debug statistics
- `destroy()` - Clean up resources

### DebugConfig

```typescript
interface DebugConfig {
  enabled: boolean;
  baseDirectory: string;
  paths: {
    requests: string;
    responses: string;
    errors: string;
    pipeline: string;
    system: string;
  };
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'silent';
  contentFiltering: {
    enabled: boolean;
    sensitiveFields: string[];
  };
  maxLogFiles: number;
  maxLogSize: string;
}
```

## License

MIT