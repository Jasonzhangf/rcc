# ProvidersManager

A configuration submodule that handles all provider-related operations including CRUD operations, API testing, model management, and provider pool management. This module was extracted from the monolithic server architecture to provide better modularity and API isolation.

## Overview

The ProvidersManager is a submodule of the Configuration system that manages provider configurations, supports multiple API protocols (OpenAI, Anthropic, Gemini), handles API key management, and provides comprehensive provider testing capabilities.

## Features

- **Provider CRUD Operations**: Create, Read, Update, Delete providers
- **Multi-Protocol Support**: OpenAI, Anthropic, and Gemini API protocols
- **API Key Management**: Support for multiple API keys per provider with deduplication
- **Provider Testing**: Real API connectivity testing with detailed results
- **Model Management**: Fetch, verify, and manage provider models
- **Provider Pool**: Add provider-model combinations to routing pools
- **Model Blacklisting**: Blacklist problematic models with reasons
- **Token Detection**: Auto-detect model token limits
- **API Isolation**: Secure proxy-based access control
- **Configuration Integration**: Seamless integration with ConfigManager

## Architecture

### Class Hierarchy
```
BaseModule (Core)
└── ProvidersManager
    ├── implements IConfigurationSubmodule
    ├── implements IRouteHandler  
    └── implements IProvidersManager
```

### Key Interfaces
- **IConfigurationSubmodule**: Configuration system integration
- **IRouteHandler**: API request routing and handling
- **IProvidersManager**: Provider management operations

## API Endpoints

### Provider CRUD Operations

#### Get All Providers
```http
GET /api/providers
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "provider-1",
      "name": "OpenAI Provider",
      "protocol": "openai",
      "api_base_url": "https://api.openai.com",
      "api_key": ["sk-..."],
      "auth_type": "api_key",
      "models": []
    }
  ],
  "timestamp": 1699123456789
}
```

#### Get Specific Provider
```http
GET /api/providers/:id
```
**Parameters:**
- `id`: Provider ID or name (URL encoded for special characters)

#### Add New Provider
```http
POST /api/providers
Content-Type: application/json

{
  "name": "My Provider",
  "protocol": "openai",
  "api_base_url": "https://api.openai.com",
  "api_key": ["sk-..."],
  "auth_type": "api_key",
  "models": []
}
```

#### Update Provider
```http
PUT /api/providers/:id
Content-Type: application/json

{
  "name": "Updated Provider Name",
  "protocol": "anthropic",
  "api_base_url": "https://api.anthropic.com",
  "api_key": ["sk-ant-..."],
  "auth_type": "api_key"
}
```

#### Delete Provider
```http
DELETE /api/providers/:id
```

### Provider Testing

#### Test Provider Connection
```http
POST /api/providers/:id/test
Content-Type: application/json

{
  "api_key": "sk-...",
  "testAllKeys": false
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "provider": "OpenAI Provider",
    "testResults": [
      {
        "api_key": "sk-...***",
        "success": true,
        "statusCode": 200,
        "responseTime": 1250,
        "message": "Connection successful. Found 25 models",
        "timestamp": 1699123456789,
        "models": ["gpt-4", "gpt-3.5-turbo", "..."]
      }
    ],
    "summary": {
      "total": 1,
      "successful": 1,
      "failed": 0
    }
  }
}
```

### Model Management

#### Get Provider Models
```http
POST /api/providers/:id/models
Content-Type: application/json

{
  "api_key": "sk-...",
  "forceRefresh": true
}
```

#### Verify Model
```http
POST /api/providers/:id/verify-model
Content-Type: application/json

{
  "modelId": "gpt-4",
  "api_key": "sk-..."
}
```

#### Detect Model Tokens
```http
POST /api/providers/:id/detect-tokens
Content-Type: application/json

{
  "modelId": "gpt-4",
  "api_key": "sk-...",
  "testPrompt": "Custom test prompt"
}
```

#### Blacklist Model
```http
POST /api/providers/:id/blacklist-model
Content-Type: application/json

{
  "modelId": "problematic-model",
  "reason": "Rate limits too aggressive"
}
```

#### Add to Provider Pool
```http
POST /api/providers/:id/add-to-pool
Content-Type: application/json

{
  "modelId": "gpt-4",
  "priority": 100
}
```

## Configuration

### Supported Protocols
- **openai**: OpenAI API compatible endpoints
- **anthropic**: Anthropic Claude API
- **gemini**: Google Gemini API

### Authentication Types
- **api_key**: API key based authentication
- **oauth**: OAuth token authentication  
- **bearer**: Bearer token authentication

### Provider Data Structure
```typescript
interface IProvider {
  id: string;
  name: string;
  protocol: 'openai' | 'anthropic' | 'gemini';
  api_base_url: string;
  api_key: string[] | string;
  auth_type: 'api_key' | 'oauth' | 'bearer';
  models: IModel[];
  model_blacklist?: string[];
  provider_pool?: string[];
}
```

### Model Data Structure
```typescript
interface IModel {
  id: string;
  name: string;
  max_tokens: number;
  description: string;
  status: string;
  verified: boolean;
  auto_detected_tokens?: number | null;
  blacklisted: boolean;
  blacklist_reason?: string | null;
  manual_override: boolean;
  created_at: string;
  updated_at: string;
  last_verification?: string;
}
```

## Usage Examples

### TypeScript Integration

