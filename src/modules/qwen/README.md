# Qwen Provider Module

RCC Qwen Provider Module - A standalone module for integrating with Qwen AI services.

## Overview

This module provides comprehensive Qwen AI service integration including:
- OAuth2 authentication with device flow
- Token management and refresh
- OpenAI-compatible API interface
- Debug logging and metrics

## Installation

```bash
npm install rcc-qwen-provider
```

## Usage

```typescript
import { QwenProviderModule } from 'rcc-qwen-provider';

const config = {
  provider: 'qwen',
  endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
  auth: {
    type: 'qwen',
    accessTokenFile: './tokens/qwen-access.json',
    refreshTokenFile: './tokens/qwen-refresh.json',
    deviceFlow: {
      enabled: true,
      clientId: 'your_client_id',
      scope: 'your_scope',
      pkce: true,
      authEndpoint: 'https://dashscope.aliyuncs.com/api/v1/oauth2/device',
      tokenEndpoint: 'https://dashscope.aliyuncs.com/api/v1/oauth2/token'
    }
  },
  model: 'qwen-turbo',
  debug: {
    enabled: true,
    logLevel: 'debug'
  }
};

const module = new QwenProviderModule(moduleInfo);
await module.configure(config);
await module.initialize();

// Start device authorization
const deviceAuth = await module.startDeviceAuthorization();
console.log('Visit:', deviceAuth.verification_uri);
console.log('Enter code:', deviceAuth.user_code);

// After authorization, make requests
const response = await module.processRequest({
  model: 'qwen-turbo',
  messages: [
    { role: 'user', content: 'Hello, Qwen!' }
  ]
});
```

## Features

- **OAuth2 Device Flow**: Complete OAuth2 authentication implementation
- **Token Management**: Automatic token refresh and storage
- **OpenAI Compatible**: Standard OpenAI API interface
- **Debug Logging**: Comprehensive logging and metrics
- **Error Handling**: Robust error handling and recovery

## Configuration

See `src/types/QwenProviderConfig.ts` for detailed configuration options.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm test

# Lint
npm run lint
```

## License

MIT