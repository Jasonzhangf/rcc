# OAuth2 Module

A simplified OAuth2 implementation that integrates with the error handling center for all recovery operations.

## Features

- **Simplified Architecture**: Clean separation of concerns with focused responsibilities
- **Error Handling Integration**: Uses ErrorHandlerCenter for all error recovery
- **No Built-in Polling**: External components manage polling logic
- **Simple Token Storage**: File-based storage without encryption
- **PKCE Support**: Optional PKCE (Proof Key for Code Exchange) for enhanced security
- **Message-based Communication**: Integrates with the BaseModule messaging system
- **Comprehensive Error Handling**: Handles all OAuth2 error scenarios

## Installation

```bash
npm install
```

## Quick Start

```typescript
import { createOAuth2Module, quickStartOAuth2 } from './src/modules/oauth2';

const config = {
  clientId: 'your-client-id',
  scope: 'openid profile email',
  deviceAuthEndpoint: 'https://auth.example.com/device/code',
  tokenEndpoint: 'https://auth.example.com/token',
  tokenStoragePath: './tokens/',
  enablePKCE: true
};

// Quick start with automatic cleanup
const { oauth2Module, cleanup } = await quickStartOAuth2(config);

try {
  // Use the OAuth2 module
  const deviceAuth = await oauth2Module.initiateDeviceAuthorization();
  console.log('Authorize at:', deviceAuth.verification_uri_complete);
  
  // External component handles polling...
  
} finally {
  await cleanup();
}
```

## Basic Usage

### 1. Module Initialization

```typescript
import { OAuth2Module } from './src/modules/oauth2';
import { ErrorHandlerCenter } from 'sharedmodule/pipeline';
import { PipelineConfigManager } from 'sharedmodule/pipeline';

// Create dependencies
const errorHandlerCenter = new ErrorHandlerCenter(new PipelineConfigManager());
await errorHandlerCenter.initialize();

// Create OAuth2 module
const oauth2Module = new OAuth2Module(config, errorHandlerCenter);
await oauth2Module.initialize();
```

### 2. Device Authorization Flow

```typescript
// Initiate device authorization
const deviceAuth = await oauth2Module.initiateDeviceAuthorization();

console.log('Please authorize the application:');
console.log(`Visit: ${deviceAuth.verification_uri_complete}`);
console.log(`Enter code: ${deviceAuth.user_code}`);

// External component handles polling for token
```

### 3. Token Management

```typescript
// Check token status
const tokenStatus = oauth2Module.getTokenStatus();
console.log('Token status:', tokenStatus);

// Get current token
const currentToken = oauth2Module.getCurrentToken();
if (currentToken) {
  console.log('Access token:', currentToken.accessToken);
}

// Invalidate token
oauth2Module.invalidateToken();
```

### 4. Token Storage

```typescript
// Save token for user
await oauth2Module.saveTokenForEmail('user@example.com', tokenData);

// Load token for user
const token = await oauth2Module.loadTokenForEmail('user@example.com');
```

### 5. Message-based Communication

```typescript
// Get token status via message
const response = await oauth2Module.sendMessage('get_token_status', {});
console.log('Token status:', response.data);

// Get statistics
const statsResponse = await oauth2Module.sendMessage('get_oauth2_stats', {});
console.log('Statistics:', statsResponse.data);
```

## Architecture

### Core Components

1. **OAuth2Module**: Main authentication logic
2. **TokenStorage**: Simple file-based token storage
3. **ErrorHandlerCenter**: Manages all error recovery

### Responsibilities

#### OAuth2Module
- Device authorization flow initiation
- Token request handling
- Token refresh logic
- Status reporting
- Error handling integration

#### TokenStorage
- Save tokens to files (plain text)
- Load tokens from files
- Delete tokens
- List stored tokens

#### ErrorHandlerCenter
- Handle all authentication errors
- Manage retry policies
- Handle token refresh failures
- Provide recovery strategies

### Error Handling

The OAuth2 module integrates with the ErrorHandlerCenter to handle all error scenarios:

- **Token expiration**: Automatic refresh attempts
- **Authentication failures**: Maintenance mode
- **Network errors**: Retry policies
- **Configuration errors**: Immediate failure

## Configuration

### OAuth2ModuleConfig