```typescript
import { ProvidersManager } from './src/ProvidersManager';
import { ModuleInfo } from '../../../interfaces/ModuleInfo';

// Create module info
const moduleInfo: ModuleInfo = {
  id: 'providers-manager',
  name: 'ProvidersManager',
  version: '1.0.0',
  description: 'Provider management submodule',
  type: 'configuration-submodule'
};

// Initialize ProvidersManager
const providersManager = new ProvidersManager(moduleInfo);
await providersManager.initialize(configManager);

// Add a new provider
const result = await providersManager.addProvider({
  name: 'My OpenAI Provider',
  protocol: 'openai',
  api_base_url: 'https://api.openai.com',
  api_key: ['sk-your-api-key-here'],
  auth_type: 'api_key'
});

console.log('Provider added:', result.success);
```

### API Integration

```typescript
// Register with ApiRouter
apiRouter.registerHandler('providers', providersManager);

// Handle requests
const response = await providersManager.handle(
  ['providers', 'my-provider', 'test'], 
  'POST', 
  JSON.stringify({ testAllKeys: true })
);
```

## Error Handling

### Common Error Codes
- **400**: Bad Request - Invalid data or JSON format
- **401**: Unauthorized - Authentication failed
- **404**: Not Found - Provider not found
- **409**: Conflict - Provider name already exists
- **429**: Rate Limit - API rate limit exceeded
- **500**: Internal Server Error - Unexpected error

### Error Response Format
```json
{
  "success": false,
  "error": "Provider name already exists",
  "statusCode": 409,
  "timestamp": 1699123456789
}
```

## Testing

### API Testing Features
- **Real API Connectivity**: Tests actual API endpoints
- **Multiple Key Testing**: Test all API keys for a provider
- **Protocol-Specific Testing**: Custom test endpoints per protocol
- **Response Time Monitoring**: Track API response times
- **Model Discovery**: Automatic model list detection
- **Error Classification**: Detailed error categorization

### Test Results Structure
```typescript
interface IProviderTestResult {
  api_key: string;           // Masked API key
  success: boolean;          // Test success status
  statusCode: number;        // HTTP status code
  responseTime: number;      // Response time in ms
  message: string;           // Human-readable message
  timestamp: number;         // Test timestamp
  models?: string[];         // Discovered models
}
```

## Security Features

### API Isolation
- Proxy-based access control
- Method and property restrictions
- Internal operation protection
- Secure configuration handling

### Data Protection
- API key masking in logs and responses
- Sensitive data filtering
- Secure HTTP connections with timeout
- Certificate validation bypass for testing

### Input Validation
- Comprehensive data validation
- Protocol-specific validation rules
- URL format validation
- API key format checking
- Anti-injection protection

## Performance Considerations

### Batch Operations
- Maximum concurrent tests: 5
- Maximum concurrent model fetches: 3
- Batch processing size: 10 items
- Request timeout: 10 seconds

### Caching Strategy
- Configuration caching
- Model list caching
- Test result caching
- Backup creation before updates

## Integration

### ConfigManager Integration
```typescript
// Initialize with ConfigManager
await providersManager.initialize(configManager);

// Handle configuration updates
await providersManager.onConfigUpdate(newConfigData);

// Validate configuration
const isValid = providersManager.validateConfig(configData);
```

### ApiRouter Integration
```typescript
// Register route handler
apiRouter.registerHandler('providers', providersManager);

// Routes automatically handled:
// GET    /api/providers
// GET    /api/providers/:id  
// POST   /api/providers
// POST   /api/providers/:id/test
// PUT    /api/providers/:id
// DELETE /api/providers/:id
```

## Constants and Configuration

All configuration values are defined in `ProvidersManager.constants.ts` to enforce the anti-hardcoding policy:

```typescript
PROVIDERS_MANAGER_CONSTANTS = {
  API_TEST: {
    TIMEOUT_MS: 10000,
    USER_AGENT: 'RCC-Multi-Key-Manager/1.0',
    OPENAI_TEST_ENDPOINT: '/models',
    ANTHROPIC_TEST_ENDPOINT: '/messages',
    GEMINI_TEST_ENDPOINT: '/models'
  },
  VALIDATION: {
    SUPPORTED_PROTOCOLS: ['openai', 'anthropic', 'gemini'],
    SUPPORTED_AUTH_TYPES: ['api_key', 'oauth', 'bearer']
  }
}
```

## Logging and Monitoring

### Log Prefix
All log messages use the prefix `🏭 [ProvidersManager]` for easy identification.

### Log Levels
- **Info**: Successful operations, provider additions/updates
- **Warn**: Validation warnings, deprecated features
- **Error**: API failures, configuration errors
- **Debug**: Detailed request/response data

### Monitoring Metrics
- Provider test success rates
- API response times
- Configuration update frequency
- Error frequency by type

## Migration from Monolithic Server

This module extracts the following methods from the original monolithic server:
- `handleProvidersAPI()` → `handle()`
- `testProvider()` → `testProvider()`
- `performRealApiTest()` → `performRealApiTest()`
- `updateProvider()` → `updateProvider()`
- `deleteProvider()` → `deleteProvider()`
- `addProvider()` → `addProvider()`
- `validateProviderData()` → `validateProviderData()`
- Various helper methods for URL processing and API testing

## Contributing

When contributing to the ProvidersManager:

1. **Follow the anti-hardcoding policy**: All constants must be in the constants file
2. **Maintain 100% API compatibility**: Existing endpoints must work unchanged
3. **Add comprehensive tests**: All new features require full test coverage
4. **Update documentation**: Keep README and API docs current
5. **Follow TypeScript strict mode**: Maintain type safety
6. **Handle errors gracefully**: Provide meaningful error messages

## License

This module is part of the RCC project and follows the project's licensing terms.