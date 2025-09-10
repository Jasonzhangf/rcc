# OAuth2 Implementation Plan - Refactored

## Overview

This plan describes a simplified OAuth2 implementation that focuses on basic token management and integrates with the error handling center for all recovery operations.

## Core Philosophy

1. **Remove Polling Logic**: The OAuth2 module should not manage polling - this should be handled externally
2. **Remove Encryption/Decryption**: Simple token storage without encryption for this implementation
3. **Remove Retry Logic**: All retries should be handled through the error handling center
4. **Clean Separation of Concerns**: Each component has a single responsibility

## Simplified Architecture

### Core Components

1. **OAuth2Module**: Basic OAuth2 token management
2. **TokenStorage**: Simple file-based token storage (no encryption)
3. **Error Handling Integration**: Uses ErrorHandlerCenter for all recovery operations

### Component Responsibilities

#### OAuth2Module
- Device authorization flow initiation
- Token request handling
- Token refresh logic
- Status reporting
- **NOT** responsible for polling, retry, or encryption

#### TokenStorage
- Save tokens to files (plain text)
- Load tokens from files
- Delete tokens
- **NOT** responsible for encryption or security

#### ErrorHandlerCenter Integration
- Handle all authentication errors
- Manage retry policies
- Handle token refresh failures
- Provide recovery strategies

## Implementation Details

### OAuth2Module Interface

```typescript
interface OAuth2ModuleConfig {
  clientId: string;
  scope: string;
  deviceAuthEndpoint: string;
  tokenEndpoint: string;
  tokenStoragePath: string;
  enablePKCE?: boolean;
}

interface DeviceAuthorizationResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

interface TokenData {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresAt: number;
  scope: string;
}

class OAuth2Module extends BaseModule {
  constructor(config: OAuth2ModuleConfig, errorHandlerCenter: ErrorHandlerCenter);
  
  // Core OAuth2 operations
  async initiateDeviceAuthorization(): Promise<DeviceAuthorizationResponse>;
  async requestToken(deviceCode: string, codeVerifier?: string): Promise<TokenData>;
  async refreshToken(refreshToken: string): Promise<TokenData>;
  
  // Status and management
  getTokenStatus(): TokenStatus;
  getCurrentToken(): TokenData | null;
  invalidateToken(): void;
  
  // Error handling integration
  private handleAuthError(error: Error, context: any): Promise<ErrorHandlingAction>;
}
```

### TokenStorage Interface

```typescript
class TokenStorage {
  constructor(storagePath: string);
  
  async saveToken(email: string, tokenData: TokenData): Promise<void>;
  async loadToken(email: string): Promise<TokenData | null>;
  async deleteToken(email: string): Promise<void>;
  listStoredTokens(): string[];
}
```

### Error Handling Integration

```typescript
// Register custom error handlers with ErrorHandlerCenter
errorHandlerCenter.registerCustomHandler(
  PipelineErrorCode.TOKEN_EXPIRED,
  oauth2Module.handleTokenExpired.bind(oauth2Module)
);

errorHandlerCenter.registerCustomHandler(
  PipelineErrorCode.AUTHENTICATION_FAILED,
  oauth2Module.handleAuthFailed.bind(oauth2Module)
);
```

## Simplified Flow

### 1. Device Authorization
1. Module generates PKCE codes (if enabled)
2. Module requests device authorization
3. Module returns device code and verification URI
4. **External component handles polling**

### 2. Token Request
1. External component polls token endpoint
2. On success, OAuth2Module processes token response
3. Module stores token via TokenStorage
4. Module updates status

### 3. Token Refresh
1. Module detects token expiration
2. Module requests new token using refresh token
3. On success, update stored token
4. On failure, delegate to ErrorHandlerCenter

### 4. Error Handling
1. Any authentication error is routed to ErrorHandlerCenter
2. ErrorHandlerCenter determines recovery strategy
3. Custom handlers implement OAuth2-specific recovery
4. No retry logic in OAuth2Module itself

## Key Changes from Current Implementation

### Removed Features
- **Polling management**: No built-in polling timers
- **Encryption**: Tokens stored as plain text
- **Retry logic**: All retries handled by ErrorHandlerCenter
- **Complex state management**: Simplified state model

### Added Features
- **Error handling integration**: Delegates all recovery to ErrorHandlerCenter
- **Clean interfaces**: Simple, focused APIs
- **External polling**: Allows external components to manage polling
- **Flexible token storage**: Simple file-based storage

## Implementation Steps

### Phase 1: Core OAuth2 Module
1. Create simplified OAuth2Module class
2. Implement device authorization flow
3. Implement token request and refresh
4. Add basic status reporting

### Phase 2: Token Storage
1. Create simple TokenStorage class
2. Implement file-based storage (no encryption)
3. Add token listing and deletion

### Phase 3: Error Handling Integration
1. Register custom error handlers with ErrorHandlerCenter
2. Implement OAuth2-specific error recovery
3. Test error scenarios

### Phase 4: Testing
1. Unit tests for OAuth2Module
2. Integration tests with ErrorHandlerCenter
3. End-to-end authentication flow tests

## File Structure

```
src/modules/oauth2/
├── OAuth2Module.ts
├── TokenStorage.ts
├── OAuth2Types.ts
├── OAuth2Constants.ts
└── __tests__/
    ├── OAuth2Module.test.ts
    ├── TokenStorage.test.ts
    └── OAuth2Integration.test.ts
```

## Configuration Example

```typescript
const oauth2Config: OAuth2ModuleConfig = {
  clientId: 'your-client-id',
  scope: 'openid profile email',
  deviceAuthEndpoint: 'https://auth.example.com/device/code',
  tokenEndpoint: 'https://auth.example.com/token',
  tokenStoragePath: './tokens/',
  enablePKCE: true
};

const oauth2Module = new OAuth2Module(oauth2Config, errorHandlerCenter);
```

## Usage Example

```typescript
// Initiate device authorization
const deviceAuth = await oauth2Module.initiateDeviceAuthorization();
console.log(`Visit: ${deviceAuth.verification_uri_complete}`);
console.log(`Enter code: ${deviceAuth.user_code}`);

// External component handles polling
// When user completes authorization:
const token = await oauth2Module.requestToken(deviceAuth.device_code);

// Use token for API calls
const apiClient = new ApiClient(token.accessToken);

// Token refresh is handled automatically or via ErrorHandlerCenter
```

## Benefits of This Approach

1. **Simplified Code**: Each component has a single responsibility
2. **Better Testability**: No complex internal state or polling logic
3. **Flexible**: External components can manage polling as needed
4. **Consistent Error Handling**: Uses ErrorHandlerCenter for all recovery
5. **Maintainable**: Clean separation of concerns makes it easier to modify

## Migration from Current Implementation

1. **Extract polling logic** to external scheduler or polling manager
2. **Remove encryption** from token storage
3. **Integrate with ErrorHandlerCenter** for all error recovery
4. **Simplify state management** in OAuth2Module
5. **Update tests** to reflect new architecture

This refactored implementation provides a cleaner, more focused OAuth2 solution that integrates seamlessly with the existing error handling infrastructure while removing unnecessary complexity.