```typescript
interface OAuth2ModuleConfig {
  clientId: string;                    // OAuth client ID
  scope: string;                       // OAuth scope
  deviceAuthEndpoint: string;          // Device authorization endpoint
  tokenEndpoint: string;               // Token endpoint
  tokenStoragePath: string;            // Token storage directory
  enablePKCE?: boolean;                // Enable PKCE (default: true)
}
```

### Example Configuration

```typescript
const config: OAuth2ModuleConfig = {
  clientId: 'your-client-id',
  scope: 'openid profile email model.completion',
  deviceAuthEndpoint: 'https://auth.example.com/oauth2/device/code',
  tokenEndpoint: 'https://auth.example.com/oauth2/token',
  tokenStoragePath: './auth/tokens/',
  enablePKCE: true
};
```

## API Reference

### OAuth2Module

#### Methods

- `initialize()`: Initialize the module
- `initiateDeviceAuthorization()`: Start device authorization flow
- `requestToken(deviceCode, codeVerifier?)`: Request token with device code
- `refreshToken(refreshToken)`: Refresh access token
- `getTokenStatus()`: Get current token status
- `getCurrentToken()`: Get current token data
- `invalidateToken()`: Invalidate current token
- `saveTokenForEmail(email, tokenData)`: Save token for user
- `loadTokenForEmail(email)`: Load token for user
- `getStats()`: Get OAuth2 statistics
- `destroy()`: Clean up resources

#### Messages

- `get_token_status`: Get current token status
- `get_current_token`: Get current token data
- `invalidate_token`: Invalidate current token
- `get_oauth2_stats`: Get OAuth2 statistics
- `initiate_device_auth`: Initiate device authorization

### TokenStorage

#### Methods

- `saveToken(email, tokenData)`: Save token for email
- `loadToken(email)`: Load token for email
- `deleteToken(email)`: Delete token for email
- `listStoredEmails()`: List all stored emails
- `hasToken(email)`: Check if token exists for email
- `clearAllTokens()`: Clear all stored tokens
- `getStorageStats()`: Get storage statistics

## Error Handling

### OAuth2 Error Codes

The module handles various OAuth2 error scenarios:

- `DEVICE_CODE_EXPIRED`: Device code has expired
- `AUTHORIZATION_PENDING`: Authorization is pending
- `SLOW_DOWN`: Request polling to slow down
- `ACCESS_DENIED`: User denied authorization
- `INVALID_CLIENT`: Invalid client credentials
- `AUTH_SERVER_ERROR`: Authentication server error
- `TOKEN_REFRESH_FAILED`: Token refresh failed
- `TOKEN_STORAGE_FAILED`: Token storage failed

### Error Recovery

The module integrates with ErrorHandlerCenter for automatic recovery:

1. **Token Expiration**: Attempts automatic refresh
2. **Authentication Failure**: Enters maintenance mode
3. **Network Errors**: Uses retry policies
4. **Configuration Errors**: Immediate failure

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- OAuth2Module.test.ts
```

## Examples

See the `examples/` directory for complete usage examples:

- `OAuth2UsageExamples.ts`: Comprehensive usage examples
- Basic OAuth2 flow
- Token management
- Error handling integration
- Message-based communication

## File Structure

```
src/modules/oauth2/
├── OAuth2Module.ts              # Main OAuth2 module
├── TokenStorage.ts              # Token storage implementation
├── OAuth2Types.ts               # Type definitions
├── OAuth2Constants.ts           # Constants and mappings
├── index.ts                     # Module exports
├── examples/
│   └── OAuth2UsageExamples.ts   # Usage examples
└── __tests__/
    └── OAuth2Module.test.ts     # Unit tests
```

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure all tests pass

## License

MIT License - see LICENSE file for details.

## Migration from Original Implementation

The refactored implementation removes several features for simplicity:

### Removed Features
- **Built-in polling**: External components now handle polling
- **Encryption**: Tokens stored as plain text
- **Complex state management**: Simplified state model
- **Retry logic**: All retries handled by ErrorHandlerCenter

### Added Features
- **Error handling integration**: Seamless ErrorHandlerCenter integration
- **Clean interfaces**: Simple, focused APIs
- **External polling flexibility**: Any component can manage polling
- **Better testability**: Easier to test and maintain

### Migration Steps
1. Extract polling logic to external component
2. Remove encryption from token storage
3. Integrate with ErrorHandlerCenter for error recovery
4. Simplify state management in OAuth2Module
5. Update tests to reflect new architecture